import Foundation
import UIKit
import UserNotifications

/// Where the reminders go: NineIO in the app, a fake in the tests.
@MainActor
protocol ReminderScheduler: AnyObject {
    /// Clears NineIO's ids (it adds "9io." in front) and any raw identifiers an older version used.
    func cancel(nineIOIDs: [String], identifiers: [String])
    func schedule(id: String, title: String, body: String, at time: DateComponents, open: String)
}

/// NineIO's reminders: tagged so opening one counts as `notif_open`, with "pet" as the screen it opens,
/// and only added while the player wants reminders.
@MainActor
final class NineIOReminderScheduler: ReminderScheduler {
    func cancel(nineIOIDs: [String], identifiers: [String]) {
        for id in nineIOIDs { NineIO.shared.cancelReminder(id: id) }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    func schedule(id: String, title: String, body: String, at time: DateComponents, open: String) {
        NineIO.shared.scheduleReminder(id: id, title: title, body: body, at: time, open: open)
    }
}

/// What Pockling schedules on the phone, if the player wants reminders (NineIO's `remindersEnabled`, the
/// Reminders switch in the game's Settings) and iOS allows notifications: a different hello at 6 pm on each
/// day they haven't visited, for up to a week (ReminderPlan.swift). It's all made on the phone. Asking iOS
/// for permission is NineIO's job, so the player is only ever asked once.
@MainActor
enum Reminders {
    private static let carriedOver = "pockling.remindersCarriedOver"
    private static let lastVisitKey = "pockling.lastVisit"
    private static let linesKey = "pockling.reminderLines"

    static var scheduler: ReminderScheduler = NineIOReminderScheduler()
    static var defaults = UserDefaults.standard

    /// The latest save the game sent, or the one on disk at launch. The pet's name and needs come from it,
    /// and they stay on the phone.
    private static var save: String?
    /// Rebuilds started: only the latest one schedules, as it read the save last.
    private static var rebuilds = 0
    private static var saveRebuild: DispatchWorkItem?
    private static var observing = false

    /// At launch, with the game's save. Up to 1.1 the reminder switch lived in the save, off unless the
    /// player turned it on; now it's NineIO's `remindersEnabled`, so the save's answer moves over once.
    static func start(save: String?) {
        let saved = save.flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) } as? [String: Any]
        if !defaults.bool(forKey: carriedOver) {
            if let wanted = (saved?["settings"] as? [String: Any])?["reminders"] as? Bool {
                NineIO.shared.remindersEnabled = wanted
            }
            defaults.set(true, forKey: carriedOver)
        }
        self.save = save
        // The queue's third day away is the come-back line, so NineIO's own nudge stays off.
        NineIO.shared.comeback = nil
        observe()
        if UIApplication.shared.applicationState != .background { visited() }
        rebuild()
    }

    /// Every save the game sends (about once a second while it's open). If it arrives once the app is in the
    /// background (the game saves as it's hidden), the queue is built again from it.
    static func saved(_ json: String) {
        save = json.isEmpty ? nil : json
        guard UIApplication.shared.applicationState == .background else { return }
        saveRebuild?.cancel()
        let work = DispatchWorkItem { MainActor.assumeIsolated { rebuild() } }
        saveRebuild = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: work)
    }

    /// The game tells us its pet's name when it starts and when an egg hatches (nil before one has). The
    /// save that came just before it has the pet, so the queue is built again.
    static func setName(_ newName: String?) {
        rebuild()
    }

    /// Builds the queue again now: the reminder switch, iOS's permission or the pet may have changed.
    static func refresh() {
        rebuild()
    }

    // MARK: Building the queue

    private static func observe() {
        guard !observing else { return }
        observing = true
        let center = NotificationCenter.default
        // Each return counts as a visit, and so does leaving: a player still in the app after midnight was
        // here that day too.
        for name in [UIApplication.didBecomeActiveNotification, UIApplication.didEnterBackgroundNotification] {
            center.addObserver(forName: name, object: nil, queue: .main) { _ in
                MainActor.assumeIsolated {
                    visited()
                    rebuild()
                }
            }
        }
    }

    private static func visited(at date: Date = Date()) {
        defaults.set(date, forKey: lastVisitKey)
    }

    static var lastVisit: Date? { defaults.object(forKey: lastVisitKey) as? Date }

    private static func rebuild(now: Date = Date()) {
        rebuilds += 1
        let rebuild = rebuilds
        let pet = ReminderPet(save: save)
        let lastVisit = lastVisit
        // Rebuilds also run as the app goes to the background: ask iOS for the moment it takes.
        var task = UIBackgroundTaskIdentifier.invalid
        task = UIApplication.shared.beginBackgroundTask(withName: "pockling.reminders") {
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }
        Task { @MainActor in
            defer {
                if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
                task = .invalid
            }
            let status = await NineIO.shared.notificationStatus()
            guard rebuild == rebuilds else { return }
            let allowed = status == .authorized || status == .provisional || status == .ephemeral
            let plan = ReminderPlan.make(now: now, enabled: NineIO.shared.remindersEnabled && allowed, pet: pet,
                                         lastVisit: lastVisit, previous: storedLines())
            apply(plan)
            #if DEBUG
            NSLog("Pockling reminders: %@", plan.reminders.map { "\($0.id) \($0.date) \($0.line.id): \($0.title)" }
                .joined(separator: " | "))
            #endif
        }
    }

    /// Replaces whatever was queued with the plan: every id is cleared first (1.3.1's repeating hello and
    /// NineIO's come-back nudge too), so a shorter queue, or none, leaves nothing stale behind.
    static func apply(_ plan: ReminderPlan.Plan, calendar: Calendar = .current) {
        scheduler.cancel(nineIOIDs: ReminderPlan.nineIOIDs, identifiers: ReminderPlan.legacyIdentifiers)
        for reminder in plan.reminders {
            scheduler.schedule(id: reminder.id, title: reminder.title, body: reminder.body,
                               at: calendar.dateComponents([.year, .month, .day, .hour, .minute], from: reminder.date),
                               open: ReminderPlan.open)
        }
        defaults.set(Dictionary(uniqueKeysWithValues: plan.linesByDay.map { (String($0.key), $0.value) }), forKey: linesKey)
    }

    static func storedLines() -> [Int: String] {
        let stored = defaults.dictionary(forKey: linesKey) as? [String: String] ?? [:]
        return Dictionary(uniqueKeysWithValues: stored.compactMap { key, value in Int(key).map { ($0, value) } })
    }
}
