// Player settings, saved in the browser between sessions.
//   debug: TURN INFO — upcoming-turn banner and boat speed gauge (available everywhere)
//   music / sfx: volume steps off → low → med → high
//   invincible / giant: cheats (see CHEATS); unlocked via passwords

const KEY = 'battle-tubes-settings';

export const VOLUME_LEVELS = ['off', 'low', 'med', 'high'];
export const VOLUME_LABELS = { off: 'OFF', low: 'LOW', med: 'MED', high: 'HIGH' };
// Linear gain multipliers applied in audio.js.
export const VOLUME_GAIN = { off: 0, low: 0.28, med: 0.6, high: 1 };

const DEFAULTS = { debug: false, music: 'med', sfx: 'med', invincible: false, giant: false };

export const settings = load();

function load() {
  try {
    const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
    for (const key of ['music', 'sfx']) {
      if (!VOLUME_LEVELS.includes(saved[key])) saved[key] = DEFAULTS[key];
    }
    return saved;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or storage disabled: settings just last for this session.
  }
}

export function volumeGain(key) {
  return VOLUME_GAIN[settings[key]] ?? VOLUME_GAIN.med;
}

// Steps music or sfx volume by ±1 through VOLUME_LEVELS. Returns the new level.
export function bumpVolume(key, dir) {
  const i = VOLUME_LEVELS.indexOf(settings[key]);
  const next = VOLUME_LEVELS[Math.max(0, Math.min(VOLUME_LEVELS.length - 1, (i < 0 ? 2 : i) + dir))];
  settings[key] = next;
  saveSettings();
  return next;
}
