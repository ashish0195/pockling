# Pockling 1.3.2: quirky little notes from your pet

1.3.2 (7) is 1.3.1 with three things the version before had to leave out (`listing-1.3.1.md`, "Not in
1.3.1"):

- **Daily reminders that change every day, quirky and cute** (the orchestrator's plan for all four games,
  approved by the user on 17 Nov 2026, then the user's "I want very quirky and cute notifications on daily
  basis to be sent"). 1.2 to 1.3.1 sent the same 6 pm line every day ("<name> is at the window / Nose on the
  glass. Tail going. Come say hello?") plus NineIO's nudge after three days away. Now:
  - one note at 6 pm on each day without a visit, for the seven days after the last one, queued as
    `daily.1`–`daily.7` through NineIO's `scheduleReminder` and rebuilt on every launch, return and trip to
    the background (`ios/Pockling/ReminderPlan.swift`, `Reminders.swift`);
  - today is skipped once the player has been in, and nothing comes after a week away;
  - never the same line two days running, across rebuilds too;
  - days take turns: one says how the pet is (hungry, sleepy, grubby, lonely or bored, only when the game's
    own rules say it will be that evening), the next shares a silly moment from its day and asks the player
    over;
  - the day after a visit that kept a streak going says so (every third day at most), and so does a pet one
    day of care from growing up; the third day away is the come-back line, so NineIO's own nudge is off and
    no day gets two;
  - before an egg hatches, only egg lines;
  - opt-in as before: only with the Reminders switch on and notifications allowed in iOS. Turning either
    off clears every reminder, 1.3.1's repeating one included;
  - each reminder opens the pet ("pet"): the game closes any menu and, if a game was left open, goes home,
    where the pet says hello. NineIO counts the tap as `notif_open`.
- **A URL scheme**, for the "First Snow" in-app event (`docs/ASO.md`): `pockling://firstsnow`, and
  `pockling://pet`, open the pet the same way (`ios/Pockling/PetLinks.swift`). The event itself still waits
  for its snow, hat and scarf in a later update; until then the link shows the pet. The web view's own
  files load from `pockling://app/…`, the same word: WebKit answers those inside the page and never hands
  them to iOS, and `app` is never a link's key (`ios/PocklingTests/PetLinkTests.swift`).
- **Contrast and Reduce Motion:** see `accessibility.md`.

Settings' Reminders line ("A little note from your pet at 6 pm on days you haven't visited"), the
notification card ("A little note at 6 pm on days you haven't visited, with all of <name>'s news") and the
privacy page describe the new reminders.

## The reminder pool

40 lines: 30 everyday ones (12 wants, 18 invitations), the streak line, two growth lines, the come-back
line and six egg lines. At most one emoji each; titles at most 40 characters and bodies at most 110 with a
12-character name (tested). No tips or promotions (Guideline 4.5.4), no price words. `{food}` is the breed's
favourite (catalog.js TASTES: a fishy, a carrot, some crunchies, a honey pot, an apple, a hot chili),
`{sticker}` that day's stamp-book sticker (state.js `dailyVisit`). The evidence for each claim, and sample
weeks: `pockling-1.3.2-reminders.md` in the side-session notes.

| id | sent when (that evening) | title | body |
|---|---|---|---|
| `sticker` | always | Today's sticker is a {sticker} | Come and stick it in our stamp book. It comes with a handful of berries too! |
| `hungry.favourite` | tummy < 30 | {name}'s tummy is rumbling | Is it snack time yet? I'd love {food}. Just saying. 🍎 |
| `rug` | awake | {name} redecorated (sort of) | The rug is the floor now. Big changes in my room. Come and see. 🙃 |
| `sleepy` | energy < 30 | {name} can't stop yawning | My eyes keep closing. Will you tuck me in for a cozy nap? 🌙 |
| `face` | awake | {name} practiced a new face | It's the same face, but louder. Come and see it? |
| `bored.games` | fun < 30 | {name} is bored of being bored | Fetch, Snack Drop or Hide and Seek? I'll even let you win. Maybe. 🎾 |
| `window` | awake | Sunset at {name}'s window | The sky outside my window just went pink and orange. Come and watch it with me? 🌅 |
| `dirty.bath` | clean < 30 | {name} could use a bath | I'm a bit grubby. Soap, a rinse and the fluffy towel, please? The duck's waiting too. 🫧 |
| `crumb` | awake | Breaking news from {name} | I found a crumb. It's the best crumb. Come and see the crumb. |
| `hungry.snack` | tummy < 30 | Snack o'clock for {name}? | My tummy just made a very small, very loud noise. Can we have a snack together? |
| `walk` | awake | {name} has a walk planned | Step one: the park. Step two: the mud. Step three: you'll see. 🐾 |
| `lonely` | love < 30 | {name} could use a cuddle | I've missed you today. A long, slow stroke would make everything better. 💗 |
| `questions` | awake | {name} has questions | Mostly about snacks. One is about you. |
| `bored.hide` | fun < 30 | Hide and Seek with {name}? | I'll hide, you find me. Listen for my giggle! 🙈 |
| `meeting` | awake | {name} called a meeting | Attendees: me and the rubber duck. Agenda: you. 🦆 |
| `dirty.poof` | clean < 30 | Bath time for {name}? | Towel me dry and I poof up twice my size. It's my best trick! 🛁 |
| `talk` | awake | Say something to {name} | Tap the 🎤 and talk to me. I'll say it back in my squeakiest little voice. |
| `hungry.note` | tummy < 30 | {name}'s tummy left you a note | It just says "rumble". I think it means {food}. |
| `spot` | awake | {name} saved you the best spot | It's on the rug. It's still warm. 💗 |
| `sleepy.echo` | energy < 30 | {name} yawned so big it echoed | Is it nap o'clock? My blanket and I are ready when you are. 🌙 |
| `closet` | awake | {name} is having a hat crisis | The crown says royal. The wizard hat says wise. I can't decide. Come and help? 👑 |
| `dirty.dust` | clean < 30 | {name} is now 60% dust bunny | Okay, maybe not 60. A big bubbly bath would sort it out. 🫧 |
| `stars` | awake | {name} tried to count the stars | Got to three. Fell asleep. Help me with the rest tonight? ⭐ |
| `lonely.cuddles` | love < 30 | {name} has spare cuddles | I've been saving them up all day and they're piling up. Come and collect? 💗 |
| `cactus` | awake | {name} befriended the cactus | We're very close. Not too close. It's a cactus. 🌵 |
| `hello` | awake | {name} rehearsed your hello | Two hops, some hearts, one very big smile. It's ready when you are. 💕 |
| `lights` | awake | {name} guards the twinkly lights | Not one has gone missing today. You're welcome. ✨ |
| `photo` | awake | {name} is ready for a close-up | Fur fluffed, best side found. Take my photo and make a little card? 📸 |
| `cloud` | awake | {name} named a cloud after you | Then it turned into a bunny. Still you, though. ☁️ |
| `song` | awake | {name} wrote you a song | It's mostly one note. It's a very good note. 🎵 |
| `streak` | always | {n} days in a row with {name}! | Visit me today and we make it {next}. Today's sticker is waiting for our stamp book. |
| `grow.grown` | always | {name} is nearly grown up! | One more day of care and I'll be all grown up. Shall we do it today? 🌟 |
| `grow.kid` | always | {name} is nearly a kid! | One more day of care and I won't be a baby any more. Shall we do it today? 🌟 |
| `comeback` | always | {name} keeps checking the door | It's been a few days. No rush, but a very fluffy hello is waiting whenever you're ready. |
| `egg.six` | always | Six eggs are waiting | Pick one, tap it until it cracks and meet the little friend inside. 🥚 |
| `egg.patterns` | always | Spots, hearts, paws or stars? | Every egg holds a different Pockling. Which one will you hatch? 🥚 |
| `egg.wiggle` | always | The eggs are wiggling | Somebody small and fluffy wants to meet you. Will you help them hatch? |
| `egg.name` | always | Who will you hatch today? | A Kitling, a Bunling, a Drakling... and you get to choose their name. 💕 |
| `egg.hello` | always | An egg wobbled. Twice. | That's basically a hello. Come and say hello back? 🥚 |
| `egg.comeback` | always | The eggs are still waiting | No rush. Six little friends are curled up inside, ready whenever you are. |

Changed on the way (17 Nov 2026):
- 1.3.1's "is at the window / Nose on the glass" line went first: the pet presses its nose to the glass only
  now and then when it's joyful, never at 6 pm after a day away. Its place is the dusk in the room's window,
  which follows the phone's clock (web/src/bake/room.js).
- The orchestrator's wording check: the widget line ("<name> fits on your Home Screen") went, as a tip
  rather than a reminder (Guideline 4.5.4); play, walk, dress-up and photo got quirkier; eleven new
  whimsical moments came in (the rug, a new face, the crumb, questions, the meeting with the rubber duck,
  the best spot, the stars, the cactus, the fairy lights, the cloud, the song), with four more wants and
  an egg line.

## What's New

### English (U.S.) and English (U.K.)

```
Your Pockling has news.

Turn on Reminders and, on each day you haven't visited, your pet sends one little note at 6 pm: it redecorated (the rug is the floor now), it called a meeting with the rubber duck, or its tummy left you a note that just says "rumble". It's a different note every day, it only says how your pet is when that's really true, and after a week away it goes quiet. Tap one to go straight to your pet.

Also: clearer, easier-to-read text all through the game, and calmer motion when Reduce Motion is on.
```

### Spanish (Mexico) (es-MX)

```
Tu Pockling tiene noticias.

Activa los recordatorios y, cada día que no lo visites, tu mascota te mandará una notita a las 6 p. m.: que redecoró (ahora la alfombra es el piso), que convocó a una junta con el patito de hule, o que su pancita te dejó una nota que solo dice "grrr". Cada día es una notita distinta, solo te cuenta cómo está cuando de verdad es así, y si te vas una semana, se queda en silencio. Toca una para ir directo con tu mascota.

Además: textos más claros y fáciles de leer en todo el juego, y movimientos más tranquilos con Reducir movimiento activado.
```

### Hindi (hi)

```
आपके Pockling के पास ख़बरें हैं।

रिमाइंडर चालू करें, और जिस दिन आप न आएँ, उस दिन शाम 6 बजे आपका Pockling एक छोटा-सा संदेश भेजेगा: उसने कमरा नए सिरे से सजाया (अब कालीन ही फ़र्श है), उसने रबर की बत्तख के साथ मीटिंग बुलाई, या उसके पेट ने आपके लिए एक नोट छोड़ा जिसमें बस "गुड़गुड़" लिखा है। हर दिन नया संदेश आता है, वह कैसा है यह तभी बताता है जब सच में ऐसा हो, और एक हफ़्ते तक न आने पर चुप हो जाता है। किसी संदेश पर टैप करें और सीधे अपने Pockling के पास पहुँचें।

साथ ही: पूरे गेम में साफ़ और पढ़ने में आसान टेक्स्ट, और Reduce Motion चालू होने पर शांत हलचल।
```

No price words in any of them (Guideline 2.3.7). A native speaker should still read the Spanish and Hindi.

## Review notes

1.3.1's notes with two changes, 3,968 of the 4,000 characters:

- the first paragraph (1.3.1's, about iPhone Duo) is now:

  ```
  1.3.2: the daily reminder now changes each day. On days without a visit, for up to a week, one playful 6 pm note in the pet's voice says how it is (hungry, sleepy, needs a bath, only when true) or shares a silly moment from its day. All are scheduled on the device; tapping one opens the pet. New URL scheme: pockling://pet, and pockling://firstsnow for a planned in-app event. Otherwise as in 1.3.1 (made for iPhone Duo); the notes below still describe the app.
  ```

- the notification card's "Just reminders" now reads `(a 6 pm note on days without a visit, for up to a
  week, scheduled on the device)`, in place of `(a hello at 6 pm and a nudge after a few days away, scheduled
  on the device)`.

Everything else is 1.3.1's word for word (read from App Store Connect on 17 Nov 2026: 3,891 characters,
SHA-256 bccc0b574f1e6242…). The new text's SHA-256 starts 4d32b4c24b441ae9.

## Tests (17 Nov 2026)

- **Swift** (`ios/PocklingTests`, new in 1.3.2): 24 tests pass on an iPhone 17 simulator (iOS 27.2). The
  reminders: seven evenings from a visit at 6 pm, today skipped after a visit, nothing after 7 days away, 6 pm
  across a clock change, turned off means nothing queued and every id cancelled (1.3.1's `pockling.daily` and
  NineIO's `comeback` too), never the same line two days running (a year of random visits and states), days
  alternating between a want and an invitation for a daily player, tomorrow's line never tonight's, the
  come-back line on day 3, lines only true that evening, the needs' decay matching `state.js` (worked out in
  node), egg lines before hatching, the streak and growth lines, the breed's favourite food, the day's sticker
  matching `state.js` (mulberry32, worked out in node), the save read as the game writes it, every line within
  40/110 characters with a 12-character name, at most one emoji, no price words, no tips. The links:
  `pockling://pet` and `pockling://firstsnow` (any case, with or without `//`), nothing else, never the web
  view's `pockling://app/…`, and the scheme in the built app's Info.plist.
- **Web:** `npm test` 58 pass (two new: the park's parallax, and its absence with Reduce Motion);
  `node tools/smoke.mjs` all flows pass, with a new one, `links` (a link before hatching leaves the eggs alone,
  closes a menu, and takes a bath back home).
- **On the simulator, the Debug app** with a 6-day Kitling career: iOS's permission prompt from the game's
  Reminders switch; the queue in iOS's pending store (`9io.daily.1`–`7`, 18–24 Nov at 18:00, each tagged
  `open: pet`); rebuilt on the way to the background with no come-back nudge; Reminders off clears every one,
  on brings all seven back; `xcrun simctl openurl … pockling://firstsnow` (after iOS's "Open in Pockling?")
  closes the open menu, and `pockling://pet` takes the game from the bath back home, where the pet greets with
  hearts. Not verified: tapping a delivered reminder (the simulator didn't open one tapped in Notification
  Center); it goes through the same `PetLinks.open`.
- **Upgrade tests** (Release builds on the simulator, per the memory note "Upgrade testing"), with the same
  career made in each old version, Reminders turned on in its Settings and iOS's prompt allowed:
  - from **1.3 (5)** (700fea0, live), to a 1.3.2 build from before the pool turned quirky and the widget's
    colours changed (neither touches the save, the settings or the queue's ids): its `pockling.daily` and
    `9io.comeback` were replaced by `9io.daily.1`–`7` at the first launch of 1.3.2; the save (pet, berries,
    streak, stamps, totals, owned, settings) is identical, and the install id, Reminders choice and 1.1
    carry-over flag are kept;
  - from **1.3.1 (6)** (1ba6bbe, in review), with the final build: the same, and the queue held the quirky
    lines (streak, nearly grown up, come-back, the echoing yawn, the sunset, 60% dust bunny, the crumb).

## The build

- **1.3.2 (7)** from main 102c2d2: archived unsigned (Xcode 27.2), the widget and then the app signed ad hoc
  with their entitlements (push as `production`), exported to a folder first and checked: version 1.3.2 (7)
  on the app and the widget, URL scheme `pockling`, `aps-environment` production, the App Group
  `group.app.pockling.Pockling` on both, Apple Distribution (9X9HQVQ78G), 40 web files, the new pool in the
  binary and the widget line gone. IPA 20,674,311 bytes, SHA-256 31ff38fa80d013ea….
- The first export, on 17 Nov at 23:04 IST, failed: Apple answered "Bad Gateway", then "Authentication failed:
  Your session has expired" (App Store Connect was failing account-wide that evening). The user signed in to
  Xcode again and said "Signed in, upload it" in this session.
- **Uploaded** on 18 Nov 2026 at 12:53:16 IST ("Upload succeeded"), while 1.3.1 was In Review.
- In App Store Connect as build `e8ae0d2b-42b0-4019-b3dc-ea71f5441c75`, VALID by 12:58 IST. Version 1.3.2 can
  only be created once 1.3.1, In Review since that morning, leaves review.
