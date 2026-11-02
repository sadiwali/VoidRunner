# VoidRunner for the browser

A Phaser 4 + TypeScript port of the 2015 Unity game, built with Vite and served as static files from
`https://sadiwali.com/void-runner/`.

```bash
npm install
npm run dev       # http://localhost:5173/void-runner/
npm run build     # static site in dist/
REMOTE_DIR=/path/to/site/void-runner ./deploy.sh   # build + rsync to the home server
```

Add `?debug` to the URL to draw physics bodies.

## How it maps to the Unity project

- **Gameplay code** was recovered by decompiling `VOIDRUNNER_Data/Managed/Assembly-CSharp.dll`
  (see `../recovered/decompiled-cs`). `src/scenes/Game.ts` ports `Player`, `molerat`, `Turret`, `Bullet`,
  `CameraFollow`, `Checkpoint`, `LevelReload`, `NextLevelCollider`, `HUD` and `Sayer`.
- **Physics** runs Arcade at a fixed 50 Hz with gravity 9.81 units/s², the same as Unity's FixedUpdate,
  and applies the original forces (`AddForce` -> `F * dt / mass`). Tuning values live in `src/config.ts`.
- **Levels** come from the built level files, exported by `../tools/build_web_assets.py` into
  `public/assets/levels/*.json` (Unity units, y up). The two rotated platforms in level two are handled as
  one-way slopes.
- **Art** is all procedural (`src/art/`): the runner, molerats, turrets, terrain, skies, checkpoints and portal are
  drawn with canvas/Graphics at runtime. No image files ship with the game. Fonts are Orbitron and Chakra Petch (OFL).
- **Molerat AI** lives in `src/ai/molerat.ts`: patrol, line-of-sight noticing, climbing, gap jumps, drop-downs,
  telegraphed lunges, searching your last known position, then giving up. Landing on a molerat's spiky back costs
  half a heart; molerats never die.
- **Music and sound effects** are synthesized at runtime in `src/audio.ts`. No audio files ship with the game.
- **Saves** (current level, achievements, best times, mute) live in `localStorage`.
- **Multiplayer** (Unity's legacy master server) is not ported; this is the single-player game.

Controls: A/D or arrows to move, Space/W to jump (again in the air to double jump; release early for a shorter hop),
S to drill down, push away from a wall while sliding to wall-jump, Ctrl/Shift to slow a wall slide, Z or scroll to
zoom out, M to mute, G to toggle bloom/particles, Esc to pause. Touch devices get on-screen buttons.
