import Foundation
import Testing
@testable import Pockling

/// The app's links (PetLinks.swift): pockling://pet, and pockling://firstsnow for the "First Snow" in-app
/// event, both of which show the pet, as a tapped reminder does.
@MainActor
struct PetLinkTests {
    private func key(_ link: String) -> String? {
        PetLinks.key(for: URL(string: link)!)
    }

    @Test func theEventLinkAndThePetLinkShowThePet() {
        #expect(key("pockling://snowfestival") == "snowfestival")
        #expect(key("pockling://SnowFestival/") == "snowfestival")
        #expect(key("pockling://firstsnow") == "firstsnow")
        #expect(key("pockling://pet") == "pet")
        #expect(key("pockling://pet/") == "pet")
        #expect(key("POCKLING://Pet") == "pet")
        #expect(key("pockling:pet") == "pet")
        #expect(key("pockling://firstsnow?from=event") == "firstsnow")
        // Every reminder opens the pet the same way.
        #expect(PetLinks.keys.contains(ReminderPlan.open))
    }

    @Test func aVisitLinkCarriesItsPet() {
        #expect(PetLinks.visitCode(for: URL(string: "pockling://visit?c=eyJuIjoiUGlwIn0")!) == "eyJuIjoiUGlwIn0")
        #expect(PetLinks.visitCode(for: URL(string: "pockling://visit")!) == nil)
        #expect(PetLinks.visitCode(for: URL(string: "pockling://visit?c=no%20spaces")!) == nil)
        #expect(PetLinks.visitCode(for: URL(string: "pockling://pet?c=abc")!) == nil)
    }

    @Test func anythingElseLeadsNowhere() {
        #expect(key("pockling://") == nil)
        #expect(key("pockling://nowhere") == nil)
        #expect(key("https://bitfold.9io.ai/pockling/") == nil)
        #expect(key("bitfold://originals") == nil)
    }

    @Test func theWebViewsOwnFilesAreNotLinks() {
        // The game loads from pockling://app/... inside the web view (BundleSchemeHandler.swift). Same word,
        // but that host is never a link's key, and WebKit keeps those loads to itself.
        #expect(BundleSchemeHandler.scheme == PetLinks.scheme)
        #expect(BundleSchemeHandler.start.host() == "app")
        #expect(PetLinks.key(for: BundleSchemeHandler.start) == nil)
        #expect(key("pockling://app/index.html") == nil)
        #expect(key("pockling://app/src/app.js") == nil)
    }

    @Test func theAppSaysItOpensPocklingLinks() {
        let types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
        let schemes = types.flatMap { $0["CFBundleURLSchemes"] as? [String] ?? [] }
        #expect(schemes == ["pockling"])
    }
}
