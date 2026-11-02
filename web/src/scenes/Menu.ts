import Phaser from 'phaser';
import { LEVELS, UI_FONT } from '../config';
import { audio } from '../audio';
import { ACHIEVEMENTS, load, save, unlock } from '../save';

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export class Menu extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Image;
  private hue = 0;
  private items: { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text; action: () => void }[] = [];
  private sel = 0;
  private achPanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Menu');
  }

  create() {
    audio.play(0);
    this.items = [];
    this.sel = 0;
    this.achPanel = null;
    this.build();
    this.scale.on('resize', this.rebuild, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.rebuild, this));

    const kb = this.input.keyboard!;
    const move = (d: number) => {
      if (this.achPanel) return;
      this.sel = (this.sel + d + this.items.length) % this.items.length;
      audio.sfx('select');
      this.highlight();
    };
    kb.on('keydown-UP', () => move(-1));
    kb.on('keydown-W', () => move(-1));
    kb.on('keydown-DOWN', () => move(1));
    kb.on('keydown-S', () => move(1));
    const go = () => (this.achPanel ? this.closeAch() : this.items[this.sel]?.action());
    kb.on('keydown-ENTER', go);
    kb.on('keydown-SPACE', go);
    kb.on('keydown-ESC', () => this.achPanel && this.closeAch());
    kb.on('keydown-M', () => {
      audio.setMuted(!audio.muted);
      save({ muted: audio.muted });
      this.rebuild();
    });
  }

  private rebuild() {
    this.children.removeAll(true);
    this.items = [];
    const wasAch = !!this.achPanel;
    this.achPanel = null;
    this.build();
    if (wasAch) this.openAch();
  }

  private build() {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = Math.min(W / 1280, H / 720) * 1.0;
    this.bg = this.add.image(W / 2, H / 2, 'spr_mainBG');
    this.bg.setDisplaySize(Math.max(W, H) * 1.3, Math.max(W, H) * 1.3);
    this.add.image(0, 0, 'spr_vig').setOrigin(0).setDisplaySize(W, H).setAlpha(0.9);

    const title = this.add.image(W / 2, H * 0.24, 'spr_title').setTint(0xe8e6ff);
    title.setScale(Math.min(0.9, (W * 0.8) / 663, (H * 0.3) / 274));

    const d = load();
    const lvlName = LEVELS[Math.min(d.level, LEVELS.length - 1)].name;
    const startY = H * 0.5;
    const gap = Math.max(52, 64 * s);
    const btnScale = Math.max(0.55, Math.min(1, s * 1.1));

    const play = this.add.image(W / 2, startY, 'spr_menu_play_2').setScale(btnScale * 0.55);
    this.add
      .text(W / 2, startY + 52 * btnScale, `CURRENT LEVEL: ${lvlName}`, { fontFamily: UI_FONT, fontSize: `${Math.round(15 * btnScale + 3)}px`, color: '#c8c6e8' })
      .setOrigin(0.5);
    this.items.push({ obj: play, action: () => this.startGame(d.level) });

    let y = startY + 52 * btnScale + gap;
    if (d.level > 0) {
      const restart = this.add
        .text(W / 2, y, 'START OVER FROM LEVEL ONE', { fontFamily: UI_FONT, fontSize: `${Math.round(20 * btnScale + 4)}px`, color: '#ffffff' })
        .setOrigin(0.5);
      this.items.push({ obj: restart, action: () => this.startGame(0) });
      y += gap * 0.8;
    }
    const ach = this.add.image(W / 2, y, 'spr_menu_achievements').setScale(btnScale * 0.75);
    this.items.push({ obj: ach, action: () => this.openAch() });

    this.items.forEach((it, i) => {
      it.obj.setInteractive({ useHandCursor: true });
      it.obj.on('pointerover', () => {
        this.sel = i;
        this.highlight();
      });
      it.obj.on('pointerdown', () => it.action());
    });

    const help = this.sys.game.device.input.touch
      ? 'Touch controls on screen'
      : 'A / D move    SPACE jump (twice to double jump)    S drill    push away from a wall to wall-jump    Z / scroll map    M mute    ESC pause';
    this.add
      .text(W / 2, H - 26, help, { fontFamily: UI_FONT, fontSize: '13px', color: '#8f8cb8', align: 'center', wordWrap: { width: W - 40 } })
      .setOrigin(0.5, 1);
    this.add
      .text(W - 14, 12, audio.muted ? 'sound off (M)' : 'sound on (M)', { fontFamily: UI_FONT, fontSize: '12px', color: '#8f8cb8' })
      .setOrigin(1, 0);
    this.add.text(14, 12, '© 2015 VoidGames · Sadi Wali', { fontFamily: UI_FONT, fontSize: '12px', color: '#6f6c98' });
    this.highlight();
  }

  private highlight() {
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      it.obj.setAlpha(on ? 1 : 0.6);
      if (it.obj instanceof Phaser.GameObjects.Text) it.obj.setColor(on ? '#ff5a5a' : '#ffffff');
    });
  }

  private startGame(level: number) {
    audio.unlock();
    audio.sfx('select');
    const d = load();
    const played = d.timesPlayed + 1;
    save({ level, timesPlayed: played });
    if (played === 3) unlock('dedicated');
    this.cameras.main.fadeOut(300, 5, 4, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Transition', { next: level, summary: '' }));
  }

  private openAch() {
    audio.sfx('select');
    const W = this.scale.width;
    const H = this.scale.height;
    const got = load().achievements;
    const lines = ACHIEVEMENTS.map((a) => `${got.includes(a) ? '( UNLOCKED ) ' : ''}${a}`);
    const text = [
      "We're not telling you how you get these achievements.",
      '',
      ...lines,
      '',
      `//Unlocked: ${NUM[got.length] ?? got.length} out of ${NUM[ACHIEVEMENTS.length]}`,
      '',
      '(friends and champ came from the old multiplayer mode)',
    ].join('\n');
    const panel = this.add.rectangle(0, 0, Math.min(560, W - 32), Math.min(460, H - 32), 0x0b0a18, 0.95).setStrokeStyle(2, 0xff5a5a);
    const t = this.add.text(0, -10, text, { fontFamily: UI_FONT, fontSize: '17px', color: '#e8e6ff', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
    const back = this.add.image(0, panel.height / 2 - 40, 'spr_menu_back').setScale(0.6).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.closeAch());
    this.achPanel = this.add.container(W / 2, H / 2, [panel, t, back]).setDepth(10);
  }

  private closeAch() {
    audio.sfx('select');
    this.achPanel?.destroy();
    this.achPanel = null;
  }

  update(_t: number, dms: number) {
    // camColLerp.cs: the menu light drifts through red, white, cyan, magenta, yellow
    this.hue = (this.hue + dms / 1000 / 12) % 1;
    const c = Phaser.Display.Color.HSVToRGB(this.hue, 0.55, 0.85) as Phaser.Types.Display.ColorObject;
    this.bg.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    this.bg.rotation += dms / 1000 / 90;
  }
}
