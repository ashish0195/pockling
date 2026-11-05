// Every sound is synthesized: no recordings, nothing to download. The pet's voice is a pair of
// oscillators through a vowel filter with a pitch contour, so each breed sounds like itself and it can
// babble in its own language. There's also a purr, chomps, plops, sparkles and a small music box.
// Phone speakers play little below about 300 Hz, so anything that matters has some sound above that:
// `node tools/sounds.mjs` measures each one.
import { rand, pick, clamp } from './util.js';

// Hearts popping up in quick succession climb this scale, so a long stroke sings. It uses only the notes
// the day and night music boxes share (D, E, G, A), so it's always in tune with whichever is playing.
const HEART_NOTES = [783.99, 880, 1174.66, 1318.51, 1567.98, 1760, 2349.32, 2637.02];
// A little tune to dance to, as steps from the pet's own note.
const DANCE_STEPS = [1, 1.125, 1.25, 1.5, 1.25, 1.125, 1.333, 1.5];
// Turns a sine into one short pulse a cycle: the beat of a purr.
const PULSE = Float32Array.from({ length: 256 }, (_, i) => Math.max(0, (i / 255) * 2 - 1) ** 2.2);

class Audio_ {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.voiceBase = 1;
    this.purrNode = null;
    this.musicTimer = 0;
    this.musicMood = 'day';
    this.musicStep = 0;
    this.last = {};
    this.heartRun = 0;
  }

  /** Browsers only allow sound after a touch, so call this from one. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return;
      if (navigator.audioSession) navigator.audioSession.type = 'ambient';
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createDynamicsCompressor();
      this.master.threshold.value = -16;
      this.master.ratio.value = 5;
      this.master.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.85;
      this.sfx.connect(this.master);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0.24;
      // A little room around the music box.
      const delay = c.createDelay(1);
      delay.delayTime.value = 0.28;
      const feedback = c.createGain();
      feedback.gain.value = 0.3;
      const wet = c.createGain();
      wet.gain.value = 0.4;
      this.musicBus.connect(this.master);
      this.musicBus.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.master);
      this.noise = this.makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoise() {
    const c = this.ctx;
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setOn(sfx, music) {
    this.sfxOn = sfx;
    this.musicOn = music;
    if (!sfx) this.purr(false);
    if (!music) this.stopMusic();
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    // iOS also has its own state, 'interrupted', after a call or a trip to the background.
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume();
  }

  get ready() {
    return this.ctx && this.sfxOn;
  }

  /** False if this sound played less than gap seconds ago, so quick repeats don't pile up. */
  spaced(key, gap) {
    if (!this.ready) return false;
    const now = this.ctx.currentTime;
    if (now - (this.last[key] ?? -1e9) < gap) return false;
    this.last[key] = now;
    return true;
  }

  /**
   * One voiced note with a pitch contour. contour is [[time 0..1, multiplier], ...]. roll flutters the
   * voice about 24 times a second, from 0 to 1, for a rolled "brrr" like a cat's trill.
   */
  chirp(freq, dur, { contour = [[0, 1], [1, 1]], at = 0, vol = 0.34, vowel = 1500, q = 2.2, vib = 0, roll = 0, type = 'triangle' } = {}) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = type;
    o2.type = 'sine';
    const set = (p, mult) => {
      p.setValueAtTime(freq * contour[0][1] * mult, t);
      for (const [when, value] of contour.slice(1)) p.exponentialRampToValueAtTime(Math.max(30, freq * value * mult), t + dur * when);
    };
    set(o1.frequency, 1);
    set(o2.frequency, 2.01);
    const g2 = c.createGain();
    g2.gain.value = 0.3;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(vowel, t);
    f.frequency.linearRampToValueAtTime(vowel * 1.35, t + dur * 0.6);
    f.Q.value = q;
    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 5200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25));
    g.gain.setValueAtTime(vol, t + dur * 0.62);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(f);
    o2.connect(g2);
    g2.connect(f);
    // Some of the plain tone keeps it round and soft rather than nasal.
    const dry = c.createGain();
    dry.gain.value = 0.5;
    o1.connect(dry);
    dry.connect(low);
    f.connect(low);
    if (roll) {
      // The flutter sits before the envelope, so the note still starts and ends in silence.
      const roller = c.createGain();
      roller.gain.value = 1 - roll / 2;
      const flutter = c.createOscillator();
      flutter.frequency.value = 24;
      const depth = c.createGain();
      depth.gain.value = roll / 2;
      flutter.connect(depth);
      depth.connect(roller.gain);
      low.connect(roller);
      roller.connect(g);
      flutter.start(t);
      flutter.stop(t + dur + 0.02);
    } else {
      low.connect(g);
    }
    g.connect(this.sfx);
    if (vib) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 7;
      depth.gain.value = freq * vib;
      lfo.connect(depth);
      depth.connect(o1.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.02);
    o2.stop(t + dur + 0.02);
  }

  burst(dur, { at = 0, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', slide = 1 } = {}) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  tone(freq, dur, { at = 0, vol = 0.2, type = 'sine', slide = 1 } = {}) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A small glassy bell: a sine and a quick inharmonic partial, as a real bell has. */
  ting(freq, dur, { at = 0, vol = 0.08 } = {}) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.frequency.value = freq * 2.76;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.02);
    o2.stop(t + dur + 0.02);
  }

  // ── The pet's voice ──

  get v() {
    return 720 * this.voiceBase;
  }

  hello() {
    this.chirp(this.v, 0.2, { contour: [[0, 0.8], [0.5, 1.28], [1, 1.1]] });
    this.chirp(this.v * 1.2, 0.26, { at: 0.2, contour: [[0, 1], [0.5, 1.4], [1, 1.2]], vib: 0.01 });
  }

  happy() {
    const c = [[0, 0.9], [0.6, 1.4], [1, 1.25]];
    this.chirp(this.v * 1.05, 0.14, { contour: c });
    this.chirp(this.v * 1.25, 0.14, { contour: c, at: 0.13 });
    this.chirp(this.v * 1.5, 0.22, { contour: c, at: 0.26, vib: 0.012 });
  }

  chirrup() {
    this.chirp(this.v * rand(0.95, 1.2), rand(0.1, 0.17), { contour: [[0, 0.9], [1, rand(1.1, 1.4)]] });
  }

  sad() {
    this.chirp(this.v * 0.9, 0.42, { contour: [[0, 1.1], [0.35, 1.2], [1, 0.72]], vib: 0.018 });
  }

  whine() {
    this.chirp(this.v * 1.05, 0.5, { contour: [[0, 0.92], [0.5, 1.18], [1, 0.82]], vib: 0.024, vol: 0.28 });
  }

  surprise() {
    this.chirp(this.v * 1.15, 0.18, { contour: [[0, 0.8], [1, 1.75]], vol: 0.38 });
  }

  giggle() {
    for (let i = 0; i < 5; i++) {
      this.chirp(this.v * (1.25 + i * 0.03) * rand(0.97, 1.05), 0.075, { at: i * 0.092, contour: [[0, 1.2], [1, 0.95]], vol: 0.3 });
    }
  }

  yum() {
    this.chirp(this.v * 0.8, 0.3, { contour: [[0, 0.9], [0.5, 1.1], [1, 0.98]], vowel: 900, vib: 0.03 });
    this.chirp(this.v * 0.96, 0.38, { at: 0.26, contour: [[0, 1], [0.5, 1.2], [1, 1]], vowel: 1000, vib: 0.03 });
  }

  yuck() {
    this.chirp(this.v * 0.62, 0.34, { contour: [[0, 1.2], [1, 0.62]], vowel: 700, type: 'sawtooth', vol: 0.2, vib: 0.05 });
    this.burst(0.2, { at: 0.26, vol: 0.2, freq: 1800, q: 0.7 });
  }

  yawn() {
    this.chirp(this.v * 0.72, 0.85, { contour: [[0, 0.72], [0.35, 1.25], [1, 0.62]], vowel: 800, q: 1.5, vol: 0.27 });
  }

  ow() {
    this.chirp(this.v * 1.1, 0.26, { contour: [[0, 1.5], [1, 0.72]], vol: 0.34 });
  }

  sniff() {
    for (let i = 0; i < 3; i++) this.burst(0.07, { at: i * 0.12, vol: 0.12, freq: 3200, q: 0.8 });
  }

  sneeze() {
    this.chirp(this.v * 0.9, 0.2, { contour: [[0, 0.85], [1, 1.2]], vol: 0.2 });
    this.burst(0.24, { at: 0.34, vol: 0.34, freq: 2600, q: 0.6, slide: 0.5 });
    this.chirp(this.v * 1.3, 0.08, { at: 0.34, contour: [[0, 1.4], [1, 0.8]], vol: 0.3 });
  }

  burp() {
    this.chirp(150 * this.voiceBase, 0.42, { contour: [[0, 1.2], [0.3, 0.8], [1, 0.62]], vowel: 420, q: 1.2, type: 'sawtooth', vol: 0.34, vib: 0.05 });
  }

  /** In through the nose, out with a little whistle. */
  snore() {
    this.burst(0.95, { vol: 0.06, freq: 560, q: 1.6, slide: 1.8 });
    this.chirp(150 * this.voiceBase, 0.9, { contour: [[0, 0.85], [1, 1.08]], vowel: 520, q: 1.1, type: 'sawtooth', vol: 0.04 });
    this.tone(rand(1150, 1350), 0.7, { at: 1.1, vol: 0.035, slide: 0.72 });
    this.burst(0.75, { at: 1.1, vol: 0.035, freq: 2400, q: 0.8, slide: 0.6 });
  }

  mumble() {
    this.babble(2, 0.5);
  }

  /** Stroked or cuddled: a soft, rolled "mrrrm" that lifts a little at the end. */
  coo() {
    this.chirp(this.v * rand(0.84, 0.96), rand(0.34, 0.46), { contour: [[0, 0.9], [0.45, rand(1.12, 1.22)], [1, rand(0.96, 1.04)]], vowel: 950, q: 1.6, vib: 0.02, roll: 0.5, vol: 0.22 });
  }

  /** The rolled little "brrrp?" of being pleased to see you. */
  trill() {
    this.chirp(this.v * rand(0.95, 1.05), 0.24, { contour: [[0, 0.88], [1, 1.32]], vowel: 1300, roll: 0.6, vol: 0.26 });
  }

  /** Pulled like dough: squeaks that climb the further it stretches. */
  squeak(level = 0) {
    this.chirp(this.v * (1.18 + level * 0.16), 0.13, { contour: [[0, 0.92], [1, 1.22]], vowel: 2100, q: 2.6, vol: 0.24 });
  }

  /** "Wheee!" */
  wee() {
    this.chirp(this.v * rand(1.02, 1.12), 0.42, { contour: [[0, 0.82], [0.55, 1.62], [1, 1.5]], vowel: 1700, vib: 0.012, vol: 0.28 });
  }

  /** A big stretch: a straining "nnnn" that rises, then an "ahh". */
  stretchy() {
    this.chirp(this.v * 0.82, 0.62, { contour: [[0, 0.86], [0.8, 1.22], [1, 1.28]], vowel: 1000, q: 1.8, vib: 0.022, vol: 0.22 });
    this.chirp(this.v * 1.05, 0.42, { at: 0.66, contour: [[0, 1.18], [1, 0.8]], vowel: 800, q: 1.4, vol: 0.18 });
  }

  /** Dizzy: a wobbly slide down, and stars tinkling round its head. */
  dizzy() {
    this.chirp(this.v * 1.05, 0.7, { contour: [[0, 1.25], [0.5, 0.92], [1, 0.74]], vowel: 1100, vib: 0.09, vol: 0.22 });
    this.stars(0.12);
  }

  /** Little stars circling a bumped head. */
  stars(at = 0) {
    for (let i = 0; i < 3; i++) this.ting(2350 + i * 280, 0.22, { at: at + i * 0.16, vol: 0.055 });
  }

  /** "Hm?" */
  curious() {
    this.chirp(this.v * 0.92, 0.2, { contour: [[0, 0.9], [1, 1.38]], vowel: 1100, q: 1.8, vol: 0.18 });
  }

  /** One "la" of a song to dance to; i walks through the tune. */
  la(i = 0) {
    this.chirp(this.v * DANCE_STEPS[i % DANCE_STEPS.length], 0.17, { contour: [[0, 0.97], [1, 1.03]], vowel: 1400, vib: 0.01, vol: 0.19 });
  }

  /** "Yay!", a little higher with each hop. */
  yay(i = 0) {
    this.chirp(this.v * (1.15 + i * 0.12), 0.16, { contour: [[0, 0.9], [0.6, 1.4], [1, 1.3]], vol: 0.26 });
  }

  /** Pet-talk: a burst of little syllables. */
  babble(n = 4, gain = 1) {
    if (!this.ready) return;
    let at = 0;
    for (let i = 0; i < n; i++) {
      const d = rand(0.07, 0.14);
      const f = this.v * rand(0.82, 1.5);
      this.chirp(f, d, { at, contour: [[0, rand(0.85, 1.15)], [1, rand(0.85, 1.25)]], vol: 0.28 * gain, vowel: pick([800, 1200, 1800, 2400]) });
      at += d + rand(0.01, 0.05);
    }
    return at;
  }

  // ── Purring ──

  purr(on_) {
    if (!this.ctx) return;
    if (on_ && !this.sfxOn) return;
    const c = this.ctx;
    if (on_ && !this.purrNode) {
      const t = c.currentTime;
      // Noise pulsing about 26 times a second, louder breathing out than in. A real purr's body is low,
      // so most of the noise sits in a band a phone speaker can play, with a little low end for headphones.
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const band = c.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 480;
      band.Q.value = 0.8;
      const low = c.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 300;
      low.Q.value = 1.5;
      const gate = c.createGain();
      gate.gain.value = 0.06;
      const lfo = c.createOscillator();
      lfo.frequency.value = 26;
      const pulse = c.createWaveShaper();
      pulse.curve = PULSE;
      lfo.connect(pulse);
      pulse.connect(gate.gain);
      const breathe = c.createGain();
      breathe.gain.value = 0.7;
      const breath = c.createOscillator();
      breath.frequency.value = 0.75;
      const breathDepth = c.createGain();
      breathDepth.gain.value = 0.3;
      breath.connect(breathDepth);
      breathDepth.connect(breathe.gain);
      // Brighter on the way out.
      const bright = c.createGain();
      bright.gain.value = 110;
      breath.connect(bright);
      bright.connect(band.frequency);
      const out = c.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(1.2, t + 0.25);
      s.connect(band);
      band.connect(gate);
      s.connect(low);
      low.connect(gate);
      gate.connect(breathe);
      breathe.connect(out);
      out.connect(this.sfx);
      s.start();
      lfo.start();
      breath.start();
      this.purrNode = { s, lfo, breath, out };
    } else if (!on_ && this.purrNode) {
      const { s, lfo, breath, out } = this.purrNode;
      this.purrNode = null;
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      for (const n of [s, lfo, breath]) n.stop(t + 0.35);
    }
  }

  // ── Everything else ──

  boop() {
    this.tone(880, 0.1, { vol: 0.36, slide: 1.6 });
    this.tone(1320, 0.09, { at: 0.06, vol: 0.2, slide: 1.15 });
  }

  boing() {
    this.tone(180, 0.28, { vol: 0.24, slide: 2.6, type: 'triangle' });
    this.tone(330, 0.24, { vol: 0.12, slide: 2.4 });
  }

  plop() {
    this.tone(320, 0.12, { vol: 0.2, slide: 0.45 });
  }

  thud() {
    this.tone(130, 0.14, { vol: 0.34, slide: 0.5 });
    // And a soft "pomf" a phone speaker can play.
    this.tone(320, 0.12, { vol: 0.16, slide: 0.55, type: 'triangle' });
    this.burst(0.1, { vol: 0.18, freq: 700, q: 0.9, slide: 0.45 });
  }

  /** The ting of a heart popping up. Hearts close together climb the scale. */
  heart() {
    if (!this.spaced('heart', 0.16)) return;
    const now = this.ctx.currentTime;
    this.heartRun = now - (this.heartAt ?? -1e9) < 1.3 ? this.heartRun + 1 : 0;
    this.heartAt = now;
    this.ting(HEART_NOTES[this.heartRun % HEART_NOTES.length], 0.55, { vol: 0.1 });
  }

  /** A tiny padded footstep. */
  step() {
    this.tone(rand(380, 440), 0.05, { vol: 0.07, slide: 0.55, type: 'triangle' });
    this.burst(0.025, { vol: 0.03, freq: 1500, q: 1.1 });
  }

  /** Scratching behind an ear. */
  scritch() {
    this.burst(0.055, { vol: 0.12, freq: rand(3000, 4400), q: 1.6, slide: 0.75 });
  }

  pop() {
    this.tone(rand(700, 1000), 0.06, { vol: 0.16, slide: 2.1 });
  }

  chomp() {
    this.burst(0.08, { vol: 0.34, freq: rand(900, 1500), q: 0.8, slide: 0.5 });
    this.burst(0.05, { at: 0.06, vol: 0.2, freq: rand(2000, 2800), q: 1 });
  }

  gulp() {
    this.tone(440, 0.16, { vol: 0.24, slide: 0.45 });
  }

  whoosh() {
    this.burst(0.3, { vol: 0.22, freq: 800, q: 0.8, slide: 3 });
  }

  sparkle() {
    for (let i = 0; i < 3; i++) this.tone(rand(1900, 3200), 0.13, { at: i * 0.05, vol: 0.08 });
  }

  chime() {
    [659, 880, 1109].forEach((f, i) => this.tone(f, 0.34, { at: i * 0.09, vol: 0.1 }));
  }

  fanfare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone(f, 0.45, { at: i * 0.1, vol: 0.13, type: 'triangle' });
      this.tone(f * 2, 0.3, { at: i * 0.1, vol: 0.03 });
    });
  }

  coin() {
    this.tone(1175, 0.07, { vol: 0.1, type: 'triangle' });
    this.tone(1760, 0.16, { at: 0.06, vol: 0.1, type: 'triangle' });
  }

  click() {
    this.tone(820, 0.05, { vol: 0.09, slide: 0.8 });
  }

  camera() {
    this.burst(0.05, { vol: 0.32, freq: 3400, q: 0.8 });
    this.burst(0.07, { at: 0.08, vol: 0.26, freq: 2200, q: 0.8 });
  }

  crack() {
    this.burst(0.05, { vol: 0.34, freq: 3200, q: 1.5 });
    this.tone(1600, 0.04, { vol: 0.08, slide: 0.5 });
  }

  poof() {
    this.burst(0.5, { vol: 0.24, freq: 1200, q: 0.6, slide: 0.25 });
    this.chime();
  }

  bubble() {
    this.tone(rand(500, 900), 0.08, { vol: 0.1, slide: rand(1.6, 2.4) });
  }

  soap() {
    this.burst(0.09, { vol: 0.13, freq: rand(3000, 5000), q: 2 });
  }

  water(on_) {
    if (!this.ctx) return;
    if (on_ && !this.sfxOn) return;
    const c = this.ctx;
    if (on_ && !this.waterNode) {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1400;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.11, c.currentTime + 0.1);
      s.connect(f);
      f.connect(g);
      g.connect(this.sfx);
      s.start();
      this.waterNode = { s, g };
    } else if (!on_ && this.waterNode) {
      const { s, g } = this.waterNode;
      this.waterNode = null;
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.001), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15);
      s.stop(c.currentTime + 0.2);
    }
  }

  splash() {
    this.burst(0.3, { vol: 0.22, freq: 1800, q: 0.7, slide: 0.5 });
  }

  rumble() {
    this.tone(70, 0.42, { vol: 0.34, slide: 1.3, type: 'triangle' });
    this.tone(95, 0.3, { at: 0.26, vol: 0.26, slide: 0.8, type: 'triangle' });
    // The gurgle on top, for phone speakers.
    this.chirp(118, 0.5, { contour: [[0, 1], [0.5, 1.25], [1, 0.9]], vowel: 460, q: 1.4, type: 'sawtooth', vol: 0.1, vib: 0.06, roll: 0.5 });
  }

  // ── A small music box ──

  startMusic(mood = 'day') {
    this.musicMood = mood;
    if (this.musicTimer || !this.ctx || !this.musicOn) return;
    const tick = () => {
      this.playBar();
      this.musicTimer = setTimeout(tick, this.barLength * 1000);
    };
    this.musicTimer = setTimeout(tick, 150);
  }

  stopMusic() {
    clearTimeout(this.musicTimer);
    this.musicTimer = 0;
  }

  get barLength() {
    return this.musicMood === 'night' ? 3.6 : 2.4;
  }

  playBar() {
    if (!this.musicOn || !this.ctx || this.ctx.state !== 'running') return;
    const night = this.musicMood === 'night';
    const scale = night ? [261.63, 293.66, 329.63, 392, 440, 523.25] : [392, 440, 493.88, 587.33, 659.25, 783.99];
    const chords = night ? [[130.81, 196], [110, 164.81], [98, 146.83], [130.81, 196]] : [[196, 293.66], [164.81, 246.94], [146.83, 220], [196, 293.66]];
    const bar = this.musicStep++ % chords.length;
    const beat = this.barLength / 8;
    for (const f of chords[bar]) this.bell(f, 0, 0.14, this.barLength * 0.95);
    // A wandering tune on the pentatonic scale: it can't play a wrong note.
    let i = Math.floor(rand(scale.length));
    for (let n = 0; n < 8; n++) {
      if (Math.random() < (night ? 0.42 : 0.6) && (n % 2 === 0 || Math.random() < 0.34)) {
        i = clamp(i + pick([-2, -1, 1, 2]), 0, scale.length - 1);
        this.bell(scale[i], n * beat, 0.26, night ? 1.6 : 1.1);
      }
    }
  }

  bell(freq, at, vol, dur) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    o.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.frequency.value = freq * 3.01;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.22, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o2.start(t);
    o.stop(t + dur);
    o2.stop(t + dur);
  }
}

export const audio = new Audio_();
