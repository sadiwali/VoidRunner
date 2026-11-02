// Colour themes for each level and the menu. Every visual in the game is drawn procedurally from these.

export interface Theme {
  name: string;
  skyTop: number;
  skyBottom: number;
  nebulaA: number; // nebula colours
  nebulaB: number;
  stars: number;
  far: number; // distant silhouette layer
  rockDark: number;
  rockMid: number;
  rockLight: number;
  rim: number; // glowing edge on top of platforms
  rimSoft: number;
  accent: number; // ambient particle colour
  ambient: 'snow' | 'spores' | 'embers';
  flora: 'ice' | 'shrooms' | 'bones';
}

export const THEMES: Theme[] = [
  {
    name: 'cold',
    skyTop: 0x050a1c,
    skyBottom: 0x0d2340,
    nebulaA: 0x1b5c8c,
    nebulaB: 0x3a2a7a,
    stars: 0xcfe8ff,
    far: 0x0a1830,
    rockDark: 0x0b1424,
    rockMid: 0x1a2c44,
    rockLight: 0x35577a,
    rim: 0x8ff0ff,
    rimSoft: 0x3fb6d8,
    accent: 0xdff6ff,
    ambient: 'snow',
    flora: 'ice',
  },
  {
    name: 'dark',
    skyTop: 0x07030f,
    skyBottom: 0x1a0a2a,
    nebulaA: 0x5a1a7a,
    nebulaB: 0x14306a,
    stars: 0xe8d8ff,
    far: 0x120720,
    rockDark: 0x0e0816,
    rockMid: 0x221532,
    rockLight: 0x4a2f66,
    rim: 0xd38bff,
    rimSoft: 0x8a4fd0,
    accent: 0xb7ff9a,
    ambient: 'spores',
    flora: 'shrooms',
  },
  {
    name: 'death',
    skyTop: 0x0c0306,
    skyBottom: 0x2a0a0c,
    nebulaA: 0x7a1a1a,
    nebulaB: 0x5a2a0a,
    stars: 0xffd8c8,
    far: 0x1c0608,
    rockDark: 0x130709,
    rockMid: 0x2c1214,
    rockLight: 0x5a2a26,
    rim: 0xff7a4a,
    rimSoft: 0xd0382a,
    accent: 0xffb060,
    ambient: 'embers',
    flora: 'bones',
  },
];

// Shared character colours
export const INK = {
  suit: 0x1c2233,
  suitLight: 0x3b4866,
  skin: 0xe9b38f,
  visor: 0x7ff6ff,
  scarf: 0xff3b5c,
  scarfDark: 0xb81f3e,
  moleFur: 0x5a3b2c,
  moleFurDark: 0x3a251b,
  moleBelly: 0x9a6f55,
  moleNose: 0xff8fa8,
  moleSpike: 0xf2ece0,
  moleEye: 0xffc04a,
  moleEyeAngry: 0xff3b30,
  metal: 0x3a4152,
  metalLight: 0x6b7590,
  metalDark: 0x1d212c,
  danger: 0xff3b30,
  ui: 0xe8e6ff,
  uiDim: 0x8f8cb8,
  uiAccent: 0xff4f6d,
};

export const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function mix(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/** Small deterministic PRNG so level decoration is identical every run. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
