import Messages
import OSLog
import UIKit

/// Pockling in Messages (from 1.5): stickers of the player's own pet, as it looks right now, its own look too.
/// The game paints them in the app (web/src/petArt.js paintStickers) and the app keeps them in the App Group's
/// Stickers folder (WidgetShare.saveStickers). Until the app has been opened since the update, there are none
/// yet, and this says so.
final class StickersViewController: MSMessagesAppViewController {
    /// As in the app's WidgetShare and the entitlements.
    static let group = "group.app.pockling.Pockling"
    static let log = Logger(subsystem: "app.pockling.Pockling.Stickers", category: "stickers")

    private let browser = PetStickerBrowser(stickerSize: .regular)
    private let empty = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 1, green: 0.97, blue: 0.94, alpha: 1)
        addChild(browser)
        browser.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(browser.view)
        NSLayoutConstraint.activate([
            browser.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            browser.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            browser.view.topAnchor.constraint(equalTo: view.topAnchor),
            browser.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        browser.didMove(toParent: self)

        empty.text = "Open Pockling once, and your pet's stickers will be here."
        empty.numberOfLines = 0
        empty.textAlignment = .center
        empty.font = .preferredFont(forTextStyle: .headline)
        empty.adjustsFontForContentSizeCategory = true
        empty.textColor = UIColor(red: 0.29, green: 0.21, blue: 0.25, alpha: 1)
        empty.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(empty)
        NSLayoutConstraint.activate([
            empty.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            empty.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            empty.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            empty.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
        reload()
    }

    override func willBecomeActive(with conversation: MSConversation) {
        super.willBecomeActive(with: conversation)
        reload()
    }

    /// The pet may have changed (a Makeover, growing up) since Messages last showed these.
    private func reload() {
        browser.load()
        empty.isHidden = !browser.stickers.isEmpty
    }
}

/// The stickers in the App Group's Stickers folder, in the order the game numbered them.
final class PetStickerBrowser: MSStickerBrowserViewController {
    private(set) var stickers: [MSSticker] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        stickerBrowserView.backgroundColor = .clear
    }

    func load() {
        let fm = FileManager.default
        guard let folder = fm.containerURL(forSecurityApplicationGroupIdentifier: StickersViewController.group)?
            .appendingPathComponent("Stickers", isDirectory: true),
              let names = try? fm.contentsOfDirectory(atPath: folder.path) else {
            stickers = []
            StickersViewController.log.info("No stickers yet")
            stickerBrowserView.reloadData()
            return
        }
        stickers = names.filter { $0.hasSuffix(".png") }.sorted().compactMap { name in
            // "03-yay.png" is described as "yay".
            let word = name.dropLast(4).split(separator: "-", maxSplits: 1).last.map(String.init) ?? "Pockling"
            do {
                return try MSSticker(contentsOfFileURL: folder.appendingPathComponent(name), localizedDescription: word)
            } catch {
                StickersViewController.log.error("Sticker \(name, privacy: .public) wouldn't load: \(error.localizedDescription, privacy: .public)")
                return nil
            }
        }
        StickersViewController.log.info("\(self.stickers.count, privacy: .public) stickers")
        stickerBrowserView.reloadData()
    }

    override func numberOfStickers(in stickerBrowserView: MSStickerBrowserView) -> Int {
        stickers.count
    }

    override func stickerBrowserView(_ stickerBrowserView: MSStickerBrowserView, stickerAt index: Int) -> MSSticker {
        stickers[index]
    }
}
