import { BOAT } from './config.js';
import { volumeGain } from './settings.js';

// Placeholder music and SFX via the Web Audio API until real files land under
// public/assets/audio/. Track lists come from game.json (battle-tubes-data).
// Levels follow settings.music / settings.sfx (OFF/LOW/MED/HIGH).

export const MUSIC_TRACKS = [];
export const SFX = [];
/** Named pools of cue ids (punch / kick) from game.json `audio.sfxPools` — pick one at random. */
export const SFX_POOLS = {};
/** Named layers of cue ids from game.json `audio.sfxLayers` — play all at once. */
export const SFX_LAYERS = {};
/** Playlist defaults from game.json (`musicBpm`, `musicBpmTransition`, `musicSwitchBars`, …). */
export const MUSIC = {
  bpm: { menu: 150, slow: 200, medium: 300, fast: 400 },
  bpmTransition: 2,
  switchBars: 3,
  beatsPerBar: 4,
  rotate: ['river-groove', 'wake-chase', 'dockside'],
};
const MUSIC_BPM_MIN = 60;
const MUSIC_BPM_MAX = 480;
let tempoBoost = 0.35;
const sfxBuffers = new Map(); // cue id → AudioBuffer when a file loaded
const SFX_EXTS = ['ogg', 'mp3', 'wav'];

const clampBpm = (bpm) => Math.max(MUSIC_BPM_MIN, Math.min(MUSIC_BPM_MAX, bpm));
const smoothstep = (t) => t * t * (3 - 2 * t);

export function applyAudio(audio) {
  tempoBoost = audio.tempoBoost ?? 0.35;
  const bpm = audio.musicBpm;
  MUSIC.bpm = {
    menu: bpm?.menu ?? 150,
    slow: bpm?.slow ?? 200,
    medium: bpm?.medium ?? 300,
    fast: bpm?.fast ?? 400,
  };
  MUSIC.bpmTransition = audio.musicBpmTransition ?? 2;
  MUSIC.switchBars = audio.musicSwitchBars ?? 3;
  MUSIC.beatsPerBar = audio.musicBeatsPerBar ?? 4;
  MUSIC.rotate = [...(audio.musicRotate ?? ['river-groove', 'wake-chase', 'dockside'])];
  MUSIC_TRACKS.length = 0;
  MUSIC_TRACKS.push(
    ...(audio.musicTracks ?? []).map((t) => ({
      ...t,
      pattern: [...t.pattern],
      style: t.style ?? 'groove',
      beat: t.beat ?? 0.22,
    })),
  );
  SFX.length = 0;
  SFX.push(...(audio.sfx ?? []).map((s) => ({ lab: 'unused', ...s })));
  for (const key of Object.keys(SFX_POOLS)) delete SFX_POOLS[key];
  Object.assign(SFX_POOLS, structuredClone(audio.sfxPools ?? {}));
  for (const key of Object.keys(SFX_LAYERS)) delete SFX_LAYERS[key];
  Object.assign(SFX_LAYERS, structuredClone(audio.sfxLayers ?? {}));
  // Knock-in always layers these two; keep a fallback if game.json omits sfxLayers.
  if (!SFX_LAYERS.splash?.length) SFX_LAYERS.splash = ['rider-splash', 'sample-splash-08'];
  sfxBuffers.clear();
}

// Impact / splash packs often pad quiet lead-in; drop it so the hit lands on the frame.
const TRIM_LEAD_RE = /impact|punch|hit|kick-hit|splash/i;
const TRIM_THRESHOLD = 0.025; // |sample| above this counts as the start of the hit
const TRIM_PREROLL = 0.003; // keep a few ms so the transient isn't sliced off

/** Seconds of leading near-silence before the first loud sample. */
function leadingSilenceSeconds(buffer, threshold = TRIM_THRESHOLD) {
  const channels = buffer.numberOfChannels;
  const n = buffer.length;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < channels; c++) {
      if (Math.abs(buffer.getChannelData(c)[i]) >= threshold) return i / buffer.sampleRate;
    }
  }
  return 0;
}

/** New buffer starting at the hit (plus a tiny preroll). Returns the original if already tight. */
function trimLeadingSilence(ac, buffer) {
  const lead = leadingSilenceSeconds(buffer);
  const start = Math.max(0, Math.floor((lead - TRIM_PREROLL) * buffer.sampleRate));
  if (start <= 0) return buffer;
  const len = buffer.length - start;
  if (len <= 0) return buffer;
  const out = ac.createBuffer(buffer.numberOfChannels, len, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.copyToChannel(buffer.getChannelData(c).subarray(start), c);
  }
  return out;
}

/** Tries assets/audio/sfx/<file|id>.{ogg,mp3,wav} for each cue; falls back to synth if missing. */
export async function preloadSfxFiles() {
  const ac = audioCtx();
  await Promise.all(
    SFX.map(async (cue) => {
      const base = cue.file ?? cue.id;
      for (const ext of SFX_EXTS) {
        try {
          const res = await fetch(`assets/audio/sfx/${base}.${ext}`);
          if (!res.ok) continue;
          let buf = await ac.decodeAudioData(await res.arrayBuffer());
          if (TRIM_LEAD_RE.test(cue.id) || TRIM_LEAD_RE.test(base)) buf = trimLeadingSilence(ac, buf);
          sfxBuffers.set(cue.id, buf);
          return;
        } catch {
          /* try next extension */
        }
      }
    }),
  );
}

function playBuffer(buffer, level = 1, rate = 1) {
  if (level <= 0) return;
  const ac = audioCtx();
  const src = ac.createBufferSource();
  const g = ac.createGain();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  g.gain.value = level;
  src.connect(g);
  g.connect(ac.destination);
  trackSfx(src);
  src.start();
}

/** BPM for a boat tier key (`slow` / `medium` / `fast`). */
export function bpmForBoatTier(tier) {
  return MUSIC.bpm[tier] ?? MUSIC.bpm.slow;
}

/** @deprecated Old 0.5–2× multiplier; prefer bpmForBoatTier. */
export function tempoForBoatSpeed(speed) {
  const slow = BOAT.speeds.slow.speed;
  const fast = BOAT.speeds.fast.speed;
  return 1 + tempoBoost * Math.max(0, Math.min(1, (speed - slow) / (fast - slow)));
}

let ctx = null;
// { trackId, bpm, switchBars, beatsPerBar, rotate, gain, step, phraseStep }
let music = null;
let musicTimer = null; // sole sequencer timeout (never duplicated)
let musicGen = 0; // bumped on stop so stale timeouts cannot play notes
const activeSfx = new Set(); // one-shot SFX voices
const activeMusic = new Set(); // playlist voices (cut on stop / track switch)

function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function trackSfx(node) {
  activeSfx.add(node);
  node.onended = () => activeSfx.delete(node);
}

function trackMusic(node) {
  activeMusic.add(node);
  node.onended = () => activeMusic.delete(node);
}

function stopMusicVoices() {
  for (const node of activeMusic) {
    try {
      node.stop();
    } catch {
      /* already ended */
    }
  }
  activeMusic.clear();
}

function tone(ac, { freq, type = 'square', when, dur, gain = 0.08, slideTo, level = 1, dest, music: isMusic = false }) {
  const amp = gain * level;
  if (amp <= 0) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(amp, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(dest ?? ac.destination);
  if (isMusic) trackMusic(osc);
  else trackSfx(osc);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function noiseBurst(ac, { when, dur, gain = 0.12, filterHz = 1200, level = 1, dest, music: isMusic = false }) {
  const amp = gain * level;
  if (amp <= 0) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, n, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterHz;
  const g = ac.createGain();
  g.gain.setValueAtTime(amp, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest ?? ac.destination);
  if (isMusic) trackMusic(src);
  else trackSfx(src);
  src.start(when);
  src.stop(when + dur);
}

function playSfxCue(ac, kind, when = ac.currentTime) {
  const level = volumeGain('sfx');
  if (level <= 0) return;
  switch (kind) {
    case 'rise':
      tone(ac, { freq: 220, slideTo: 660, when, dur: 0.35, type: 'sawtooth', gain: 0.07, level });
      break;
    case 'fall':
      tone(ac, { freq: 440, slideTo: 110, when, dur: 0.4, type: 'sawtooth', gain: 0.07, level });
      break;
    case 'splash':
      noiseBurst(ac, { when, dur: 0.35, gain: 0.18, filterHz: 900, level });
      tone(ac, { freq: 180, slideTo: 60, when, dur: 0.25, type: 'sine', gain: 0.05, level });
      break;
    case 'thud':
      tone(ac, { freq: 90, slideTo: 40, when, dur: 0.18, type: 'triangle', gain: 0.14, level });
      noiseBurst(ac, { when, dur: 0.08, gain: 0.08, filterHz: 400, level });
      break;
    case 'hit':
      tone(ac, { freq: 320, slideTo: 140, when, dur: 0.12, type: 'square', gain: 0.1, level });
      break;
    case 'kick':
      tone(ac, { freq: 200, slideTo: 80, when, dur: 0.16, type: 'square', gain: 0.11, level });
      noiseBurst(ac, { when, dur: 0.1, gain: 0.06, filterHz: 600, level });
      break;
    case 'chime':
      tone(ac, { freq: 660, when, dur: 0.2, type: 'sine', gain: 0.08, level });
      tone(ac, { freq: 990, when: when + 0.06, dur: 0.22, type: 'sine', gain: 0.06, level });
      break;
    case 'whoosh':
      noiseBurst(ac, { when, dur: 0.28, gain: 0.1, filterHz: 2000, level });
      tone(ac, { freq: 400, slideTo: 900, when, dur: 0.22, type: 'sine', gain: 0.04, level });
      break;
    case 'blip':
    default:
      tone(ac, { freq: 520, when, dur: 0.08, type: 'square', gain: 0.06, level });
      break;
  }
}

/** Cue loudness from game.json `volume` (0–10). Falls back to legacy `gain` (0–1+). */
function cueGain(cue) {
  if (cue.volume != null) return Math.max(0, Math.min(10, Number(cue.volume))) / 10;
  if (cue.gain != null) return Math.max(0, Number(cue.gain));
  return 1;
}

export function playSfx(id) {
  const cue = SFX.find((s) => s.id === id);
  if (!cue) return;
  const level = volumeGain('sfx') * cueGain(cue);
  if (level <= 0) return;
  const buf = sfxBuffers.get(id);
  if (buf) {
    playBuffer(buf, level, cue.rate ?? 1);
    return;
  }
  playSfxCue(audioCtx(), cue.kind);
}

/** Plays a random cue from `SFX_POOLS[name]` (or from an explicit id list). */
export function playSfxPool(nameOrIds) {
  const ids = Array.isArray(nameOrIds) ? nameOrIds : SFX_POOLS[nameOrIds];
  if (!ids?.length) return;
  playSfx(ids[Math.floor(Math.random() * ids.length)]);
}

/** Plays every cue in `SFX_LAYERS[name]` together (or an explicit id list). */
export function playSfxLayer(nameOrIds) {
  const ids = Array.isArray(nameOrIds) ? nameOrIds : SFX_LAYERS[nameOrIds];
  if (!ids?.length) return;
  for (const id of ids) playSfx(id);
}

export function sfxHasFile(id) {
  return sfxBuffers.has(id);
}

/** Stops every SFX source currently playing (file or synth). */
export function stopSfx() {
  for (const node of activeSfx) {
    try {
      node.stop();
    } catch {
      /* already ended */
    }
  }
  activeSfx.clear();
}

export function stopMusic() {
  musicGen += 1;
  clearTimeout(musicTimer);
  musicTimer = null;
  stopMusicVoices();
  if (music?.gain) {
    try {
      const ac = audioCtx();
      music.gain.gain.cancelScheduledValues(ac.currentTime);
      music.gain.gain.setValueAtTime(0.0001, ac.currentTime);
    } catch {
      /* already closed */
    }
  }
  music = null;
}

/** Live BPM, including an in-progress ramp toward a new target. */
function effectiveBpm() {
  if (!music) return MUSIC.bpm.menu;
  const ramp = music.bpmRamp;
  if (!ramp) return music.bpm;
  const t = (audioCtx().currentTime - ramp.start) / ramp.duration;
  if (t >= 1) {
    music.bpm = ramp.to;
    music.bpmRamp = null;
    return music.bpm;
  }
  return ramp.from + (ramp.to - ramp.from) * smoothstep(Math.max(0, t));
}

function beatSeconds() {
  const bpm = effectiveBpm();
  if (!Number.isFinite(bpm) || bpm < 40) return 60 / 150;
  return 60 / bpm;
}

/** After N bars on a rotate-list track, jump to a different one at random (cuts ringing notes). */
function maybeRotateTrack() {
  if (!music?.rotate?.length) return;
  if (!music.rotate.includes(music.trackId)) return;
  const every = Math.max(1, music.switchBars) * Math.max(1, music.beatsPerBar);
  if (music.step === 0 || music.step % every !== 0) return;
  const choices = music.rotate.filter((id) => id !== music.trackId);
  if (!choices.length) return;
  stopMusicVoices();
  music.trackId = choices[Math.floor(Math.random() * choices.length)];
  music.phraseStep = 0;
}

function scheduleMusicStep(gen) {
  if (gen !== musicGen || !music) return;
  const ac = audioCtx();
  // Wall-clock timeouts keep firing while the context is suspended, but currentTime
  // is frozen — queuing notes then would dump a chord of stacked steps on first click.
  if (ac.state !== 'running') {
    clearTimeout(musicTimer);
    musicTimer = setTimeout(() => scheduleMusicStep(gen), 100);
    return;
  }
  const track = MUSIC_TRACKS.find((t) => t.id === music.trackId);
  if (!track) return;
  const level = volumeGain('music');
  const note = track.pattern[music.phraseStep % track.pattern.length];
  const freq = track.baseHz * 2 ** (note / 12);
  const when = ac.currentTime;
  const beat = beatSeconds();
  const bus = music.gain;
  if (level > 0) {
    if (track.style === 'fierce') playFierceStep(ac, { freq, when, beat, level, step: music.phraseStep, bus });
    else playGrooveStep(ac, { freq, when, beat, level, step: music.phraseStep, bus });
  }
  music.step += 1;
  music.phraseStep += 1;
  maybeRotateTrack();
  clearTimeout(musicTimer);
  musicTimer = setTimeout(() => scheduleMusicStep(gen), beatSeconds() * 1000);
}

function playGrooveStep(ac, { freq, when, beat, level, step, bus }) {
  const m = { dest: bus, music: true };
  // One lead + light bass — an octave double read as a second melody on top of rotates.
  tone(ac, { freq, when, dur: beat * 0.7, type: 'square', gain: 0.05, level, ...m });
  if (step % 2 === 0) tone(ac, { freq: 55, slideTo: 40, when, dur: beat * 0.35, type: 'sine', gain: 0.06, level, ...m });
}

// Angry / intimidating: darker saw leads, tritone grit, pounding kick, scrapes on the downbeat.
function playFierceStep(ac, { freq, when, beat, level, step, bus }) {
  const m = { dest: bus, music: true };
  tone(ac, { freq, when, dur: beat * 0.5, type: 'sawtooth', gain: 0.06, level, ...m });
  // Slightly sharp / dissonant stack for tension.
  tone(ac, { freq: freq * 1.498, when, dur: beat * 0.35, type: 'sawtooth', gain: 0.028, level, ...m });
  tone(ac, { freq: freq / 2, when, dur: beat * 0.55, type: 'square', gain: 0.04, level, ...m });
  // Hard kick every step.
  tone(ac, { freq: 70, slideTo: 32, when, dur: beat * 0.32, type: 'square', gain: 0.11, level, ...m });
  if (step % 4 === 0) noiseBurst(ac, { when, dur: beat * 0.22, gain: 0.09, filterHz: 700, level, ...m });
  if (step % 8 === 4) tone(ac, { freq: freq * 0.707, when, dur: beat * 0.7, type: 'sawtooth', gain: 0.035, level, ...m }); // flat 5 growl
}

/**
 * Start a track. Groove tracks in `MUSIC.rotate` swap randomly every `switchBars` bars.
 * Pass `rotate: false` (or an empty list) to lock on one track (e.g. FULL THROTTLE).
 */
export function playMusic(trackId, { bpm = MUSIC.bpm.menu, switchBars = MUSIC.switchBars, rotate } = {}) {
  const track = MUSIC_TRACKS.find((t) => t.id === trackId);
  if (!track) return;
  const ac = audioCtx();
  stopMusic();
  const gain = ac.createGain();
  gain.gain.value = 1;
  gain.connect(ac.destination);
  const list = rotate === false ? [] : [...(rotate ?? MUSIC.rotate)];
  const gen = musicGen;
  music = {
    trackId,
    bpm: clampBpm(typeof bpm === 'number' ? bpm : MUSIC.bpm.menu),
    bpmRamp: null,
    switchBars: Math.max(1, Math.round(switchBars)),
    beatsPerBar: MUSIC.beatsPerBar,
    rotate: list,
    gain,
    step: 0,
    phraseStep: 0,
  };
  // Resume may be async; sequencer no-ops until state === 'running'.
  if (ac.state === 'suspended') ac.resume().finally(() => scheduleMusicStep(gen));
  else scheduleMusicStep(gen);
}

/** Snap BPM immediately (cancels any ramp). */
export function setMusicBpm(bpm) {
  if (!music) return;
  music.bpm = clampBpm(bpm);
  music.bpmRamp = null;
}

/**
 * Ease BPM toward `bpm` over `seconds` (default `MUSIC.bpmTransition`).
 * Gives boat speed-ups an audible acceleration instead of a hard jump.
 */
export function setMusicBpmTarget(bpm, seconds = MUSIC.bpmTransition) {
  if (!music) return;
  const to = clampBpm(bpm);
  const from = effectiveBpm();
  if (seconds <= 0 || Math.abs(from - to) < 0.5) {
    music.bpm = to;
    music.bpmRamp = null;
    return;
  }
  music.bpmRamp = { from, to, start: audioCtx().currentTime, duration: seconds };
  music.bpm = to;
}

export function setMusicSwitchBars(bars) {
  if (!music) return;
  music.switchBars = Math.max(1, Math.round(bars));
}

/** @deprecated Prefer setMusicBpm / setMusicBpmTarget. */
export function setMusicTempo(tempo) {
  setMusicBpm(MUSIC.bpm.medium * Math.max(0.5, Math.min(2, tempo)));
}

export function musicPlaying() {
  return music?.trackId ?? null;
}

export function currentMusicBpm() {
  return effectiveBpm();
}

export function currentMusicSwitchBars() {
  return music?.switchBars ?? MUSIC.switchBars;
}

/** Legacy multiplier relative to medium boat BPM. */
export function currentMusicTempo() {
  return currentMusicBpm() / MUSIC.bpm.medium;
}

function defaultRotateTrackId() {
  return MUSIC.rotate.find((id) => MUSIC_TRACKS.some((t) => t.id === id)) ?? MUSIC_TRACKS[0]?.id;
}

/** Menus: start the rotate playlist at menu BPM, or ease back to it if already playing. */
export function ensureMenuMusic() {
  const id = defaultRotateTrackId();
  if (!id) return;
  if (!music) {
    playMusic(id, { bpm: MUSIC.bpm.menu, switchBars: MUSIC.switchBars });
    return;
  }
  if (!music.rotate?.length) {
    playMusic(id, { bpm: MUSIC.bpm.menu, switchBars: MUSIC.switchBars });
    return;
  }
  setMusicBpmTarget(MUSIC.bpm.menu);
}

/** Battle: playlist at the given boat tier's BPM (defaults to slow). */
export function ensureBattleMusic(tier = 'slow') {
  const id = defaultRotateTrackId();
  if (!id) return;
  const bpm = bpmForBoatTier(tier);
  if (!music || !music.rotate?.length) {
    playMusic(id, { bpm, switchBars: MUSIC.switchBars });
    return;
  }
  setMusicBpmTarget(bpm);
}

/** When the boat changes tier, ease music BPM over `MUSIC.bpmTransition` seconds. */
export function syncMusicToBoatTier(tier) {
  if (!music) {
    ensureBattleMusic(tier);
    return;
  }
  setMusicBpmTarget(bpmForBoatTier(tier));
}
