// What height and grip cost a custom rider, and the endurance rating every rider shows.
import { CUSTOM, HEIGHT_BANDS } from './config.js';

export const heightBand = (heightIn) => HEIGHT_BANDS.findIndex((top) => heightIn <= top);

export const enduranceRating = (heightIn) => HEIGHT_BANDS.length - heightBand(heightIn);

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
