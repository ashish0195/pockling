import SwiftUI

/// The whole app is one screen: the game, edge to edge. This view also tells the game where an
/// iPhone Duo's crease is, so it can keep the pet, its buttons and its menus off it (web/src/fold.js).
struct GameScreen: View {
    @StateObject private var host = GameHost()

    var body: some View {
        GeometryReader { proxy in
            GameWebView(host: host)
                .ignoresSafeArea()
                .onAppear { host.setFold(FoldReader.fold(in: proxy)) }
                .onChange(of: FoldReader.fold(in: proxy)) { _, fold in host.setFold(fold) }
        }
        .background(Color("LaunchBackground").ignoresSafeArea())
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
    }
}

/// Where a foldable's crease runs, in the game's coordinates: the middle of its band, where the band
/// starts and ends across the screen, and whether it runs down the screen (an iPhone Duo held like a
/// book) or across it (standing like a laptop).
struct Fold: Equatable {
    var position: Double
    var start: Double
    var end: Double
    var isVertical: Bool
}

enum FoldReader {
    static func fold(in proxy: GeometryProxy) -> Fold? {
        if #available(iOS 27.1, *) {
            let insets = proxy.safeAreaInsets
            // Inactive too: the crease is there while the phone lies flat, and the game keeps off it then
            // as well, so nothing moves as the hinge opens and closes.
            let regions = proxy.reservedRegions(kind: .division, options: .includeInactive, layoutDirectionBehavior: .fixed)
            if let region = regions.first {
                let frame = region.frame.offsetBy(dx: insets.leading, dy: insets.top)
                if frame.height > frame.width {
                    return Fold(position: frame.midX, start: frame.minX, end: frame.maxX, isVertical: true)
                }
                return Fold(position: frame.midY, start: frame.minY, end: frame.maxY, isVertical: false)
            }
        }
        return nil
    }
}

struct GameWebView: UIViewRepresentable {
    let host: GameHost

    func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(named: "LaunchBackground")
        let web = host.webView
        web.frame = container.bounds
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(web)
        return container
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}
