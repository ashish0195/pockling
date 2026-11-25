# Pockling 1.4 (8): make it yours

1.4 is the user's "create your own pet" (25 Nov 2026): right after the egg hatches, a "Make it yours" studio,
and a Makeover in the menu for a pet that's home already (pockling 7bda4b5). Why it's the release to make:
on 24–25 Nov Pockling had 2.73K impressions and 64 first-time downloads since launch, about one product page
view a day, and wasn't in the top 12 for any of its 52 US target searches. The searches this feature makes
honest are wide open: the top three for "create your own pet" have 14, 0 and 0 ratings, "custom pet" 14, 0
and 0, "design your own pet" 198, 0 and 1. (Rank check of 25 Nov, pockling-duo session.)

## The build

- Version 1.4, build 8, from main. Upgrade-tested from 1.3.2 (7) (102c2d2) on an iPhone 18 Pro simulator (iOS
  27.2). The pet came over unchanged: breed, coat, name, seed, XP, outfit and room. It went straight home, with
  no look until a Makeover gave it one, and then the widget got its own pictures in the App Group.
  The 12 berries on first opening are the day's first stamp, which 1.3.2 gives too with the same save.
- npm test: 68 pass (10 new in `test/look.test.mjs`). Smoke: the hatch flow goes through the studio. 24 of 25
  flows passed in the full run; `layout-duo-book`'s Hide and seek check was flaky under load, and passes alone,
  as it does on the code before 1.4.

## Store media

The studio is the second shot in every main set, "Make your own / *one-of-a-kind pet*". The six kinds
standing together leave the main sets (the custom pages keep theirs):

| Set | Folder | Order |
|---|---|---|
| iPhone 6.9" and 6.3" | `store/iphone-6.9/`, `store/iphone-6.3/` | glass, make, widget, love, feed, bath, walk, talk, sleep, dress |
| iPad 13" | `store/ipad-13/` | glass, make, love, feed, bath, walk, talk, hide, sleep, dress |
| iPhone Duo | `store/iphone-duo/` | glass, make, widget, love, feed, bath, walk, talk, sleep, dress |

The make shot is the game itself: `tools/store-shots.mjs ... make` hatches a Kitling and gives it a Bunling's
ears, a Foxling's tail, little wings, socks and Lilac. The Duo's is the real app on the Duo simulator, standing
like a laptop. No price word anywhere in them (Guideline 2.3.7). The previews stay as they are: the iPhone one
for 1.3.1, and no Duo preview (2.3.4).

## Text (the user chose the new subtitle on 25 Nov 2026)

**Subtitle**, en-US and en-GB: `Create Your Own Cozy Pet` (24), in place of `Cozy Kitten & Puppy Games`. With the
name (`Pockling: Cute Virtual Pet`) it covers "create your own pet", "cozy pet" (top three: 1.8K, 0 and 0 ratings)
and "cute pet". es-MX: `Crea tu propia mascota` (22), in place of `Gatitos y perritos adorables`. Hindi unchanged.

**Keywords** with the new subtitles. "kitten" and "puppy" move here from the subtitle; "care", "fluffy",
"animal", "baby" and "bath" go, none of them in reach (top results with thousands of ratings):
- en-US (97): `kitten,puppy,custom,design,cat,dog,bunny,fox,dragon,bear,kawaii,hatch,egg,talking,dress,up,widget`
- en-GB (100): `kitten,puppy,custom,design,cosy,cat,dog,bunny,rabbit,fox,dragon,bear,kawaii,hatch,egg,talking,widget`
- es-MX (98): `gatito,perrito,gato,perro,conejo,personalizar,diseñar,cuidar,juegos,kawaii,widget,huevo,vestir,pet`
- hi: unchanged (98).

If the subtitle stays, en-US (100): `create,custom,design,own,cat,dog,bunny,fox,dragon,bear,kawaii,hatch,egg,talking,dress,up,widget,bath`.

**Promotional text** (en-US 163, "any color"; en-GB 164, "any colour"): A tiny friend is waiting in an egg.
Hatch it, then make it yours: any colour, ears, tail, even wings. It never dies, and it lives on your Home
Screen. No ads, ever. es-MX (167): Un amiguito te espera en un huevo. Haz que nazca y hazlo tuyo: cualquier
color, orejas, cola, ¡hasta alitas! Nunca muere y vive en tu pantalla de inicio. Sin anuncios. Hindi unchanged.

**What's New**
- en-US and en-GB ("colors" in en-US, "colours" in en-GB): Make it yours! Right after your egg hatches, choose your pet's colours (any colour at
  all), markings, ears, tail and eyes. Even little wings! Already have a Pockling? Tap Makeover in the menu
  for a brand-new look. It keeps its name and everything else, and your widget shows the new look too.
- es-MX: ¡Hazlo tuyo! Justo después de que nazca tu mascota, elige sus colores (el que quieras), sus
  manchas, orejas, cola y ojos. ¡Hasta alitas! ¿Ya tienes un Pockling? Toca Makeover en el menú y dale un look
  nuevo. Conserva su nombre y todo lo demás, y tu widget también muestra su nuevo look.
- hi: इसे अपना बनाइए! अंडे से निकलते ही अपने पालतू का रंग (कोई भी रंग), धब्बे, कान, पूँछ और आँखें चुनिए।
  छोटे पंख भी! पहले से Pockling है? मेन्यू में Makeover दबाइए और उसे नया रूप दीजिए। उसका नाम और बाकी सब
  वैसा ही रहेगा, और आपका विजेट भी नया रूप दिखाएगा।

**Review notes**: the first paragraph (1.3.2's daily reminders) became 1.4's: the studio after hatching and the
Makeover; no new permission, no purchases, no network; the widget's pictures painted on the device; and one line
that the 6 pm reminder has changed each day since 1.3.2. 3,985 of 4,000 characters.

## As entered in App Store Connect (25 Nov 2026)

The user's go-ahead in the pockling-duo session: "Upload and submit", "Yes, new subtitle", "Yes, deploy it".

- **Upload:** 1.4 (8) archived unsigned from main 4b93e30 (Xcode 27.2), the widget and then the app signed ad hoc
  with their entitlements (push as `production`), exported to a folder first and checked: 1.4 (8) on the app and
  the widget, `aps-environment` production, the App Group on both, Apple Distribution (9X9HQVQ78G), the studio,
  Makeover and widget painter inside. IPA 20,701,750 bytes, SHA-256 a3d5a45d20459bb0…. Uploaded at 21:58:49 IST
  ("Upload succeeded"); build `cc1fbe7c-a0e5-4ed7-8b3b-b6bba416a663` VALID by 22:00, no non-exempt encryption.
- **Version 1.4** `e6305ebb-05d6-44f0-b3cd-50df808a646a`, created at 21:57:54 IST from 1.3.2, which copied its
  text, media and review details. Release automatically after approval; copyright "2026 9io".
- **Subtitles** in the 1.4 App Info (`2524208e-…`): en-US and en-GB "Create Your Own Cozy Pet", es-MX "Crea tu
  propia mascota"; Hindi unchanged. Read back.
- **What's New, keywords and promotional text** as above, in all four languages, read back identical. App Store
  Connect refuses ✨ in What's New, so it's gone from every language.
- **Screenshots** (English (U.S.), which the other languages use): in each of the iPhone 6.3" (`APP_IPHONE_61`,
  the only iPhone set), iPad 13" and iPhone Duo sets, the kinds shot was deleted (a set holds ten), `02-make.jpg`
  uploaded and the set ordered glass, make, then the rest as before. Processed; MD5s as the files: 6.3"
  a199eb4b7352d886e2d60967869d1cba, iPad becadf134e677772d4303a2ee20d97c9, Duo 81816ddbeddff874b5fe075cdabfb2aa.
  The iPhone preview stays (the 1.3.1 re-cut); no Duo preview.
- **Submitted** in `c4bb09e7-72f4-429e-80d3-5b1046546aab` at 22:01:57 IST (16:31:57Z): Waiting for Review,
  version 1.4 alone. Nothing else was open for Pockling.
- **Web game:** bitfold.9io.ai/pockling/ deployed from main 4b93e30 at 21:57 IST: all 43 files match main (40
  before, plus the studio, the Makeover and the widget painter). Hatching then the studio checked live.

## Not in 1.4 (next)

Pet visits by link, the pet as iMessage stickers, naps in the Dynamic Island, and the Snow Festival (with the
live-events session's server), all chosen by the user on 25 Nov 2026.
