// Plays through the whole game in headless Chrome: hatches an egg, then cares for the pet in every way.
// Fails on any page error or on anything that didn't happen. The dev server has to be running.
//   SHOTS=/some/dir node tools/smoke.mjs [flow names...]
import { drive } from './drive.mjs';

const assert = (ok, message) => {
  if (!ok) throw new Error(`FAILED: ${message}`);
};

const flows = {
  async hatch(d) {
    await d.open('web/');
    assert(await d.js(`T.scene === __scenes.hatch`), 'a new game starts with an egg');
    await d.shot('hatch-pick');
    const egg = await d.js(`(() => { const e = T.scene.eggs[2]; return [e.x, e.y]; })()`);
    await d.js(`T.tap(${egg[0]}, ${egg[1]})`);
    assert(await d.js(`!document.getElementById('hatchBtn').disabled`), 'choosing an egg enables the button');
    await d.shot('hatch-chosen');
    await d.js(`T.click('#hatchBtn'); T.ff(2)`);
    assert((await d.js(`T.scene.phase`)) === 'crack', 'the egg moves to centre stage');
    await d.shot('hatch-egg');
    const w = await d.js(`[__game.view.w / 2, __game.view.h * 0.46]`);
    for (let i = 0; i < 3; i++) await d.js(`T.tap(${w[0]}, ${w[1]}); T.ff(0.5)`);
    await d.shot('hatch-cracking');
    for (let i = 0; i < 3; i++) await d.js(`T.tap(${w[0]}, ${w[1]}); T.ff(0.2)`);
    assert((await d.js(`T.scene.phase`)) === 'meet', 'six taps hatch it');
    await d.js(`T.ff(0.3)`);
    await d.shot('hatch-burst');
    await d.js(`T.ff(4.5)`);
    await d.waitFor(`document.getElementById('petName')`);
    await d.shot('hatch-name');
    await d.js(`document.getElementById('petName').value = 'Biscuit'; T.click('#nameBtn')`);
    await d.waitFor(`T.scene === __scenes.home`);
    assert((await d.js(`T.pet().name`)) === 'Biscuit', 'the name sticks');
    await d.sleep(800);
    await d.js(`T.ff(2)`);
    await d.shot('hatch-home');
    await d.js(`__game.scene.exit?.()`);
    const saved = await d.js(`localStorage.length`);
    assert(saved > 0, 'the pet is saved');
    // It's still there after a reload, and starting over really does.
    await d.js(`__game.ui.on_menu(); __game.ui.hideSheet()`);
    await d.sleep(1000);
    await d.open('web/');
    assert((await d.js(`T.pet().name`)) === 'Biscuit', 'the pet survives a reload');
    assert(await d.js(`T.scene === __scenes.home`), 'a returning player goes straight home');
    await d.js(`__game.ui.on_restartYes()`);
    await d.sleep(600);
    await d.waitFor(`window.__game && window.__game.scene === window.__scenes.hatch`, 8000);
  },

  async contextloss(d) {
    await d.open('web/?demo=home&breed=kitling&hour=11');
    await d.js(`window.__ext = __game.g.gl.getExtension('WEBGL_lose_context'); __ext.loseContext()`);
    await d.waitFor(`__game.g.lost`, 3000);
    await d.sleep(300);
    await d.js(`__ext.restoreContext()`);
    await d.waitFor(`!__game.g.lost`, 4000);
    await d.sleep(1200);
    await d.js(`T.ff(0.4)`);
    await d.shot('context-restored');
    const before = await d.js(`window.__frames`);
    await d.sleep(1200);
    assert((await d.js(`window.__frames`)) > before, 'frames keep coming after the context comes back');
    await d.js(`__goTo(__scenes.bath); T.ff(0.3); __goTo(__scenes.home); T.ff(0.3)`);
  },

  async home(d) {
    await d.open('web/?demo=home&breed=kitling&hour=11&tummy=40&love=40&fun=40');
    const actorAt = () => d.js(`T.draw(); (() => { const a = __game.pet.anchors; return { nose: a.nose, center: a.center, top: a.top, belly: a.belly }; })()`);
    let at = await actorAt();

    // Boop.
    await d.js(`T.tap(${at.nose[0]}, ${at.nose[1]}); T.ff(0.25)`);
    await d.shot('home-boop');
    await d.js(`T.ff(1.6)`);

    // Stroke the head: love goes up, it purrs.
    const before = await d.js(`T.pet().love`);
    at = await actorAt();
    await d.js(`T.down(${at.top[0]}, ${at.top[1] + 30})`);
    for (let i = 0; i < 36; i++) {
      const x = at.top[0] + Math.sin(i * 0.5) * 60;
      await d.js(`T.move(${x}, ${at.top[1] + 40 + Math.cos(i * 0.5) * 10}); T.ff(0.06)`);
    }
    await d.shot('home-stroke');
    await d.js(`T.up(${at.top[0]}, ${at.top[1] + 30}); T.ff(0.6)`);
    assert((await d.js(`T.pet().love`)) > before, 'stroking raises love');
    await d.js(`T.ff(1.5)`);

    // Tickle.
    at = await actorAt();
    for (let i = 0; i < 6; i++) await d.js(`T.tap(${at.belly[0] + i * 3}, ${at.belly[1]}); T.ff(0.14)`);
    await d.js(`T.ff(0.5)`);
    await d.shot('home-tickle');
    await d.js(`T.ff(3.5)`);

    // Pick it up by a long press, and drop it.
    at = await actorAt();
    await d.js(`T.down(${at.center[0]}, ${at.center[1]}); T.ff(0.1)`);
    await d.sleep(600);
    await d.js(`T.ff(0.55); T.move(${at.center[0] + 30}, ${at.center[1] - 120}); T.ff(0.2); T.move(${at.center[0] + 40}, ${at.center[1] - 240}); T.ff(0.25)`);
    await d.shot('home-carry');
    await d.js(`T.up(${at.center[0] + 40}, ${at.center[1] - 240}); T.ff(0.35)`);
    await d.shot('home-fall');
    await d.js(`T.ff(2.5)`);

    // Food tray, drag a snack to the mouth.
    await d.js(`T.click('[data-action="feed"]')`);
    await d.sleep(500);
    await d.shot('home-tray', { wait: 400 });
    const tummy0 = await d.js(`T.pet().tummy`);
    await d.js(`__game.scene.giveFood('apple'); T.ff(0.5)`);
    await d.shot('home-eat-1');
    await d.js(`T.ff(0.9)`);
    await d.shot('home-eat-2');
    await d.js(`T.ff(4)`);
    assert((await d.js(`T.pet().tummy`)) > tummy0, 'eating fills the tummy');
    await d.js(`document.querySelector('#tray')?.classList.remove('open'); __game.ui.hideTray?.()`);

    // Bedtime.
    await d.js(`__game.state.pet.energy = 20; T.scene.sleep(); T.ff(4)`);
    assert(await d.js(`__game.state.pet.asleep`), 'it goes to bed');
    await d.sleep(700);
    await d.shot('home-asleep');
    await d.js(`T.ff(4)`);
    await d.js(`T.scene.wake(); T.ff(3.5)`);
    assert(!(await d.js(`__game.state.pet.asleep`)), 'it wakes up');
    await d.shot('home-awake');

    // Photo card.
    await d.js(`T.click('[data-action="photo"]')`);
    await d.waitFor(`document.querySelector('#sheet.open, .sheet.open, #sheet canvas, #sheet img')`, 8000).catch(() => {});
    await d.sleep(600);
    await d.shot('home-card', { draw: false });
  },

  async bath(d) {
    await d.open('web/?demo=bath&breed=foxling&hour=15&clean=20');
    const c = await d.js(`T.draw(); __game.pet.anchors.center`);
    assert(await d.js(`T.scene === __scenes.bath`), 'bath scene');
    await d.js(`T.down(${c[0]}, ${c[1]})`);
    for (let i = 0; i < 90; i++) {
      await d.js(`T.move(${c[0] + Math.sin(i * 0.7) * 120}, ${c[1] + Math.cos(i * 0.31) * 80}); T.ff(0.05)`);
      if (i === 40) await d.shot('bath-soap');
    }
    await d.js(`T.up(${c[0]}, ${c[1]}); T.ff(0.3)`);
    await d.shot('bath-foamy');
    const tool1 = await d.js(`T.scene.tool`);
    console.log('  tool after soap:', tool1);
    await d.js(`T.down(${c[0]}, ${c[1] - 150})`);
    for (let i = 0; i < 90; i++) {
      await d.js(`T.move(${c[0] + Math.sin(i * 0.4) * 110}, ${c[1] - 120}); T.ff(0.06)`);
      if (i === 30) await d.shot('bath-shower');
    }
    await d.js(`T.up(${c[0]}, ${c[1]}); T.ff(0.3)`);
    const tool2 = await d.js(`T.scene.tool`);
    console.log('  tool after shower:', tool2);
    await d.js(`T.down(${c[0]}, ${c[1]})`);
    for (let i = 0; i < 90; i++) {
      await d.js(`T.move(${c[0] + Math.sin(i * 0.7) * 120}, ${c[1] + Math.cos(i * 0.31) * 80}); T.ff(0.05)`);
      if (i === 30) await d.shot('bath-towel');
    }
    await d.js(`T.up(${c[0]}, ${c[1]}); T.ff(0.6)`);
    await d.shot('bath-poof');
    await d.js(`T.ff(4)`);
    await d.shot('bath-done');
    await d.sleep(800);
    assert((await d.js(`T.pet().clean`)) > 80, 'the bath cleans it');
  },

  async walk(d) {
    await d.open('web/?demo=walk&breed=puppling&hour=9');
    const { w, h, u } = await d.js(`(() => { const v = __game.view; return { w: v.w, h: v.h, u: v.u }; })()`);
    await d.js(`T.down(${w * 0.86}, ${h * 0.62})`);
    await d.js(`T.ff(1.2)`);
    await d.shot('walk-lead');
    await d.js(`T.ff(10)`);
    await d.shot('walk-along');
    const dist = await d.js(`T.scene.dist`);
    assert(dist > 300 * u, `a held finger walks the pet (went ${dist})`);
    await d.js(`T.ff(30)`);
    await d.shot('walk-further');
    await d.js(`T.up(${w * 0.86}, ${h * 0.62}); T.ff(1)`);
    await d.js(`T.scene.dist = 5000; T.scene.berries = 7; T.click('[data-action="walkHome"]')`);
    await d.sleep(500);
    await d.shot('walk-summary');
    await d.js(`T.click('#walkDone')`);
    await d.waitFor(`T.scene === __scenes.home`, 4000);
    await d.sleep(700);
    await d.shot('walk-home');
  },

  async fetch(d) {
    await d.open('web/?demo=fetch&breed=cubling&hour=10');
    const { w, h, u } = await d.js(`(() => { const v = __game.view; return { w: v.w, h: v.h, u: v.u }; })()`);
    for (let t = 0; t < 5; t++) {
      await d.js(`T.down(${w / 2}, ${h - 90 * u})`);
      for (let i = 1; i <= 5; i++) {
        await d.js(`T.move(${w / 2 + i * 3}, ${h - 90 * u - i * 70 * u}); (() => { const e = performance.now(); while (performance.now() - e < 8); })()`);
      }
      await d.js(`T.up(${w / 2 + 15}, ${h - 90 * u - 350 * u})`);
      assert((await d.js(`T.scene.phase`)) === 'flying', 'a flick throws the ball');
      await d.js(`T.ff(0.5)`);
      if (t === 0) await d.shot('fetch-fly');
      await d.js(`T.ff(0.8)`);
      if (t === 0) await d.shot('fetch-run');
      for (let k = 0; k < 40 && (await d.js(`T.scene.phase`)) !== 'ready' && (await d.js(`T.scene.phase`)) !== 'over'; k++) {
        await d.js(`T.ff(0.25)`);
        if (t === 0 && k === 8) await d.shot('fetch-return');
      }
      const phase = await d.js(`T.scene.phase`);
      assert(phase === 'ready' || phase === 'over', `the ball comes back (stuck in ${phase})`);
    }
    await d.sleep(500);
    await d.shot('fetch-end');
    assert(await d.js(`T.has('#gameAgain')`), 'the game ends after five throws');
    await d.js(`T.click('#gameHome')`);
    await d.waitFor(`T.scene === __scenes.home`, 4000);
  },

  async snack(d) {
    await d.open('web/?demo=snack&breed=drakling&hour=13');
    const w = await d.js(`__game.view.w`);
    for (let i = 0; i < 40; i++) {
      await d.js(`(() => { const s = T.scene; const near = s.items.filter(x => x.kind !== 'bad').sort((a,b) => b.y - a.y)[0]; if (near) s.targetX = near.sx ?? near.x; })(); T.ff(0.4)`);
      if (i === 12) await d.shot('snack-mid');
      if (await d.js(`T.scene.over`)) break;
    }
    await d.js(`T.ff(24)`);
    assert(await d.js(`T.scene.over`), 'the round ends');
    const score = await d.js(`T.scene.score`);
    assert(score > 0, 'catching snacks scores');
    await d.sleep(500);
    await d.shot('snack-end');
    await d.js(`T.click('#gameAgain')`);
    await d.waitFor(`T.scene.t < 1 && !T.scene.over`, 4000);
    void w;
  },

  async hide(d) {
    await d.open('web/?demo=hide&breed=kitling&coat=lilac&hour=16');
    await d.js(`T.ff(0.2)`);
    await d.shot('hide-start');
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 60 && (await d.js(`T.scene.phase`)) !== 'seek'; i++) await d.js(`T.ff(0.2)`);
      assert((await d.js(`T.scene.phase`)) === 'seek', 'the pet hides and it is your turn to look');
      if (round === 0) await d.shot('hide-seek');
      // Wrong spot, then the right one.
      const wrong = await d.js(`(() => { const s = T.scene.spots.find(x => x !== T.scene.hidden); return [s.x, s.y - 30]; })()`);
      await d.js(`T.tap(${wrong[0]}, ${wrong[1]}); T.ff(0.3)`);
      if (round === 0) await d.shot('hide-wrong');
      const right = await d.js(`(() => { const s = T.scene.hidden; return [s.x, s.y - 30]; })()`);
      await d.js(`T.tap(${right[0]}, ${right[1]}); T.ff(0.5)`);
      if (round === 0) await d.shot('hide-found');
      assert((await d.js(`T.scene.phase`)) === 'found', 'tapping the right spot finds it');
      await d.js(`T.ff(2)`);
    }
    await d.sleep(500);
    await d.shot('hide-end');
    assert(await d.js(`T.has('#gameAgain')`), 'four rounds and it ends');
  },

  async menus(d) {
    await d.open('web/?demo=home&breed=bunling&hour=18&berries=2000');
    const open = async (action, name) => {
      await d.js(`T.click('[data-action="${action}"]')`);
      await d.sleep(450);
      await d.shot(name, { draw: false });
    };
    await open('menu', 'menu');
    await d.js(`T.click('[data-action="settings"]')`);
    await d.sleep(350);
    await d.shot('menu-settings', { draw: false });
    await d.js(`__game.ui.hideSheet()`);
    await d.sleep(300);
    await d.js(`__game.ui.on_stamps()`);
    await d.sleep(350);
    await d.shot('menu-stamps', { draw: false });
    await d.js(`__game.ui.hideSheet()`);
    await d.sleep(300);
    await d.js(`__game.ui.on_closet(document.body, 'head')`);
    await d.sleep(350);
    await d.shot('menu-closet', { draw: false });
    assert(await d.js(`T.scene.lift.target > 0`), 'the camera moves so the pet stands above the closet');
    await d.js(`__game.ui.hideSheet()`);
    assert((await d.js(`T.scene.lift.target`)) === 0, 'and moves back when the closet closes');
    await d.sleep(300);
    await d.js(`__game.ui.on_rooms()`);
    await d.sleep(350);
    await d.shot('menu-rooms', { draw: false });
    await d.js(`__game.ui.hideSheet()`);
    await d.sleep(300);
    await d.js(`__game.state.pet.outfit.head = 'bow'; __game.state.pet.outfit.face = 'glasses'; __game.state.pet.outfit.neck = 'scarf'; __game.pet.outfit = __game.state.pet.outfit;`);
    await d.sleep(500);
    await d.shot('dressed');
  },

  async moments(d) {
    await d.open('web/?demo=home&breed=kitling&hour=20&days=1');
    await d.js(`__game.actor.play(T.scene.pressGlass()); T.ff(0.55)`);
    await d.shot('moment-glass-0');
    await d.js(`T.ff(0.45)`);
    await d.shot('moment-glass-1');
    await d.js(`T.ff(0.5)`);
    await d.shot('moment-glass-2');
    await d.js(`T.ff(6)`);
    await d.js(`__game.actor.play(T.scene.lickGlass()); T.ff(0.6)`);
    await d.shot('moment-lick-0');
    await d.js(`T.ff(0.3)`);
    await d.shot('moment-lick-1');
    await d.js(`T.ff(0.3)`);
    await d.shot('moment-lick-2');
    await d.js(`T.ff(6)`);
    await d.js(`T.scene.thought = { icon: '🍎', t: 3 }; T.ff(0.3)`);
    await d.shot('moment-thought');
    await d.js(`T.ff(3.3)`);
    for (const [scene, name] of [['dance', 'dance'], ['chaseTail', 'chase'], ['stretch', 'stretch'], ['sneeze', 'sneeze'], ['yawn', 'yawn']]) {
      await d.js(`__game.actor.play(__game.actor.${scene}()); T.ff(0.6)`);
      await d.shot(`moment-${name}-0`);
      await d.js(`T.ff(0.5)`);
      await d.shot(`moment-${name}-1`);
      await d.js(`T.ff(5)`);
    }
    await d.js(`__game.ui.levelUp(5, 40)`);
    await d.sleep(300);
    await d.shot('moment-levelup', { wait: 200 });
    await d.js(`T.scene.grew('kid'); T.ff(2.4)`);
    await d.sleep(400);
    await d.shot('moment-grew');
    await d.js(`T.ff(6)`);
    await d.shot('moment-grown');
  },

  async friend(d) {
    await d.open('web/?demo=walk&breed=bunling&hour=18');
    const { w, h } = await d.js(`(() => { const v = __game.view; return { w: v.w, h: v.h }; })()`);
    await d.js(`T.down(${w * 0.8}, ${h * 0.6}); T.ff(4); T.scene.friendTimer = 0; T.scene.dist = 999; T.ff(0.2)`);
    for (let i = 0; i < 20 && !(await d.js(`T.scene.friend?.met`)); i++) await d.js(`T.ff(0.25)`);
    await d.js(`T.ff(0.3)`);
    await d.shot('friend-meet');
    await d.js(`T.ff(0.7)`);
    await d.shot('friend-love');
    await d.js(`T.up(${w * 0.8}, ${h * 0.6}); __game.fakeHour = 22; T.ff(6)`);
    await d.shot('walk-night');
  },

  async sound(d) {
    await d.open('web/?demo=home&breed=kitling&hour=11&sound=1');
    await d.js(`(() => {
      __audio.unlock();
      const a = __audio;
      const an = a.ctx.createAnalyser();
      an.fftSize = 2048;
      a.master.connect(an);
      const buf = new Float32Array(an.fftSize);
      window.__peak = 0;
      window.__meter = setInterval(() => {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) window.__peak = Math.max(window.__peak, Math.abs(v));
      }, 10);
    })()`);
    await d.waitFor(`__audio.ctx.state === 'running'`, 5000);
    const names = ['hello', 'happy', 'chirrup', 'sad', 'whine', 'surprise', 'giggle', 'yum', 'yuck', 'yawn', 'ow', 'sniff', 'sneeze', 'burp', 'snore', 'mumble', 'babble', 'boop', 'boing', 'plop', 'thud', 'pop', 'chomp', 'gulp', 'whoosh', 'sparkle', 'chime', 'fanfare', 'coin', 'click', 'camera', 'crack', 'poof', 'bubble', 'soap', 'splash', 'rumble'];
    const results = [];
    for (const name of names) {
      await d.js(`window.__peak = 0; __audio.${name}()`);
      await d.sleep(name === 'fanfare' || name === 'yawn' ? 700 : 340);
      results.push([name, await d.js(`window.__peak`)]);
      await d.sleep(120);
    }
    const quiet = results.filter(([, p]) => p < 0.01).map(([n]) => n);
    const loud = results.filter(([, p]) => p > 0.98).map(([n]) => n);
    console.log('  peaks:', results.map(([n, p]) => `${n} ${p.toFixed(2)}`).join(', '));
    assert(!quiet.length, `silent: ${quiet.join(', ')}`);
    if (loud.length) console.log('  near clipping:', loud.join(', '));
    await d.js(`window.__peak = 0; __audio.startMusic('day')`);
    await d.sleep(2500);
    const music = await d.js(`window.__peak`);
    console.log('  music peak:', music.toFixed(3));
    assert(music > 0.005, 'the music box plays');
    await d.js(`__audio.stopMusic(); window.__peak = 0; __audio.purr(true)`);
    await d.sleep(800);
    const purr = await d.js(`window.__peak`);
    await d.js(`__audio.purr(false); window.__peak = 0; __audio.water(true)`);
    await d.sleep(600);
    const water = await d.js(`window.__peak`);
    await d.js(`__audio.water(false)`);
    console.log('  purr peak:', purr.toFixed(3), 'water peak:', water.toFixed(3));
    assert(purr > 0.005 && water > 0.005, 'purr and water make sound');
    // And a whole session with sound on.
    await d.js(`T.scene.giveFood('apple'); T.ff(3)`);
    await d.js(`__goTo(__scenes.bath); T.ff(0.3); T.tap(200, 500); T.ff(0.3)`);
    await d.js(`__goTo(__scenes.walk); T.down(340, 560); T.ff(6); T.up(340, 560)`);
    await d.js(`__goTo(__scenes.snackGame); T.ff(6)`);
    await d.js(`__goTo(__scenes.hideGame); T.ff(5)`);
    await d.js(`__goTo(__scenes.fetchGame); T.ff(1)`);
    await d.js(`__goTo(__scenes.home); T.ff(2); clearInterval(__meter)`);
  },

  async rooms(d) {
    await d.open('web/?demo=home&breed=cubling&hour=14&berries=4000');
    await d.js(`__game.ui.on_rooms()`);
    await d.sleep(300);
    for (const id of ['mint', 'lilac', 'sky', 'sunny', 'night', 'peach']) {
      await d.js(`document.querySelector('[data-action="room"][data-id="${id}"]').click()`);
      await d.sleep(200);
      assert((await d.js(`__game.state.pet.room`)) === id, `room ${id} is in use`);
      await d.js(`__game.ui.hideSheet(); T.scene.idleIn = 99; T.ff(0.4)`);
      await d.shot(`room-${id}`);
      await d.js(`__game.ui.on_rooms()`);
      await d.sleep(150);
    }
  },

  async food(d) {
    await d.open('web/?demo=home&breed=puppling&hour=12&tummy=20&berries=4000');
    const taste = await d.js(`(async () => { const c = await import('./src/catalog.js'); return c.TASTES.puppling; })()`);
    console.log('  puppling tastes:', JSON.stringify(taste));
    const love = Array.isArray(taste.love) ? taste.love[0] : taste.love;
    await d.js(`T.scene.idleIn = 99; __game.state.foodsTried = []; T.scene.giveFood('${taste.hate}'); T.ff(0.7)`);
    await d.shot('food-hate-0');
    await d.js(`T.ff(0.8)`);
    await d.shot('food-hate-1');
    await d.js(`T.ff(4)`);
    await d.js(`T.scene.idleIn = 99; T.scene.giveFood('${love}'); T.ff(0.7)`);
    await d.shot('food-love-0');
    await d.js(`T.ff(0.9)`);
    await d.shot('food-love-1');
    await d.js(`T.ff(0.9)`);
    await d.shot('food-love-2');
    await d.js(`T.ff(5)`);
    await d.js(`__game.state.pet.tummy = 100; T.scene.idleIn = 99; T.scene.giveFood('apple'); T.ff(0.6)`);
    await d.shot('food-full');
    await d.js(`T.ff(3); __game.state.pet.bathDirt = 1; T.ff(3)`);
    await d.shot('home-muddy');
  },

  async talk(d) {
    await d.open('web/?demo=home&breed=puppling&hour=12');
    // Headless Chrome has no microphone: feed it a voice-like tone that starts and stops.
    await d.js(`(() => {
      __audio.unlock();
      const ctx = __audio.ctx;
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.frequency.value = 220;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      window.__voice = (on) => { gain.gain.value = on ? 0.5 : 0; };
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
    })()`);
    await d.js(`T.click('[data-action="talk"]')`);
    await d.waitFor(`__talk.state === 'listening'`, 5000);
    await d.js(`T.ff(0.6)`);
    await d.shot('talk-listening');
    await d.sleep(800);
    await d.js(`__voice(true)`);
    await d.waitFor(`__talk.state === 'hearing'`, 5000);
    await d.sleep(1200);
    await d.js(`T.ff(0.4)`);
    await d.shot('talk-hearing');
    await d.js(`__voice(false)`);
    await d.waitFor(`__talk.state === 'speaking'`, 5000);
    await d.sleep(200);
    await d.js(`T.ff(0.2)`);
    await d.shot('talk-speaking');
    const level = await d.js(`__talk.level`);
    console.log('  lip sync level while speaking:', level);
    assert(level > 0.02, 'the mouth moves with the voice');
    await d.waitFor(`__talk.state === 'listening'`, 8000);
    await d.js(`T.click('[data-action="talk"]')`);
    assert((await d.js(`__talk.state`)) === 'off', 'talk mode turns off');
  },
};

/** Every main screen at a size. */
async function layout(d, tag) {
  for (const [scene, q] of [['home', 'breed=kitling&hour=11'], ['home', 'breed=bunling&hour=21&room=night'], ['bath', 'breed=foxling&hour=15'], ['walk', 'breed=puppling&hour=9'], ['fetch', 'breed=cubling&hour=10'], ['snack', 'breed=drakling&hour=13'], ['hide', 'breed=kitling&hour=16']]) {
    await d.open(`web/?demo=${scene}&${q}`, 2200);
    await d.js(`T.ff(0.4)`);
    await d.shot(`${tag}-${scene}${q.includes('night') ? '-night' : ''}`);
  }
  await d.open('web/', 1500);
  await d.shot(`${tag}-hatch`);
}
const SIZES = { small: [320, 568], tablet: [820, 1180], wide: [844, 390], ipadwide: [1180, 820] };
for (const [tag, [width, height]] of Object.entries(SIZES)) {
  flows[`layout-${tag}`] = (d) => layout(d, tag);
  flows[`layout-${tag}`].size = { width, height };
}

const names = process.argv.slice(2);
const chosen = names.length ? names : Object.keys(flows);
let failed = 0;
for (const name of chosen) {
  process.stdout.write(`${name}\n`);
  const t0 = Date.now();
  try {
    await drive({ media: name === 'talk', ...(flows[name].size ?? {}) }, flows[name]);
    console.log(`  ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (e) {
    failed += 1;
    console.log(`  ${e.message}`);
  }
}
console.log(failed ? `${failed} of ${chosen.length} flows failed` : `all ${chosen.length} flows passed`);
process.exit(failed ? 1 : 0);
