// Riders the player made on the rider select screen, saved in the browser: a list per mode,
// up to CUSTOM.maxRiders. A rider is { name, color, trunks, heightIn, grip }.
import { CUSTOM } from './config.js';
import { fitBudget } from './build.js';

const KEY = 'battle-tubes-custom';

// Saves from before the list could grow have empty (null) slots; those are dropped.
const fit = (list) => (Array.isArray(list) ? list.filter(Boolean).slice(0, CUSTOM.maxRiders).map(fitBudget) : []);

const riders = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { easy: fit(saved?.easy), hard: fit(saved?.hard) };
  } catch {
    return { easy: [], hard: [] };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(riders));
  } catch {
    // Storage can be unavailable (private browsing); riders just won't persist.
  }
}

export const customRiderCount = (difficulty) => riders[difficulty].length;

// The rider at `index`, or null past the end.
export const customRider = (difficulty, index) => riders[difficulty][index] ?? null;

export const customName = (rider) => rider.name.trim() || CUSTOM.name;

// What the `index`th rider starts as.
export const newCustomRider = (difficulty, index) => ({
  name: '',
  color: CUSTOM.shirts[index % CUSTOM.shirts.length],
  trunks: CUSTOM.trunks[index % CUSTOM.trunks.length],
  heightIn: CUSTOM.heightIn[difficulty],
  grip: CUSTOM.grip,
});

// Saving one past the end adds a rider.
export function saveCustomRider(difficulty, index, rider) {
  const list = riders[difficulty];
  if (index > list.length || index >= CUSTOM.maxRiders) return;
  list[index] = { ...rider };
  save();
}

export function deleteCustomRider(difficulty, index) {
  riders[difficulty].splice(index, 1);
  save();
}
