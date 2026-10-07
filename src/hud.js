import { WIDTH, RIDER, MATCH, BOAT } from './config.js';

const BAR_W = 200;
const BAR_H = 12;
const MARGIN = 16;
const SPEED_Y = 64;
const SPEED_TIERS = Object.keys(BOAT.speeds);
const SPEED_COLORS = { slow: 0x7dff7d, medium: 0xffdd55, fast: 0xff6b3d };

const TEXT = {
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontSize: '18px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 4,
};

export class Hud {
  constructor(scene, names) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(50);

    this.panels = [MARGIN, WIDTH - MARGIN - BAR_W].map((x, i) => {
      const nameX = i === 0 ? x : x + BAR_W;
      const labelX = i === 0 ? x + BAR_W + 8 : x - 8;
      scene.add.text(nameX, 8, names[i], TEXT).setOrigin(i, 0).setDepth(51);
      const small = { ...TEXT, fontSize: '11px', strokeThickness: 3 };
      scene.add.text(labelX, 36 + BAR_H / 2, 'BALANCE', small).setOrigin(i, 0.5).setDepth(51);
      scene.add.text(labelX, 56 + BAR_H / 2, 'TUBE AIR', small).setOrigin(i, 0.5).setDepth(51);
      return { x, align: i };
    });

    this.status = scene.add.text(WIDTH / 2, 150, '', { ...TEXT, fontSize: '40px', strokeThickness: 6 }).setOrigin(0.5).setDepth(60);
    this.sub = scene.add.text(WIDTH / 2, 198, '', { ...TEXT, fontSize: '20px' }).setOrigin(0.5).setDepth(60);
    this.warning = scene.add.text(WIDTH / 2, 30, '', { ...TEXT, fontSize: '22px', color: '#ffdd55' }).setOrigin(0.5).setDepth(60);
    this.speed = scene.add.text(WIDTH / 2 - 8, SPEED_Y, '', { ...TEXT, fontSize: '15px', strokeThickness: 3 }).setOrigin(0, 0.5).setDepth(60);
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

  update(riders, wins, bend, time, boat) {
    const g = this.g;
    g.clear();
    this.drawSpeed(boat, time);

    riders.forEach((r, i) => {
      const { x, align } = this.panels[i];
      this.bar(x, 36, r.balance / RIDER.maxBalance, 0xffc93c, align);
      this.bar(x, 56, r.air / RIDER.maxAir, 0x4fd1ff, align);
      for (let k = 0; k < MATCH.roundsToWin; k++) {
        const px = align === 0 ? x + BAR_W - 8 - k * 20 : x + 8 + k * 20;
        g.fillStyle(k < wins[i] ? 0xffdd55 : 0x000000, k < wins[i] ? 1 : 0.4);
        g.fillCircle(px, 20, 7);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeCircle(px, 20, 7);
      }
    });

    if (!bend) {
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
