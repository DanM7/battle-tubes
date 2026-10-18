import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestData } from './helpers/loadTestData.js';
import { encodeCustomRider, decodeCustomRider } from '../src/customCode.js';
import { newCustomRider } from '../src/customRiders.js';
import { CUSTOM } from '../src/config.js';

beforeAll(() => {
  loadTestData();
});

describe('custom rider share codes', () => {
  it('round-trips a default custom rider', () => {
    const rider = newCustomRider('easy', 0);
    rider.name = 'TEST';
    const code = encodeCustomRider(rider);
    expect(code).toMatch(/^[0-9A-Z]+( [0-9A-Z]+)*$/);
    const decoded = decodeCustomRider(code);
    expect(decoded.name).toBe('TEST');
    expect(decoded.heightIn).toBe(rider.heightIn);
    expect(decoded.grip).toBe(rider.grip);
    expect(decoded.look.gender).toBe(rider.look.gender);
    expect(decoded.look.build).toBe(rider.look.build);
    expect(decoded.look.hairStyle).toBe(rider.look.hairStyle);
  });

  it('rejects empty / garbage codes', () => {
    expect(() => decodeCustomRider('')).toThrow();
    expect(() => decodeCustomRider('!!!!')).toThrow();
  });

  it('keeps height within custom limits after decode', () => {
    const rider = newCustomRider('hard', 1);
    rider.name = 'TALL';
    rider.heightIn = CUSTOM.maxHeightIn;
    const decoded = decodeCustomRider(encodeCustomRider(rider));
    expect(decoded.heightIn).toBeGreaterThanOrEqual(CUSTOM.minHeightIn);
    expect(decoded.heightIn).toBeLessThanOrEqual(CUSTOM.maxHeightIn);
  });
});
