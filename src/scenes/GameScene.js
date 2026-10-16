import Phaser from 'phaser';
import { WIDTH, HEIGHT, VIEW, RIVER, RIDER, RIDER_Z, RIDER_ART, ROPE_LENGTH, MATCH, CPU_SKILL_BY_RUNG, BOAT, DIFFICULTIES, SCORE } from '../config.js';
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
import { newCampaign, afterMatch, rivalProfile, playerRiderOptions, playerArt, rivalArt } from '../campaign.js';
import { recordWin } from '../progress.js';
import { recordScore, bestScore, rungMultiplier, formatScore } from '../score.js';
import { settings } from '../settings.js';
import { drawPickup, drawRope, drawWake, wakeSurfaceHeight, drawAirShadow, drawShoreSpray, drawSplash, FALL } from '../draw.js';
import { BoatSprite } from '../boatArt.js';
import { TubeRider, preloadRiderAnim, ATTACK_ANIM } from '../riderArt.js';
import { artColors } from '../riderColors.js';
import { tubeTextures, tubeTexturesSoon, warmTubes, bakeTubes, TEXELS_PER_UNIT } from '../tubeArt.js';
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
const TAUNT_HEAD_GAP = 4;

// The boat over the wake behind it, then what's between it and the riders (health items,
// the ropes).
const BOAT_DEPTH = 3.1;
const BEHIND_RIDERS_DEPTH = 3.2;
// Riders as pictures in their tubes (riderArt.js), over the river and boat.
const RIDER_DEPTH = 3.5;
const NEAR_DEPTH = 3.6; // health items nearer than the riders
// 2 players: Dan's pictures in each rider's own colors.
const TWO_PLAYER_ART = { anim: ATTACK_ANIM, colors: null, artScale: 1 };
const STRIKE_SECONDS = 0.25; // a punch or kick shows at least this long, into the recovery
const DUCK_SHRINK = 0.85; // a ducking rider's picture, this share of their size
const LOW_AIR_FLASH = 0x9b2226;
const SPRING = { stiffness: 260, damping: 9, kick: 9 }; // the tubes' squash when they bump
const BUMP_SPEED = 300; // a bump this fast squashes them all the way
const FALL_SPIN = 2.2; // radians a knocked-off rider turns on the way down
const FALL_SINK = 40; // world units they drop below where they sat as they land
// Each rider's tube cover, like the green and blue tubes in the menu picture.
const TUBE_COLORS = ['green', 'blue'];
// Milliseconds per frame spent drawing tubes in new shapes (tubeArt.js): more while
// nobody's moving yet.
const TUBE_BAKE_MS = { countdown: 10, other: 4 };
const HANDLES = [-1, 0, 1];
const LEAN_STEPS = 10; // warm-up tubes leaning each way, in this many steps

export class GameScene extends Phaser.Scene {
  constructor(key = 'Game') {
    super(key);
  }

  init(data) {
    this.mode = data.mode === '2p' ? '2p' : '1p';
    this.campaign = this.mode === '1p' ? data.campaign ?? newCampaign() : null;
    this.score = this.campaign ? this.campaign.score ?? 0 : null; // null: not keeping score
    this.exitTo = 'Menu'; // where Esc and the pause menu's quit go
    this.artScale = RIDER_ART.scale;
    this.artTubeWidth = RIDER_ART.tubeWidth;
    this.ridersShown = [true, true]; // false draws just that rider's tube
  }

  preload() {
    const rung = this.campaign?.rung;
    this.art = this.campaign ? [playerArt(this.campaign), rivalArt(this.campaign, this.campaign.order[rung])] : [TWO_PLAYER_ART, TWO_PLAYER_ART];
    for (const { anim } of this.art) if (!this.cache.json.exists(`${anim.key}-meta`)) preloadRiderAnim(this, anim);
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
    this.boatArt = new BoatSprite(this, BOAT_DEPTH);
    this.behindRidersG = this.add.graphics().setDepth(BEHIND_RIDERS_DEPTH);

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
    this.tubeRiders = this.riders.map((r, i) => new TubeRider(this, this.art[i].anim).setColors(this.art[i].colors ?? artColors(r)).setDepth(RIDER_DEPTH));
    // A knocked-off rider's picture, flying off their tube.
    this.fallers = this.riders.map(() => this.add.image(0, 0, '__DEFAULT').setDepth(RIDER_DEPTH).setVisible(false));
    this.squash = this.riders.map(() => ({ amount: 0, speed: 0 }));
    this.prepareTubes();
    this.touching = false;
    this.nearG = this.add.graphics().setDepth(NEAR_DEPTH);

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
    if (this.score !== null) this.hud.setScore(this.score);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start(this.exitTo));
    const togglePause = () => (this.pauseMenu.isOpen ? this.pauseMenu.close() : this.pauseMenu.open('pause'));
    this.input.keyboard.on('keydown-P', togglePause);
    // Once the match is over, Enter moves on instead.
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.phase !== 'matchOver' && this.phase !== 'leaving') togglePause();
    });

    this.startRound();
  }

  // Draws each rider's tube as it starts out, and queues the other kinds a match shows
  // (other handles, leaning, squashed by a bump) to draw soon, the plain ones first so one
  // can stand in for any shape that isn't drawn yet.
  prepareTubes() {
    const width = this.artTubeWidth;
    const plain = [];
    const shaped = [];
    this.riders.forEach((r, i) => {
      const color = TUBE_COLORS[i];
      const facing = Math.sign(r.opponent.x - r.x) || -r.startSide;
      tubeTextures(this, { width, color, handle: this.tubeRiders[i].holdsFarHandle(ATTACK_ANIM.hold) ? 0 : facing });
      for (const handle of HANDLES) {
        plain.push({ width, color, handle });
        for (let k = -LEAN_STEPS; k <= LEAN_STEPS; k++) shaped.push({ width, color, handle, lean: k / LEAN_STEPS });
        if (!handle) continue;
        for (let k = 1; k <= LEAN_STEPS; k++) shaped.push({ width, color, handle, squash: (k / LEAN_STEPS) * handle });
      }
    });
    warmTubes(this, [...plain, ...shaped]);
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
      // Like a comic: the tail points in at the top corner of the head on the side the
      // bubble grows toward.
      const { left, right, top } = rider.head;
      bubble.setAnchor(bubble.dir > 0 ? right + TAUNT_HEAD_GAP : left - TAUNT_HEAD_GAP, top - TAUNT_HEAD_GAP);
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
    bakeTubes(this, this.phase === 'countdown' ? TUBE_BAKE_MS.countdown : TUBE_BAKE_MS.other);
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
      if (stomp.victim === this.riders[1]) this.addPoints(SCORE.stomp);
    }

    if (this.phase === 'fight') this.resolveCombat();
    for (const { rider, amount } of this.pickups.update(dt, this.distance, this.riders, this.phase === 'fight')) {
      this.floatText(rider, `+${amount} BALANCE & AIR`, '#7dff7d');
      if (rider === this.riders[0]) this.addPoints(amount * SCORE.kitPerPoint);
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
      if (attacker === this.riders[0] && SCORE.hit[result]) this.addPoints(SCORE.hit[result]);
      if (defender === this.riders[0] && (result === 'duck' || result === 'dodge')) this.addPoints(SCORE[result]);
    }
  }

  // Points for the player, times this rung's multiplier.
  addPoints(points) {
    if (this.score === null) return 0;
    const gained = Math.round(points * rungMultiplier(this.campaign.rung));
    this.score += gained;
    this.hud.setScore(this.score, gained);
    return gained;
  }

  handleRiderEvents() {
    for (const r of this.riders) {
      for (const e of r.drainEvents()) {
        if (e.type === 'slam') this.floatText(r, 'SLAMMED!', '#ffb347');
        if (e.type === 'scrape') this.floatText(r, 'SCRAPE!', '#e0c48a');
        if (e.type === 'jump') {
          const big = e.launch >= BIG_AIR_LAUNCH;
          this.floatText(r, big ? 'BIG AIR!' : 'AIR!', '#bfe9ff');
          if (r === this.riders[0] && this.phase === 'fight') this.addPoints(big ? SCORE.bigAir : SCORE.air);
        }
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
          const bonus = winner === 0 ? this.roundBonus() : 0;
          this.hud.setStatus(`${this.riders[winner].name.toUpperCase()} TAKES THE ROUND`, bonus ? `ROUND BONUS +${formatScore(bonus)}` : '');
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

  // The player's points for winning a round, more for the balance and tube air they kept.
  roundBonus() {
    const { balance, air } = this.riders[0];
    const kept = (Math.max(0, balance) / RIDER.maxBalance + Math.max(0, air) / RIDER.maxAir) / 2;
    return this.addPoints(SCORE.roundWin + SCORE.leftover * kept);
  }

  endMatch(winner) {
    this.setPhase('matchOver');
    const opponentKey = this.campaign?.order[this.campaign.rung];
    const unlocked = this.campaign && winner === 0 && recordWin(this.campaign.difficulty, opponentKey) ? opponentKey : null;
    if (this.score !== null) this.scoreMatch(winner === 0);
    const next = this.campaign
      ? () => this.scene.start('Ladder', { campaign: afterMatch(this.campaign, winner === 0, this.score), unlocked })
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

  // The match bonuses, this run's high score entry, and a panel to show them. Losing ends
  // the run.
  scoreMatch(won) {
    const { difficulty, rung, order, runId } = this.campaign;
    const champion = won && rung === order.length - 1;
    const lines = won ? [] : [['RUN OVER', '#ff6b6b']];
    const bonus = (label, points) => lines.push([`${label} +${formatScore(this.addPoints(points))}`, '#7dff7d']);
    if (won) bonus('MATCH WIN', SCORE.matchWin);
    if (won && this.wins[1] === 0) bonus('SWEEP', SCORE.sweep);
    if (champion) bonus('CHAMPION', SCORE.champion);

    const best = bestScore(difficulty);
    const entry = { runId, score: this.score, name: this.riders[0].name, beaten: won ? rung + 1 : rung, champion };
    const newBest = this.score > 0 && recordScore(difficulty, entry);
    lines.push([`${won ? 'SCORE' : 'FINAL SCORE'} ${formatScore(this.score)}`]);
    lines.push(newBest ? ['NEW HIGH SCORE!', '#ffdd55'] : [`HIGH SCORE ${formatScore(best)}`, '#ffdd55']);
    this.hud.showResults(lines);
  }

  renderEntities(curve) {
    const g = this.entityG;
    g.clear();
    this.nearG.clear();
    const boatDepth = RIDER_Z + ROPE_LENGTH;
    const riderPt = this.river.projectAhead(this.cameraZ, RIDER_Z);
    const boatPt = this.river.projectAhead(this.cameraZ, boatDepth);
    const items = this.pickups.visible().sort((a, b) => b.zAhead - a.zAhead);
    const drawItems = (minDepth, maxDepth, into = g) => {
      for (const item of items) {
        if (item.zAhead <= minDepth || item.zAhead > maxDepth) continue;
        const p = this.river.projectAhead(this.cameraZ, item.zAhead, item.x);
        const lift = wakeSurfaceHeight(item.zAhead, item.x, boatDepth, this.boat.wake) * p.s;
        drawPickup(into, { ...p, y: p.y - lift }, item.kind, this.clock + item.id);
      }
    };

    drawItems(boatDepth, Infinity);
    drawWake(g, (zAhead, x) => this.river.projectAhead(this.cameraZ, zAhead, x), boatDepth, this.boat.wake);
    const tow = this.boatArt.place(boatPt, curve);
    const behind = this.behindRidersG;
    behind.clear();
    drawItems(RIDER_Z, boatDepth, behind);
    for (const r of this.riders) {
      r.screenX = riderPt.x + r.x * riderPt.s;
      r.screenY = riderPt.y - r.alt * riderPt.s;
      drawRope(behind, tow, r, riderPt);
    }
    this.drawRiders(g, riderPt);
    drawItems(0, RIDER_Z, this.nearG);
  }

  drawRiders(g, riderPt) {
    this.updateSquash(Math.min(this.game.loop.delta / 1000, 1 / 30));
    this.riders.forEach((r, i) => this.drawRiderArt(g, r, i, riderPt));
  }

  // Facing the other rider, in their tube, bobbing on the water; the tube squashes where
  // they bump, sinks on the side they lean, and goes flat as it loses air.
  drawRiderArt(g, r, i, p) {
    const art = this.tubeRiders[i];
    const scale = p.s * this.artScale;
    const facing = Math.sign(r.opponent.x - r.x) || -r.startSide;
    const bob = r.airborne ? 0 : Math.sin(this.clock * 7 + r.startSide * 1.7) * 2;
    drawAirShadow(g, r, p);
    drawShoreSpray(g, r, p, bob);

    const frame = r.isOff ? ATTACK_ANIM.hold : this.attackFrame(r);
    const tube = tubeTexturesSoon(this, {
      air: r.air / RIDER.maxAir,
      squash: Math.max(0, this.squash[i].amount) * facing,
      lean: r.leanVisual,
      handle: !r.isOff && art.holdsFarHandle(frame) ? 0 : facing,
      width: this.artTubeWidth,
      color: TUBE_COLORS[i],
    });
    art.place(tube, r.screenX, r.screenY + bob, scale, {
      facing,
      lean: r.leanVisual,
      heightIn: r.heightIn * this.art[i].artScale * (r.ducking ? DUCK_SHRINK : 1),
      showRider: !r.isOff && this.ridersShown[i],
      rotation: -r.tilt,
      frame,
    });
    r.head = art.headBox();
    art.setFlash(r.flash > 0);
    art.flashTube(r.lowAir && Math.sin(this.clock * 10) > 0 ? LOW_AIR_FLASH : null);
    this.drawFall(g, r, i, p, tube, scale);
  }

  // The attack picture for where `r` is in their attack: wound up, then striking (for at
  // least STRIKE_SECONDS), then winding back. Holding on otherwise.
  attackFrame(r) {
    const a = r.attack;
    const { hold, windup, punch, kickWindup, midKick, lowKick } = ATTACK_ANIM;
    if (!a || !['windup', 'active', 'recovery'].includes(r.state)) return hold;
    const back = a.type === 'high' ? windup : kickWindup;
    if (r.state === 'windup') return back;
    if (r.state === 'active' || this.clock - a.windupEnd < STRIKE_SECONDS) return { high: punch, mid: midKick, low: lowKick }[a.type];
    return back;
  }

  // A knocked-off rider tumbles off their tube, then leaves a splash where they landed.
  drawFall(g, r, i, p, tube, scale) {
    const faller = this.fallers[i];
    const t = r.isOff && this.ridersShown[i] ? this.clock - r.off.time : null;
    faller.setVisible(t !== null && t < FALL.seconds);
    if (t === null) return;
    if (t >= FALL.seconds) return drawSplash(g, r, p, t - FALL.seconds, this.artScale);
    const k = t / FALL.seconds;
    const { rider } = this.tubeRiders[i];
    const seatY = p.y + tube.seat.y * (scale / TEXELS_PER_UNIT);
    faller
      .setTexture(rider.texture.key, rider.frame.name)
      .setOrigin(rider.originX, rider.originY)
      .setScale(rider.scaleX, rider.scaleY)
      .setPosition(p.x + (r.off.x + r.off.dir * FALL.distance * k) * p.s, seatY - (Math.sin(k * Math.PI) * FALL.rise - k * FALL_SINK) * p.s)
      .setRotation(r.off.dir * k * FALL_SPIN)
      .setAlpha(1 - k * 0.3);
  }

  // The tubes squash where they meet when they bump, then spring back.
  updateSquash(dt) {
    const [a, b] = this.riders;
    const touching = !a.isOff && !b.isOff && Math.abs(a.x - b.x) <= RIDER.tubeWidth + 2 && Math.abs(a.alt - b.alt) < RIDER.tubeHeight;
    if (touching && !this.touching) {
      const kick = SPRING.kick * Math.min(1, Math.max(0.3, Math.abs(a.vx - b.vx) / BUMP_SPEED));
      for (const s of this.squash) s.speed += kick;
    }
    this.touching = touching;
    for (const s of this.squash) {
      s.speed += (-SPRING.stiffness * s.amount - SPRING.damping * s.speed) * dt;
      s.amount = Phaser.Math.Clamp(s.amount + s.speed * dt, -1, 1);
    }
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
