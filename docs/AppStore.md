# App Store listing

Copy and settings for Pockling on the App Store.

**Status:** Pockling 1.0 (build 2) went live on the App Store on 5 November 2026: https://apps.apple.com/app/id6829163472. It isn't on sale in the EU until the account's DSA trader verification clears. On the way, Apple sent it back on 1 November under Guideline 2.1, Information Needed, asking for a screen recording from a physical device and written answers, without naming a defect. It went back the same day with a recording from the iOS Simulator, labelled as one, and the answers under Review notes below.

**1.1:** build 3, with sounds for playing with the pet and for its idle animations, was uploaded on 6 November 2026 and reaches the Internal TestFlight group automatically. It isn't submitted for review, and the App Store version for it hasn't been created yet.

**1.2:** build 4 adds notifications (a daily reminder, a nudge after a few days away, and news the player opts in to) and anonymous usage data, through 9io's shared client `ios/Pockling/NineIO.swift` (a copy of `stocks-bot/games/client/NineIO.swift`). It builds, but it hasn't been uploaded, and 9io's games server at https://9io.ai/games-api/ isn't deployed yet: until it is, the app keeps its events and retries. It changes the App Privacy answers: see Version 1.2 below.

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
**App Privacy:** Data Not Collected, no tracking. From 1.2 the app collects anonymous data: see Version 1.2 below.
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

**What's New (1.2):** Your Pockling can say hello now! Turn on reminders and it presses its nose to the window at 6 pm, with a little nudge if you've been away a few days. The app also shares anonymous usage data now, so we can see what Pocklings like doing most. No account, no ads, no tracking, and you can switch it off in Settings.

**Review notes:**

1. Screen recording: attached (pockling-simulator-walkthrough.mp4). Please note it was captured in the iOS Simulator (iPhone 18 Pro, iOS 27.0), not on a physical device, from a Simulator build of the same source as build 2. We do not have a physical-device recording yet. If you still need one, tell us and we will send it. The video starts at launch and is uncut, scaled down to fit the upload limit, with a small label added. It has no sound, because the Simulator's recorder captures video only. In Simulator builds, talk-back plays a built-in test voice instead of using the microphone; on a device it uses the real microphone. The app has no accounts, no user-generated content and no paid content, so those flows do not exist. Berries are earned in the game and cannot be bought.

2. Purpose and audience: Pockling is a virtual pet for people of all ages. It gives them a small, calm creature to look after each day, with no ads, purchases, accounts or nagging timers. The pet cannot die or run away.

3. Setup: none, and no login. Pick an egg and tap Hatch this egg, tap the egg six times, choose a name, then tap Welcome home. Stroke the pet with a finger, drag food up from the Feed tray, and try Wash, Play, Walk and Sleep along the bottom. The microphone is used only for talk-back, the microphone button on the right of the home screen. Sound is held in memory just long enough to play back at a higher pitch, and is never stored or transmitted. The rest of the app works if permission is refused.

4. External services: none. The game runs from files inside the app and makes no network requests. There are no analytics, ads, payments, sign-in or AI services. The only links out are Privacy and Support, which open in the browser, and a link on the pet card if the player chooses to share it.

5. Regional differences: none. The app is the same in every region, in English. Its sky follows the device's own clock.

6. Regulated or third-party material: not applicable. All art and sound is made by the app's own code, apart from standard system emoji in some buttons.

The video is in `build/appstore/review/` (not in git). It came from `xcrun simctl io <device> recordVideo` on a fresh install, scaled to 720 wide with the Simulator label overlaid, to stay under the 10 MB a browser upload allows.

## Version 1.2: notifications and usage data

**App Privacy (1.2):** Data Not Linked to You. Under "Do you or your third-party partners collect data from this app?", Yes, with two data types:

- Identifiers › Device ID: App Functionality and Analytics. Not linked to the user's identity. Not used for tracking.
- Usage Data › Product Interaction: Analytics. Not linked to the user's identity. Not used for tracking.

The product page then shows Data Not Linked to You: Identifiers, Usage Data, and no Data Used to Track You. The app's privacy manifest (`ios/Pockling/PrivacyInfo.xcprivacy`) declares the same. App Privacy is app-wide and goes live as soon as it's published, so publish it just before submitting 1.2.

**Review notes (1.2):**

1. New in 1.2: notifications and anonymous usage data. The game itself is as in 1.1, and the notes for 1.0 above still describe it, its setup and the microphone, except note 4, which these replace.

2. The notification card: after a game or activity that ends well (Fetch, Snack Drop, Hide and Seek, a walk or a bath), back on the home screen, the app may show its own card before iOS's permission prompt. It never appears in the launch the pet hatched in, or before the pet has been cared for on two different days, and only while iOS hasn't asked yet: at most three times, three days apart. It says what the reminders are (a hello at 6 pm each day, and a nudge after a few days away) and offers "Reminders and news", whose line says it also brings news about new games and events from 9io, "Just reminders", and "Not now". iOS's prompt follows only the first two.

3. Promotional notifications (Guideline 4.5.4): news is off unless the player chooses "Reminders and news" on the card or turns on "News and new games" in Settings, and that switch turns it off again. Our server sends news only to devices that opted in. Reminders are scheduled on the device.

4. Settings: the menu button (top right), then Settings, has three new switches next to Sounds, Music box and Feel it purr: Reminders, News and new games, and Share anonymous usage data ("Helps us see what Pocklings like doing. No account, no ads, no tracking."), with Privacy and Help and support links below. Turning on a notification switch asks iOS if it hasn't asked yet; if notifications are off in iOS Settings, the app says so and offers to open them. To see the permission prompt without waiting for the card, turn on Reminders there.

5. Data now sent, only to our own server at https://9io.ai/games-api/: an anonymous install ID (a random UUID made on the device); usage events (the app opening and how long it stayed open, games and activities started and finished with their scores, care such as feeding, bedtime, talk-back and photos, the egg hatched and the pet growing up, the card's answer and notifications opened); the app and iOS versions, device model, language and time zone; and, once notifications are allowed, the push token with the player's notification choices. No names (the pet's name never leaves the device), accounts, advertising identifier, contacts, location or recordings, and the server keeps no IP addresses. Nothing is linked to the player or used for tracking, and there are no third-party SDKs. The player can turn usage data off in Settings.

6. External services: the requests above to our own server, and Apple's push service for notifications. No analytics services, ads, payments, sign-in or AI services.

**Lines that say the app collects no data:**

To change in App Store Connect with 1.2:

- App Privacy: "Data Not Collected". Use the answers above.
- Description, KIND BY DESIGN: "Nothing you say or do leaves your device." Suggested: "Nothing you say leaves your device, and the app's anonymous usage data can be switched off."
- Review notes, note 4: "External services: none. The game runs from files inside the app and makes no network requests. There are no analytics, ads, payments, sign-in or AI services." Replaced by notes 5 and 6 above.

Changed in this repo for 1.2:

- `docs/AppStore.md`: "**App Privacy:** Data Not Collected, no tracking." now points here.
- `web/privacy/index.html`: "Pockling doesn't collect, store on a server, share or sell any information about you. There are no accounts, no analytics...", its description tag, "Nothing goes through a server" (reminders), "The iOS app has no network features" and "collects nothing from anyone, children included". Rewritten for 1.2.
- `web/support/index.html`: "Nothing about you or your pet leaves your device." Rewritten.
- `web/src/ui/hud.js`, Settings › Privacy: "Nothing leaves your device". The app now says "What the app sends, and what it never does"; the browser keeps the old line, which is still true there.
- `ios/Pockling/Reminders.swift`, a comment: "Nothing goes through a server." Rewritten.

Still true, so left alone: the microphone's purpose string in `Info.plist` ("Nothing is saved or sent anywhere"), the comments in `TalkBack.swift` and `web/src/talk.js` (both about sound), and Settings' "No ads. No accounts. No tracking."

Elsewhere, not changed (stocks-bot, the 9io.ai site):

- `alphaengine/api/static/games.html`, line 143 (Pockling's structured data): "No ads, no sign-up, and nothing leaves your device." Line 502, under It talks back, says "Nothing leaves your device." too, which still holds for what you say.
- `alphaengine/api/static/llms.txt`, line 32: "No ads, no sign-up, and nothing leaves your device."
- `alphaengine/api/blog/posts/our-games-on-the-app-store.md`, line 14: "each App Store page says no data is collected", and line 71: each page says "Data Not Collected" (dated 6 November 2026).

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

From 1.2 the app has a capability, push notifications (`ios/Pockling/Pockling.entitlements`). The unsigned archive carries no entitlements and the export signs with only what it carries, so sign the archived app ad hoc with them between the two commands, as for Football Kick 1.1:

```bash
codesign --force --sign - --entitlements ios/Pockling/Pockling.entitlements --generate-entitlement-der ios/build/Pockling.xcarchive/Products/Applications/Pockling.app
```

Export to a folder first, unzip the IPA and check with `codesign -d --entitlements -` that it lists `aps-environment` as `production`. The App ID needs Push Notifications turned on; automatic signing with `-allowProvisioningUpdates` should do that, or it's a tick at developer.apple.com.

## TestFlight

- Internal group "Internal", with automatic distribution, so every upload reaches its testers. `ashish@9io.ai` is in it.
- External group "External", with two testers. Build 2 went to Beta App Review on 31 October 2026 and showed as approved for testing by 1 November. Later builds have to be added to the group by hand.

## Not tested before submitting

Nothing has run on a real iPhone yet. TestFlight has the same build, for trying talk-back with real speech (the simulator can't, see `ios/Pockling/TalkBack.swift`), the purr, tilt, a reminder firing, and how it runs on an older phone. Apple Silicon Macs, Apple Vision Pro and the iPhone Duo fold haven't been run either.

Removing a version from review to swap a build goes back to the end of the queue, so anything found now ships as an update.

1.2's notifications and usage data have only been built, not run: not the card, iOS's prompt, a reminder or nudge arriving, 1.1's reminder setting carrying over, or anything reaching 9io's games server, which isn't deployed yet. The web side was tried in headless Chrome with a stand-in for the app's bridge.
