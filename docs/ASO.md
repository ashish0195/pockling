# Pockling: App Store optimisation

Review and plan of 14 November 2026, for the version after 1.2 (1.2 is Waiting for Review with
1.1's listing). Nothing in this file is live.

Data: App Store web search for iPhone (`apps.apple.com/<cc>/iphone/search`, signed out), the top 12
results for 42 searches in the US, UK and India, and Apple's search suggestions, 13–14 November
2026. Units 13 Oct–12 Nov: 21 (live since 5 Nov).

## Where it stands

- Live: 1.1, "Pockling: Cute Virtual Pet" / "Hatch, love, feed and walk it", English (U.S.)
  only, ten iPhone screenshots, one app preview, no ratings.
- **It isn't in the top 12 for any of its 42 target searches**, including "virtual pet" and "cute
  pet", both in its name. New apps rank on installs and ratings as much as words; with 21
  downloads and no ratings the name alone isn't enough, so the plan is the words people actually
  type, plus conversion and ratings.
- **A bare "pockling" search in the US and UK App Store autocorrects to "pickle"** and doesn't
  show Pockling (India shows it first). Typing it suggests "pockling: cute virtual pet" first, and
  "pockling pet" finds it (5th in the US). Marketing should link to the App Store page rather than
  say "search for Pockling"; the problem fades as more people tap Pockling for that search.
- The subtitle's words (hatch, love, feed, walk) are not searches anyone makes. Every "pet" search
  people do make ends in **games**: "pet games", "cute games", "kitten games", "puppy games", "bunny
  games", "pet games for kids", "cute pet games" (the top suggestions in all three countries).

## Competitors

| App | Subtitle | Ratings (US) | What its page does |
|---|---|---|---|
| Pokipet | Raise a pet with your friends | 13K | First for "virtual pet"; huge pets breaking out of the frame, three-word captions ("The AI Pet", "That stays forever") |
| My Tamagotchi Forever (Bandai Namco) | Your classic virtual pet! | 28K | Bright scenes, caption chips ("Bon appetit!", "It's bath time!"), video |
| My Boo | Virtual Pet Take Care | 19K | Cartoon minigames, video |
| Pixel Pals | Cute dynamic standby animals | 37K | Widgets and StandBy: the pet lives on the Home Screen |
| Widgetable | Besties & Couples | 389K | A shared widget pet |
| Mochi Pets | Cute Pet Widget | 228 | Third for "cute pet" with 228 ratings |
| Smolsies (TutoTOONS) | Virtual baby animal care games | 3.6K | The look nearest ours: fluffy big-eyed pets hatching from eggs, "Hatch from the egg!" |
| Bubbu | Cute Kitten Simulator & Games | 2.6K | Landscape, the kitten fills the frame |
| My Talking Tom 2 (Outfit7) | Fun with the talking pet cat! | 859K | Owns "talking cat" / "talking pet" |

What that says:

1. Pockling looks as good as anything in the category, and better than most: the art isn't the
   problem, the words and the ratings are.
2. The pet searches split three ways: **virtual pet / digital pet / pocket pet** (Pokipet,
   Tamagotchi, widget pets), **"X games"** (pet, cute, kitten, puppy, bunny: Fluvsies, Dog Town,
   My Talking Tom Friends), and **care** (pet care games, pet simulator). The name covers the
   first; the subtitle should cover the second.
3. Weak results we fit: **cozy pet** (Cozy Pets 1.8K, then apps with 0–1 ratings), **virtual pet
   games** in India, **bunny games** in India, **hatch egg** (apps with 2–83 ratings).
4. Widget pets win a big share of "virtual pet" and "cute pet" (Pixel Pals, Widgetable, Mochi Pets,
   "Cute pet: Self care pet widget"). Pockling has no widget; that's a product idea, in the
   competitor learnings note.
5. Several competitors show the pet much bigger than ours: Pokipet's pets spill out of the phone.
   Ours sit inside a phone frame at about a third of the shot's height.

## Keyword plan

US = English (U.S.) plus Spanish (Mexico), whose keywords also count in the US; UK = English
(U.K.) only; India = English (U.K.) as default plus Hindi and ten more.

### Name and subtitle

| Locale | Name (30) | Subtitle (30) |
|---|---|---|
| en-US, en-GB | Pockling: Cute Virtual Pet | Cozy Kitten & Puppy Games |
| es-MX | Pockling: Mascota Virtual | Gatitos y perritos adorables |
| Hindi | Pockling: प्यारा वर्चुअल पेट | बिल्ली और पपी वाला प्यारा गेम |

The name stays. The subtitle makes "pet games", "cute games", "kitten games", "puppy games", "cute
pet games", "virtual pet games" and "cozy pet" name-and-subtitle matches.

### Keywords (100 each)

- **en-US:** `care,cat,dog,bunny,fox,dragon,bear,kawaii,fluffy,hatch,egg,talking,dress,up,raise,animal,baby,bath`
- **en-GB:** `care,cosy,cat,dog,bunny,rabbit,fox,dragon,bear,kawaii,fluffy,hatch,egg,talking,dress,up,raise,bath`
- **es-MX:** `mascota,gato,gatito,perro,perrito,conejo,cuidar,juegos,tierno,kawaii,bebe,huevo,baño,vestir,pet`
- **Hindi:** `पालतू,बिल्ली,पपी,खरगोश,गेम,प्यारा,पेट,cute,pet,kitten,puppy,bunny,games,care`

No other company's product names (Tamagotchi, Pou, Talking Tom): Apple rejects them. "talking" is
for Pockling's talk-back; "dress" and "up" for the outfits.

### Promotional text (170)

> A tiny friend is waiting in an egg. Hatch your own cute virtual pet, then stroke it, feed it,
> bathe it and tuck it in. It never dies and never nags. No ads, ever.

### Description

1.1's description stays, with its first line changed to name what Pockling is, and the one line
1.2 must change (it now collects anonymous usage data):

> **First line:** Pockling is a cute virtual pet for your iPhone: there's a tiny friend waiting
> behind your screen.

> **KIND BY DESIGN, second line:** "Nothing you say or do leaves your device." becomes "Nothing you
> say leaves your device, and the app's anonymous usage data can be switched off."

### What's New (next version)

To write when the version's changes are known.

## Screenshots

Ten portrait shots from `node tools/store-frame.mjs` (headlines in that file). The art stays; the
changes are the first caption, a six-kinds lineup instead of the weak last shot, the pet larger in
each frame, and a trust line.

| # | Caption (two lines) | Scene |
|---|---|---|
| 1 | Your cute / virtual pet | Nose on the glass (as now) |
| 2 | Stroke it. / Feel it purr. | As now |
| 3 | Feed it. / It has opinions. | As now |
| 4 | Kitten, puppy, bunny, / fox, bear or dragon | The six kinds side by side (new) |
| 5 | Bubble bath, / rubber duck | As now |
| 6 | Walkies, / new friends | As now |
| 7 | Say hello. / It says it back. | As now |
| 8 | Hide and seek. / No peeking! | As now |
| 9 | It never dies. / It just misses you. | Tucked in under the stars |
| 10 | Crowns, glasses, / tiny scarves | Outfits (as now) |

"Tap the egg. Say hi." (an almost empty phone) goes. Captions are the only text Apple may read from
screenshots, so the first one says "virtual pet".

## App preview

The 29-second preview stays, re-cut so its first three seconds are the nose on the glass with
"Your cute virtual pet" (search autoplays them muted), not a slow start.

## Icon

The kitten face is the right icon: big eyes, readable small, unlike anything in the results except
Bubbu's kitten. A test of the bunny or the fox against it is worth running only with more traffic.

## In-app events, custom product pages, tests

- **In-app event idea:** "First Snow" (Special Event, December): snow through the window and a
  winter hat and scarf to earn. It needs that content in an update first; Apple turns down events
  that are the everyday care.
- **Custom product pages** (after the new keywords are approved): "Kitten" (cat; leads with the
  Kitling shots), "Bunny" (bunny, rabbit), "Dragon" (dragon, fox), each with its pet first.
- **Product page optimisation:** not at ~21 downloads a month.
- **Ratings:** the app never asks. Ask with Apple's prompt when the pet grows up or on a
  stamp-book day from the second day on, once per version (the improvements session is building it).

## Prioritised changes

1. Next version: subtitle, keywords, promotional text and the first line; add en-GB.
2. Next version: the new first caption, the six-kinds shot, the pet larger; the re-cut preview.
3. Next version: es-MX and Hindi.
4. Next build: the rating prompt.
5. Later: a widget (competitor learnings), then "First Snow".

1.2 is Waiting for Review. Either it goes out as is and these changes ride on 1.3, or 1.2 is
removed from review, given the new listing and resubmitted (updates are reviewed in about a day,
but it goes to the back of the queue). The user decides.

## How to tell if it worked

Re-run the rank snapshot (`aso/` in the shared notes folder) a week after the version is live: the
targets are top 10 for "cozy pet", "virtual pet games", "cute pet games" and "bunny games" in
India, then "pet games". App Store Connect › Analytics › Acquisition gives search conversion.
