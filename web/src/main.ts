import Phaser from 'phaser';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
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

async function start() {
  // Phaser draws text to canvas, so the web fonts must be ready first (give up after 2.5 s).
  const fonts = ['700 20px Orbitron', '900 20px Orbitron', '500 20px "Chakra Petch"', '600 20px "Chakra Petch"', '700 20px "Chakra Petch"'];
  try {
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* fall back to system fonts */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#020208',
    antialias: true,
    roundPixels: false,
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
}

void start();
