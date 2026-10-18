// Riders the player made on the rider select screen, saved in the browser: one shared
// list for both years (1999 / 2010), up to CUSTOM.maxRiders. A rider is
// { name, color, heightIn, grip, look }, where `look` is how their picture is drawn:
// { skin, hair, trunks, skinShading, hairShading, trunksShading } as riderTexture() in
// riderColors.js takes them, plus `gender` (a GENDERS entry in riderLooks.js), `build`
// (one of genderBuilds()) and `hairStyle` (one of that gender's HAIR_STYLES).
//
// API still takes `difficulty` where a new rider's default height depends on the year
// you're creating in; the saved list itself is shared across modes.
import { CUSTOM } from './config.js';
import { fitBudget } from './build.js';
import { DAN_COLORS, artColors } from './riderColors.js';
import { GENDERS, HAIR_STYLES } from './riderLooks.js';

const KEY = 'battle-tubes-custom';

const newLook = (index) => ({
  ...DAN_COLORS,
  trunks: CUSTOM.trunks[index % CUSTOM.trunks.length],
  gender: GENDERS[0],
  build: 'normal',
  hairStyle: HAIR_STYLES[GENDERS[0]][0],
});

// Saves from before riders had a look only had a match's trunks color: they get Dan's
// look in those trunks. Older looks get what's been added since as Dan has it.
function withLook({ trunks, name = '', ...rider }) {
  return {
    ...rider,
    name: String(name).toUpperCase(),
    look: { ...newLook(0), ...(rider.look ?? { trunks: artColors({ trunks }).trunks }) },
  };
}

// Saves from before the list could grow have empty (null) slots; those are dropped.
const fit = (list) => (Array.isArray(list) ? list.filter(Boolean).slice(0, CUSTOM.maxRiders).map((r) => fitBudget(withLook(r))) : []);

// Older saves kept separate easy/hard lists; merge them (easy first) and drop exact dupes.
function mergeLists(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const r of fit(list)) {
      const key = JSON.stringify(r);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= CUSTOM.maxRiders) return out;
    }
  }
  return out;
}

const riders = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved?.all)) return fit(saved.all);
    // Pre-shared format: { easy, hard } → one list for both years.
    const merged = mergeLists(saved?.easy, saved?.hard);
    try {
      localStorage.setItem(KEY, JSON.stringify({ all: merged }));
    } catch {
      // Private browsing etc.; in-memory merge still works this session.
    }
    return merged;
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ all: riders }));
  } catch {
    // Storage can be unavailable (private browsing); riders just won't persist.
  }
}

export const customRiderCount = () => riders.length;

// The rider at `index`, or null past the end.
export const customRider = (_difficulty, index) => riders[index] ?? null;

export const customName = (rider) => (rider.name.trim() || CUSTOM.name).toUpperCase();

// What the `index`th rider starts as. Default height follows the year you're creating in.
export const newCustomRider = (difficulty, index) => ({
  name: '',
  color: CUSTOM.shirts[index % CUSTOM.shirts.length],
  heightIn: CUSTOM.heightIn[difficulty],
  grip: CUSTOM.grip,
  look: newLook(index),
});

// Saving one past the end adds a rider. Shared across both years.
export function saveCustomRider(_difficulty, index, rider) {
  if (index > riders.length || index >= CUSTOM.maxRiders) return;
  riders[index] = { ...rider, name: String(rider.name ?? '').toUpperCase(), look: { ...rider.look } };
  save();
}

export function deleteCustomRider(_difficulty, index) {
  riders.splice(index, 1);
  save();
}
