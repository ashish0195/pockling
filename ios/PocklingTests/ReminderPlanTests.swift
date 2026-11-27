import Foundation
import Testing
@testable import Pockling

/// The daily reminders (ReminderPlan.swift): one at 6 pm on each day without a visit, for up to a week,
/// never the same line two days running, and only ever saying what's true of the pet that evening.
@MainActor
struct ReminderPlanTests {
    static let india: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata")!
        return calendar
    }()

    static func date(_ day: Int, _ hour: Int, _ minute: Int = 0, month: Int = 11, calendar: Calendar = india) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: month, day: day, hour: hour, minute: minute))!
    }

    static let full = PetNeeds(tummy: 100, clean: 100, energy: 100, fun: 100, love: 100, asleep: false)

    /// A Kitling called Mochi, as saved at `at` with these needs.
    static func pet(_ needs: PetNeeds = full, at: Date, careDays: Int = 3, lastCareDay: Int? = nil,
                    stampDay: Int? = nil, streak: Int = 1, breed: String = "kitling") -> ReminderPet {
        ReminderPet(name: "Mochi", breed: breed, needs: needs, at: at, careDays: careDays, lastCareDay: lastCareDay,
                    lastStampDay: stampDay, streak: streak)
    }

    static func plan(now: Date, lastVisit: Date?, pet: ReminderPet?, enabled: Bool = true,
                     previous: [Int: String] = [:], calendar: Calendar = india) -> ReminderPlan.Plan {
        ReminderPlan.make(now: now, calendar: calendar, enabled: enabled, pet: pet, lastVisit: lastVisit, previous: previous)
    }

    // MARK: When they come

    @Test func aVisitQueuesTheNextSevenEveningsAt6pm() {
        let now = Self.date(17, 10)
        let plan = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now))
        #expect(plan.reminders.map(\.id) == ["daily.1", "daily.2", "daily.3", "daily.4", "daily.5", "daily.6", "daily.7"])
        #expect(plan.reminders.map(\.date) == (18...24).map { Self.date($0, 18) })
    }

    @Test func todayIsSkippedOnceThePlayerHasVisited() {
        // Visited this morning: nothing this evening, whatever time the queue is built.
        for hour in [0, 9, 17] {
            let now = Self.date(17, hour, 30)
            let plan = Self.plan(now: now, lastVisit: Self.date(17, 0, 5), pet: Self.pet(at: now))
            #expect(plan.reminders.first?.date == Self.date(18, 18))
        }
        // Built without a visit today (the last one was yesterday): this evening's hello is still to come.
        let quiet = Self.plan(now: Self.date(17, 9), lastVisit: Self.date(16, 21), pet: Self.pet(at: Self.date(16, 21)))
        #expect(quiet.reminders.first?.date == Self.date(17, 18))
        #expect(quiet.reminders.count == 7)
        // ...unless 6 pm has already gone.
        let late = Self.plan(now: Self.date(17, 19), lastVisit: Self.date(16, 21), pet: Self.pet(at: Self.date(16, 21)))
        #expect(late.reminders.first?.date == Self.date(18, 18))
    }

    @Test func nothingComesMoreThanSevenDaysAfterTheLastVisit() {
        let visit = Self.date(10, 20)
        // Built five days on without a visit: only days 5, 6 and 7 away are left.
        let plan = Self.plan(now: Self.date(15, 9), lastVisit: visit, pet: Self.pet(at: visit))
        #expect(plan.reminders.map(\.date) == [Self.date(15, 18), Self.date(16, 18), Self.date(17, 18)])
        #expect(Self.plan(now: Self.date(18, 9), lastVisit: visit, pet: Self.pet(at: visit)).reminders.isEmpty)
        #expect(Self.plan(now: Self.date(25, 9), lastVisit: visit, pet: nil).reminders.isEmpty)
    }

    @Test func sixPmStaysSixPmAcrossAClockChange() {
        var newYork = Calendar(identifier: .gregorian)
        newYork.timeZone = TimeZone(identifier: "America/New_York")!
        // Summer time ends on 1 November 2026 in New York.
        let now = Self.date(29, 12, month: 10, calendar: newYork)
        let plan = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now), calendar: newYork)
        #expect(plan.reminders.count == 7)
        for reminder in plan.reminders {
            #expect(newYork.component(.hour, from: reminder.date) == 18)
            #expect(newYork.component(.minute, from: reminder.date) == 0)
        }
    }

    @Test func turnedOffMeansNothingPlanned() {
        let now = Self.date(17, 10)
        #expect(Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now), enabled: false).reminders.isEmpty)
        #expect(Self.plan(now: now, lastVisit: now, pet: nil, enabled: false).reminders.isEmpty)
    }

    @Test func turningRemindersOffCancelsEverythingQueued() {
        let fake = FakeScheduler()
        let savedScheduler = Reminders.scheduler, savedDefaults = Reminders.defaults
        Reminders.scheduler = fake
        Reminders.defaults = UserDefaults(suiteName: "PocklingTests.\(UUID().uuidString)")!
        defer {
            Reminders.scheduler = savedScheduler
            Reminders.defaults = savedDefaults
        }
        let now = Self.date(17, 10)
        Reminders.apply(Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now)), calendar: Self.india)
        #expect(fake.queued.count == 7)
        #expect(fake.queued.values.allSatisfy { $0.open == "pet" })
        let first = fake.queued["daily.1"]?.time
        #expect([first?.year, first?.month, first?.day, first?.hour, first?.minute] == [2026, 11, 18, 18, 0])

        Reminders.apply(Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now), enabled: false), calendar: Self.india)
        #expect(fake.queued.isEmpty)
        // Every id the queue uses, NineIO's come-back nudge, and 1.3.1's repeating hello.
        #expect(Set(fake.cancelledIDs).isSuperset(of: (1...7).map { "daily.\($0)" } + ["comeback"]))
        #expect(fake.cancelledIdentifiers.contains("pockling.daily"))
    }

    // MARK: What they say

    @Test func neverTheSameLineTwoDaysRunning() {
        // Visits at random times, with gaps of up to nine days, over a year; each rebuild remembers what
        // went out. What arrives is each day's line from the last plan made before its 6 pm.
        var random = SeededRandom(seed: 7)
        var history: [Int: String] = [:]
        var arrived: [Int: String] = [:]
        var visit = Self.date(1, 9, month: 1)
        let end = Self.date(31, 23, month: 12)
        var needs = Self.full
        var hatched = false
        while visit < end {
            if !hatched { hatched = random.next(100) < 70 }
            needs = PetNeeds(tummy: Double(random.next(101)), clean: Double(random.next(101)),
                             energy: Double(random.next(101)), fun: Double(random.next(101)),
                             love: Double(random.next(101)), asleep: random.next(4) == 0)
            let pet = hatched ? Self.pet(needs, at: visit, careDays: random.next(10), streak: 1 + random.next(5)) : nil
            let plan = Self.plan(now: visit, lastVisit: visit, pet: pet, previous: history)
            let gap = Double(random.next(9 * 24) + 1) * 3600 + Double(random.next(60)) * 60
            let next = visit.addingTimeInterval(gap)
            for reminder in plan.reminders where reminder.date < next {
                arrived[ReminderPlan.gameDay(of: reminder.date, calendar: Self.india)] = reminder.line.id
            }
            // Within one plan too.
            for (a, b) in zip(plan.reminders, plan.reminders.dropFirst()) { #expect(a.line.id != b.line.id) }
            history = plan.linesByDay
            visit = next
        }
        #expect(arrived.count > 100)
        for (day, line) in arrived {
            if let tomorrow = arrived[day + 1] { #expect(tomorrow != line, "day \(day) and the next both had \(line)") }
        }
        // And the pool really rotates: most lines get their turn.
        #expect(Set(arrived.values).count >= 18)
    }

    @Test func daysTakeTurnsSayingHowThePetIs() {
        // A player who comes every evening at 9 pm for two months: each 6 pm hello is the day after a visit.
        var history: [Int: String] = [:]
        var arrived: [String] = []
        for day in 1...60 {
            let visit = Self.date(1, 21, month: 9).addingTimeInterval(Double(day) * 86_400)
            let plan = Self.plan(now: visit, lastVisit: visit, pet: Self.pet(at: visit, careDays: 20), previous: history)
            history = plan.linesByDay
            arrived.append(plan.reminders[0].line.id)
        }
        let wants = Set(ReminderPlan.cycle.filter { $0.when.isWant }.map(\.id))
        for (a, b) in zip(arrived, arrived.dropFirst()) {
            #expect(a != b)
            // One of each two days running says how the pet is.
            #expect(wants.contains(a) || wants.contains(b), "\(a), \(b)")
        }
        // The evening after a visit it's hungry, sleepy and bored, so those lines all come round.
        #expect(Set(arrived).isSuperset(of: ["hungry.favourite", "hungry.snack", "hungry.note", "sleepy", "sleepy.echo",
                                             "bored.games", "bored.hide"]))
        // And every invitation, within the two months.
        let invitations = Set(ReminderPlan.cycle.filter { !$0.when.isWant }.map(\.id))
        #expect(invitations.isSubset(of: Set(arrived)), "missing: \(invitations.subtracting(arrived))")
    }

    @Test func tomorrowDiffersFromTheLineThatCameTonight() {
        let first = Self.date(17, 9)
        let plan = Self.plan(now: first, lastVisit: first, pet: Self.pet(at: first))
        // Back the next evening after 6 pm, when daily.1 has gone out.
        let back = Self.date(18, 20)
        let tonight = plan.reminders[0].line.id
        let again = Self.plan(now: back, lastVisit: back, pet: Self.pet(at: back), previous: plan.linesByDay)
        #expect(again.reminders.first?.date == Self.date(19, 18))
        #expect(again.reminders.first?.line.id != tonight)
        #expect(again.linesByDay[ReminderPlan.gameDay(of: back, calendar: Self.india)] == tonight)
    }

    @Test func theThirdDayAwayIsTheComeBackLine() {
        let now = Self.date(17, 10)
        let plan = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now))
        #expect(plan.reminders.map { $0.line.id == "comeback" } == [false, false, true, false, false, false, false])
        #expect(plan.reminders[2].title == "Mochi keeps checking the door")
        let eggs = Self.plan(now: now, lastVisit: now, pet: nil)
        #expect(eggs.reminders[2].line.id == "egg.comeback")
    }

    @Test func linesOnlySayWhatWillBeTrue() {
        // Bathed, fed, played with and cuddled just before leaving at 5 pm: tomorrow at 6 pm (25 hours on) it's
        // hungry, sleepy and bored, but still clean enough, and not lonely; the day after, it needs a bath too.
        let left = Self.date(17, 17)
        let pet = Self.pet(at: left)
        #expect(pet.needs(at: Self.date(18, 18)).dirty == false)
        #expect(pet.needs(at: Self.date(18, 18)).lonely == false)
        #expect(pet.needs(at: Self.date(19, 18)).dirty)
        // The same departure on forty different days, so the rotation starts everywhere.
        var seen = Set<String>()
        for shift in 0..<40 {
            let leftThen = left.addingTimeInterval(Double(shift) * 86_400)
            let petThen = Self.pet(at: leftThen)
            let plan = Self.plan(now: leftThen, lastVisit: leftThen, pet: petThen)
            for (index, reminder) in plan.reminders.enumerated() {
                seen.insert(reminder.line.id)
                #expect(ReminderPlan.isTrue(reminder.line.when, of: petThen.needs(at: reminder.date)),
                        "\(reminder.line.id) on \(reminder.date)")
                // The first evening, 25 hours on: hungry, sleepy and bored, but not grubby or lonely yet.
                if index == 0 { #expect(!["dirty.bath", "dirty.poof", "lonely"].contains(reminder.line.id)) }
            }
        }
        #expect(seen.isSuperset(of: ["hungry.favourite", "sleepy", "bored.games", "dirty.bath", "lonely", "sticker"]))
        // A pet that will be asleep at 6 pm only hears lines that hold while it sleeps.
        var sleeper = Self.pet(PetNeeds(tummy: 50, clean: 50, energy: 0, fun: 50, love: 50, asleep: true), at: Self.date(18, 16))
        sleeper.careDays = 3
        let line = ReminderPlan.pick(day: ReminderPlan.gameDay(of: Self.date(18, 18), calendar: Self.india), away: 2,
                                     evening: Self.date(18, 18), pet: sleeper, lastLine: nil, history: [:])
        #expect(line.when == .any)
    }

    @Test func theNeedsThatEveningAreTheGames() {
        // web/src/state.js tick() for the same starts, worked out in node.
        let cases: [(start: PetNeeds, hours: Double, end: PetNeeds)] = [
            (start: PetNeeds(tummy: 100, clean: 100, energy: 100, fun: 100, love: 100, asleep: false), hours: 6,
             end: PetNeeds(tummy: 64, clean: 85.6, energy: 70, fun: 70, love: 90.4, asleep: false)),
            (start: PetNeeds(tummy: 100, clean: 100, energy: 100, fun: 100, love: 100, asleep: false), hours: 18,
             end: PetNeeds(tummy: 14, clean: 56.8, energy: 14, fun: 14, love: 71.2, asleep: false)),
            (start: PetNeeds(tummy: 100, clean: 100, energy: 100, fun: 100, love: 100, asleep: false), hours: 30,
             end: PetNeeds(tummy: 14, clean: 28, energy: 14, fun: 14, love: 52, asleep: false)),
            (start: PetNeeds(tummy: 100, clean: 100, energy: 100, fun: 100, love: 100, asleep: false), hours: 50,
             end: PetNeeds(tummy: 14, clean: 14, energy: 14, fun: 14, love: 20, asleep: false)),
            (start: PetNeeds(tummy: 80, clean: 60, energy: 10, fun: 50, love: 40, asleep: true), hours: 3,
             end: PetNeeds(tummy: 72.5, clean: 57.6, energy: 82, fun: 47, love: 38.5, asleep: true)),
            (start: PetNeeds(tummy: 80, clean: 60, energy: 10, fun: 50, love: 40, asleep: true), hours: 3.75,
             end: PetNeeds(tummy: 70.625, clean: 57, energy: 100, fun: 46.25, love: 38.125, asleep: false)),
            (start: PetNeeds(tummy: 80, clean: 60, energy: 10, fun: 50, love: 40, asleep: true), hours: 10,
             end: PetNeeds(tummy: 33.125, clean: 42, energy: 68.75, fun: 15, love: 28.125, asleep: false)),
            (start: PetNeeds(tummy: 20, clean: 20, energy: 96, fun: 12, love: 12, asleep: true), hours: 0.2,
             end: PetNeeds(tummy: 19.383333, clean: 19.786667, energy: 99.833333, fun: 12, love: 12, asleep: false)),
            (start: PetNeeds(tummy: 20, clean: 20, energy: 96, fun: 12, love: 12, asleep: true), hours: 30,
             end: PetNeeds(tummy: 14, clean: 14, energy: 14, fun: 12, love: 12, asleep: false)),
            (start: PetNeeds(tummy: 5, clean: 40, energy: 0, fun: 14, love: 90, asleep: false), hours: 24,
             end: PetNeeds(tummy: 5, clean: 14, energy: 0, fun: 14, love: 51.6, asleep: false)),
        ]
        let start = Self.date(17, 12)
        for c in cases {
            let got = Self.pet(c.start, at: start).needs(at: start.addingTimeInterval(c.hours * 3600))
            #expect(got.asleep == c.end.asleep)
            for (a, b) in [(got.tummy, c.end.tummy), (got.clean, c.end.clean), (got.energy, c.end.energy),
                           (got.fun, c.end.fun), (got.love, c.end.love)] {
                #expect(abs(a - b) < 0.0001, "\(c.start) after \(c.hours) h")
            }
        }
    }

    @Test func eggLinesUntilItHatches() {
        let now = Self.date(17, 10)
        let plan = Self.plan(now: now, lastVisit: now, pet: nil)
        let eggIDs = Set((ReminderPlan.eggCycle + [ReminderPlan.eggComeback]).map(\.id))
        #expect(plan.reminders.count == 7)
        #expect(plan.reminders.allSatisfy { eggIDs.contains($0.line.id) })
        #expect(plan.reminders.allSatisfy { !$0.title.contains("Mochi") && !$0.body.contains("Mochi") })
        let hatched = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now))
        #expect(hatched.reminders.allSatisfy { !eggIDs.contains($0.line.id) })
    }

    @Test func aStreakGetsTheDayAfter() {
        let now = Self.date(17, 10)
        let today = ReminderPlan.gameDay(of: now, calendar: Self.india)
        let plan = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, stampDay: today, streak: 4))
        #expect(plan.reminders[0].line.id == "streak")
        #expect(plan.reminders[0].title == "4 days in a row with Mochi!")
        #expect(plan.reminders[0].body.contains("we make it 5."))
        #expect(plan.reminders.dropFirst().allSatisfy { $0.line.id != "streak" })
        // One day isn't a streak, and a stamp from before today means it's already broken.
        #expect(Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, stampDay: today, streak: 1))
            .reminders.allSatisfy { $0.line.id != "streak" })
        #expect(Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, stampDay: today - 1, streak: 6))
            .reminders.allSatisfy { $0.line.id != "streak" })
    }

    @Test func growingUpWhenOneMoreDayWouldDoIt() {
        let now = Self.date(17, 10)
        let today = ReminderPlan.gameDay(of: now, calendar: Self.india)
        let baby = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, careDays: 1, lastCareDay: today))
        #expect(baby.reminders.contains { $0.line.id == "grow.kid" })
        let kid = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, careDays: 6, lastCareDay: today))
        #expect(kid.reminders.contains { $0.line.id == "grow.grown" })
        let grown = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, careDays: 9, lastCareDay: today))
        #expect(grown.reminders.allSatisfy { !$0.line.id.hasPrefix("grow.") })
    }

    @Test func everyLineFitsAndNeverMentionsAPrice() {
        let breeds = ["kitling", "bunling", "puppling", "cubling", "foxling", "drakling", "unknown"]
        for line in ReminderPlan.pool {
            for breed in breeds {
                for day in 20_770..<20_800 {
                    var pet = Self.pet(at: Self.date(17, 10), streak: 999, breed: breed)
                    pet.name = "Wwwwwwwwwwww"
                    let (title, body) = ReminderPlan.fill(line, pet: pet, day: day)
                    #expect(title.count <= ReminderPlan.titleLimit, "\(line.id): \(title)")
                    #expect(body.count <= ReminderPlan.bodyLimit, "\(line.id): \(body)")
                    #expect(!title.contains("{") && !body.contains("{"))
                    for word in ["free", "price", "buy", "sale", "$"] {
                        #expect(!title.lowercased().contains(word) && !body.lowercased().contains(word), "\(line.id)")
                    }
                }
            }
        }
        // At least twenty everyday lines, so a month of evenings rarely repeats; every id is its own.
        #expect(ReminderPlan.cycle.count >= 20)
        #expect(Set(ReminderPlan.pool.map(\.id)).count == ReminderPlan.pool.count)
    }

    @Test func atMostOneEmojiAndNoTips() {
        func emoji(_ text: String) -> Int {
            text.filter { c in
                guard let first = c.unicodeScalars.first, first.properties.isEmoji else { return false }
                return first.properties.isEmojiPresentation || c.unicodeScalars.count > 1
            }.count
        }
        for line in ReminderPlan.pool {
            for day in 20_770..<20_800 {
                let (title, body) = ReminderPlan.fill(line, pet: Self.pet(at: Self.date(17, 10), streak: 12), day: day)
                #expect(emoji(title) + emoji(body) <= 1, "\(line.id): \(title) / \(body)")
                // Reminders, not promotions (Guideline 4.5.4): nothing about the widget, other games or news.
                for word in ["widget", "home screen", "download", "update", "new game"] {
                    #expect(!(title + " " + body).lowercased().contains(word), "\(line.id)")
                }
            }
        }
    }

    @Test func theFavouriteFoodIsTheBreeds() {
        // web/src/catalog.js TASTES.
        let foods = ["kitling": "a fishy", "bunling": "a carrot", "puppling": "some crunchies", "cubling": "a honey pot",
                     "foxling": "an apple", "drakling": "a hot chili"]
        for (breed, food) in foods {
            #expect(Self.pet(at: Date(), breed: breed).favouriteFood == food)
        }
    }

    @Test func todaysStickerIsTheGames() {
        // web/src/state.js dailyVisit: STICKERS[floor(seeded(day * 2654435761)() * 28)], worked out in node.
        let expected = [0: 7, 1: 15, 20_000: 24, 20_774: 10, 20_775: 27, 20_776: 5, 20_777: 1, 20_800: 13, 21_000: 2, 30_000: 1]
        for (day, index) in expected {
            #expect(ReminderPlan.sticker(onDay: day) == ReminderPlan.stickers[index], "day \(day)")
        }
        // web/src/util.js dayNumber in India: 17 Nov 2026 runs until 23:59 IST.
        #expect(ReminderPlan.gameDay(of: Date(timeIntervalSince1970: 1_794_940_140), calendar: Self.india) == 20_774)
        #expect(ReminderPlan.gameDay(of: Date(timeIntervalSince1970: 1_794_940_260), calendar: Self.india) == 20_775)
    }

    @Test func thePetComesFromTheSave() throws {
        let json = """
        {"v":1,"pet":{"breed":"bunling","coat":"lilac","name":"Pip","seed":3,"born":1794700000000,
        "lastTick":1794916800000,"tummy":41.5,"clean":72,"energy":18,"fun":55,"love":90,"xp":40,
        "careDays":6,"lastCareDay":20774,"asleep":false,"outfit":{},"room":"peach","bathDirt":0},
        "berries":30,"streak":3,"lastVisit":20774,"settings":{"sound":true}}
        """
        let pet = try #require(ReminderPet(save: json))
        #expect(pet.name == "Pip")
        #expect(pet.breed == "bunling")
        #expect(pet.needs == PetNeeds(tummy: 41.5, clean: 72, energy: 18, fun: 55, love: 90, asleep: false))
        #expect(pet.at == Date(timeIntervalSince1970: 1_794_916_800))
        #expect(pet.careDays == 6)
        #expect(pet.lastCareDay == 20_774)
        #expect(pet.lastStampDay == 20_774)
        #expect(pet.streak == 3)
        #expect(ReminderPet(save: #"{"v":1,"pet":null,"berries":30}"#) == nil)
        #expect(ReminderPet(save: "") == nil)
        #expect(ReminderPet(save: nil) == nil)
        #expect(ReminderPet(save: "not json") == nil)
    }

    // MARK: The notification card's preview

    /// The card shows the queue's first reminder word for word: after a visit today (a new player's first
    /// launch), tomorrow's, and always a line from the pool, filled in.
    @Test func theCardShowsTheFirstReminderWordForWord() throws {
        let now = Self.date(27, 16)
        let plan = Self.plan(now: now, lastVisit: now, pet: Self.pet(at: now, careDays: 1))
        let first = try #require(plan.reminders.first)
        #expect(first.date == Self.date(28, 18))
        #expect(Reminders.previewLabel(for: first.date, now: now, calendar: Self.india) == "Tomorrow at 6 pm, it says:")
        #expect(!first.title.contains("{") && !first.body.contains("{"))
        #expect(ReminderPlan.pool.contains { $0.id == first.line.id })
    }

    @Test func thePreviewSaysWhichEvening() {
        let morning = Self.date(27, 10)
        #expect(Reminders.previewLabel(for: Self.date(27, 18), now: morning, calendar: Self.india) == "This evening at 6 pm, it says:")
        #expect(Reminders.previewLabel(for: Self.date(28, 18), now: morning, calendar: Self.india) == "Tomorrow at 6 pm, it says:")
        // 27 November 2026 is a Friday: two days on is Sunday.
        #expect(Reminders.previewLabel(for: Self.date(29, 18), now: morning, calendar: Self.india) == "On Sunday at 6 pm, it says:")
    }

    /// NineIO.swift is stocks-bot's games/client copy with quiet notifications after "Not now" (d4a73bd):
    /// Pockling, the tests' host, turns them on at launch.
    @Test func notNowMeansQuietReminders() async throws {
        for _ in 0..<50 where !NineIO.shared.quietAfterNotNow {
            try await Task.sleep(for: .milliseconds(100))
        }
        #expect(NineIO.shared.quietAfterNotNow)
        #expect(NineIO.shared.app == "pockling")
    }
}

@MainActor
final class FakeScheduler: ReminderScheduler {
    var queued: [String: (title: String, body: String, time: DateComponents, open: String)] = [:]
    var cancelledIDs: [String] = []
    var cancelledIdentifiers: [String] = []

    func cancel(nineIOIDs: [String], identifiers: [String]) {
        cancelledIDs += nineIOIDs
        cancelledIdentifiers += identifiers
        for id in nineIOIDs { queued[id] = nil }
    }

    func schedule(id: String, title: String, body: String, at time: DateComponents, open: String) {
        queued[id] = (title, body, time, open)
    }
}

/// A small repeatable generator, so the long test plays out the same way every time.
struct SeededRandom {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed
    }

    mutating func next(_ bound: Int) -> Int {
        state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
        return Int((state >> 33) % UInt64(bound))
    }
}
