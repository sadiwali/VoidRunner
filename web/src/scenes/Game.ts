import Phaser from 'phaser';
import { S, DT, GRAVITY, PLAYER, MOLERAT, TURRET, CAMERA, LEVELS, UI_FONT } from '../config';
import type { LevelData, Rect, Decor, MoleratData, TurretData, Sensor, SpriteSheet } from '../types';
import { audio } from '../audio';
import { Sayer, label } from '../ui';
import { load, save, unlock } from '../save';

// Unity units (y up) -> Phaser pixels (y down)
const px = (x: number) => x * S;
const py = (y: number) => -y * S;

type Body = Phaser.Physics.Arcade.Body;

interface Mole {
  d: MoleratData;
  rect: Phaser.GameObjects.Rectangle;
  body: Body;
  spr: Phaser.GameObjects.Sprite;
  toLeft: boolean;
  canJump: boolean;
  jumpReadyAt: number;
  runBackUntil: number;
  grounded: boolean;
}

interface Turret {
  d: TurretData;
  spr: Phaser.GameObjects.Sprite;
  awake: boolean;
  timer: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  img: Phaser.GameObjects.Image;
}

interface Keys {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  jump: Phaser.Input.Keyboard.Key[];
  slow: Phaser.Input.Keyboard.Key;
  zoom: Phaser.Input.Keyboard.Key;
}

export class Game extends Phaser.Scene {
  private lvl!: LevelData;
  private levelIndex = 0;
  private frames!: SpriteSheet['frames'];

  private groundBodies = new Set<Phaser.Physics.Arcade.StaticBody>();
  private solidRects: Rect[] = [];

  // player
  private plrRect!: Phaser.GameObjects.Rectangle;
  private plr!: Body;
  private plrSpr!: Phaser.GameObjects.Sprite;
  private startPos = { x: 0, y: 0 };
  private health = PLAYER.maxHealth;
  private grounded = false;
  private wasGrounded = true;
  private wallSliding = false;
  private wallJumpPress = false;
  private timesWallJumped = 0;
  private canDoubleJump = false;
  private facingRight = true;
  private drilling = false;
  private pendingJump = false;
  private frozen = true; // internalDeltaTime == 0 in the original
  private finished = false;
  private flashUntil = 0;
  private flashColor = 0xffffff;
  private flashCount = 0;

  // stats (a_* fields)
  private stats = { wallJumps: 0, hits: 0, healthPacks: 0, jumps: 0, deaths: 0 };
  private time0 = 0;
  private elapsed = 0;

  private moles: Mole[] = [];
  private turrets: Turret[] = [];
  private bullets: Bullet[] = [];
  private checkpoints: Rect[] = [];

  // camera (Unity space)
  private cam = { x: 0, y: 0, z: CAMERA.norm };
  private mapZoom = 0;
  private wheelUntil = 0;
  private bg!: Phaser.GameObjects.Image;

  // UI
  private keys!: Keys;
  private sayer!: Sayer;
  private achSayer!: Sayer;
  private hearts!: Phaser.GameObjects.Image;
  private timerText!: Phaser.GameObjects.Text;
  private red!: Phaser.GameObjects.Rectangle;
  private white!: Phaser.GameObjects.Rectangle;
  private pauseLayer!: Phaser.GameObjects.Container;
  private pauseText!: Phaser.GameObjects.Text;
  private paused = false;
  private pauseLeft = false;
  private touch = { left: false, right: false, down: false };
  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.groundBodies = new Set();
    this.solidRects = [];
    this.moles = [];
    this.turrets = [];
    this.bullets = [];
    this.health = PLAYER.maxHealth;
    this.stats = { wallJumps: 0, hits: 0, healthPacks: 0, jumps: 0, deaths: 0 };
    this.frozen = true;
    this.finished = false;
    this.paused = false;
    this.timesWallJumped = 0;
    this.wallSliding = false;
    this.grounded = false;
    this.wasGrounded = true;
    this.facingRight = true;
    this.mapZoom = 0;
    this.elapsed = 0;
  }

  create() {
    const meta = LEVELS[this.levelIndex];
    this.lvl = this.cache.json.get(meta.key) as LevelData;
    this.frames = (this.cache.json.get('sprites') as SpriteSheet).frames;
    this.physics.world.resume();

    this.buildLevel();
    this.buildPlayer();
    this.buildEnemies();
    this.buildUI();
    this.bindInput();

    this.physics.world.on('worldstep', this.fixedUpdate, this);
    this.events.once('shutdown', () => {
      this.physics.world?.off('worldstep', this.fixedUpdate, this);
      this.scale.off('resize', this.onResize, this);
    });

    audio.play(meta.music + 1);
    this.countdown(meta.name);
  }

  // ---------------------------------------------------------------- level
  private addDecor(d: Decor, depth: number) {
    const f = this.frames[d.f];
    if (!f) return null;
    const img = this.add.image(px(d.x), py(d.y), f.tex, d.f);
    img.setDisplaySize((f.w / f.ppu) * Math.abs(d.sx) * S, (f.h / f.ppu) * Math.abs(d.sy) * S);
    img.setFlip(d.sx < 0, d.sy < 0);
    img.setAngle(-d.rot);
    if (d.tint !== 0xffffff) img.setTint(d.tint);
    img.setDepth(depth + d.order);
    return img;
  }

  private buildLevel() {
    const L = this.lvl;
    this.bg = this.addDecor(L.bg, -100)!;

    for (const d of L.decor) this.addDecor(d, 0);

    for (const r of L.solids) {
      const rect = this.add.rectangle(px(r.x), py(r.y), r.w * S, r.h * S);
      rect.setVisible(false);
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      if (r.ground) this.groundBodies.add(body);
      this.solidRects.push(r);
    }
    this.checkpoints = L.checkpoints.map((c) => ({ ...c }));
  }

  private buildPlayer() {
    const p = this.lvl.player;
    this.startPos = { x: p.x, y: p.y };
    this.plrRect = this.add.rectangle(px(p.x + p.ox), py(p.y + p.oy), p.w * S, p.h * S);
    this.plrRect.setVisible(false);
    this.physics.add.existing(this.plrRect);
    this.plr = this.plrRect.body as Body;
    this.plr.setMass(PLAYER.mass);
    this.plr.setMaxVelocity(100 * S, 100 * S);

    this.plrSpr = this.add.sprite(0, 0, 'spr_char', 'char_0').setDepth(50);
    this.plrSpr.setScale(S / 18);
    this.plrSpr.play('plr_idle');

    const solids = this.physics.world.staticBodies;
    this.physics.add.collider(this.plrRect, [...solids].map((b) => b.gameObject));
    this.cam = { x: this.lvl.camera.x, y: this.lvl.camera.y, z: CAMERA.norm };
  }

  private buildEnemies() {
    const solids = [...this.physics.world.staticBodies].map((b) => b.gameObject);
    for (const d of this.lvl.molerats) {
      const rect = this.add.rectangle(px(d.x), py(d.y), d.w * S, d.h * S).setVisible(false);
      this.physics.add.existing(rect);
      const body = rect.body as Body;
      body.setMass(MOLERAT.mass);
      const spr = this.add.sprite(px(d.x), py(d.y), 'spr_npc_molerat', 'spr_npc_molerat_0').setDepth(40);
      spr.setScale((5 * S) / 100);
      spr.play('mole_idle');
      this.moles.push({ d, rect, body, spr, toLeft: true, canJump: true, jumpReadyAt: 0, runBackUntil: 0, grounded: false });
      this.physics.add.collider(rect, solids);
    }
    if (this.moles.length) {
      const rects = this.moles.map((m) => m.rect);
      this.physics.add.collider(this.plrRect, rects);
      this.physics.add.collider(rects, rects);
    }
    for (const d of this.lvl.turrets) {
      const spr = this.add.sprite(px(d.x), py(d.y), 'spr_npc_turret', 'Turret_ForTutorial_2_0').setDepth(30);
      spr.setScale((3 * S) / 18);
      this.turrets.push({ d, spr, awake: false, timer: 0 });
    }
  }

  // ---------------------------------------------------------------- UI
  private buildUI() {
    const W = this.scale.width;
    const H = this.scale.height;
    // A second camera draws the HUD unzoomed; the main camera ignores HUD objects.
    this.uiCam = this.cameras.add(0, 0, W, H).setName('ui');
    const before = new Set(this.children.list);

    this.red = this.add.rectangle(0, 0, W, H, 0xff0000).setOrigin(0).setAlpha(0).setDepth(900);
    this.white = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setAlpha(0).setDepth(901);
    this.add.image(0, 0, 'spr_vig').setOrigin(0).setDisplaySize(W, H).setAlpha(0.55).setDepth(899).setName('vig');
    this.hearts = this.add.image(20, 20, 'spr_hearts', 'Hearts_0').setOrigin(0).setScale(3).setDepth(950);
    this.timerText = label(this, W - 20, 20, '0', 22).setOrigin(1, 0).setDepth(950);
    label(this, 20, 66, LEVELS[this.levelIndex].name, 14, '#a9a6d6').setDepth(950).setName('lvlname');
    this.sayer = new Sayer(this, 0);
    this.achSayer = new Sayer(this, 1);

    // pause menu
    const panel = this.add.rectangle(0, 0, 420, 170, 0x0b0a18, 0.92).setStrokeStyle(2, 0xff5a5a);
    const title = this.add.text(0, -48, 'PAUSED', { fontFamily: UI_FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.pauseText = this.add.text(0, 18, '', { fontFamily: UI_FONT, fontSize: '22px', color: '#e8e6ff' }).setOrigin(0.5);
    const hint = this.add
      .text(0, 62, 'A / D to choose, Enter to confirm', { fontFamily: UI_FONT, fontSize: '13px', color: '#8f8cb8' })
      .setOrigin(0.5);
    this.pauseLayer = this.add.container(W / 2, H / 2, [panel, title, this.pauseText, hint]).setDepth(1100).setVisible(false);
    panel.setInteractive().on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pauseLeft = p.x < this.pauseLayer.x;
      this.confirmPause();
    });

    if (this.sys.game.device.input.touch) this.buildTouchControls();

    const hud = this.children.list.filter((o) => !before.has(o));
    this.cameras.main.ignore(hud);
    this.uiCam.ignore(this.children.list.filter((o) => before.has(o)));
    this.scale.on('resize', this.onResize, this);
  }

  private buildTouchControls() {
    const H = this.scale.height;
    const W = this.scale.width;
    const mk = (x: number, y: number, txt: string, on: (v: boolean) => void) => {
      const c = this.add.circle(x, y, 38, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.35).setDepth(960).setName('touch');
      const t = this.add.text(x, y, txt, { fontFamily: UI_FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setDepth(961).setName('touch');
      t.setAlpha(0.7);
      c.setInteractive();
      c.on('pointerdown', () => on(true));
      c.on('pointerup', () => on(false));
      c.on('pointerout', () => on(false));
    };
    mk(60, H - 70, '◀', (v) => (this.touch.left = v));
    mk(150, H - 70, '▶', (v) => (this.touch.right = v));
    mk(W - 150, H - 70, '▼', (v) => (this.touch.down = v));
    mk(W - 60, H - 110, '▲', (v) => {
      if (v) this.pendingJump = true;
    });
    const pause = this.add.text(W - 20, 56, 'II', { fontFamily: UI_FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(1, 0).setDepth(961);
    pause.setInteractive().on('pointerdown', () => this.togglePause());
  }

  private onResize(size: Phaser.Structs.Size) {
    const { width: W, height: H } = size;
    this.uiCam.setSize(W, H);
    this.red.setSize(W, H);
    this.white.setSize(W, H);
    (this.children.getByName('vig') as Phaser.GameObjects.Image)?.setDisplaySize(W, H);
    this.timerText.setX(W - 20);
    this.pauseLayer.setPosition(W / 2, H / 2);
    this.sayer.layout();
    this.achSayer.layout();
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: [kb.addKey(K.A), kb.addKey(K.LEFT)],
      right: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
      down: [kb.addKey(K.S), kb.addKey(K.DOWN)],
      jump: [kb.addKey(K.SPACE), kb.addKey(K.W), kb.addKey(K.UP)],
      slow: kb.addKey(K.CTRL),
      zoom: kb.addKey(K.Z),
    };
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    for (const k of this.keys.jump) k.on('down', () => !this.paused && (this.pendingJump = true));
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-M', () => {
      const m = !audio.muted;
      audio.setMuted(m);
      save({ muted: m });
      this.sayer.say(m ? 'Muted' : 'Sound on', 1, null);
    });
    const pauseNav = (left: boolean) => {
      if (!this.paused) return;
      this.pauseLeft = left;
      audio.sfx('select');
      this.renderPause();
    };
    kb.on('keydown-A', () => pauseNav(true));
    kb.on('keydown-LEFT', () => pauseNav(true));
    kb.on('keydown-D', () => pauseNav(false));
    kb.on('keydown-RIGHT', () => pauseNav(false));
    kb.on('keydown-ENTER', () => this.paused && this.confirmPause());
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy > 0) {
        this.mapZoom = Math.max(CAMERA.mapZoomOut, this.mapZoom - dy * 0.02);
        this.wheelUntil = this.time.now + 500;
      } else if (dy < 0) this.mapZoom = 0;
    });
  }

  private axis() {
    const l = this.keys.left.some((k) => k.isDown) || this.touch.left;
    const r = this.keys.right.some((k) => k.isDown) || this.touch.right;
    return (r ? 1 : 0) - (l ? 1 : 0);
  }

  private togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.pauseLeft = false;
    this.pauseLayer.setVisible(this.paused);
    if (this.paused) this.physics.world.pause();
    else this.physics.world.resume();
    this.renderPause();
  }

  private renderPause() {
    this.pauseText.setText(this.pauseLeft ? '( back )          resume' : 'back          ( resume )');
  }

  private confirmPause() {
    if (this.pauseLeft) {
      this.physics.world.resume();
      this.scene.start('Menu');
    } else this.togglePause();
  }

  // ---------------------------------------------------------------- flow
  private countdown(name: string) {
    this.sayer.say(name, 2);
    let i = 3;
    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        if (i > 0) this.sayer.say(String(i), 1, 'select');
        else this.endFreezeTime();
        i--;
      },
    });
  }

  private endFreezeTime() {
    this.frozen = false;
    this.time0 = this.time.now;
    this.sayer.say('GO!', 1, 'notif');
  }

  private achievement(name: string) {
    if (unlock(name)) this.achSayer.say(`( ${name} )`, 5, 'ach');
  }

  private damage(n: number) {
    this.red.setAlpha(0.5);
    this.stats.hits++;
    if (this.stats.hits > 1) this.achievement('bandageman');
    this.health -= n;
    audio.sfx('hit');
    this.flash(0xff4040, 3);
    if (this.health <= 0) this.die();
  }

  private die() {
    this.stats.deaths++;
    this.health = PLAYER.maxHealth;
    this.plr.reset(px(this.startPos.x + this.lvl.player.ox), py(this.startPos.y + this.lvl.player.oy));
    this.plr.setVelocity(0, 0);
    this.canDoubleJump = false;
    audio.sfx('die');
    this.flash(0x4060ff, 2);
  }

  private flash(color: number, times: number) {
    this.flashColor = color;
    this.flashCount = times;
    this.flashUntil = this.time.now + times * 400;
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.frozen = true;
    const seconds = Math.floor(this.elapsed);
    this.white.setAlpha(0.5);
    if (seconds < 60) this.achievement('quick');
    const key = LEVELS[this.levelIndex].key;
    const d = load();
    const best = d.best[key];
    const isBest = best === undefined || seconds < best;
    const next = this.levelIndex + 1;
    save({ level: next >= LEVELS.length ? 0 : next, best: { ...d.best, ...(isBest ? { [key]: seconds } : {}) } });
    if (next >= LEVELS.length) this.achievement('finisher');
    const s = this.stats;
    this.scene.launch('Transition', {
      summary: [
        `You finished in ${seconds} seconds${isBest ? ' (best!)' : ''},`,
        `walljumped ${s.wallJumps} times,`,
        `got hit ${s.hits} times,`,
        `jumped ${s.jumps} times,`,
        `died ${s.deaths} times.`,
      ].join('\n'),
      next: next >= LEVELS.length ? -1 : next,
    });
    this.scene.pause();
  }

  // ---------------------------------------------------------------- physics helpers
  /** Static ground bodies overlapping a rect given in Unity units (centre x/y, size). */
  private groundAt(cx: number, cy: number, w: number, h: number, groundOnly = true) {
    const bodies = this.physics.overlapRect(px(cx - w / 2), py(cy + h / 2), w * S, h * S, false, true) as Phaser.Physics.Arcade.StaticBody[];
    if (groundOnly) return bodies.some((b) => this.groundBodies.has(b));
    return bodies.length > 0;
  }

  /** Rotated platforms (two in level two): treat the top face as a one-way floor. */
  private slopeSnap(body: Body): boolean {
    let landed = false;
    for (const s of this.lvl.slopes) {
      const fx = body.center.x / S;
      const fy = -body.bottom / S;
      const r = (s.rot * Math.PI) / 180;
      const dx = fx - s.x;
      const dy = fy - s.y;
      const lx = dx * Math.cos(r) + dy * Math.sin(r);
      const ly = -dx * Math.sin(r) + dy * Math.cos(r);
      if (Math.abs(lx) > s.w / 2 || ly > s.h / 2 + 0.05 || ly < -s.h / 2) continue;
      if (-body.velocity.y / S > 0.5) continue; // moving up through it
      const surfDy = (s.h / 2 + dx * Math.sin(r)) / Math.cos(r);
      const newBottom = py(s.y + surfDy);
      body.y += newBottom - body.bottom;
      if (body.velocity.y > 0) body.velocity.y = 0;
      landed = true;
    }
    return landed;
  }

  // ---------------------------------------------------------------- 50 Hz logic (FixedUpdate)
  private fixedUpdate() {
    if (this.paused) return;
    this.playerStep();
    for (const m of this.moles) this.moleStep(m);
  }

  private playerStep() {
    const b = this.plr;
    const L = this.lvl.player;
    const onSlope = this.slopeSnap(b);
    const cx = b.center.x / S;
    const bottom = -b.bottom / S;
    // GroundChecker: a thin box under the feet that only reacts to "ground"-tagged colliders
    this.grounded = onSlope || this.groundAt(cx, bottom - 0.05, L.w * 0.95, 0.12);
    // WallChecker: a small box at knee height just in front of the body
    const dir = this.facingRight ? 1 : -1;
    const kneeY = -b.center.y / S - 0.5;
    const wallProbe = this.groundAt(cx + dir * (L.w / 2 + 0.07), kneeY, 0.14, 0.17);
    const nowWall = !this.grounded && wallProbe;
    if (this.wallSliding && !nowWall) {
      // WallCheck.OnTriggerExit2D -> IncrementTimesWallJumped
      if (this.wallJumpPress) {
        this.timesWallJumped++;
        this.stats.wallJumps++;
        this.wallJumpPress = false;
        audio.sfx('wall');
      }
    }
    this.wallSliding = nowWall;
    if (this.grounded && !this.wasGrounded) audio.sfx('land');
    this.wasGrounded = this.grounded;

    let vx = b.velocity.x / S;
    let vy = -b.velocity.y / S;
    const k = this.frozen ? 0 : 1; // internalDeltaTime
    const ax = this.frozen ? 0 : this.axis();
    let fx = 0;
    let fy = 0;

    // ---- Update(): facing, drilling, jump (forces accumulate until the next physics step)
    if (!this.wallSliding && k) {
      if (ax < 0) this.facingRight = false;
      if (ax > 0) this.facingRight = true;
      const down = this.keys.down.some((key) => key.isDown) || this.touch.down;
      this.drilling = !this.grounded && down;
      if (this.drilling) fy -= PLAYER.drillSpeed;
      if (this.pendingJump) {
        if (this.grounded) {
          this.stats.jumps++;
          if (this.stats.jumps > 50) this.achievement('stronglegs');
          fy += PLAYER.jumpPower; // AddForce in Update, applied on the next physics step
          this.canDoubleJump = true;
          audio.sfx('jump');
        } else if (this.canDoubleJump) {
          this.canDoubleJump = false;
          vy = 0;
          fy += PLAYER.jumpPower;
          audio.sfx('jump');
        }
      }
    } else if (this.wallSliding) this.drilling = false;
    this.pendingJump = false;

    // ---- FixedUpdate()
    if (this.wallSliding && this.keys.slow.isDown) vy *= 0.5 * k;
    const dampedVx = vx * 0.75;
    if (this.wallSliding) {
      if ((ax > 0 && !this.facingRight) || (ax < 0 && this.facingRight)) {
        this.wallJumpPress = true;
        fy += Phaser.Math.Clamp(
          PLAYER.maxWallJumpPower - this.timesWallJumped * PLAYER.wallJumpDecreaseMultiplier * k,
          PLAYER.minWallJumpPower,
          PLAYER.maxWallJumpPower,
        );
      }
      if (vy > PLAYER.maxVerticalSpeed) vy = PLAYER.maxVerticalSpeed;
    }
    fx += PLAYER.speed * ax * k;
    if (this.grounded) {
      this.timesWallJumped = 0;
      vx = dampedVx;
    }
    vx = Phaser.Math.Clamp(vx, -PLAYER.maxSpeed, PLAYER.maxSpeed);
    // Physics integration of accumulated forces (F = m a, one step)
    vx += (fx / PLAYER.mass) * DT;
    vy += (fy / PLAYER.mass) * DT;
    b.setVelocity(vx * S, -vy * S);
  }

  private sensorHit(m: Mole, s: Sensor) {
    // Sensor offsets were authored facing left (scale +5); mirror when facing right.
    const flip = m.toLeft ? 1 : -1;
    const cx = m.body.center.x / S + s.x * flip;
    const cy = -m.body.center.y / S + s.y;
    return this.groundAt(cx, cy, s.w, s.h);
  }

  private moleStep(m: Mole) {
    const b = m.body;
    const now = this.time.now;
    const mx = b.center.x / S;
    const my = -b.center.y / S;
    const tx = this.plr.center.x / S;
    const ty = -this.plr.center.y / S;
    const onSlope = this.slopeSnap(b);
    m.grounded = onSlope || this.groundAt(mx, -b.bottom / S - 0.05, m.d.w * 0.6, 0.1, false);
    let vx = b.velocity.x / S;
    let vy = -b.velocity.y / S;
    let fx = 0;
    let fy = 0;
    const sens = m.d.sensors;
    const platUp = this.sensorHit(m, sens.platformCheckUp);
    const platDown = this.sensorHit(m, sens.platformCheckDown);
    // edgeChecker leaves the ground -> back off the ledge for a moment
    const edge = m.grounded && !this.sensorHit(m, sens.edgeChecker);
    if (now < m.runBackUntil || (edge && !platUp && !platDown)) {
      if (now >= m.runBackUntil) {
        m.runBackUntil = now + MOLERAT.runBackTime * 1000;
        vx = 0;
      }
      fx += (m.toLeft ? 1 : -1) * MOLERAT.speed * 2;
    } else {
      m.toLeft = mx >= tx;
      const toUp = my < ty;
      const dist = Math.hypot(mx - tx, my - ty);
      const idle = Math.abs(my - ty) > MOLERAT.maxVerticalDistance || dist > MOLERAT.maxHorizontalDistance;
      if (platUp && toUp && Math.abs(my - ty) > 2 && now >= m.jumpReadyAt && m.grounded) {
        vx = 0;
        vy = 0;
        fx += m.toLeft ? -150 : 150;
        fy += 120 * Phaser.Math.Clamp(Math.abs(my - ty), 4, 8);
        m.jumpReadyAt = now + 2000;
      }
      if (!idle) fx += (m.toLeft ? -1 : 1) * MOLERAT.speed;
      m.spr.setFlipX(!m.toLeft);
      const anim = idle ? 'mole_idle' : 'mole_walk';
      if (m.spr.anims.currentAnim?.key !== anim) m.spr.play(anim);
    }
    // ground friction stand-in
    if (m.grounded && fx === 0) vx *= 0.85;
    vx += (fx / MOLERAT.mass) * DT;
    vy += (fy / MOLERAT.mass) * DT;
    vx = Phaser.Math.Clamp(vx, -MOLERAT.maxSpeed, MOLERAT.maxSpeed);
    b.setVelocity(vx * S, -vy * S);
  }

  // ---------------------------------------------------------------- per-frame
  update(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.sayer.update(dt);
    this.achSayer.update(dt);
    if (this.paused) return;

    if (!this.frozen && !this.finished) this.elapsed = (this.time.now - this.time0) / 1000;
    this.timerText.setText(`${Math.floor(this.elapsed)}s`);
    this.hearts.setFrame(`Hearts_${Phaser.Math.Clamp(PLAYER.maxHealth - this.health, 0, 5)}`);
    this.red.setAlpha(Phaser.Math.Linear(this.red.alpha, 0, Math.min(1, dt * 3)));

    this.updatePlayerSprite();
    for (const m of this.moles) m.spr.setPosition(m.body.center.x, m.body.center.y);
    this.updateTurrets(dt);
    this.updateBullets(dt);
    this.checkTriggers();
    this.updateCamera(dt);
  }

  private updatePlayerSprite() {
    const b = this.plr;
    const L = this.lvl.player;
    const dir = this.facingRight ? 1 : -1;
    this.plrSpr.setFlipX(!this.facingRight);
    this.plrSpr.setPosition(b.center.x - L.ox * dir * S, b.center.y + L.oy * S);
    const vy = -b.velocity.y;
    let anim = 'plr_idle';
    if (this.drilling) anim = 'plr_drill';
    else if (this.wallSliding) anim = 'plr_wall';
    else if (!this.grounded) anim = vy < 0 ? 'plr_fall' : 'plr_jump';
    else if (Math.abs(b.velocity.x) > 0.3 * S) anim = 'plr_walk';
    if (this.plrSpr.anims.currentAnim?.key !== anim) this.plrSpr.play(anim);
    if (this.time.now < this.flashUntil) {
      const phase = Math.floor((this.flashUntil - this.time.now) / 200) % 2;
      if (phase === 1) this.plrSpr.setTint(this.flashColor);
      else this.plrSpr.clearTint();
    } else if (this.flashCount) {
      this.flashCount = 0;
      this.plrSpr.clearTint();
    }
  }

  private updateTurrets(dt: number) {
    const tx = this.plr.center.x / S;
    const ty = -this.plr.center.y / S;
    for (const t of this.turrets) {
      const dist = Math.hypot(t.d.x - tx, t.d.y - ty);
      const awake = dist < TURRET.wakeRange;
      const right = tx > t.d.x;
      if (awake !== t.awake) {
        t.awake = awake;
        t.spr.play(awake ? 'turret_wake' : 'turret_sleep');
      } else if (awake && !t.spr.anims.isPlaying) {
        t.spr.setFrame(right ? 'Turret_ForTutorial_2_26' : 'Turret_ForTutorial_2_22');
      }
      // AttackCone: while the player is inside the circle the shot timer runs
      if (dist < t.d.range && !this.frozen) {
        t.timer += dt;
        if (t.timer >= TURRET.shootInterval) {
          t.timer = 0;
          const [sx, sy] = right ? t.d.ShootPointRight : t.d.ShootPointLeft;
          const len = Math.hypot(tx - t.d.x, ty - t.d.y) || 1;
          const img = this.add.image(px(sx), py(sy), 'spr_npc_turret', 'Bullet').setDepth(45);
          img.setDisplaySize(TURRET.bulletSize * S, TURRET.bulletSize * S);
          this.uiCam.ignore(img);
          this.bullets.push({
            x: sx,
            y: sy,
            vx: ((tx - t.d.x) / len) * TURRET.bulletSpeed,
            vy: ((ty - t.d.y) / len) * TURRET.bulletSpeed,
            ox: t.d.x,
            oy: t.d.y,
            img,
          });
          if (dist < 16) audio.sfx('shoot');
        }
      }
    }
  }

  private updateBullets(dt: number) {
    const b = this.plr;
    const half = TURRET.bulletSize / 2;
    this.bullets = this.bullets.filter((u) => {
      u.vy -= GRAVITY * TURRET.bulletGravityScale * dt;
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      u.img.setPosition(px(u.x), py(u.y));
      let dead = Math.hypot(u.x - u.ox, u.y - u.oy) > 50;
      const bx = px(u.x);
      const by = py(u.y);
      if (!dead && bx + half * S > b.left && bx - half * S < b.right && by + half * S > b.top && by - half * S < b.bottom) {
        if (!this.frozen) this.damage(1);
        dead = true;
      }
      if (!dead) {
        for (const r of this.solidRects) {
          if (Math.abs(u.x - r.x) < r.w / 2 + half && Math.abs(u.y - r.y) < r.h / 2 + half) {
            // the turret's own collider doesn't stop its bullets
            if (Math.hypot(r.x - u.ox, r.y - u.oy) < 0.5) continue;
            dead = true;
            break;
          }
        }
      }
      if (dead) u.img.destroy();
      return !dead;
    });
  }

  private checkTriggers() {
    const b = this.plr;
    const cx = b.center.x / S;
    const cy = -b.center.y / S;
    const hw = b.halfWidth / S;
    const hh = b.halfHeight / S;
    const hit = (r: Rect) => Math.abs(cx - r.x) < r.w / 2 + hw && Math.abs(cy - r.y) < r.h / 2 + hh;
    for (const d of this.lvl.death) if (hit(d)) this.die();
    this.checkpoints = this.checkpoints.filter((c) => {
      if (!hit(c)) return true;
      this.startPos = { x: c.x, y: c.y };
      this.sayer.say('Checkpoint reached!', 2, null);
      audio.sfx('checkpoint');
      return false;
    });
    if (hit(this.lvl.exit)) this.finish();
  }

  private updateCamera(dt: number) {
    const b = this.plr;
    const speed = Math.hypot(b.velocity.x, b.velocity.y) / S;
    if (this.keys.zoom.isDown) this.mapZoom = CAMERA.mapZoomOut;
    else if (this.time.now > this.wheelUntil) this.mapZoom = 0;
    const zTarget = Phaser.Math.Clamp(-speed, CAMERA.max, CAMERA.norm) + this.mapZoom;
    const t = Math.min(1, CAMERA.speed * dt);
    this.cam.x += (b.center.x / S - this.cam.x) * t;
    this.cam.y += (-b.center.y / S - this.cam.y) * t;
    this.cam.z += (zTarget - this.cam.z) * t;

    const W = this.scale.width;
    const H = this.scale.height;
    const viewH = Math.min(H, (W * 9) / 16);
    const dist = -this.cam.z;
    const visible = 2 * dist * CAMERA.fovTan; // world units visible vertically
    const zoom = viewH / (visible * S);
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    cam.centerOn(px(this.cam.x), py(this.cam.y));

    // Background sits CAMERA.bgDepth units behind the play plane: perspective parallax.
    const bg = this.lvl.bg;
    const k = dist / (dist + CAMERA.bgDepth);
    const f = this.frames[bg.f];
    this.bg.setPosition(px(this.cam.x + (bg.x - this.cam.x) * k), py(this.cam.y + (bg.y - this.cam.y) * k));
    this.bg.setDisplaySize((f.w / f.ppu) * bg.sx * S * k, (f.h / f.ppu) * bg.sy * S * k);
  }
}
