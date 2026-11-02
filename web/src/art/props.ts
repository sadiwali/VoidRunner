import Phaser from 'phaser';
import { S } from '../config';
import { INK, THEMES, mix } from './theme';

/** Sentry turret: an armoured pillar whose eye tracks the player and glows hotter before each shot. */
export class TurretView {
  readonly g: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  private eyeX = 0;
  private eyeY = 0;
  private lid = 1; // 1 = closed
  private t = 0;
  private kick = 0;
  constructor(
    scene: Phaser.Scene,
    private x: number, // centre, world px
    private y: number,
    private w: number,
    private h: number,
    private rim: number,
  ) {
    this.g = scene.add.graphics().setDepth(30);
    this.glow = scene.add.graphics().setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
  }

  fire() {
    this.kick = 1;
  }

  /** aim: unit vector toward the player; charge 0..1 */
  update(dt: number, awake: boolean, aimX: number, aimY: number, charge: number) {
    this.t += dt;
    const g = this.g;
    const gl = this.glow;
    g.clear();
    gl.clear();
    const { x, y, w, h } = this;
    const l = x - w / 2;
    const top = y - h / 2;
    this.lid += ((awake ? 0 : 1) - this.lid) * Math.min(1, dt * 6);
    this.kick = Math.max(0, this.kick - dt * 4);
    const tx = awake ? aimX * 7 : 0;
    const ty = awake ? aimY * 5 : 3;
    this.eyeX += (tx - this.eyeX) * Math.min(1, dt * 10);
    this.eyeY += (ty - this.eyeY) * Math.min(1, dt * 10);

    // body
    g.fillStyle(this.rim, 0.9).fillRoundedRect(l - 1.5, top - 1.5, w + 3, h + 3, 7);
    g.fillStyle(INK.metalDark, 1).fillRoundedRect(l, top, w, h, 6);
    g.fillStyle(INK.metal, 1).fillRoundedRect(l + 4, top + 4, w - 8, h - 8, 4);
    // armour bands and rivets
    g.fillStyle(INK.metalDark, 1).fillRect(l + 4, top + h * 0.62, w - 8, 4);
    g.fillStyle(INK.metalDark, 1).fillRect(l + 4, top + h * 0.8, w - 8, 3);
    g.fillStyle(INK.metalLight, 1);
    for (const [rx, ry] of [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]]) g.fillCircle(l + rx, top + ry, 1.8);
    // hazard stripes on the base
    for (let i = 0; i < 6; i++) {
      const sx = l + 6 + i * ((w - 12) / 6);
      g.fillStyle(i % 2 ? 0x111111 : 0xffc23a, 0.85).fillRect(sx, top + h - 12, (w - 12) / 6, 5);
    }
    // gun ports on both sides
    const portY = top + h * 0.42;
    for (const side of [-1, 1]) {
      const px = x + side * (w / 2 + 2 + (side * aimX > 0 ? -this.kick * 3 : 0));
      g.fillStyle(INK.metalDark, 1).fillRect(px - 6, portY - 4, 12, 8);
      g.fillStyle(INK.metalLight, 1).fillRect(px - 6, portY - 4, 12, 2);
      if (awake && side * aimX > 0 && charge > 0.6) gl.fillStyle(INK.danger, (charge - 0.6) * 1.2).fillCircle(px + side * 6, portY, 6 + charge * 4);
    }
    // eye window
    const ex = x;
    const ey = top + h * 0.3;
    const er = Math.min(w, h) * 0.26;
    g.fillStyle(0x07080c, 1).fillCircle(ex, ey, er + 2);
    const heat = awake ? 0.45 + charge * 0.55 : 0.15;
    const ec = mix(0x7a1010, INK.danger, heat);
    g.fillStyle(ec, 1).fillCircle(ex + this.eyeX * 0.5, ey + this.eyeY * 0.5, er * 0.62);
    g.fillStyle(mix(ec, 0xffffff, 0.6 * heat), 1).fillCircle(ex + this.eyeX * 0.7, ey + this.eyeY * 0.7, er * 0.28);
    gl.fillStyle(INK.danger, 0.15 + heat * 0.35).fillCircle(ex + this.eyeX * 0.5, ey + this.eyeY * 0.5, er * (1.6 + charge * 1.2));
    if (charge > 0.75 && awake) {
      // converging charge ring
      const r = er * (3.2 - (charge - 0.75) * 9);
      gl.lineStyle(2, INK.danger, (charge - 0.75) * 3).strokeCircle(ex, ey, Math.max(er, r));
    }
    // eyelid shutter
    if (this.lid > 0.02) {
      g.fillStyle(INK.metal, 1);
      g.slice(ex, ey, er + 2.5, Math.PI, Math.PI + Math.PI * this.lid, false).fillPath();
      g.slice(ex, ey, er + 2.5, 0, -Math.PI * this.lid, true).fillPath();
      g.fillStyle(INK.metalDark, 1).fillRect(ex - er - 2, ey - 0.8, (er + 2) * 2, 1.6 * this.lid);
    }
    // status light
    const blink = awake ? (Math.floor(this.t * 6) % 2 ? 1 : 0.3) : 0.4 + Math.sin(this.t * 2) * 0.2;
    const lc = awake ? INK.danger : 0x4aff9a;
    g.fillStyle(lc, blink).fillCircle(x, top + h * 0.72, 2);
    gl.fillStyle(lc, 0.3 * blink).fillCircle(x, top + h * 0.72, 6);
  }
}

/** Checkpoint beacon: a slim pylon whose crystal lights up and keeps pulsing once reached. */
export class Beacon {
  readonly g: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  private t = Math.random() * 5;
  lit = 0;
  constructor(
    scene: Phaser.Scene,
    private x: number,
    private base: number, // world px of the ground
    private color: number,
  ) {
    this.g = scene.add.graphics().setDepth(20);
    this.glow = scene.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
  }
  update(dt: number, active: boolean) {
    this.t += dt;
    this.lit += ((active ? 1 : 0) - this.lit) * Math.min(1, dt * 3);
    const { g, glow: gl, x, base } = this;
    g.clear();
    gl.clear();
    const hgt = 46;
    // pylon
    g.fillStyle(INK.metalDark, 1).fillTriangle(x - 7, base, x + 7, base, x, base - hgt);
    g.fillStyle(INK.metal, 1).fillTriangle(x - 3, base, x + 4, base, x, base - hgt + 6);
    g.fillStyle(INK.metalLight, 1).fillRect(x - 9, base - 3, 18, 3);
    // floating crystal
    const cy = base - hgt - 9 + Math.sin(this.t * 2.2) * 2.5;
    const c = this.lit > 0.5 ? this.color : 0x555a6a;
    const pts = [
      { x, y: cy - 9 },
      { x: x + 5, y: cy },
      { x, y: cy + 9 },
      { x: x - 5, y: cy },
    ];
    g.fillStyle(mix(c, 0x000000, 0.3), 1).fillPoints(pts, true);
    g.fillStyle(c, 1).fillPoints([pts[0], pts[1], pts[2], { x: x + 0.5, y: cy }], true);
    const pulse = 0.6 + Math.sin(this.t * 4) * 0.25;
    gl.fillStyle(this.color, (0.08 + this.lit * 0.3) * pulse).fillCircle(x, cy, 16 + this.lit * 10);
    if (this.lit > 0.05) {
      gl.fillStyle(this.color, 0.12 * this.lit).fillTriangle(x - 3, cy, x + 3, cy, x, base);
      gl.lineStyle(1.5, this.color, 0.4 * this.lit * pulse).strokeEllipse(x, base - 1, 34, 6);
    }
  }
}

/** Exit portal: a swirling rift. */
export class Portal {
  readonly g: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  private t = 0;
  constructor(
    scene: Phaser.Scene,
    private x: number,
    private base: number,
    private color: number,
  ) {
    this.g = scene.add.graphics().setDepth(19);
    this.glow = scene.add.graphics().setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
  }
  update(dt: number, near: number) {
    this.t += dt;
    const { g, glow: gl, x, base, color } = this;
    g.clear();
    gl.clear();
    const h = 2.1 * S;
    const w = 1.1 * S;
    const cy = base - h / 2 - 4;
    g.fillStyle(0x020205, 0.95).fillEllipse(x, cy, w, h);
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.16;
      const a = this.t * (1.5 + i * 0.4) * (i % 2 ? -1 : 1);
      gl.lineStyle(2.2, mix(color, 0xffffff, i * 0.12), 0.55 - i * 0.07);
      gl.beginPath();
      for (let s = 0; s <= 28; s++) {
        const q = a + (s / 28) * Math.PI * 1.4;
        const px = x + Math.cos(q) * (w / 2) * k;
        const py = cy + Math.sin(q) * (h / 2) * k;
        if (s === 0) gl.moveTo(px, py);
        else gl.lineTo(px, py);
      }
      gl.strokePath();
    }
    gl.fillStyle(color, 0.12 + near * 0.15).fillEllipse(x, cy, w * 2.4, h * 1.6);
    gl.fillStyle(0xffffff, 0.35 + Math.sin(this.t * 5) * 0.1).fillEllipse(x, cy, w * 0.25, h * 0.4);
    // rune stones either side
    for (const side of [-1, 1]) {
      const sx = x + side * (w / 2 + 8);
      g.fillStyle(INK.metalDark, 1).fillRect(sx - 4, base - 30, 8, 30);
      gl.fillStyle(color, 0.6 + Math.sin(this.t * 3 + side) * 0.3).fillRect(sx - 1.2, base - 26, 2.4, 6);
      gl.fillStyle(color, 0.4).fillRect(sx - 1.2, base - 16, 2.4, 4);
    }
  }
}

/** Hint arrow (level three uses one to point at the exit). */
export function drawArrow(scene: Phaser.Scene, x: number, y: number, themeIndex: number) {
  const T = THEMES[themeIndex];
  const g = scene.add.graphics().setDepth(15);
  const gl = scene.add.graphics().setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  const draw = (gg: Phaser.GameObjects.Graphics, wdt: number, a: number) => {
    gg.lineStyle(wdt, T.rim, a);
    gg.beginPath();
    gg.moveTo(x - 14, y - 14);
    gg.lineTo(x + 12, y + 12);
    gg.moveTo(x + 12, y - 4);
    gg.lineTo(x + 12, y + 12);
    gg.lineTo(x - 4, y + 12);
    gg.strokePath();
  };
  draw(g, 4, 1);
  draw(gl, 12, 0.18);
  return [g, gl];
}
