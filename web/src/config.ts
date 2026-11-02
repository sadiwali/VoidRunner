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
  maxHealth: 5, // hearts; health is tracked in half-hearts
  mass: 1,
  // game-feel additions (not in the 2015 build)
  coyoteTime: 0.1, // seconds you can still jump after running off a ledge
  jumpBuffer: 0.13, // seconds a jump press is remembered before landing
  jumpCut: 0.5, // vertical speed multiplier when the jump key is released early
  invulnerable: 1.2, // seconds of protection after taking damage
};

export const DAMAGE = {
  bullet: 2, // half-hearts (one heart, as in the original)
  stomp: 1, // half a heart for landing on a molerat's spiky back
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
  { key: 'lvl1', name: 'LEVEL ONE (COLD)', short: 'COLD', music: 0 },
  { key: 'lvl2', name: 'LEVEL TWO (DARK)', short: 'DARK', music: 1 },
  { key: 'lvl3', name: 'LEVEL THREE (DEATH)', short: 'DEATH', music: 2 },
];

export const UI_FONT = '"Chakra Petch", "Segoe UI", Arial, sans-serif';
export const TITLE_FONT = 'Orbitron, "Chakra Petch", sans-serif';
