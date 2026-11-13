import SwiftUI
import WidgetKit

/// The widget in each of its sizes. StandBy shows the small one, without its background.
struct PetWidgetView: View {
    let entry: PetEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular: CircularView(entry: entry)
        case .accessoryRectangular: RectangularView(entry: entry)
        case .accessoryInline: InlineView(entry: entry)
        case .systemMedium: MediumView(entry: entry)
        default: SmallView(entry: entry)
        }
    }
}

// MARK: - Home Screen and StandBy

struct SmallView: View {
    let entry: PetEntry
    @Environment(\.showsWidgetContainerBackground) private var showsBackground
    @Environment(\.backgroundRemoved) private var backgroundRemoved

    var body: some View {
        let theme = Theme(entry, showsBackground: showsBackground && !backgroundRemoved)
        VStack(spacing: 2) {
            PetPicture(entry: entry)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                // The pet can reach into the top margin: there's only see-through above its ears.
                .padding(.top, -10)
                .overlay(alignment: .topTrailing) {
                    if entry.asleep { Snore(color: theme.soft).offset(y: -6) }
                }
            HStack(spacing: 6) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(entry.title)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(theme.ink)
                    Text(entry.line)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(theme.soft)
                }
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                Spacer(minLength: 0)
                if let now = entry.now {
                    NeedRing(need: .named(now.low), value: now.needs[now.low] ?? 0, size: 24, dark: theme.dark)
                }
            }
        }
    }
}

struct MediumView: View {
    let entry: PetEntry
    @Environment(\.showsWidgetContainerBackground) private var showsBackground
    @Environment(\.backgroundRemoved) private var backgroundRemoved

    var body: some View {
        let theme = Theme(entry, showsBackground: showsBackground && !backgroundRemoved)
        HStack(spacing: 14) {
            PetPicture(entry: entry)
                .frame(width: 124)
                .frame(maxHeight: .infinity)
                .padding(.vertical, -6)
                .overlay(alignment: .topTrailing) {
                    if entry.asleep { Snore(color: theme.soft).offset(x: 8) }
                }
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.title)
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(theme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if let subtitle = entry.subtitle {
                    Text(subtitle)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(theme.soft)
                }
                Spacer(minLength: 2)
                Text(entry.line)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 4)
                if let now = entry.now {
                    // Smaller rings where the widget is narrower, as on an iPhone SE.
                    ViewThatFits(in: .horizontal) {
                        ForEach([28, 24, 20] as [CGFloat], id: \.self) { size in
                            HStack(spacing: size / 4.5) {
                                ForEach(Need.all) { need in
                                    NeedRing(need: need, value: now.needs[need.key] ?? 0, size: size, dark: theme.dark)
                                }
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Lock Screen

/// The pet in a ring that's as full as its lowest need.
struct CircularView: View {
    let entry: PetEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            if let now = entry.now {
                let value = min(max((now.needs[now.low] ?? 0) / 100, 0.03), 1)
                Circle().inset(by: 2.5).stroke(.primary.opacity(0.25), lineWidth: 4)
                Circle().inset(by: 2.5)
                    .trim(from: 0, to: value)
                    .stroke(.primary, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .widgetAccentable()
            }
            PetPicture(entry: entry, maxPixels: 140).padding(entry.now == nil ? 8 : 9)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibility)
    }

    private var accessibility: String {
        guard let now = entry.now else { return "\(entry.title): \(entry.line)" }
        let need = Need.named(now.low)
        return "\(entry.title): \(now.word). \(need.label) \(Int(now.needs[now.low] ?? 0)) percent"
    }
}

struct RectangularView: View {
    let entry: PetEntry

    var body: some View {
        HStack(spacing: 6) {
            PetPicture(entry: entry, maxPixels: 160)
                .frame(width: 50)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.title)
                    .font(.headline)
                    .widgetAccentable()
                Text(entry.word)
                    .font(.subheadline)
                if let now = entry.now {
                    NeedBar(need: .named(now.low), value: now.needs[now.low] ?? 0)
                        .padding(.top, 2)
                }
            }
            .lineLimit(1)
            Spacer(minLength: 0)
        }
    }
}

struct InlineView: View {
    let entry: PetEntry

    var body: some View {
        if let pet = entry.pet, let now = entry.now {
            ViewThatFits {
                Text("\(Image(systemName: now.asleep ? "moon.zzz.fill" : "pawprint.fill")) \(pet.name) · \(now.word)")
                Text("\(pet.name) · \(now.word)")
            }
        } else {
            Text("\(Image(systemName: "pawprint.fill")) Pockling")
        }
    }
}

// MARK: - Pieces

/// The pet's picture for an entry, or the egg.
struct PetPicture: View {
    let entry: PetEntry
    var maxPixels: Int?

    var body: some View {
        if let image {
            let picture = Image(decorative: image, scale: 1).resizable().interpolation(.high)
            // On a tinted Home Screen the pet keeps its colours, as a photo would.
            if #available(iOS 18.0, *) {
                look(picture.widgetAccentedRenderingMode(.fullColor))
            } else {
                look(picture)
            }
        }
    }

    private func look(_ picture: some View) -> some View {
        picture
            .scaledToFit()
            // Asleep, the pet catches a little of the night, as it does in its bed in the game.
            .colorMultiply(entry.asleep ? Color(red: 0.92, green: 0.91, blue: 0.99) : .white)
    }

    private var image: CGImage? {
        if let pet = entry.pet, let now = entry.now { return PetArt.pet(pet, look: now.look, maxPixels: maxPixels) }
        return PetArt.egg(maxPixels: maxPixels)
    }
}

/// One of the game's need rings: a coloured ring round the need's emoji, as full as the need.
struct NeedRing: View {
    let need: Need
    let value: Double
    var size: CGFloat = 26
    var dark = false

    var body: some View {
        let line = size * 0.13
        ZStack {
            Circle().fill(dark ? Color.white.opacity(0.14) : Color.white.opacity(0.78))
            Circle().inset(by: line / 2).stroke(need.color.opacity(0.28), lineWidth: line)
            Circle().inset(by: line / 2)
                .trim(from: 0, to: min(max(value / 100, 0.03), 1))
                .stroke(need.color, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(need.icon).font(.system(size: size * 0.42))
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(need.label) \(Int(value)) percent")
    }
}

/// The lowest need as a bar, for the Lock Screen.
struct NeedBar: View {
    let need: Need
    let value: Double

    var body: some View {
        HStack(spacing: 4) {
            Text(need.icon).font(.system(size: 10))
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(.primary.opacity(0.25))
                    Capsule().fill(.primary).frame(width: max(5, geo.size.width * min(value, 100) / 100))
                }
            }
            .frame(height: 5)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(need.label) \(Int(value)) percent")
    }
}

/// A sleepy "z z Z" over the pet's head.
struct Snore: View {
    let color: Color
    var size: CGFloat = 13

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Text("z").font(.system(size: size * 0.7, weight: .heavy, design: .rounded))
            Text("z").font(.system(size: size * 0.9, weight: .heavy, design: .rounded)).offset(x: size * 0.6, y: -size * 0.65)
            Text("Z").font(.system(size: size * 1.1, weight: .heavy, design: .rounded)).offset(x: size * 1.3, y: -size * 1.4)
        }
        .foregroundStyle(color)
        .frame(width: size * 2.4, height: size * 2.6, alignment: .bottomLeading)
        .accessibilityHidden(true)
    }
}

/// The widget's background: the pet's room wall by day, the night sky while it sleeps.
struct Backdrop: View {
    let entry: PetEntry

    var body: some View {
        if entry.asleep {
            ZStack {
                LinearGradient(colors: [Color(hex: "#3b3a78"), Color(hex: "#262552")], startPoint: .top, endPoint: .bottom)
                Sprinkles(symbol: "star.fill", color: Color(hex: "#ffd76b").opacity(0.6), spots: Sprinkles.stars)
            }
        } else {
            let wall = entry.pet?.wall ?? ["#ffe9d6", "#ffd7bd"]
            ZStack {
                LinearGradient(colors: wall.map(Color.init(hex:)), startPoint: .top, endPoint: .bottom)
                Sprinkles(symbol: "heart.fill", color: .white.opacity(Theme.isDark(wall) ? 0.2 : 0.6), spots: Sprinkles.hearts)
            }
        }
    }
}

/// A few hearts or stars round the edges, as on the app icon.
struct Sprinkles: View {
    typealias Spot = (x: Double, y: Double, size: Double, angle: Double)

    let symbol: String
    let color: Color
    let spots: [Spot]

    static let hearts: [Spot] = [(0.09, 0.13, 12, -17), (0.91, 0.11, 15, 17), (0.95, 0.5, 7, 11), (0.05, 0.56, 7, -11)]
    /// Clear of the top right, where the "z z Z" goes.
    static let stars: [Spot] = [(0.09, 0.13, 12, -17), (0.95, 0.44, 9, 17), (0.05, 0.6, 7, -11)]

    var body: some View {
        GeometryReader { geo in
            ForEach(spots.indices, id: \.self) { i in
                let spot = spots[i]
                Image(systemName: symbol)
                    .font(.system(size: spot.size))
                    .foregroundStyle(color)
                    .rotationEffect(.degrees(spot.angle))
                    .position(x: geo.size.width * spot.x, y: geo.size.height * spot.y)
            }
        }
    }
}

/// StandBy takes the widget's background away, leaving it on black. Only WidgetKit can say so, and the
/// simulator has no StandBy, so the StandBy preview at the bottom sets this instead.
struct BackgroundRemovedKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var backgroundRemoved: Bool {
        get { self[BackgroundRemovedKey.self] }
        set { self[BackgroundRemovedKey.self] = newValue }
    }
}

/// Light text on the night sky and the starry room, and where the background is taken away (StandBy);
/// the game's plum ink on every other wall.
struct Theme {
    let dark: Bool
    let ink: Color
    let soft: Color

    init(_ entry: PetEntry, showsBackground: Bool) {
        dark = entry.asleep || !showsBackground || Theme.isDark(entry.pet?.wall ?? [])
        ink = dark ? Color(hex: "#fff6ec") : Color(hex: "#4a3540")
        soft = dark ? Color(hex: "#d4ccf6") : Color(hex: "#8a6775")
    }

    static func isDark(_ wall: [String]) -> Bool {
        guard let top = wall.first else { return false }
        let rgb = Color.rgb(top)
        return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b < 0.5
    }
}

/// The five needs as the game's rings show them (web/src/ui/hud.js).
struct Need: Identifiable {
    let key: String
    let icon: String
    let label: String
    let color: Color

    var id: String { key }

    static let all = [
        Need(key: "tummy", icon: "🍎", label: "Tummy", color: Color(hex: "#ff8a5c")),
        Need(key: "clean", icon: "🫧", label: "Clean", color: Color(hex: "#5eb8ff")),
        Need(key: "energy", icon: "⚡", label: "Energy", color: Color(hex: "#ffc247")),
        Need(key: "fun", icon: "🎈", label: "Fun", color: Color(hex: "#4fcfa8")),
        Need(key: "love", icon: "💖", label: "Love", color: Color(hex: "#ff6f97")),
    ]

    static func named(_ key: String) -> Need {
        all.first { $0.key == key } ?? all[0]
    }
}

extension PetEntry {
    var title: String {
        switch state {
        case .pet(let pet, _): pet.name
        case .egg: "An egg!"
        case .unknown: "Pockling"
        }
    }

    /// Under the name in the medium widget.
    var subtitle: String? {
        switch state {
        case .pet(let pet, _): pet.kind
        case .egg: "Something fluffy is inside"
        case .unknown: nil
        }
    }

    var line: String {
        switch state {
        case .pet(_, let now): now.line
        case .egg: "Tap to hatch it"
        case .unknown: "Open to say hello"
        }
    }

    /// The short version, for the Lock Screen.
    var word: String {
        switch state {
        case .pet(_, let now): now.word
        case .egg: "Hatch me!"
        case .unknown: "Say hello"
        }
    }
}

extension Color {
    /// A colour as the game writes it, "#rrggbb".
    init(hex: String) {
        let rgb = Color.rgb(hex)
        self.init(red: rgb.r, green: rgb.g, blue: rgb.b)
    }

    static func rgb(_ hex: String) -> (r: Double, g: Double, b: Double) {
        let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
        return (Double((value >> 16) & 0xff) / 255, Double((value >> 8) & 0xff) / 255, Double(value & 0xff) / 255)
    }
}

#Preview("Small", as: .systemSmall) {
    PetWidget()
} timeline: {
    PetEntry.sample
}

#Preview("Medium", as: .systemMedium) {
    PetWidget()
} timeline: {
    PetEntry.sample
}

#Preview("Lock Screen", as: .accessoryRectangular) {
    PetWidget()
} timeline: {
    PetEntry.sample
}

#Preview("StandBy") {
    SmallView(entry: .sample)
        .environment(\.backgroundRemoved, true)
        .padding(16)
        .frame(width: 170, height: 170)
        .background(.black)
}
