import Foundation

/// The pet's save, one JSON file in Application Support. The game hands us the whole thing each time.
final class SaveStore {
    private let file: URL
    private let queue = DispatchQueue(label: "app.pockling.save")

    init() {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        file = folder.appendingPathComponent("pockling-save.json")
    }

    func load() -> String? {
        queue.sync {
            guard let text = try? String(contentsOf: file, encoding: .utf8), !text.isEmpty else { return nil }
            return text
        }
    }

    func write(_ text: String) {
        queue.async { [file] in
            if text.isEmpty {
                try? FileManager.default.removeItem(at: file)
            } else {
                try? text.write(to: file, atomically: true, encoding: .utf8)
            }
        }
    }
}
