import UserNotifications

/// One gentle local notification a day, only if you turned it on. Nothing goes through a server.
enum Reminders {
    private static let id = "pockling.daily"

    static func set(enabled: Bool, name: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [id])
        guard enabled else { return }
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return }
            let content = UNMutableNotificationContent()
            content.title = "\(name) is at the window"
            content.body = "Nose on the glass. Tail going. Come say hello?"
            content.sound = .default
            var when = DateComponents()
            when.hour = 18
            let trigger = UNCalendarNotificationTrigger(dateMatching: when, repeats: true)
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }
}
