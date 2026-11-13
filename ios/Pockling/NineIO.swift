// NineIO.swift: anonymous analytics and push notifications for 9io's games.
//
// Bitfold, Football Kick Live, Pockling and Super Over each keep a copy of this file. Its source is
// stocks-bot/games/client/NineIO.swift: change it there, then copy it into every app, so the four
// talk to the games service (https://9io.ai/games-api/, see stocks-bot/games/CONTRACT.md) alike.
//
// What leaves the phone, and nothing more:
// - a random install ID made on the phone (deleting the app forgets it);
// - the app's version and build, the iOS version, the device model, language and time zone;
// - events such as "the app opened", "a match started" or "a notification was opened", each with a
//   few short properties (a game mode, a result);
// - once notifications are allowed, the push token Apple gives the app and whether the player wants
//   reminders and news.
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
//    `await NineIO.shared.shouldOfferNotifications()`, show the app's own card and pass the answer
//    to `answerNotificationOffer(_:)`.
// 5. Settings: switches bound to `remindersEnabled`, `newsEnabled` and `analyticsEnabled`, plus links
//    to the privacy policy. When a notification switch is turned on, call `ensurePermission()`.
// 6. Reminders the app schedules: `scheduleReminder(...)`, or tag your own content with `tag(_:id:)`.
//    Set `comeback` for a nudge after some days away.
// 7. At a happy moment, once play has stopped (a won match, three stars, a solved puzzle), call
//    `askForReview(at: "win")`. NineIO decides whether iOS's rating prompt is due.

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

    /// Whether to show the app's own "turn on notifications?" card now: only before iOS has asked,
    /// at most three times, at least three days apart, and not in a session that asked for a rating.
    /// A yes counts as showing it, so the rating prompt then waits for another session.
    func shouldOfferNotifications() async -> Bool {
        guard !askedForReviewThisSession, await notificationStatus() == .notDetermined else { return false }
        guard defaults.integer(forKey: Key.offers) < 3 else { return false }
        if let last = defaults.object(forKey: Key.offered) as? Date, Date().timeIntervalSince(last) < 3 * 86_400 {
            return false
        }
        offeredCardThisSession = true
        return true
    }

    enum Answer: String {
        /// Reminders, and news about new games and events.
        case all
        /// Reminders only.
        case reminders
        /// Not now: the card may come back in a few days.
        case later
    }

    /// The player answered the app's card. Asks iOS unless it was "not now"; says whether
    /// notifications are now allowed.
    @discardableResult
    func answerNotificationOffer(_ answer: Answer) async -> Bool {
        defaults.set(Date(), forKey: Key.offered)
        defaults.set(defaults.integer(forKey: Key.offers) + 1, forKey: Key.offers)
        track("notif_prompt", ["answer": answer.rawValue])
        guard answer != .later else { return false }
        defaults.set(true, forKey: Key.reminders)
        defaults.set(answer == .all, forKey: Key.news)
        return await requestPermission()
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

    /// Shows iOS's prompt (only ever the first time) and registers for pushes if allowed.
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
