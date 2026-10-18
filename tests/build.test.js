import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestData } from './helpers/loadTestData.js';
import { CUSTOM, MAX_GRIP } from '../src/config.js';
import { buildCost, pointsLeft, fitBudget, enduranceRating, heightBand } from '../src/build.js';

beforeAll(() => {
  loadTestData();
});

describe('build points', () => {
  it('charges height band + grip', () => {
    const rider = { heightIn: CUSTOM.heightIn.easy, grip: CUSTOM.grip };
    expect(heightBand(rider.heightIn)).toBeGreaterThanOrEqual(0);
    expect(buildCost(rider)).toBe(heightBand(rider.heightIn) + rider.grip - 1);
    expect(pointsLeft(rider)).toBe(CUSTOM.buildPoints - buildCost(rider));
  });

  it('fitBudget lowers grip/height until under budget', () => {
    const over = fitBudget({ heightIn: CUSTOM.maxHeightIn, grip: MAX_GRIP });
    expect(pointsLeft(over)).toBeGreaterThanOrEqual(0);
    expect(over.grip).toBeGreaterThanOrEqual(1);
    expect(over.heightIn).toBeGreaterThanOrEqual(CUSTOM.minHeightIn);
  });

  it('enduranceRating clamps bonus into 0…MAX_GRIP', () => {
    const mid = CUSTOM.heightIn.hard;
    expect(enduranceRating(mid, 0)).toBeGreaterThanOrEqual(0);
    expect(enduranceRating(mid, 0)).toBeLessThanOrEqual(MAX_GRIP);
    expect(enduranceRating(mid, 50)).toBe(MAX_GRIP);
    expect(enduranceRating(mid, -50)).toBe(0);
  });
});
