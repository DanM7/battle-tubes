import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/** game.json lives in the battle-tubes-data repo, checked out next to this one. */
const gameDataFile = fileURLToPath(new URL('../battle-tubes-data/game.json', import.meta.url));

/** In development the app fetches /game.json; serve the local data repo's copy so edits show on reload. */
const localGameData = () => ({
  name: 'local-game-data',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/game.json', (_request, response) => {
      readFile(gameDataFile).then(
        (contents) => {
          response.setHeader('Content-Type', 'application/json');
          response.end(contents);
        },
        () => {
          response.statusCode = 404;
          response.end(`No game data file at ${gameDataFile}.`);
        },
      );
    });
  },
});

// host: true exposes the dev server on your LAN so you can play on a phone.
export default defineConfig({
  base: './',
  plugins: [localGameData()],
  server: { host: true },
  preview: { host: true },
  build: { chunkSizeWarningLimit: 1500 }, // Phaser alone is ~1.2 MB
});
