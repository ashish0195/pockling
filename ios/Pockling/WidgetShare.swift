import Foundation
import UIKit
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
    /// The key of the snapshot the widget was last given, and when.
    private static var shownKey: String?
    private static var handedAt = Date.distantPast
    private static var pending: DispatchWorkItem?
    /// Time asked of iOS to finish a hand-over from the background.
    private static var task = UIBackgroundTaskIdentifier.invalid

    private static var file: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent(fileName)
    }

    /// With each save, about once a second while the game runs. The widget gets the snapshot when what it
    /// shows changes (the key), not every second; and right away from the background, where the game's last
    /// save before leaving arrives. While the app is open a redraw costs the widget nothing, so it also
    /// catches up every two minutes, in case the app is closed without leaving the screen first.
    static func save(_ snapshot: String, key: String, inBackground: Bool) {
        latest = snapshot
        latestKey = key
        if inBackground {
            hand(after: 0)
        } else if pending == nil, key != shownKey || Date().timeIntervalSince(handedAt) > 120 {
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
            DispatchQueue.main.async { endTask() }
        }
    }

    /// Leaving the screen: the widget catches up with everything since it was last handed a snapshot.
    static func appWentBackground() {
        hand(after: 0)
    }

    /// Writes the latest snapshot for the widget and asks it to redraw, once for a burst of changes.
    private static func hand(after delay: Double) {
        pending?.cancel()
        if delay == 0, task == .invalid {
            task = UIApplication.shared.beginBackgroundTask(withName: "Widget snapshot") { endTask() }
        }
        let work = DispatchWorkItem {
            pending = nil
            guard let snapshot = latest else {
                endTask()
                return
            }
            shownKey = latestKey
            handedAt = Date()
            queue.async {
                if let file { try? Data(snapshot.utf8).write(to: file, options: .atomic) }
                WidgetCenter.shared.reloadAllTimelines()
                DispatchQueue.main.async { endTask() }
            }
        }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }

    private static func endTask() {
        guard task != .invalid else { return }
        UIApplication.shared.endBackgroundTask(task)
        task = .invalid
    }
}
