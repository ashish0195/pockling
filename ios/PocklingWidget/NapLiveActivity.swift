import ActivityKit
import SwiftUI
import WidgetKit

/// The pet's nap as a Live Activity (from 1.5): on the Lock Screen and in the Dynamic Island, the pet asleep with
/// its own picture (PetArt.swift, its own look's too), its name, and how long until it wakes, counting down by
/// itself. When the time comes it says the pet is up. The app starts and ends it (Pockling/NapActivity.swift).
struct NapLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NapAttributes.self) { context in
            NapBanner(context: context)
                .activityBackgroundTint(Color(red: 0.17, green: 0.14, blue: 0.33))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "pockling://pet"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    NapPet(context: context, size: 52)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.attributes.name).font(.headline).lineLimit(1)
                        Text(NapText.status(context)).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    NapCountdown(context: context).font(.title3.monospacedDigit().weight(.semibold)).frame(maxWidth: 76)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    NapBar(context: context).padding(.horizontal, 4)
                }
            } compactLeading: {
                NapPet(context: context, size: 24)
            } compactTrailing: {
                NapCountdown(context: context).font(.caption.monospacedDigit().weight(.semibold)).frame(maxWidth: 52)
            } minimal: {
                NapPet(context: context, size: 22)
            }
            .widgetURL(URL(string: "pockling://pet"))
            .keylineTint(Color(red: 0.82, green: 0.72, blue: 1))
        }
    }
}

enum NapText {
    static func awake(_ context: ActivityViewContext<NapAttributes>) -> Bool {
        context.state.awake || context.isStale || context.state.wake <= Date()
    }

    static func status(_ context: ActivityViewContext<NapAttributes>) -> String {
        awake(context) ? "Awake! Come say hi" : "Fast asleep, zzz"
    }
}

/// The pet asleep (or, once it's up, smiling), from the widget's own pictures.
struct NapPet: View {
    let context: ActivityViewContext<NapAttributes>
    let size: CGFloat

    var body: some View {
        if let image {
            Image(decorative: image, scale: 1)
                .resizable()
                .interpolation(.high)
                .scaledToFit()
                .frame(width: size, height: size)
        } else {
            Text("💤").font(.system(size: size * 0.7))
        }
    }

    private var image: CGImage? {
        let a = context.attributes
        let pet = PetSnapshot.Pet(name: a.name, breed: a.breed, coat: a.coat, stage: a.stage, kind: "", wall: [], art: a.art)
        // Pixels for the size it's shown at, at 3x, as the widget does.
        return PetArt.pet(pet, look: NapText.awake(context) ? "happy" : "sleep", maxPixels: Int(size * 3))
    }
}

/// How long until it wakes, counting down by itself; then a sun.
struct NapCountdown: View {
    let context: ActivityViewContext<NapAttributes>

    var body: some View {
        if NapText.awake(context) {
            Text("☀️")
        } else {
            Text(timerInterval: Date()...context.state.wake, countsDown: true)
                .multilineTextAlignment(.trailing)
        }
    }
}

/// The night so far, from tucking in to waking, filling by itself.
struct NapBar: View {
    let context: ActivityViewContext<NapAttributes>

    var body: some View {
        if NapText.awake(context) {
            ProgressView(value: 1).tint(Color(red: 1, green: 0.83, blue: 0.45))
        } else {
            ProgressView(timerInterval: context.attributes.started...max(context.attributes.started.addingTimeInterval(1), context.state.wake), countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .tint(Color(red: 0.82, green: 0.72, blue: 1))
        }
    }
}

/// The Lock Screen's banner: the pet, its name, and its sleep so far.
struct NapBanner: View {
    let context: ActivityViewContext<NapAttributes>

    var body: some View {
        HStack(spacing: 14) {
            NapPet(context: context, size: 64)
            VStack(alignment: .leading, spacing: 6) {
                // The name gets the whole line; the countdown goes on the next one.
                Text(NapText.awake(context) ? "\(context.attributes.name) is up!" : "\(context.attributes.name) is napping")
                    .font(.headline)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                if NapText.awake(context) {
                    Text("Come and say good morning.").font(.subheadline).opacity(0.85)
                } else {
                    HStack(spacing: 4) {
                        Text("Wakes up in").opacity(0.85)
                        NapCountdown(context: context).monospacedDigit().fontWeight(.semibold)
                    }
                    .font(.subheadline)
                }
                NapBar(context: context)
            }
        }
        .foregroundStyle(.white)
        .padding(16)
    }
}
