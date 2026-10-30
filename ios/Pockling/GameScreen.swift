import SwiftUI

/// The whole app is one screen: the game, edge to edge. This view also tells the game where
/// a foldable's crease is, so the room's floor can start exactly on the fold.
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

/// Where a foldable's crease runs, in the game's coordinates.
struct Fold: Equatable {
    var position: Double
    var isVertical: Bool
}

enum FoldReader {
    static func fold(in proxy: GeometryProxy) -> Fold? {
        if #available(iOS 27.1, *) {
            let insets = proxy.safeAreaInsets
            let regions = proxy.reservedRegions(kind: .division, options: .includeInactive, layoutDirectionBehavior: .fixed)
            if let region = regions.first {
                let frame = region.frame.offsetBy(dx: insets.leading, dy: insets.top)
                let vertical = frame.height > frame.width
                return Fold(position: vertical ? frame.midX : frame.midY, isVertical: vertical)
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
