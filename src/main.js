import { loadGameData } from './gameData.js';
import { preloadSfxFiles } from './audio.js';

async function boot() {
  try {
    await loadGameData();
    await preloadSfxFiles();
  } catch (err) {
    console.error(err);
    const el = document.getElementById('game');
    if (el) {
      el.textContent = `Couldn't load game data.\n${err.message}\n\nDev: check out battle-tubes-data next to this repo.\nLive: check REMOTE_URL in src/gameData.js.`;
      el.style.cssText =
        'color:#fff;white-space:pre-wrap;font:16px/1.4 monospace;padding:24px;box-sizing:border-box';
    }
    return;
  }

  const { startGame } = await import('./startGame.js');
  startGame();
}

boot();
