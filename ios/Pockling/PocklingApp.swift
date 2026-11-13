import SwiftUI
import UIKit

@main
struct PocklingApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            GameScreen()
        }
    }
}

/// Starts 9io's anonymous usage data and notifications (NineIO.swift) before anything else, and hands
/// it the push token Apple gives the app.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        NineIO.shared.start(app: "pockling")
        // Pockling is a single screen with no open keys: a tapped notification just opens the app.
        NineIO.shared.onOpen = { _ in }
        Reminders.start(save: SaveStore().load())
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NineIO.shared.didRegister(deviceToken: deviceToken)
    }
}
