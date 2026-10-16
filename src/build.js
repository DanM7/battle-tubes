// What height and grip cost a custom rider, and the endurance rating every rider shows.
import { CUSTOM, HEIGHT_BANDS, MAX_GRIP } from './config.js';

export const heightBand = (heightIn) => HEIGHT_BANDS.findIndex((top) => heightIn <= top);

// Base rating from height bands, plus an optional per-rider `enduranceBonus` from game.json
// (intended −5…+5). The result is clamped to 0…MAX_GRIP so typos like +50 still show 5.
export const enduranceRating = (heightIn, bonus = 0) => {
  const base = HEIGHT_BANDS.length - heightBand(heightIn);
  const n = Number(bonus);
  const extra = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(MAX_GRIP, Math.round(base + extra)));
};

export const buildCost = ({ heightIn, grip }) => heightBand(heightIn) + grip - 1;

export const pointsLeft = (rider) => CUSTOM.buildPoints - buildCost(rider);

// Lowers grip, then height, until the rider fits the budget (for riders saved before it
// existed, or after buildPoints is lowered).
export function fitBudget(rider) {
  const fitted = { ...rider };
  while (pointsLeft(fitted) < 0 && fitted.grip > 1) fitted.grip--;
  while (pointsLeft(fitted) < 0 && fitted.heightIn > CUSTOM.minHeightIn) fitted.heightIn--;
  return fitted;
}
