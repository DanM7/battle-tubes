// Share codes for custom riders: every choice packed into bits, then base-36 (0-9 A-Z),
// grouped like "7G9B MWA6 A3ET …". Import in the CHAR. IMPORT lab.

import { CUSTOM, MAX_GRIP } from './config.js';
import { fitBudget } from './build.js';
import { GENDERS, HAIR_STYLES, genderBuilds } from './riderLooks.js';
import { DAN_COLORS } from './riderColors.js';

const VERSION = 1;
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NAME_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // index 0 = space
const SHADING = { min: 0.3, max: 2, step: 0.1 };
const GROUP = 4;

const shadingSteps = () => Math.round((SHADING.max - SHADING.min) / SHADING.step) + 1; // 18

function shadingIndex(value) {
  const i = Math.round((Number(value) - SHADING.min) / SHADING.step);
  return Math.max(0, Math.min(shadingSteps() - 1, i));
}

function shadingFromIndex(i) {
  return Math.round((SHADING.min + i * SHADING.step) * 10) / 10;
}

function nameCharIndex(ch) {
  const i = NAME_CHARS.indexOf(ch.toUpperCase());
  return i < 0 ? 0 : i;
}

class BitWriter {
  constructor() {
    this.n = 0n;
    this.width = 0;
  }

  write(value, bits) {
    const mask = (1n << BigInt(bits)) - 1n;
    this.n = (this.n << BigInt(bits)) | (BigInt(value) & mask);
    this.width += bits;
  }

  writeRgb(color) {
    const c = (Number(color) >>> 0) & 0xffffff;
    this.write(c, 24);
  }
}

class BitReader {
  constructor(n, width) {
    this.n = n;
    this.pos = width;
  }

  read(bits) {
    this.pos -= bits;
    if (this.pos < 0) throw new Error('Code is truncated.');
    const mask = (1n << BigInt(bits)) - 1n;
    return Number((this.n >> BigInt(this.pos)) & mask);
  }

  readRgb() {
    return this.read(24);
  }
}

function toBase36(n, bitWidth) {
  const chars = Math.max(1, Math.ceil(bitWidth / Math.log2(36)));
  let x = n;
  let out = '';
  for (let i = 0; i < chars; i++) {
    out = BASE36[Number(x % 36n)] + out;
    x /= 36n;
  }
  return out;
}

function fromBase36(str) {
  let n = 0n;
  for (const ch of str) {
    const i = BASE36.indexOf(ch);
    if (i < 0) throw new Error(`Bad character "${ch}" in code.`);
    n = n * 36n + BigInt(i);
  }
  return n;
}

function groupCode(raw) {
  const parts = [];
  for (let i = 0; i < raw.length; i += GROUP) parts.push(raw.slice(i, i + GROUP));
  return parts.join(' ');
}

function checksum(n, width) {
  // Fold bits into 6 bits so typos usually fail to decode cleanly.
  let x = n;
  let sum = 0n;
  while (width > 0) {
    const take = Math.min(6, width);
    sum ^= x & ((1n << BigInt(take)) - 1n);
    x >>= BigInt(take);
    width -= take;
  }
  return Number(sum & 63n);
}

/** Pack a custom rider into a spaced base-36 share code. */
export function encodeCustomRider(rider) {
  const look = { ...DAN_COLORS, ...rider.look };
  const gender = GENDERS.includes(look.gender) ? look.gender : GENDERS[0];
  const builds = genderBuilds(gender);
  const styles = HAIR_STYLES[gender] ?? HAIR_STYLES.boy;
  const build = builds.includes(look.build) ? look.build : builds[0];
  const hairStyle = styles.includes(look.hairStyle) ? look.hairStyle : styles[0];
  const heightIn = Math.max(CUSTOM.minHeightIn, Math.min(CUSTOM.maxHeightIn, Math.round(rider.heightIn)));
  const grip = Math.max(1, Math.min(MAX_GRIP, Math.round(rider.grip)));
  const name = String(rider.name ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .slice(0, CUSTOM.nameMaxLength);

  const w = new BitWriter();
  w.write(VERSION, 4);
  w.write(GENDERS.indexOf(gender), 1);
  w.write(builds.indexOf(build), 3);
  w.write(styles.indexOf(hairStyle), 3);
  w.write(heightIn - CUSTOM.minHeightIn, 5);
  w.write(grip, 3);
  w.writeRgb(rider.color ?? CUSTOM.shirts[0]);
  w.writeRgb(look.skin);
  w.writeRgb(look.hair);
  w.writeRgb(look.trunks);
  w.write(shadingIndex(look.skinShading), 5);
  w.write(shadingIndex(look.hairShading), 5);
  w.write(shadingIndex(look.trunksShading), 5);
  w.write(name.length, 4);
  for (let i = 0; i < CUSTOM.nameMaxLength; i++) w.write(i < name.length ? nameCharIndex(name[i]) : 0, 6);

  const payloadWidth = w.width;
  w.write(checksum(w.n, payloadWidth), 6);
  return groupCode(toBase36(w.n, w.width));
}

/** Decode a share code into a custom rider object, or throw with a short message. */
export function decodeCustomRider(code) {
  const raw = String(code ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
  if (!raw) throw new Error('Enter a share code.');

  const n = fromBase36(raw);
  // Reconstruct width from the fixed schema (+ checksum).
  const nameSlots = CUSTOM.nameMaxLength;
  const payloadWidth = 4 + 1 + 3 + 3 + 5 + 3 + 24 * 4 + 5 * 3 + 4 + nameSlots * 6;
  const totalWidth = payloadWidth + 6;
  // Allow shorter base36 if leading zeros were dropped: pad by reading with known width.
  const r = new BitReader(n, totalWidth);

  const version = r.read(4);
  if (version !== VERSION) throw new Error(`Unsupported code version (${version}).`);

  const gender = GENDERS[r.read(1)] ?? GENDERS[0];
  const builds = genderBuilds(gender);
  const styles = HAIR_STYLES[gender] ?? HAIR_STYLES.boy;
  const build = builds[Math.min(r.read(3), builds.length - 1)] ?? builds[0];
  const hairStyle = styles[Math.min(r.read(3), styles.length - 1)] ?? styles[0];
  const heightIn = CUSTOM.minHeightIn + r.read(5);
  const grip = Math.max(1, Math.min(MAX_GRIP, r.read(3) || 1));
  const color = r.readRgb();
  const skin = r.readRgb();
  const hair = r.readRgb();
  const trunks = r.readRgb();
  const skinShading = shadingFromIndex(r.read(5));
  const hairShading = shadingFromIndex(r.read(5));
  const trunksShading = shadingFromIndex(r.read(5));
  const nameLen = Math.min(CUSTOM.nameMaxLength, r.read(4));
  let name = '';
  for (let i = 0; i < nameSlots; i++) {
    const ch = NAME_CHARS[r.read(6)] ?? ' ';
    if (i < nameLen) name += ch;
  }
  name = name.trimEnd();

  const expect = checksum(n >> 6n, payloadWidth);
  const got = r.read(6);
  if (got !== expect) throw new Error('Code checksum failed — check for typos.');

  return fitBudget({
    name,
    color,
    heightIn: Math.max(CUSTOM.minHeightIn, Math.min(CUSTOM.maxHeightIn, heightIn)),
    grip,
    look: {
      ...DAN_COLORS,
      skin,
      hair,
      trunks,
      skinShading,
      hairShading,
      trunksShading,
      gender,
      build,
      hairStyle,
    },
  });
}

export const formatCustomCode = groupCode;
