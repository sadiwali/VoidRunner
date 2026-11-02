import Phaser from 'phaser';
import { THEMES } from './theme';

/**
 * Layered parallax backdrop drawn by its own unzoomed camera: gradient sky, two nebula layers,
 * two star layers and distant floating rocks. update() takes the world camera centre in px.
 */
export class Background {
  private sky: Phaser.GameObjects.Image;
  private layers: { o: Phaser.GameObjects.TileSprite; f: number; s: number; drift: number }[] = [];
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  private t = 0;

  constructor(private scene: Phaser.Scene, themeIndex: number) {
    const T = THEMES[themeIndex];
    const { width: W, height: H } = scene.scale;
    this.sky = scene.add.image(0, 0, `sky_${themeIndex}`).setOrigin(0).setDisplaySize(W, H).setDepth(-100);
    this.objects.push(this.sky);
    const layer = (key: string, f: number, s: number, tint: number, alpha: number, drift = 0, add = false) => {
      const o = scene.add.tileSprite(0, 0, W, H, key).setOrigin(0).setDepth(-99 + this.layers.length);
      o.setTileScale(s, s).setTint(tint).setAlpha(alpha);
      if (add) o.setBlendMode(Phaser.BlendModes.ADD);
      this.layers.push({ o, f, s, drift });
      this.objects.push(o);
    };
    layer(`nebula_${themeIndex}`, 0.02, 3.2, 0xffffff, 0.75, 4);
    layer('stars', 0.035, 1, T.stars, 0.55);
    layer(`nebula_${themeIndex}`, 0.06, 2.0, 0xffffff, 0.35, -6, true);
    layer('stars', 0.08, 1.6, T.stars, 0.8);
    layer(`far_${themeIndex}`, 0.18, 1.3, 0xffffff, 0.95);
  }

  resize(W: number, H: number) {
    this.sky.setDisplaySize(W, H);
    for (const l of this.layers) l.o.setSize(W, H);
  }

  update(dt: number, cx: number, cy: number) {
    this.t += dt;
    const { width: W, height: H } = this.scene.scale;
    for (const l of this.layers) {
      l.o.tilePositionX = (cx * l.f + this.t * l.drift - W / 2) / l.s;
      l.o.tilePositionY = (cy * l.f - H / 2) / l.s;
    }
  }
}
