// NineIO.swift: anonymous analytics and push notifications for 9io's games.
//
// Bitfold, Football Kick Live, Pockling, Super Over and the daily puzzles each keep a copy of this
// file (Crownfold, Evenfold and Pathfold through queen-game's PuzzleShell, in
// Packages/PuzzleShell/Vendor/NineIO, whose sync.sh carries it to the other two). Its source is
// stocks-bot/games/client/NineIO.swift: change it there, then copy it into every app, so they all
// talk to the games service (https://9io.ai/games-api/, see stocks-bot/games/CONTRACT.md) alike.
//
// What leaves the phone, and nothing more:
// - a random install ID made on the phone (deleting the app forgets it);
// - the app's version and build, the iOS version, the device model, language and time zone;
// - events such as "the app opened", "a match started" or "a notification was opened", each with a
//   few short properties (a game mode, a result);
// - once notifications are allowed, the push token Apple gives the app and whether the player wants
//   reminders and news.
// Asking for the app's live events (festivals, cups) sends only the app's key, and for a debug build
// that it is one.
// No name, account, advertising identifier, contacts or location; the server keeps no IP addresses.
// The player can turn the usage data off in Settings (`analyticsEnabled`).
//
// Using it:
// 1. At launch (application(_:didFinishLaunchingWithOptions:) or the App's init):
//        NineIO.shared.start(app: "footballkick")
// 2. In the app delegate:
//        func application(_ application: UIApplication,
//                         didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
//            NineIO.shared.didRegister(deviceToken: deviceToken)
//        }
// 3. Events, from any thread: NineIO.event("play", ["mode": "daily"])
// 4. After a good moment (a finished match, not the first launch), if
//    `await NineIO.shared.shouldOfferNotifications(at: "results")`, show the app's own card and pass
//    the answer to `answerNotificationOffer(_:)`. A yes there logs `notif_card` (the card was shown).
//    Set `quietAfterNotNow` to try quiet (provisional) notifications after "Not now".
// 5. Settings: switches bound to `remindersEnabled`, `newsEnabled` and `analyticsEnabled`, plus links
//    to the privacy policy. When a notification switch is turned on, call `ensurePermission()`.
// 6. Reminders the app schedules: `scheduleReminder(...)`, or tag your own content with `tag(_:id:)`.
//    Set `comeback` for a nudge after some days away.
// 7. At a happy moment, once play has stopped (a won match, three stars, a solved puzzle), call
//    `askForReview(at: "win")`. NineIO decides whether iOS's rating prompt is due.
// 8. Live events made on the 9io dashboard (CONTRACT.md, "GET /games-api/v1/live"): set `liveKinds`
//    to the kinds the app knows, show `cachedLiveEvents` at once and `await liveEvents()` for a fresh
//    list, and call `liveEventOpened(_:from:)` when the player opens one. `NINEIO_LIVE` in the
//    environment (an answer as JSON, or a file holding one) stands in for the server.

import Foundation
import StoreKit
import UIKit
import UserNotifications

@MainActor
final class NineIO: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NineIO()

    /// The games API. `NINEIO_BASE` in the scheme's environment points a debug build elsewhere.
    static let base: URL = {
        if let custom = ProcessInfo.processInfo.environment["NINEIO_BASE"], let url = URL(string: custom) {
            return url
        }
        return URL(string: "https://9io.ai/games-api/v1/")!
    }()

    /// Called with the `open` key of a notification the player tapped (nil if it has none), so the
    /// app can go to that screen. Keys the app doesn't know should just leave it where it is.
    var onOpen: ((String?) -> Void)?

    /// Whether a notification arriving while the app is open still shows as a banner. Reminders for
    /// what the player is already doing usually shouldn't.
    var showInForeground: (UNNotification) -> Bool = { NineIO.kind(of: $0) == "news" }

    /// A nudge for when the player hasn't opened the app in `days` days. It's moved back every time
    /// the app goes to the background, and only scheduled if the player wants reminders.
    var comeback: (days: Int, title: String, body: String)?

    /// After "Not now" on the app's card, ask iOS for quiet (provisional) notifications: no prompt,
    /// reminders go to Notification Center without a sound or banner, and iOS asks the player on the
    /// first one whether to keep them. News never comes this way. The card can still offer the real
    /// thing later. Off unless the app turns it on (its card should say so under "Not now").
    var quietAfterNotNow = false

    private(set) var app = ""
    private var queue: [[String: Any]] = []
    private var openedAt: Date?
    private var flushing = false
    private var token: String?
    /// The notification card and the rating prompt never share a session (foreground to background).
    private var offeredCardThisSession = false
    private var askedForReviewThisSession = false
    private let defaults = UserDefaults.standard

    private enum Key {
        static let install = "9io.install", queue = "9io.queue", analytics = "9io.analytics"
        static let reminders = "9io.reminders", news = "9io.news", token = "9io.token"
        static let offered = "9io.offeredAt", offers = "9io.offers", synced = "9io.synced"
        static let days = "9io.days", day = "9io.day", reviewed = "9io.reviewedVersion"
    }

    // MARK: - Starting

    /// Call once, at launch, before anything else here.
    func start(app: String) {
        guard self.app.isEmpty else { return }
        self.app = app
        queue = loadQueue()
        token = defaults.string(forKey: Key.token)
        UNUserNotificationCenter.current().delegate = self
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(didBecomeActive),
                           name: UIApplication.didBecomeActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(didEnterBackground),
                           name: UIApplication.didEnterBackgroundNotification, object: nil)
        if defaults.string(forKey: Key.install) == nil {
            _ = installID
            track("install")
        }
        // didBecomeActive also asks for the push token again; it runs now if the app is already up.
        if UIApplication.shared.applicationState == .active { didBecomeActive() }
    }

    /// This install's ID: a random UUID kept on the phone.
    var installID: String {
        if let id = defaults.string(forKey: Key.install) { return id }
        let id = UUID().uuidString
        defaults.set(id, forKey: Key.install)
        return id
    }

    // MARK: - The player's choices

    /// Anonymous usage data. On unless the player turns it off in Settings.
    var analyticsEnabled: Bool {
        get { defaults.object(forKey: Key.analytics) as? Bool ?? true }
        set {
            defaults.set(newValue, forKey: Key.analytics)
            if !newValue {
                queue.removeAll()
                saveQueue()
            }
        }
    }

    /// Reminders the app schedules on the phone (daily challenge, streak, come-back nudge).
    var remindersEnabled: Bool {
        get { defaults.object(forKey: Key.reminders) as? Bool ?? true }
        set {
            defaults.set(newValue, forKey: Key.reminders)
            if !newValue { cancelReminder(id: "comeback") }
            syncDevice(force: true)
        }
    }

    /// News pushes from the server: new games, events, updates. Off until the player opts in.
    var newsEnabled: Bool {
        get { defaults.bool(forKey: Key.news) }
        set {
            defaults.set(newValue, forKey: Key.news)
            syncDevice(force: true)
        }
    }

    // MARK: - Events

    /// Records an event. Safe to call from any thread.
    nonisolated static func event(_ name: String, _ props: [String: String] = [:]) {
        if Thread.isMainThread {
            MainActor.assumeIsolated { shared.track(name, props) }
        } else {
            DispatchQueue.main.async { MainActor.assumeIsolated { shared.track(name, props) } }
        }
    }

    /// Records an event: a lower_snake_case name and a few short string properties.
    func track(_ name: String, _ props: [String: String] = [:]) {
        guard analyticsEnabled, !app.isEmpty else { return }
        var event: [String: Any] = ["n": name, "t": (Date().timeIntervalSince1970 * 1000).rounded() / 1000]
        if !props.isEmpty { event["p"] = props }
        queue.append(event)
        if queue.count > 500 { queue.removeFirst(queue.count - 500) }
        saveQueue()
        if queue.count >= 20 { flush() }
    }

    /// Sends what's waiting. It also happens by itself when the app opens or goes to the background.
    func flush(_ done: (() -> Void)? = nil) {
        guard !flushing, !queue.isEmpty, analyticsEnabled, !app.isEmpty else {
            done?()
            return
        }
        flushing = true
        let batch = Array(queue.prefix(200))
        var body = context()
        body["events"] = batch
        Task {
            if await post("events", body) {
                queue.removeFirst(min(batch.count, queue.count))
                saveQueue()
            }
            flushing = false
            done?()
        }
    }

    @objc private func didBecomeActive() {
        guard openedAt == nil else { return }
        openedAt = Date()
        offeredCardThisSession = false
        askedForReviewThisSession = false
        countDayOfUse()
        track("open")
        refreshRegistration()
        flush()
    }

    @objc private func didEnterBackground() {
        if let opened = openedAt {
            track("session", ["s": String(Int(Date().timeIntervalSince(opened).rounded()))])
            openedAt = nil
        }
        if let nudge = comeback, remindersEnabled {
            scheduleReminder(id: "comeback", title: nudge.title, body: nudge.body,
                             after: TimeInterval(nudge.days) * 86_400)
        }
        var task = UIBackgroundTaskIdentifier.invalid
        task = UIApplication.shared.beginBackgroundTask(withName: "9io.flush") {
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }
        flush {
            guard task != .invalid else { return }
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }
    }

    // MARK: - Notifications

    /// iOS's answer so far: `.notDetermined` until the player has been asked.
    func notificationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Whether to show the app's own "turn on notifications?" card now: only before iOS has asked
    /// (or while quiet notifications are on trial, with `quietAfterNotNow`), at most three times, at
    /// least three days apart, and not in a session that asked for a rating. A yes counts as showing
    /// it: it logs `notif_card` (`at`: the moment, a short lower_snake_case key such as "results";
    /// `n`: 1 for the first card), and the rating prompt then waits for another session.
    func shouldOfferNotifications(at moment: String? = nil) async -> Bool {
        guard !askedForReviewThisSession else { return false }
        let status = await notificationStatus()
        guard status == .notDetermined || (quietAfterNotNow && status == .provisional) else { return false }
        let offers = defaults.integer(forKey: Key.offers)
        guard offers < 3 else { return false }
        if let last = defaults.object(forKey: Key.offered) as? Date, Date().timeIntervalSince(last) < 3 * 86_400 {
            return false
        }
        offeredCardThisSession = true
        var props = ["n": String(offers + 1)]
        if let moment { props["at"] = moment }
        track("notif_card", props)
        return true
    }

    enum Answer: String {
        /// Reminders, and news about new games and events.
        case all
        /// Reminders only.
        case reminders
        /// Not now: the card may come back in a few days (with `quietAfterNotNow`, reminders arrive
        /// quietly meanwhile).
        case later
    }

    /// The player answered the app's card. Asks iOS unless it was "not now" (which tries quiet
    /// notifications instead, with `quietAfterNotNow`); says whether notifications are now allowed.
    @discardableResult
    func answerNotificationOffer(_ answer: Answer) async -> Bool {
        defaults.set(Date(), forKey: Key.offered)
        defaults.set(defaults.integer(forKey: Key.offers) + 1, forKey: Key.offers)
        track("notif_prompt", ["answer": answer.rawValue])
        guard answer != .later else {
            return quietAfterNotNow ? await requestQuietPermission() : false
        }
        defaults.set(true, forKey: Key.reminders)
        defaults.set(answer == .all, forKey: Key.news)
        return await requestPermission()
    }

    /// Quiet notifications on trial (iOS's provisional authorization), before iOS has ever asked:
    /// no prompt, reminders only, delivered to Notification Center without a sound or banner, where
    /// iOS asks the player whether to keep them. Logs `notif_quiet`. Says whether they're allowed.
    @discardableResult
    func requestQuietPermission() async -> Bool {
        guard await notificationStatus() == .notDetermined else { return false }
        let granted = (try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge, .provisional])) ?? false
        track("notif_quiet", ["granted": granted ? "1" : "0"])
        if granted {
            defaults.set(true, forKey: Key.reminders)
            defaults.set(false, forKey: Key.news)
            UIApplication.shared.registerForRemoteNotifications()
        }
        syncDevice(force: true)
        return granted
    }

    /// For a Settings switch the player just turned on: asks iOS if it hasn't asked yet. False means
    /// notifications are off in the Settings app (offer to open it: UIApplication.openSettingsURLString).
    func ensurePermission() async -> Bool {
        switch await notificationStatus() {
        case .notDetermined: return await requestPermission()
        case .authorized, .provisional, .ephemeral: return true
        default: return false
        }
    }

    /// Shows iOS's prompt (only the first time, or once from quiet notifications on trial) and registers for
    /// pushes if allowed.
    @discardableResult
    func requestPermission() async -> Bool {
        let granted = (try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        track("notif_auth", ["granted": granted ? "1" : "0"])
        if granted { UIApplication.shared.registerForRemoteNotifications() }
        syncDevice(force: true)
        return granted
    }

    /// Asks Apple for this install's push token again when notifications are allowed (it can change).
    func refreshRegistration() {
        Task {
            let status = await notificationStatus()
            if status == .authorized || status == .provisional || status == .ephemeral {
                UIApplication.shared.registerForRemoteNotifications()
            }
            syncDevice()
        }
    }

    /// From the app delegate's application(_:didRegisterForRemoteNotificationsWithDeviceToken:).
    func didRegister(deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        guard hex != token else { return }
        token = hex
        defaults.set(hex, forKey: Key.token)
        syncDevice(force: true)
    }

    /// Tells the server this install's push token and choices when they change, and at most once a
    /// day otherwise. Nothing is sent before Apple has given the app a token.
    func syncDevice(force: Bool = false) {
        guard !app.isEmpty, let token else { return }
        Task {
            let status = await notificationStatus()
            let authorized = status == .authorized || status == .provisional || status == .ephemeral
            var body = context()
            body["token"] = token
            #if DEBUG
            body["env"] = "sandbox"
            #else
            body["env"] = "production"
            #endif
            body["authorized"] = authorized
            body["reminders"] = remindersEnabled
            body["news"] = newsEnabled
            let signature = [token, "\(authorized)", "\(remindersEnabled)", "\(newsEnabled)",
                             body["v"] as? String ?? "", body["b"] as? String ?? "", body["tz"] as? String ?? ""]
                .joined(separator: "|")
            let last = defaults.dictionary(forKey: Key.synced)
            if !force, last?["sig"] as? String == signature,
               let at = last?["at"] as? Date, Date().timeIntervalSince(at) < 86_400 {
                return
            }
            if await post("devices", body) {
                defaults.set(["sig": signature, "at": Date()] as [String: Any], forKey: Key.synced)
            }
        }
    }

    // MARK: - Reminders scheduled on the phone

    /// Marks a notification the app builds itself, so opening it is counted. `open` is a screen key
    /// handed to `onOpen` when the player taps it.
    static func tag(_ content: UNMutableNotificationContent, id: String, open: String? = nil) {
        var meta: [String: String] = ["kind": "reminder", "id": id]
        if let open { meta["open"] = open }
        content.userInfo["9io"] = meta
    }

    /// A reminder at a calendar time (for example `DateComponents(hour: 18)` with `repeats: true`).
    /// Does nothing if the player doesn't want reminders.
    func scheduleReminder(id: String, title: String, body: String, at time: DateComponents,
                          repeats: Bool = false, open: String? = nil) {
        add(id: id, title: title, body: body, open: open,
            trigger: UNCalendarNotificationTrigger(dateMatching: time, repeats: repeats))
    }

    /// A reminder some seconds from now.
    func scheduleReminder(id: String, title: String, body: String, after seconds: TimeInterval, open: String? = nil) {
        add(id: id, title: title, body: body, open: open,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(60, seconds), repeats: false))
    }

    func cancelReminder(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["9io." + id])
    }

    private func add(id: String, title: String, body: String, open: String?, trigger: UNNotificationTrigger) {
        cancelReminder(id: id)
        guard remindersEnabled else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        Self.tag(content, id: id, open: open)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "9io." + id, content: content, trigger: trigger))
    }

    // MARK: - Asking for a rating

    /// How many different days the app has been opened on. Counting began with the version that
    /// brought it, so a player who had an earlier one starts again at their first day on this.
    var daysOfUse: Int { defaults.integer(forKey: Key.days) }

    /// Whether `askForReview(at:)` would ask now: from the second day of use (so never in the first
    /// session), once per app version, and not in a session that showed the notification card.
    var reviewIsDue: Bool {
        guard !app.isEmpty, daysOfUse >= 2, !offeredCardThisSession else { return false }
        return defaults.string(forKey: Key.reviewed) != Self.version
    }

    /// At a happy moment, once play has stopped (a won match, three stars, a solved puzzle, a pet that
    /// grew up), asks iOS for its rating prompt if `reviewIsDue` and the app is on screen. iOS decides
    /// whether it really shows: at most three times a year, and never if the player turned it off.
    /// `moment` is a short lower_snake_case key for the `review_ask` event. Never call it mid-game,
    /// at launch, or from a button: Apple doesn't allow a button that leads to the prompt.
    @discardableResult
    func askForReview(at moment: String) -> Bool {
        guard reviewIsDue, UIApplication.shared.applicationState == .active,
              let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else { return false }
        defaults.set(Self.version, forKey: Key.reviewed)
        askedForReviewThisSession = true
        track("review_ask", ["at": moment, "days": String(daysOfUse)])
        AppStore.requestReview(in: scene)
        return true
    }

    /// A session that starts on a calendar day the app hasn't been used on yet counts one more day.
    private func countDayOfUse() {
        let today = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        let key = String(format: "%04d-%02d-%02d", today.year ?? 0, today.month ?? 0, today.day ?? 0)
        guard defaults.string(forKey: Key.day) != key else { return }
        defaults.set(key, forKey: Key.day)
        defaults.set(daysOfUse + 1, forKey: Key.days)
    }

    private static var version: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    }

    // MARK: - Live events

    /// The kinds of live event this app knows (`kind` in CONTRACT.md). The lists leave out any other,
    /// so a kind added for a later version never reaches this one. nil: every kind.
    var liveKinds: Set<String>?

    /// Called with the new list when a refresh changes what `cachedLiveEvents` holds.
    var onLiveEventsChange: (([LiveEvent]) -> Void)?

    private static let liveKey = "9io.live"
    private var liveRefresh: Task<Void, Never>?
    private var liveFailedAt: Date?
    private var liveObserver: NSObjectProtocol?

    /// The last list the server gave, at once: the events of `liveKinds` that this version shows and
    /// that haven't ended by the phone's clock, the earliest start first. Each one's `isOn()` and
    /// `isUpcoming()` say whether it has started.
    var cachedLiveEvents: [LiveEvent] {
        shown(Self.liveFixture ?? storedLiveEvents())
    }

    /// The app's live events, asking the server first when the last list is older than `maxAge`
    /// seconds (but not within a minute of an ask that failed). Offline it's the last list, so an
    /// event the phone already knows about still starts and ends on time. From the first call on,
    /// the list is also refreshed whenever the app comes back to the foreground.
    func liveEvents(maxAge: TimeInterval = 15 * 60) async -> [LiveEvent] {
        if liveObserver == nil {
            liveObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
            ) { _ in
                Task { @MainActor in _ = await NineIO.shared.liveEvents() }
            }
        }
        let failedLately = liveFailedAt.map { abs($0.timeIntervalSinceNow) < 60 } ?? false
        if liveAge >= maxAge, !failedLately { await refreshLiveEvents() }
        return cachedLiveEvents
    }

    /// The event with this id from the last list, if this version shows it and it hasn't ended.
    func liveEvent(id: String) -> LiveEvent? {
        cachedLiveEvents.first { $0.id == id }
    }

    /// Records `live_open`: the player opened the event's screen from its card in the app, a link
    /// (such as the App Store event's deep link), a notification, or somewhere else.
    func liveEventOpened(_ event: LiveEvent, from source: LiveEvent.Source) {
        track("live_open", ["live": event.id, "kind": event.kind, "from": source.rawValue])
    }

    /// Asks the server for the app's list now (a debug build is sent drafts too). An ask already under
    /// way is waited for rather than doubled. Nothing changes when it fails.
    func refreshLiveEvents() async {
        guard !app.isEmpty, Self.liveFixture == nil else { return }
        if let running = liveRefresh {
            await running.value
            return
        }
        let before = cachedLiveEvents
        let task = Task { await fetchLiveEvents() }
        liveRefresh = task
        await task.value
        liveRefresh = nil
        let after = cachedLiveEvents
        if after != before { onLiveEventsChange?(after) }
    }

    private func fetchLiveEvents() async {
        var url = Self.base.appendingPathComponent("live").appendingPathComponent(app)
        if Self.isDebugBuild, var parts = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            parts.queryItems = [URLQueryItem(name: "dev", value: "1")]
            url = parts.url ?? url
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
        let stored = storedLive()
        if let etag = stored?["etag"] as? String, !etag.isEmpty, stored?["events"] is Data {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let http = response as? HTTPURLResponse
            switch http?.statusCode ?? 0 {
            case 200:
                guard let answer = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let events = answer["events"] as? [Any] else { throw URLError(.cannotParseResponse) }
                storeLive(events: try JSONSerialization.data(withJSONObject: events),
                          etag: http?.value(forHTTPHeaderField: "ETag"))
            case 304:
                storeLive(events: nil, etag: nil)  // still the same list: only its age starts again
            case 404:
                storeLive(events: Data("[]".utf8), etag: nil)  // a key the service doesn't know
            default:
                throw URLError(.badServerResponse)
            }
            liveFailedAt = nil
        } catch {
            liveFailedAt = Date()
        }
    }

    /// The stored answer, if it's this app's and from this kind of build (debug builds also get drafts).
    private func storedLive() -> [String: Any]? {
        guard let stored = defaults.dictionary(forKey: Self.liveKey), stored["app"] as? String == app,
              stored["dev"] as? Bool == Self.isDebugBuild else { return nil }
        return stored
    }

    private func storedLiveEvents() -> [LiveEvent] {
        guard let data = storedLive()?["events"] as? Data else { return [] }
        return Self.decodeLive(data)
    }

    /// Seconds since the server last answered, or infinity (never, or the clock went back).
    private var liveAge: TimeInterval {
        guard let at = storedLive()?["at"] as? Date else { return .infinity }
        let age = Date().timeIntervalSince(at)
        return age < 0 ? .infinity : age
    }

    private func storeLive(events: Data?, etag: String?) {
        var stored = storedLive() ?? [:]
        if let events {
            stored["events"] = events
            stored["etag"] = etag ?? ""
        }
        stored["app"] = app
        stored["dev"] = Self.isDebugBuild
        stored["at"] = Date()
        defaults.set(stored, forKey: Self.liveKey)
    }

    private func shown(_ events: [LiveEvent]) -> [LiveEvent] {
        let now = Date()
        return events
            .filter { liveKinds?.contains($0.kind) ?? true }
            .filter { $0.minVersion.map { Self.isVersion(Self.version, atLeast: $0) } ?? true }
            .filter { !$0.hasEnded(at: now) }
            .sorted { ($0.start, $0.id) < ($1.start, $1.id) }
    }

    /// Whether a version string is at or after another, number by number: 1.10 is after 1.9.
    nonisolated static func isVersion(_ version: String, atLeast minimum: String) -> Bool {
        let have = version.split(separator: ".").map { Int($0) ?? 0 }
        let need = minimum.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(have.count, need.count) {
            let a = i < have.count ? have[i] : 0, b = i < need.count ? need[i] : 0
            if a != b { return a > b }
        }
        return true
    }

    /// The events in a JSON array; one that can't be read is skipped, never the whole list.
    nonisolated static func decodeLive(_ data: Data) -> [LiveEvent] {
        struct Each: Decodable {
            let event: LiveEvent?
            init(from decoder: Decoder) throws { event = try? LiveEvent(from: decoder) }
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return ((try? decoder.decode([Each].self, from: data)) ?? []).compactMap(\.event)
    }

    /// `NINEIO_LIVE` from the environment: an answer like the server's (or just its `events`), inline
    /// or in a file at that path. For the simulator, UI tests and screenshots; the server isn't asked.
    private static let liveFixture: [LiveEvent]? = {
        guard let value = ProcessInfo.processInfo.environment["NINEIO_LIVE"], !value.isEmpty else { return nil }
        let data = value.hasPrefix("/") ? FileManager.default.contents(atPath: value) ?? Data() : Data(value.utf8)
        guard let object = try? JSONSerialization.jsonObject(with: data) else { return [] }
        let events = (object as? [String: Any])?["events"] ?? object
        guard let raw = try? JSONSerialization.data(withJSONObject: events) else { return [] }
        return decodeLive(raw)
    }()

    private static var isDebugBuild: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    // MARK: - UNUserNotificationCenterDelegate

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        let show = await MainActor.run { NineIO.shared.showInForeground(notification) }
        return show ? [.banner, .list, .sound] : []
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            didReceive response: UNNotificationResponse) async {
        let notification = response.notification
        let meta = notification.request.content.userInfo["9io"] as? [String: Any]
        let kind = Self.kind(of: notification)
        let id = meta?["id"] as? String ?? notification.request.identifier
        let open = meta?["open"] as? String
        await MainActor.run {
            NineIO.shared.track("notif_open", ["kind": kind, "id": id])
            NineIO.shared.flush()
            NineIO.shared.onOpen?(open)
        }
    }

    /// `reminder` or `news` for notifications from NineIO, `other` for anything else.
    nonisolated static func kind(of notification: UNNotification) -> String {
        (notification.request.content.userInfo["9io"] as? [String: Any])?["kind"] as? String ?? "other"
    }

    // MARK: - Talking to the server

    private func context() -> [String: Any] {
        let info = Bundle.main.infoDictionary ?? [:]
        var body: [String: Any] = [
            "app": app,
            "install": installID,
            "v": info["CFBundleShortVersionString"] as? String ?? "",
            "b": info["CFBundleVersion"] as? String ?? "",
            "os": UIDevice.current.systemVersion,
            "model": Self.model,
            "lang": Locale.preferredLanguages.first ?? "",
            "tz": TimeZone.current.identifier,
        ]
        #if DEBUG
        body["dev"] = true
        #endif
        return body
    }

    private static let model: String = {
        if let simulated = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return simulated }
        var system = utsname()
        uname(&system)
        return withUnsafeBytes(of: &system.machine) { raw in
            String(decoding: raw.prefix { $0 != 0 }, as: UTF8.self)
        }
    }()

    /// True when the server took it, or refused it as malformed (retrying wouldn't help).
    private func post(_ path: String, _ body: [String: Any]) async -> Bool {
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return true }
        var request = URLRequest(url: Self.base.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        request.timeoutInterval = 20
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            return (200..<300).contains(status) || status == 400 || status == 413
        } catch {
            return false
        }
    }

    private func saveQueue() {
        if let data = try? JSONSerialization.data(withJSONObject: queue) {
            defaults.set(data, forKey: Key.queue)
        }
    }

    private func loadQueue() -> [[String: Any]] {
        guard let data = defaults.data(forKey: Key.queue),
              let list = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else { return [] }
        let weekAgo = Date().timeIntervalSince1970 - 7 * 86_400
        return list.filter { ($0["t"] as? Double ?? 0) > weekAgo }
    }
}

/// A live event from the games service: a festival, a cup or a challenge that runs from `start` to
/// `end` (CONTRACT.md, "GET /games-api/v1/live/{app}"). `kind` says which of the app's screens and rules
/// it uses, and `payload` holds that kind's settings.
struct LiveEvent: Codable, Hashable, Identifiable, Sendable {
    /// Where the player opened an event from: `live_open`'s `from`.
    enum Source: String, Sendable {
        case card, link, push, other
    }

    let id: String
    let kind: String
    let title: String
    let subtitle: String
    let start: Date
    let end: Date
    let payload: [String: LiveValue]
    let art: [String: URL]
    let minVersion: String?
    /// A draft: only debug builds are sent these.
    let draft: Bool

    enum CodingKeys: String, CodingKey {
        case id, kind, title, subtitle, start, end, payload, art, draft
        case minVersion = "min_version"
    }

    init(id: String, kind: String, title: String, subtitle: String = "", start: Date, end: Date,
         payload: [String: LiveValue] = [:], art: [String: URL] = [:], minVersion: String? = nil, draft: Bool = false) {
        self.id = id
        self.kind = kind
        self.title = title
        self.subtitle = subtitle
        self.start = start
        self.end = end
        self.payload = payload
        self.art = art
        self.minVersion = minVersion
        self.draft = draft
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        kind = try c.decode(String.self, forKey: .kind)
        title = try c.decode(String.self, forKey: .title)
        subtitle = (try? c.decodeIfPresent(String.self, forKey: .subtitle)) ?? ""
        start = try c.decode(Date.self, forKey: .start)
        end = try c.decode(Date.self, forKey: .end)
        // A payload value or art link this version can't read is left out, not the whole event.
        let values = (try? c.decodeIfPresent([String: Lenient<LiveValue>].self, forKey: .payload)) ?? [:]
        payload = values.compactMapValues(\.value)
        let links = (try? c.decodeIfPresent([String: Lenient<String>].self, forKey: .art)) ?? [:]
        art = links.compactMapValues { link in
            link.value.flatMap { URL(string: $0) }.flatMap { $0.scheme == "https" && $0.host != nil ? $0 : nil }
        }
        minVersion = try? c.decodeIfPresent(String.self, forKey: .minVersion)
        draft = (try? c.decodeIfPresent(Bool.self, forKey: .draft)) ?? false
    }

    /// On at `date`: started, and not yet ended.
    func isOn(at date: Date = Date()) -> Bool { start <= date && date < end }
    /// Listed but not started yet: "starting soon".
    func isUpcoming(at date: Date = Date()) -> Bool { date < start }
    func hasEnded(at date: Date = Date()) -> Bool { date >= end }

    // The payload's values, read leniently: a number sent as text reads as a number, and the other way.
    func string(_ key: String) -> String? { payload[key]?.string }
    func int(_ key: String) -> Int? { payload[key]?.int }
    func double(_ key: String) -> Double? { payload[key]?.double }
    func bool(_ key: String) -> Bool? { payload[key]?.bool }
    func strings(_ key: String) -> [String]? { payload[key]?.list?.compactMap(\.string) }
    func ints(_ key: String) -> [Int]? { payload[key]?.list?.compactMap(\.int) }
}

/// A value that may not decode: nil then, instead of failing what holds it.
private struct Lenient<Value: Decodable>: Decodable {
    let value: Value?
    init(from decoder: Decoder) throws { value = try? Value(from: decoder) }
}

/// A value in a live event's payload: text, a number, true or false, or a list of those.
enum LiveValue: Codable, Hashable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case list([LiveValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let value = try? c.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? c.decode(Double.self) {
            self = .number(value)
        } else if let value = try? c.decode(String.self) {
            self = .string(value)
        } else if let value = try? c.decode([LiveValue].self) {
            self = .list(value)
        } else {
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "not text, a number, a bool or a list")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let value): try c.encode(value)
        case .number(let value): try c.encode(value)
        case .bool(let value): try c.encode(value)
        case .list(let value): try c.encode(value)
        }
    }

    var string: String? {
        switch self {
        case .string(let value): return value
        case .number(let value): return value == value.rounded() && abs(value) < 1e15 ? String(Int64(value)) : String(value)
        case .bool(let value): return value ? "true" : "false"
        case .list: return nil
        }
    }

    var int: Int? {
        switch self {
        case .number(let value): return value == value.rounded() && abs(value) < 1e15 ? Int(value) : nil
        case .string(let value): return Int(value.trimmingCharacters(in: .whitespaces))
        default: return nil
        }
    }

    var double: Double? {
        switch self {
        case .number(let value): return value
        case .string(let value): return Double(value.trimmingCharacters(in: .whitespaces))
        default: return nil
        }
    }

    var bool: Bool? {
        switch self {
        case .bool(let value): return value
        case .number(let value): return value == 1 ? true : value == 0 ? false : nil
        case .string(let value): return ["true": true, "1": true, "false": false, "0": false][value.lowercased()]
        default: return nil
        }
    }

    var list: [LiveValue]? {
        if case .list(let value) = self { return value }
        return nil
    }
}
