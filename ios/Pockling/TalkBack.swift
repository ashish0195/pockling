import AVFoundation

/// Say something and your pet says it back in a squeaky voice. Listens for speech, keeps it in memory
/// only until it has been played back at a higher pitch, and sends the loudness over for the lips.
/// Nothing is written to disk and nothing leaves the phone.
///
/// Everything here runs on one queue of its own. Starting audio input can block for a while, and CoreAudio
/// treats a main thread that stays blocked as a deadlock and aborts the app.
final class TalkBack {
    /// Called on the main thread.
    var onState: ((String) -> Void)?
    /// Called on the main thread.
    var onLevel: ((Double) -> Void)?

    private enum Phase { case off, listening, hearing, speaking }

    private static let pitchUp: Float = 1.5
    private static let silenceEnd = 0.65
    private static let maxTake = 7.0
    private static let minTake = 0.28

    /// The simulator's microphone goes through the Mac's audio server, and asking for it can hang until
    /// CoreAudio aborts the app. So simulator builds hear a made-up voice instead, which still exercises
    /// everything after the microphone: the listening, the playback and the lips.
    #if targetEnvironment(simulator)
    private static let hasMicrophone = false
    #else
    private static let hasMicrophone = true
    #endif

    private let queue = DispatchQueue(label: "app.pockling.talkback", qos: .userInitiated)

    // All of these belong to the queue.
    private var engine: AVAudioEngine?
    private var player: AVAudioPlayerNode?
    private var mono: AVAudioFormat?
    private var phase = Phase.off
    private var run = 0
    private var floorLevel: Float = 0.008
    private var before: [[Float]] = []
    private var take: [[Float]] = []
    private var quiet = 0.0
    private var took = 0.0
    private var routeObserver: NSObjectProtocol?
    private var pretendVoice: DispatchSourceTimer?

    init() {
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted), name: AVAudioSession.interruptionNotification, object: nil)
    }

    func start() {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            guard let self else { return }
            if granted {
                self.queue.async { self.begin() }
            } else {
                self.tell("denied")
            }
        }
    }

    func stop() {
        queue.async { [weak self] in self?.tearDown() }
    }

    // MARK: Starting and stopping

    private func begin() {
        guard phase == .off else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            if TalkBack.hasMicrophone {
                try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .mixWithOthers])
            } else {
                try session.setCategory(.playback, options: [.mixWithOthers])
            }
            try session.setActive(true)

            let engine = AVAudioEngine()
            let player = AVAudioPlayerNode()
            let varispeed = AVAudioUnitVarispeed()
            let format = TalkBack.hasMicrophone ? engine.inputNode.outputFormat(forBus: 0) : engine.mainMixerNode.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0, let mono = AVAudioFormat(standardFormatWithSampleRate: format.sampleRate, channels: 1) else {
                throw NSError(domain: "pockling.talkback", code: 1)
            }
            engine.attach(player)
            engine.attach(varispeed)
            varispeed.rate = TalkBack.pitchUp
            engine.connect(player, to: varispeed, format: mono)
            engine.connect(varispeed, to: engine.mainMixerNode, format: mono)

            run += 1
            let thisRun = run
            if TalkBack.hasMicrophone {
                engine.inputNode.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
                    guard let channel = buffer.floatChannelData?[0] else { return }
                    let samples = Array(UnsafeBufferPointer(start: channel, count: Int(buffer.frameLength)))
                    let seconds = Double(buffer.frameLength) / format.sampleRate
                    self?.queue.async { self?.heard(samples, seconds: seconds, run: thisRun) }
                }
            }
            engine.mainMixerNode.installTap(onBus: 0, bufferSize: 1024, format: nil) { [weak self] buffer, _ in
                guard let channel = buffer.floatChannelData?[0] else { return }
                let level = TalkBack.rms(UnsafeBufferPointer(start: channel, count: Int(buffer.frameLength)))
                self?.queue.async {
                    guard let self, thisRun == self.run, self.phase == .speaking else { return }
                    self.sendLevel(min(1, Double(level) * 3.6))
                }
            }
            engine.prepare()
            try engine.start()

            self.engine = engine
            self.player = player
            self.mono = mono
            clearTake()
            floorLevel = 0.008
            phase = .listening
            tell("listening")
            // Plugging in headphones and the like stops the engine: start over on the new route.
            routeObserver = NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: nil) { [weak self] _ in
                self?.queue.async {
                    guard let self, thisRun == self.run, self.phase != .off else { return }
                    self.tearDown()
                    self.begin()
                }
            }
            if !TalkBack.hasMicrophone { startPretendVoice(sampleRate: format.sampleRate, run: thisRun) }
        } catch {
            engine?.stop()
            engine = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            tell("error")
        }
    }

    private func tearDown() {
        guard phase != .off else { return }
        phase = .off
        run += 1
        if let routeObserver { NotificationCenter.default.removeObserver(routeObserver) }
        routeObserver = nil
        pretendVoice?.cancel()
        pretendVoice = nil
        if let engine {
            if TalkBack.hasMicrophone { engine.inputNode.removeTap(onBus: 0) }
            engine.mainMixerNode.removeTap(onBus: 0)
            engine.stop()
        }
        player?.stop()
        engine = nil
        player = nil
        clearTake()
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
        try? session.setCategory(.ambient)
    }

    private func clearTake() {
        before = []
        take = []
        quiet = 0
        took = 0
    }

    @objc private func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
        queue.async { [weak self] in
            guard let self, self.phase != .off else { return }
            self.tearDown()
            self.tell("error")
        }
    }

    // MARK: Listening

    private func heard(_ samples: [Float], seconds: Double, run thisRun: Int) {
        guard thisRun == run else { return }
        let level = samples.withUnsafeBufferPointer(TalkBack.rms)
        switch phase {
        case .listening:
            floorLevel += (level - floorLevel) * (level < floorLevel ? 0.12 : 0.012)
            before.append(samples)
            if before.count > 5 { before.removeFirst() }
            if level > max(floorLevel * 3.2, 0.018) {
                phase = .hearing
                take = before
                quiet = 0
                took = 0
                tell("hearing")
            }
        case .hearing:
            take.append(samples)
            took += seconds
            sendLevel(min(1, Double(level) * 7))
            quiet = level < max(floorLevel * 2.2, 0.012) ? quiet + seconds : 0
            if quiet >= TalkBack.silenceEnd || took >= TalkBack.maxTake {
                if took - quiet < TalkBack.minTake {
                    phase = .listening
                    before = []
                    tell("listening")
                } else {
                    playBack(seconds: seconds)
                }
            }
        default:
            break
        }
    }

    // MARK: Saying it back

    private func playBack(seconds: Double) {
        guard let mono, let player else { return }
        // Leave off most of the silence that ended the take.
        let trim = Int(TalkBack.silenceEnd * 0.8 / seconds)
        let parts = take.dropLast(min(trim, max(0, take.count - 1)))
        let count = parts.reduce(0) { $0 + $1.count }
        guard count > 0, let buffer = AVAudioPCMBuffer(pcmFormat: mono, frameCapacity: AVAudioFrameCount(count)), let out = buffer.floatChannelData?[0] else {
            phase = .listening
            return
        }
        var at = 0
        var peak: Float = 0.001
        for part in parts {
            for sample in part {
                out[at] = sample
                at += 1
                peak = max(peak, abs(sample))
            }
        }
        let gain = min(0.9 / peak, 6)
        for index in 0..<count { out[index] *= gain }
        buffer.frameLength = AVAudioFrameCount(count)
        clearTake()

        phase = .speaking
        tell("speaking")
        let thisRun = run
        player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
            self?.queue.asyncAfter(deadline: .now() + 0.15) {
                guard let self, thisRun == self.run, self.phase == .speaking else { return }
                self.phase = .listening
                self.sendLevel(0)
                self.tell("listening")
            }
        }
        player.play()
    }

    // MARK: Simulator only

    /// A second of quiet, a second and a bit of tone, over and over.
    private func startPretendVoice(sampleRate: Double, run thisRun: Int) {
        let frames = 2048
        let seconds = Double(frames) / sampleRate
        var clock = 0.0
        var angle = 0.0
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + seconds, repeating: seconds)
        timer.setEventHandler { [weak self] in
            guard let self else { return }
            clock += seconds
            let speaking = clock.truncatingRemainder(dividingBy: 6) > 1 && clock.truncatingRemainder(dividingBy: 6) < 2.3
            var samples = [Float](repeating: 0, count: frames)
            if speaking {
                for index in 0..<frames {
                    angle += 2 * .pi * 240 / sampleRate
                    samples[index] = Float(sin(angle)) * 0.25
                }
            }
            self.heard(samples, seconds: seconds, run: thisRun)
        }
        timer.resume()
        pretendVoice = timer
    }

    // MARK: Telling the game

    private func tell(_ state: String) {
        DispatchQueue.main.async { [weak self] in self?.onState?(state) }
    }

    private func sendLevel(_ level: Double) {
        DispatchQueue.main.async { [weak self] in self?.onLevel?(level) }
    }

    private static func rms(_ samples: UnsafeBufferPointer<Float>) -> Float {
        guard !samples.isEmpty else { return 0 }
        var sum: Float = 0
        for sample in samples { sum += sample * sample }
        return (sum / Float(samples.count)).squareRoot()
    }
}
