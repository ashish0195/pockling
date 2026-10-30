import CoreHaptics
import UIKit

/// Little taps for everything, and a purr you can feel while you stroke your pet.
final class Haptics {
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let notice = UINotificationFeedbackGenerator()

    private var engine: CHHapticEngine?
    private var purrPlayer: CHHapticAdvancedPatternPlayer?

    func play(_ kind: String) {
        switch kind {
        case "medium": medium.impactOccurred()
        case "heavy": heavy.impactOccurred()
        case "soft": soft.impactOccurred(intensity: 0.7)
        case "success": notice.notificationOccurred(.success)
        case "boing":
            soft.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.09) { [soft] in soft.impactOccurred(intensity: 0.6) }
        default: light.impactOccurred()
        }
    }

    func purr(_ on: Bool) {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        if on {
            guard purrPlayer == nil else { return }
            do {
                let engine = try self.engine ?? CHHapticEngine()
                engine.isAutoShutdownEnabled = false
                engine.resetHandler = { [weak self] in
                    self?.purrPlayer = nil
                    try? self?.engine?.start()
                }
                try engine.start()
                self.engine = engine
                let player = try engine.makeAdvancedPlayer(with: Haptics.purrPattern())
                player.loopEnabled = true
                try player.start(atTime: CHHapticTimeImmediate)
                purrPlayer = player
            } catch {
                purrPlayer = nil
            }
        } else {
            try? purrPlayer?.stop(atTime: CHHapticTimeImmediate)
            purrPlayer = nil
            engine?.stop(completionHandler: nil)
        }
    }

    /// A soft rumble that rises and falls, like breathing in and out while purring.
    private static func purrPattern() throws -> CHHapticPattern {
        let length: TimeInterval = 1.6
        let rumble = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.55),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.08),
            ],
            relativeTime: 0,
            duration: length
        )
        let points = (0...16).map { index -> CHHapticParameterCurve.ControlPoint in
            let t = Double(index) / 16 * length
            let breath = 0.5 - 0.5 * cos(t / length * 2 * .pi)
            return .init(relativeTime: t, value: Float(0.35 + 0.6 * breath))
        }
        let curve = CHHapticParameterCurve(parameterID: .hapticIntensityControl, controlPoints: points, relativeTime: 0)
        return try CHHapticPattern(events: [rumble], parameterCurves: [curve])
    }
}
