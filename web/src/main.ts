import Phaser from 'phaser';
import { STEP_HZ, GRAVITY, S } from './config';
import { Boot } from './scenes/Boot';
import { Menu } from './scenes/Menu';
import { Game } from './scenes/Game';
import { Transition } from './scenes/Transition';
import { audio } from './audio';
import { load } from './save';

audio.muted = load().muted;
// Browsers only allow audio after a user gesture.
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchstart', unlock);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05040d',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY * S },
      fps: STEP_HZ,
      fixedStep: true,
      debug: new URLSearchParams(location.search).has('debug'),
    },
  },
  input: { activePointers: 3 },
  scene: [Boot, Menu, Game, Transition],
});

// Handy for automated playtests in a headless browser.
(window as unknown as { __vr: Phaser.Game }).__vr = game;
