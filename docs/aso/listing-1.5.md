# Pockling 1.5: visits, stickers and naps (ships as build 12)

1.5 is the rest of the Pockling ideas the user chose on 25 Nov 2026: pet visits by link, stickers of your own
pet for Messages, and naps in the Dynamic Island. All three are about the pet travelling beyond the app, where
other people see it: discovery is Pockling's gap (about one product page view a day; the growth memory has the
numbers). 1.5 is built on 1.4.1, so it carries the Snow Festival too.

## What it does

- **Visits by link** (pockling 133b54f): on the pet's card, "💌 Send Mochi to visit a friend" shares a link that
  carries the pet itself: its name, breed, coat, fur seed, age and its own look, in a code under 140 characters
  (`web/src/visit.js`). The pet goes after the # (`https://bitfold.9io.ai/pockling/#visit=…`), so it never
  reaches the server or its logs. Whoever opens it meets that very pet, waving, with "Hatch your own" (or "Back
  to Pip"), "Get Pockling for iPhone" on the web, and on an iPhone with the app, "See Biscuit there"
  (`pockling://visit?c=…`). Analytics: `visit_share`, `visit_open`, `visit_hatch`, `visit_app`.
- **Stickers for Messages** (pockling 04e3fd6): nine stickers of the pet as it looks now, its own look too: Hi!,
  Love you, Yay!, Good night, Yum!, OMG, Hugs, Miss you, Hehe. The game paints them in the app
  (`web/src/petArt.js` paintStickers, 408 px PNGs), the app keeps them in the App Group's `Stickers/` folder, and
  the new Messages extension (`ios/PocklingStickers`, an MSStickerBrowserViewController) shows them. A Makeover or
  growing up paints a new set; until the app has been opened once since the update, the drawer says to open it.
- **Naps in the Dynamic Island and on the Lock Screen** (pockling 4a5de4f): tuck the pet in and its nap is a Live
  Activity, the pet asleep with its own picture, its name and a countdown to waking that runs by itself. When it
  wakes the activity says so and goes; starting over ends it.
- **The widget's pictures after a Makeover** (fixed in 04e3fd6): the game saves every second, and in 1.4 each
  save put the painting of a custom pet's widget pictures off again, so after a Makeover (or growing up) the
  widget kept the old look until the app had been away and back. At a phone's pace (a save a second, frames
  held), 1.4's code never sent the new pictures in 15 s; 1.5's sends them in about 3 s. The first launch was
  never affected. `tools/smoke.mjs app` checks this, and the stickers, through a stand-in for the app's bridge.
- **The Snow Festival**, as `listing-1.4.1.md` says, if 1.5 is the update that goes out after 1.4.

## Checked

- npm test: 81 pass. Smoke: all 26 flows passed in the full run, among them the new `app` flow (the widget's pictures
  and the stickers, once each and again after a Makeover, at a phone's save pace).
- **Upgrade from 1.4 (8)** (4b93e30, Release) to **1.5 (10)** (d9d8964, Release) on an iPhone 18 Pro simulator (iOS
  27.2), with Mochi, a kid Kitling with its own look (Bunling ears, Foxling tail, wings, socks, Lilac), XP 140:
  - the pet came over unchanged: name, breed, coat, seed, look, XP, care days, outfit, room, born, 42 berries;
  - 1.5 painted the widget's pictures 8 s after launch with the app open, then the nine stickers 2 s later;
  - on 1.4 the same pet's widget pictures weren't painted in 30 s with the app open, only after a trip to
    Settings and back (the bug above).
- **Upgrade from 1.3.2 (7)** (102c2d2, Release, the version live now) to 1.5, with Biscuit, a grown golden
  Puppling without a look, XP 420: unchanged, and its stickers painted 10 s after launch.
- **Messages:** on an iPhone 17 Pro and an iPad Pro 13" simulator, + then Pockling shows the nine stickers, and
  tapping one puts it in the message, ready to send. Before the app has painted any, the drawer says to open it.
- The Release build holds `PlugIns/PocklingStickers.appex` and `PocklingWidget.appex`, version 1.5 (10).

## Text

**What's New** (no emoji: App Store Connect refuses ✨ in What's New, `listing-1.4.md`)
- en-US: Send your pet to visit a friend! Share a link from its card, and whoever opens it meets your very pet,
  waving hello. Your pet is in Messages now too, as stickers in nine moods. Tuck it in to watch it nap on your
  Lock Screen and in the Dynamic Island, counting down to when it wakes. And the Snow Festival starts on
  December 15!
- en-GB: the same, with "starts on 15 December!".
- es-MX: ¡Manda a tu mascota de visita con un amigo! Comparte un enlace desde su tarjeta y quien lo abra
  conocerá a tu mascota, saludando. Ahora también está en Mensajes, con stickers en nueve estados de ánimo.
  Arrópala para verla dormir en la pantalla bloqueada y en la Dynamic Island, con la cuenta regresiva hasta que
  despierte. ¡Y el Festival de la Nieve empieza el 15 de diciembre!
- hi: अपने पालतू को किसी दोस्त से मिलने भेजिए! उसके कार्ड से एक लिंक भेजिए, और जो भी उसे खोलेगा, वह आपके पालतू से
  मिलेगा, हाथ हिलाते हुए। अब आपका पालतू Messages में भी है, नौ मूड के स्टिकर बनकर। उसे सुलाइए और लॉक स्क्रीन और
  Dynamic Island में उसकी झपकी देखिए, जागने तक की उलटी गिनती के साथ। और स्नो फ़ेस्टिवल 15 दिसंबर से शुरू!

**Review notes:** a paragraph on 1.5 at the top: the Messages extension (stickers of the player's own pet,
painted on the device; open the app once first), the nap Live Activity (tuck the pet in from its bed), and visit
links (a share sheet; the link opens the web game, and the pet travels in the link's # part, so nothing about it
reaches a server). No new permission, purchase or data collection.

**Keywords and promotional text:** unchanged from 1.4.

## Store media

- **iMessage screenshots**, which a build with a Messages extension needs: Messages with Mochi's stickers in the
  simulator's Kate Bell conversation, the status bar at 9:41. `01-send` has "Love you" in the message, ready to
  send, over the drawer; `02-stickers` has all nine.
  - iPhone 6.3" (1206x2622), as Pockling's only iPhone set: `store/imessage-6.3/`, from an iPhone 17 Pro simulator.
  - iPad 13" (2064x2752): `store/imessage-ipad-13/`, from an iPad Pro 13" simulator with `tools/imessage-shots`, a
    UI test that drives Messages (`xcodegen generate`, then `xcodebuild test`; its header says how).
- The main sets stay as 1.4's. No price words anywhere (2.3.7).

## 1.5 (12): reminders that reach new players (27 Nov 2026)

Build 12 replaces build 11 in 1.5: build 11 plus the reminders change from the session "Reminders that reach
players, in every app" (`bead5a8`; the shared plan is stocks-bot `games/REMINDERS-REACH.md`).

- **Why:** 16 of 58 installs had seen the reminders card by 27 Nov. It came only from the pet's second day of
  care and never in the hatch launch, and only a third of players come back the next day, while 13 of 16
  first-day hatchers finish a game that first launch.
- **What:** the card at the first game that ends well, the hatch launch included; the first reminder word for
  word from the native plan (`Reminders.preview()`); "Not now" turns on quiet notifications (provisional:
  Notification Center only) and says so; the menu's Reminders row says they arrive quietly and offers
  "Show them as banners too"; NineIO.swift is stocks-bot `d4a73bd` (`notif_card` with `at` first_day or
  happy_round, `notif_quiet`). The rating prompt still never comes in the hatch launch.
- **Checked:** npm test 81; all 27 smoke flows, among them the new `reminders`; 28 native tests (3 new). In
  the Debug app on an iPhone 17 Pro simulator (iOS 27.2): hatch Biscuit, a snack, the card with the plan's
  real line ("Tomorrow at 6 pm, it says: Biscuit has questions / Mostly about snacks. One is about you."),
  Not now: provisional, `notif_card {at: first_day, n: 1}`, `notif_prompt {answer: later}`,
  `notif_quiet {granted: 1}`, news off, the week's queue starting with that line.
- **Upgrade from the live 1.4 (8)** (`4b93e30`; Mochi hatched on its Debug build, then its Release build) to
  **1.5 (12)** (Release): Mochi unchanged (name, kitling, cream with the lemon look, seed, XP, care days,
  outfit, room, born, 42 berries, streak 1), and home opened with nothing over it.

What's New: 1.5's text above, with one more sentence at the end:
- en-US and en-GB: Want a hello at 6 pm? Your pet now shows you exactly what it'll say, and Not now lets its
  notes wait quietly in Notification Center.
- es-MX: ¿Quieres un saludo a las 6 p. m.? Tu mascota te muestra exactamente lo que dirá, y con Not now sus
  notas esperan en silencio en el Centro de notificaciones.
- hi: शाम 6 बजे एक हैलो चाहिए? आपका पालतू अब ठीक-ठीक दिखाता है कि वह क्या कहेगा, और Not now चुनने पर उसके नोट
  चुपचाप Notification Center में इंतज़ार करते हैं।

Review notes as entered (3,944 characters, under the 4,000 cap): 1.4's, with its first paragraph (1.4's studio)
replaced by 1.5's (visits, stickers, naps), the notification card paragraph rewritten for the new timing, the
exact text and provisional "Not now", and the Settings paragraph tightened with the banners row.

### In App Store Connect (27 Nov 2026, on the user's "Yes, upload all five" in the reminders session)

- 18:23 IST: build 12 uploaded (`xcodebuild -exportArchive`, destination upload) from the archive of `5be5f45`.
- Version 1.5 `7a73bbd2-202f-442b-a5c3-cce576b21f7a` created through iris (POST appStoreVersions): it copied
  1.4's text, media, review details, copyright (2026 9io) and release type (AFTER_APPROVAL).
- What's New in en-US, en-GB, es-MX and hi (1.5's text plus the sentence above), read back identical; no price
  word in What's New or the promotional text.
- Review notes (`appStoreReviewDetails` `38cb2ae3`), read back identical; sign-in not required.
- iMessage screenshots, English (U.S.), through iris (appScreenshotSets, then appScreenshots with their upload
  operations and checksums): `IMESSAGE_APP_IPHONE_61` (`2b2cd16c`) holds `store/imessage-6.3/01-send` and
  `02-stickers`; `IMESSAGE_APP_IPAD_PRO_3GEN_129` (`aa92867b`) holds `store/imessage-ipad-13/01-send` and
  `02-stickers`. All four COMPLETE, their MD5s matching the files.

## Release

The user's go-ahead in the pockling-duo session, 25 Nov 2026: "Yes, do that" to "Upload 1.5 now, and submit it with
the festival once 1.4 is approved?".

- **Upload:** 1.5 (10) archived unsigned from main 1934f8c (Xcode 27.2). The widget, then the Messages extension,
  then the app were signed ad hoc with their entitlements (push as `production`). Exported to a folder first and
  checked: 1.5 (10) on all three bundles, Apple Distribution (9X9HQVQ78G), a store profile each, the App Group on
  all three. The export registered the new App ID `app.pockling.Pockling.Stickers` with the App Group. Also
  checked: `com.apple.message-payload-provider` with the iMessage App Icon, no non-exempt encryption, Live
  Activities on, and the web game inside at 1.5. IPA 21,381,715 bytes, SHA-256 00a3e0a19025b7ad…. Uploaded at
  23:38:59 IST ("Upload succeeded"). Build `d5b605b1-6db2-49f1-9af4-5a39f81f605b` was VALID by 23:41 IST, with no
  non-exempt encryption.
- **1.4 (8) went live on 25 Nov at 23:13 UTC** (26 Nov, 04:43 IST, by Apple's lookup), so version 1.5 can be made.
- **Changed on 27 Nov: build 12 goes to review, not build 11, and this session doesn't submit.** Build 12 is
  build 11 plus the reminders card (1.5 (12) above). The orchestrator's plan, once the user OKs the upload in its
  chat:
  1. The reminders session uploads build 12, creates version 1.5 from 1.4 (which copies its text, media and
     review details) and fills in what doesn't come over:
     - What's New in four languages: the text above, then the reminders sentence;
     - the review notes: the 1.5 paragraph, then the reminders one;
     - the iMessage screenshots (English (U.S.)), new with the Messages extension, so 1.4 has none to copy:
       `store/imessage-6.3/` into `IMESSAGE_APP_IPHONE_61` (as the main iPhone set is `APP_IPHONE_61`),
       `store/imessage-ipad-13/` into `IMESSAGE_APP_IPAD_PRO_3GEN_129`;
     - build 12 (not 10 or 11), released automatically.

     Then Add for Review, which makes the draft submission.
  2. The live-events session adds the Snow Festival event (6839282325) to that draft, on the OK in its own chat.
  3. The orchestrator checks the draft and submits it. If 1.5 can't be live before the event's publish date
     (8 Dec), the live-events session hears first: it moves the event's dates.

  The Duo media come over with 1.4's sets, and custom product pages aren't part of a version, so 1.5 needs
  nothing new for either. The user's "Yes, do that" above was for this session's builds 10 and 11. Build 12 goes
  up on the OK the orchestrator is asking for.
- 1.4.1 (9) stays archived (from 3000ae4) but won't be uploaded: 1.5 carries the festival and fixes its widget bug.
- **The web game** was deployed on the user's "Yes, deploy it" at 23:42:43 IST, from main 756bfa7 (its web/ as
  d9d8964). Before it, the server matched 1.4's deploy (4b93e30, 43 files); after it, all 48 files on the server
  matched main. Checked live in headless Chrome: the game starts at the eggs, and a visit link opened fresh shows
  "💌 Mochi came to visit!" with "Hatch your own" and "Get Pockling for iPhone".
- **Found while checking:** visit links waited the whole time the hatch scene showed. So a new player who got the
  app from a friend's visit, opened it to the eggs and tapped "See Mochi there" saw nothing happen, and a web tab
  at the eggs ignored a new #visit=. Fixed in ef87d21: only mid-hatch waits now, and smoke `links` checks it.
- **Build 11 and the redeploy**, on the user's "Yes, both" (25 Nov):
  - 1.5 (11) was archived from main 93ddfce, the same as build 10 plus that fix. It was signed and checked the
    same way: 1.5 (11) on all three bundles, the App Group on each, push `production`, and the fix inside. IPA
    21,381,893 bytes, SHA-256 d85a9275857da5ca…. Uploaded at 23:54:30 IST. Build
    `a39ff5bd-a14f-44eb-b28b-597602be7716` was VALID by 23:56 IST, with no non-exempt encryption.
  - Build 11 was the one to submit until 27 Nov, when build 12 took its place. The upgrade tests above were on
    build 10; 11 changes only how visit links are let in.
  - The web game was redeployed at 23:54:43 IST from 93ddfce. Only `src/app.js` changed, and all 48 files match
    main.
  - Checked live: a visit link opens Mochi's visit fresh, in a tab already at the eggs, and when navigated to in a
    running tab.
- **Build 12, checked from this session (27 Nov)** in the reminders session's export (archive
  `ios/build/Pockling-1.5-12.xcarchive`, not in git):
  - 1.5 (12) on all three bundles, Apple Distribution (9X9HQVQ78G), the App Group on all three, and push
    `production` on the app;
  - the Messages extension is a `com.apple.message-payload-provider` with the iMessage App Icon, and Live
    Activities are on; the naps, widget, stickers, visit and pet-art code is unchanged since build 11;
  - the game inside matches main's `web/` file for file, with the stickers' and widget's `painter()`, the visit
    fix from the eggs and `FESTIVAL_VERSION` 1.5.

  On 5522851's code: npm test 81 pass, and smoke `app` (widget pictures and stickers) and `links` (visits) pass.

### Build 12's draft (27 Nov 2026)

- Build 12 (`4a988cef-a6a1-4c2b-a8d2-450a631694e4`) VALID, no non-exempt encryption; attached to 1.5 in place of 11.
- **Draft submission `2c154b8f-c4b4-445f-bbcf-81aa1a83e018`** (iOS, created through iris about 18:35 IST): version
  1.5 with build 12, READY_FOR_REVIEW (Apple's checks passed, the iMessage screenshots included). Not submitted.
- Sent to the live-events session (local_3a80bda8), which adds the Snow Festival in-app event (6839282325) to this
  draft under the user's OK in its own chat, and to the orchestrator, which checks the draft and submits. The event
  publishes on 8 Dec, so 1.5 should be live before then.

### Submitted (27 Nov 2026)

- **Submitted by the orchestrator at 18:38 IST** (13:08:46Z), with the Snow Festival in-app event (6839282325) in
  the same submission. Before that it checked the draft:
  - **Build:** 12 VALID, and the release automatic.
  - **What's New:** en-US, en-GB, es-MX and hi, each with 1.5's text and the reminders sentence, and no price
    words.
  - **Unchanged from live 1.4:** keywords, descriptions, promotional text, links, and 1.4's screenshot, Duo and
    preview sets.
  - **Messages screenshots:** the two iMessage sets (iPhone 6.1" and iPad 13") are real captures of the nine
    stickers.
  - **The event:** its dates (publish 8 Dec 12:00Z, running 15 Dec to 14 Jan) and its four languages.
- Submission `2c154b8f` is WAITING_FOR_REVIEW.
- **What's next:**
  - The event publishes on 8 Dec, so 1.5 needs approval before then.
  - Once 1.5 is live, the live-events session publishes the server-side festival, on the user's OK.
