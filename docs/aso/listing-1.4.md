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

## Text (proposed; the subtitle is the user's call)

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

**Promotional text** (en, 164): A tiny friend is waiting in an egg. Hatch it, then make it yours: any colour,
ears, tail, even wings. It never dies, and it lives on your Home Screen. No ads, ever.

**What's New**
- en-US and en-GB: Make it yours! ✨ Right after your egg hatches, choose your pet's colours (any colour at
  all), markings, ears, tail and eyes. Even little wings! Already have a Pockling? Tap Makeover in the menu
  for a brand-new look. It keeps its name and everything else, and your widget shows the new look too.
- es-MX: ¡Hazlo tuyo! ✨ Justo después de que nazca tu mascota, elige sus colores (el que quieras), sus
  manchas, orejas, cola y ojos. ¡Hasta alitas! ¿Ya tienes un Pockling? Toca Makeover en el menú y dale un look
  nuevo. Conserva su nombre y todo lo demás, y tu widget también muestra su nuevo look.
- hi: इसे अपना बनाइए! ✨ अंडे से निकलते ही अपने पालतू का रंग (कोई भी रंग), धब्बे, कान, पूँछ और आँखें चुनिए।
  छोटे पंख भी! पहले से Pockling है? मेन्यू में Makeover दबाइए और उसे नया रूप दीजिए। उसका नाम और बाकी सब
  वैसा ही रहेगा, और आपका विजेट भी नया रूप दिखाएगा।

**Review notes**, added: "1.4 adds a 'Make it yours' studio right after hatching, and a Makeover in the menu:
the player picks colours, markings, ears, tail, wings and eye colour. It needs no new permission, has no
purchases and uses no network. The widget shows the new look; the app paints those pictures on the device."

## Not in 1.4 (next)

Pet visits by link, the pet as iMessage stickers, naps in the Dynamic Island, and the Snow Festival (with the
live-events session's server), all chosen by the user on 25 Nov 2026.
