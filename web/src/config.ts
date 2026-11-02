// Pixels per Unity unit. Level data stays in Unity units (y up) and is converted on load.
export const S = 32;

// Unity physics ran FixedUpdate at 50 Hz with gravity 9.81. We run Arcade at the same rate.
export const STEP_HZ = 50;
export const DT = 1 / STEP_HZ;
export const GRAVITY = 9.81;

// Values recovered from the serialized Player / molerat / Turret / CameraFollow components.
export const PLAYER = {
  maxSpeed: 4,
  speed: 50,
  jumpPower: 300,
  maxVerticalSpeed: 8,
  maxWallJumpPower: 55,
  minWallJumpPower: 20,
  drillSpeed: 10,
  wallJumpDecreaseMultiplier: 5,
  maxHealth: 5,
  mass: 1,
};

export const MOLERAT = {
  speed: 10,
  maxVerticalDistance: 10,
  maxHorizontalDistance: 10,
  runBackTime: 0.1,
  mass: 1.1,
  maxSpeed: 4, // Unity's ground friction kept them from accelerating forever; this stands in for it
};

export const TURRET = {
  wakeRange: 12,
  shootInterval: 3,
  bulletSpeed: 11,
  bulletGravityScale: 0.1,
  bulletSize: 0.44,
};

export const CAMERA = {
  speed: 6,
  norm: -8, // closest z
  max: -15, // furthest z
  mapZoomOut: -30, // extra distance while holding Z / scrolling down
  bgDepth: 12.1,
  fovTan: Math.tan((30 * Math.PI) / 180),
};

export const LEVELS = [
  { key: 'lvl1', name: 'LEVEL ONE (COLD)', music: 0 },
  { key: 'lvl2', name: 'LEVEL TWO (DARK)', music: 1 },
  { key: 'lvl3', name: 'LEVEL THREE (DEATH)', music: 2 },
];

export const UI_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
