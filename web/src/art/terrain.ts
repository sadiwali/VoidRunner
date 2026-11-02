import Phaser from 'phaser';
import { S } from '../config';
import type { LevelData, Rect } from '../types';
import { THEMES, mix, rng } from './theme';

type Put = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

interface Box {
  l: number;
  r: number;
  t: number; // top (Unity y, up)
  b: number;
}

const box = (r: Rect): Box => ({ l: r.x - r.w / 2, r: r.x + r.w / 2, t: r.y + r.h / 2, b: r.y - r.h / 2 });
const inside = (bx: Box, x: number, y: number) => x > bx.l && x < bx.r && y > bx.b && y < bx.t;

/** Runs of an edge that are not covered by any other box (so seams between touching blocks stay hidden). */
function exposedRuns(
  boxes: Box[],
  self: number,
  from: [number, number],
  to: [number, number],
  normal: [number, number],
): [number, number][] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.max(2, Math.ceil(len / 0.1));
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from[0] + (to[0] - from[0]) * t + normal[0] * 0.06;
    const y = from[1] + (to[1] - from[1]) * t + normal[1] * 0.06;
    let covered = false;
    for (let j = 0; j < boxes.length && !covered; j++) if (j !== self && inside(boxes[j], x, y)) covered = true;
    if (!covered && start < 0) start = t;
    if ((covered || i === steps) && start >= 0) {
      const end = covered ? (i - 1) / steps : 1;
      if (end > start) runs.push([start, end]);
      start = -1;
    }
  }
  return runs;
}

/**
 * Draws the level's solid geometry: textured rock with glowing rims on exposed edges and theme flora.
 * Visuals come straight from the collision boxes, so what you see is exactly what you can stand on.
 */
export function buildTerrain(scene: Phaser.Scene, put: Put, L: LevelData, themeIndex: number, skip: (r: Rect) => boolean) {
  const T = THEMES[themeIndex];
  const solids = L.solids.filter((r) => !skip(r));
  const boxes = solids.map(box);
  const R = rng(1234 + themeIndex * 99 + solids.length);

  // 1. rock fill
  for (const r of solids) {
    const ts = scene.add.tileSprite(r.x * S, -r.y * S, r.w * S, r.h * S, `rock_${themeIndex}`);
    ts.tilePositionX = (r.x - r.w / 2) * S;
    ts.tilePositionY = -(r.y + r.h / 2) * S;
    ts.setDepth(10);
    put(ts);
  }
  for (const s of L.slopes) {
    const ts = scene.add.tileSprite(s.x * S, -s.y * S, s.w * S, s.h * S, `rock_${themeIndex}`);
    ts.setAngle(-s.rot).setDepth(10);
    put(ts);
  }

  const shade = put(scene.add.graphics().setDepth(11));
  const glow = put(scene.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD));
  const flora = put(scene.add.graphics().setDepth(13));
  const floraGlow = put(scene.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD));

  const P = (x: number, y: number) => [x * S, -y * S] as const;

  const topEdge = (x0: number, x1: number, y: number) => {
    const [ax, ay] = P(x0, y);
    const [bx] = P(x1, y);
    const w = bx - ax;
    // light falling over the lip
    shade.fillGradientStyle(T.rimSoft, T.rimSoft, T.rimSoft, T.rimSoft, 0.32, 0.32, 0, 0);
    shade.fillRect(ax, ay, w, 16);
    shade.fillStyle(T.rockLight, 1);
    shade.fillRect(ax, ay, w, 3);
    shade.fillStyle(T.rim, 1);
    shade.fillRect(ax, ay - 1, w, 2);
    glow.fillGradientStyle(T.rim, T.rim, T.rim, T.rim, 0, 0, 0.28, 0.28);
    glow.fillRect(ax, ay - 12, w, 12);
    glow.fillGradientStyle(T.rim, T.rim, T.rim, T.rim, 0.28, 0.28, 0, 0);
    glow.fillRect(ax, ay, w, 8);
    decorateTop(x0, x1, y);
  };
  const bottomEdge = (x0: number, x1: number, y: number) => {
    const [ax, ay] = P(x0, y);
    const [bx] = P(x1, y);
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    shade.fillRect(ax, ay - 14, bx - ax, 14);
    shade.fillStyle(mix(T.rockLight, T.rockDark, 0.5), 1);
    shade.fillRect(ax, ay - 2, bx - ax, 2);
    decorateBottom(x0, x1, y);
  };
  const sideEdge = (x: number, y0: number, y1: number, left: boolean) => {
    const [ax, ay] = P(x, y1);
    const [, by] = P(x, y0);
    const h = by - ay;
    if (left) {
      shade.fillGradientStyle(T.rockLight, 0x000000, T.rockLight, 0x000000, 0.35, 0, 0.35, 0);
      shade.fillRect(ax, ay, 8, h);
      shade.fillStyle(T.rockLight, 0.9);
      shade.fillRect(ax, ay, 2, h);
    } else {
      shade.fillGradientStyle(0x000000, T.rockLight, 0x000000, T.rockLight, 0, 0.25, 0, 0.25);
      shade.fillRect(ax - 8, ay, 8, h);
      shade.fillStyle(T.rockLight, 0.7);
      shade.fillRect(ax - 2, ay, 2, h);
    }
    glow.fillStyle(T.rimSoft, 0.05);
    glow.fillRect(ax - 3, ay, 6, h);
  };

  function decorateTop(x0: number, x1: number, y: number) {
    const n = Math.floor((x1 - x0) * 1.1);
    for (let i = 0; i < n; i++) {
      if (R() > 0.55) continue;
      const x = x0 + 0.15 + R() * (x1 - x0 - 0.3);
      const [px, py] = P(x, y);
      const h = 4 + R() * 9;
      if (T.flora === 'ice') {
        // crystal shards
        const lean = (R() - 0.5) * 6;
        flora.fillStyle(mix(T.rim, 0xffffff, 0.3), 0.85);
        flora.fillTriangle(px - 3, py, px + 3, py, px + lean, py - h);
        flora.fillStyle(T.rimSoft, 0.9);
        flora.fillTriangle(px, py, px + 3, py, px + lean, py - h);
        if (R() < 0.4) floraGlow.fillStyle(T.rim, 0.12).fillCircle(px, py - h * 0.5, 6);
      } else if (T.flora === 'shrooms') {
        const cap = 3 + R() * 3.5;
        flora.fillStyle(0xd8c8e8, 0.9);
        flora.fillRect(px - 1, py - h, 2, h);
        const capCol = R() < 0.5 ? T.rim : T.accent;
        flora.fillStyle(capCol, 1);
        flora.slice(px, py - h, cap, Math.PI, 0, false).fillPath();
        floraGlow.fillStyle(capCol, 0.22).fillCircle(px, py - h, cap * 2.4);
      } else {
        // bone spikes and ribs
        const col = mix(0xe8dcc8, T.rim, 0.15);
        flora.fillStyle(col, 0.9);
        const lean = (R() - 0.5) * 8;
        flora.fillTriangle(px - 2.5, py, px + 2.5, py, px + lean, py - h);
        if (R() < 0.25) {
          flora.lineStyle(2, col, 0.8);
          flora.beginPath();
          flora.arc(px + 6, py, 6, Math.PI, Math.PI * 1.9);
          flora.strokePath();
        }
        if (R() < 0.3) floraGlow.fillStyle(T.rim, 0.15).fillCircle(px, py - 2, 5);
      }
    }
    // pebbles
    for (let i = 0; i < n * 0.6; i++) {
      const x = x0 + R() * (x1 - x0);
      const [px, py] = P(x, y);
      flora.fillStyle(T.rockLight, 0.9).fillRect(px, py - 2, 2 + R() * 2, 2);
    }
  }

  function decorateBottom(x0: number, x1: number, y: number) {
    const n = Math.floor((x1 - x0) * 0.8);
    for (let i = 0; i < n; i++) {
      if (R() > 0.5) continue;
      const x = x0 + 0.2 + R() * (x1 - x0 - 0.4);
      const [px, py] = P(x, y);
      const h = 5 + R() * 14;
      if (T.flora === 'ice') {
        flora.fillStyle(mix(T.rim, 0xffffff, 0.2), 0.7);
        flora.fillTriangle(px - 2.5, py, px + 2.5, py, px, py + h);
      } else if (T.flora === 'shrooms') {
        // hanging glow vines
        flora.lineStyle(1.5, mix(T.rockLight, T.rim, 0.3), 0.8);
        const sway = (R() - 0.5) * 6;
        flora.beginPath();
        flora.moveTo(px, py);
        flora.lineTo(px + sway, py + h * 1.4);
        flora.strokePath();
        floraGlow.fillStyle(T.accent, 0.5).fillCircle(px + sway, py + h * 1.4, 1.6);
        floraGlow.fillStyle(T.accent, 0.12).fillCircle(px + sway, py + h * 1.4, 5);
      } else {
        flora.fillStyle(T.rockDark, 1);
        flora.fillTriangle(px - 3, py, px + 3, py, px, py + h);
        floraGlow.fillStyle(T.rim, 0.25).fillCircle(px, py + h, 1.5);
      }
    }
  }

  // 2. edges
  boxes.forEach((bx, i) => {
    for (const [a, c] of exposedRuns(boxes, i, [bx.l, bx.t], [bx.r, bx.t], [0, 1]))
      topEdge(bx.l + (bx.r - bx.l) * a, bx.l + (bx.r - bx.l) * c, bx.t);
    for (const [a, c] of exposedRuns(boxes, i, [bx.l, bx.b], [bx.r, bx.b], [0, -1]))
      bottomEdge(bx.l + (bx.r - bx.l) * a, bx.l + (bx.r - bx.l) * c, bx.b);
    for (const [a, c] of exposedRuns(boxes, i, [bx.l, bx.b], [bx.l, bx.t], [-1, 0]))
      sideEdge(bx.l, bx.b + (bx.t - bx.b) * a, bx.b + (bx.t - bx.b) * c, true);
    for (const [a, c] of exposedRuns(boxes, i, [bx.r, bx.b], [bx.r, bx.t], [1, 0]))
      sideEdge(bx.r, bx.b + (bx.t - bx.b) * a, bx.b + (bx.t - bx.b) * c, false);
  });

  // 3. slopes: rim along their (rotated) top face
  for (const s of L.slopes) {
    const r = (s.rot * Math.PI) / 180;
    const ux = Math.cos(r);
    const uy = Math.sin(r);
    const nx = -Math.sin(r);
    const ny = Math.cos(r);
    const a = P(s.x - (ux * s.w) / 2 + (nx * s.h) / 2, s.y - (uy * s.w) / 2 + (ny * s.h) / 2);
    const b = P(s.x + (ux * s.w) / 2 + (nx * s.h) / 2, s.y + (uy * s.w) / 2 + (ny * s.h) / 2);
    shade.lineStyle(3, T.rockLight, 1).lineBetween(a[0], a[1] + 1.5, b[0], b[1] + 1.5);
    shade.lineStyle(2, T.rim, 1).lineBetween(a[0], a[1], b[0], b[1]);
    glow.lineStyle(9, T.rim, 0.16).lineBetween(a[0], a[1], b[0], b[1]);
  }
}

/** The bottomless void under each level. */
export function buildAbyss(scene: Phaser.Scene, put: Put, L: LevelData, themeIndex: number) {
  const T = THEMES[themeIndex];
  for (const d of L.death) {
    const g = put(scene.add.graphics().setDepth(5));
    const x = (d.x - d.w / 2 - 40) * S;
    const w = (d.w + 80) * S;
    const top = -(d.y + d.h / 2) * S;
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.95, 0.95);
    g.fillRect(x, top - 10 * S, w, 10 * S);
    g.fillStyle(0x000000, 0.95).fillRect(x, top, w, 40 * S);
    const glow = put(scene.add.graphics().setDepth(6).setBlendMode(Phaser.BlendModes.ADD));
    glow.fillGradientStyle(T.rimSoft, T.rimSoft, T.rimSoft, T.rimSoft, 0, 0, 0.25, 0.25);
    glow.fillRect(x, top - 3 * S, w, 3 * S);
  }
}
