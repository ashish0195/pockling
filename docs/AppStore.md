# App Store listing

Copy and settings for Pockling on the App Store.

**Status:** Pockling 1.0 (build 2) went live on the App Store on 5 November 2026: https://apps.apple.com/app/id6829163472. It isn't on sale in the EU until the account's DSA trader verification clears. On the way, Apple sent it back on 1 November under Guideline 2.1, Information Needed, asking for a screen recording from a physical device and written answers, without naming a defect. It went back the same day with a recording from the iOS Simulator, labelled as one, and the answers under Review notes below.

**1.1:** build 3, with sounds for playing with the pet and for its idle animations, was uploaded on 6 November 2026 and reaches the Internal TestFlight group automatically. It isn't submitted for review, and the App Store version for it hasn't been created yet.

**App Store Connect:** Apple ID 6829163472
**Name:** Pockling: Cute Virtual Pet
**Subtitle:** Hatch, love, feed and walk it
**Bundle id:** app.pockling.Pockling
**SKU:** pockling
**Team:** 9X9HQVQ78G
**Primary language:** English (U.S.)
**Category:** Games, with the subcategories Simulation and Family. No secondary category.
**Price:** Free, no in-app purchases, in all 175 countries and regions, and on Apple silicon Macs and Apple Vision Pro (App Store Connect's defaults, neither tested).
**Age rating:** 4+. Every answer is None or No: no web access, user content, chat, ads, contests or gambling, and no violence.
**Content rights:** no third-party content. All the art and sound is made by the app's own code.
**Export compliance:** `ITSAppUsesNonExemptEncryption` is false. The app uses no encryption.
**Support URL:** https://bitfold.9io.ai/pockling/support/
**Marketing URL:** https://bitfold.9io.ai/pockling/
**Privacy policy URL:** https://bitfold.9io.ai/pockling/privacy/
**Copyright:** 2026 9io
**App Privacy:** Data Not Collected, no tracking.
**Release:** automatically once App Review approves it.

**Keywords:** kawaii,raise,care,fluffy,kitten,puppy,bunny,fox,dragon,bear,dress up,animal,adopt,talking,bath,egg

Words already in the name and subtitle count without being repeated here. No other company's product names: Apple rejects them, and they don't belong in our listing anyway.

**Promotional text:**
A tiny friend is waiting in an egg. Tap to hatch it, then stroke it, feed it, bathe it and tuck it in. No ads, ever.

**Description:**

There's a tiny friend waiting behind your screen.

Pick an egg, tap until it cracks, and meet your Pockling: a very small, very fluffy creature with enormous eyes who has decided that you are the best thing that has ever happened.

ALL THE LOVE
Stroke it and it purrs, and you feel the purr in your hand. Boop its nose. Tickle its tummy until it rolls over laughing. Hold it for a cuddle. Pull it and it stretches. It presses its nose on your screen and fogs up the glass. Sometimes it licks it.

FEED IT
Drag a snack up to its mouth and watch it nibble. Every pet has favorites, and one food it can't stand. You'll find out which.

BATH TIME
Soap it into a ball of bubbles, rinse it, then rub it dry until it poofs up twice its size. Squeak the duck. Stay for the rainbow.

WALKIES
Hold your finger and it trots along on a little lead through the park. Berries to find, flowers to sniff, butterflies to chase, muddy puddles it will absolutely jump in, and other Pocklings to say hello to. At night there are fireflies.

PLAY
Flick the ball and it tears off to fetch it. Catch falling snacks in Snack Drop. Play Hide and Seek, where it is very bad at hiding.

IT TALKS BACK
Say something and your pet says it right back in a squeaky little voice, lips moving in time.

GROWS WITH YOU
It lives on the real clock. The sky through its window follows your day, and when it's sleepy you tuck it into bed under a star projector. Look after it and it grows from a baby to a kid to all grown up. Come back each day to fill your stamp book, and spend your berries on 15 outfits, 6 rooms and plenty of treats.

SIX KINDS TO HATCH
Kitling, Bunling, Puppling, Cubling, Foxling and Drakling, each in four coats.

KIND BY DESIGN
No ads. No in-app purchases. No accounts. No timers that nag you. Nothing you say or do leaves your device. And your pet can never die or run away: if you've been gone, it's just very glad to see you.

**What's New (1.0):** Your Pockling has hatched.

**What's New (1.1):** Your Pockling has more to say. It coos while you stroke it, hearts chime as they pop up, and it hums, sings and pitter-patters about as it plays. Swing it around for a "wheee!" The purr comes through phone speakers much more clearly too.

**Review notes:**

1. Screen recording: attached (pockling-simulator-walkthrough.mp4). Please note it was captured in the iOS Simulator (iPhone 18 Pro, iOS 27.0), not on a physical device, from a Simulator build of the same source as build 2. We do not have a physical-device recording yet. If you still need one, tell us and we will send it. The video starts at launch and is uncut, scaled down to fit the upload limit, with a small label added. It has no sound, because the Simulator's recorder captures video only. In Simulator builds, talk-back plays a built-in test voice instead of using the microphone; on a device it uses the real microphone. The app has no accounts, no user-generated content and no paid content, so those flows do not exist. Berries are earned in the game and cannot be bought.

2. Purpose and audience: Pockling is a virtual pet for people of all ages. It gives them a small, calm creature to look after each day, with no ads, purchases, accounts or nagging timers. The pet cannot die or run away.

3. Setup: none, and no login. Pick an egg and tap Hatch this egg, tap the egg six times, choose a name, then tap Welcome home. Stroke the pet with a finger, drag food up from the Feed tray, and try Wash, Play, Walk and Sleep along the bottom. The microphone is used only for talk-back, the microphone button on the right of the home screen. Sound is held in memory just long enough to play back at a higher pitch, and is never stored or transmitted. The rest of the app works if permission is refused.

4. External services: none. The game runs from files inside the app and makes no network requests. There are no analytics, ads, payments, sign-in or AI services. The only links out are Privacy and Support, which open in the browser, and a link on the pet card if the player chooses to share it.

5. Regional differences: none. The app is the same in every region, in English. Its sky follows the device's own clock.

6. Regulated or third-party material: not applicable. All art and sound is made by the app's own code, apart from standard system emoji in some buttons.

The video is in `build/appstore/review/` (not in git). It came from `xcrun simctl io <device> recordVideo` on a fresh install, scaled to 720 wide with the Simulator label overlaid, to stay under the 10 MB a browser upload allows.

## Screenshots and previews

All of it comes out of the game itself, staged with its own hooks, and goes to `build/appstore/` (not in git). The dev server has to be running.

```bash
node tools/store-shots.mjs build/appstore/raw phone
```

```bash
node tools/store-shots.mjs build/appstore/raw ipad
```

```bash
node tools/store-frame.mjs build/appstore/raw build/appstore
```

```bash
node tools/store-preview.mjs build/appstore/preview
```

```bash
node tools/make-art.mjs store build/appstore/creative
```

| App Store Connect slot | Folder | Size |
|---|---|---|
| iPhone with Dynamic Island (medium display), **required** | `iphone-6.3/` | 1206x2622 |
| iPhone with Dynamic Island (large display) | `iphone-6.9/` | 1320x2868 |
| iPad 13", **required** | `ipad-13/` | 2064x2752 |
| App preview (iPhone) | `preview/pockling-preview.mp4` | 886x1920, 29 s, silent audio track |
| Product page header | `creative/header-3840x1646.png` | 3840x1646 |
| Search results | `creative/search-3840x2560.jpg` | 3840x2560 |

The headlines are in `tools/store-frame.mjs`. `10-hatch` on iPhone is a real capture from the simulator (the raw `hatch.png` is swapped for it); the rest render the same code in Chrome, with the iPhone's safe areas.

The iPhone Duo slot stays empty for now: the fold has never been run on a device or a simulator, so we shouldn't earn the "Made for iPhone Duo" badge yet. Apple requires it from April 2027 for apps built with the iOS 27.1 SDK.

## Uploading a build

The team has no registered devices, so archive unsigned and let the export sign it.

```bash
xcodebuild archive -project ios/Pockling.xcodeproj -scheme Pockling -configuration Release -destination 'generic/platform=iOS' -archivePath ios/build/Pockling.xcarchive CODE_SIGNING_ALLOWED=NO
```

```bash
xcodebuild -exportArchive -archivePath ios/build/Pockling.xcarchive -exportOptionsPlist ios/ExportOptions.plist -exportPath ios/build/export -allowProvisioningUpdates
```

Raise `CURRENT_PROJECT_VERSION` in the project for every upload.

## TestFlight

- Internal group "Internal", with automatic distribution, so every upload reaches its testers. `ashish@9io.ai` is in it.
- External group "External", with two testers. Build 2 went to Beta App Review on 31 October 2026 and showed as approved for testing by 1 November. Later builds have to be added to the group by hand.

## Not tested before submitting

Nothing has run on a real iPhone yet. TestFlight has the same build, for trying talk-back with real speech (the simulator can't, see `ios/Pockling/TalkBack.swift`), the purr, tilt, a reminder firing, and how it runs on an older phone. Apple Silicon Macs, Apple Vision Pro and the iPhone Duo fold haven't been run either.

Removing a version from review to swap a build goes back to the end of the queue, so anything found now ships as an update.
