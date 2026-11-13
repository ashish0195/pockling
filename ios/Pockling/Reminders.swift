import Foundation
import UserNotifications

/// What Pockling schedules on the phone itself, if the player wants reminders (NineIO's
/// `remindersEnabled`, the Reminders switch in the game's Settings): one gentle hello a day at 6 pm,
/// and a nudge after three days away (NineIO's `comeback`). Both are made on the phone. Asking iOS for
/// permission is NineIO's job, so the player is only ever asked once.
@MainActor
enum Reminders {
    private static let daily = "pockling.daily"
    private static let carriedOver = "pockling.remindersCarriedOver"

    /// The pet's name, for the notifications' text. It stays on the phone and never goes in an event.
    private static var name: String?

    /// At launch, with the game's save. Up to 1.1 the reminder switch lived in the save, off unless the
    /// player turned it on; now it's NineIO's `remindersEnabled`, so the save's answer moves over once.
    static func start(save: String?) {
        let saved = save.flatMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) } as? [String: Any]
        let defaults = UserDefaults.standard
        if !defaults.bool(forKey: carriedOver) {
            if let wanted = (saved?["settings"] as? [String: Any])?["reminders"] as? Bool {
                NineIO.shared.remindersEnabled = wanted
            }
            defaults.set(true, forKey: carriedOver)
        }
        setName((saved?["pet"] as? [String: Any])?["name"] as? String)
    }

    /// The game tells us its pet's name when it starts and when an egg hatches: nil before one has.
    static func setName(_ newName: String?) {
        name = newName?.isEmpty == false ? newName : nil
        NineIO.shared.comeback = comeback
        refresh()
    }

    /// Schedules the daily hello if the player wants reminders, or takes it away. Nothing arrives
    /// without iOS's permission, so this runs again whenever that may have changed.
    static func refresh() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [daily])
        guard NineIO.shared.remindersEnabled, let name else { return }
        let content = UNMutableNotificationContent()
        content.title = "\(name) is at the window"
        content.body = "Nose on the glass. Tail going. Come say hello?"
        content.sound = .default
        NineIO.tag(content, id: "daily")
        var when = DateComponents()
        when.hour = 18
        let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
        center.add(UNNotificationRequest(identifier: daily, content: content, trigger: trigger))
    }

    /// The nudge after three days away, in the pet's own voice.
    private static var comeback: (days: Int, title: String, body: String) {
        guard let name else {
            return (3, "Your egg is wriggling", "Something small and fluffy is waiting to meet you. Come and hatch it?")
        }
        return (3, "\(name) keeps checking the door", "It's been a few days. No rush, but a very fluffy hello is waiting whenever you're ready.")
    }
}
