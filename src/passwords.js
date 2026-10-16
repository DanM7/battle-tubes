// Casual obfuscation for unlock codes and cheats: they sit in the bundle as sealed
// strings, not plaintext, so a quick look in DevTools doesn't spill every password.
// This is not cryptography; anyone who reads this file can reverse it.

const SALT = 'QHOUSE-WAKE-1999';
// Letters only (no vowels in a row that spell words), so sealed strings look like noise.
const GLYPHS = 'BCDFGHJKLMNPQRSTVWXZ23456789';

const codeOf = (ch) => ch.charCodeAt(0);
const at = (n) => GLYPHS[((n % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
const indexOf = (ch) => GLYPHS.indexOf(ch);

// Mix for letter i of a password: 0..25.
const mix = (p, i) => {
  const k = codeOf(SALT[i % SALT.length]);
  return (p + k * 3 + i * 17 + 11) % 26;
};
const unmix = (m, i) => {
  const k = codeOf(SALT[i % SALT.length]);
  return (((m - k * 3 - i * 17 - 11) % 26) + 26) % 26;
};

// Letters only, A–Z. Returns a sealed string: two glyphs per letter, then a two-glyph checksum.
export function seal(plain) {
  const s = plain.toUpperCase().replace(/[^A-Z]/g, '');
  let out = '';
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const p = codeOf(s[i]) - 65;
    const m = mix(p, i);
    // First glyph carries m (0..25); second is a checksum over m and i.
    out += at(m) + at(m * 7 + i * 13 + codeOf(SALT[i % SALT.length]));
    sum += (p + 1) * (i + 3) * 19;
  }
  return out + at(sum) + at(sum * 5 + s.length * 7);
}

// The plaintext letters sealed into `sealed`, or null if it's mangled.
export function open(sealed) {
  if (!sealed || sealed.length < 2 || sealed.length % 2 !== 0) return null;
  const body = sealed.slice(0, -2);
  const check = sealed.slice(-2);
  if (body.length % 2 !== 0) return null;
  let plain = '';
  let sum = 0;
  for (let i = 0; i < body.length; i += 2) {
    const n = i / 2;
    const m = indexOf(body[i]);
    const confirm = indexOf(body[i + 1]);
    if (m < 0 || m > 25 || confirm < 0) return null;
    if (at(m * 7 + n * 13 + codeOf(SALT[n % SALT.length])) !== body[i + 1]) return null;
    const p = unmix(m, n);
    plain += String.fromCharCode(65 + p);
    sum += (p + 1) * (n + 3) * 19;
  }
  if (at(sum) + at(sum * 5 + plain.length * 7) !== check) return null;
  return plain;
}

export const passwordMatches = (entry, sealed) => open(sealed) === entry.toUpperCase().replace(/[^A-Z]/g, '');
