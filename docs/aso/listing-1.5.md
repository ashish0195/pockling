# Pockling 1.5 (10): visits, stickers and naps

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
- **Next, once 1.4 (8) is approved and live** (Waiting for Review since 25 Nov 22:01 IST; App Store Connect allows
  no new version while one is in review):
  1. Create version 1.5 from 1.4, which copies its text, media and review details.
  2. Enter What's New in four languages and the review notes paragraph above. Add the iMessage screenshots
     (English (U.S.)): `store/imessage-6.3/` into `IMESSAGE_APP_IPHONE_61` (as the main iPhone set is
     `APP_IPHONE_61`), `store/imessage-ipad-13/` into `IMESSAGE_APP_IPAD_PRO_3GEN_129`. Attach build 10, and release
     automatically.
  3. Add for Review, which makes the draft submission. Then message the live-events session with the version
     and the draft's id: it adds the Snow Festival event (6839282325) to that draft and says when it's in.
     Don't add the event from here.
  4. Submit the whole draft (covered by the go-ahead above). If 1.5 can't be live before the event's publish
     date (8 Dec), tell the live-events session first: it moves the event's dates.
- 1.4.1 (9) stays archived (from 3000ae4) but won't be uploaded: 1.5 carries the festival and fixes its widget bug.
- **The web game** at bitfold.9io.ai/pockling/ is still 1.4's (4b93e30). Visit links open there, so main's web game
  has to be deployed before 1.5 is out, or a friend opening a link sees the eggs instead of the pet. It waits for
  the user's OK.
