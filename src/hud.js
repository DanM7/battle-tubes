import { WIDTH, VIEW, RIDER, MATCH, BOAT, ENDURANCE } from './config.js';
import { settings } from './settings.js';
import { addText } from './pixelFont.js';
import { formatScore } from './score.js';

const BAR_W = 200;
const BAR_H = 12;
const MARGIN = 16;
const SCORE_Y = 6;
const WARNING_Y = 52; // between the bars' labels, under the score
const SPEED_Y = 80;
const GAIN_Y = SCORE_Y + 5; // level with the middle of the score
const GAIN_GAP = 10;
const RESULTS = { w: 440, lineH: 30, pad: 14, gap: 32 }; // gap: below the status line
const ICON_SIZE = 34;
const ICON_Y = 98;
const ICON_FILL = 0x1d4e89;
// The round banner and countdown follow the horizon to stay clear of the boat, but the
// banner stops short of the bars above.
const STATUS_Y = Math.max(100, VIEW.horizonY - 50);
const SUB_Y = VIEW.horizonY + 4;
const SPEED_TIERS = Object.keys(BOAT.speeds);
const SPEED_COLORS = { slow: 0x7dff7d, medium: 0xffdd55, fast: 0xff6b3d };

export class Hud {
  constructor(scene, names, { onSettings, onPause }) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(50);

    this.panels = [MARGIN, WIDTH - MARGIN - BAR_W].map((x, i) => {
      const nameX = i === 0 ? x : x + BAR_W;
      const labelX = i === 0 ? x + BAR_W + 8 : x - 8;
      addText(scene, nameX, 8, names[i], { scale: 2 }).setOrigin(i, 0).setDepth(51);
      addText(scene, labelX, 36 + BAR_H / 2, 'BALANCE', { scale: 2, font: 'small' }).setOrigin(i, 0.5).setDepth(51);
      addText(scene, labelX, 56 + BAR_H / 2, 'ENDURANCE', { scale: 2, font: 'small' }).setOrigin(i, 0.5).setDepth(51);
      return { x, align: i };
    });

    this.status = addText(scene, WIDTH / 2, STATUS_Y, '', { scale: 5, align: 'center', wrap: WIDTH - 60 }).setOrigin(0.5).setDepth(60);
    this.sub = addText(scene, WIDTH / 2, SUB_Y, '', { scale: 3, align: 'center' }).setOrigin(0.5).setDepth(60);
    this.warning = addText(scene, WIDTH / 2, WARNING_Y, '', { scale: 2, color: '#ffdd55' }).setOrigin(0.5).setDepth(60);
    this.speed = addText(scene, WIDTH / 2 - 8, SPEED_Y, '', { scale: 2 }).setOrigin(0, 0.5).setDepth(60);

    const gearX = MARGIN + ICON_SIZE / 2;
    this.iconButton(gearX, drawGear, onSettings);
    this.iconButton(gearX + ICON_SIZE + 10, drawPause, onPause);
  }

  // A small square button under P1's bars with an icon drawn by `drawIcon(g)`.
  iconButton(x, drawIcon, onClick) {
    const rect = this.scene.add
      .rectangle(x, ICON_Y, ICON_SIZE, ICON_SIZE, ICON_FILL, 0.85)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(55)
      .setInteractive({ useHandCursor: true });
    const icon = this.scene.add.graphics({ x, y: ICON_Y }).setDepth(56);
    drawIcon(icon);
    rect.on('pointerover', () => rect.setFillStyle(0x2a6bb8, 0.95));
    rect.on('pointerout', () => rect.setFillStyle(ICON_FILL, 0.85));
    rect.on('pointerup', onClick);
  }

  setStatus(main, sub = '') {
    this.scene.tweens.killTweensOf([this.status, this.sub]);
    this.status.setText(main).setAlpha(1);
    this.sub.setText(sub).setAlpha(1);
  }

  flashStatus(main) {
    this.setStatus(main);
    this.scene.tweens.add({ targets: this.status, alpha: 0, delay: 500, duration: 300 });
  }

  // The 1 Player score at the top, with `gained` popping up beside it.
  setScore(score, gained = 0) {
    if (!this.scoreText) {
      this.scoreText = addText(this.scene, WIDTH / 2, SCORE_Y, '', { scale: 3 }).setOrigin(0.5, 0).setDepth(60);
      this.gainText = addText(this.scene, 0, SCORE_Y, '', { scale: 2, color: '#7dff7d' }).setDepth(60);
    }
    this.scoreText.setText(`SCORE ${formatScore(score)}`);
    if (gained <= 0) return;
    const gain = this.gainText;
    this.scene.tweens.killTweensOf(gain);
    gain.setText(`+${formatScore(gained)}`).setPosition(WIDTH / 2 + this.scoreText.width / 2 + GAIN_GAP, GAIN_Y).setAlpha(1);
    this.scene.tweens.add({ targets: gain, alpha: 0, y: GAIN_Y - 6, delay: 600, duration: 400 });
  }

  // A panel of [text, color] lines under the status, for the end of a match.
  showResults(lines) {
    const h = lines.length * RESULTS.lineH + RESULTS.pad * 2;
    const top = SUB_Y + RESULTS.gap;
    this.scene.add
      .rectangle(WIDTH / 2, top + h / 2, RESULTS.w, h, 0x0d2a4a, 0.8)
      .setStrokeStyle(3, 0xffffff)
      .setDepth(59);
    lines.forEach(([text, color = '#ffffff'], i) => {
      const y = top + RESULTS.pad + (i + 0.5) * RESULTS.lineH;
      addText(this.scene, WIDTH / 2, y, text, { scale: 3, color }).setOrigin(0.5).setDepth(60);
    });
  }

  update(riders, wins, bend, time, boat) {
    const g = this.g;
    g.clear();

    riders.forEach((r, i) => {
      const { x, align } = this.panels[i];
      this.bar(x, 36, r.balance / RIDER.maxBalance, 0xffc93c, align);
      const gassedColor = Math.sin(time * 12) > 0 ? 0xff4d4d : 0xb02a2a;
      this.bar(x, 56, r.endurance / ENDURANCE.max, r.gassed ? gassedColor : 0xff9f43, align);
      for (let k = 0; k < MATCH.roundsToWin; k++) {
        const px = align === 0 ? x + BAR_W - 8 - k * 20 : x + 8 + k * 20;
        g.fillStyle(k < wins[i] ? 0xffdd55 : 0x000000, k < wins[i] ? 1 : 0.4);
        g.fillCircle(px, 20, 7);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeCircle(px, 20, 7);
      }
    });

    // The turn banner and speed gauge are Debug Mode only.
    if (settings.debug) this.drawSpeed(boat, time);
    else this.speed.setText('');
    if (!settings.debug || !bend) {
      this.warning.setText('');
      return;
    }
    const mag = Math.abs(bend.curve);
    const dir = bend.curve < 0 ? 'LEFT' : 'RIGHT';
    const strength = mag >= 5 ? 'HARD ' : mag >= 3 ? '' : 'EASY ';
    const label = bend.distance === 0 ? `BOAT TURNING ${dir}` : `${strength}${dir} TURN AHEAD`;
    this.warning.setText(bend.curve < 0 ? `◀ ${label}` : `${label} ▶`);
    this.warning.setAlpha(bend.distance === 0 ? 1 : 0.6 + 0.4 * Math.sin(time * 12));
  }

  // Three bars that light up with the boat's speed, its name, and a flashing
  // warning while a change is coming.
  drawSpeed(boat, time) {
    const g = this.g;
    const level = SPEED_TIERS.indexOf(boat.tier);
    const color = SPEED_COLORS[boat.tier];
    SPEED_TIERS.forEach((_, k) => {
      const h = 8 + k * 5;
      const x = WIDTH / 2 - 58 + k * 14;
      g.fillStyle(k <= level ? color : 0x000000, k <= level ? 1 : 0.45);
      g.fillRect(x, SPEED_Y + 9 - h, 10, h);
      g.lineStyle(1, 0xffffff, 0.8);
      g.strokeRect(x, SPEED_Y + 9 - h, 10, h);
    });

    if (boat.next) {
      const faster = SPEED_TIERS.indexOf(boat.next) > level;
      this.speed.setText(faster ? 'SPEEDING UP! ▲' : 'SLOWING DOWN ▼');
      this.speed.setColor(faster ? '#ff9f43' : '#bfe9ff');
      this.speed.setAlpha(0.55 + 0.45 * Math.sin(time * 12));
    } else {
      this.speed.setText(BOAT.speeds[boat.tier].label);
      this.speed.setColor(`#${color.toString(16).padStart(6, '0')}`);
      this.speed.setAlpha(1);
    }
  }

  bar(x, y, frac, color, align) {
    const g = this.g;
    g.fillStyle(0x000000, 0.55);
    g.fillRect(x - 2, y - 2, BAR_W + 4, BAR_H + 4);
    const w = BAR_W * Math.max(0, Math.min(1, frac));
    g.fillStyle(color, 1);
    g.fillRect(align === 0 ? x : x + BAR_W - w, y, w, BAR_H);
  }
}

// Icons are drawn around (0, 0) in a graphics object placed at the button's center.
function drawGear(g) {
  g.lineStyle(5, 0xffffff, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.lineBetween(Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * 12, Math.sin(a) * 12);
  }
  g.fillStyle(0xffffff, 1);
  g.fillCircle(0, 0, 8.5);
  g.fillStyle(ICON_FILL, 1);
  g.fillCircle(0, 0, 3.5);
}

function drawPause(g) {
  g.fillStyle(0xffffff, 1);
  g.fillRect(-7, -9, 5, 18);
  g.fillRect(2, -9, 5, 18);
}
