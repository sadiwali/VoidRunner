export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  ground?: boolean;
}

export interface Decor {
  f: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  rot: number;
  order: number;
  tint: number;
}

export interface Sensor {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MoleratData {
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  sensors: { edgeChecker: Sensor; platformCheckUp: Sensor; platformCheckDown: Sensor };
}

export interface TurretData {
  x: number;
  y: number;
  ShootPointLeft: [number, number];
  ShootPointRight: [number, number];
  range: number;
}

export interface LevelData {
  solids: Rect[];
  slopes: Rect[];
  decor: Decor[];
  checkpoints: Rect[];
  molerats: MoleratData[];
  turrets: TurretData[];
  death: Rect[];
  exit: Rect;
  player: { x: number; y: number; w: number; h: number; ox: number; oy: number };
  camera: { x: number; y: number };
  bg: Decor;
}

export interface SpriteFrame {
  tex: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ppu: number;
}

export interface SpriteSheet {
  frames: Record<string, SpriteFrame>;
  clips: Record<string, { frames: string[]; rate: number; stop: number }>;
}
