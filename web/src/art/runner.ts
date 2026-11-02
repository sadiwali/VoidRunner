import Phaser from 'phaser';
import { INK } from './theme';

// The player character, drawn procedurally every frame: a hooded runner with a glowing visor and a long
// red scarf that is simulated as a rope. Poses blend smoothly, the run cycle is driven by distance so the
// feet never slide, and landings/jumps squash and stretch the body.

export type RunnerState = 'idle' | 'run' | 'jump' | 'fall' | 'wall' | 'drill';

export interface RunnerInput {
  x: number; // feet, world px
  y: number;
  vx: number; // px/s
  vy: number; // px/s (down positive)
  state: RunnerState;
  facing: 1 | -1;
  visible: boolean;
  flash: number; // 0..1 damage flash
  alpha: number;
}

interface Pose {
  lean: number;
  bob: number;
  t1: number; // front thigh angle (rad, 0 = straight down, + = forward)
  k1: number; // front knee bend
  t2: number;
  k2: number;
  s1: number; // front shoulder (0 = down, + = forward)
  e1: number; // front elbow
  s2: number;
  e2: number;
  head: number; // head tilt
}

const ZERO: Pose = { lean: 0, bob: 0, t1: 0, k1: 0, t2: 0, k2: 0, s1: 0, e1: 0, s2: 0, e2: 0, head: 0 };

const HIP = 23;
const SHOULDER = 37;
const HEAD = 45;
const THIGH = 12;
const SHIN = 12;
const UPPER = 9;
const FORE = 9;

export class RunnerView {
  readonly g: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  private pose: Pose = { ...ZERO };
  private phase = 0;
  private time = 0;
  private sy = 1; // squash/stretch, 1 = neutral
  private syVel = 0;
  private spin = 0; // flip / drill rotation
  private spinVel = 0;
  private scarf: { x: number; y: number; px: number; py: number }[] = [];
  private lastState: RunnerState = 'idle';
  rim = 0x7f8fb8;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(50);
    this.glow = scene.add.graphics().setDepth(51).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Squash on landing (impact 0..1) */
  land(impact: number) {
    this.syVel -= 4 + impact * 10;
  }

  jump() {
    this.syVel += 7;
  }

  flip(dir: number) {
    this.spinVel = dir * Math.PI * 2 * 2.6;
  }

  resetScarf(x: number, y: number) {
    this.scarf = [];
    for (let i = 0; i < 9; i++) this.scarf.push({ x, y: y - SHOULDER, px: x, py: y - SHOULDER });
  }

  update(dt: number, s: RunnerInput) {
    this.time += dt;
    const g = this.g;
    const gl = this.glow;
    g.clear();
    gl.clear();
    if (!this.scarf.length) this.resetScarf(s.x, s.y);
    if (!s.visible) {
      this.simScarf(dt, s.x, s.y - SHOULDER);
      return;
    }

    // ---- target pose
    const speed = Math.abs(s.vx);
    const target: Pose = { ...ZERO };
    const T = this.time;
    switch (s.state) {
      case 'idle': {
        const br = Math.sin(T * 2.4);
        Object.assign(target, { bob: br * 0.6, t1: 0.08, k1: 0.12, t2: -0.06, k2: 0.1, s1: 0.12 + br * 0.03, e1: 0.35, s2: -0.1, e2: 0.3, head: br * 0.03 });
        break;
      }
      case 'run': {
        this.phase += (speed * dt) / 9.5;
        const p = this.phase;
        const k = Math.min(1, speed / 128);
        const leg = (q: number) => [0.75 * Math.sin(q) * k, 0.2 + 1.25 * Math.max(0, Math.cos(q)) * k] as const;
        const [t1, k1] = leg(p);
        const [t2, k2] = leg(p + Math.PI);
        Object.assign(target, {
          lean: 0.22 * k,
          bob: -1.8 * Math.abs(Math.cos(p)) * k + 0.8,
          t1, k1, t2, k2,
          s1: -0.9 * Math.sin(p) * k,
          e1: 1.1 + 0.3 * Math.sin(p),
          s2: 0.9 * Math.sin(p) * k,
          e2: 1.1 - 0.3 * Math.sin(p),
          head: -0.05 * k,
        });
        break;
      }
      case 'jump':
        Object.assign(target, { lean: 0.1, t1: 1.0, k1: 1.5, t2: -0.35, k2: 0.7, s1: 2.6, e1: 0.3, s2: -0.6, e2: 0.6, head: -0.15 });
        break;
      case 'fall': {
        const f = Math.sin(T * 16) * 0.25;
        Object.assign(target, { lean: -0.05, t1: 0.35, k1: 0.55, t2: -0.25, k2: 0.35, s1: 2.0 + f, e1: 0.4, s2: -1.7 - f, e2: 0.5, head: 0.12 });
        break;
      }
      case 'wall':
        Object.assign(target, { lean: -0.15, t1: 1.05, k1: 1.6, t2: 0.25, k2: 0.7, s1: 1.7, e1: 0.35, s2: 0.7, e2: 1.2, head: -0.2 });
        break;
      case 'drill':
        Object.assign(target, { lean: 0, t1: 1.3, k1: 2.3, t2: 1.1, k2: 2.2, s1: 0.9, e1: 2.0, s2: 1.1, e2: 2.1, head: 0.4 });
        break;
    }
    // blend toward the target pose (fast for limbs, a bit slower on big transitions)
    const blend = 1 - Math.exp(-dt * (s.state === 'run' ? 24 : 16));
    for (const key of Object.keys(target) as (keyof Pose)[]) this.pose[key] += (target[key] - this.pose[key]) * blend;

    // ---- squash & stretch spring
    const stiff = 220;
    const damp = 16;
    this.syVel += (-(this.sy - 1) * stiff - this.syVel * damp) * dt;
    this.sy += this.syVel * dt;
    if (s.state === 'jump' || s.state === 'fall') {
      // stretch a little with vertical speed
      const st = Phaser.Math.Clamp(Math.abs(s.vy) / 900, 0, 0.12);
      this.sy += (1 + st - this.sy) * Math.min(1, dt * 8);
    }
    this.sy = Phaser.Math.Clamp(this.sy, 0.7, 1.25);

    // ---- flips and drill spin
    if (s.state === 'drill') {
      this.spin += dt * 22 * s.facing;
      this.spinVel = 0;
    } else if (this.spinVel !== 0) {
      this.spin += this.spinVel * dt;
      if (Math.abs(this.spin) >= Math.PI * 2) {
        this.spin = 0;
        this.spinVel = 0;
      }
    } else {
      // settle to upright along the shortest way
      const w = Phaser.Math.Angle.Wrap(this.spin);
      this.spin = w * Math.exp(-dt * 18);
      if (Math.abs(this.spin) < 0.001) this.spin = 0;
    }
    if (s.state !== this.lastState && this.lastState === 'drill') this.spin = Phaser.Math.Angle.Wrap(this.spin);
    this.lastState = s.state;

    const P = this.pose;
    const sx = 1 / Math.sqrt(this.sy);
    const sy = this.sy;
    const cosS = Math.cos(this.spin);
    const sinS = Math.sin(this.spin);
    const cy = -24; // rotation centre (local)
    const F = s.facing;
    // local (forward, down-positive) -> world
    const W = (lx: number, ly: number): [number, number] => {
      let x = lx * sx;
      let y = ly * sy;
      // spin around body centre
      const ry = y - cy * sy;
      const rx = x * cosS - ry * sinS;
      const ry2 = x * sinS + ry * cosS;
      x = rx;
      y = ry2 + cy * sy;
      return [s.x + x * F, s.y + y];
    };

    const lean = P.lean;
    const hip: [number, number] = [Math.sin(lean) * 2, -HIP + P.bob];
    const sh: [number, number] = [hip[0] + Math.sin(lean) * (SHOULDER - HIP), hip[1] - Math.cos(lean) * (SHOULDER - HIP)];
    const neck: [number, number] = [sh[0] + Math.sin(lean + P.head) * 3, sh[1] - Math.cos(lean + P.head) * 3];
    const head: [number, number] = [sh[0] + Math.sin(lean + P.head) * (HEAD - SHOULDER), sh[1] - Math.cos(lean + P.head) * (HEAD - SHOULDER)];

    const limb = (root: [number, number], a: number, bend: number, l1: number, l2: number, kneeBack: boolean) => {
      const j: [number, number] = [root[0] + Math.sin(a) * l1, root[1] + Math.cos(a) * l1];
      const a2 = kneeBack ? a - bend : a + bend;
      const e: [number, number] = [j[0] + Math.sin(a2) * l2, j[1] + Math.cos(a2) * l2];
      return [j, e] as const;
    };
    const [knee1, foot1] = limb(hip, P.t1 + lean * 0.3, P.k1, THIGH, SHIN, true);
    const [knee2, foot2] = limb(hip, P.t2 + lean * 0.3, P.k2, THIGH, SHIN, true);
    const [elb1, hand1] = limb(sh, P.s1 + lean, P.e1, UPPER, FORE, false);
    const [elb2, hand2] = limb(sh, P.s2 + lean, P.e2, UPPER, FORE, false);

    const rim = this.rim;
    const flash = s.flash;
    const col = (c: number) => (flash > 0 ? Phaser.Display.Color.ValueToColor(c).lighten(flash * 60).color : c);
    const alpha = s.alpha;

    const seg = (a: [number, number], b: [number, number], w: number, c: number, outline = true) => {
      const A = W(a[0], a[1]);
      const B = W(b[0], b[1]);
      if (outline) {
        g.lineStyle(w + 2.4, rim, alpha);
        g.lineBetween(A[0], A[1], B[0], B[1]);
        g.fillStyle(rim, alpha);
        g.fillCircle(A[0], A[1], (w + 2.4) / 2);
        g.fillCircle(B[0], B[1], (w + 2.4) / 2);
      }
      g.lineStyle(w, col(c), alpha);
      g.lineBetween(A[0], A[1], B[0], B[1]);
      g.fillStyle(col(c), alpha);
      g.fillCircle(A[0], A[1], w / 2);
      g.fillCircle(B[0], B[1], w / 2);
    };

    const back = Phaser.Display.Color.ValueToColor(INK.suit).darken(25).color;

    // back limbs
    seg(sh, elb2, 3.6, back);
    seg(elb2, hand2, 3.2, back);
    seg(hip, knee2, 4.6, back);
    seg(knee2, foot2, 4, back);
    const f2 = W(foot2[0] + 2.5, foot2[1]);
    g.fillStyle(col(0x0d1018), alpha).fillCircle(f2[0], f2[1], 2.6);

    // scarf rope (world space, behind torso)
    const nW = W(neck[0] - 2, neck[1] + 1);
    this.simScarf(dt, nW[0], nW[1], s.vx);
    this.drawScarf(alpha);

    // torso
    seg(hip, sh, 9, INK.suit);
    // belt + chest stripe
    const b0 = W(hip[0] - 4, hip[1] - 1);
    const b1 = W(hip[0] + 4, hip[1] - 1);
    g.lineStyle(2, col(INK.suitLight), alpha).lineBetween(b0[0], b0[1], b1[0], b1[1]);
    const c0 = W(sh[0] + 3, sh[1] + 2);
    const c1 = W(hip[0] + 3.4, hip[1] - 4);
    gl.lineStyle(1.5, INK.visor, 0.55 * alpha).lineBetween(c0[0], c0[1], c1[0], c1[1]);

    // head (hood) and visor
    const H = W(head[0], head[1]);
    g.fillStyle(rim, alpha).fillCircle(H[0], H[1], 7.4);
    g.fillStyle(col(INK.suit), alpha).fillCircle(H[0], H[1], 6.2);
    const vA = W(head[0] + 1.5, head[1] - 2.2);
    const vB = W(head[0] + 6.3, head[1] - 1.8);
    const vC = W(head[0] + 5.8, head[1] + 1.4);
    const vD = W(head[0] + 1.2, head[1] + 1.2);
    g.fillStyle(INK.visor, alpha);
    g.fillPoints([{ x: vA[0], y: vA[1] }, { x: vB[0], y: vB[1] }, { x: vC[0], y: vC[1] }, { x: vD[0], y: vD[1] }], true);
    g.fillStyle(0xffffff, 0.85 * alpha).fillCircle(vB[0] - F * 1.4, vB[1] + 0.9, 0.9);
    gl.fillStyle(INK.visor, 0.25 * alpha).fillCircle((vA[0] + vC[0]) / 2, (vA[1] + vC[1]) / 2, 5);
    gl.fillStyle(INK.visor, 0.07 * alpha).fillCircle((vA[0] + vC[0]) / 2, (vA[1] + vC[1]) / 2, 9);

    // scarf knot at the neck
    const nk = W(neck[0], neck[1] + 1);
    g.fillStyle(col(INK.scarf), alpha).fillCircle(nk[0], nk[1], 3.6);

    // front limbs
    seg(hip, knee1, 4.8, INK.suit);
    seg(knee1, foot1, 4.2, INK.suit);
    const f1 = W(foot1[0] + 2.5, foot1[1]);
    g.fillStyle(col(0x0d1018), alpha).fillCircle(f1[0], f1[1], 2.8);
    g.fillStyle(INK.visor, alpha * 0.9).fillCircle(f1[0] + F * 1.5, f1[1] + 0.6, 0.9);
    seg(sh, elb1, 3.8, INK.suitLight);
    seg(elb1, hand1, 3.4, INK.suitLight);
    const h1 = W(hand1[0], hand1[1]);
    g.fillStyle(col(INK.skin), alpha).fillCircle(h1[0], h1[1], 2.1);
  }

  private simScarf(dt: number, ax: number, ay: number, vx = 0) {
    const pts = this.scarf;
    // teleported (respawn etc.): start the scarf over instead of stretching it across the level
    if (Math.hypot(pts[1].x - ax, pts[1].y - ay) > 40) {
      for (const p of pts) {
        p.x = p.px = ax;
        p.y = p.py = ay;
      }
    }
    const seg = 4.6;
    const steps = 2;
    const h = Math.min(dt, 1 / 30) / steps;
    for (let k = 0; k < steps; k++) {
      pts[0].x = ax;
      pts[0].y = ay;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        const flutter = Math.sin(this.time * 11 + i * 0.9) * (40 + Math.min(1, Math.abs(vx) / 120) * 260);
        const nx = p.x + (p.x - p.px) * 0.9;
        const ny = p.y + (p.y - p.py) * 0.9 + (420 + flutter) * h * h;
        p.px = p.x;
        p.py = p.y;
        p.x = nx;
        p.y = ny;
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const diff = (d - seg) / d;
          if (i === 1) {
            b.x -= dx * diff;
            b.y -= dy * diff;
          } else {
            a.x += dx * diff * 0.5;
            a.y += dy * diff * 0.5;
            b.x -= dx * diff * 0.5;
            b.y -= dy * diff * 0.5;
          }
        }
        pts[0].x = ax;
        pts[0].y = ay;
      }
    }
  }

  private drawScarf(alpha: number) {
    const pts = this.scarf;
    const g = this.g;
    const left: Phaser.Types.Math.Vector2Like[] = [];
    const right: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b.y - a.y);
      let ny = b.x - a.x;
      const d = Math.hypot(nx, ny) || 1;
      nx /= d;
      ny /= d;
      const w = 3.2 * (1 - i / pts.length) + 1.1;
      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }
    const poly = [...left, ...right.reverse()];
    g.fillStyle(INK.scarfDark, alpha).fillPoints(poly.map((p) => ({ x: p.x + 0.8, y: p.y + 1 })), true);
    g.fillStyle(INK.scarf, alpha).fillPoints(poly, true);
    // tassel
    const end = pts[pts.length - 1];
    g.fillStyle(INK.scarf, alpha).fillCircle(end.x, end.y, 1.8);
    this.glow.fillStyle(INK.scarf, 0.08 * alpha).fillCircle(pts[3].x, pts[3].y, 9);
  }

  destroy() {
    this.g.destroy();
    this.glow.destroy();
  }
}
