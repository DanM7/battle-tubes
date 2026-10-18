import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestData } from './helpers/loadTestData.js';
import {
  customRiderCount,
  customRider,
  newCustomRider,
  saveCustomRider,
  deleteCustomRider,
  customName,
} from '../src/customRiders.js';
import { CUSTOM } from '../src/config.js';

beforeAll(() => {
  loadTestData();
  // Clear any leftovers from other tests that touched the same module state.
  while (customRiderCount() > 0) deleteCustomRider(null, 0);
});

describe('shared custom riders', () => {
  it('saves once and reads from either year argument', () => {
    const rider = { ...newCustomRider('easy', 0), name: 'Shared' };
    saveCustomRider('easy', 0, rider);
    expect(customRiderCount()).toBe(1);
    expect(customRider('easy', 0).name).toBe('SHARED');
    expect(customRider('hard', 0).name).toBe('SHARED');
    expect(customName(customRider('hard', 0))).toBe('SHARED');
  });

  it('edits from one year show up in the other', () => {
    const rider = customRider('easy', 0);
    saveCustomRider('hard', 0, { ...rider, name: 'Updated', look: { ...rider.look } });
    expect(customRider('easy', 0).name).toBe('UPDATED');
  });

  it('stops at maxRiders', () => {
    while (customRiderCount() > 0) deleteCustomRider(null, 0);
    for (let i = 0; i < CUSTOM.maxRiders; i++) {
      saveCustomRider('easy', i, { ...newCustomRider('easy', i), name: `R${i}` });
    }
    expect(customRiderCount()).toBe(CUSTOM.maxRiders);
    saveCustomRider('hard', CUSTOM.maxRiders, { ...newCustomRider('hard', 0), name: 'Overflow' });
    expect(customRiderCount()).toBe(CUSTOM.maxRiders);
    while (customRiderCount() > 0) deleteCustomRider(null, 0);
  });
});
