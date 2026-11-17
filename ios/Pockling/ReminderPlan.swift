import Foundation

// Pockling's daily reminders (1.3.2), planned away from iOS so the rules can be tested
// (PocklingTests/ReminderPlanTests.swift). Reminders.swift hands the plan to NineIO.
//
// - One hello at 6 pm on each day the player hasn't visited, for the seven days after their last visit,
//   queued as daily.1 ... daily.7 through NineIO's scheduleReminder. The queue is rebuilt on every launch,
//   every return and every trip to the background, so it always counts from the last visit: a week away,
//   and nothing more comes.
// - Quirky and cute, in the pet's own voice. Days take turns: one says how the pet is (its tummy, its
//   yawns, a bath it needs, a cuddle, a game), the next shares a silly moment from its day and asks you
//   over (the rug is the floor now, a meeting with the rubber duck, today's sticker). Never the same line
//   two days running, across rebuilds too: each day's line is remembered.
// - Every line says only what will be true when it arrives. The pet's needs that evening are worked out
//   with the game's own rules (web/src/state.js: RATES, FLOOR and tick), so "tummy is rumbling" goes out
//   only if it will be. Its favourite food, the day's sticker, its growing up and its streak come from the
//   game's catalogue and save the same way. Before an egg has hatched, only egg lines go out.
// - The third day away brings the come-back line, so NineIO's own come-back nudge is off and no day
//   gets two.

/// A pet's needs, 0 to 100, as the game keeps them.
struct PetNeeds: Equatable {
    var tummy: Double
    var clean: Double
    var energy: Double
    var fun: Double
    var love: Double
    var asleep: Bool

    /// Below this a need shows as a want in the game (state.js `mood`): hungry, sleepy, dirty, lonely, bored.
    static let wanting = 30.0

    var hungry: Bool { !asleep && tummy < Self.wanting }
    var sleepy: Bool { !asleep && energy < Self.wanting }
    var dirty: Bool { !asleep && clean < Self.wanting }
    var lonely: Bool { !asleep && love < Self.wanting }
    var bored: Bool { !asleep && fun < Self.wanting }
}

/// What the reminders know about the pet, from the game's save (web/src/state.js `newGame` and `adopt`).
struct ReminderPet: Equatable {
    var name: String
    var breed: String
    var needs: PetNeeds
    /// When `needs` were last brought up to date (the save's pet.lastTick).
    var at: Date
    /// Days of care so far (one per calendar day with any care), and the game day of the last one.
    var careDays: Int
    var lastCareDay: Int?
    /// The stamp book: the game day of the last daily stamp, and how many days in a row it has been stamped.
    var lastStampDay: Int?
    var streak: Int

    /// The pet in a save, or nil before an egg has hatched (or if the save can't be read).
    init?(save: String?) {
        guard let save, let data = save.data(using: .utf8),
              let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let pet = root["pet"] as? [String: Any], let breed = pet["breed"] as? String else { return nil }
        func number(_ key: String, in dict: [String: Any] = pet) -> Double? { (dict[key] as? NSNumber)?.doubleValue }
        func need(_ key: String) -> Double { min(100, max(0, number(key) ?? 0)) }
        let name = (pet["name"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        self.name = name.isEmpty ? "Your Pockling" : String(name.prefix(12))
        self.breed = breed
        needs = PetNeeds(tummy: need("tummy"), clean: need("clean"), energy: need("energy"), fun: need("fun"),
                         love: need("love"), asleep: pet["asleep"] as? Bool ?? false)
        at = Date(timeIntervalSince1970: (number("lastTick") ?? number("born") ?? 0) / 1000)
        careDays = Int(number("careDays") ?? 0)
        lastCareDay = number("lastCareDay").map { Int($0) }
        lastStampDay = number("lastVisit", in: root).map { Int($0) }
        streak = Int(number("streak", in: root) ?? 0)
    }

    init(name: String, breed: String, needs: PetNeeds, at: Date, careDays: Int = 3, lastCareDay: Int? = nil,
         lastStampDay: Int? = nil, streak: Int = 1) {
        self.name = name
        self.breed = breed
        self.needs = needs
        self.at = at
        self.careDays = careDays
        self.lastCareDay = lastCareDay
        self.lastStampDay = lastStampDay
        self.streak = streak
    }

    // MARK: The game's rules for time passing (web/src/state.js)

    /// How much each need changes per hour, awake and asleep (state.js RATES).
    static let awakeRates = (tummy: -6.0, clean: -2.4, energy: -5.0, fun: -5.0, love: -1.6)
    static let asleepRates = (tummy: -2.5, clean: -0.8, energy: 24.0, fun: -1.0, love: -0.5)
    /// Time away can't take a need below this (state.js FLOOR).
    static let floor = 14.0

    /// The pet's needs at `date` if nobody visits before then: state.js `tick`, step for step.
    func needs(at date: Date) -> PetNeeds {
        var p = needs
        let hours = date.timeIntervalSince(at) / 3600
        guard hours > 0 else { return p }
        var left = hours
        if p.asleep {
            let toFull = max((100 - p.energy) / Self.asleepRates.energy, 0)
            if left >= toFull {
                Self.apply(&p, Self.asleepRates, hours: toFull)
                p.energy = 100
                p.asleep = false
                left -= toFull
            } else {
                Self.apply(&p, Self.asleepRates, hours: left)
                left = 0
            }
        }
        if left > 0, !p.asleep { Self.apply(&p, Self.awakeRates, hours: left) }
        return p
    }

    private static func apply(_ p: inout PetNeeds,
                              _ rates: (tummy: Double, clean: Double, energy: Double, fun: Double, love: Double),
                              hours: Double) {
        func move(_ value: inout Double, _ rate: Double) {
            let change = rate * hours
            if change < 0 {
                if value > floor { value = max(floor, value + change) }
            } else {
                value = min(100, value + change)
            }
        }
        move(&p.tummy, rates.tummy)
        move(&p.clean, rates.clean)
        move(&p.energy, rates.energy)
        move(&p.fun, rates.fun)
        move(&p.love, rates.love)
    }

    // MARK: Growing up (web/src/catalog.js STAGES)

    /// Days of care at which a Pockling becomes a Kid, then Grown.
    static let stages = [(id: "kid", days: 2), (id: "grown", days: 7)]

    /// The stage one more day of care on `day` would bring, if it brings one.
    func growsUp(withCareOn day: Int) -> String? {
        guard lastCareDay.map({ $0 < day }) ?? true else { return nil }
        return Self.stages.first { careDays + 1 == $0.days }?.id
    }

    /// What it would love to eat (catalog.js TASTES: each breed's favourite).
    var favouriteFood: String {
        switch breed {
        case "kitling": return "a fishy"
        case "bunling": return "a carrot"
        case "puppling": return "some crunchies"
        case "cubling": return "a honey pot"
        case "foxling": return "an apple"
        case "drakling": return "a hot chili"
        default: return "a little snack"
        }
    }
}

/// One line in the pool. `{name}`, `{food}`, `{sticker}`, `{n}` and `{next}` are filled in when it's planned.
struct ReminderLine: Equatable {
    /// When it can go out: what has to be true of the pet that evening.
    enum When: Equatable {
        /// Always, even while it sleeps.
        case any
        /// The pet is awake.
        case awake
        case hungry, sleepy, dirty, lonely, bored

        /// A line about how the pet is, rather than an invitation.
        var isWant: Bool {
            switch self {
            case .hungry, .sleepy, .dirty, .lonely, .bored: return true
            case .any, .awake: return false
            }
        }
    }

    var id: String
    var title: String
    var body: String
    var when: When = .awake
}

enum ReminderPlan {
    static let hour = 18
    static let days = 7
    /// Counted from the last visit: the come-back line takes the third evening away.
    static let comebackDay = 3
    /// The queue's ids, in time order (NineIO adds its own "9io." in front).
    static let ids = (1...days).map { "daily.\($0)" }
    /// NineIO ids to clear before each rebuild: the queue's, NineIO's come-back nudge (Pockling 1.2 to
    /// 1.3.1 set one) and "daily", which no version used but costs nothing to clear.
    static let nineIOIDs = ["daily", "comeback"] + ids
    /// Pockling 1.2 to 1.3.1's own repeating 6 pm hello, scheduled without NineIO.
    static let legacyIdentifiers = ["pockling.daily"]
    /// Where a tapped reminder goes: the pet (GameHost's "open" event to the game).
    static let open = "pet"

    static let titleLimit = 40
    static let bodyLimit = 110

    // MARK: The pool

    /// The everyday lines: the wants (`when` hungry, sleepy, dirty, lonely or bored) and the invitations,
    /// each kind walked through in this order. Quirky on purpose (the user's ask, 17 Nov 2026): little
    /// absurd moments from the pet's day, in its own voice, at most one emoji each. The wants say only what
    /// the game will show that evening: a hungry pet rubs its rumbling tummy and a sleepy one yawns
    /// (actor.js `ask`). The invitations are whimsy about what's really in its room and its game: the rug, the
    /// window and its stars and clouds, the shelf's cactus, the fairy lights, the bath's rubber duck, crumbs,
    /// the hats in the closet, the stamp book, the walk's park and mud, the greeting (two hops, hearts), its
    /// humming, the 🎤 talk-back and the photo card. No tips or promotions (Guideline 4.5.4).
    static let cycle: [ReminderLine] = [
        ReminderLine(id: "sticker", title: "Today's sticker is a {sticker}",
                     body: "Come and stick it in our stamp book. It comes with a handful of berries too!", when: .any),
        ReminderLine(id: "hungry.favourite", title: "{name}'s tummy is rumbling",
                     body: "Is it snack time yet? I'd love {food}. Just saying. 🍎", when: .hungry),
        ReminderLine(id: "rug", title: "{name} redecorated (sort of)",
                     body: "The rug is the floor now. Big changes in my room. Come and see. 🙃"),
        ReminderLine(id: "sleepy", title: "{name} can't stop yawning",
                     body: "My eyes keep closing. Will you tuck me in for a cozy nap? 🌙", when: .sleepy),
        ReminderLine(id: "face", title: "{name} practiced a new face",
                     body: "It's the same face, but louder. Come and see it?"),
        ReminderLine(id: "bored.games", title: "{name} is bored of being bored",
                     body: "Fetch, Snack Drop or Hide and Seek? I'll even let you win. Maybe. 🎾", when: .bored),
        // The room's window shows the sky by the phone's clock: from 5 pm it turns to dusk (web/src/bake/room.js).
        ReminderLine(id: "window", title: "Sunset at {name}'s window",
                     body: "The sky outside my window just went pink and orange. Come and watch it with me? 🌅"),
        ReminderLine(id: "dirty.bath", title: "{name} could use a bath",
                     body: "I'm a bit grubby. Soap, a rinse and the fluffy towel, please? The duck's waiting too. 🫧",
                     when: .dirty),
        ReminderLine(id: "crumb", title: "Breaking news from {name}",
                     body: "I found a crumb. It's the best crumb. Come and see the crumb."),
        ReminderLine(id: "hungry.snack", title: "Snack o'clock for {name}?",
                     body: "My tummy just made a very small, very loud noise. Can we have a snack together?", when: .hungry),
        ReminderLine(id: "walk", title: "{name} has a walk planned",
                     body: "Step one: the park. Step two: the mud. Step three: you'll see. 🐾"),
        ReminderLine(id: "lonely", title: "{name} could use a cuddle",
                     body: "I've missed you today. A long, slow stroke would make everything better. 💗", when: .lonely),
        ReminderLine(id: "questions", title: "{name} has questions",
                     body: "Mostly about snacks. One is about you."),
        ReminderLine(id: "bored.hide", title: "Hide and Seek with {name}?",
                     body: "I'll hide, you find me. Listen for my giggle! 🙈", when: .bored),
        ReminderLine(id: "meeting", title: "{name} called a meeting",
                     body: "Attendees: me and the rubber duck. Agenda: you. 🦆"),
        ReminderLine(id: "dirty.poof", title: "Bath time for {name}?",
                     body: "Towel me dry and I poof up twice my size. It's my best trick! 🛁", when: .dirty),
        ReminderLine(id: "talk", title: "Say something to {name}",
                     body: "Tap the 🎤 and talk to me. I'll say it back in my squeakiest little voice."),
        ReminderLine(id: "hungry.note", title: "{name}'s tummy left you a note",
                     body: "It just says \"rumble\". I think it means {food}.", when: .hungry),
        ReminderLine(id: "spot", title: "{name} saved you the best spot",
                     body: "It's on the rug. It's still warm. 💗"),
        ReminderLine(id: "sleepy.echo", title: "{name} yawned so big it echoed",
                     body: "Is it nap o'clock? My blanket and I are ready when you are. 🌙", when: .sleepy),
        ReminderLine(id: "closet", title: "{name} is having a hat crisis",
                     body: "The crown says royal. The wizard hat says wise. I can't decide. Come and help? 👑"),
        ReminderLine(id: "dirty.dust", title: "{name} is now 60% dust bunny",
                     body: "Okay, maybe not 60. A big bubbly bath would sort it out. 🫧", when: .dirty),
        ReminderLine(id: "stars", title: "{name} tried to count the stars",
                     body: "Got to three. Fell asleep. Help me with the rest tonight? ⭐"),
        ReminderLine(id: "lonely.cuddles", title: "{name} has spare cuddles",
                     body: "I've been saving them up all day and they're piling up. Come and collect? 💗", when: .lonely),
        ReminderLine(id: "cactus", title: "{name} befriended the cactus",
                     body: "We're very close. Not too close. It's a cactus. 🌵"),
        ReminderLine(id: "hello", title: "{name} rehearsed your hello",
                     body: "Two hops, some hearts, one very big smile. It's ready when you are. 💕"),
        ReminderLine(id: "lights", title: "{name} guards the twinkly lights",
                     body: "Not one has gone missing today. You're welcome. ✨"),
        ReminderLine(id: "photo", title: "{name} is ready for a close-up",
                     body: "Fur fluffed, best side found. Take my photo and make a little card? 📸"),
        ReminderLine(id: "cloud", title: "{name} named a cloud after you",
                     body: "Then it turned into a bunny. Still you, though. ☁️"),
        ReminderLine(id: "song", title: "{name} wrote you a song",
                     body: "It's mostly one note. It's a very good note. 🎵"),
    ]

    /// The day after a visit that kept a streak of two or more going.
    static let streak = ReminderLine(id: "streak", title: "{n} days in a row with {name}!",
                                     body: "Visit me today and we make it {next}. Today's sticker is waiting for our stamp book.",
                                     when: .any)

    /// When one more day of care would make it grow (catalog.js STAGES: Kid at 2 days, Grown at 7).
    static let growing: [String: ReminderLine] = [
        "kid": ReminderLine(id: "grow.kid", title: "{name} is nearly a kid!",
                            body: "One more day of care and I won't be a baby any more. Shall we do it today? 🌟", when: .any),
        "grown": ReminderLine(id: "grow.grown", title: "{name} is nearly grown up!",
                              body: "One more day of care and I'll be all grown up. Shall we do it today? 🌟", when: .any),
    ]

    /// The third evening away, in place of that day's line. The game's own daily card says a pet that
    /// was missed "waited at the door".
    static let comeback = ReminderLine(id: "comeback", title: "{name} keeps checking the door",
                                       body: "It's been a few days. No rush, but a very fluffy hello is waiting whenever you're ready.",
                                       when: .any)

    /// Before an egg has hatched: the six eggs on the first screen, which wiggle by themselves.
    static let eggCycle: [ReminderLine] = [
        ReminderLine(id: "egg.six", title: "Six eggs are waiting",
                     body: "Pick one, tap it until it cracks and meet the little friend inside. 🥚", when: .any),
        ReminderLine(id: "egg.patterns", title: "Spots, hearts, paws or stars?",
                     body: "Every egg holds a different Pockling. Which one will you hatch? 🥚", when: .any),
        ReminderLine(id: "egg.wiggle", title: "The eggs are wiggling",
                     body: "Somebody small and fluffy wants to meet you. Will you help them hatch?", when: .any),
        ReminderLine(id: "egg.name", title: "Who will you hatch today?",
                     body: "A Kitling, a Bunling, a Drakling... and you get to choose their name. 💕", when: .any),
        ReminderLine(id: "egg.hello", title: "An egg wobbled. Twice.",
                     body: "That's basically a hello. Come and say hello back? 🥚", when: .any),
    ]

    static let eggComeback = ReminderLine(id: "egg.comeback", title: "The eggs are still waiting",
                                          body: "No rush. Six little friends are curled up inside, ready whenever you are.",
                                          when: .any)

    /// Every line, for the tests.
    static var pool: [ReminderLine] {
        cycle + [streak] + growing.values.sorted { $0.id < $1.id } + [comeback] + eggCycle + [eggComeback]
    }

    // MARK: Planning

    struct Reminder: Equatable {
        var id: String
        /// Local date and time (6 pm) it arrives.
        var date: Date
        var line: ReminderLine
        var title: String
        var body: String
    }

    struct Plan: Equatable {
        var reminders: [Reminder] = []
        /// Which line went to which game day, to remember for the next rebuild: past days keep theirs.
        var linesByDay: [Int: String] = [:]
    }

    /// - Parameters:
    ///   - enabled: the player wants reminders and iOS allows notifications. If not, nothing is planned.
    ///   - pet: the pet as last saved, or nil before an egg has hatched.
    ///   - lastVisit: when the player was last in the app (now, when it's open). Its day gets no reminder,
    ///     and nothing is planned more than seven days after it.
    ///   - previous: earlier plans' lines by game day. A day before the first one planned now keeps its
    ///     line, so the next day can't repeat it.
    static func make(now: Date, calendar: Calendar = .current, enabled: Bool, pet: ReminderPet?, lastVisit: Date?,
                     previous: [Int: String] = [:]) -> Plan {
        var plan = Plan()
        let today = gameDay(of: now, calendar: calendar)
        let visitDay = lastVisit.map { gameDay(of: $0, calendar: calendar) } ?? today
        let start = calendar.startOfDay(for: now)
        let todaysEveningIsAhead = evening(of: start, calendar: calendar).map { $0 > now } ?? false
        let firstOpenDay = todaysEveningIsAhead && visitDay < today ? today : today + 1
        plan.linesByDay = previous.filter { $0.key < firstOpenDay && $0.key >= today - 30 }
        guard enabled else { return plan }
        var lastLine = previous[firstOpenDay - 1]
        for offset in 0...days {
            let day = today + offset
            let away = day - visitDay
            guard plan.reminders.count < days, away >= 1, away <= days,
                  let date = calendar.date(byAdding: .day, value: offset, to: start),
                  let evening = evening(of: date, calendar: calendar), evening > now else { continue }
            let line = pick(day: day, away: away, evening: evening, pet: pet, lastLine: lastLine,
                            history: plan.linesByDay)
            let (title, body) = fill(line, pet: pet, day: day)
            plan.reminders.append(Reminder(id: ids[plan.reminders.count], date: evening, line: line, title: title, body: body))
            plan.linesByDay[day] = line.id
            lastLine = line.id
        }
        return plan
    }

    /// The day's line. The third day away gets the come-back line. The day after a visit that kept a
    /// streak going gets the streak line (every third day at most), and a pet one day of care from growing
    /// up says so (once a week at most). Otherwise days take turns: one says how the pet is (hungry,
    /// sleepy, grubby, lonely or bored, whichever will be true that evening), the next asks you to come
    /// and do something together. Each picks the line that has waited longest, never yesterday's.
    static func pick(day: Int, away: Int, evening: Date, pet: ReminderPet?, lastLine: String?,
                     history: [Int: String]) -> ReminderLine {
        guard let pet else {
            if away == comebackDay { return eggComeback }
            return longestWaiting(eggCycle, day: day, turn: day, lastLine: lastLine, history: history) ?? eggCycle[0]
        }
        if away == comebackDay { return comeback }
        func usedSince(_ line: ReminderLine, daysAgo: Int) -> Bool {
            history.contains { $0.value == line.id && $0.key < day && $0.key >= day - daysAgo }
        }
        if away == 1, pet.streak >= 2, pet.lastStampDay == day - 1, !usedSince(streak, daysAgo: 2) { return streak }
        if let stage = pet.growsUp(withCareOn: day), let line = growing[stage], !usedSince(line, daysAgo: days - 1) {
            return line
        }
        let needs = pet.needs(at: evening)
        let wants = cycle.filter { $0.when.isWant && isTrue($0.when, of: needs) }
        let invitations = cycle.filter { !$0.when.isWant && isTrue($0.when, of: needs) }
        let (first, second) = day % 2 == 0 ? (wants, invitations) : (invitations, wants)
        // Each kind comes every other day, so its rotation moves on by one each time.
        let turn = day / 2
        return longestWaiting(first, day: day, turn: turn, lastLine: lastLine, history: history)
            ?? longestWaiting(second, day: day, turn: turn, lastLine: lastLine, history: history)
            ?? cycle.first { $0.when == .any && $0.id != lastLine } ?? cycle[2]
    }

    static func isTrue(_ when: ReminderLine.When, of needs: PetNeeds) -> Bool {
        switch when {
        case .any: return true
        case .awake: return !needs.asleep
        case .hungry: return needs.hungry
        case .sleepy: return needs.sleepy
        case .dirty: return needs.dirty
        case .lonely: return needs.lonely
        case .bored: return needs.bored
        }
    }

    /// The line last used longest ago before `day` (never used comes first), skipping yesterday's. Ties
    /// go to the next in the pool's order from the turn's own starting place, so the rotation moves on.
    private static func longestWaiting(_ lines: [ReminderLine], day: Int, turn: Int, lastLine: String?,
                                       history: [Int: String]) -> ReminderLine? {
        var lastUsed: [String: Int] = [:]
        for (usedDay, id) in history where usedDay < day {
            lastUsed[id] = max(lastUsed[id] ?? .min, usedDay)
        }
        let count = max(lines.count, 1)
        let offset = ((turn % count) + count) % count
        return lines.enumerated()
            .filter { $0.element.id != lastLine }
            .min { a, b in
                let ua = lastUsed[a.element.id] ?? .min, ub = lastUsed[b.element.id] ?? .min
                if ua != ub { return ua < ub }
                return (a.offset - offset + count) % count < (b.offset - offset + count) % count
            }?.element
    }

    static func fill(_ line: ReminderLine, pet: ReminderPet?, day: Int) -> (title: String, body: String) {
        func filled(_ text: String) -> String {
            var text = text
            let streak = pet?.streak ?? 0
            text = text.replacingOccurrences(of: "{food}", with: pet?.favouriteFood ?? "a little snack")
            text = text.replacingOccurrences(of: "{sticker}", with: sticker(onDay: day))
            text = text.replacingOccurrences(of: "{n}", with: "\(streak)")
            text = text.replacingOccurrences(of: "{next}", with: "\(streak + 1)")
            // The name goes in last, so a pet called "{food}" is just called that.
            return text.replacingOccurrences(of: "{name}", with: pet?.name ?? "Your Pockling")
        }
        return (filled(line.title), filled(line.body))
    }

    // MARK: The game's calendar

    static func evening(of day: Date, calendar: Calendar) -> Date? {
        calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day)
    }

    /// The game's day number (web/src/util.js `dayNumber`): days from 1 January 1970 to the local date.
    static func gameDay(of date: Date, calendar: Calendar) -> Int {
        var local = Calendar(identifier: .gregorian)
        local.timeZone = calendar.timeZone
        let parts = local.dateComponents([.year, .month, .day], from: date)
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        guard let midnight = utc.date(from: DateComponents(year: parts.year, month: parts.month, day: parts.day)) else { return 0 }
        return Int((midnight.timeIntervalSince1970 / 86_400).rounded(.down))
    }

    /// The stamp book's sticker for a game day (state.js `dailyVisit`: STICKERS picked with util.js `seeded`).
    static let stickers = ["🌸", "⭐", "🍓", "🌈", "🐾", "🎈", "🍪", "🌙", "🦋", "🍀", "🎀", "🍩", "🌻", "🫧", "💖", "🍒",
                           "☁️", "🧸", "🍑", "🌟", "🐝", "🍄", "🎵", "🌷", "🍰", "🪐", "🍉", "🎁"]

    static func sticker(onDay day: Int) -> String {
        // seeded(day * 2654435761): the product is exact in JavaScript up to 2^53, then taken mod 2^32.
        let seed = UInt32(truncatingIfNeeded: Int64(day) &* 2_654_435_761)
        let index = Int(mulberry32(seed) * Double(stickers.count))
        return stickers[min(max(index, 0), stickers.count - 1)]
    }

    /// util.js `seeded`'s first number (mulberry32).
    static func mulberry32(_ seed: UInt32) -> Double {
        let a = seed &+ 0x6D2B_79F5
        var t = a
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return Double(t ^ (t >> 14)) / 4_294_967_296
    }
}
