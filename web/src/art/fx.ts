import Phaser from 'phaser';
import { THEMES } from './theme';

type Put = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** One-shot particle effects and the ambient weather of each level. */
export class Fx {
  private dustE: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkE: Phaser.GameObjects.Particles.ParticleEmitter;
  private chipE: Phaser.GameObjects.Particles.ParticleEmitter;
  private glowE: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailE: Phaser.GameObjects.Particles.ParticleEmitter;
  readonly ambient: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustColor: number;

  constructor(private scene: Phaser.Scene, private put: Put, themeIndex: number) {
    const T = THEMES[themeIndex];
    this.dustColor = T.rockLight;
    this.dustE = put(
      scene.add.particles(0, 0, 'dot', {
        emitting: false,
        lifespan: { min: 300, max: 600 },
        speed: { min: 20, max: 70 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.6, end: 0 },
        gravityY: -30,
      }),
    ).setDepth(45);
    this.sparkE = put(
      scene.add.particles(0, 0, 'streak', {
        emitting: false,
        lifespan: { min: 200, max: 450 },
        speed: { min: 80, max: 260 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: {
          onEmit: (p?: Phaser.GameObjects.Particles.Particle) => (p ? Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) : 0),
          onUpdate: (p: Phaser.GameObjects.Particles.Particle) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)),
        },
        gravityY: 300,
        blendMode: Phaser.BlendModes.ADD,
      }),
    ).setDepth(60);
    this.chipE = put(
      scene.add.particles(0, 0, 'chip', {
        emitting: false,
        lifespan: { min: 400, max: 800 },
        speed: { min: 60, max: 200 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.7, end: 0.2 },
        rotate: { min: 0, max: 360 },
        gravityY: 700,
      }),
    ).setDepth(46);
    this.glowE = put(
      scene.add.particles(0, 0, 'glow', {
        emitting: false,
        lifespan: { min: 400, max: 900 },
        speed: { min: 40, max: 220 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.9, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      }),
    ).setDepth(62);
    this.trailE = put(
      scene.add.particles(0, 0, 'dot', {
        emitting: false,
        lifespan: 260,
        speed: 0,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.5, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      }),
    ).setDepth(49);

    // weather
    const amb: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      x: { min: -900, max: 900 },
      y: { min: -600, max: 600 },
      lifespan: { min: 4000, max: 8000 },
      frequency: 60,
      tint: T.accent,
      blendMode: Phaser.BlendModes.ADD,
    };
    if (T.ambient === 'snow')
      Object.assign(amb, { speedY: { min: 20, max: 50 }, speedX: { min: -25, max: 5 }, scale: { min: 0.15, max: 0.35 }, alpha: { start: 0.7, end: 0 } });
    else if (T.ambient === 'spores')
      Object.assign(amb, { speedY: { min: -18, max: -4 }, speedX: { min: -10, max: 10 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 0.8, end: 0 }, frequency: 110 });
    else
      Object.assign(amb, { speedY: { min: -60, max: -20 }, speedX: { min: -15, max: 15 }, scale: { start: 0.3, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 70, color: [0xffe0a0, T.accent, T.rimSoft] });
    this.ambient = put(scene.add.particles(0, 0, 'dot', amb)).setDepth(70);
  }

  follow(x: number, y: number) {
    this.ambient.setPosition(x, y);
  }

  dust(x: number, y: number, n: number, dir = 0) {
    this.dustE.setParticleTint(this.dustColor);
    this.dustE.updateConfig({ angle: dir === 0 ? { min: 180, max: 360 } : dir > 0 ? { min: 290, max: 350 } : { min: 190, max: 250 } });
    this.dustE.explode(n, x, y);
  }

  sparks(x: number, y: number, color: number, n: number) {
    this.sparkE.setParticleTint(color);
    this.sparkE.explode(n, x, y);
  }

  chips(x: number, y: number, color: number, n: number) {
    this.chipE.setParticleTint(color);
    this.chipE.explode(n, x, y);
  }

  burst(x: number, y: number, color: number, n: number) {
    this.glowE.setParticleTint(color);
    this.glowE.explode(n, x, y);
  }

  trail(x: number, y: number, color: number) {
    this.trailE.setParticleTint(color);
    this.trailE.emitParticleAt(x, y, 1);
  }

  ring(x: number, y: number, color: number, size = 3, ms = 450) {
    const r = this.put(this.scene.add.image(x, y, 'ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(63).setScale(0.1));
    this.scene.tweens.add({ targets: r, scale: size, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
  }
}
