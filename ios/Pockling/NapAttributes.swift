import ActivityKit
import Foundation

/// A nap in the Dynamic Island and on the Lock Screen (a Live Activity, from 1.5): from the moment the pet is
/// tucked in until it wakes. The game says when (web/src/game.js, the "nap" message, GameHost.swift), the app
/// starts and ends it (Pockling/NapActivity.swift), and the widget extension draws it
/// (PocklingWidget/NapLiveActivity.swift). The same struct is in both targets: iOS matches them by name.
struct NapAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// When it should wake, by the game's own rules (the widget's forecast, web/src/widget.js).
        var wake: Date
        /// Awake again: the last thing the activity shows before it goes.
        var awake: Bool
    }

    /// The pet, as the widget knows it, for its pictures (PetArt.swift) and its name.
    var name: String
    var breed: String
    var coat: String
    var stage: String
    /// Its own look's pictures (1.4), if it has one.
    var art: String?
    /// When it was tucked in: the start of the sleep bar.
    var started: Date
}
