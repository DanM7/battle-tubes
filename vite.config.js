import { defineConfig } from 'vite';

// host: true exposes the dev server on your LAN so you can play on a phone.
export default defineConfig({
  base: './',
  server: { host: true },
  preview: { host: true },
  build: { chunkSizeWarningLimit: 1500 }, // Phaser alone is ~1.2 MB
});
