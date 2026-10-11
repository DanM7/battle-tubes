// Riders the player made on the rider select screen, saved in the browser.
// Each mode has CUSTOM.slots slots; an empty slot is null. A rider is
// { name, color, trunks, heightIn, grip }.
import { CUSTOM } from './config.js';
import { fitBudget } from './build.js';

const KEY = 'battle-tubes-custom';

const fit = (list) =>
  Array.from({ length: CUSTOM.slots }, (_, i) => (list?.[i] ? fitBudget(list[i]) : null));

const riders = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { easy: fit(saved?.easy), hard: fit(saved?.hard) };
  } catch {
    return { easy: fit(), hard: fit() };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(riders));
  } catch {
    // Storage can be unavailable (private browsing); riders just won't persist.
  }
}

export const customRider = (difficulty, slot) => riders[difficulty][slot];

export const customName = (rider) => rider.name.trim() || CUSTOM.name;

// What a new rider in this slot starts as.
export const newCustomRider = (difficulty, slot) => ({
  name: '',
  color: CUSTOM.shirts[slot % CUSTOM.shirts.length],
  trunks: CUSTOM.trunks[slot % CUSTOM.trunks.length],
  heightIn: CUSTOM.heightIn[difficulty],
  grip: CUSTOM.grip,
});

export function saveCustomRider(difficulty, slot, rider) {
  riders[difficulty][slot] = { ...rider };
  save();
}

export function deleteCustomRider(difficulty, slot) {
  riders[difficulty][slot] = null;
  save();
}
