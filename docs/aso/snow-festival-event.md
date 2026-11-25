# The Snow Festival: App Store in-app event and live event (December 2026)

The user chose "December live events" on 25 Nov 2026: a Snow Festival in Pockling, listed on the
App Store as an in-app event (search and the Today tab) and run in the game as a live event from
the 9io games service. It takes up `docs/ASO.md`'s "First Snow" idea.

## App Store Connect: in-app event 6839282325 (draft)

Entered on 25 Nov 2026 through App Store Connect's own API from the web session (iris), and read
back identical. **Not submitted.** It goes to review together with the Pockling update that carries
the festival and its deep link, and only on the user's OK.

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
| Deep link | `pockling://snowfestival` (proposed; the update must open the festival from it) |
| Event card | `docs/aso/store/events/snow-festival-card-1920x1080.jpg` |
| Event details page | `docs/aso/store/events/snow-festival-details-1080x1920.jpg` |

Each language has the same two images. Neither has any words in it.

| Language | Name | Short description | Long description |
|---|---|---|---|
| English (U.S.) | Snow Festival | Snowfall, cozy hats and a scarf to earn | Snow is falling past your pet's window. Drop by during the festival to play in the snow and earn cozy winter clothes. |
| English (U.K.) | Snow Festival | Snowfall, cosy hats and a scarf to earn | Snow is falling past your pet's window. Drop by during the festival to play in the snow and earn cosy winter clothes. |
| Spanish (Mexico) | Festival de la Nieve | Nieve, gorros calientitos y una bufanda por ganar | Cae nieve afuera de la ventana de tu mascota. Ven durante el festival a jugar en la nieve y gana ropa de invierno. |
| Hindi | बर्फ़ उत्सव | बर्फ़बारी, गर्म टोपियाँ और जीतने को एक मफ़लर | आपके पेट की खिड़की के बाहर बर्फ़ गिर रही है। उत्सव के दौरान आओ, बर्फ़ में खेलो और सर्दियों के कपड़े जीतो। |

The text promises snow at the window, playing in the snow, and winter clothes to earn. The festival
in the update has to do all three, or the text changes before the event is submitted. It has no price
words (Guideline 2.3.7).

## The live event (9io games service)

Listed by `GET https://9io.ai/games-api/v1/live/pockling` (stocks-bot `games/CONTRACT.md`):
- kind `snow_festival`, id `snow-festival-2026`;
- the same start and end;
- the payload the festival screen reads.

It's made and published on the games dashboard's Live events card. Debug builds see a draft.

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
