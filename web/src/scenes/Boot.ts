import Phaser from 'phaser';
import type { SpriteSheet } from '../types';
import { UI_FONT } from '../config';

const IMAGES = [
  'spr_char', 'map_Builder_v2', 'spr_npc_turret', 'spr_npc_molerat', 'spr_hearts', 'spr_title', 'spr_mainBG',
  'spr_arrow_downright', 'spr_vig', 'spr_menu_play_1', 'spr_menu_play_2', 'spr_menu_back', 'spr_menu_achievements',
  'spr_sayerBG',
];

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 4, 0xff5a5a).setOrigin(0, 0.5);
    this.add.text(width / 2, height / 2 - 24, 'VOIDRUNNER', { fontFamily: UI_FONT, fontSize: '20px', color: '#c8c6e8' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => (bar.width = 300 * p));

    this.load.setPath('assets/');
    for (const k of IMAGES) this.load.image(k, `img/${k}.png`);
    this.load.json('sprites', 'sprites.json');
    for (const k of ['lvl1', 'lvl2', 'lvl3']) this.load.json(k, `levels/${k}.json`);
  }

  create() {
    const sheet = this.cache.json.get('sprites') as SpriteSheet;
    // Unity imported the backdrop with bilinear filtering; smoothing it keeps it behind the pixel-art platforms.
    this.textures.get('spr_mainBG').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('spr_vig').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('spr_title').setFilter(Phaser.Textures.FilterMode.LINEAR);
    // Register every Unity sprite as a named frame on its texture.
    for (const [name, f] of Object.entries(sheet.frames)) {
      const tex = this.textures.get(f.tex);
      if (tex && !tex.has(name)) tex.add(name, 0, f.x, f.y, f.w, f.h);
    }
    const clip = (key: string, clipName: string, repeat = -1, fpsOverride?: number) => {
      const c = sheet.clips[clipName];
      // Unity clips list the first frame again at the end to close the loop; drop it.
      let frames = c.frames;
      if (frames.length > 2 && frames[0] === frames[frames.length - 1]) frames = frames.slice(0, -1);
      const fps = fpsOverride ?? Math.max(1, frames.length / Math.max(c.stop, 1 / 60));
      this.anims.create({
        key,
        frames: frames.map((frame) => ({ key: sheet.frames[frame].tex, frame })),
        frameRate: fps,
        repeat,
      });
    };
    clip('plr_idle', 'anim_plrIdle');
    clip('plr_walk', 'anim_plrWalk');
    clip('plr_jump', 'anim_plrJump');
    clip('plr_fall', 'anim_plrFall');
    clip('plr_wall', 'anim_plrWallSlide');
    clip('plr_drill', 'anim_plrDrill', -1, 17);
    clip('mole_walk', 'npc_walk', -1, 7);
    clip('mole_idle', 'anim_npc_idle');
    clip('turret_wake', 'anim_Turret_Wake', 0, 30);
    clip('turret_sleep', 'anim_Turret_Sleep', 0, 30);

    this.scene.start('Menu');
  }
}
