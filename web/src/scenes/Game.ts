import Phaser from 'phaser';
import { S, DT, GRAVITY, PLAYER, DAMAGE, MOLERAT, TURRET, CAMERA, LEVELS, UI_FONT, TITLE_FONT } from '../config';
import type { LevelData, Rect, MoleratData, TurretData } from '../types';
import { audio } from '../audio';
import { Sayer, label, drawHearts, Button } from '../ui';
import { load, save, unlock } from '../save';
import { THEMES, INK, hex, mix } from '../art/theme';
import { makeThemeTextures } from '../art/textures';
import { buildTerrain, buildAbyss } from '../art/terrain';
import { Background } from '../art/background';
import { Fx } from '../art/fx';
import { RunnerView, type RunnerState } from '../art/runner';
import { MoleView } from '../art/molerat';
import { TurretView, Beacon, Portal, drawArrow } from '../art/props';
import { MoleBrain, type World } from '../ai/molerat';

// Unity units (y up) -> Phaser pixels (y down)
const px = (x: number) => x * S;
const py = (y: number) => -y * S;

type Body = Phaser.Physics.Arcade.Body;

interface Mole {
  d: MoleratData;
  rect: Phaser.GameObjects.Rectangle;
  body: Body;
  view: MoleView;
  brain: MoleBrain;
  grounded: boolean;
  prev: { x: number; y: number };
  cur: { x: number; y: number };
  wasGrounded: boolean;
  shovedAt: number;
}

interface Turret {
  d: TurretData;
  view: TurretView;
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
  core: Phaser.GameObjects.Image;
}

interface Keys {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  jump: Phaser.Input.Keyboard.Key[];
  slow: Phaser.Input.Keyboard.Key[];
  zoom: Phaser.Input.Keyboard.Key;
}

interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

export class Game extends Phaser.Scene {
  private lvl!: LevelData;
  private levelIndex = 0;
  private theme = THEMES[0];

  private groundBodies = new Set<Phaser.Physics.Arcade.StaticBody>();
  private solidRects: Rect[] = [];
  private boxes: Box[] = [];

  // layers / cameras
  private bgLayer!: Phaser.GameObjects.Layer;
  private worldLayer!: Phaser.GameObjects.Layer;
  private hudLayer!: Phaser.GameObjects.Layer;
  private bgCam!: Phaser.Cameras.Scene2D.Camera;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private background!: Background;
  private fx!: Fx;
  private bloom: Phaser.Filters.ParallelFilters | null = null;

  // player
  private plrRect!: Phaser.GameObjects.Rectangle;
  private plr!: Body;
  private runner!: RunnerView;
  private plrPrev = { x: 0, y: 0 };
  private plrCur = { x: 0, y: 0 };
  private startPos = { x: 0, y: 0 };
  private health = PLAYER.maxHealth * 2; // half-hearts
  private grounded = false;
  private wasGrounded = true;
  private lastGroundedAt = -1;
  private jumpPressedAt = -1;
  private canCut = false;
  private airVy = 0; // vertical speed just before landing
  private wallSliding = false;
  private wallJumpPress = false;
  private timesWallJumped = 0;
  private canDoubleJump = false;
  private facingRight = true;
  private drilling = false;
  private frozen = true; // internalDeltaTime == 0 in the original
  private finished = false;
  private dying = false;
  private invulnUntil = 0;
  private knockUntil = 0;
  private hitStopUntil = 0;
  private flashT = 0;
  private stepClock = 0; // seconds of simulated time
  private footstepAt = 0;

  // stats (a_* fields)
  private stats = { wallJumps: 0, hits: 0, healthPacks: 0, jumps: 0, deaths: 0 };
  private time0 = 0;
  private elapsed = 0;

  private moles: Mole[] = [];
  private turrets: Turret[] = [];
  private bullets: Bullet[] = [];
  private checkpoints: { r: Rect; beacon: Beacon; reached: boolean }[] = [];
  private portal!: Portal;
  private world!: World;

  // camera (Unity space)
  private cam = { x: 0, y: 0, z: CAMERA.norm };
  private look = 0;
  private lookY = 0;
  private shake = 0;
  private mapZoom = 0;
  private wheelUntil = 0;

  // UI
  private keys!: Keys;
  private sayer!: Sayer;
  private achSayer!: Sayer;
  private hearts!: Phaser.GameObjects.Graphics;
  private heartShake = 0;
  private timerText!: Phaser.GameObjects.Text;
  private red!: Phaser.GameObjects.Rectangle;
  private white!: Phaser.GameObjects.Rectangle;
  private vig!: Phaser.GameObjects.Image;
  private pauseLayer!: Phaser.GameObjects.Container;
  private pauseDim!: Phaser.GameObjects.Rectangle;
  private pauseButtons: Button[] = [];
  private pauseSel = 0;
  private paused = false;
  private touch = { left: false, right: false, down: false, jump: false };
  private touchUi: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Game');
  }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.theme = THEMES[this.levelIndex];
    this.groundBodies = new Set();
    this.solidRects = [];
    this.boxes = [];
    this.moles = [];
    this.turrets = [];
    this.bullets = [];
    this.checkpoints = [];
    this.health = PLAYER.maxHealth * 2;
    this.stats = { wallJumps: 0, hits: 0, healthPacks: 0, jumps: 0, deaths: 0 };
    this.frozen = true;
    this.finished = false;
    this.dying = false;
    this.paused = false;
    this.timesWallJumped = 0;
    this.wallSliding = false;
    this.grounded = false;
    this.wasGrounded = true;
    this.facingRight = true;
    this.mapZoom = 0;
    this.elapsed = 0;
    this.invulnUntil = 0;
    this.knockUntil = 0;
    this.hitStopUntil = 0;
    this.stepClock = 0;
    this.lastGroundedAt = -1;
    this.jumpPressedAt = -1;
    this.pauseButtons = [];
    this.touch = { left: false, right: false, down: false, jump: false };
    this.touchUi = [];
    this.bloom = null;
  }

  create() {
    const meta = LEVELS[this.levelIndex];
    this.lvl = this.cache.json.get(meta.key) as LevelData;
    this.physics.world.resume();
    makeThemeTextures(this, this.levelIndex);

    this.bgLayer = this.add.layer();
    this.worldLayer = this.add.layer();
    this.hudLayer = this.add.layer();
    this.bgCam = this.cameras.add(0, 0, this.scale.width, this.scale.height).setName('bg');
    const cams = this.cameras.cameras;
    cams.splice(cams.indexOf(this.bgCam), 1);
    cams.unshift(this.bgCam);
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height).setName('ui');
    this.cameras.main.ignore([this.bgLayer, this.hudLayer]);
    this.bgCam.ignore([this.worldLayer, this.hudLayer]);
    this.uiCam.ignore([this.bgLayer, this.worldLayer]);

    this.background = new Background(this, this.levelIndex);
    for (const o of this.background.objects) this.bgLayer.add(o);

    this.buildLevel();
    this.buildPlayer();
    this.buildEnemies();
    this.buildUI();
    this.bindInput();
    this.setQuality(load().quality ?? (this.sys.game.device.input.touch ? 'low' : 'high'));

    this.physics.world.on('worldstep', this.fixedUpdate, this);
    this.events.once('shutdown', () => {
      this.physics.world?.off('worldstep', this.fixedUpdate, this);
      this.scale.off('resize', this.onResize, this);
    });

    audio.play(meta.music + 1);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.updateCamera(0, true);
    this.countdown(meta.name);
  }

  private put = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    this.worldLayer.add(o);
    return o;
  };

  private hud = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    this.hudLayer.add(o);
    return o;
  };

  private setQuality(q: 'high' | 'low') {
    save({ quality: q });
    const isGL = this.sys.renderer.type === Phaser.WEBGL;
    if (!isGL) return;
    if (q === 'high' && !this.bloom) {
      const [b] = Phaser.Actions.AddEffectBloom(this.cameras.main, { threshold: 0.62, blurRadius: 2, blurSteps: 4, blendAmount: 0.75 });
      this.bloom = b.parallelFilters;
    } else if (q === 'low' && this.bloom) {
      this.bloom.destroy();
      this.bloom = null;
    }
    this.fx.ambient.setVisible(q === 'high');
  }

  // ---------------------------------------------------------------- level
  private isTurretBox(r: Rect) {
    return this.lvl.turrets.some((t) => Math.abs(t.x - r.x) < 0.05 && Math.abs(t.y - 0.201 - r.y) < 0.3 && Math.abs(r.w - 1.997) < 0.01);
  }

  private buildLevel() {
    const L = this.lvl;
    for (const r of L.solids) {
      const rect = this.add.rectangle(px(r.x), py(r.y), r.w * S, r.h * S).setVisible(false);
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      if (r.ground) this.groundBodies.add(body);
      this.solidRects.push(r);
      this.boxes.push({ l: r.x - r.w / 2, r: r.x + r.w / 2, t: r.y + r.h / 2, b: r.y - r.h / 2 });
    }
    buildAbyss(this, this.put, L, this.levelIndex);
    buildTerrain(this, this.put, L, this.levelIndex, (r) => this.isTurretBox(r));
    for (const d of L.decor) if (d.f === 'spr_arrow_downright') drawArrow(this, px(d.x), py(d.y), this.levelIndex).forEach(this.put);

    // checkpoints: a beacon standing on the floor under each trigger
    for (const c of L.checkpoints) {
      const floor = this.floorBelow(c.x, c.y + c.h / 2, 4) ?? c.y - c.h / 2;
      const beacon = new Beacon(this, px(c.x), py(floor), this.theme.rim);
      this.put(beacon.g);
      this.put(beacon.glow);
      this.checkpoints.push({ r: { ...c }, beacon, reached: false });
    }
    const ex = L.exit;
    const exFloor = this.floorBelow(ex.x, ex.y + ex.h / 2, 4) ?? ex.y - ex.h / 2;
    this.portal = new Portal(this, px(ex.x), py(exFloor), mix(this.theme.rim, 0xffffff, 0.2));
    this.put(this.portal.g);
    this.put(this.portal.glow);

    this.fx = new Fx(this, this.put, this.levelIndex);

    this.world = {
      floorBelow: (x, y, d) => this.floorBelow(x, y, d),
      solidAt: (x, y) => this.solidAt(x, y),
      los: (ax, ay, bx, by) => this.los(ax, ay, bx, by),
    };
  }

  private buildPlayer() {
    const p = this.lvl.player;
    this.startPos = { x: p.x, y: p.y };
    this.plrRect = this.add.rectangle(px(p.x + p.ox), py(p.y + p.oy), p.w * S, p.h * S).setVisible(false);
    this.physics.add.existing(this.plrRect);
    this.plr = this.plrRect.body as Body;
    this.plr.setMass(PLAYER.mass);
    this.plr.setMaxVelocity(100 * S, 100 * S);
    this.runner = new RunnerView(this);
    this.runner.rim = mix(INK.suitLight, this.theme.rim, 0.45);
    this.put(this.runner.g);
    this.put(this.runner.glow);

    const solids = [...this.physics.world.staticBodies].map((b) => b.gameObject);
    this.physics.add.collider(this.plrRect, solids);
    this.cam = { x: this.lvl.player.x, y: this.lvl.player.y, z: CAMERA.norm };
    this.snapInterp();
  }

  private buildEnemies() {
    const solids = [...this.physics.world.staticBodies].map((b) => b.gameObject);
    this.lvl.molerats.forEach((d, i) => {
      const rect = this.add.rectangle(px(d.x), py(d.y), d.w * S, d.h * S).setVisible(false);
      this.physics.add.existing(rect);
      const body = rect.body as Body;
      body.setMass(MOLERAT.mass);
      const view = new MoleView(this);
      view.rim = mix(INK.moleFurDark, this.theme.rim, 0.35);
      this.put(view.g);
      this.put(view.glow);
      const brain = new MoleBrain(d.x, this.world, 1000 + i * 7919);
      const c = { x: body.center.x, y: body.center.y };
      this.moles.push({ d, rect, body, view, brain, grounded: false, prev: { ...c }, cur: { ...c }, wasGrounded: true, shovedAt: 0 });
      this.physics.add.collider(rect, solids);
    });
    if (this.moles.length) {
      const rects = this.moles.map((m) => m.rect);
      this.physics.add.collider(this.plrRect, rects, (_a, b) => this.onMoleContact(b as Phaser.GameObjects.Rectangle));
      this.physics.add.collider(rects, rects);
    }
    for (const d of this.lvl.turrets) {
      const box = this.solidRects.find((r) => this.isTurretBox(r) && Math.abs(r.x - d.x) < 0.05);
      const w = (box?.w ?? 2) * S;
      const h = (box?.h ?? 2.7) * S;
      const view = new TurretView(this, px(d.x), py(box?.y ?? d.y), w, h, mix(INK.metalLight, this.theme.rim, 0.4));
      this.put(view.g);
      this.put(view.glow);
      this.turrets.push({ d, view, awake: false, timer: 0 });
    }
  }

  // ---------------------------------------------------------------- level queries (Unity units)
  floorBelow(x: number, y: number, maxDrop: number): number | null {
    let best: number | null = null;
    for (const b of this.boxes) {
      if (x <= b.l || x >= b.r) continue;
      if (b.t > y + 0.001 || b.t < y - maxDrop) continue;
      if (best === null || b.t > best) best = b.t;
    }
    for (const s of this.lvl.slopes) {
      const r = (s.rot * Math.PI) / 180;
      const half = (s.w / 2) * Math.cos(r);
      if (Math.abs(x - s.x) > Math.abs(half)) continue;
      const top = s.y + s.h / 2 / Math.cos(r) + (x - s.x) * Math.tan(r);
      if (top > y + 0.001 || top < y - maxDrop) continue;
      if (best === null || top > best) best = top;
    }
    return best;
  }

  solidAt(x: number, y: number) {
    return this.boxes.some((b) => x > b.l && x < b.r && y > b.b && y < b.t);
  }

  los(ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    for (const b of this.boxes) {
      let t0 = 0;
      let t1 = 1;
      const clip = (p: number, q: number) => {
        if (p === 0) return q >= 0;
        const t = q / p;
        if (p < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
        return true;
      };
      if (clip(-dx, ax - b.l) && clip(dx, b.r - ax) && clip(-dy, ay - b.b) && clip(dy, b.t - ay) && t1 > t0) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- UI
  private buildUI() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.vig = this.hud(this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setAlpha(0.85).setDepth(890));
    this.red = this.hud(this.add.rectangle(0, 0, W, H, 0xff2040).setOrigin(0).setAlpha(0).setDepth(900));
    this.white = this.hud(this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setAlpha(0).setDepth(901));
    this.hearts = this.hud(this.add.graphics().setDepth(950));
    this.timerText = this.hud(
      this.add.text(W - 22, 14, '0:00.0', { fontFamily: UI_FONT, fontSize: '26px', fontStyle: '700', color: '#ffffff' }).setOrigin(1, 0).setDepth(950),
    );
    const best = load().best[LEVELS[this.levelIndex].key];
    if (best !== undefined)
      this.hud(label(this, W - 22, 48, `BEST ${fmtTime(best)}`, 13, hex(INK.uiDim), '600').setOrigin(1, 0).setDepth(950).setName('best'));
    this.hud(label(this, 22, 50, LEVELS[this.levelIndex].name, 14, hex(mix(this.theme.rim, 0xffffff, 0.4)), '600').setDepth(950).setName('lvlname'));
    this.sayer = new Sayer(this, 0, this.theme.rim);
    this.achSayer = new Sayer(this, 1);
    this.hud(this.sayer.container);
    this.hud(this.achSayer.container);

    // pause menu
    this.pauseDim = this.hud(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setDepth(1090).setVisible(false));
    const panel = this.add.graphics();
    panel.fillStyle(0x07060f, 0.92).fillRoundedRect(-210, -170, 420, 340, 16);
    panel.lineStyle(1.5, 0xffffff, 0.12).strokeRoundedRect(-210, -170, 420, 340, 16);
    panel.fillStyle(this.theme.rim, 1).fillRect(-210 + 24, -170 + 70, 40, 3);
    const title = this.add.text(-210 + 24, -170 + 24, 'PAUSED', { fontFamily: TITLE_FONT, fontSize: '28px', fontStyle: '700', color: '#ffffff' });
    const items: [string, () => void][] = [
      ['RESUME', () => this.togglePause()],
      ['RESTART LEVEL', () => this.restartLevel()],
      ['QUIT TO MENU', () => this.quitToMenu()],
    ];
    const parts: Phaser.GameObjects.GameObject[] = [panel, title];
    items.forEach(([t, fn], i) => {
      const b = new Button(this, 0, -40 + i * 64, t, 22, undefined, 300);
      b.c.on('pointerover', () => this.selectPause(i));
      b.c.on('pointerdown', fn);
      this.pauseButtons.push(b);
      parts.push(b.c);
    });
    parts.push(
      this.add
        .text(0, 140, 'ESC resume · M mute · G graphics', { fontFamily: UI_FONT, fontSize: '13px', color: hex(INK.uiDim) })
        .setOrigin(0.5),
    );
    this.pauseLayer = this.hud(this.add.container(W / 2, H / 2, parts).setDepth(1100).setVisible(false));

    if (this.sys.game.device.input.touch) this.buildTouchControls();
    this.scale.on('resize', this.onResize, this);
  }

  private buildTouchControls() {
    for (const o of this.touchUi) o.destroy();
    this.touchUi = [];
    const H = this.scale.height;
    const W = this.scale.width;
    const mk = (x: number, y: number, r: number, icon: (g: Phaser.GameObjects.Graphics) => void, on: (v: boolean) => void) => {
      const g = this.hud(this.add.graphics().setDepth(960));
      g.fillStyle(0xffffff, 0.08).fillCircle(x, y, r);
      g.lineStyle(2, 0xffffff, 0.3).strokeCircle(x, y, r);
      g.fillStyle(0xffffff, 0.75);
      icon(g);
      const hit = this.hud(this.add.circle(x, y, r * 1.15, 0xffffff, 0.001).setDepth(961));
      hit.setInteractive();
      hit.on('pointerdown', () => on(true));
      hit.on('pointerup', () => on(false));
      hit.on('pointerout', () => on(false));
      this.touchUi.push(g, hit);
    };
    const tri = (g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, s = 12) => {
      const p = (a: number) => ({ x: x + Math.cos(ang + a) * s, y: y + Math.sin(ang + a) * s });
      g.fillTriangle(p(0).x, p(0).y, p(2.3).x, p(2.3).y, p(-2.3).x, p(-2.3).y);
    };
    mk(70, H - 80, 42, (g) => tri(g, 66, H - 80, Math.PI), (v) => (this.touch.left = v));
    mk(170, H - 80, 42, (g) => tri(g, 174, H - 80, 0), (v) => (this.touch.right = v));
    mk(W - 170, H - 64, 34, (g) => tri(g, W - 170, H - 60, Math.PI / 2, 10), (v) => (this.touch.down = v));
    mk(W - 72, H - 120, 52, (g) => tri(g, W - 72, H - 124, -Math.PI / 2, 16), (v) => {
      this.touch.jump = v;
      if (v) this.pressJump();
    });
    const pause = this.hud(this.add.text(W - 22, 70, 'II', { fontFamily: TITLE_FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(1, 0).setDepth(961));
    pause.setInteractive().on('pointerdown', () => this.togglePause());
    this.touchUi.push(pause);
  }

  private onResize(size: Phaser.Structs.Size) {
    const { width: W, height: H } = size;
    this.uiCam.setSize(W, H);
    this.bgCam.setSize(W, H);
    this.background.resize(W, H);
    this.red.setSize(W, H);
    this.white.setSize(W, H);
    this.pauseDim.setSize(W, H);
    this.vig.setDisplaySize(W, H);
    this.timerText.setX(W - 22);
    (this.hudLayer.getByName('best') as Phaser.GameObjects.Text | null)?.setX(W - 22);
    this.pauseLayer.setPosition(W / 2, H / 2);
    this.sayer.layout();
    this.achSayer.layout();
    if (this.sys.game.device.input.touch) this.buildTouchControls();
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: [kb.addKey(K.A), kb.addKey(K.LEFT)],
      right: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
      down: [kb.addKey(K.S), kb.addKey(K.DOWN)],
      jump: [kb.addKey(K.SPACE), kb.addKey(K.W), kb.addKey(K.UP)],
      slow: [kb.addKey(K.CTRL), kb.addKey(K.SHIFT)],
      zoom: kb.addKey(K.Z),
    };
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    for (const k of this.keys.jump) k.on('down', () => !this.paused && this.pressJump());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-M', () => {
      const m = !audio.muted;
      audio.setMuted(m);
      save({ muted: m });
      this.sayer.say(m ? 'Muted' : 'Sound on', 1, null);
    });
    kb.on('keydown-G', () => {
      const q = load().quality === 'low' ? 'high' : 'low';
      this.setQuality(q);
      this.sayer.say(q === 'high' ? 'Graphics: high' : 'Graphics: fast', 1.2, null);
    });
    const nav = (d: number) => {
      if (!this.paused) return;
      this.selectPause((this.pauseSel + d + this.pauseButtons.length) % this.pauseButtons.length);
      audio.sfx('select');
    };
    kb.on('keydown-UP', () => nav(-1));
    kb.on('keydown-W', () => nav(-1));
    kb.on('keydown-DOWN', () => nav(1));
    kb.on('keydown-S', () => nav(1));
    const confirm = () => {
      if (!this.paused) return;
      this.pauseButtons[this.pauseSel].c.emit('pointerdown');
    };
    kb.on('keydown-ENTER', confirm);
    kb.on('keydown-SPACE', confirm);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy > 0) {
        this.mapZoom = Math.max(CAMERA.mapZoomOut, this.mapZoom - dy * 0.02);
        this.wheelUntil = this.time.now + 500;
      } else if (dy < 0) this.mapZoom = 0;
    });
  }

  private pressJump() {
    this.jumpPressedAt = this.stepClock;
  }

  private jumpDown() {
    return this.keys.jump.some((k) => k.isDown) || this.touch.jump;
  }

  private axis() {
    const l = this.keys.left.some((k) => k.isDown) || this.touch.left;
    const r = this.keys.right.some((k) => k.isDown) || this.touch.right;
    return (r ? 1 : 0) - (l ? 1 : 0);
  }

  private selectPause(i: number) {
    this.pauseSel = i;
    this.pauseButtons.forEach((b, k) => b.setSelected(k === i));
  }

  private togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.pauseLayer.setVisible(this.paused);
    this.pauseDim.setVisible(this.paused);
    this.selectPause(0);
    if (this.paused) {
      this.physics.world.pause();
      this.time.paused = true;
      this.tweens.pauseAll();
      audio.duck(true);
    } else {
      this.physics.world.resume();
      this.time.paused = false;
      this.tweens.resumeAll();
      audio.duck(false);
    }
  }

  private restartLevel() {
    audio.sfx('select');
    audio.duck(false);
    this.physics.world.resume();
    this.time.paused = false;
    this.scene.restart({ level: this.levelIndex });
  }

  private quitToMenu() {
    audio.sfx('select');
    audio.duck(false);
    this.physics.world.resume();
    this.time.paused = false;
    this.scene.start('Menu');
  }

  // ---------------------------------------------------------------- flow
  private countdown(name: string) {
    this.sayer.say(name, 1.6);
    let i = 3;
    this.time.addEvent({
      delay: 650,
      repeat: 3,
      callback: () => {
        if (i > 0) this.sayer.say(String(i), 0.6, 'select');
        else this.endFreezeTime();
        i--;
      },
    });
  }

  private endFreezeTime() {
    this.frozen = false;
    this.time0 = this.time.now;
    this.sayer.say('GO!', 0.8, 'notif');
  }

  private achievement(name: string) {
    if (unlock(name)) this.achSayer.say(`Achievement unlocked: ${name}`, 4, 'ach');
  }

  /** n in half-hearts */
  private damage(n: number, fromX?: number) {
    if (this.dying || this.finished || this.stepClock < this.invulnUntil) return false;
    this.stats.hits++;
    if (this.stats.hits > 1) this.achievement('bandageman');
    this.health -= n;
    this.invulnUntil = this.stepClock + PLAYER.invulnerable;
    this.red.setAlpha(0.35);
    this.flashT = 1;
    this.heartShake = 1;
    this.shake = Math.max(this.shake, 0.18);
    this.hitStop(70);
    audio.sfx('hit');
    const c = this.plr.center;
    this.fx.burst(c.x, c.y, 0xff4060, 10);
    if (fromX !== undefined) {
      const dir = c.x / S >= fromX ? 1 : -1;
      this.plr.setVelocityX(dir * 5 * S);
      this.knockUntil = this.stepClock + 0.18;
    }
    if (this.health <= 0) this.die();
    return true;
  }

  private hitStop(ms: number) {
    if (this.paused) return;
    this.physics.world.pause();
    this.hitStopUntil = this.time.now + ms;
  }

  private die() {
    if (this.dying) return;
    this.dying = true;
    this.stats.deaths++;
    audio.sfx('die');
    const c = this.plr.center;
    this.fx.burst(c.x, c.y, INK.scarf, 18);
    this.fx.burst(c.x, c.y, INK.visor, 12);
    this.fx.ring(c.x, c.y, this.theme.rim, 4);
    this.shake = Math.max(this.shake, 0.3);
    this.plr.setVelocity(0, 0);
    this.plr.setAllowGravity(false);
    this.time.delayedCall(800, () => this.respawn());
  }

  private respawn() {
    const L = this.lvl.player;
    this.health = PLAYER.maxHealth * 2;
    this.plr.reset(px(this.startPos.x + L.ox), py(this.startPos.y + L.oy));
    this.plr.setAllowGravity(true);
    this.plr.setVelocity(0, 0);
    this.snapInterp();
    this.runner.resetScarf(this.plr.center.x, this.plr.bottom);
    this.canDoubleJump = false;
    this.dying = false;
    this.invulnUntil = this.stepClock + 1;
    this.fx.ring(this.plr.center.x, this.plr.center.y, this.theme.rim, 2.5, 380);
    this.fx.burst(this.plr.center.x, this.plr.center.y, this.theme.rim, 14);
    audio.sfx('respawn');
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.frozen = true;
    const c = this.plr.center;
    this.fx.burst(c.x, c.y, this.theme.rim, 26);
    this.fx.ring(c.x, c.y, 0xffffff, 5, 600);
    audio.sfx('portal');
    this.tweens.add({ targets: this.white, alpha: 0.55, duration: 250, yoyo: true });
    const seconds = Math.round(this.elapsed * 10) / 10;
    if (seconds < 60) this.achievement('quick');
    const key = LEVELS[this.levelIndex].key;
    const d = load();
    const best = d.best[key];
    const isBest = best === undefined || seconds < best;
    const next = this.levelIndex + 1;
    save({ level: next >= LEVELS.length ? 0 : next, best: { ...d.best, ...(isBest ? { [key]: seconds } : {}) } });
    if (next >= LEVELS.length) this.achievement('finisher');
    const s = this.stats;
    this.time.delayedCall(700, () => {
      this.scene.launch('Transition', {
        summary: {
          level: this.levelIndex,
          seconds,
          isBest,
          rows: [
            ['Wall jumps', s.wallJumps],
            ['Jumps', s.jumps],
            ['Times hit', s.hits],
            ['Deaths', s.deaths],
          ],
        },
        next: next >= LEVELS.length ? -1 : next,
      });
      this.scene.pause();
    });
  }

  // ---------------------------------------------------------------- physics helpers
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

  private snapInterp() {
    const c = this.plr.center;
    this.plrPrev = { x: c.x, y: this.plr.bottom };
    this.plrCur = { ...this.plrPrev };
  }

  // ---------------------------------------------------------------- 50 Hz logic (FixedUpdate)
  private fixedUpdate() {
    if (this.paused) return;
    this.stepClock += DT;
    // positions after this step's integration, for render interpolation
    this.plrPrev = this.plrCur;
    this.plrCur = { x: this.plr.center.x, y: this.plr.bottom };
    for (const m of this.moles) {
      m.prev = m.cur;
      m.cur = { x: m.body.center.x, y: m.body.center.y };
    }
    this.playerStep();
    for (const m of this.moles) this.moleStep(m);
  }

  private playerStep() {
    const b = this.plr;
    const now = this.stepClock;
    if (this.dying) {
      b.setVelocity(0, 0);
      return;
    }
    const L = this.lvl.player;
    const onSlope = this.slopeSnap(b);
    const cx = b.center.x / S;
    const bottom = -b.bottom / S;
    // GroundChecker: a thin box under the feet that only reacts to "ground"-tagged colliders
    this.grounded = onSlope || this.groundAt(cx, bottom - 0.05, L.w * 0.95, 0.12);
    if (this.grounded) this.lastGroundedAt = now;
    // WallChecker: a small box at knee height just in front of the body
    const dir = this.facingRight ? 1 : -1;
    const kneeY = -b.center.y / S - 0.5;
    const wallProbe = this.groundAt(cx + dir * (L.w / 2 + 0.07), kneeY, 0.14, 0.17);
    const nowWall = !this.grounded && wallProbe;
    if (this.wallSliding && !nowWall && this.wallJumpPress) {
      // WallCheck.OnTriggerExit2D -> IncrementTimesWallJumped
      this.timesWallJumped++;
      this.stats.wallJumps++;
      this.wallJumpPress = false;
      audio.sfx('wall');
      this.fx.dust(b.center.x - dir * 4, b.center.y, 8, -dir);
      this.runner.jump();
    }
    this.wallSliding = nowWall;
    if (this.grounded && !this.wasGrounded) {
      const impact = Phaser.Math.Clamp(-this.airVy / 14, 0, 1);
      if (impact > 0.15) {
        audio.sfx('land');
        this.fx.dust(b.center.x, b.bottom, 4 + Math.round(impact * 10));
        this.runner.land(impact);
        if (impact > 0.7) this.shake = Math.max(this.shake, impact * 0.08);
      }
    }
    this.wasGrounded = this.grounded;

    let vx = b.velocity.x / S;
    let vy = -b.velocity.y / S;
    if (!this.grounded) this.airVy = vy;
    const k = this.frozen ? 0 : 1; // internalDeltaTime
    const ax = this.frozen ? 0 : this.axis();
    const knocked = now < this.knockUntil;
    let fx = 0;
    let fy = 0;

    // variable jump height: letting go early cuts the rise
    if (this.canCut && !this.jumpDown() && vy > 0) {
      vy *= PLAYER.jumpCut;
      this.canCut = false;
    }
    if (vy <= 0) this.canCut = false;

    // ---- Update(): facing, drilling, jump (forces accumulate until the next physics step)
    const buffered = this.jumpPressedAt >= 0 && now - this.jumpPressedAt <= PLAYER.jumpBuffer;
    if (!this.wallSliding && k) {
      if (ax < 0) this.facingRight = false;
      if (ax > 0) this.facingRight = true;
      const down = this.keys.down.some((key) => key.isDown) || this.touch.down;
      const wasDrilling = this.drilling;
      this.drilling = !this.grounded && down;
      if (this.drilling) {
        fy -= PLAYER.drillSpeed;
        if (!wasDrilling) audio.sfx('drill');
      }
      const coyote = !this.grounded && now - this.lastGroundedAt <= PLAYER.coyoteTime && vy <= 0.5;
      if (buffered) {
        if (this.grounded || coyote) {
          this.stats.jumps++;
          if (this.stats.jumps > 50) this.achievement('stronglegs');
          if (coyote) vy = Math.max(vy, 0);
          fy += PLAYER.jumpPower; // AddForce in Update, applied on the next physics step
          this.canDoubleJump = true;
          this.canCut = true;
          this.lastGroundedAt = -1;
          this.jumpPressedAt = -1;
          audio.sfx('jump');
          this.runner.jump();
          this.fx.dust(b.center.x, b.bottom, 6);
        } else if (this.canDoubleJump) {
          this.canDoubleJump = false;
          this.canCut = true;
          this.jumpPressedAt = -1;
          vy = 0;
          fy += PLAYER.jumpPower;
          audio.sfx('double');
          this.runner.flip(this.facingRight ? 1 : -1);
          this.fx.ring(b.center.x, b.bottom, this.theme.rim, 1.4, 300);
        }
      }
    } else if (this.wallSliding) this.drilling = false;

    // ---- FixedUpdate()
    const slow = this.keys.slow.some((key) => key.isDown);
    if (this.wallSliding && slow) vy *= 0.5 * k;
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
      if (vy < -1.5 && Math.random() < 0.35) this.fx.sparks(b.center.x + dir * 5, b.center.y - 6, this.theme.rim, 1);
    }
    fx += PLAYER.speed * ax * k * (knocked ? 0.3 : 1);
    if (this.grounded) {
      this.timesWallJumped = 0;
      if (!knocked) vx = dampedVx;
    }
    if (!knocked) vx = Phaser.Math.Clamp(vx, -PLAYER.maxSpeed, PLAYER.maxSpeed);
    // Physics integration of accumulated forces (F = m a, one step)
    vx += (fx / PLAYER.mass) * DT;
    vy += (fy / PLAYER.mass) * DT;
    b.setVelocity(vx * S, -vy * S);

    if (this.drilling && Math.random() < 0.8) this.fx.trail(b.center.x, b.center.y, this.theme.rim);
    if (this.grounded && Math.abs(vx) > 2.5 && now > this.footstepAt) {
      this.footstepAt = now + 0.28;
      this.fx.dust(b.center.x - dir * 4, b.bottom, 1, -dir);
    }
  }

  private onMoleContact(rect: Phaser.GameObjects.Rectangle) {
    const m = this.moles.find((q) => q.rect === rect);
    if (!m || this.dying) return;
    const p = this.plr;
    // Landing on its spiky back hurts (and bounces you off); the molerat is only dazed.
    if (p.touching.down && m.body.touching.up) {
      const hurt = this.damage(DAMAGE.stomp);
      p.setVelocityY(-6.5 * S);
      p.setVelocityX((p.center.x >= m.body.center.x ? 1 : -1) * 3 * S);
      this.knockUntil = this.stepClock + 0.15;
      this.canDoubleJump = true;
      m.brain.stun(this.stepClock);
      this.fx.sparks(p.center.x, p.bottom, 0xffffff, 8);
      this.runner.jump();
      audio.sfx('stomp');
      if (!hurt) this.fx.ring(p.center.x, p.bottom, 0xffffff, 1, 220);
      return;
    }
    // Never let a molerat ride on the player's head: slide it off.
    if (m.body.touching.down && p.touching.up) {
      const dir = m.body.center.x >= p.center.x ? 1 : -1;
      m.body.setVelocity(dir * 3.5 * S, -2.5 * S);
      return;
    }
    // A lunging molerat bowls you over.
    if (m.brain.lunging && this.stepClock - m.shovedAt > 0.5) {
      m.shovedAt = this.stepClock;
      const dir = p.center.x >= m.body.center.x ? 1 : -1;
      p.setVelocity(dir * 5.5 * S, -3 * S);
      this.knockUntil = this.stepClock + 0.25;
      this.shake = Math.max(this.shake, 0.12);
      this.fx.chips(p.center.x, p.center.y, mix(INK.moleFur, 0xffffff, 0.3), 6);
      audio.sfx('shove');
    }
  }

  private moleStep(m: Mole) {
    const b = m.body;
    const now = this.stepClock;
    const onSlope = this.slopeSnap(b);
    m.grounded = onSlope || this.groundAt(b.center.x / S, -b.bottom / S - 0.05, m.d.w * 0.6, 0.1, false);
    const facing = m.brain.facing;
    const blockedAhead = facing > 0 ? b.blocked.right : b.blocked.left;
    const p = this.plr;
    const cmd = m.brain.think(
      now,
      DT,
      { x: b.center.x / S, y: -b.center.y / S, foot: -b.bottom / S, vx: b.velocity.x / S, vy: -b.velocity.y / S, grounded: m.grounded, blockedAhead },
      { x: p.center.x / S, y: -p.center.y / S, foot: -p.bottom / S, active: !this.dying && !this.frozen && !this.finished },
    );
    let vx = b.velocity.x / S;
    let vy = -b.velocity.y / S;
    if (cmd.jump) {
      vx = cmd.jump.vx;
      vy = cmd.jump.vy;
      audio.sfxAt(cmd.accel >= 999 && m.brain.mood === 'lunge' ? 'lunge' : 'molehop', this.earVolume(b.center.x, b.center.y));
      this.fx.dust(b.center.x, b.bottom, 4);
    } else {
      const a = (m.grounded ? cmd.accel : Math.min(cmd.accel, 6)) * DT;
      vx += Phaser.Math.Clamp(cmd.vx - vx, -a, a);
    }
    if (m.brain.mood === 'alert' && m.brain.moodT < DT * 1.5) audio.sfxAt('alert', this.earVolume(b.center.x, b.center.y));
    if (m.grounded && !m.wasGrounded && vy <= 0) this.fx.dust(b.center.x, b.bottom, 3);
    m.wasGrounded = m.grounded;
    b.setVelocity(vx * S, -vy * S);

    // fell into the void: dig back out at home
    if (this.lvl.death.some((d) => -b.center.y / S < d.y + d.h / 2 + 1)) {
      b.reset(px(m.d.x), py(m.d.y));
      m.cur = m.prev = { x: b.center.x, y: b.center.y };
      m.brain.respawned(now);
      this.fx.chips(b.center.x, b.bottom, this.theme.rockLight, 10);
    }
  }

  private earVolume(x: number, y: number) {
    const d = Math.hypot(x - this.plr.center.x, y - this.plr.center.y) / S;
    return Phaser.Math.Clamp(1 - d / 14, 0, 1);
  }

  // ---------------------------------------------------------------- per-frame
  update(_t: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.sayer.update(dt);
    this.achSayer.update(dt);
    if (this.paused) return;
    if (this.hitStopUntil && this.time.now >= this.hitStopUntil) {
      this.hitStopUntil = 0;
      this.physics.world.resume();
    }

    if (!this.frozen && !this.finished) this.elapsed = (this.time.now - this.time0) / 1000;
    this.timerText.setText(fmtTime(this.elapsed));
    this.heartShake = Math.max(0, this.heartShake - dt * 2.5);
    drawHearts(this.hearts, 22, 16, Math.max(0, this.health), PLAYER.maxHealth, 12, this.heartShake * 6);
    this.red.setAlpha(Phaser.Math.Linear(this.red.alpha, 0, Math.min(1, dt * 4)));
    this.white.setAlpha(this.finished ? this.white.alpha : Phaser.Math.Linear(this.white.alpha, 0, Math.min(1, dt * 3)));

    const world = this.physics.world as unknown as { _elapsed: number; _frameTimeMS: number; isPaused: boolean };
    const alpha = world.isPaused ? 1 : Phaser.Math.Clamp(world._elapsed / world._frameTimeMS, 0, 1);
    this.updateRunner(dt, alpha);
    for (const m of this.moles) {
      m.view.update(dt, {
        x: m.prev.x + (m.cur.x - m.prev.x) * alpha,
        y: m.prev.y + (m.cur.y - m.prev.y) * alpha,
        vx: m.body.velocity.x,
        facing: m.brain.facing,
        mood: m.brain.mood,
        grounded: m.grounded,
        moodT: m.brain.moodT,
      });
    }
    this.updateTurrets(dt);
    this.updateBullets(dt);
    this.checkTriggers(dt);
    this.updateCamera(dt);
  }

  private updateRunner(dt: number, alpha: number) {
    const b = this.plr;
    const x = this.plrPrev.x + (this.plrCur.x - this.plrPrev.x) * alpha;
    const y = this.plrPrev.y + (this.plrCur.y - this.plrPrev.y) * alpha;
    const vy = -b.velocity.y;
    let state: RunnerState = 'idle';
    if (this.drilling) state = 'drill';
    else if (this.wallSliding) state = 'wall';
    else if (!this.grounded) state = vy < 0 ? 'fall' : 'jump';
    else if (Math.abs(b.velocity.x) > 0.3 * S && this.axis() !== 0) state = 'run';
    else if (Math.abs(b.velocity.x) > 1.2 * S) state = 'run';
    this.flashT = Math.max(0, this.flashT - dt * 4);
    const inv = this.stepClock < this.invulnUntil && !this.dying;
    const blink = inv && Math.floor(this.time.now / 70) % 2 === 0;
    this.runner.update(dt, {
      x,
      y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      state,
      facing: this.facingRight ? 1 : -1,
      visible: !this.dying && !(this.finished && this.white.alpha > 0.3),
      flash: this.flashT,
      alpha: blink ? 0.35 : 1,
    });
  }

  private updateTurrets(dt: number) {
    const tx = this.plr.center.x / S;
    const ty = -this.plr.center.y / S;
    for (const t of this.turrets) {
      const dist = Math.hypot(t.d.x - tx, t.d.y - ty);
      const awake = dist < TURRET.wakeRange && !this.dying;
      if (awake !== t.awake) {
        t.awake = awake;
        if (dist < 16) audio.sfxAt(awake ? 'wake' : 'sleep', 0.7);
      }
      const right = tx > t.d.x;
      // AttackCone: while the player is inside the circle the shot timer runs
      if (dist < t.d.range && !this.frozen && !this.dying) {
        t.timer += dt;
        if (t.timer >= TURRET.shootInterval - 0.5 && t.timer - dt < TURRET.shootInterval - 0.5) audio.sfxAt('charge', 0.6);
        if (t.timer >= TURRET.shootInterval) {
          t.timer = 0;
          const [sx, sy] = right ? t.d.ShootPointRight : t.d.ShootPointLeft;
          const len = Math.hypot(tx - t.d.x, ty - t.d.y) || 1;
          const img = this.put(this.add.image(px(sx), py(sy), 'glow').setTint(INK.danger).setBlendMode(Phaser.BlendModes.ADD).setScale(0.55).setDepth(45));
          const core = this.put(this.add.image(px(sx), py(sy), 'dot').setTint(0xffe0d0).setScale(0.9).setDepth(46));
          this.bullets.push({
            x: sx,
            y: sy,
            vx: ((tx - t.d.x) / len) * TURRET.bulletSpeed,
            vy: ((ty - t.d.y) / len) * TURRET.bulletSpeed,
            ox: t.d.x,
            oy: t.d.y,
            img,
            core,
          });
          t.view.fire();
          this.fx.sparks(px(sx), py(sy), INK.danger, 6);
          if (dist < 16) audio.sfx('shoot');
        }
      } else t.timer = Math.max(0, t.timer - dt * 2);
      const len = Math.hypot(tx - t.d.x, ty - t.d.y) || 1;
      t.view.update(dt, awake, (tx - t.d.x) / len, -(ty - t.d.y) / len, Phaser.Math.Clamp(t.timer / TURRET.shootInterval, 0, 1));
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
      u.core.setPosition(px(u.x), py(u.y));
      u.img.setScale(0.5 + Math.sin(this.time.now / 40) * 0.06);
      this.fx.trail(px(u.x), py(u.y), INK.danger);
      let dead = Math.hypot(u.x - u.ox, u.y - u.oy) > 50;
      const bx = px(u.x);
      const by = py(u.y);
      if (!dead && !this.dying && bx + half * S > b.left && bx - half * S < b.right && by + half * S > b.top && by - half * S < b.bottom) {
        if (!this.frozen) this.damage(DAMAGE.bullet, u.x - u.vx * 0.1);
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
      if (dead) {
        this.fx.sparks(bx, by, INK.danger, 7);
        this.fx.burst(bx, by, INK.danger, 3);
        u.img.destroy();
        u.core.destroy();
      }
      return !dead;
    });
  }

  private checkTriggers(dt: number) {
    const b = this.plr;
    const cx = b.center.x / S;
    const cy = -b.center.y / S;
    const hw = b.halfWidth / S;
    const hh = b.halfHeight / S;
    const hit = (r: Rect) => Math.abs(cx - r.x) < r.w / 2 + hw && Math.abs(cy - r.y) < r.h / 2 + hh;
    if (!this.dying && !this.finished) for (const d of this.lvl.death) if (hit(d)) this.die();
    for (const c of this.checkpoints) {
      if (!c.reached && !this.dying && hit(c.r)) {
        c.reached = true;
        this.startPos = { x: c.r.x, y: c.r.y };
        this.sayer.say('Checkpoint reached', 1.6, null);
        audio.sfx('checkpoint');
        this.fx.ring(px(c.r.x), py(c.r.y), this.theme.rim, 3, 600);
        this.fx.burst(px(c.r.x), py(c.r.y) - 30, this.theme.rim, 16);
      }
      c.beacon.update(dt, c.reached);
    }
    const ex = this.lvl.exit;
    const near = Phaser.Math.Clamp(1 - Math.hypot(cx - ex.x, cy - ex.y) / 8, 0, 1);
    this.portal.update(dt, near);
    if (!this.dying && hit(ex)) this.finish();
  }

  private updateCamera(dt: number, snap = false) {
    const b = this.plr;
    const speed = Math.hypot(b.velocity.x, b.velocity.y) / S;
    if (this.keys?.zoom.isDown) this.mapZoom = CAMERA.mapZoomOut;
    else if (this.time.now > this.wheelUntil) this.mapZoom = 0;
    const zTarget = Phaser.Math.Clamp(-speed, CAMERA.max, CAMERA.norm) + this.mapZoom;
    // look ahead in the running direction and down when falling fast
    const vx = b.velocity.x / S;
    const vy = -b.velocity.y / S;
    this.look += (Phaser.Math.Clamp(vx * 0.45, -1.8, 1.8) - this.look) * Math.min(1, dt * 2.5);
    this.lookY += ((vy < -7 ? -2 : 0.6) - this.lookY) * Math.min(1, dt * 2);
    const fx = this.plrCur.x / S + this.look;
    const fy = -this.plrCur.y / S + 0.75 + this.lookY;
    const t = snap ? 1 : 1 - Math.exp(-CAMERA.speed * dt);
    this.cam.x += (fx - this.cam.x) * t;
    this.cam.y += (fy - this.cam.y) * t;
    this.cam.z += (zTarget - this.cam.z) * (snap ? 1 : 1 - Math.exp(-3 * dt));

    const W = this.scale.width;
    const H = this.scale.height;
    const viewH = Math.min(H, (W * 9) / 16);
    const dist = -this.cam.z;
    const visible = 2 * dist * CAMERA.fovTan; // world units visible vertically
    const zoom = viewH / (visible * S);
    const cam = this.cameras.main;
    this.shake = Math.max(0, this.shake - dt * 1.2);
    const sh = this.shake * this.shake * 18;
    cam.setZoom(zoom);
    cam.centerOn(px(this.cam.x) + (Math.random() - 0.5) * sh, py(this.cam.y) + (Math.random() - 0.5) * sh);
    this.background.update(dt, px(this.cam.x), py(this.cam.y));
    this.fx.follow(px(this.cam.x), py(this.cam.y));
  }
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
}
