import Phaser from 'phaser';
import { UI_FONT } from './config';
import { audio } from './audio';
import { INK, hex } from './art/theme';

/** The sliding notification banner (Sayer.cs), restyled as a slim glass panel. */
export class Sayer {
  private box: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private hideAt = 0;
  private shown = false;
  private readonly scene: Phaser.Scene;
  private readonly lane: number;
  private accent: number;

  constructor(scene: Phaser.Scene, lane = 0, accent: number = INK.uiAccent) {
    this.scene = scene;
    this.lane = lane;
    this.accent = accent;
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', { fontFamily: UI_FONT, fontSize: lane ? '18px' : '22px', fontStyle: '600', color: '#ffffff' })
      .setOrigin(0.5, 0.5);
    this.box = scene.add.container(0, -80, [this.bg, this.text]).setScrollFactor(0).setDepth(1000 + lane);
    this.layout();
  }

  get container() {
    return this.box;
  }

  layout() {
    this.box.x = this.scene.scale.width / 2;
    if (!this.shown) this.box.y = -80;
  }

  say(s: string, seconds: number, sound: 'notif' | 'ach' | 'select' | null = 'notif') {
    this.text.setText(s);
    const w = Math.max(220, this.text.width + 64);
    const h = this.lane ? 44 : 52;
    this.bg.clear();
    this.bg.fillStyle(0x07060f, 0.82).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.bg.lineStyle(1.5, 0xffffff, 0.12).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.bg.fillStyle(this.lane ? 0xffd25a : this.accent, 1).fillRoundedRect(-w / 2 + 10, -h / 2 + 12, 4, h - 24, 2);
    this.hideAt = this.scene.time.now + seconds * 1000;
    this.shown = true;
    if (sound) audio.sfx(sound);
  }

  update(dt: number) {
    const target = this.shown ? 46 + this.lane * 62 : -80;
    if (this.shown && this.scene.time.now > this.hideAt) this.shown = false;
    this.box.x = this.scene.scale.width / 2;
    this.box.y += (target - this.box.y) * Math.min(1, dt * (this.shown ? 10 : 5));
  }
}

export function label(scene: Phaser.Scene, x: number, y: number, s: string, size = 20, color = hex(INK.ui), weight = '500') {
  return scene.add.text(x, y, s, { fontFamily: UI_FONT, fontSize: `${size}px`, color, fontStyle: weight }).setScrollFactor(0);
}

/** Heart outline from the classic parametric curve, centred on (0,0), about 2*r wide. */
function heartPoints(r: number, half: 'all' | 'left' = 'all') {
  const pts: { x: number; y: number }[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = half === 'left' ? Math.PI + (i / n) * Math.PI : (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push({ x: (x / 17) * r, y: (y / 17) * r });
  }
  return pts;
}

/** Draws `max` hearts with health given in half-hearts. */
export function drawHearts(g: Phaser.GameObjects.Graphics, x: number, y: number, halves: number, max: number, r = 13, shake = 0) {
  g.clear();
  const full = heartPoints(r);
  const left = heartPoints(r, 'left');
  for (let i = 0; i < max; i++) {
    const cx = x + r + i * (r * 2 + 8) + (shake ? (Math.random() - 0.5) * shake : 0);
    const cy = y + r + (shake ? (Math.random() - 0.5) * shake : 0);
    const off = (p: { x: number; y: number }[], dx = 0, dy = 0) => p.map((q) => ({ x: q.x + cx + dx, y: q.y + cy + dy }));
    g.fillStyle(0x000000, 0.45).fillPoints(off(full, 2, 3), true);
    g.fillStyle(0x2a1420, 1).fillPoints(off(full), true);
    g.lineStyle(2, 0xffffff, 0.18).strokePoints(off(full), true);
    const v = halves - i * 2;
    if (v >= 2) {
      g.fillStyle(0xff3b5c, 1).fillPoints(off(full), true);
      g.fillStyle(0xffffff, 0.35).fillCircle(cx - r * 0.42, cy - r * 0.38, r * 0.22);
    } else if (v === 1) {
      g.fillStyle(0xff3b5c, 1).fillPoints(off([...left, { x: 0, y: left[0].y }]), true);
      g.fillStyle(0xffffff, 0.35).fillCircle(cx - r * 0.42, cy - r * 0.38, r * 0.22);
    }
  }
}

/** A text button with an accent bar that lights up when selected. */
export class Button {
  readonly c: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private t: Phaser.GameObjects.Text;
  private sub?: Phaser.GameObjects.Text;
  private w: number;
  private h: number;
  selected = false;
  disabled = false;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, size: number, sub?: string, minW = 0) {
    this.g = scene.add.graphics();
    this.t = scene.add.text(0, sub ? -size * 0.28 : 0, text, { fontFamily: UI_FONT, fontSize: `${size}px`, fontStyle: '700', color: '#ffffff' }).setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [this.g, this.t];
    if (sub) {
      this.sub = scene.add.text(0, size * 0.5, sub, { fontFamily: UI_FONT, fontSize: `${Math.round(size * 0.48)}px`, fontStyle: '500', color: hex(INK.uiDim) }).setOrigin(0.5);
      parts.push(this.sub);
    }
    this.w = Math.max(minW, this.t.width + 70, (this.sub?.width ?? 0) + 50);
    this.h = sub ? size * 2.1 : size * 1.75;
    this.c = scene.add.container(x, y, parts);
    this.c.setSize(this.w, this.h);
    this.c.setInteractive({ useHandCursor: true });
    this.draw();
  }

  setSelected(on: boolean) {
    this.selected = on;
    this.draw();
  }

  private draw() {
    const { w, h, g } = this;
    g.clear();
    const on = this.selected && !this.disabled;
    // slanted plate
    const sk = h * 0.28;
    const pts = [
      { x: -w / 2 + sk, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2 - sk, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ];
    g.fillStyle(on ? INK.uiAccent : 0x0c0a18, on ? 1 : 0.7).fillPoints(pts, true);
    g.lineStyle(1.5, on ? 0xffffff : 0xffffff, on ? 0.5 : 0.14).strokePoints(pts, true);
    this.t.setColor(this.disabled ? '#5a5878' : '#ffffff');
    this.t.setAlpha(on ? 1 : 0.85);
    if (this.sub) this.sub.setColor(on ? '#ffe0e6' : hex(INK.uiDim));
  }
}
