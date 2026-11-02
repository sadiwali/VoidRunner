import Phaser from 'phaser';
import { INK } from './theme';

// Molerat, drawn procedurally: a stocky burrower with buck teeth, a pink nose and a ridge of bone spikes
// down its back (which is why landing on one hurts). Its eyes and posture show what it is thinking.

export type Mood = 'calm' | 'sniff' | 'alert' | 'chase' | 'windup' | 'lunge' | 'stunned' | 'search' | 'wait' | 'hidden';

export interface MoleInput {
  x: number; // body centre, world px
  y: number;
  vx: number;
  facing: 1 | -1;
  mood: Mood;
  grounded: boolean;
  moodT: number; // seconds in the current mood
}

export class MoleView {
  readonly g: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  private phase = Math.random() * 10;
  private t = Math.random() * 10;
  private sy = 1;
  private spikeUp = 0;
  rim = 0x7f8fb8;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(40);
    this.glow = scene.add.graphics().setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
  }

  update(dt: number, m: MoleInput) {
    const g = this.g;
    const gl = this.glow;
    g.clear();
    gl.clear();
    if (m.mood === 'hidden') return;
    this.t += dt;
    const speed = Math.abs(m.vx);
    if (m.grounded) this.phase += (speed * dt) / 5;
    const F = m.facing;

    // posture targets
    let sy = 1;
    let rear = 0; // lift the front (rad)
    let spikes = 0.4;
    switch (m.mood) {
      case 'alert':
        rear = 0.25;
        spikes = 1;
        sy = 1.08;
        break;
      case 'chase':
        spikes = 0.9;
        sy = 0.96;
        break;
      case 'windup':
        sy = 0.78;
        spikes = 1.2;
        break;
      case 'lunge':
        sy = 0.9;
        spikes = 1;
        rear = -0.15;
        break;
      case 'stunned':
        sy = 0.6;
        spikes = 0.15;
        break;
      case 'wait':
        spikes = 0.8;
        rear = Math.sin(this.t * 8) * 0.05;
        break;
      case 'sniff':
        rear = 0.12 + Math.sin(this.t * 14) * 0.04;
        break;
    }
    this.sy += (sy - this.sy) * Math.min(1, dt * 14);
    this.spikeUp += (spikes - this.spikeUp) * Math.min(1, dt * 10);
    const shake = m.mood === 'windup' ? Math.sin(this.t * 70) * 1.2 : 0;
    const bob = m.grounded && speed > 10 ? Math.abs(Math.sin(this.phase)) * -1.6 : Math.sin(this.t * 3) * 0.4;
    const S = this.sy;
    const SX = 1 / Math.sqrt(S) * (m.mood === 'lunge' ? 1.12 : 1);
    const footY = m.y + 16;
    const cr = Math.cos(rear);
    const sr = Math.sin(rear);
    // local (forward x, up y measured from feet) -> world
    const W = (lx: number, ly: number): [number, number] => {
      // rear up around the back hip
      const ox = lx + 10;
      const rx = ox * cr - ly * sr - 10;
      const ry = ox * sr + ly * cr;
      return [m.x + (rx * SX + shake) * F, footY - ry * S + bob];
    };
    const rim = this.rim;

    // legs (behind body)
    const legs = (off: number, x: number, col: number) => {
      const p = this.phase + off;
      const lift = m.grounded ? Math.max(0, Math.sin(p)) * 4 : 3;
      const swing = m.grounded ? Math.cos(p) * 4 : -2;
      const a = W(x, 6);
      const b = W(x + swing, lift);
      g.lineStyle(5, col, 1).lineBetween(a[0], a[1], b[0], b[1]);
      g.fillStyle(col, 1).fillCircle(b[0], b[1], 2.6);
    };
    legs(Math.PI, -9, INK.moleFurDark);
    legs(0, 9, INK.moleFurDark);

    // tail
    const tw = Math.sin(this.t * 6) * 3;
    const t0 = W(-15, 9);
    const t1 = W(-21, 7 + tw * 0.5);
    const t2 = W(-26, 10 + tw);
    g.lineStyle(2, INK.moleNose, 0.9);
    g.beginPath();
    g.moveTo(t0[0], t0[1]);
    g.lineTo(t1[0], t1[1]);
    g.lineTo(t2[0], t2[1]);
    g.strokePath();

    // body outline + fill (an egg shape from points)
    const body: { x: number; y: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rx = a > Math.PI / 2 && a < (3 * Math.PI) / 2 ? 16.5 : 15;
      const p = W(Math.cos(a) * rx - 1, 11 + Math.sin(a) * 10.5);
      body.push({ x: p[0], y: p[1] });
    }
    g.fillStyle(rim, 1).fillPoints(
      body.map((p) => ({ x: p.x + (p.x - m.x) * 0.08, y: p.y + (p.y - (footY - 11 * S)) * 0.1 })),
      true,
    );
    g.fillStyle(INK.moleFur, 1).fillPoints(body, true);
    // belly
    const bel: { x: number; y: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (i / 15) * Math.PI;
      const p = W(Math.cos(a) * 11 + 2, 7 + Math.sin(a) * -4.5);
      bel.push({ x: p[0], y: p[1] });
    }
    g.fillStyle(INK.moleBelly, 0.9).fillPoints(bel, true);

    // spikes on the back
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.88 - (i / (n - 1)) * 0.62); // along the upper back, tail to head
      const bx = Math.cos(a) * 15 - 1;
      const by = 11 + Math.sin(a) * 10.5;
      const len = (5 + (i % 2) * 2.5) * (0.35 + this.spikeUp * 0.75);
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const tx = -ny;
      const ty = nx;
      const p0 = W(bx + tx * 2.4, by + ty * 2.4);
      const p1 = W(bx - tx * 2.4, by - ty * 2.4);
      const tip = W(bx + nx * len - tx * 1.2, by + ny * len - ty * 1.2);
      g.fillStyle(0x2a1a14, 1).fillTriangle(p0[0], p0[1] + 1, p1[0], p1[1] + 1, tip[0], tip[1] + 1);
      g.fillStyle(INK.moleSpike, 1).fillTriangle(p0[0], p0[1], p1[0], p1[1], tip[0], tip[1]);
      if (this.spikeUp > 0.7) gl.fillStyle(0xffffff, 0.12).fillCircle(tip[0], tip[1], 3);
    }

    // head
    const H = W(12, 12);
    g.fillStyle(rim, 1).fillCircle(H[0], H[1], 8.6 * Math.min(1, S + 0.2));
    g.fillStyle(INK.moleFur, 1).fillCircle(H[0], H[1], 7.6 * Math.min(1, S + 0.2));
    // snout
    const sn = W(19, 10.5);
    g.fillStyle(INK.moleBelly, 1).fillCircle(sn[0], sn[1], 4.2);
    const wig = m.mood === 'sniff' || m.mood === 'calm' ? Math.sin(this.t * 20) * 0.6 : 0;
    const nose = W(22.5, 11.5 + wig);
    g.fillStyle(INK.moleNose, 1).fillCircle(nose[0], nose[1], 2.4);
    // teeth
    const open = m.mood === 'lunge' || m.mood === 'windup' ? 2.5 : 0;
    const th = W(19.5, 7);
    const th2 = W(19.5, 3 - open);
    g.lineStyle(2.4, 0xfff6e0, 1).lineBetween(th[0], th[1], th2[0], th2[1]);
    // ear
    const ear = W(8, 18);
    g.fillStyle(INK.moleFurDark, 1).fillCircle(ear[0], ear[1], 2.6);

    // eye
    const eye = W(14.5, 15);
    const angry = m.mood === 'chase' || m.mood === 'lunge' || m.mood === 'windup' || m.mood === 'alert' || m.mood === 'wait';
    if (m.mood === 'stunned') {
      g.lineStyle(1.6, 0xffffff, 1);
      g.lineBetween(eye[0] - 2, eye[1] - 2, eye[0] + 2, eye[1] + 2);
      g.lineBetween(eye[0] - 2, eye[1] + 2, eye[0] + 2, eye[1] - 2);
      // orbiting stars
      for (let i = 0; i < 3; i++) {
        const a = this.t * 6 + (i * Math.PI * 2) / 3;
        const sx = m.x + Math.cos(a) * 13;
        const sy2 = footY - 26 + Math.sin(a) * 4;
        g.fillStyle(0xfff3a0, 1).fillCircle(sx, sy2, 1.8);
        gl.fillStyle(0xfff3a0, 0.3).fillCircle(sx, sy2, 4);
      }
    } else {
      const flashing = m.mood === 'windup' && Math.floor(this.t * 16) % 2 === 0;
      const ec = flashing ? 0xffffff : angry ? INK.moleEyeAngry : INK.moleEye;
      const blink = !angry && Math.sin(this.t * 1.3 + this.phase * 0.1) > 0.985;
      if (blink) g.lineStyle(1.4, ec, 1).lineBetween(eye[0] - 2, eye[1], eye[0] + 2, eye[1]);
      else {
        g.fillStyle(ec, 1).fillCircle(eye[0], eye[1], angry ? 2.4 : 2);
        g.fillStyle(0x000000, 1).fillCircle(eye[0] + F * 0.7, eye[1], 1);
        // angry brow
        if (angry) {
          const b0 = W(11.5, 18.5);
          const b1 = W(17, 16.8);
          g.lineStyle(1.6, INK.moleFurDark, 1).lineBetween(b0[0], b0[1], b1[0], b1[1]);
        }
      }
      gl.fillStyle(ec, angry ? 0.35 : 0.2).fillCircle(eye[0], eye[1], angry ? 7 : 5);
    }

    // front claws
    const paw = W(15, 1.5);
    g.lineStyle(1.2, 0xfff6e0, 1);
    for (let i = -1; i <= 1; i++) g.lineBetween(paw[0], paw[1], paw[0] + F * 3, paw[1] + 1.5 + i * 1.2);

    // thought marks
    const mark = (ch: '!' | '?') => {
      const pop = Math.min(1, m.moodT * 8);
      const s = (1 + Math.max(0, 1 - m.moodT * 4) * 0.6) * pop;
      const mx = m.x;
      const my = footY - 44 - Math.sin(Math.min(1, m.moodT * 6) * Math.PI) * 4;
      const col = ch === '!' ? 0xff4f4f : 0xffe27a;
      gl.fillStyle(col, 0.25).fillCircle(mx, my, 10 * s);
      g.fillStyle(col, 1);
      if (ch === '!') {
        g.fillRect(mx - 1.6 * s, my - 7 * s, 3.2 * s, 9 * s);
        g.fillCircle(mx, my + 5 * s, 1.8 * s);
      } else {
        g.lineStyle(2.6 * s, col, 1);
        g.beginPath();
        g.arc(mx, my - 3 * s, 4 * s, Math.PI * 1.05, Math.PI * 2.35, false);
        g.strokePath();
        g.fillRect(mx - 1.2 * s, my - 0.5 * s, 2.4 * s, 3 * s);
        g.fillCircle(mx, my + 5.5 * s, 1.7 * s);
      }
    };
    if (m.mood === 'alert') mark('!');
    else if (m.mood === 'search' && m.moodT < 1.2) mark('?');
  }

  destroy() {
    this.g.destroy();
    this.glow.destroy();
  }
}
