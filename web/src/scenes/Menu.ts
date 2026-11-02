import Phaser from 'phaser';
import { LEVELS, UI_FONT, TITLE_FONT } from '../config';
import { audio } from '../audio';
import { ACHIEVEMENTS, load, save, unlock } from '../save';
import { Background } from '../art/background';
import { Fx } from '../art/fx';
import { RunnerView } from '../art/runner';
import { MoleView } from '../art/molerat';
import { THEMES, INK, hex, mix } from '../art/theme';
import { Button } from '../ui';
import { fmtTime } from './Game';

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ACH_HINTS: Record<string, string> = {
  stronglegs: '???',
  dedicated: '???',
  bandageman: '???',
  friends: 'from the old multiplayer mode',
  champ: 'from the old multiplayer mode',
  quick: '???',
  finisher: '???',
};

export class Menu extends Phaser.Scene {
  private bg!: Background;
  private fx!: Fx;
  private t = 0;
  private buttons: { b: Button; action: () => void }[] = [];
  private sel = 0;
  private panel: Phaser.GameObjects.Container | null = null;
  private panelKind: 'levels' | 'ach' | null = null;
  private levelSel = 0;
  private levelCards: { g: Phaser.GameObjects.Graphics; draw: (on: boolean) => void; unlocked: boolean }[] = [];
  private hero: RunnerView | null = null;
  private mole: MoleView | null = null;
  private heroAt = { x: 0, y: 0, scale: 1 };
  private title!: Phaser.GameObjects.Text;
  private leaving = false;

  constructor() {
    super('Menu');
  }

  create() {
    audio.play(0);
    this.leaving = false;
    this.panel = null;
    this.panelKind = null;
    this.build();
    this.scale.on('resize', this.rebuild, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.rebuild, this));
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const kb = this.input.keyboard!;
    const move = (d: number) => {
      if (this.panelKind === 'levels') return;
      if (this.panel) return;
      this.select((this.sel + d + this.buttons.length) % this.buttons.length);
      audio.sfx('select');
    };
    const side = (d: number) => {
      if (this.panelKind !== 'levels') return;
      this.levelSel = (this.levelSel + d + LEVELS.length) % LEVELS.length;
      this.levelCards.forEach((c, i) => c.draw(i === this.levelSel));
      audio.sfx('select');
    };
    kb.on('keydown-UP', () => move(-1));
    kb.on('keydown-W', () => move(-1));
    kb.on('keydown-DOWN', () => move(1));
    kb.on('keydown-S', () => move(1));
    kb.on('keydown-LEFT', () => side(-1));
    kb.on('keydown-A', () => side(-1));
    kb.on('keydown-RIGHT', () => side(1));
    kb.on('keydown-D', () => side(1));
    const go = () => {
      if (this.panelKind === 'levels') return this.pickLevel(this.levelSel);
      if (this.panel) return this.closePanel();
      this.buttons[this.sel]?.action();
    };
    kb.on('keydown-ENTER', go);
    kb.on('keydown-SPACE', go);
    kb.on('keydown-ESC', () => this.panel && this.closePanel());
    kb.on('keydown-M', () => {
      audio.setMuted(!audio.muted);
      save({ muted: audio.muted });
      this.rebuild();
    });
  }

  private rebuild() {
    const kind = this.panelKind;
    this.children.removeAll(true);
    this.panel = null;
    this.panelKind = null;
    this.build();
    if (kind === 'ach') this.openAch();
    if (kind === 'levels') this.openLevels();
  }

  private build() {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = Math.min(W / 1280, H / 720);
    this.buttons = [];

    this.bg = new Background(this, 0);
    this.fx = new Fx(this, (o) => o, 0);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setAlpha(0.9).setDepth(80);

    // hero on a floating rock
    const T = THEMES[0];
    const showHero = W > 640 && H > 420;
    this.hero = null;
    this.mole = null;
    if (showHero) {
      const hs = Math.max(1.6, 2.6 * s);
      const ix = W * 0.2;
      const iy = H * 0.8;
      const g = this.add.graphics().setDepth(20);
      const iw = 150 * hs * 0.5;
      g.fillStyle(T.rockMid, 1);
      g.fillPoints(
        [
          { x: ix - iw, y: iy },
          { x: ix + iw, y: iy },
          { x: ix + iw * 0.7, y: iy + 18 * hs },
          { x: ix + iw * 0.2, y: iy + 40 * hs },
          { x: ix - iw * 0.1, y: iy + 58 * hs },
          { x: ix - iw * 0.45, y: iy + 30 * hs },
          { x: ix - iw * 0.85, y: iy + 14 * hs },
        ],
        true,
      );
      g.fillStyle(T.rockDark, 0.6).fillTriangle(ix - iw * 0.1, iy + 58 * hs, ix + iw * 0.2, iy + 40 * hs, ix - iw * 0.2, iy + 10 * hs);
      g.fillStyle(T.rockLight, 1).fillRect(ix - iw, iy, iw * 2, 3 * hs);
      g.fillStyle(T.rim, 1).fillRect(ix - iw, iy - 1, iw * 2, 2);
      const gl = this.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
      gl.fillStyle(T.rim, 0.2).fillRect(ix - iw - 4, iy - 6, iw * 2 + 8, 10);
      this.heroAt = { x: ix, y: iy, scale: hs };
      this.hero = new RunnerView(this);
      this.hero.rim = mix(INK.suitLight, T.rim, 0.45);
      this.hero.g.setScale(hs).setDepth(30);
      this.hero.glow.setScale(hs).setDepth(31);
      this.mole = new MoleView(this);
      this.mole.rim = mix(INK.moleFurDark, T.rim, 0.35);
      this.mole.g.setScale(hs * 0.9).setDepth(29);
      this.mole.glow.setScale(hs * 0.9).setDepth(29);
    }

    // title
    const tsize = Math.round(Math.max(38, Math.min(96, W * 0.075)));
    this.title = this.add
      .text(W / 2, H * 0.2, 'VOIDRUNNER', { fontFamily: TITLE_FONT, fontSize: `${tsize}px`, fontStyle: '900', color: '#ffffff' })
      .setOrigin(0.5)
      .setLetterSpacing(Math.round(tsize * 0.12))
      .setShadow(0, 0, hex(INK.uiAccent), 28, false, true)
      .setDepth(50);
    this.add
      .text(W / 2, H * 0.2 + tsize * 0.75, 'A 2015 PLATFORMER, REVIVED', { fontFamily: UI_FONT, fontSize: `${Math.round(tsize * 0.2)}px`, fontStyle: '600', color: hex(T.rim) })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setDepth(50);

    // buttons
    const d = load();
    const cur = Math.min(d.level, LEVELS.length - 1);
    const size = Math.round(Math.max(20, 28 * s));
    const x = showHero ? Math.max(W * 0.58, W / 2) : W / 2;
    let y = H * 0.47;
    const gap = size * 2.6;
    const minW = Math.max(300, 380 * s);
    const add = (text: string, action: () => void, sub?: string) => {
      const b = new Button(this, x, y, text, size, sub, minW);
      b.c.setDepth(60);
      const i = this.buttons.length;
      b.c.on('pointerover', () => !this.panel && this.select(i));
      b.c.on('pointerdown', () => !this.panel && action());
      this.buttons.push({ b, action });
      y += gap;
    };
    add(d.level > 0 || Object.keys(d.best).length ? 'CONTINUE' : 'PLAY', () => this.startGame(cur), `${LEVELS[cur].name}`);
    add('LEVELS', () => this.openLevels());
    add('ACHIEVEMENTS', () => this.openAch());
    this.select(0);

    const touch = this.sys.game.device.input.touch;
    const help = touch
      ? 'Touch the arrows to run, ▲ to jump (twice for a double jump), ▼ to drill down'
      : 'A/D run · SPACE jump (twice to double jump) · S drill · push off walls to wall-jump · Z map · ESC pause';
    this.add
      .text(W / 2, H - 22, help, { fontFamily: UI_FONT, fontSize: '14px', fontStyle: '500', color: hex(INK.uiDim), align: 'center', wordWrap: { width: W - 40 } })
      .setOrigin(0.5, 1)
      .setDepth(60);
    const snd = this.add
      .text(W - 16, 14, audio.muted ? 'SOUND OFF (M)' : 'SOUND ON (M)', { fontFamily: UI_FONT, fontSize: '13px', fontStyle: '600', color: hex(INK.uiDim) })
      .setOrigin(1, 0)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    snd.on('pointerdown', () => {
      audio.unlock();
      audio.setMuted(!audio.muted);
      save({ muted: audio.muted });
      this.rebuild();
    });
    this.add.text(16, 14, '© 2015 VoidGames · Sadi Wali', { fontFamily: UI_FONT, fontSize: '13px', fontStyle: '500', color: '#6f6c98' }).setDepth(60);
  }

  private select(i: number) {
    this.sel = i;
    this.buttons.forEach((it, k) => it.b.setSelected(k === i));
  }

  private startGame(level: number) {
    if (this.leaving) return;
    this.leaving = true;
    audio.unlock();
    audio.sfx('select');
    const d = load();
    const played = d.timesPlayed + 1;
    save({ level, timesPlayed: played });
    if (played === 3) unlock('dedicated');
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Transition', { next: level }));
  }

  private makePanel(w: number, h: number, title: string) {
    const W = this.scale.width;
    const H = this.scale.height;
    const dim = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.55).setInteractive();
    dim.on('pointerdown', () => this.closePanel());
    const g = this.add.graphics();
    g.fillStyle(0x07060f, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(1.5, 0xffffff, 0.12).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(INK.uiAccent, 1).fillRect(-w / 2 + 28, -h / 2 + 74, 40, 3);
    const block = this.add.rectangle(0, 0, w, h, 0, 0.001).setInteractive();
    const t = this.add.text(-w / 2 + 28, -h / 2 + 26, title, { fontFamily: TITLE_FONT, fontSize: '26px', fontStyle: '700', color: '#ffffff' });
    const close = this.add
      .text(w / 2 - 24, -h / 2 + 26, '✕', { fontFamily: UI_FONT, fontSize: '24px', color: hex(INK.uiDim) })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closePanel());
    this.panel = this.add.container(W / 2, H / 2, [dim, g, block, t, close]).setDepth(200);
    this.panel.setAlpha(0);
    this.tweens.add({ targets: this.panel, alpha: 1, duration: 160 });
    return this.panel;
  }

  private openLevels() {
    audio.sfx('select');
    const W = this.scale.width;
    const H = this.scale.height;
    const d = load();
    const pw = Math.min(760, W - 24);
    const cardW = (pw - 56 - 24) / 3;
    const ph = Math.min(H - 24, 320);
    const p = this.makePanel(pw, ph, 'LEVELS');
    this.panelKind = 'levels';
    this.levelCards = [];
    this.levelSel = Math.min(d.level, LEVELS.length - 1);
    LEVELS.forEach((lv, i) => {
      const unlocked = i === 0 || d.best[LEVELS[i - 1].key] !== undefined || d.level >= i;
      const best = d.best[lv.key];
      const T = THEMES[i];
      const cx = -pw / 2 + 28 + cardW / 2 + i * (cardW + 12);
      const cy = 30;
      const ch = ph - 130;
      const g = this.add.graphics();
      const draw = (on: boolean) => {
        g.clear();
        g.fillGradientStyle(T.skyTop, T.skyTop, T.skyBottom, T.skyBottom, 1);
        g.fillRoundedRect(cx - cardW / 2, cy - ch / 2, cardW, ch, 10);
        g.fillStyle(T.rockMid, 1).fillRect(cx - cardW / 2, cy + ch * 0.18, cardW, ch * 0.32 - 10);
        g.fillStyle(T.rim, unlocked ? 1 : 0.3).fillRect(cx - cardW / 2, cy + ch * 0.18, cardW, 2);
        g.lineStyle(on ? 3 : 1.5, on ? INK.uiAccent : 0xffffff, on ? 1 : 0.15).strokeRoundedRect(cx - cardW / 2, cy - ch / 2, cardW, ch, 10);
        if (!unlocked) g.fillStyle(0x000000, 0.55).fillRoundedRect(cx - cardW / 2, cy - ch / 2, cardW, ch, 10);
      };
      draw(i === this.levelSel);
      const num = this.add.text(cx, cy - ch / 2 + 16, `${i + 1}`, { fontFamily: TITLE_FONT, fontSize: '34px', fontStyle: '900', color: unlocked ? '#ffffff' : '#5a5878' }).setOrigin(0.5, 0);
      const nm = this.add.text(cx, cy - ch / 2 + 62, lv.short, { fontFamily: TITLE_FONT, fontSize: '16px', fontStyle: '700', color: unlocked ? hex(T.rim) : '#5a5878' }).setOrigin(0.5, 0).setLetterSpacing(3);
      const info = this.add
        .text(cx, cy + ch / 2 - 30, unlocked ? (best !== undefined ? `BEST ${fmtTime(best)}` : 'NOT CLEARED') : 'LOCKED', {
          fontFamily: UI_FONT,
          fontSize: '14px',
          fontStyle: '600',
          color: unlocked ? '#e8e6ff' : '#5a5878',
        })
        .setOrigin(0.5);
      const hit = this.add.rectangle(cx, cy, cardW, ch, 0, 0.001).setInteractive({ useHandCursor: unlocked });
      hit.on('pointerover', () => {
        this.levelSel = i;
        this.levelCards.forEach((c, k) => c.draw(k === i));
      });
      hit.on('pointerdown', () => this.pickLevel(i));
      p.add([g, num, nm, info, hit]);
      this.levelCards.push({ g, draw, unlocked });
    });
    p.add(
      this.add
        .text(0, ph / 2 - 22, '← → choose · ENTER play · ESC back', { fontFamily: UI_FONT, fontSize: '13px', color: hex(INK.uiDim) })
        .setOrigin(0.5),
    );
  }

  private pickLevel(i: number) {
    if (!this.levelCards[i]?.unlocked) {
      audio.sfx('hit');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.startGame(i);
  }

  private openAch() {
    audio.sfx('select');
    const W = this.scale.width;
    const H = this.scale.height;
    const got = load().achievements;
    const pw = Math.min(520, W - 24);
    const ph = Math.min(H - 24, 470);
    const p = this.makePanel(pw, ph, 'ACHIEVEMENTS');
    this.panelKind = 'ach';
    p.add(
      this.add.text(-pw / 2 + 28, -ph / 2 + 90, "We're not telling you how you get these.", { fontFamily: UI_FONT, fontSize: '15px', color: hex(INK.uiDim) }),
    );
    ACHIEVEMENTS.forEach((a, i) => {
      const y = -ph / 2 + 130 + i * 38;
      const on = got.includes(a);
      const g = this.add.graphics();
      g.fillStyle(on ? 0xffd25a : 0x2a2840, 1).fillCircle(-pw / 2 + 40, y + 10, 8);
      if (on) g.lineStyle(2, 0x07060f, 1).lineBetween(-pw / 2 + 36, y + 10, -pw / 2 + 39, y + 13).lineBetween(-pw / 2 + 39, y + 13, -pw / 2 + 45, y + 6);
      const t = this.add.text(-pw / 2 + 60, y, a, { fontFamily: UI_FONT, fontSize: '18px', fontStyle: '700', color: on ? '#ffffff' : '#6f6c98' });
      const h = this.add.text(pw / 2 - 28, y + 2, on ? 'UNLOCKED' : ACH_HINTS[a], { fontFamily: UI_FONT, fontSize: '13px', color: on ? '#ffd25a' : '#4f4c70' }).setOrigin(1, 0);
      p.add([g, t, h]);
    });
    p.add(
      this.add
        .text(0, ph / 2 - 26, `Unlocked ${NUM[got.length] ?? got.length} out of ${NUM[ACHIEVEMENTS.length]}`, { fontFamily: UI_FONT, fontSize: '15px', fontStyle: '600', color: '#e8e6ff' })
        .setOrigin(0.5),
    );
  }

  private closePanel() {
    audio.sfx('select');
    this.panel?.destroy();
    this.panel = null;
    this.panelKind = null;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(dms / 1000, 0.1);
    this.t += dt;
    this.bg.update(dt, this.t * 40, Math.sin(this.t * 0.2) * 60);
    this.fx.follow(this.scale.width / 2, this.scale.height / 2);
    this.title.setShadow(0, 0, hex(INK.uiAccent), 22 + Math.sin(this.t * 2) * 8, false, true);
    if (this.hero && this.mole) {
      const { x, y, scale } = this.heroAt;
      // views draw in world units; their graphics are scaled about (0,0), so pass positions pre-divided
      const hx = (x - 30 * scale) / scale;
      const hy = y / scale;
      this.hero.update(dt, { x: hx, y: hy, vx: 0, vy: 0, state: 'idle', facing: 1, visible: true, flash: 0, alpha: 1 });
      const mx = (x + 40 * scale) / (scale * 0.9);
      const my = (y - 16 * scale * 0.9) / (scale * 0.9);
      const sniffing = Math.sin(this.t * 0.7) > -0.3;
      this.mole.update(dt, { x: mx, y: my, vx: 0, facing: -1, mood: sniffing ? 'sniff' : 'calm', grounded: true, moodT: 1 });
    }
  }
}
