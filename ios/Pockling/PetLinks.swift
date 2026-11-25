import Foundation

/// Where a tapped reminder or a link to the app leads: the pet. The app's URL scheme is `pockling`
/// (Info.plist): pockling://pet; pockling://snowfestival, the Snow Festival's App Store event (1.4.1), which opens
/// the festival's card on the pet's screen (web/src/festival.js); and pockling://firstsnow, 1.3.2's link for the
/// event as it was first planned, which does the same now.
///
/// It's the same word as the scheme the game's own files load from inside the web view
/// (pockling://app/index.html, BundleSchemeHandler.swift), and the two don't meet: WebKit answers its
/// page's pockling:// requests itself and never hands them to iOS, and iOS hands the app a pockling:// link
/// only when one is opened from outside. Links to `app`, the web view's host, lead nowhere.
@MainActor
enum PetLinks {
    static let scheme = "pockling"
    /// "pet" is also the `open` key of every reminder (ReminderPlan.open).
    static let keys: Set<String> = ["pet", "firstsnow", "snowfestival"]

    private static weak var host: GameHost?
    /// A link or reminder tapped before the game's host exists (a cold launch) waits for it.
    private static var waiting: String?

    /// The key a link carries, or nil if it isn't one of the app's links: pockling://pet, pockling://pet/,
    /// pockling:pet and pockling://PET all give "pet".
    nonisolated static func key(for url: URL) -> String? {
        guard url.scheme?.lowercased() == scheme else { return nil }
        let key = (url.host() ?? url.path()).trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()
        return keys.contains(key) ? key : nil
    }

    /// From NineIO's `onOpen` and SwiftUI's `onOpenURL`. Any other key leaves the game where it is.
    static func open(_ key: String?) {
        guard let key, keys.contains(key) else { return }
        if let host {
            host.showPet(key)
        } else {
            waiting = key
        }
    }

    static func attach(_ newHost: GameHost) {
        host = newHost
        if let key = waiting {
            waiting = nil
            newHost.showPet(key)
        }
    }
}
