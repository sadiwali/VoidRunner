import Phaser from 'phaser';
import { UI_FONT } from './config';
import { audio } from './audio';

/** The sliding notification banner from Sayer.cs. */
export class Sayer {
  private box: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private hideAt = 0;
  private shown = false;
  private readonly scene: Phaser.Scene;
  private readonly lane: number;

  constructor(scene: Phaser.Scene, lane = 0) {
    this.scene = scene;
    this.lane = lane;
    const bg = scene.add.image(0, 0, 'spr_sayerBG').setOrigin(0.5, 0.5);
    bg.setDisplaySize(560, 60);
    this.text = scene.add
      .text(24, 0, '', { fontFamily: UI_FONT, fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5, 0.5);
    this.box = scene.add.container(0, -80, [bg, this.text]).setScrollFactor(0).setDepth(1000 + lane);
    this.layout();
  }

  layout() {
    this.box.x = this.scene.scale.width / 2;
    if (!this.shown) this.box.y = -80;
  }

  say(s: string, seconds: number, sound: 'notif' | 'ach' | 'select' | null = 'notif') {
    this.text.setText(s);
    this.hideAt = this.scene.time.now + seconds * 1000;
    this.shown = true;
    if (sound) audio.sfx(sound);
  }

  update(dt: number) {
    const target = this.shown ? 46 + this.lane * 70 : -80;
    if (this.shown && this.scene.time.now > this.hideAt) this.shown = false;
    this.box.x = this.scene.scale.width / 2;
    this.box.y += (target - this.box.y) * Math.min(1, dt * (this.shown ? 8 : 4));
  }
}

export function label(scene: Phaser.Scene, x: number, y: number, s: string, size = 20, color = '#e8e6ff') {
  return scene.add.text(x, y, s, { fontFamily: UI_FONT, fontSize: `${size}px`, color }).setScrollFactor(0);
}
