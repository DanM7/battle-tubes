import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { addStepper } from './labUi.js';
import {
  MUSIC,
  MUSIC_TRACKS,
  playMusic,
  stopMusic,
  setMusicBpm,
  setMusicBpmTarget,
  setMusicSwitchBars,
  musicPlaying,
  currentMusicBpm,
  currentMusicSwitchBars,
  bpmForBoatTier,
} from '../audio.js';

// Bench for background music (MUSIC on the Labs screen, or ?lab=music): pick a track,
// BPM / bars-before-switch, and preview boat-tier tempos (with the real ramp).

const TRACK = { x: 80, y: 150, w: 280, h: 36, gap: 10, fill: 0x1d4e89, chosen: 0x2f7d32 };
const PANEL_X = 420;
const TIER_KEYS = ['menu', 'slow', 'medium', 'fast'];

export class MusicLabScene extends Phaser.Scene {
  constructor() {
    super('MusicLab');
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1d2a).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 110, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 28, 'MUSIC LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 66, 'Groove tracks rotate every N bars · boat tiers ramp BPM', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 90, `menu ${MUSIC.bpm.menu} · slow ${MUSIC.bpm.slow} · med ${MUSIC.bpm.medium} · fast ${MUSIC.bpm.fast} · ramp ${MUSIC.bpmTransition}s`, {
      scale: 2,
      font: 'small',
    }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    this.trackId = musicPlaying() ?? MUSIC.rotate[0] ?? MUSIC_TRACKS[0].id;
    this.bpm = Math.round(currentMusicBpm());
    this.switchBars = currentMusicSwitchBars();
    this.trackButtons = [];

    MUSIC_TRACKS.forEach((track, i) => {
      const y = TRACK.y + i * (TRACK.h + TRACK.gap);
      const rect = this.add
        .rectangle(TRACK.x + TRACK.w / 2, y + TRACK.h / 2, TRACK.w, TRACK.h, TRACK.fill)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      addText(this, TRACK.x + TRACK.w / 2, y + TRACK.h / 2, track.name, { scale: 2 }).setOrigin(0.5);
      rect.on('pointerup', () => {
        this.trackId = track.id;
        if (musicPlaying()) this.startTrack();
        this.paintTracks();
      });
      this.trackButtons.push({ id: track.id, rect });
    });

    const playY = TRACK.y + MUSIC_TRACKS.length * (TRACK.h + TRACK.gap) + 16;
    this.addButton(TRACK.x + 70, playY, 120, 40, 'PLAY', () => this.startTrack());
    this.addButton(TRACK.x + 210, playY, 120, 40, 'STOP', () => {
      stopMusic();
      this.refreshReadout();
    });

    addText(this, PANEL_X, 150, 'PLAYBACK', { scale: 2, color: '#ffdd55' }).setOrigin(0, 0.5);

    this.tempoRefresh = addStepper(this, PANEL_X, 200, 'TEMPO', {
      change: (dir) => {
        this.bpm = Phaser.Math.Clamp(this.bpm + dir * 5, 60, 480);
        setMusicBpm(this.bpm);
        this.refreshReadout();
      },
      format: () => `${Math.round(currentMusicBpm())} BPM`,
      labelWidth: 130,
      valueWidth: 110,
    }).refresh;

    this.barsRefresh = addStepper(this, PANEL_X, 250, 'SWITCH BARS', {
      change: (dir) => {
        this.switchBars = Phaser.Math.Clamp(this.switchBars + dir, 1, 16);
        setMusicSwitchBars(this.switchBars);
        this.refreshReadout();
      },
      format: () => `${this.switchBars}`,
      labelWidth: 130,
      valueWidth: 110,
    }).refresh;

    addText(this, PANEL_X, 310, 'BPM PRESETS', { scale: 2, color: '#ffdd55' }).setOrigin(0, 0.5);
    TIER_KEYS.forEach((key, i) => {
      const bpm = key === 'menu' ? MUSIC.bpm.menu : bpmForBoatTier(key);
      const x = PANEL_X + 55 + (i % 2) * 140;
      const y = 360 + Math.floor(i / 2) * 44;
      this.addButton(x, y, 120, 36, key.toUpperCase(), () => {
        this.bpm = bpm;
        if (!musicPlaying()) this.startTrack();
        else setMusicBpmTarget(bpm);
        this.refreshReadout();
      });
    });

    this.readout = addText(this, PANEL_X, 460, '', { scale: 2 }).setOrigin(0, 0.5);

    this.paintTracks();
    this.refreshReadout();
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.refreshReadout() });
    this.events.once('shutdown', () => stopMusic());
  }

  addButton(x, y, w, h, label, onClick) {
    const rect = this.add.rectangle(x, y, w, h, 0x1d4e89).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
    addText(this, x, y, label, { scale: 2 }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(0x2a6bb8));
    rect.on('pointerout', () => rect.setFillStyle(0x1d4e89));
    rect.on('pointerup', onClick);
    return rect;
  }

  startTrack() {
    const rotates = MUSIC.rotate.includes(this.trackId);
    playMusic(this.trackId, {
      bpm: this.bpm,
      switchBars: this.switchBars,
      rotate: rotates ? MUSIC.rotate : false,
    });
    this.refreshReadout();
  }

  paintTracks() {
    for (const b of this.trackButtons) {
      b.rect.setFillStyle(b.id === this.trackId ? TRACK.chosen : TRACK.fill);
    }
  }

  refreshReadout() {
    this.tempoRefresh?.();
    this.barsRefresh?.();
    const playing = musicPlaying();
    const name = MUSIC_TRACKS.find((t) => t.id === playing)?.name ?? playing;
    const rotates = playing && MUSIC.rotate.includes(playing);
    this.readout.setText(
      playing
        ? `Playing ${name}\n${Math.round(currentMusicBpm())} BPM · every ${currentMusicSwitchBars()} bars${rotates ? ' · rotate' : ' · locked'}`
        : `Stopped · ${this.bpm} BPM · every ${this.switchBars} bars`,
    );
  }
}
