# Accessibility Nutrition Labels: Pockling

What Pockling can truthfully claim on the App Store, checked on 17 Nov 2026 against 1.3.1 (the Duo version) on
iPhone and iPad, and the same day for Sufficient Contrast and Reduced Motion against the 1.3.2 web build. The
labels are app-level, not per version. The orchestrator session publishes all four games' labels together, on
the user's OK. This file is the evidence.

## Claims

| Feature | Claim | Why |
|---|---|---|
| VoiceOver | No | The HUD's buttons have labels and the canvas reads "Your Pockling". But stroking, bathing, walking, fetch and hatching are touches on the game itself, and VoiceOver can't make them. |
| Voice Control | No | Buttons can be named ("Tap Feed"), but the pet can't be stroked or scrubbed by voice. |
| Larger Text | No | The game's text is in fixed sizes, and the web view doesn't follow Dynamic Type. |
| Dark Interface | No | No Dark Mode. The room only darkens at night, and the menus stay light. |
| **Differentiate Without Color Alone** | **Yes** | Nothing is told by colour alone (see below). |
| **Sufficient Contrast** | **Yes, once 1.3.2 is live** | In 1.3.2 every text is 4.5:1 or more (3:1 when large), and the need rings, the chosen tab and tile, and a switch that's on are 3:1 or more, in the game and in the widget (see below). 1.3.1 and earlier fail, so don't claim it before 1.3.2 is on the App Store. |
| **Reduced Motion** | **Yes, once 1.3.2 is live** | 1.3.2 follows Reduce Motion in the game too: no zoom to the glass or on a cuddle, no parallax (the room's tilt, and the park's layers on walks and in Fetch all move as one), a third of the particles and none spinning, calmer hops (see below). 1.3.1 and earlier only stop the HUD's pulsing. |
| Captions | Not applicable | No video and no dialogue: talk-back plays back the player's own voice. |
| Audio Descriptions | Not applicable | No video. |

## Differentiate Without Color Alone: how it was checked

Every screen was viewed in greyscale (home, food tray, closet, settings, bath; screenshots from
`tools/a11y-contrast.mjs`), and each state was traced in `web/style.css`:
- **Needs:** each ring has its own icon, and its arc's length shows the level. A low need also throbs, and
  its arc is short when Reduce Motion stops the throb.
- **Foods:** one you can't afford has its picture dimmed and shows its price. A favourite gets a 💖.
- **Closet and rooms:** what's worn or painted gets an outline ring. Locked items have their picture dimmed
  and show a price.
- **Settings:** switches move their knob, and say on or off to assistive tech (`role="switch"`,
  `aria-checked`).
- **Tabs and bath tools:** the chosen one is a filled shape, which still reads in greyscale. The bath's hint
  also names the step ("Rub the soap all over Mochi").
- **Games:** good and bad snacks differ in shape. Hide and seek shows the pet itself.

## Sufficient Contrast: fixed in 1.3.2

Measured on 17 Nov 2026 with `node tools/a11y-contrast.mjs <dir>` (dev server running): every visible text on
18 screens, WCAG 2 ratio against its background, worst gradient stop. Before is 1.3.1, after is the 1.3.2 web
build. After: **0 texts below WCAG AA on all 18 screens.** Text over the game's art, seen through a translucent
panel, is approximate (~): the tool measures it against the page colour.

| Text | Before (1.3.1) | After (1.3.2) | Needs |
|---|---|---|---|
| Secondary text: subtitles, captions, "About", the tray's prices, the card's labels | `#8c7480` on cream/white, 3.93–4.2:1 | `#765667`, 5.87–6.27:1 | 4.5:1 |
| Secondary text over the art: the dock's labels, "Pick an egg…", "What sounds good?", the bath's tools | `#8c7480`, ~3.63–4.17:1 | `#765667`, ~5.42–6.23:1 | 4.5:1 |
| The closet's other tabs | `#8c7480` on `#f4e6da`, 3.49:1 | `#765667`, 5.21:1 | 4.5:1 |
| The level heart | `#fff` on `#ffa6be`→`#ff6f97`, 1.83:1 | `#fff` on `#d13b68`→`#c2355f`, 4.63:1 | 4.5:1 |
| The chosen tab | `#fff` on `#ff6f97`, 2.63:1 | `#fff` on `#d13b68`, 4.63:1 | 4.5:1 |
| The pink buttons: "Take a photo to share", "Hatch this egg", "Yay!" | `#fff` on `#ff93b2`→`#ff6f97`, 2.09:1 | `#fff` on `#d13b68`→`#c2355f`, 4.61–4.63:1 | 4.5:1 |
| "Choose an egg" (the button before an egg is picked) | `#fff` at half opacity, 1.45:1 | `#8a3d5c` on pale pink `#f9dfe7`, 5.77:1 | 4.5:1 |
| Pink numbers: the streak | `#ff6f97` on cream, 2.5:1 | `#c2355f`, 5.02:1 | 3:1 (large) |
| Pink numbers: the card's stats (and a game's or walk's results) | `#ff6f97`, 2.59:1 | `#c2355f`, 5.19:1 | 3:1 (large) |
| The chosen bath tool | `#2c7fc9` on its tint, ~3.56:1 | `#1d64a6`, ~5.19:1 | 4.5:1 |
| Hints ("Rub the soap…") | `#fff` on `rgba(70,40,62,.62)`, ~4.4:1 | `#fff` on `rgba(70,40,62,.72)`, ~5.79:1 (5.37:1 even over pure white) | 4.5:1 |
| The berries count and the games' scores, on their chips | `#c2355f` on a 93% opaque chip: 4.58:1 on the real pixels at bedtime, 4.46:1 over black | the chips 96% opaque: 4.78:1 or more on the real pixels, 4.77:1 even over black | 4.5:1 |

**Text over the art, on the real pixels.** Each such text was hidden, the screen shot, and the text's colour
measured against every pixel of its own line boxes (a one-off check in headless Chrome, not in the repo), in
all six rooms by day, at night and at bedtime, and in the games by day and night. The worst pixel anywhere is
4.78:1, the berries count in the Starry room at night. The dock's labels are 5.70:1 or more (night), "Pick an
egg…" 5.07:1, the hints 5.40–6.01:1, the chosen bath tool 5.07:1, and the bedtime line ("Shhh… Mochi is fast
asleep", light on the night room) 11.4:1 even without its shadow.

**States the tool doesn't visit**, measured with the tool's own code: an egg chosen, naming the pet, a hungry
pet with 5 berries (the dock's highlighted Feed, now `#ad2c55` on its pink tint, 5.5:1; foods and outfits you
can't afford, whose pictures fade but whose names and prices stay readable, 4.88:1 and up), the level-up card,
the notification card (its button's second line 4.63:1, "Not now" 6.27:1), a toast (9:1), a game's end, a
walk's summary and the restart sheet. Nothing is below AA.

**Controls and states without text** (Apple asks 3:1 for these):

| What | Before (1.3.1) | After (1.3.2) |
|---|---|---|
| The need rings' arcs against their track and the disc inside | 1.4–3.0:1 by day on a see-through white track (about 1.1–1.5:1 at night) | `#e45a26`, `#2585d4`, `#bb7708`, `#2c9474`, `#e0457a` (low: `#df3b43`) on a solid `#f6ece8` track: 3.12–3.73:1, and 3.57–4.27:1 against the disc |
| The chosen tile's ring, today's stamp, the keyboard focus ring | `#ff6f97`, 2.5:1 on cream | `#d13b68`, 4.39:1 |
| The chosen tab against the other tabs | 2.15:1 | 3.79:1 |
| The love-level bar against its track | 2.13:1 | 3.74:1 |
| A switch that's on, against its row | `#4fcfa8`, 1.91:1 | `#2c9474`, 3.69:1 (3.75:1 against its knob) |
| The talk button while it listens | `#ffa6be`→`#ff6f97`, 1.8–2.6:1 | `#e0457a`→`#d13b68`, 3.9–4.6:1 |
| The name field's outline | `#ffa6be`, 1.8:1 | `#e0457a`, 3.9:1 |

A switch that's off is a white knob on `#e8d9cc`, as iOS's own switches are: it reads by its shadow and its
position, and says on or off to VoiceOver.

**Also moved to the new colours:** the support and privacy pages (`web/doc.css`: secondary text `#7d6470` was
4.26:1 on the lavender end of the page; now `#765667`, 5.08:1 or more; links `#c2355f` were 4.22:1, now
`#ad2c55`, 5.13:1 or more), and the photo card's caption and pill (`web/src/card.js`).

**The widget** (`ios/PocklingWidget/PetViews.swift`), worked out the same way for every room's wall:
- its secondary text was `#8a6775`, 3.24–4.07:1 on the walls (3.24 on the lilac one); now `#6a5260`,
  4.63:1 or more. Its main text (`#4a3540`) is 7.4:1 or more, and the light text on the night sky 6.7:1 or more;
- its need rings: by day the game's new colours on its solid `#f6ece8` track, 3.12–3.41:1 against the track and
  3.32–3.79:1 against the disc (they were 1.3–1.9:1 on a see-through track); at night (asleep, the Starry room,
  StandBy) the bright colours on a darker disc, 3.64:1 or more against both.

## Reduced Motion: what 1.3.2 does

The game now follows Reduce Motion (`prefers-reduced-motion`, read live with `matchMedia`, so turning it on or
off mid-game applies at once; `motion.reduced` in `web/src/particles.js`). With it off, nothing changes. With it
on:
- **No zoom to the glass:** the pet waves instead of pressing its nose to the glass or licking it
  (`web/src/scenes/home.js`).
- **No zoom on a cuddle** (it was 1.42×), and **no tilt parallax** in the room.
- **Particles:** bursts throw a third as many (a game's confetti 50 → 17), nothing spins or flips, and the
  expanding ring at hatching and growing up is left out. The walk's mud splash is a third too.
- **Calmer bounces:** hops are half as high, a dropped pet bounces back less, and it doesn't chase its tail.
- **The HUD:** sheets, the food tray and cards fade in instead of sliding or popping up, toasts fade without
  moving, and the berries count doesn't pop. The low need's throb, the dock's nudge and the loader's wobble
  stop, as before.
- **No parallax on walks and in Fetch:** the park's layers scroll at different speeds (`drawPark` in
  `web/src/bake/park.js`: far 0.14×, mid 0.3×, near 0.58×, and the close grass at 1.5× in
  `web/src/scenes/walk.js`). With Reduce Motion every layer moves with the path, as one picture
  (`test/park.test.mjs` checks both).

Checked in headless Chrome with the setting emulated, turned on and off mid-game: with it on, the pet stays
at 1× where it went up to 1.7× at the glass, a cuddle stays at 1× (1.42× with it off), confetti is 20 of 60
and none spins, and the tail chase never comes up in 400 picks (about 40 with it off); on a walk, scrolling
100 px moves the far, middle and near layers and the close grass 14, 30, 58 and 150 px with it off, and every
layer 100 px with it on; with it off, all as before.

What stays either way: the games' own motion (the thrown ball, falling snacks, the walk itself), which is the
play, and the soft glow when an egg hatches or the pet grows up. So Reduced Motion is claimable once 1.3.2 is
live.

## To claim more (next version)

- **Larger Text:** scale the HUD's zoom (`--ui`) with the system text size, which the app can pass from
  `UIContentSizeCategory`.
