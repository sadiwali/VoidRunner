import Phaser from 'phaser';
import { TITLE_FONT } from '../config';
import { makeCommonTextures, makeThemeTextures } from '../art/textures';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2 + 4, 240, 3, 0xffffff, 0.12);
    const bar = this.add.rectangle(width / 2 - 120, height / 2 + 4, 0, 3, 0xff4f6d).setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 22, 'VOIDRUNNER', { fontFamily: TITLE_FONT, fontSize: '20px', fontStyle: '700', color: '#e8e6ff' })
      .setOrigin(0.5)
      .setLetterSpacing(6);
    this.load.on('progress', (p: number) => (bar.width = 240 * p));
    this.load.setPath('assets/');
    for (const k of ['lvl1', 'lvl2', 'lvl3']) this.load.json(k, `levels/${k}.json`);
  }

  create() {
    // All art is generated procedurally; no image files are shipped.
    makeCommonTextures(this);
    makeThemeTextures(this, 0);
    this.scene.start('Menu');
  }
}
