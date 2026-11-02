import Phaser from 'phaser';
import { LEVELS, UI_FONT } from '../config';
import { audio } from '../audio';

/** Level summary + the "scene_loading" interlude between levels. */
export class Transition extends Phaser.Scene {
  constructor() {
    super('Transition');
  }

  create(data: { next: number; summary: string }) {
    const W = this.scale.width;
    const H = this.scale.height;
    const fromGame = this.scene.isPaused('Game') || this.scene.isActive('Game');
    this.add.rectangle(0, 0, W, H, 0x05040d, data.summary ? 0.75 : 1).setOrigin(0);

    const lines: string[] = [];
    if (data.summary) lines.push(data.summary, '');
    if (data.next >= 0) lines.push(`Next: ${LEVELS[data.next].name}`);
    else lines.push('You finished VOIDRUNNER!', 'Thanks for playing.');
    this.add
      .text(W / 2, H / 2 - 20, lines.join('\n'), { fontFamily: UI_FONT, fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);
    const hint = this.add
      .text(W / 2, H - 50, data.summary ? 'press SPACE / tap to continue' : 'loading...', { fontFamily: UI_FONT, fontSize: '15px', color: '#8f8cb8' })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      audio.sfx('select');
      if (data.next >= 0) {
        if (fromGame) {
          this.scene.get('Game').scene.restart({ level: data.next });
          this.scene.stop();
        } else this.scene.start('Game', { level: data.next });
      } else {
        if (fromGame) this.scene.stop('Game');
        this.scene.start('Menu');
      }
    };
    if (data.summary) {
      // a short beat before input counts, so a held jump key doesn't skip the summary
      this.time.delayedCall(800, () => {
        this.input.keyboard!.once('keydown', go);
        this.input.once('pointerdown', go);
      });
      this.time.delayedCall(8000, go);
    } else {
      this.time.delayedCall(1200, go);
    }
  }
}
