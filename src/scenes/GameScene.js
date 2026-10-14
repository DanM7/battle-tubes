import Phaser from 'phaser';
import { WIDTH, VIEW, RIVER, RIDER_Z, ROPE_LENGTH, MATCH, CPU_SKILL_BY_RUNG, BOAT, DIFFICULTIES } from '../config.js';
import { River } from '../river.js';
import { Boat } from '../boat.js';
import { Rider, collideRiders } from '../rider.js';
import { resolveAttack } from '../combat.js';
import { CpuController } from '../ai.js';
import { HumanController, KEYMAPS } from '../input.js';
import { TouchControls } from '../touch.js';
import { Hud } from '../hud.js';
import { Pickups } from '../pickups.js';
import { PauseMenu } from '../pauseMenu.js';
import { SpeechBubble } from '../speechBubble.js';
import { nextTaunt } from '../taunts.js';
import { newCampaign, afterMatch, rivalProfile, playerRiderOptions } from '../campaign.js';
import { recordWin } from '../progress.js';
import { settings } from '../settings.js';
import { drawBoat, drawPickup, drawRider, drawRope, drawWake, wakeSurfaceHeight } from '../draw.js';
import { addText } from '../pixelFont.js';

const NEUTRAL = { left: false, right: false, duck: false, high: false, mid: false, low: false };
const NO_ATTACKS = { high: false, mid: false, low: false };
const GIANT_SIZE = 2; // how many times their height the giant cheat makes you

// [text, color, camera shake intensity]
const RESULT_FEEDBACK = {
  high: ['POW!', '#ff9f43', 0.006],
  mid: ['WHACK!', '#ffe14d', 0.004],
  low: ['THUNK!', '#4fd1ff', 0.004],
  looseGrip: ['LOOSE GRIP! x2', '#ff6b00', 0.008],
  duck: ['DUCKED!', '#7fffd4', 0],
  dodge: ['DODGE!', '#7fffd4', 0],
};

const KNOCKOFF_TEXT = {
  popped: 'TUBE POPPED!',
  beached: 'BEACHED!',
  slammed: 'SLAMMED OFF!',
  kicked: 'SPLASH!',
  stomped: 'FLATTENED!',
};

const BUMP_FEEDBACK_SPEED = 250;
const BIG_AIR_LAUNCH = 650;
const STATUS_TEXT_LIFT = 34;

// Round-start taunts, from CPU opponents only: seconds into the countdown when they
// speak, and how long the bubble takes to fade once the fight starts.
const TAUNT_AT = 0.5;
const TAUNT_FADE = 0.6;
const TAUNT_HEAD_GAP = 6;

export class GameScene extends Phaser.Scene {
  constructor(key = 'Game') {
    super(key);
  }

  init(data) {
    this.mode = data.mode === '2p' ? '2p' : '1p';
    this.campaign = this.mode === '1p' ? data.campaign ?? newCampaign() : null;
    this.exitTo = 'Menu'; // where Esc and the pause menu's quit go
  }

  create() {
    this.river = new River();
    const difficulty = this.campaign && DIFFICULTIES[this.campaign.difficulty];
    this.boat = difficulty ? new Boat({ tiers: difficulty.speeds, openingHold: difficulty.openingHold }) : new Boat();
    this.pickups = new Pickups(this.river);
    this.cameraZ = 0;
    this.distance = 0;
    this.clock = 0;
    this.wins = [0, 0];
    this.round = 0;

    this.createBackdrop();
    this.worldG = this.add.graphics().setDepth(2);
    this.entityG = this.add.graphics().setDepth(3);

    const twoPlayer = this.mode === '2p';
    const rival = this.campaign ? rivalProfile(this.campaign, this.campaign.order[this.campaign.rung]) : null;
    this.riders = [
      this.campaign
        ? new Rider({ ...playerRiderOptions(this.campaign), side: -1 })
        : new Rider({ name: 'P1', color: 0xe04848, side: -1 }),
      rival ? new Rider({ ...rival, side: 1 }) : new Rider({ name: 'P2', color: 0x3f6fe0, side: 1 }),
    ];
    this.riders[0].opponent = this.riders[1];
    this.riders[1].opponent = this.riders[0];

    this.touch = new TouchControls(this, twoPlayer);
    this.controllers = twoPlayer
      ? [new HumanController(this, KEYMAPS.p1, this.touch, 0), new HumanController(this, KEYMAPS.p2, this.touch, 1)]
      : [
          new HumanController(this, KEYMAPS.solo, this.touch, 0),
          new CpuController(this.riders[1], this.riders[0], rival, CPU_SKILL_BY_RUNG[Math.min(this.campaign.rung, CPU_SKILL_BY_RUNG.length - 1)], this.pickups),
        ];

    this.applySettings();
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.pauseMenu.close(),
      onQuit: () => this.scene.start(this.exitTo),
      onChange: () => this.applySettings(),
    });
    this.hud = new Hud(this, this.riders.map((r) => r.name), {
      onSettings: () => this.pauseMenu.open('settings'),
      onPause: () => this.pauseMenu.open('pause'),
    });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start(this.exitTo));
    const togglePause = () => (this.pauseMenu.isOpen ? this.pauseMenu.close() : this.pauseMenu.open('pause'));
    this.input.keyboard.on('keydown-P', togglePause);
    // Once the match is over, Enter moves on instead.
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.phase !== 'matchOver' && this.phase !== 'leaving') togglePause();
    });

    this.startRound();
  }

  applySettings() {
    this.riders.forEach((r, i) => {
      const human = this.controllers[i] instanceof HumanController;
      r.invincible = settings.invincible && human;
      r.setSize(settings.giant && human ? GIANT_SIZE : 1);
    });
  }

  createBackdrop() {
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0xcdeeff, 0xcdeeff, 1);
    sky.fillRect(0, 0, WIDTH, VIEW.horizonY);

    if (!this.textures.exists('treeline')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x24562a, 1);
      g.fillRect(0, 55, 480, 15);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 480;
        const w = 20 + Math.random() * 30;
        const h = 25 + Math.random() * 40;
        g.fillStyle(i % 2 ? 0x24562a : 0x2d6a33, 1);
        for (const wrap of [-480, 0, 480]) g.fillTriangle(x + wrap - w / 2, 70, x + wrap + w / 2, 70, x + wrap, 70 - h);
      }
      g.generateTexture('treeline', 480, 70);
      g.destroy();
    }
    this.treeline = this.add.tileSprite(0, VIEW.horizonY - 70, WIDTH, 70, 'treeline').setOrigin(0).setDepth(1);
  }

  startRound() {
    this.round += 1;
    this.river.build();
    this.boat.reset();
    this.pickups.reset();
    this.cameraZ = 0;
    this.distance = 0;
    this.riders.forEach((r) => r.reset());
    this.controllers.forEach((c) => c.reset?.());
    this.setPhase('countdown', MATCH.countdown);
    this.clearTaunts();
    this.taunts = this.riders
      .filter((_, i) => !(this.controllers[i] instanceof HumanController))
      .map((rider) => ({ rider, line: nextTaunt(), at: TAUNT_AT, bubble: null }));
    this.tauntFade = TAUNT_FADE;
  }

  // Bubbles pop up during the countdown, follow their rider, and fade out after GO.
  updateTaunts(dt) {
    if (this.phase === 'countdown') {
      const elapsed = MATCH.countdown - this.phaseTimer;
      for (const t of this.taunts) {
        if (!t.bubble && elapsed >= t.at) t.bubble = new SpeechBubble(this, t.line, t.rider.side, t.rider.color);
      }
    } else {
      this.tauntFade -= dt;
      if (this.tauntFade <= 0) return this.clearTaunts();
    }
    for (const { rider, bubble } of this.taunts) {
      if (!bubble) continue;
      bubble.setAnchor(rider.screenX, rider.screenTop - TAUNT_HEAD_GAP);
      bubble.setAlpha(Math.min(1, this.tauntFade / TAUNT_FADE));
    }
  }

  clearTaunts() {
    this.taunts?.forEach((t) => t.bubble?.destroy());
    this.taunts = [];
  }

  setPhase(phase, duration = 0) {
    this.phase = phase;
    this.phaseTimer = duration;
  }

  update(_, deltaMs) {
    if (this.pauseMenu.isOpen) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.clock += dt;
    if (this.phase === 'fight') this.boat.update(dt);
    const speed = this.boat.speed;
    this.distance += speed * dt;
    this.cameraZ = this.distance % this.river.length;
    const boatZ = this.cameraZ + RIDER_Z + ROPE_LENGTH;
    const curve = this.river.curveAt(boatZ);
    const bounds = this.river.boundsAt(this.cameraZ + RIDER_Z);

    this.touch.update();
    const inputs = this.controllers.map((c) => c.update(dt, this.clock));
    this.riders.forEach((r, i) => {
      let input = inputs[i];
      if (this.phase === 'countdown') input = NEUTRAL;
      else if (this.phase !== 'fight') input = { ...input, ...NO_ATTACKS };
      r.update(dt, this.clock, input, curve * this.boat.fling, bounds, this.boat.wake);
    });

    const { bump, stomp } = collideRiders(this.riders[0], this.riders[1], this.clock);
    if (bump > BUMP_FEEDBACK_SPEED) this.cameras.main.shake(70, 0.002);
    if (stomp) {
      this.floatText(stomp.victim, 'STOMP!', '#ff4d6d');
      this.cameras.main.shake(180, 0.012);
    }

    if (this.phase === 'fight') this.resolveCombat();
    for (const { rider, amount } of this.pickups.update(dt, this.distance, this.riders, this.phase === 'fight')) {
      this.floatText(rider, `+${amount} BALANCE & AIR`, '#7dff7d');
    }
    this.handleRiderEvents();
    this.updatePhase(dt);

    this.treeline.tilePositionX += curve * dt * 10;
    this.river.render(this.worldG, this.cameraZ);
    this.renderEntities(curve);
    this.updateTaunts(dt);
    const warnDistance = RIVER.bendWarningDistance * (speed / BOAT.speeds.slow.speed);
    this.hud.update(this.riders, this.wins, this.river.upcomingBend(boatZ, warnDistance), this.clock, this.boat);
  }

  resolveCombat() {
    const [a, b] = this.riders;
    for (const [attacker, defender] of [[a, b], [b, a]]) {
      const result = resolveAttack(attacker, defender, this.clock);
      if (!result) continue;
      const [message, color, shake] = RESULT_FEEDBACK[result];
      this.floatText(defender, message, color);
      if (shake) this.cameras.main.shake(90, shake);
    }
  }

  handleRiderEvents() {
    for (const r of this.riders) {
      for (const e of r.drainEvents()) {
        if (e.type === 'slam') this.floatText(r, 'SLAMMED!', '#ffb347');
        if (e.type === 'scrape') this.floatText(r, 'SCRAPE!', '#e0c48a');
        if (e.type === 'jump') this.floatText(r, e.launch >= BIG_AIR_LAUNCH ? 'BIG AIR!' : 'AIR!', '#bfe9ff');
        if (e.type === 'gassed') this.floatText(r, 'GASSED!', '#ff9f43', STATUS_TEXT_LIFT);
        if (e.type === 'lowAir') this.floatText(r, 'LOW AIR!', '#ff6b6b', STATUS_TEXT_LIFT);
        if (e.type === 'off') {
          this.floatText(r, KNOCKOFF_TEXT[e.reason], '#ffffff');
          this.cameras.main.shake(220, 0.008);
        }
      }
    }
  }

  updatePhase(dt) {
    this.phaseTimer -= dt;
    switch (this.phase) {
      case 'countdown':
        if (this.phaseTimer > 0) {
          const title = this.campaign ? `${this.riders[1].name.toUpperCase()}  -  ROUND ${this.round}` : `ROUND ${this.round}`;
          this.hud.setStatus(title, String(Math.ceil(this.phaseTimer)));
        } else {
          this.setPhase('fight');
          this.hud.flashStatus('GO!');
        }
        break;

      case 'fight': {
        const [off0, off1] = this.riders.map((r) => r.isOff);
        if (!off0 && !off1) break;
        if (off0 && off1) {
          this.hud.setStatus('DOUBLE SPLASH!', 'Nobody scores');
        } else {
          const winner = off0 ? 1 : 0;
          this.wins[winner] += 1;
          this.hud.setStatus(`${this.riders[winner].name.toUpperCase()} TAKES THE ROUND`);
        }
        this.setPhase('roundOver', MATCH.roundOverDelay);
        break;
      }

      case 'roundOver': {
        if (this.phaseTimer > 0) break;
        const champion = this.wins.findIndex((w) => w >= MATCH.roundsToWin);
        if (champion === -1) this.startRound();
        else this.endMatch(champion);
        break;
      }
    }
  }

  endMatch(winner) {
    this.setPhase('matchOver');
    const opponentKey = this.campaign?.order[this.campaign.rung];
    const unlocked = this.campaign && winner === 0 && recordWin(this.campaign.difficulty, opponentKey) ? opponentKey : null;
    const next = this.campaign
      ? () => this.scene.start('Ladder', { campaign: afterMatch(this.campaign, winner === 0), unlocked })
      : () => this.scene.restart({ mode: this.mode });
    const prompt = this.campaign ? 'Tap or press Enter to continue' : 'Tap or press Enter to rematch  -  Esc for menu';
    this.hud.setStatus(`${this.riders[winner].name.toUpperCase()} WINS!`, prompt);

    const proceed = () => {
      if (this.phase !== 'matchOver' || this.pauseMenu.isOpen) return;
      this.setPhase('leaving');
      next();
    };
    this.time.delayedCall(700, () => {
      // Taps on buttons (settings, pause, the pause menu) don't count.
      this.input.on('pointerdown', (_pointer, over) => {
        if (over.length === 0) proceed();
      });
      this.input.keyboard.on('keydown-ENTER', proceed);
      this.input.keyboard.on('keydown-SPACE', proceed);
    });
  }

  renderEntities(curve) {
    const g = this.entityG;
    g.clear();
    const boatDepth = RIDER_Z + ROPE_LENGTH;
    const riderPt = this.river.projectAhead(this.cameraZ, RIDER_Z);
    const boatPt = this.river.projectAhead(this.cameraZ, boatDepth);
    const items = this.pickups.visible().sort((a, b) => b.zAhead - a.zAhead);
    const drawItems = (minDepth, maxDepth) => {
      for (const item of items) {
        if (item.zAhead <= minDepth || item.zAhead > maxDepth) continue;
        const p = this.river.projectAhead(this.cameraZ, item.zAhead, item.x);
        const lift = wakeSurfaceHeight(item.zAhead, item.x, boatDepth, this.boat.wake) * p.s;
        drawPickup(g, { ...p, y: p.y - lift }, item.kind, this.clock + item.id);
      }
    };

    drawItems(boatDepth, Infinity);
    drawWake(g, (zAhead, x) => this.river.projectAhead(this.cameraZ, zAhead, x), boatDepth, this.boat.wake);
    const tow = drawBoat(g, boatPt, curve);
    drawItems(RIDER_Z, boatDepth);
    for (const r of this.riders) {
      r.screenX = riderPt.x + r.x * riderPt.s;
      r.screenY = riderPt.y - r.alt * riderPt.s;
      r.screenTop = r.screenY - r.hurtBox('head').y2 * riderPt.s;
      drawRope(g, tow, r, riderPt);
    }
    this.drawRiders(g, riderPt);
    drawItems(0, RIDER_Z);
  }

  drawRiders(g, riderPt) {
    for (const r of this.riders) drawRider(g, r, riderPt, this.clock);
  }

  // `above` lifts it clear of a hit message popping up at the same moment.
  floatText(rider, message, color, above = 0) {
    const text = addText(this, rider.screenX, rider.screenY - 100 - above, message, { scale: 3, color })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
