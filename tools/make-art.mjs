// Makes the images the game and the App Store need, from the game's own art. Needs the dev server.
//   node tools/make-art.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive } from './drive.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'tools/.art');

const snap = async (name, mode, width, height) => {
  let file;
  await drive({ width, height, outDir: out, quiet: true }, async (d) => {
    await d.rawOpen(`tools/art.html?mode=${mode}`);
    await d.waitFor('window.__ready', 20000);
    await d.sleep(300);
    if (mode === 'word') await d.transparent();
    file = await d.shot(name, { draw: false });
  });
  return file;
};

// The App Store's header and search images have their own command, because nothing in the game needs them.
//   node tools/make-art.mjs store <out dir>
if (process.argv[2] === 'store') {
  const dest = process.argv[3];
  for (const [name, mode, width, height] of [['header-3840x1646', 'header', 3840, 1646], ['search-3840x2560', 'search', 3840, 2560]]) {
    const png = await snap(name, mode, width, height);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-pix_fmt', 'rgb24', join(dest, `${name}.png`)]);
  }
  process.exit(0);
}

const icon = await snap('icon-1024', 'icon', 1024, 1024);
const sips = (...args) => execFileSync('sips', args, { stdio: 'ignore' });
const web = join(root, 'web');
copyFileSync(icon, join(web, 'icon-1024.png'));
// The App Store won't take an icon with an alpha channel; a trip through JPEG removes it.
const noAlpha = join(out, 'icon-opaque.jpg');
sips('-s', 'format', 'jpeg', '-s', 'formatOptions', 'best', icon, '--out', noAlpha);
sips('-s', 'format', 'png', noAlpha, '--out', join(root, 'ios/Pockling/Assets.xcassets/AppIcon.appiconset/AppIcon.png'));
for (const [size, name] of [[512, 'icon.png'], [180, 'apple-touch-icon.png']]) {
  copyFileSync(icon, join(web, name));
  sips('-z', String(size), String(size), join(web, name));
}
const og = await snap('og', 'og', 1200, 630);
copyFileSync(og, join(web, 'og.png'));
sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '82', join(web, 'og.png'), '--out', join(web, 'og.jpg'));
execFileSync('rm', [join(web, 'og.png'), join(web, 'icon-1024.png')]);
await snap('wordmark', 'word', 1100, 300);
console.log(`icon and share image are in web/, the originals in ${out}`);
