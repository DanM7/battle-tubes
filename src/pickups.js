import { PICKUPS, RIDER, RIDER_Z, BOAT } from './config.js';

const rand = (min, max) => min + Math.random() * (max - min);

// Health items sitting in the river. Positions are in "distance traveled" space,
// so the boat sweeps toward them and they slide past the riders.
export class Pickups {
  constructor(river) {
    this.river = river;
    this.reset();
  }

  reset() {
    this.items = [];
    this.distance = 0;
    this.speed = BOAT.speeds.slow.speed;
    this.nextId = 1;
    this.timer = rand(PICKUPS.spawnIntervalMin, PICKUPS.spawnIntervalMax);
  }

  // Returns [{ rider, amount }] for items collected this frame.
  update(dt, distance, riders, spawning) {
    const previous = this.distance;
    this.distance = distance;
    if (dt > 0 && distance > previous) this.speed = (distance - previous) / dt;

    if (spawning) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawn();
        this.timer = rand(PICKUPS.spawnIntervalMin, PICKUPS.spawnIntervalMax);
      }
    }

    const collected = [];
    for (const item of this.items) {
      if (item.passed || item.z - previous <= RIDER_Z || item.z - distance > RIDER_Z) continue;
      item.passed = true;
      const { amount, size } = PICKUPS.kinds[item.kind];
      const reach = RIDER.tubeWidth / 2 + size / 2;
      const catcher = riders
        .filter((r) => !r.isOff && !r.airborne && Math.abs(r.x - item.x) <= reach)
        .sort((a, b) => Math.abs(a.x - item.x) - Math.abs(b.x - item.x))[0];
      if (!catcher) continue;
      item.collected = true;
      catcher.heal(PICKUPS.restores, amount);
      collected.push({ rider: catcher, amount });
    }

    this.items = this.items.filter((i) => !i.collected && i.z - distance > PICKUPS.despawnDepth);
    return collected;
  }

  // An item at distance z reaches the riders exactly when they're at river position z,
  // so it's placed within the reachable water there.
  spawn() {
    const z = this.distance + PICKUPS.spawnAhead;
    const range = this.river.boundsAt(z).limit - 60;
    this.items.push({
      id: this.nextId++,
      z,
      x: rand(-range, range),
      kind: Math.random() < PICKUPS.bigChance ? 'big' : 'small',
      passed: false,
      collected: false,
    });
  }

  // Items still ahead of the riders, with seconds until they arrive.
  upcoming() {
    return this.items
      .filter((i) => !i.passed)
      .map((i) => ({ ...i, eta: (i.z - this.distance - RIDER_Z) / this.speed }));
  }

  // Everything drawable, with depth in front of the camera.
  visible() {
    return this.items.map((i) => ({ ...i, zAhead: i.z - this.distance }));
  }
}
