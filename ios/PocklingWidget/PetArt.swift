import CoreGraphics
import Foundation
import ImageIO

/// The pet's pictures. A widget can't run the game's WebGL, so tools/widget-art.mjs paints them ahead of
/// time from the game's own art, into the PetArt folder: for each breed, coat and stage a whole picture
/// in the smiling look, and each other look's face alone, which goes on top where faces.json says.
/// A pet with a look of its own (1.4) has pictures the game painted in the app (web/src/petArt.js), kept in
/// the App Group's PetArt folder by the snapshot's art key (the app's WidgetShare.saveArt).
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

    /// Where the app keeps the pictures of a pet with its own look (WidgetShare.artFolder in the app).
    private static let customFolder = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: PetSnapshot.group)?
        .appendingPathComponent("PetArt", isDirectory: true)

    private struct Placement: Decodable {
        let face: [Int]
        let size: [Int]
    }

    /// The pet in a look, no more than maxPixels on its longer side if given. A widget has little memory,
    /// and a picture with more pixels than the widget itself won't draw. An egg if there's no such pet.
    static func pet(_ pet: PetSnapshot.Pet, look: String, maxPixels: Int? = nil) -> CGImage? {
        // Its own look's pictures; until the game has painted them, its breed and coat's stand in.
        if let art = pet.art, let image = custom(art, look: look, maxPixels: maxPixels) { return image }
        let key = "\(pet.breed)-\(pet.coat)-\(pet.stage)-\(look)-\(maxPixels ?? 0)" as NSString
        if let image = cache.object(forKey: key) { return image }
        // A coat newer than the pictures (tools/widget-art.mjs not run again) shows as another coat of the
        // same breed and stage, rather than an egg next to the pet's name.
        var name = "\(pet.breed)-\(pet.coat)-\(pet.stage)"
        var found = load(name)
        if found == nil, let other = anyCoat(pet) {
            name = other
            found = load(other)
        }
        guard let whole = found else { return egg(maxPixels: maxPixels) }
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

    /// A pet with a look of its own: the whole picture, with the look's face laid on where its JSON says.
    private static func custom(_ art: String, look: String, maxPixels: Int?) -> CGImage? {
        let key = "\(art)-\(look)-\(maxPixels ?? 0)" as NSString
        if let image = cache.object(forKey: key) { return image }
        guard let dir = customFolder, let whole = loadFile(dir.appendingPathComponent("\(art).png")) else { return nil }
        var image = whole
        if look != "smile", let face = loadFile(dir.appendingPathComponent("\(art)-\(look).png")),
           let data = try? Data(contentsOf: dir.appendingPathComponent("\(art).json")),
           let placement = try? JSONDecoder().decode(Placement.self, from: data), placement.face.count == 4 {
            let at = placement.face
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

    /// The whole picture of any coat of the pet's breed and stage: "breed-coat-stage", with no look.
    private static func anyCoat(_ pet: PetSnapshot.Pet) -> String? {
        guard let folder, let names = try? FileManager.default.contentsOfDirectory(atPath: folder.path) else { return nil }
        let prefix = "\(pet.breed)-", suffix = "-\(pet.stage).webp"
        let match = names.sorted().first { $0.hasPrefix(prefix) && $0.hasSuffix(suffix) && $0.split(separator: "-").count == 3 }
        return match.map { String($0.dropLast(5)) }
    }

    private static func load(_ name: String) -> CGImage? {
        guard let file = folder?.appendingPathComponent("\(name).webp") else { return nil }
        return loadFile(file)
    }

    private static func loadFile(_ file: URL) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(file as CFURL, nil) else { return nil }
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
