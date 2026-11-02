import Phaser from 'phaser';
import { LEVELS, UI_FONT, TITLE_FONT } from '../config';
import { audio } from '../audio';
import { THEMES, INK, hex } from '../art/theme';
import { fmtTime } from './Game';

export interface Summary {
  level: number;
  seconds: number;
  isBest: boolean;
  rows: [string, number][];
}

/** Level summary card + the "scene_loading" title card between levels. */
export class Transition extends Phaser.Scene {
  constructor() {
    super('Transition');
  }

  create(data: { next: number; summary?: Summary }) {
    const W = this.scale.width;
    const H = this.scale.height;
    const fromGame = this.scene.isPaused('Game') || this.scene.isActive('Game');
    const sum = data.summary;
    this.add.rectangle(0, 0, W, H, 0x000000, sum ? 0.72 : 1).setOrigin(0);

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      audio.sfx('select');
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (data.next >= 0) {
          if (fromGame) {
            this.scene.get('Game').scene.restart({ level: data.next });
            this.scene.stop();
          } else this.scene.start('Game', { level: data.next });
        } else {
          if (fromGame) this.scene.stop('Game');
          this.scene.start('Menu');
        }
      });
    };

    if (!sum) {
      // title card
      const T = THEMES[data.next];
      const lv = LEVELS[data.next];
      const n = this.add
        .text(W / 2, H / 2 - 26, `LEVEL ${data.next + 1}`, { fontFamily: TITLE_FONT, fontSize: '22px', fontStyle: '700', color: hex(INK.uiDim) })
        .setOrigin(0.5)
        .setLetterSpacing(8);
      const t = this.add
        .text(W / 2, H / 2 + 16, lv.short, { fontFamily: TITLE_FONT, fontSize: '54px', fontStyle: '900', color: '#ffffff' })
        .setOrigin(0.5)
        .setLetterSpacing(14)
        .setShadow(0, 0, hex(T.rim), 26, false, true);
      const line = this.add.rectangle(W / 2, H / 2 + 62, 0, 2, T.rim);
      [n, t].forEach((o, i) => {
        o.setAlpha(0).y += 12;
        this.tweens.add({ targets: o, alpha: 1, y: o.y - 12, duration: 500, delay: 100 + i * 120, ease: 'Cubic.easeOut' });
      });
      this.tweens.add({ targets: line, width: 160, duration: 700, delay: 250, ease: 'Cubic.easeOut' });
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.time.delayedCall(1500, go);
      return;
    }

    // summary card
    const T = THEMES[sum.level];
    const pw = Math.min(480, W - 24);
    const ph = Math.min(H - 24, 400);
    const g = this.add.graphics();
    g.fillStyle(0x07060f, 0.94).fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 18);
    g.lineStyle(1.5, 0xffffff, 0.12).strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 18);
    g.fillStyle(T.rim, 1).fillRect(-pw / 2 + 28, -ph / 2 + 74, 40, 3);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    parts.push(
      this.add.text(-pw / 2 + 28, -ph / 2 + 24, `${LEVELS[sum.level].short} CLEARED`, { fontFamily: TITLE_FONT, fontSize: '24px', fontStyle: '700', color: '#ffffff' }),
    );
    parts.push(this.add.text(-pw / 2 + 28, -ph / 2 + 96, 'TIME', { fontFamily: UI_FONT, fontSize: '14px', fontStyle: '600', color: hex(INK.uiDim) }));
    const time = this.add.text(-pw / 2 + 26, -ph / 2 + 108, fmtTime(sum.seconds), { fontFamily: UI_FONT, fontSize: '50px', fontStyle: '700', color: '#ffffff' });
    parts.push(time);
    if (sum.isBest) {
      const badge = this.add
        .text(-pw / 2 + 40 + time.width, -ph / 2 + 132, 'NEW BEST', { fontFamily: UI_FONT, fontSize: '14px', fontStyle: '700', color: '#07060f', backgroundColor: '#ffd25a', padding: { x: 8, y: 4 } })
        .setScale(0);
      this.tweens.add({ targets: badge, scale: 1, duration: 400, delay: 500, ease: 'Back.easeOut' });
      parts.push(badge);
    }
    sum.rows.forEach(([k, v], i) => {
      const y = -ph / 2 + 190 + i * 34;
      parts.push(this.add.text(-pw / 2 + 28, y, k, { fontFamily: UI_FONT, fontSize: '17px', fontStyle: '500', color: '#c8c6e8' }));
      const val = this.add.text(pw / 2 - 28, y, '0', { fontFamily: UI_FONT, fontSize: '19px', fontStyle: '700', color: '#ffffff' }).setOrigin(1, 0);
      parts.push(val);
      const counter = { n: 0 };
      this.tweens.add({ targets: counter, n: v, duration: 600, delay: 300 + i * 120, onUpdate: () => val.setText(String(Math.round(counter.n))) });
    });
    const nextLabel = data.next >= 0 ? `NEXT: ${LEVELS[data.next].name}` : 'YOU FINISHED VOIDRUNNER. THANKS FOR PLAYING!';
    const hint = this.add
      .text(0, ph / 2 - 30, `${nextLabel}\npress any key / tap to continue`, { fontFamily: UI_FONT, fontSize: '14px', fontStyle: '600', color: hex(INK.uiDim), align: 'center' })
      .setOrigin(0.5);
    parts.push(hint);
    const card = this.add.container(W / 2, H / 2 + 20, parts).setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, y: H / 2, duration: 450, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: hint, alpha: 0.45, duration: 800, yoyo: true, repeat: -1, delay: 900 });

    // a short beat before input counts, so a held jump key doesn't skip the summary
    this.time.delayedCall(900, () => {
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => !e.repeat && go());
      this.input.once('pointerdown', go);
    });
    this.time.delayedCall(12000, go);
  }
}
