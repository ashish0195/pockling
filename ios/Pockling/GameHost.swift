import CoreMotion
import LinkPresentation
import SwiftUI
import UIKit
import WebKit

/// Runs the game in a web view and answers what it asks of the phone: saving (and the widget's copy of
/// the pet), haptics, sharing, the microphone, reminders, notifications, usage data, the rating prompt
/// and tilt. The game's side of this is web/src/platform.js.
final class GameHost: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {
    let webView: WKWebView

    private let store = SaveStore()
    private let haptics = Haptics()
    private let talk = TalkBack()
    private let motion = CMMotionManager()
    private var isReady = false
    private var motionWanted = false
    private var queued: [String] = []
    private var fold: Fold?

    override init() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let content = WKUserContentController()
        if let save = store.load(), let literal = GameHost.jsLiteral(save) {
            content.addUserScript(WKUserScript(source: "window.__pocklingSave = \(literal);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        config.userContentController = content

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "LaunchBackground")
        webView.allowsLinkPreview = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        #if DEBUG
        webView.isInspectable = true
        #endif

        super.init()
        content.add(WeakMessageHandler(self), name: "pockling")
        webView.navigationDelegate = self
        talk.onState = { [weak self] state in self?.emit("talk:state", ["state": state]) }
        talk.onLevel = { [weak self] level in self?.emit("talk:level", ["level": level]) }
        NotificationCenter.default.addObserver(self, selector: #selector(wentBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(cameForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        webView.load(URLRequest(url: BundleSchemeHandler.start))
    }

    // MARK: Messages from the game

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let command = body["cmd"] as? String else { return }
        switch command {
        case "ready":
            isReady = true
            flush()
        case "save":
            let json = body["json"] as? String ?? ""
            store.write(json)
            if json.isEmpty {
                // Starting over: a reload mustn't bring back the save we put into the page at launch.
                webView.configuration.userContentController.removeAllUserScripts()
                WidgetShare.clear()
            } else if let widget = body["widget"] as? String {
                WidgetShare.save(widget, key: body["widgetKey"] as? String ?? "", inBackground: UIApplication.shared.applicationState == .background)
            }
        case "haptic":
            haptics.play(body["kind"] as? String ?? "light")
        case "purr":
            haptics.purr(body["on"] as? Bool ?? false)
        case "share":
            share(png: body["png"] as? String ?? "", text: body["text"] as? String ?? "")
        case "open":
            if let text = body["url"] as? String, let url = URL(string: text) { UIApplication.shared.open(url) }
        case "pet":
            Reminders.setName(body["name"] as? String)
        case "track":
            track(body)
        case "notifySettings", "notifySet", "notifyOffer", "notifyAnswer":
            Task { await answerNotify(command, body) }
        case "review":
            askForReview(body)
        case "openSettings":
            if let url = URL(string: UIApplication.openNotificationSettingsURLString) { UIApplication.shared.open(url) }
        case "keepAwake":
            UIApplication.shared.isIdleTimerDisabled = body["on"] as? Bool ?? false
        case "talkStart":
            talk.start()
        case "talkStop":
            talk.stop()
        case "motion":
            motionWanted = body["on"] as? Bool ?? false
            updateMotion()
        default:
            break
        }
    }

    // MARK: Events to the game

    private func emit(_ event: String, _ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload), let json = String(data: data, encoding: .utf8) else { return }
        let script = "window.__pockling && window.__pockling.emit('\(event)', \(json));"
        if isReady {
            webView.evaluateJavaScript(script, completionHandler: nil)
        } else {
            queued.append(script)
        }
    }

    private func flush() {
        for script in queued { webView.evaluateJavaScript(script, completionHandler: nil) }
        queued.removeAll()
    }

    func setFold(_ newFold: Fold?) {
        guard newFold != fold else { return }
        fold = newFold
        if let newFold {
            emit("fold", ["y": newFold.position, "vertical": newFold.isVertical])
        } else {
            webView.evaluateJavaScript("window.__pockling && window.__pockling.emit('fold', null);", completionHandler: nil)
        }
    }

    // MARK: Tilt

    private func updateMotion() {
        guard motion.isDeviceMotionAvailable else { return }
        if motionWanted, UIApplication.shared.applicationState != .background {
            guard !motion.isDeviceMotionActive else { return }
            motion.deviceMotionUpdateInterval = 1.0 / 20
            motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
                guard let gravity = data?.gravity else { return }
                let x = max(-1, min(1, gravity.x * 1.6))
                let y = max(-1, min(1, (gravity.y + 0.7) * 1.6))
                self?.emit("motion", ["x": x, "y": y])
            }
        } else {
            motion.stopDeviceMotionUpdates()
        }
    }

    @objc private func wentBackground() {
        motion.stopDeviceMotionUpdates()
        haptics.purr(false)
        talk.stop()
        WidgetShare.appWentBackground()
    }

    @objc private func cameForeground() {
        updateMotion()
        // Notifications may have been allowed in iOS Settings while we were away.
        Reminders.refresh()
    }

    // MARK: Usage data and notifications (NineIO.swift)

    /// A usage event from the game: a name and a few short strings, never the pet's name or anything
    /// typed. The name has to fit the games API's pattern, so a typo can't slip through.
    private func track(_ body: [String: Any]) {
        guard let name = body["name"] as? String,
              name.range(of: "^[a-z][a-z0-9_]{0,39}$", options: .regularExpression) != nil else { return }
        let props = (body["props"] as? [String: Any] ?? [:]).compactMapValues { $0 as? String }
        NineIO.event(name, props)
    }

    /// A happy moment in the game (the pet grew up, a streak day): NineIO shows iOS's rating prompt
    /// if it's due. The moment's key has to fit the games API's pattern too.
    private func askForReview(_ body: [String: Any]) {
        guard let moment = body["at"] as? String,
              moment.range(of: "^[a-z][a-z0-9_]{0,39}$", options: .regularExpression) != nil else { return }
        Task { @MainActor in NineIO.shared.askForReview(at: moment) }
    }

    /// Answers the game's Settings and its notification card. Every answer goes back with the id of
    /// the question and the player's choices as they now stand.
    @MainActor
    private func answerNotify(_ command: String, _ body: [String: Any]) async {
        let nine = NineIO.shared
        var answer: [String: Any] = [:]
        switch command {
        case "notifySet":
            let key = body["key"] as? String ?? ""
            let on = body["on"] as? Bool ?? false
            switch key {
            case "reminders": nine.remindersEnabled = on
            case "news": nine.newsEnabled = on
            case "analytics": nine.analyticsEnabled = on
            default: break
            }
            if on, key == "reminders" || key == "news" {
                // False means they're off in iOS Settings, and the game offers to open them.
                answer["blocked"] = !(await nine.ensurePermission())
            }
            Reminders.refresh()
        case "notifyOffer":
            answer["offer"] = await nine.shouldOfferNotifications()
        case "notifyAnswer":
            let choice = NineIO.Answer(rawValue: body["answer"] as? String ?? "") ?? .later
            answer["granted"] = await nine.answerNotificationOffer(choice)
            Reminders.refresh()
        default:
            break
        }
        let status = await nine.notificationStatus()
        answer["allowed"] = status == .authorized || status == .provisional || status == .ephemeral
        answer["reminders"] = nine.remindersEnabled
        answer["news"] = nine.newsEnabled
        answer["analytics"] = nine.analyticsEnabled
        emit("answer", ["id": body["id"] ?? 0, "value": answer])
    }

    // MARK: Sharing

    private func share(png: String, text: String) {
        guard let data = Data(base64Encoded: png), let image = UIImage(data: data) else { return }
        guard let top = webView.window?.rootViewController?.topmost else { return }
        let sheet = UIActivityViewController(activityItems: [PetCardShare(image: image, text: text), text], applicationActivities: nil)
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = webView
            popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        top.present(sheet, animated: true)
    }

    // MARK: Navigation

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // The game stays in its own bundle. Anything else opens in the browser.
        if let url = navigationAction.request.url, url.scheme != BundleSchemeHandler.scheme {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS reclaimed the page while we were away: start again from the last save.
        isReady = false
        queued.removeAll()
        if let save = store.load(), let literal = GameHost.jsLiteral(save) {
            webView.configuration.userContentController.removeAllUserScripts()
            webView.configuration.userContentController.addUserScript(WKUserScript(source: "window.__pocklingSave = \(literal);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        webView.reload()
    }

    private static func jsLiteral(_ text: String) -> String? {
        guard let data = try? JSONEncoder().encode(text) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

/// Puts the pet's picture at the top of the share sheet, rather than the text that goes with it.
private final class PetCardShare: NSObject, UIActivityItemSource {
    let image: UIImage
    let text: String

    init(image: UIImage, text: String) {
        self.image = image
        self.text = text
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        image
    }

    func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        image
    }

    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.title = text
        metadata.imageProvider = NSItemProvider(object: image)
        metadata.iconProvider = NSItemProvider(object: image)
        return metadata
    }
}

private extension UIViewController {
    var topmost: UIViewController {
        presentedViewController?.topmost ?? self
    }
}

/// WKUserContentController keeps its handlers alive; this stops it keeping the host alive too.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
