import type { Mood } from '../art/molerat';

// Molerat brain. The 2015 molerat ran straight at the player whenever it was within 10 units and backed off
// ledges. This one patrols its patch, notices you only when it can actually see (or hear) you, reads the
// terrain to decide whether to climb, hop a gap, drop down or wait at a ledge, telegraphs a lunge before
// shoving you, loses track of you behind walls and goes looking at your last known position, then wanders home.
// All units are Unity units (y up), seconds.

export interface World {
  /** Top of the highest walkable surface directly under (x, y), at most maxDrop below; null if none. */
  floorBelow(x: number, y: number, maxDrop: number): number | null;
  /** Is the point inside solid geometry? */
  solidAt(x: number, y: number): boolean;
  /** Clear line of sight between two points? */
  los(ax: number, ay: number, bx: number, by: number): boolean;
}

export interface Senses {
  x: number; // body centre
  y: number;
  foot: number; // bottom of the body
  vx: number;
  vy: number;
  grounded: boolean;
  blockedAhead: boolean;
}

export interface Target {
  x: number;
  y: number; // centre
  foot: number;
  active: boolean; // false while dead / frozen
}

export interface Command {
  vx: number; // desired horizontal speed
  accel: number; // how hard to steer toward it (u/s^2)
  jump?: { vx: number; vy: number };
}

export const MOLE_TUNING = {
  sight: 9.5, // how far it can see
  hearing: 2.6, // always notices you this close, even without line of sight
  forget: 2.8, // seconds without seeing you before it gives up the chase
  give_up_distance: 17,
  patrolSpeed: 1.3,
  chaseSpeed: 3.5, // the player runs at 4, so you can outrun them on open ground
  lungeRange: 2.6,
  lungeSpeed: 7.2,
  lungeLift: 3.4,
  lungeCooldown: 1.7,
  windup: 0.38,
  alertTime: 0.45,
  stunTime: 1.0,
  maxJumpUp: 4.2,
  maxGap: 5,
  maxSafeDrop: 9,
  gravity: 9.81,
};

const K = MOLE_TUNING;

export class MoleBrain {
  mood: Mood = 'calm';
  moodT = 0;
  facing: 1 | -1 = -1;
  private homeX: number;
  private patrolTo: number;
  private sniffFor = 0;
  private lastSeen = { x: 0, y: 0, t: -99 };
  private chasedAt = -99;
  private lungeReady = 0;
  private jumpReady = 0;
  private losCache = false;
  private losAt = -1;
  private lungeDir: 1 | -1 = 1;
  private range: [number, number];
  private seed: number;

  constructor(
    x: number,
    private world: World,
    seed: number,
  ) {
    this.homeX = x;
    this.patrolTo = x;
    this.range = [x - 3, x + 3];
    this.seed = seed;
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed % 10000) / 10000;
  }

  private set(m: Mood) {
    if (this.mood !== m) {
      this.mood = m;
      this.moodT = 0;
    }
  }

  stun(now: number) {
    this.set('stunned');
    this.lungeReady = now + K.stunTime + 0.6;
  }

  respawned(now: number) {
    this.set('calm');
    this.lastSeen.t = -99;
    this.jumpReady = now + 1;
  }

  /** Was the last thing it did a lunge that is still in flight? */
  get lunging() {
    return this.mood === 'lunge';
  }

  think(now: number, dt: number, me: Senses, p: Target): Command {
    this.moodT += dt;
    const w = this.world;
    const dx = p.x - me.x;
    const dist = Math.hypot(dx, p.y - me.y);

    // ---- perception (line of sight is sampled 8 times a second)
    let sees = false;
    if (p.active && dist < K.sight) {
      if (now - this.losAt > 0.125) {
        this.losAt = now;
        this.losCache = w.los(me.x, me.y + 0.2, p.x, p.y + 0.4) || w.los(me.x, me.y + 0.2, p.x, p.foot + 0.2);
      }
      sees = this.losCache || dist < K.hearing;
    }
    if (sees) this.lastSeen = { x: p.x, y: p.foot, t: now };

    const dir = (to: number): 1 | -1 => (to >= me.x ? 1 : -1);

    // ---- state transitions
    switch (this.mood) {
      case 'stunned':
        if (this.moodT < K.stunTime) return { vx: 0, accel: 40 };
        this.set(p.active ? 'chase' : 'calm');
        this.chasedAt = now;
        break;
      case 'windup':
        if (this.moodT < K.windup) return { vx: 0, accel: 60 };
        this.set('lunge');
        this.lungeReady = now + K.lungeCooldown;
        return { vx: this.lungeDir * K.lungeSpeed, accel: 999, jump: { vx: this.lungeDir * K.lungeSpeed, vy: K.lungeLift } };
      case 'lunge':
        if (this.moodT < 0.15 || !me.grounded) return { vx: me.vx, accel: 0 };
        this.set('chase');
        break;
      case 'alert':
        this.facing = dir(p.x);
        if (this.moodT < K.alertTime) return { vx: 0, accel: 30 };
        this.set('chase');
        this.chasedAt = now;
        break;
    }

    const recentlyChasing = now - this.chasedAt < 4;
    if (sees && p.active && (this.mood === 'calm' || this.mood === 'sniff' || this.mood === 'search')) {
      if (recentlyChasing) this.set('chase');
      else this.set('alert');
      this.facing = dir(p.x);
      return { vx: 0, accel: 30 };
    }

    if (this.mood === 'chase' || this.mood === 'wait') {
      this.chasedAt = now;
      const lost = now - this.lastSeen.t > K.forget || !p.active;
      if (lost || dist > K.give_up_distance) {
        this.set(p.active && dist <= K.give_up_distance ? 'search' : 'calm');
        this.patrolTo = this.lastSeen.x;
      } else return this.chase(now, me, p, sees);
    }

    if (this.mood === 'search') {
      if (this.moodT > 4) {
        this.set('calm');
        this.patrolTo = this.homeX;
      } else return this.walkTo(now, me, this.lastSeen.x, K.patrolSpeed * 1.5, true);
    }

    // ---- calm: wander around home, stop to sniff now and then
    if (this.mood === 'sniff') {
      if (this.moodT < this.sniffFor) return { vx: 0, accel: 20 };
      this.set('calm');
      this.pickPatrol(me);
    }
    if (Math.abs(this.patrolTo - me.x) < 0.25) {
      this.set('sniff');
      this.sniffFor = 0.8 + this.rand() * 1.8;
      return { vx: 0, accel: 20 };
    }
    return this.walkTo(now, me, this.patrolTo, K.patrolSpeed, false);
  }

  private pickPatrol(me: Senses) {
    // stay within a few units of home; drift back if displaced
    const [a, b] = this.range;
    if (me.x < a - 1 || me.x > b + 1) this.patrolTo = this.homeX;
    else this.patrolTo = a + this.rand() * (b - a);
  }

  /** Walk toward x on safe ground; turns back at edges instead of falling. */
  private walkTo(now: number, me: Senses, x: number, speed: number, eager: boolean): Command {
    const d = x >= me.x ? 1 : -1;
    this.facing = d;
    if (!me.grounded) return { vx: me.vx, accel: 4 };
    const edge = this.w.floorBelow(me.x + d * 0.75, me.foot + 0.1, 0.6) === null;
    if (edge || me.blockedAhead) {
      if (eager) {
        const hop = this.planHop(now, me, d, x);
        if (hop) return hop;
      }
      // can't go further this way
      if (this.mood === 'calm') {
        this.patrolTo = me.x - d * 0.5;
        this.range = d > 0 ? [this.range[0], Math.min(this.range[1], me.x)] : [Math.max(this.range[0], me.x), this.range[1]];
      } else this.patrolTo = me.x;
      return { vx: 0, accel: 30 };
    }
    return { vx: d * speed, accel: 18 };
  }

  private get w() {
    return this.world;
  }

  private chase(now: number, me: Senses, p: Target, sees: boolean): Command {
    const tx = sees ? p.x : this.lastSeen.x;
    const ty = sees ? p.foot : this.lastSeen.y;
    const dx = tx - me.x;
    const dy = ty - me.foot;
    const d: 1 | -1 = Math.abs(dx) < 0.2 ? this.facing : dx > 0 ? 1 : -1;
    this.facing = d;
    if (!me.grounded) return { vx: me.vx, accel: 5 };

    // lunge when close, level and in sight
    if (sees && now >= this.lungeReady && Math.abs(dx) < K.lungeRange && Math.abs(dy) < 0.9) {
      this.lungeDir = d;
      this.set('windup');
      return { vx: 0, accel: 60 };
    }

    // target is above: look for a ledge to climb toward it
    if (dy > 1.2 && now >= this.jumpReady) {
      const j = this.planClimb(me, d, dx);
      if (j) {
        this.jumpReady = now + 1.2;
        this.set('chase');
        return j;
      }
    }

    const groundAhead = this.w.floorBelow(me.x + d * 0.75, me.foot + 0.1, 0.6) !== null;
    if (!groundAhead || me.blockedAhead) {
      // drop down if the target is below and the fall is survivable
      if (!me.blockedAhead && dy < -0.8) {
        const land = this.w.floorBelow(me.x + d * 1.1, me.foot, K.maxSafeDrop);
        if (land !== null) {
          this.set('chase');
          return { vx: d * K.chaseSpeed, accel: 18 };
        }
      }
      const hop = now >= this.jumpReady ? this.planHop(now, me, d, tx) : null;
      if (hop) {
        this.set('chase');
        return hop;
      }
      // nowhere to go: pace at the ledge and glare
      this.set('wait');
      return { vx: 0, accel: 30 };
    }

    if (Math.abs(dx) < 0.35) {
      this.set('wait');
      return { vx: 0, accel: 20 };
    }
    this.set('chase');
    return { vx: d * K.chaseSpeed, accel: 22 };
  }

  /** Find a reachable ledge above, toward the target, and jump onto it. */
  private planClimb(me: Senses, d: 1 | -1, dx: number): Command | null {
    const order: number[] = [];
    for (let s = 0.5; s <= 4.5; s += 0.35) order.push(d * s);
    if (Math.abs(dx) < 2) for (let s = 0.5; s <= 3.5; s += 0.35) order.push(-d * s);
    for (const off of order) {
      const x = me.x + off;
      const top = this.w.floorBelow(x, me.foot + K.maxJumpUp + 0.4, K.maxJumpUp + 0.4 - 0.7);
      if (top === null || top < me.foot + 0.7) continue;
      // headroom above the landing spot and the path up
      if (this.w.solidAt(x, top + 0.6) || this.w.solidAt(me.x, me.foot + (top - me.foot) + 1.4)) continue;
      return this.ballistic(me, x + Math.sign(off) * 0.3, top);
    }
    return null;
  }

  /** Jump across a gap or onto a step in direction d. */
  private planHop(now: number, me: Senses, d: 1 | -1, tx: number): Command | null {
    if (now < this.jumpReady) return null;
    if ((tx - me.x) * d < 0.5) return null;
    for (let s = 1.2; s <= K.maxGap; s += 0.3) {
      const x = me.x + d * s;
      const top = this.w.floorBelow(x, me.foot + 2.6, 5.5);
      if (top === null) continue;
      if (this.w.solidAt(x, top + 0.6)) continue;
      // need ground a little beyond the landing point too
      if (this.w.floorBelow(x + d * 0.5, top + 0.2, 0.4) === null) continue;
      this.jumpReady = now + 1.0;
      return this.ballistic(me, x + d * 0.4, top);
    }
    return null;
  }

  private ballistic(me: Senses, x: number, top: number): Command {
    const g = K.gravity;
    const apex = Math.max(me.foot, top) + 1.0;
    const vy = Math.sqrt(2 * g * (apex - me.foot));
    const down = Math.sqrt(Math.max(0, vy * vy - 2 * g * (top - me.foot)));
    const t = (vy + down) / g;
    const vx = Math.max(-6.5, Math.min(6.5, (x - me.x) / t));
    return { vx, accel: 999, jump: { vx, vy } };
  }
}
