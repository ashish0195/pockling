# Pockling's custom product pages, as entered in App Store Connect

Entered on 17 Nov 2026, finished by 03:55 IST, after 1.3 (5) went live on 16 Nov at 11:50 IST, from
`docs/ASO.md` ("In-app events, custom product pages, tests"). Each page was copied from the live 1.3
product page, so it has 1.3's four languages.

**Submitted for review** on 17 Nov 2026 at 03:59 IST, in review submission
`e5291bba-8bf2-4b91-a5c4-5f43ccc12058`. The orchestrator session clicked Submit after checking the
pages: all 60 uploaded screenshots match the files here by MD5, in the order below. Each page version
is Waiting for Review.

**How it was checked.** After saving, everything was read back from App Store Connect: the
promotional texts by SHA-256, the keywords, and the order of every screenshot set.

**What's left out:**
- **Icon test:** traffic doesn't allow one yet (`docs/ASO.md`).
- **Price words:** none in the promotional texts or screenshots. On 16 Nov Apple rejected Bitfold 1.3
  and Football Kick 1.2 under guideline 2.3.7 for "free".
- **Deep links:** none.

## Pages

| Page | Page ID | Version ID | Leads with |
|---|---|---|---|
| Kitten | `9b4a82bb-9878-4a41-9c98-1ec5c9375e78` | `d933026e-e0a3-42c4-9cdf-fd1f327afd97` | The kitten at the glass, "Your cute virtual kitten", then its walk and the widget |
| Bunny | `84b78ac8-5f8f-41b1-8460-faab0b00d156` | `1037aa02-3809-4d29-96f0-d1fbf16289d6` | The bunny at the glass, "Your cute virtual bunny", then the bunny's snack and dress-up shots |
| Dragon | `3d76ee1a-94b6-4a23-94ea-f4d39a15dfb0` | `c0e27530-ed50-4196-b2ec-614e549b2276` | The dragon at the glass, "Your cute virtual dragon", then the dragon talking and the fox's bath |

Each page's link is `https://apps.apple.com/us/app/pockling-cute-virtual-pet/id6829163472?ppid=<page ID>`.

## Keywords

Only words in the approved 1.3 keyword fields can be assigned (`docs/aso/listing-1.3.md`), and no
word is on two pages.

| Language | Kitten | Bunny | Dragon |
|---|---|---|---|
| English (U.S.) | cat | bunny | dragon, fox |
| English (U.K.) | cat | bunny, rabbit | dragon, fox |
| Spanish (Mexico) | gato, gatito | conejo | none: no dragon or fox word in the field |
| Hindi | बिल्ली, kitten | खरगोश, bunny | none: no dragon or fox word in the field |

- **"kitten" in English:** it's in the English subtitle ("Cozy Kitten & Puppy Games"), not the
  English keyword fields, so the English Kitten page has "cat" only.
- **"rabbit":** it's only in the U.K. field.

## Promotional text

English (U.S.) and English (U.K.) share each page's text. A native speaker should still read the
Spanish and Hindi.

### Kitten

- **English (161):** A tiny kitten is waiting in an egg. Hatch it, stroke it till it purrs, feed it and tuck it in. It never dies, and now it lives on your Home Screen. No ads, ever.
- **Spanish (Mexico) (162):** Un gatito te espera en un huevo. Haz que nazca y acarícialo hasta que ronronee, aliméntalo, báñalo y arrópalo. Nunca muere. Y ahora vive en tu pantalla de inicio.
- **Hindi (149):** अंडे में एक नन्हा बिल्ली का बच्चा इंतज़ार कर रहा है। उसे निकालो, फिर सहलाओ, खिलाओ, नहलाओ और सुलाओ। वह कभी नहीं मरता, और अब होम स्क्रीन पर भी रहता है।

### Bunny

- **English (161):** A fluffy bunny is waiting in an egg. Hatch it, feed it, dress it up in a crown and tuck it in. It never dies, and now it lives on your Home Screen. No ads, ever.
- **Spanish (Mexico) (155):** Un conejito te espera en un huevo. Haz que nazca y acarícialo, aliméntalo, ponle una corona y arrópalo. Nunca muere. Y ahora vive en tu pantalla de inicio.
- **Hindi (138):** अंडे में एक नन्हा खरगोश इंतज़ार कर रहा है। उसे निकालो, फिर सहलाओ, खिलाओ, सजाओ और सुलाओ। वह कभी नहीं मरता, और अब होम स्क्रीन पर भी रहता है।

### Dragon

- **English (167):** A baby dragon or a little fox is waiting in an egg. Hatch yours, feed it, bathe it and say hello: it says it back. It never dies, and now it lives on your Home Screen.
- **Spanish (Mexico) (157):** Un dragoncito te espera en un huevo. Haz que nazca, aliméntalo, báñalo y salúdalo: te devuelve el saludo. Nunca muere. Y ahora vive en tu pantalla de inicio.
- **Hindi (152):** अंडे में एक नन्हा ड्रैगन इंतज़ार कर रहा है। उसे निकालो, खिलाओ, नहलाओ और हैलो बोलो: वह भी हैलो बोलेगा। वह कभी नहीं मरता, और अब होम स्क्रीन पर भी रहता है।

## Media

The media is on English (U.S.) only, as on the live page; the other three languages show it.

- **iPhone 6.3"** (the medium Dynamic Island display): ten shots from
  `docs/aso/store/pages/<page>/iphone-6.3/`.
- **iPad 13":** ten shots from `docs/aso/store/pages/<page>/ipad-13/`.
- **Preview:** Kitten keeps the live page's preview (`docs/aso/store/preview/pockling-preview.mp4`),
  which opens on the kitten at the glass. Bunny and Dragon have none, so their own pet is the first
  thing in search results.

| Set | Kitten | Bunny | Dragon |
|---|---|---|---|
| iPhone | glass, walk, widget, love, feed, kinds, bath, talk, sleep, dress | glass-bunny, feed, dress, kinds, widget, love, bath, walk, talk, sleep | glass-dragon, talk, bath, kinds, widget, love, feed, walk, sleep, dress |
| iPad | glass, walk, hide, love, feed, kinds, bath, talk, sleep, dress | glass-bunny, feed, dress, kinds, love, bath, walk, talk, hide, sleep | glass-dragon, talk, bath, kinds, love, feed, walk, hide, sleep, dress |

- **Heroes:** new captures of the nose on the glass with each page's pet.
- **The other shots:** the live page's scenes and headlines, re-captured from main (84c3f53).
  `web/` is unchanged since 1.3's build (700fea0).

## Making them again

1. **Start the dev server:** `tools/serve.py`.
2. **Capture each device:** run `node tools/store-shots.mjs <shots> phone`, then the same with
   `ipad`. You can also name the moments to capture; `glass-bunny` and `glass-dragon` are the new
   heroes.
3. **Add the widget shot:** copy `docs/aso/store/captures/widget-home-iphone.png` to
   `<shots>/phone/widget.png`.
4. **Frame each page:** run `PAGE=kitten node tools/store-frame.mjs <shots> <out>/kitten all`, then
   the same for bunny and dragon. The page orders are in `PAGES` in that file.
5. **Convert to JPEG:** `sips -s format jpeg -s formatOptions 90`.
