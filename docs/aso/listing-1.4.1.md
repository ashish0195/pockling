# Pockling 1.4.1 (9): the Snow Festival

The user chose "December live events" on 25 Nov 2026. Pockling's is the Snow Festival, 15 Dec 2026 to 14 Jan
2027, run from 9io's games service: the event `snow-festival-2026` (kind `snow_festival`), and the App Store
in-app event 6839282325, whose link is `pockling://snowfestival`. The live-events session made both; their
records are `docs/aso/snow-festival-event.md` and the shared note `live-events.md`. 1.4.1 is the update that
keeps the event's promises: snow at the window, playing in the snow, and hats and a scarf to earn.

## What it does

- **The event:** `web/src/festival.js`, with its rules and the list from the service (`web/src/nineio-live.js`,
  copied from stocks-bot `games/client/`). The festival is on from start to end by the phone's clock; offline,
  the last list holds. Debug builds of the app and `?dev=1` pages see draft events too. `?festival=on` (or `soon`)
  stands one in for screenshots and tests.
- **At home:** snow falls past the window (`scenes/snow.js`), and once a day a big snowflake waits at the window
  to be tapped. A ❄️ button by the others opens the festival's card: the snowflakes so far, the three rewards,
  today's news and a button for a walk.
- **On walks and in Fetch:** the park is under snow, with snow falling. Walks find up to two snowflakes a day on
  the path, and no flowers, flies or mud.
- **Rewards:** 2 snowflakes earn the Cozy beanie, 4 the Winter hat and 7 the Red scarf, with a card to put each
  one on. A reward the pet already owns gives 30 berries instead. Progress is kept in the save under the event's
  id, so next year's festival starts afresh.
- **The link:** `pockling://snowfestival` opens the card on the pet's home screen, and so does 1.3.2's
  `pockling://firstsnow`. Before the festival it says when it starts; after, that snow is on its way.
- **Payload keys,** all optional, and the same as the server's (`live-events.md`): room, park, goal, outfits,
  steps, window, walk.
- **Analytics:**
  - `live_open` (from `card` or `link`), and `live_flake` (from `window` or `walk`, with the count);
  - `live: <id>` on walks' and Fetch's play/finish while it's on.

## Checked

- npm test: 76 pass, 8 of them new in `test/festival.test.mjs`.
- Headless Chrome, all with `?festival=on`:
  - at home: the snow, catching the snowflake (1 of 7) and the card;
  - a snowy walk finding a snowflake (❄️ 1);
  - snowy Fetch;
  - with `?festival=soon`, no button, and the link says when it starts.
- **The app on an iPhone 18 Pro simulator** (Debug):
  - It fetched the real server's draft (start 15 Dec 12:00Z, `min_version` 1.4.1, the payload above), so the web
    view's request works.
  - `xcrun simctl openurl … pockling://snowfestival` reached the game as `open {to: "snowfestival"}`. With the
    festival still to come, it showed "❄️ The Snow Festival starts on Dec 15!".
  - With a stand-in event: snow past the window at night, the snowflake, the ❄️ button and the card.
- Event art from the game itself: `store/events/snow-home.jpg`, `snow-card.jpg` and `snow-walk.jpg` (1320x2868,
  `tools/store-shots.mjs … snow-home snow-card snow-walk`), beside the live-events session's event images.

## Text

**What's New**
- en-US and en-GB: The Snow Festival is coming! From 15 December, snow falls past your pet's window and the park
  turns white for walks. Catch a snowflake at the window each day, and find more on snowy walks, to earn a Cozy
  beanie, a Winter hat and a Red scarf.
- es-MX: ¡Llega el Festival de la Nieve! Desde el 15 de diciembre, la nieve cae frente a la ventana de tu mascota y
  el parque se pone blanco para pasear. Atrapa un copo de nieve en la ventana cada día y encuentra más en tus
  paseos para ganar un gorro de lana, un gorro de invierno y una bufanda roja.
- hi: स्नो फ़ेस्टिवल आ रहा है! 15 दिसंबर से आपके पालतू की खिड़की के बाहर बर्फ़ गिरेगी और सैर के लिए पार्क सफ़ेद हो
  जाएगा। हर दिन खिड़की पर एक बर्फ़ का फ़ाहा पकड़िए और बर्फ़ीली सैर पर और ढूँढिए, और पाइए ऊनी टोपी, सर्दियों की टोपी
  और लाल मफ़लर।

No emoji: App Store Connect refuses ✨ in What's New (listing-1.4.md).

**Review notes:** the first paragraph gains a line about the festival. It runs from 15 Dec; until then the
link `pockling://snowfestival` shows when it starts. The in-app event is submitted with this version, on the
user's OK.

## Release

1.4.1 can be submitted only once 1.4 (Waiting for Review since 25 Nov 22:01 IST) is approved, and only with
the user's OK. The live-events session submits the in-app event with it.
