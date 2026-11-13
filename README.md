# Pockling

A tiny fluffy pet for your pocket. Hatch an egg and raise what comes out: stroke it, boop it, feed it,
bathe it, walk it on a lead, play fetch, tuck it in. Say something and it says it back in a squeaky voice.

- Web: https://bitfold.9io.ai/pockling/
- iOS: `ios/Pockling.xcodeproj`, the same game inside a thin native shell

Plain ES modules with no build step and no dependencies. Everything on screen is painted by code at
start-up: there are no image or sound files apart from the icons.

## Running it

```bash
npm run serve
```

Then open http://localhost:8651/web/. Add `?demo=home&breed=kitling&hour=20` to jump straight to a state:
see `applyDemo` in `web/src/app.js`. Demo mode never touches a real save.

## Testing

```bash
npm test
```

Runs the rules in `web/src/state.js`. With the dev server running, this plays through the whole game in
headless Chrome (every scene, every screen size) and fails on any page error:

```bash
node tools/smoke.mjs
```

`SHOTS=/some/folder` keeps its screenshots. Software GL is slow, so the flows step the game by hand.

## How it's put together

- `web/src/gl.js`: a WebGL 2 sprite batcher, with bending strips, deforming meshes, and eyes and mouths
  drawn in the shader so they can morph between expressions.
- `web/src/pet.js`: the character rig. Everything moves through springs, the body is a soft mesh, and the
  face slides round the head.
- `web/src/actor.js`: acted scenes, written as generators.
- `web/src/state.js`: the pure rules: needs on the real clock, growth, levels, berries, stamps.
- `web/src/bake/`: paints fur, food, rooms, the park and effects into textures at start-up.
- `web/src/scenes/`: home, hatch, bath, walk, fetch, snack, hide.
- `web/src/platform.js`: everything that differs between browser and app. Its native half is
  `ios/Pockling/GameHost.swift`.
- `web/src/talk.js` and `ios/Pockling/TalkBack.swift`: the same talk-back, for each platform.
- `ios/Pockling/NineIO.swift`: 9io's anonymous usage data and notifications, in the iOS app only. It's a
  copy of `stocks-bot/games/client/NineIO.swift`: change it there and copy it back. Pockling's own
  reminders are `ios/Pockling/Reminders.swift`.
- `web/src/widget.js` and `ios/PocklingWidget/`: the Home Screen, Lock Screen and StandBy widget. See below.

## Images

`node tools/make-art.mjs` redraws the app icon and share image from the game's own art.
`node tools/record-clips.mjs` records the looping clips for 9io.ai/games, frame by frame.
`node tools/widget-art.mjs` paints the widget's pictures of the pet (see below).

## The iOS app

Open `ios/Pockling.xcodeproj`, or build from the command line. It bundles `web/` as it stands:

```bash
xcodebuild -project ios/Pockling.xcodeproj -scheme Pockling -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build build
```

Bundle id `app.pockling.Pockling`, team 9X9HQVQ78G. The simulator hears a made-up voice instead of the
microphone (see `TalkBack.swift`), so talk-back with real speech needs a real device. Store text and
review notes are in `docs/AppStore.md`.

### The widget

`ios/PocklingWidget` is a WidgetKit extension (`app.pockling.Pockling.Widget`): the pet on the Home Screen
(small and medium), the Lock Screen (circular, rectangular and the line above the clock) and in StandBy,
with its name, how it feels, whether it's asleep and its lowest need. Tapping it opens the game.

- With each save the game makes a snapshot for it (`web/src/widget.js`). A widget can't run the game, so
  the snapshot runs the game's own clock forward and lists each moment the pet will change until the game
  is next opened: when it gets hungry, wakes up and so on. The widget shows each one when its time comes,
  so it's what the game would show if you opened it then.
- The app keeps the snapshot in the App Group `group.app.pockling.Pockling`, on the phone
  (`ios/Pockling/WidgetShare.swift`), and asks the widget to redraw when what it shows changes and when the
  app leaves the screen. Nothing in it leaves the phone.
- The game draws the pet in WebGL, which a widget can't, so `node tools/widget-art.mjs` paints it ahead of
  time into `ios/PetArt`: for each breed, coat and stage a whole picture, and the face alone for each other
  look, which the widget lays on top where `faces.json` says. Run it again after adding a breed, coat or
  mood; `npm test` checks nothing is missing. Outfits aren't shown.
- The simulator can't enter StandBy. The "StandBy" preview in `PetViews.swift` shows the widget as StandBy
  does, without its background.

Both targets have the App Group in their entitlements. Archives are built unsigned (see "Uploading a
build" in `docs/AppStore.md`), so the widget needs signing with its entitlements before the app is:

```bash
codesign --force --sign - --entitlements ios/PocklingWidget/PocklingWidget.entitlements --generate-entitlement-der ios/build/Pockling.xcarchive/Products/Applications/Pockling.app/PlugIns/PocklingWidget.appex
```

Then sign the app as `docs/AppStore.md` says. The App Group has to exist on the developer portal, and both
App IDs need it.

## Deploying the website

```bash
tools/deploy.sh
```
