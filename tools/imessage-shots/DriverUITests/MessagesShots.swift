// The iMessage screenshots on an iPad 13" simulator (docs/aso/listing-1.5.md): a UI test that drives Messages,
// opens Pockling's stickers in the simulator's Kate Bell conversation and saves the screen. Pockling has to be on
// the simulator with its stickers painted (open it once with a pet), and the status bar set with simctl first.
//   cd tools/imessage-shots && xcodegen generate
//   TEST_RUNNER_SHOTS_DIR=/some/dir xcodebuild test -project MsgShots.xcodeproj -scheme DriverUITests \
//     -destination id=<the iPad's udid>
// Messages' apps menu belongs to another process, so it's reached by position, for an iPad 13" held upright.
import XCTest

final class MessagesShots: XCTestCase {
    let out = ProcessInfo.processInfo.environment["SHOTS_DIR"] ?? NSTemporaryDirectory()
    let messages = XCUIApplication(bundleIdentifier: "com.apple.MobileSMS")

    func shot(_ name: String) {
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: "\(out)/\(name).png"))
    }

    /// A point in Messages' window, in points from the top left.
    func at(_ x: CGFloat, _ y: CGFloat) -> XCUICoordinate {
        messages.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y))
    }

    /// Kate Bell's conversation with Pockling's stickers open. From the Home Screen, so the status bar has no
    /// "back to" link.
    func openPockling() {
        XCUIDevice.shared.press(.home)
        sleep(2)
        messages.launch()
        sleep(4)
        messages.cells.containing(NSPredicate(format: "label CONTAINS '564'")).firstMatch.tap()
        sleep(2)
        messages.buttons["add"].tap()
        sleep(2)
        // Pockling is last in the menu: scroll to it.
        at(418, 1250).press(forDuration: 0.1, thenDragTo: at(418, 900))
        sleep(2)
        at(400, 1301).tap()
        sleep(5)
    }

    /// The stickers, all nine.
    func testStickers() throws {
        openPockling()
        XCTAssertTrue(messages.descendants(matching: .any).matching(NSPredicate(format: "label ==[c] 'hehe'")).firstMatch.exists)
        shot("02-stickers")
    }

    /// "Love you" in the message, ready to send.
    func testSend() throws {
        openPockling()
        messages.descendants(matching: .any).matching(NSPredicate(format: "label ==[c] 'love'")).firstMatch.tap()
        sleep(3)
        shot("01-send")
    }
}
