import SwiftUI
import UIKit

@main
struct PocklingApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            GameScreen()
                // pockling://pet and pockling://firstsnow (PetLinks.swift) show the pet, as reminders do.
                .onOpenURL { url in PetLinks.open(url: url) }
        }
    }
}

/// Starts 9io's anonymous usage data and notifications (NineIO.swift) before anything else, and hands
/// it the push token Apple gives the app.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        NineIO.shared.start(app: "pockling")
        // "Not now" on the notification card turns on quiet reminders instead (no prompt; Notification
        // Center only, where iOS asks whether to keep them). News never comes that way.
        NineIO.shared.quietAfterNotNow = true
        // Every reminder opens "pet": the game closes any menu and goes home to the pet (PetLinks.swift).
        NineIO.shared.onOpen = { key in PetLinks.open(key) }
        Reminders.start(save: SaveStore().load())
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NineIO.shared.didRegister(deviceToken: deviceToken)
    }
}
