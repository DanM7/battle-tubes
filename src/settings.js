// Player settings, saved in the browser between sessions.
//   debug: show the upcoming-turn banner and the boat speed gauge
//   invincible: human riders take no balance or tube air damage (a cheat; see CHEATS)
const KEY = 'battle-tubes-settings';
const DEFAULTS = { debug: false, invincible: false };

export const settings = load();

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
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
