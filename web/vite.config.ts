import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Served from https://sadiwali.com/void-runner/
export default defineConfig({
  base: '/void-runner/',
  resolve: {
    // Arcade-only Phaser build: drops Matter.js and other unused systems (~80 KB gzipped less)
    alias: { phaser: fileURLToPath(new URL('./node_modules/phaser/dist/phaser-arcade-physics.js', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
  },
});
