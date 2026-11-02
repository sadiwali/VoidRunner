// All music and sound effects are synthesized at runtime with the Web Audio API.
// No audio files ship with the game (the original used licensed commercial tracks).

type Wave = OscillatorType;

interface Song {
  bpm: number;
  root: number; // MIDI note of the key centre
  // One chord per bar, as semitone offsets from root (first entry is the bass note)
  chords: number[][];
  arp: (number | null)[]; // 16 steps, index into the current chord (+7 per wrap)
  arpWave: Wave;
  arpOctave: number;
  bass: (number | null)[]; // 16 steps, semitone offset added to chord root (null = rest)
  kick: string; // 16 chars, 'x' = hit
  snare: string;
  hat: string;
  pad: boolean;
  lead?: (number | null)[][]; // optional melody, one 16-step row per bar, semitones from root
  leadWave?: Wave;
}

const MIN = [0, 3, 7]; // minor triad
const MAJ = [0, 4, 7];
const ch = (r: number, q: number[], add: number[] = []) => [r, ...q.map((n) => n + r), ...add.map((n) => n + r)];

export const SONGS: Song[] = [
  // 0: menu, slow and spacious (A minor)
  {
    bpm: 84,
    root: 57,
    chords: [ch(0, MIN, [10]), ch(-4, MAJ, [11]), ch(-9, MIN, [10]), ch(-2, MAJ, [9])],
    arp: [0, null, 2, null, 1, null, 3, null, 2, null, 1, null, 3, null, 2, null],
    arpWave: 'triangle',
    arpOctave: 12,
    bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, 12, null],
    kick: 'x.......x.......',
    snare: '................',
    hat: '....x.......x...',
    pad: true,
  },
  // 1: level one, icy driving arps (E minor)
  {
    bpm: 122,
    root: 52,
    chords: [ch(0, MIN), ch(-4, MAJ), ch(-7, MAJ), ch(-2, MAJ)],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3],
    arpWave: 'square',
    arpOctave: 24,
    bass: [0, null, 0, 12, null, 0, null, 12, 0, null, 0, 12, null, 0, 7, null],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...xx',
    pad: true,
    lead: [
      [12, null, null, null, 15, null, 14, null, 12, null, null, null, 10, null, 7, null],
      [8, null, null, null, 7, null, 8, null, 12, null, null, null, null, null, null, null],
      [7, null, null, null, 10, null, 12, null, 14, null, null, null, 12, null, 10, null],
      [10, null, null, null, 14, null, 12, null, 10, null, null, null, null, null, null, null],
    ],
    leadWave: 'sawtooth',
  },
  // 2: level two, dark and heavy (D minor)
  {
    bpm: 108,
    root: 50,
    chords: [ch(0, MIN, [10]), ch(0, MIN, [8]), ch(-2, MAJ), ch(-5, MIN)],
    arp: [0, null, 3, 2, null, 1, 3, null, 0, null, 2, 3, null, 1, 2, null],
    arpWave: 'sawtooth',
    arpOctave: 12,
    bass: [0, 0, null, 0, 0, null, 0, 1, 0, 0, null, 0, 12, null, 10, null],
    kick: 'x..x..x...x..x..',
    snare: '....x.......x..x',
    hat: 'x.x.x.x.x.x.x.x.',
    pad: false,
    lead: [
      [null, null, null, null, null, null, null, null, 15, null, 14, null, 12, null, null, null],
      [null, null, null, null, null, null, null, null, 12, null, 13, null, 12, null, 10, null],
      [null, null, null, null, null, null, null, null, 10, null, 12, null, 14, null, null, null],
      [12, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null],
    ],
    leadWave: 'square',
  },
  // 3: level three, fast and urgent (C minor)
  {
    bpm: 142,
    root: 48,
    chords: [ch(0, MIN), ch(-4, MAJ), ch(-5, MAJ), ch(-1, MAJ)],
    arp: [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 1, 3, 2, 4, 3],
    arpWave: 'square',
    arpOctave: 24,
    bass: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 10],
    kick: 'x...x...x...x.x.',
    snare: '....x.......x...',
    hat: 'xxxxxxxxxxxxxxxx',
    pad: true,
    lead: [
      [15, null, 14, null, 12, null, 14, null, 15, null, 19, null, 17, null, 15, null],
      [14, null, 12, null, 11, null, 12, null, 14, null, null, null, 8, null, null, null],
      [12, null, 14, null, 15, null, 14, null, 12, null, 10, null, 7, null, null, null],
      [11, null, 12, null, 14, null, 15, null, 17, null, null, null, 19, null, null, null],
    ],
    leadWave: 'sawtooth',
  },
];

export type Sfx =
  | 'jump' | 'double' | 'land' | 'hit' | 'shoot' | 'checkpoint' | 'notif' | 'ach' | 'die' | 'select' | 'wall'
  | 'drill' | 'stomp' | 'shove' | 'respawn' | 'portal' | 'lunge' | 'molehop' | 'alert' | 'wake' | 'sleep' | 'charge';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Synth {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  noise!: AudioBuffer;
  muted = false;
  private song: Song | null = null;
  private songIndex = -1;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.32;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(this.master);
      // a little synthetic room reverb on everything
      const verb = this.ctx.createConvolver();
      const vlen = Math.floor(this.ctx.sampleRate * 1.8);
      const ir = this.ctx.createBuffer(2, vlen, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < vlen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / vlen, 3.2);
      }
      verb.buffer = ir;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.22;
      verb.connect(wet).connect(this.master);
      this.musicBus.connect(verb);
      this.sfxBus.connect(verb);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.songIndex >= 0) this.startScheduler();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.1);
  }

  /** Muffle the music (pause menu). */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.1 : 0.32, this.ctx.currentTime, 0.15);
  }

  /** Positional-ish sound effect: vol 0..1 scales the effect, 0 skips it. */
  sfxAt(name: Sfx, vol: number) {
    if (!this.ctx || vol <= 0.02) return;
    this.sfx(name, vol);
  }

  play(index: number) {
    if (index === this.songIndex) return;
    this.songIndex = index;
    this.song = SONGS[index];
    this.step = 0;
    if (this.ctx) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.startScheduler();
    }
  }

  stop() {
    this.songIndex = -1;
    this.song = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private startScheduler() {
    if (!this.ctx) return;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick() {
    if (!this.ctx || !this.song) return;
    // Don't build up a backlog while the tab is hidden.
    if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
    const s = this.song;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(s, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % (16 * s.chords.length);
    }
  }

  private playStep(s: Song, step: number, t: number, dur: number) {
    const bar = Math.floor(step / 16);
    const i = step % 16;
    const chord = s.chords[bar];
    const root = s.root + chord[0];
    if (s.kick[i] === 'x') this.kick(t);
    if (s.snare[i] === 'x') this.snare(t);
    if (s.hat[i] === 'x') this.hat(t, i % 4 === 2 ? 0.07 : 0.04);
    const b = s.bass[i];
    if (b !== null) this.tone(mtof(root - 12 + b), t, dur * 1.6, 'sawtooth', 0.2, this.musicBus, 500);
    const a = s.arp[i];
    if (a !== null) {
      const tones = chord.slice(1);
      const n = tones[a % tones.length] + 12 * Math.floor(a / tones.length);
      this.tone(mtof(s.root + n + s.arpOctave - 12), t, dur * 0.9, s.arpWave, 0.07, this.musicBus, 2600);
    }
    if (s.pad && i === 0) {
      for (const n of chord.slice(1)) this.pad(mtof(s.root + n), t, dur * 16);
    }
    const lead = s.lead?.[bar]?.[i];
    if (lead !== null && lead !== undefined) {
      let len = 1;
      while (i + len < 16 && s.lead![bar][i + len] === null && len < 4) len++;
      this.tone(mtof(s.root + lead + 12), t, dur * len * 0.95, s.leadWave ?? 'square', 0.06, this.musicBus, 3200, true);
    }
  }

  private tone(freq: number, t: number, dur: number, wave: Wave, vol: number, bus: AudioNode, cutoff = 4000, vibrato = false) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    if (vibrato && dur > 0.25) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = freq * 0.006;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t + 0.12);
      lfo.stop(t + dur + 0.05);
    }
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private pad(freq: number, t: number, dur: number) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.025, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    f.connect(g).connect(this.musicBus);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, bus: AudioNode) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private kick(t: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.25);
  }

  private snare(t: number) {
    this.noiseHit(t, 0.14, 0.22, 'bandpass', 1800, this.musicBus);
    this.tone(190, t, 0.08, 'triangle', 0.12, this.musicBus);
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, 0.04, vol, 'highpass', 7000, this.musicBus);
  }

  // ---- Sound effects ----
  sfx(name: Sfx, vol = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    let bus: AudioNode = this.sfxBus;
    if (vol < 1) {
      const g = this.ctx.createGain();
      g.gain.value = vol;
      g.connect(this.sfxBus);
      bus = g;
    }
    switch (name) {
      case 'jump': {
        const c = this.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(260, t);
        o.frequency.exponentialRampToValueAtTime(620, t + 0.09);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 0.13);
        break;
      }
      case 'wall':
        this.tone(330, t, 0.06, 'square', 0.08, bus, 2000);
        this.tone(495, t + 0.05, 0.08, 'square', 0.08, bus, 2000);
        break;
      case 'land':
        this.noiseHit(t, 0.08, 0.35, 'lowpass', 600, bus);
        break;
      case 'hit':
        this.tone(220, t, 0.2, 'sawtooth', 0.2, bus, 1200);
        this.tone(110, t + 0.05, 0.25, 'square', 0.15, bus, 800);
        this.noiseHit(t, 0.15, 0.25, 'bandpass', 900, bus);
        break;
      case 'shoot': {
        const c = this.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1400, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.18);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 0.21);
        break;
      }
      case 'checkpoint':
        [72, 76, 79, 84].forEach((n, k) => this.tone(mtof(n), t + k * 0.08, 0.3, 'triangle', 0.15, bus));
        break;
      case 'notif':
        this.tone(mtof(81), t, 0.12, 'sine', 0.12, bus);
        this.tone(mtof(88), t + 0.09, 0.2, 'sine', 0.12, bus);
        break;
      case 'ach':
        [67, 71, 74, 79, 83, 86].forEach((n, k) => this.tone(mtof(n), t + k * 0.06, 0.5, 'square', 0.07, bus, 3000));
        break;
      case 'die':
        [64, 60, 55, 48].forEach((n, k) => this.tone(mtof(n), t + k * 0.1, 0.25, 'sawtooth', 0.12, bus, 1500));
        break;
      case 'select':
        this.tone(mtof(76), t, 0.07, 'square', 0.08, bus, 3000);
        break;
      case 'double':
        this.sweep(420, 1100, t, 0.14, 'triangle', 0.13, bus);
        this.noiseHit(t, 0.12, 0.12, 'highpass', 3000, bus);
        break;
      case 'drill':
        this.sweep(900, 220, t, 0.18, 'sawtooth', 0.06, bus);
        this.noiseHit(t, 0.2, 0.12, 'bandpass', 2500, bus);
        break;
      case 'stomp':
        // spikes! a sharp crunch and a yelp
        this.noiseHit(t, 0.09, 0.4, 'bandpass', 3200, bus);
        this.sweep(900, 1500, t + 0.02, 0.09, 'square', 0.07, bus);
        this.tone(160, t, 0.12, 'square', 0.12, bus, 900);
        break;
      case 'shove':
        this.noiseHit(t, 0.14, 0.35, 'lowpass', 900, bus);
        this.sweep(220, 90, t, 0.16, 'square', 0.12, bus);
        break;
      case 'respawn':
        [60, 67, 72, 79].forEach((n, k) => this.tone(mtof(n), t + k * 0.05, 0.35, 'triangle', 0.09, bus, 3000));
        this.sweep(200, 1200, t, 0.35, 'sine', 0.08, bus);
        break;
      case 'portal':
        [72, 76, 79, 84, 88, 91].forEach((n, k) => this.tone(mtof(n), t + k * 0.05, 0.6, 'triangle', 0.08, bus, 4000));
        this.sweep(300, 2000, t, 0.6, 'sine', 0.08, bus);
        break;
      case 'lunge':
        this.sweep(500, 900, t, 0.1, 'sawtooth', 0.07, bus);
        this.noiseHit(t, 0.1, 0.18, 'bandpass', 1500, bus);
        break;
      case 'molehop':
        this.sweep(300, 520, t, 0.08, 'square', 0.04, bus);
        break;
      case 'alert':
        // squeak
        this.sweep(1300, 2100, t, 0.06, 'square', 0.05, bus);
        this.sweep(1500, 2300, t + 0.07, 0.07, 'square', 0.05, bus);
        break;
      case 'wake':
        this.sweep(200, 600, t, 0.25, 'sawtooth', 0.06, bus);
        break;
      case 'sleep':
        this.sweep(600, 180, t, 0.3, 'sawtooth', 0.05, bus);
        break;
      case 'charge':
        this.sweep(300, 1400, t, 0.48, 'sine', 0.06, bus);
        break;
    }
  }

  private sweep(f0: number, f1: number, t: number, dur: number, wave: Wave, vol: number, bus: AudioNode) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export const audio = new Synth();
