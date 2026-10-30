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

## Images

`node tools/make-art.mjs` redraws the app icon and share image from the game's own art.
`node tools/record-clips.mjs` records the looping clips for 9io.ai/games, frame by frame.

## The iOS app

Open `ios/Pockling.xcodeproj`, or build from the command line. It bundles `web/` as it stands:

```bash
xcodebuild -project ios/Pockling.xcodeproj -scheme Pockling -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build build
```

Bundle id `app.pockling.Pockling`, team 9X9HQVQ78G. The simulator hears a made-up voice instead of the
microphone (see `TalkBack.swift`), so talk-back with real speech needs a real device. Store text and
review notes are in `docs/AppStore.md`.

## Deploying the website

```bash
tools/deploy.sh
```
