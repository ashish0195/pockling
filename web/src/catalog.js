// What exists in the game: breeds and their coats, foods, outfits, rooms. No DOM, so tests can read it.

/**
 * Breeds differ in their ears, tail, markings and voice. Coats are colour schemes:
 * fur runs from deepest shadow to brightest light.
 */
export const BREEDS = {
  kitling: {
    name: 'Kitling',
    blurb: 'Curious, sneaky, loves a good nap in the sun.',
    ears: { kind: 'cat', length: 58, width: 70, angle: 0.46, bend: 0.1, x: 58, y: -68, behind: true },
    tail: { kind: 'curl', length: 112, width: 30, curl: 1.3 },
    voice: 1.18,
    whiskers: true,
    egg: { base: '#ffe2c8', spot: '#ffb98a', pattern: 'spots' },
    coats: [
      { id: 'peach', name: 'Peach', fur: ['#c8704f', '#ee9f78', '#ffc9a3', '#fff0dd'], belly: '#fff6ea', inner: '#ffb1a8', nose: '#ff8c95', cheek: '#ff8f96', iris: '#7a4a2a', mark: 'tabby' },
      { id: 'cream', name: 'Cream', fur: ['#c99f7c', '#ecd2b0', '#fff0da', '#fffdf5'], belly: '#fffefa', inner: '#ffc4bc', nose: '#ff9aa0', cheek: '#ffa2a6', iris: '#4f6f8f', mark: 'none' },
      { id: 'smoke', name: 'Smoke', fur: ['#5d5f7c', '#8e90ad', '#bcbed6', '#e9e9f5'], belly: '#f4f4fb', inner: '#f3b4c6', nose: '#e88aa3', cheek: '#f49ab2', iris: '#3f7a6a', mark: 'socks' },
      { id: 'ginger', name: 'Ginger', fur: ['#b5552a', '#e6823f', '#ffa95c', '#ffdca8'], belly: '#fff3df', inner: '#ffb7a0', nose: '#f47f73', cheek: '#ff7f73', iris: '#5e7d2c', mark: 'tabby' },
    ],
  },
  bunling: {
    name: 'Bunling',
    blurb: 'Gentle, bouncy, thinks every carrot is a gift.',
    ears: { kind: 'long', length: 128, width: 50, angle: 0.3, bend: 1.5, x: 42, y: -78, behind: true },
    tail: { kind: 'pom', length: 42, width: 44, curl: 0 },
    voice: 1.3,
    egg: { base: '#efe6ff', spot: '#c4aef5', pattern: 'hearts' },
    coats: [
      { id: 'lilac', name: 'Lilac', fur: ['#8a71bb', '#b7a0e3', '#dccdfa', '#fbf6ff'], belly: '#fffaff', inner: '#ffb9d3', nose: '#ff93b6', cheek: '#ff9dc0', iris: '#5a3fa0', mark: 'none' },
      { id: 'snow', name: 'Snow', fur: ['#b5afc0', '#ddd9e4', '#f8f6fa', '#ffffff'], belly: '#ffffff', inner: '#ffc3cf', nose: '#ff9cae', cheek: '#ffa9ba', iris: '#a34a6a', mark: 'none' },
      { id: 'mocha', name: 'Mocha', fur: ['#7d5a4a', '#ab8370', '#d4b09b', '#f4e0d0'], belly: '#fdf2e6', inner: '#f5b8a8', nose: '#d97f7a', cheek: '#ee9490', iris: '#4a2f22', mark: 'none' },
      { id: 'blush', name: 'Blush', fur: ['#c9778f', '#eea3b8', '#ffcbd8', '#fff3f6'], belly: '#fffafb', inner: '#ff9bb4', nose: '#ff7f9d', cheek: '#ff7d9f', iris: '#7d2f55', mark: 'none' },
    ],
  },
  puppling: {
    name: 'Puppling',
    blurb: 'All wag, no brakes. Will fetch until the sun goes down.',
    ears: { kind: 'flop', length: 92, width: 54, angle: 1.3, bend: 2.0, x: 78, y: -60, behind: false },
    tail: { kind: 'stub', length: 58, width: 28, curl: 0.5 },
    voice: 0.96,
    fang: true,
    egg: { base: '#fff0cf', spot: '#e9b463', pattern: 'paws' },
    coats: [
      { id: 'honey', name: 'Honey', fur: ['#a8682c', '#d99a4c', '#f6c67f', '#fff0cc'], belly: '#fff8e6', inner: '#c98744', nose: '#5d3a2c', cheek: '#ff9a7f', iris: '#5a3518', mark: 'patch', markColor: '#b97836' },
      { id: 'dalma', name: 'Speckle', fur: ['#a8a4a8', '#d8d6d8', '#f6f5f5', '#ffffff'], belly: '#ffffff', inner: '#6d6670', nose: '#3a3440', cheek: '#ffa3a8', iris: '#3a2f46', mark: 'spots', markColor: '#57505c' },
      { id: 'cocoa', name: 'Cocoa', fur: ['#553527', '#83563f', '#ab7b5f', '#ddb798'], belly: '#f5dec4', inner: '#6a4230', nose: '#2f1d18', cheek: '#ff8f78', iris: '#2d1a10', mark: 'muzzle', markColor: '#f5dec4' },
      { id: 'sandy', name: 'Sandy', fur: ['#bd9662', '#e5c493', '#fbe6be', '#fffaea'], belly: '#fffdf4', inner: '#d3a770', nose: '#6b4a38', cheek: '#ffab90', iris: '#5e4530', mark: 'patch', markColor: '#d3a770' },
    ],
  },
  cubling: {
    name: 'Cubling',
    blurb: 'A soft, sleepy hug on two tiny legs. Honey is a food group.',
    ears: { kind: 'round', length: 46, width: 56, angle: 0.62, bend: 0, x: 64, y: -68, behind: true },
    tail: { kind: 'pom', length: 30, width: 34, curl: 0 },
    voice: 0.82,
    egg: { base: '#f0ddc8', spot: '#c29a74', pattern: 'stars' },
    coats: [
      { id: 'milktea', name: 'Milk tea', fur: ['#8a6246', '#b98c67', '#e0bb95', '#f9e7cf'], belly: '#fff4e2', inner: '#f2b9a0', nose: '#5a3a2e', cheek: '#ff9f8a', iris: '#46301f', mark: 'muzzle', markColor: '#fff4e2' },
      { id: 'panda', name: 'Panda', fur: ['#a7a5ad', '#d6d5da', '#f7f7f8', '#ffffff'], belly: '#ffffff', inner: '#3d3a46', nose: '#2c2933', cheek: '#ffb1bd', iris: '#3a2d4f', mark: 'panda', markColor: '#413e4b' },
      { id: 'honey', name: 'Honeycomb', fur: ['#b9772a', '#e6a443', '#ffcb6c', '#fff0ba'], belly: '#fff7d9', inner: '#f0a06a', nose: '#6d4522', cheek: '#ff9d6b', iris: '#5c3a12', mark: 'muzzle', markColor: '#fff7d9' },
      { id: 'polar', name: 'Polar', fur: ['#a9c2d2', '#d3e4ee', '#f1f8fc', '#ffffff'], belly: '#ffffff', inner: '#ffc4cf', nose: '#465a70', cheek: '#ffb1bf', iris: '#2d5a7f', mark: 'none' },
    ],
  },
  foxling: {
    name: 'Foxling',
    blurb: 'Clever, cheeky, always one step ahead of the snacks.',
    ears: { kind: 'fox', length: 72, width: 76, angle: 0.42, bend: 0.06, x: 56, y: -68, behind: true },
    tail: { kind: 'bush', length: 124, width: 62, curl: 0.75 },
    voice: 1.1,
    fang: true,
    egg: { base: '#ffe0c0', spot: '#f58a3c', pattern: 'zig' },
    coats: [
      { id: 'tangerine', name: 'Tangerine', fur: ['#b84f18', '#e87a2c', '#ffa654', '#ffd9a6'], belly: '#fffaf0', inner: '#fff1dd', nose: '#3a2726', cheek: '#ff7c64', iris: '#6d3b12', mark: 'fox', markColor: '#fffaf0', tip: '#fffaf0' },
      { id: 'arctic', name: 'Arctic', fur: ['#9db7cc', '#cddfec', '#ecf5fb', '#ffffff'], belly: '#ffffff', inner: '#ffd6dd', nose: '#3a4a60', cheek: '#ffacc0', iris: '#2f6d9a', mark: 'fox', markColor: '#ffffff', tip: '#b9d9f2' },
      { id: 'rose', name: 'Rosefox', fur: ['#b5476d', '#e0708f', '#fb9fb3', '#ffdde4'], belly: '#fff7f9', inner: '#ffeff2', nose: '#5a2740', cheek: '#ff5f8b', iris: '#7a2548', mark: 'fox', markColor: '#fff7f9', tip: '#fff7f9' },
      { id: 'midnight', name: 'Midnight', fur: ['#2e2a56', '#4c4685', '#726bb2', '#b3aee0'], belly: '#e8e5fb', inner: '#c5b9f5', nose: '#191630', cheek: '#c87fe0', iris: '#d6a02a', mark: 'fox', markColor: '#e8e5fb', tip: '#e8e5fb' },
    ],
  },
  drakling: {
    name: 'Drakling',
    blurb: 'A very small dragon with very big plans. Sneezes sparkles.',
    ears: { kind: 'horn', length: 44, width: 34, angle: 0.3, bend: -0.2, x: 40, y: -82, behind: true },
    tail: { kind: 'spade', length: 112, width: 36, curl: 0.9 },
    voice: 1.04,
    fang: true,
    wings: true,
    egg: { base: '#d7f7e5', spot: '#6fd6a8', pattern: 'scales' },
    coats: [
      { id: 'mint', name: 'Mint', fur: ['#3f9c82', '#6fc9a8', '#a4e8ca', '#e8fff3'], belly: '#fdfbe2', inner: '#f9d98d', nose: '#46a488', cheek: '#ff9fa8', iris: '#2f6f5c', mark: 'none', wing: '#ffc4d6', horn: '#ffe9a8' },
      { id: 'sky', name: 'Sky', fur: ['#3a7bbd', '#6babe6', '#a2d3fb', '#e9f6ff'], belly: '#fffbe6', inner: '#ffd98f', nose: '#4f93cf', cheek: '#ff9fbd', iris: '#28508a', mark: 'none', wing: '#ffe8a3', horn: '#ffeec2' },
      { id: 'plum', name: 'Plum', fur: ['#6a3a9c', '#9462c7', '#bf91ea', '#efdcff'], belly: '#fff2dc', inner: '#ffc86b', nose: '#7f4bb0', cheek: '#ff8fc3', iris: '#3f1f70', mark: 'none', wing: '#8fe7d0', horn: '#ffe08f' },
      { id: 'ember', name: 'Ember', fur: ['#b23b34', '#e36a4f', '#ff9c78', '#ffdccb'], belly: '#fff3c9', inner: '#ffd36b', nose: '#c74d3f', cheek: '#ff6f6f', iris: '#7a2214', mark: 'none', wing: '#ffcd5a', horn: '#fff0c0' },
    ],
  },
};

export const BREED_IDS = Object.keys(BREEDS);

export function coatOf(pet) {
  const breed = BREEDS[pet.breed];
  return breed.coats.find((c) => c.id === pet.coat) ?? breed.coats[0];
}

/** Life stages, by days of care. */
export const STAGES = [
  { id: 'baby', name: 'Baby', days: 0, scale: 0.78, eyes: 1.16, ears: 0.8, tail: 0.72 },
  { id: 'kid', name: 'Kid', days: 2, scale: 0.92, eyes: 1.07, ears: 0.92, tail: 0.88 },
  { id: 'grown', name: 'Grown', days: 7, scale: 1.05, eyes: 1, ears: 1, tail: 1 },
];

/**
 * Foods. tummy and fun are what they give; cost is in berries (0 means always in the bowl). Each breed
 * has one it adores and one it can't stand.
 */
export const FOODS = {
  apple: { name: 'Apple', tummy: 18, fun: 1, cost: 0 },
  carrot: { name: 'Carrot', tummy: 16, fun: 1, cost: 0 },
  kibble: { name: 'Crunchies', tummy: 22, fun: 0, cost: 0 },
  broccoli: { name: 'Broccoli', tummy: 20, fun: -3, cost: 0 },
  fish: { name: 'Fishy', tummy: 26, fun: 3, cost: 3 },
  honey: { name: 'Honey pot', tummy: 20, fun: 6, cost: 4 },
  cookie: { name: 'Cookie', tummy: 12, fun: 7, cost: 3 },
  donut: { name: 'Donut', tummy: 16, fun: 9, cost: 5 },
  sushi: { name: 'Sushi', tummy: 24, fun: 6, cost: 6 },
  icecream: { name: 'Ice cream', tummy: 12, fun: 12, cost: 6 },
  cake: { name: 'Birthday cake', tummy: 30, fun: 16, cost: 12 },
  chili: { name: 'Hot chili', tummy: 8, fun: 8, cost: 2 },
};

export const FOOD_IDS = Object.keys(FOODS);

export const TASTES = {
  kitling: { love: 'fish', hate: 'broccoli' },
  bunling: { love: 'carrot', hate: 'fish' },
  puppling: { love: 'kibble', hate: 'chili' },
  cubling: { love: 'honey', hate: 'broccoli' },
  foxling: { love: 'apple', hate: 'carrot' },
  drakling: { love: 'chili', hate: 'icecream' },
};

/** Things to wear. slot: head, face or neck. One thing per slot. */
export const OUTFITS = {
  bow: { name: 'Pink bow', slot: 'head', cost: 25 },
  flower: { name: 'Daisy', slot: 'head', cost: 25 },
  party: { name: 'Party hat', slot: 'head', cost: 40 },
  beanie: { name: 'Cozy beanie', slot: 'head', cost: 50 },
  crown: { name: 'Tiny crown', slot: 'head', cost: 120 },
  wizard: { name: 'Wizard hat', slot: 'head', cost: 90 },
  pumpkin: { name: 'Pumpkin hat', slot: 'head', cost: 60 },
  santa: { name: 'Winter hat', slot: 'head', cost: 60 },
  headphones: { name: 'Headphones', slot: 'head', cost: 80 },
  glasses: { name: 'Round glasses', slot: 'face', cost: 35 },
  shades: { name: 'Cool shades', slot: 'face', cost: 60 },
  scarf: { name: 'Red scarf', slot: 'neck', cost: 35 },
  bandana: { name: 'Blue bandana', slot: 'neck', cost: 30 },
  bowtie: { name: 'Bow tie', slot: 'neck', cost: 30 },
  cape: { name: 'Hero cape', slot: 'neck', cost: 110 },
};

export const OUTFIT_IDS = Object.keys(OUTFITS);

/** Room colour schemes. */
export const ROOMS = {
  peach: { name: 'Peach', cost: 0, wall: ['#ffe9d6', '#ffd7bd'], trim: '#fff6ec', floor: ['#d9a06f', '#b97f52'], rug: ['#ff9d9d', '#ffd1c4'], accent: '#ff8f8f' },
  mint: { name: 'Mint', cost: 80, wall: ['#dcf7ec', '#bfeedd'], trim: '#f3fff9', floor: ['#c79a6e', '#a67c54'], rug: ['#6fd0b3', '#d0f5e6'], accent: '#3fb896' },
  lilac: { name: 'Lilac', cost: 80, wall: ['#ece3ff', '#d9caff'], trim: '#faf7ff', floor: ['#b98e78', '#99705d'], rug: ['#b597f2', '#e9defe'], accent: '#8f6be0' },
  sky: { name: 'Sky', cost: 80, wall: ['#dcefff', '#bfe1ff'], trim: '#f4faff', floor: ['#d4ab7c', '#b58b5d'], rug: ['#7fbcf2', '#d9eeff'], accent: '#4c9ae0' },
  sunny: { name: 'Sunny', cost: 120, wall: ['#fff5c9', '#ffe9a0'], trim: '#fffdf0', floor: ['#c8956a', '#a7774f'], rug: ['#ffb84d', '#fff0c2'], accent: '#ff9d2f' },
  night: { name: 'Starry', cost: 200, wall: ['#3b3a78', '#2b2a5e'], trim: '#5a58a0', floor: ['#6a4f6e', '#4d3a55'], rug: ['#8f7fe0', '#4f4aa0'], accent: '#ffd76b' },
};

export const ROOM_IDS = Object.keys(ROOMS);

/** Stickers for the daily stamp book. */
export const STICKERS = ['🌸', '⭐', '🍓', '🌈', '🐾', '🎈', '🍪', '🌙', '🦋', '🍀', '🎀', '🍩', '🌻', '🫧', '💖', '🍒', '☁️', '🧸', '🍑', '🌟', '🐝', '🍄', '🎵', '🌷', '🍰', '🪐', '🍉', '🎁'];
