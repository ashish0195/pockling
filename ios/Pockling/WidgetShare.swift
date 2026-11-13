import Foundation
import WidgetKit

/// Hands the Home Screen, Lock Screen and StandBy widget (PocklingWidget) what it shows. With each save
/// the game makes a small snapshot of the pet (web/src/widget.js): its name and looks, and how its needs
/// will drift until the game is next opened. It goes in a file in the App Group's folder on the phone,
/// where the widget can read it. Nothing in it leaves the phone.
enum WidgetShare {
    /// The App Group both targets' entitlements list. PocklingWidget/PetSnapshot.swift reads from it too.
    static let group = "group.app.pockling.Pockling"
    static let fileName = "widget.json"

    private static let queue = DispatchQueue(label: "app.pockling.widget")

    // Main thread only.
    /// The game's latest snapshot, and its key for what the widget would show.
    private static var latest: String?
    private static var latestKey: String?
    /// The key of the snapshot the widget was last given.
    private static var shownKey: String?
    private static var pending: DispatchWorkItem?

    private static var file: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent(fileName)
    }

    /// With each save, about once a second while the game runs. The widget gets the snapshot when what it
    /// shows changes (the key) and when the app leaves the screen, so the phone isn't writing it every
    /// second; and right away from the background, where the game's last save before leaving arrives.
    static func save(_ snapshot: String, key: String, inBackground: Bool) {
        latest = snapshot
        latestKey = key
        if inBackground {
            hand(after: 0)
        } else if key != shownKey, pending == nil {
            // Saves come about once a second, so this isn't put off by the next one: when it runs it
            // takes whatever the latest snapshot is by then.
            hand(after: 1)
        }
    }

    /// Starting over: no pet now. The game's next save brings the egg.
    static func clear() {
        pending?.cancel()
        pending = nil
        latest = nil
        latestKey = nil
        shownKey = nil
        queue.async {
            if let file { try? FileManager.default.removeItem(at: file) }
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    /// Leaving the screen: the widget catches up with everything since it was last handed a snapshot.
    static func appWentBackground() {
        hand(after: 0)
    }

    /// Writes the latest snapshot for the widget and asks it to redraw, once for a burst of changes.
    private static func hand(after delay: Double) {
        pending?.cancel()
        let work = DispatchWorkItem {
            pending = nil
            guard let snapshot = latest else { return }
            shownKey = latestKey
            queue.async {
                if let file { try? Data(snapshot.utf8).write(to: file, options: .atomic) }
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }
}
