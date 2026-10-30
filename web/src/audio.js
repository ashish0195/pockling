// Every sound is synthesized: no recordings, nothing to download. The pet's voice is a pair of
// oscillators through a vowel filter with a pitch contour, so each breed sounds like itself and it can
// babble in its own language. There's also a purr, chomps, plops, sparkles and a small music box.
import { rand, pick, clamp } from './util.js';

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

  /** One voiced note with a pitch contour. contour is [[time 0..1, multiplier], ...]. */
  chirp(freq, dur, { contour = [[0, 1], [1, 1]], at = 0, vol = 0.34, vowel = 1500, q = 2.2, vib = 0, type = 'triangle' } = {}) {
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
    low.connect(g);
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

  snore() {
    const t = 1.3;
    this.burst(t, { vol: 0.055, freq: 380, q: 2.2, slide: 1.4 });
    this.chirp(90 * this.voiceBase, t, { contour: [[0, 0.85], [1, 1.05]], vowel: 340, q: 1, type: 'sawtooth', vol: 0.05 });
    this.burst(1.1, { at: t + 0.15, vol: 0.05, freq: 3000, q: 0.7, slide: 0.6 });
  }

  mumble() {
    this.babble(2, 0.5);
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
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 340;
      f.Q.value = 2;
      const trem = c.createGain();
      trem.gain.value = 0.55;
      const lfo = c.createOscillator();
      lfo.frequency.value = 24;
      const depth = c.createGain();
      depth.gain.value = 0.45;
      lfo.connect(depth);
      depth.connect(trem.gain);
      const breath = c.createOscillator();
      breath.frequency.value = 0.7;
      const breathDepth = c.createGain();
      breathDepth.gain.value = 0.14;
      breath.connect(breathDepth);
      breathDepth.connect(trem.gain);
      const hum = c.createOscillator();
      hum.type = 'sine';
      hum.frequency.value = 48;
      const humGain = c.createGain();
      humGain.gain.value = 0.3;
      const out = c.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.62, t + 0.25);
      s.connect(f);
      f.connect(trem);
      hum.connect(humGain);
      humGain.connect(trem);
      trem.connect(out);
      out.connect(this.sfx);
      s.start();
      lfo.start();
      breath.start();
      hum.start();
      this.purrNode = { s, lfo, breath, hum, out };
    } else if (!on_ && this.purrNode) {
      const { s, lfo, breath, hum, out } = this.purrNode;
      this.purrNode = null;
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      for (const n of [s, lfo, breath, hum]) n.stop(t + 0.35);
    }
  }

  // ── Everything else ──

  boop() {
    this.tone(880, 0.1, { vol: 0.24, slide: 1.5 });
    this.tone(1320, 0.09, { at: 0.06, vol: 0.14, slide: 1.1 });
  }

  boing() {
    this.tone(180, 0.28, { vol: 0.24, slide: 2.6, type: 'triangle' });
  }

  plop() {
    this.tone(320, 0.12, { vol: 0.2, slide: 0.45 });
  }

  thud() {
    this.tone(130, 0.14, { vol: 0.34, slide: 0.5 });
    this.burst(0.07, { vol: 0.14, freq: 500 });
  }

  pop() {
    this.tone(rand(700, 1000), 0.06, { vol: 0.16, slide: 2.1 });
  }

  chomp() {
    this.burst(0.08, { vol: 0.34, freq: rand(900, 1500), q: 0.8, slide: 0.5 });
    this.burst(0.05, { at: 0.06, vol: 0.2, freq: rand(2000, 2800), q: 1 });
  }

  gulp() {
    this.tone(260, 0.16, { vol: 0.24, slide: 0.45 });
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
