// Talk-back: say something and the pet says it back in a squeaky little voice, lips moving in time.
// Nothing is kept: the sound lives in memory only until it has been played back, and never leaves the
// device. In the iOS app the native side does the recording; on the web it's done here.
import { audio } from './audio.js';
import { game } from './game.js';
import { isNative, nativeTalk, on, haptic, setKeepAwake } from './platform.js';
import { clamp, rand } from './util.js';

const PITCH_UP = 1.5;
const SILENCE_END = 0.65;
const MAX_TAKE = 7;
const MIN_TAKE = 0.28;

class WebVoice {
  constructor(cb) {
    this.cb = cb;
    this.floor = 0.008;
  }

  async start() {
    audio.unlock();
    const ctx = audio.ctx;
    if (!ctx) throw new Error('no audio');
    if (ctx.state === 'suspended') await ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.src = ctx.createMediaStreamSource(this.stream);
    this.proc = ctx.createScriptProcessor(2048, 1, 1);
    this.zero = ctx.createGain();
    this.zero.gain.value = 0;
    this.src.connect(this.proc);
    this.proc.connect(this.zero);
    this.zero.connect(ctx.destination);
    this.phase = 'listening';
    this.chunks = [];
    this.pre = [];
    this.quiet = 0;
    this.took = 0;
    this.proc.onaudioprocess = (e) => this.onAudio(e);
    this.cb.state('listening');
  }

  onAudio(e) {
    if (this.phase === 'speaking') return;
    const data = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    const dt = data.length / e.inputBuffer.sampleRate;
    const copy = new Float32Array(data);
    if (this.phase === 'listening') {
      this.floor += (rms - this.floor) * (rms < this.floor ? 0.12 : 0.012);
      this.pre.push(copy);
      if (this.pre.length > 5) this.pre.shift();
      if (rms > Math.max(this.floor * 3.2, 0.018)) {
        this.phase = 'hearing';
        this.chunks = [...this.pre];
        this.quiet = 0;
        this.took = 0;
        this.cb.state('hearing');
      }
    } else if (this.phase === 'hearing') {
      this.chunks.push(copy);
      this.took += dt;
      this.cb.level(clamp(rms * 7));
      this.quiet = rms < Math.max(this.floor * 2.2, 0.012) ? this.quiet + dt : 0;
      if (this.quiet >= SILENCE_END || this.took >= MAX_TAKE) {
        const usable = this.took - this.quiet;
        if (usable < MIN_TAKE) {
          this.phase = 'listening';
          this.pre = [];
          this.cb.state('listening');
        } else {
          this.play(e.inputBuffer.sampleRate);
        }
      }
    }
  }

  play(rate) {
    const ctx = audio.ctx;
    this.phase = 'speaking';
    const trim = Math.floor((SILENCE_END * 0.8 * rate) / 2048);
    const chunks = this.chunks.slice(0, Math.max(1, this.chunks.length - trim));
    const length = chunks.reduce((n, c) => n + c.length, 0);
    const buffer = ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);
    let at = 0;
    let peak = 0.001;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
    const gainUp = Math.min(0.9 / peak, 6);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = PITCH_UP;
    const gain = ctx.createGain();
    gain.gain.value = gainUp;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const tone = ctx.createBiquadFilter();
    tone.type = 'highshelf';
    tone.frequency.value = 2200;
    tone.gain.value = 3;
    src.connect(gain);
    gain.connect(tone);
    tone.connect(analyser);
    analyser.connect(audio.sfx ?? ctx.destination);
    this.cb.state('speaking');
    const levels = new Uint8Array(analyser.fftSize);
    const loop = () => {
      if (this.phase !== 'speaking') return;
      analyser.getByteTimeDomainData(levels);
      let s = 0;
      for (let i = 0; i < levels.length; i++) {
        const v = (levels[i] - 128) / 128;
        s += v * v;
      }
      this.cb.level(clamp(Math.sqrt(s / levels.length) * 3.6));
      this.raf = requestAnimationFrame(loop);
    };
    loop();
    src.onended = () => {
      cancelAnimationFrame(this.raf);
      if (this.phase === 'off') return;
      this.chunks = [];
      this.pre = [];
      this.phase = 'listening';
      this.cb.level(0);
      this.cb.state('listening');
    };
    src.start();
    this.source = src;
  }

  stop() {
    this.phase = 'off';
    cancelAnimationFrame(this.raf);
    try {
      this.source?.stop();
    } catch {
      // It had finished.
    }
    this.proc?.disconnect();
    this.src?.disconnect();
    this.zero?.disconnect();
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.chunks = [];
    this.pre = [];
  }
}

export const talkMode = {
  on: false,
  state: 'off',
  level: 0,

  init() {
    if (this.inited) return;
    this.inited = true;
    on('talk:state', ({ state }) => this.setState(state));
    on('talk:level', ({ level }) => {
      this.level = level;
    });
  },

  async toggle() {
    const home = game.scene;
    if (!home?.talkable) return;
    this.init();
    if (this.on) {
      this.stop();
      return;
    }
    audio.unlock();
    this.on = true;
    home.talk = true;
    audio.stopMusic();
    game.actor.stop();
    game.actor.relax('listen');
    this.button(true);
    setKeepAwake(true);
    game.ui.toast(`Say something! ${game.state.pet.name} will say it back`);
    if (isNative) {
      nativeTalk(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.denied('This browser can\'t use the microphone');
      return;
    }
    try {
      this.voice = new WebVoice({ state: (s) => this.setState(s), level: (l) => { this.level = l; } });
      await this.voice.start();
    } catch (e) {
      console.warn(e);
      this.denied('Pockling needs the microphone for this');
    }
  },

  denied(message) {
    game.ui.toast(message);
    this.stop();
  },

  stop() {
    if (!this.on) return;
    this.on = false;
    this.state = 'off';
    this.level = 0;
    if (isNative) nativeTalk(false);
    else this.voice?.stop();
    this.voice = null;
    this.button(false);
    setKeepAwake(false);
    const home = game.scene;
    if (home) home.talk = false;
    game.pet.mouthExtra = 0;
    game.pet.paws();
    game.pet.ears(0);
    game.pet.r.yaw.target = 0;
    game.pet.r.lean.target = 0;
    game.actor.relax('smile');
    audio.resume();
    audio.startMusic(game.state.pet.asleep ? 'night' : 'day');
  },

  button(active) {
    document.getElementById('talkBtn')?.classList.toggle('on', active);
  },

  setState(state) {
    if (!this.on) return;
    if (state === 'denied') {
      this.denied('Pockling needs the microphone for this. You can allow it in Settings.');
      return;
    }
    if (state === 'error') {
      this.denied('The microphone isn\'t available right now');
      return;
    }
    this.state = state;
    const { pet } = game;
    this.level = 0;
    pet.mouthExtra = 0;
    if (state === 'listening') {
      pet.setFace('listen');
      pet.ears(-0.2);
      pet.paws(0, 0, 36, -50);
      pet.r.lean.target = -0.04;
      pet.r.yaw.target = 0.14;
    } else if (state === 'hearing') {
      pet.setFace('listen');
      pet.r.sparkle.target = 0.8;
      pet.ears(-0.34);
      pet.r.lean.target = 0.03;
      pet.paws(0, 0, 36, -50);
    } else if (state === 'speaking') {
      pet.setFace('talk');
      pet.ears(0);
      pet.paws();
      pet.wag(0.9, 12);
      pet.r.yaw.target = 0;
      pet.r.lean.target = 0;
      haptic('soft');
      game.scene.talked?.();
    }
  },

  /** Every frame while talking: the mouth follows the voice. */
  update(dt) {
    if (!this.on) return;
    const { pet } = game;
    if (this.state === 'speaking') {
      const l = this.level;
      pet.mouthExtra += (l * 0.95 - pet.mouthExtra) * Math.min(1, dt * 30);
      pet.r.mw.target = 0.42 + l * 0.5;
      pet.r.sy.target = 1 + l * 0.05;
      pet.r.sx.target = 1 - l * 0.03;
      this.bobIn = (this.bobIn ?? 0) - dt;
      if (l > 0.35 && this.bobIn <= 0) {
        this.bobIn = rand(0.16, 0.3);
        pet.r.lean.target = rand(-0.05, 0.05);
        pet.r.pitch.target = rand(-0.06, 0.1);
        pet.jiggle(l * 3);
      }
    } else if (this.state === 'hearing') {
      pet.r.sy.target = 1 + this.level * 0.03;
      const eye = pet.anchors.top;
      this.noteIn = (this.noteIn ?? 0) - dt;
      if (this.level > 0.2 && this.noteIn <= 0 && eye) {
        this.noteIn = 0.3;
        game.fx.notes(eye[0], eye[1] - 8, 1);
      }
    } else {
      pet.r.sy.target = 1;
      pet.r.sx.target = 1;
    }
  },
};
