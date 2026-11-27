# The Snow Festival: App Store in-app event and live event (December 2026)

The user chose "December live events" on 25 Nov 2026: a Snow Festival in Pockling, listed on the
App Store as an in-app event (search and the Today tab) and run in the game as a live event from
the 9io games service. It takes up `docs/ASO.md`'s "First Snow" idea.

## App Store Connect: in-app event 6839282325

Entered on 25 Nov 2026 through App Store Connect's own API from the web session (iris), and read
back identical. On 25 Nov the user OK'd sending it to review in the same submission as the update
that carries the festival ("Yes, with that update", in the live-events session).

**27 Nov 2026:** added to Pockling 1.5's draft submission `2c154b8f-c4b4-445f-bbcf-81aa1a83e018`, next to
version 1.5 (build 12). Both items are Ready for Review. **Not submitted:** the orchestrator checks the
draft and submits it. The checks before adding it:
- 1.4 is live.
- Build 12 is valid.
- Build 12's archive, `5be5f45`, contains the festival (`3000ae4`, `web/src/festival.js`) and the
  `snowfestival` link key.

1.5 has to be live before the 8 Dec publish date, or the event's dates move.

| Field | As entered |
|---|---|
| Reference name | Snow Festival 2026 |
| Badge | Special Event |
| Purpose | Appropriate for all users |
| Priority | Normal |
| Event access | In-app purchase not required |
| Primary language | English (U.S.) |
| Countries or regions | All 175 (the same list as Football Kick's events) |
| Publish | 8 Dec 2026, 17:30 IST (12:00 UTC) |
| Start | 15 Dec 2026, 17:30 IST |
| End | 14 Jan 2027, 17:30 IST: 30 days |
| Deep link | `pockling://snowfestival` (1.4.1 opens the festival card on the pet's home screen; `pockling://firstsnow` goes there too, and older versions just open the app) |
| Event card | `docs/aso/store/events/snow-festival-card-1920x1080.jpg` |
| Event details page | `docs/aso/store/events/snow-festival-details-1080x1920.jpg` |

Each language has the same two images. Neither has any words in it.

| Language | Name | Short description | Long description |
|---|---|---|---|
| English (U.S.) | Snow Festival | Snowfall, cozy hats and a scarf to earn | Snow falls past your pet's window and the park turns white. Catch snowflakes to earn two cozy hats and a scarf. |
| English (U.K.) | Snow Festival | Snowfall, cosy hats and a scarf to earn | Snow falls past your pet's window and the park turns white. Catch snowflakes to earn two cosy hats and a scarf. |
| Spanish (Mexico) | Festival de la Nieve | Nieve, gorros calientitos y una bufanda por ganar | Cae nieve tras la ventana de tu mascota y el parque se pinta de blanco. Atrapa copos y gana dos gorros y una bufanda. |
| Hindi | बर्फ़ उत्सव | बर्फ़बारी, गर्म टोपियाँ और जीतने को एक मफ़लर | आपके पेट की खिड़की के बाहर बर्फ़ गिर रही है और पार्क सफ़ेद हो गया है। बर्फ़ के फाहे पकड़ो, दो टोपियाँ और एक मफ़लर जीतो। |

The long descriptions changed on 25 Nov 2026, to match the festival as built in 1.4.1:
- snow falls past the pet's window, and the park turns white for walks;
- a snowflake to catch at the window each day, and more on snowy walks;
- 2 snowflakes earn the Cozy beanie, 4 the Winter hat and 7 the Red scarf;
- an outfit the player already owns gives 30 berries instead.

No price words (Guideline 2.3.7). 1.4.1 can only be submitted once 1.4 (Waiting for Review since 25 Nov
22:01 IST) is approved, and is expected live around 29 Nov to 2 Dec, before the 8 Dec publish.

## The live event (9io games service)

Listed by `GET https://9io.ai/games-api/v1/live/pockling` (stocks-bot `games/CONTRACT.md`, which has the
kind's payload keys).
- Kind `snow_festival`, id `snow-festival-2026`, with the same start and end.
- `min_version` `1.4.1`.
- Payload `{"room": "snow", "park": "snow", "goal": 7, "outfits": ["beanie", "santa", "scarf"], "steps": [2,
  4, 7], "window": 1, "walk": 2}`. The app has the same defaults built in.
- A draft on the server since 25 Nov 2026; debug builds see it.
- Publish it on the games dashboard's Live events card once 1.4.1 is live. It's then listed from 8 Dec,
  seven days before the start.

The app sends `live_open` (`from`: `card` or `link`), and puts `live: "snow-festival-2026"` on the walks'
`play` and `finish` while the festival is on.

## Making the images again

1. Run `tools/serve.py`.
2. Run `node tools/make-art.mjs event <out dir>`.

That renders `tools/art.html?mode=event-card` (1920 × 1080) and `?mode=event-details` (1080 × 1920)
with the game's own renderer:
- the kitten in the Winter hat, and the fox and the bunny in the Cozy beanie, all three in the Red
  scarf;
- snow, festival lights and drifts;
- no text.

The App Store sets the badge, name and short description over the card's lower third, and the
app's icon in its top right corner. So the pets stand above that line, and the lights run along
the top.
