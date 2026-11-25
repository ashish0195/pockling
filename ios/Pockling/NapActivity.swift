import ActivityKit
import Foundation

/// Starts, moves and ends the nap's Live Activity (NapAttributes.swift) as the game says: when the pet is tucked
/// in, when its wake time changes, and when it's up again. The game sends its nap with each save that changes it
/// (web/src/game.js syncNap), so a nap that ended while the app was closed ends on the next launch.
@MainActor
enum NapActivity {
    /// iOS lets a Live Activity run for 8 hours; a nap longer than that isn't shown.
    private static let longest: TimeInterval = 8 * 3600

    /// `body` is { on, name, breed, coat, stage, art?, wake (ms since 1970) }.
    static func update(_ body: [String: Any]) {
        guard body["on"] as? Bool == true,
              let name = body["name"] as? String, let breed = body["breed"] as? String,
              let coat = body["coat"] as? String, let stage = body["stage"] as? String,
              let wakeMs = body["wake"] as? Double else {
            end()
            return
        }
        let wake = Date(timeIntervalSince1970: wakeMs / 1000)
        let now = Date()
        guard wake > now.addingTimeInterval(60), wake < now.addingTimeInterval(longest) else {
            end()
            return
        }
        let content = ActivityContent(state: NapAttributes.ContentState(wake: wake, awake: false), staleDate: wake)
        if let current = Activity<NapAttributes>.activities.first(where: { $0.activityState == .active }) {
            // The same nap, perhaps a new wake time.
            Task { await current.update(content) }
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = NapAttributes(name: name, breed: breed, coat: coat, stage: stage, art: body["art"] as? String, started: now)
        _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
    }

    /// Up again (or no nap at all): the activity says so for a moment, then goes.
    static func end() {
        for activity in Activity<NapAttributes>.activities {
            let last = ActivityContent(state: NapAttributes.ContentState(wake: Date(), awake: true), staleDate: nil)
            Task { await activity.end(last, dismissalPolicy: .after(Date().addingTimeInterval(4))) }
        }
    }
}
