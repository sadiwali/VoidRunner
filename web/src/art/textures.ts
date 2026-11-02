import Phaser from 'phaser';
import { THEMES, type Theme, mix, rng } from './theme';

// Every texture in the game is generated here at runtime. No image files ship with the game.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function add(scene: Phaser.Scene, key: string, c: HTMLCanvasElement, linear = true) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.addCanvas(key, c)!;
  t.setFilter(linear ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
  return t;
}

const rgb = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

/** Periodic value noise, so textures tile without seams. */
function makeNoise(period: number, seed: number) {
  const r = rng(seed);
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  const at = (x: number, y: number) => lat[((y % period) + period) % period * period + (((x % period) + period) % period)];
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = s(x - ix);
    const fy = s(y - iy);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return a + (b - a) * fy;
  };
}

function fbm(size: number, basePeriod: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const period = basePeriod << o;
    const n = makeNoise(period, seed + o * 101);
    const k = period / size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out[y * size + x] += n(x * k, y * k) * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Small shared sprites used for particles and glows. */
export function makeCommonTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('glow')) return;
  {
    const { c, g } = canvas(64, 64);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    add(scene, 'glow', c);
  }
  {
    const { c, g } = canvas(16, 16);
    const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 16);
    add(scene, 'dot', c);
  }
  {
    const { c, g } = canvas(32, 8);
    const gr = g.createLinearGradient(0, 0, 32, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(16, 4, 16, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    add(scene, 'streak', c);
  }
  {
    const { c, g } = canvas(64, 64);
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.stroke();
    add(scene, 'ring', c);
  }
  {
    // square chip for debris / dirt
    const { c, g } = canvas(8, 8);
    g.fillStyle = '#fff';
    g.fillRect(1, 1, 6, 6);
    add(scene, 'chip', c);
  }
  {
    const { c, g } = canvas(512, 512);
    const gr = g.createRadialGradient(256, 256, 120, 256, 256, 362);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0.9)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    add(scene, 'vignette', c);
  }
  {
    // star field, white so it can be tinted per level
    const { c, g } = canvas(512, 512);
    const r = rng(7);
    for (let i = 0; i < 260; i++) {
      const x = r() * 512;
      const y = r() * 512;
      const big = r() < 0.08;
      const rad = big ? 1.4 + r() * 1.2 : 0.4 + r() * 0.8;
      const a = 0.3 + r() * 0.7;
      if (big) {
        const gr = g.createRadialGradient(x, y, 0, x, y, rad * 4);
        gr.addColorStop(0, `rgba(255,255,255,${a * 0.5})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x - rad * 4, y - rad * 4, rad * 8, rad * 8);
      }
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    add(scene, 'stars', c);
  }
}

/** Background and terrain textures for one theme (built on first use). */
export function makeThemeTextures(scene: Phaser.Scene, index: number) {
  const key = (k: string) => `${k}_${index}`;
  if (scene.textures.exists(key('rock'))) return;
  const T: Theme = THEMES[index];

  // sky gradient
  {
    const { c, g } = canvas(4, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, rgb(T.skyTop));
    gr.addColorStop(1, rgb(T.skyBottom));
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    add(scene, key('sky'), c);
  }

  // nebula clouds (tileable fbm, two colours)
  {
    const N = 256;
    const a = fbm(N, 4, 5, 11 + index * 31);
    const b = fbm(N, 3, 4, 77 + index * 17);
    const { c, g } = canvas(N, N);
    const img = g.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const va = Math.max(0, a[i] - 0.45) * 2.4;
      const vb = Math.max(0, b[i] - 0.5) * 2.2;
      const col = mix(T.nebulaA, T.nebulaB, Math.min(1, vb / (va + vb + 0.001)));
      const alpha = Math.min(1, (va + vb) * 0.9);
      img.data[i * 4] = (col >> 16) & 255;
      img.data[i * 4 + 1] = (col >> 8) & 255;
      img.data[i * 4 + 2] = col & 255;
      img.data[i * 4 + 3] = Math.round(alpha * 255);
    }
    g.putImageData(img, 0, 0);
    add(scene, key('nebula'), c);
  }

  // distant floating rock silhouettes, tileable horizontally and vertically
  {
    const W = 1024;
    const H = 512;
    const { c, g } = canvas(W, H);
    const r = rng(300 + index);
    for (let i = 0; i < 9; i++) {
      const cx = r() * W;
      const cy = 80 + r() * (H - 160);
      const w = 60 + r() * 170;
      const h = 14 + r() * 26;
      for (const dx of [-W, 0, W]) {
        const x0 = cx + dx;
        g.fillStyle = rgb(mix(T.far, T.skyBottom, 0.15 + r() * 0.1));
        g.beginPath();
        g.moveTo(x0 - w / 2, cy);
        // jagged top
        const steps = 8;
        for (let s = 0; s <= steps; s++) g.lineTo(x0 - w / 2 + (w * s) / steps, cy - h * 0.3 - r() * h * 0.4);
        // tapering underside
        g.lineTo(x0 + w / 2, cy);
        g.lineTo(x0 + w * 0.25, cy + h * 0.9);
        g.lineTo(x0 + w * 0.05, cy + h * (1.6 + r()));
        g.lineTo(x0 - w * 0.15, cy + h * 1.1);
        g.lineTo(x0 - w * 0.35, cy + h * 0.6);
        g.closePath();
        g.fill();
        g.fillStyle = rgb(T.rimSoft, 0.25);
        g.fillRect(x0 - w / 2 + 4, cy - h * 0.55, w - 8, 1.5);
      }
    }
    add(scene, key('far'), c);
  }

  // rock fill texture
  {
    const N = 128;
    const n = fbm(N, 4, 4, 900 + index);
    const cracks = fbm(N, 8, 2, 1300 + index);
    const { c, g } = canvas(N, N);
    const img = g.createImageData(N, N);
    const r = rng(55 + index);
    for (let i = 0; i < N * N; i++) {
      let v = n[i];
      const cr = Math.abs(cracks[i] - 0.5);
      if (cr < 0.018) v -= 0.35; // thin dark veins
      v += (r() - 0.5) * 0.06; // grain
      const t = Phaser.Math.Clamp((v - 0.3) * 1.6, 0, 1);
      const col = mix(T.rockDark, T.rockMid, t);
      img.data[i * 4] = (col >> 16) & 255;
      img.data[i * 4 + 1] = (col >> 8) & 255;
      img.data[i * 4 + 2] = col & 255;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // a few faint glinting flecks
    for (let i = 0; i < 18; i++) {
      g.fillStyle = rgb(T.rimSoft, 0.25 + r() * 0.3);
      g.fillRect(Math.floor(r() * N), Math.floor(r() * N), 1, 1);
    }
    add(scene, key('rock'), c);
  }
}
