import SwiftUI
import WidgetKit

/// Pockling's widget: your pet on the Home Screen, the Lock Screen and in StandBy, with its name, how it
/// feels, whether it's asleep and what it needs most. Tapping it opens the game to visit.
@main
struct PocklingWidgets: WidgetBundle {
    var body: some Widget {
        PetWidget()
    }
}

struct PetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PocklingPet", provider: PetTimeline()) { entry in
            PetWidgetView(entry: entry)
                .containerBackground(for: .widget) { Backdrop(entry: entry) }
        }
        .configurationDisplayName("Your Pockling")
        .description("See how your pet is doing. Tap to visit.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

/// Reads the game's snapshot and shows each moment of it when its time comes. The snapshot already runs
/// ahead with the game's own rules until nothing more changes, and the app asks for a new timeline when
/// it saves something different, so the timeline never needs refreshing by itself.
struct PetTimeline: TimelineProvider {
    func placeholder(in context: Context) -> PetEntry {
        .sample
    }

    func getSnapshot(in context: Context, completion: @escaping (PetEntry) -> Void) {
        var entry = PetEntry(date: Date(), state: .unknown)
        if case .snapshot(let snapshot) = PetSnapshot.read(), let first = snapshot.entries(from: Date()).first {
            entry = first
        }
        // The gallery shows the player's own pet if there is one, and Mochi if not, rather than an egg.
        completion(context.isPreview && entry.pet == nil ? .sample : entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PetEntry>) -> Void) {
        let now = Date()
        switch PetSnapshot.read() {
        case .snapshot(let snapshot):
            completion(Timeline(entries: snapshot.entries(from: now), policy: .never))
        case .missing:
            completion(Timeline(entries: [PetEntry(date: now, state: .unknown)], policy: .never))
        case .unreadable:
            // Most likely the phone hasn't been unlocked since it started: try again in a while.
            completion(Timeline(entries: [PetEntry(date: now, state: .unknown)], policy: .after(now.addingTimeInterval(15 * 60))))
        }
    }
}
