import CoreGraphics
import Foundation
import ImageIO

/// The pet's pictures. A widget can't run the game's WebGL, so tools/widget-art.mjs paints them ahead of
/// time from the game's own art, into the PetArt folder: for each breed, coat and stage a whole picture
/// in the smiling look, and each other look's face alone, which goes on top where faces.json says.
enum PetArt {
    private static let folder = Bundle.main.url(forResource: "PetArt", withExtension: nil)

    /// Where each breed and stage's face sits in its pictures: x, y, width, height in pixels from the top left.
    private static let faces: [String: [Int]] = {
        guard let file = folder?.appendingPathComponent("faces.json"),
              let data = try? Data(contentsOf: file),
              let faces = try? JSONDecoder().decode([String: [Int]].self, from: data) else { return [:] }
        return faces
    }()

    private static let cache = NSCache<NSString, CGImage>()

    /// The pet in a look, no more than maxPixels on its longer side if given. A widget has little memory,
    /// and a picture with more pixels than the widget itself won't draw. An egg if there's no such pet.
    static func pet(_ pet: PetSnapshot.Pet, look: String, maxPixels: Int? = nil) -> CGImage? {
        let key = "\(pet.breed)-\(pet.coat)-\(pet.stage)-\(look)-\(maxPixels ?? 0)" as NSString
        if let image = cache.object(forKey: key) { return image }
        let name = "\(pet.breed)-\(pet.coat)-\(pet.stage)"
        guard let whole = load(name) else { return egg(maxPixels: maxPixels) }
        var image = whole
        if look != "smile", let face = load("\(name)-\(look)"), let at = faces["\(pet.breed)-\(pet.stage)"], at.count == 4 {
            image = draw(width: whole.width, height: whole.height) { context in
                context.draw(whole, in: CGRect(x: 0, y: 0, width: whole.width, height: whole.height))
                // Core Graphics counts up from the bottom; the pictures count down from the top.
                context.draw(face, in: CGRect(x: at[0], y: whole.height - at[1] - at[3], width: at[2], height: at[3]))
            } ?? whole
        }
        image = shrink(image, to: maxPixels)
        cache.setObject(image, forKey: key)
        return image
    }

    static func egg(maxPixels: Int? = nil) -> CGImage? {
        load("egg").map { shrink($0, to: maxPixels) }
    }

    private static func load(_ name: String) -> CGImage? {
        guard let file = folder?.appendingPathComponent("\(name).webp"),
              let source = CGImageSourceCreateWithURL(file as CFURL, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary)
    }

    private static func shrink(_ image: CGImage, to maxPixels: Int?) -> CGImage {
        guard let maxPixels, max(image.width, image.height) > maxPixels else { return image }
        let k = Double(maxPixels) / Double(max(image.width, image.height))
        let width = max(1, Int((Double(image.width) * k).rounded()))
        let height = max(1, Int((Double(image.height) * k).rounded()))
        return draw(width: width, height: height) { context in
            context.interpolationQuality = .high
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        } ?? image
    }

    private static func draw(width: Int, height: Int, _ paint: (CGContext) -> Void) -> CGImage? {
        guard let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        paint(context)
        return context.makeImage()
    }
}
