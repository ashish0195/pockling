# Accessibility Nutrition Labels: Pockling

What Pockling can truthfully claim on the App Store, checked on 17 Nov 2026 against 1.3.1 (the Duo version) on
iPhone and iPad. The labels are app-level, not per version. The orchestrator session publishes all four games'
labels together, on the user's OK. This file is the evidence.

## Claims

| Feature | Claim | Why |
|---|---|---|
| VoiceOver | No | The HUD's buttons have labels and the canvas reads "Your Pockling". But stroking, bathing, walking, fetch and hatching are touches on the game itself, and VoiceOver can't make them. |
| Voice Control | No | Buttons can be named ("Tap Feed"), but the pet can't be stroked or scrubbed by voice. |
| Larger Text | No | The game's text is in fixed sizes, and the web view doesn't follow Dynamic Type. |
| Dark Interface | No | No Dark Mode. The room only darkens at night, and the menus stay light. |
| **Differentiate Without Color Alone** | **Yes** | Nothing is told by colour alone (see below). |
| Sufficient Contrast | No | Much of the small text is below WCAG's 4.5:1 (see below). |
| Reduced Motion | No | Reduce Motion stops only the HUD's pulsing. The game still zooms to the glass, bounces and throws particles. |
| Captions | Not applicable | No video and no dialogue: talk-back plays back the player's own voice. |
| Audio Descriptions | Not applicable | No video. |

## Differentiate Without Color Alone: how it was checked

Every screen was viewed in greyscale (home, food tray, closet, settings, bath; screenshots from
`tools/a11y-contrast.mjs`), and each state was traced in `web/style.css`:
- **Needs:** each ring has its own icon, and its arc's length shows the level. A low need also throbs, and
  its arc is short when Reduce Motion stops the throb.
- **Foods:** one you can't afford is dimmed and shows its price. A favourite gets a 💖.
- **Closet and rooms:** what's worn or painted gets an outline ring. Locked items are dimmed and show a
  price.
- **Settings:** switches move their knob, and say on or off to assistive tech (`role="switch"`,
  `aria-checked`).
- **Tabs and bath tools:** the chosen one is a filled shape, which still reads in greyscale. The bath's hint
  also names the step ("Rub the soap all over Mochi").
- **Games:** good and bad snacks differ in shape. Hide and seek shows the pet itself.

## Sufficient Contrast: what fails

Measured with `node tools/a11y-contrast.mjs <dir>` (dev server running): every visible text on 18 screens,
WCAG 2 ratio against its background, worst gradient stop. Text over the game's art, seen through a
translucent panel, is approximate (~) and was checked on the screenshots.

| Text | Colours | Ratio | Needs |
|---|---|---|---|
| Secondary text: subtitles, captions, "About", the dock's labels, the tray's prices | `#8c7480` on cream/white | 3.9–4.2:1 | 4.5:1 |
| The closet's other tabs | `#8c7480` on the tab | 3.49:1 | 4.5:1 |
| White on pink: the level heart, the chosen tab, "Choose an egg", "Take a photo to share" | `#fff` on `#ff6f97` | 1.5–2.6:1 | 4.5:1 |
| Pink numbers: the streak, the card's stats | `#ff6f97` on cream | 2.5–2.6:1 | 3:1 (large) |
| The chosen bath tool | `#2c7fc9` on its tint | ~3.56:1 | 4.5:1 |
| Hints ("Rub the soap…") | `#fff` on a translucent dark pill | ~4.4:1 | 4.5:1 |

These pass: names and headings (`#4a3540`, about 10:1), the berries count (`#c2355f`, about 5:1), and the
night-time lines (light on the dark room, checked by eye).

## To claim more (next version)

- **Sufficient Contrast:** a darker secondary mauve (about `#6f5763`), and a deeper pink behind white text
  (or dark text on the pink). Pink numbers move to the berries' `#c2355f`, and the bath tool's blue and the
  hint pills get darker. Re-run the tool until nothing is LOW.
- **Reduced Motion:** follow `prefers-reduced-motion` in the game too: no zoom to the glass, fewer
  particles, calmer bounces.
- **Larger Text:** scale the HUD's zoom (`--ui`) with the system text size, which the app can pass from
  `UIContentSizeCategory`.
