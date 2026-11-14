import Foundation
import WidgetKit

/// What the game left for the widget: the pet, and the moments ahead in which it changes, worked out with
/// the game's own rules (web/src/widget.js). The app keeps it in the App Group's folder
/// (ios/Pockling/WidgetShare.swift), on the phone.
struct PetSnapshot: Decodable {
    /// As in the app's WidgetShare.swift and both targets' entitlements.
    static let group = "group.app.pockling.Pockling"
    static let fileName = "widget.json"

    struct Pet: Decodable, Hashable {
        let name: String
        let breed: String
        let coat: String
        let stage: String
        /// "Kid Bunling" and so on.
        let kind: String
        /// The room's wall, top to bottom, as the game paints it.
        let wall: [String]
    }

    struct Moment: Decodable, Hashable {
        /// When it starts, in milliseconds since 1970, as the game counts.
        let at: Double
        let mood: String
        /// Which of tools/widget-art.mjs's faces to show.
        let look: String
        /// One word, for the Lock Screen.
        let word: String
        /// A short line, for the Home Screen.
        let line: String
        let asleep: Bool
        /// The lowest need: tummy, clean, energy, fun or love.
        let low: String
        /// Each need, 0 to 100, in fives.
        let needs: [String: Double]

        var date: Date { Date(timeIntervalSince1970: at / 1000) }
    }

    let pet: Pet?
    let moments: [Moment]

    enum Read {
        case snapshot(PetSnapshot)
        /// No file: the app hasn't been opened since it had a widget. When it writes one, it asks the
        /// widget to redraw.
        case missing
        /// A file that can't be read: the phone hasn't been unlocked since it started, or it's damaged.
        case unreadable
    }

    static func read() -> Read {
        guard let file = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent(fileName) else {
            return .unreadable
        }
        guard FileManager.default.fileExists(atPath: file.path) else { return .missing }
        guard let data = try? Data(contentsOf: file),
              let snapshot = try? JSONDecoder().decode(PetSnapshot.self, from: data) else { return .unreadable }
        return .snapshot(snapshot)
    }

    /// The widget's timeline from `start`: how the pet is now, then each change still to come.
    func entries(from start: Date) -> [PetEntry] {
        guard let pet, let first = moments.first else { return [PetEntry(date: start, state: .egg)] }
        let now = moments.last { $0.date <= start } ?? first
        return [PetEntry(date: start, state: .pet(pet, now))] + moments.filter { $0.date > start }.map { PetEntry(date: $0.date, state: .pet(pet, $0)) }
    }
}

struct PetEntry: TimelineEntry {
    enum State {
        case pet(PetSnapshot.Pet, PetSnapshot.Moment)
        /// No pet: the egg hasn't hatched, or the game started over.
        case egg
        /// The app hasn't been opened since it had a widget, so there's nothing to show yet.
        case unknown
    }

    let date: Date
    let state: State

    var pet: PetSnapshot.Pet? {
        if case .pet(let pet, _) = state { return pet }
        return nil
    }

    var now: PetSnapshot.Moment? {
        if case .pet(_, let now) = state { return now }
        return nil
    }

    var asleep: Bool { now?.asleep ?? false }

    /// A Pockling for the widget gallery and placeholders, when there's none of the player's own to show.
    static let sample = PetEntry(date: Date(), state: .pet(
        PetSnapshot.Pet(name: "Mochi", breed: "kitling", coat: "peach", stage: "grown", kind: "Grown Kitling", wall: ["#ffe9d6", "#ffd7bd"]),
        PetSnapshot.Moment(at: 0, mood: "content", look: "smile", word: "Happy", line: "Happy and cosy", asleep: false, low: "love",
                           needs: ["tummy": 75, "clean": 90, "energy": 85, "fun": 60, "love": 50])
    ))
}
