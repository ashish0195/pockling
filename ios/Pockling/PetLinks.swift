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
    static let keys: Set<String> = ["pet", "firstsnow", "snowfestival", "visit"]

    private static weak var host: GameHost?
    /// A link or reminder tapped before the game's host exists (a cold launch) waits for it.
    private static var waiting: String?
    /// A friend's pet from a visit link (pockling://visit?c=…, web/src/visit.js), waiting the same way.
    private static var waitingVisit: String?

    /// The pet a visit link carries: its code, as web/src/visit.js makes it, or nil. The game checks it again.
    nonisolated static func visitCode(for url: URL) -> String? {
        guard key(for: url) == "visit",
              let code = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "c" })?.value,
              (1...400).contains(code.count),
              code.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil else { return nil }
        return code
    }

    /// From SwiftUI's `onOpenURL`: a visit shows the friend's pet; any other link, the player's own.
    static func open(url: URL) {
        if let code = visitCode(for: url) {
            if let host {
                host.showVisit(code)
            } else {
                waitingVisit = code
            }
            return
        }
        let key = key(for: url)
        open(key == "visit" ? "pet" : key)
    }

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
        if let code = waitingVisit {
            waitingVisit = nil
            newHost.showVisit(code)
        }
    }
}
