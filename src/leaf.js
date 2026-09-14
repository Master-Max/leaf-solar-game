import { LEAF, PHYS } from './config.js';
import { approach, clamp, lerpAngle, TAU } from './math.js';

export function createLeaf(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    tuck: 0,
    spread: 0,
    steer: 0,
    angle: 0,
    spin: 0,
    flutter: Math.random() * TAU,
    /** 0..1 how brightly the leaf is glowing from absorbed light. */
    charge: 0,

    get speed() { return Math.hypot(this.vx, this.vy); },

    update(dt, input, windX) {
      this.tuck = approach(this.tuck, input.tuck, PHYS.postureRate, dt);
      this.spread = approach(this.spread, input.spread, PHYS.postureRate, dt);
      this.steer = approach(this.steer, input.steer, 12, dt);

      const { tuck, spread } = this;
      const drag = PHYS.dragGlide
        + (PHYS.dragTuck - PHYS.dragGlide) * tuck
        + (PHYS.dragSpread - PHYS.dragGlide) * spread;
      const steerAccel = PHYS.steerGlide
        + (PHYS.steerTuck - PHYS.steerGlide) * tuck
        + (PHYS.steerSpread - PHYS.steerGlide) * spread;
      const sail = PHYS.sailGlide
        + (PHYS.sailTuck - PHYS.sailGlide) * tuck
        + (PHYS.sailSpread - PHYS.sailGlide) * spread;

      // Vertical: gravity fought by quadratic drag.
      this.vy += (PHYS.gravity - drag * this.vy * Math.abs(this.vy)) * dt;

      // Horizontal: the wind carries the leaf, the player nudges it.
      this.vx = approach(this.vx, windX, sail, dt);
      this.vx += this.steer * steerAccel * dt;

      // Natural flutter — a falling leaf never tracks straight. Steering and
      // tucking both damp it, so deliberate flight feels precise.
      this.flutter += dt * LEAF.flutterFreq * TAU * (0.6 + Math.abs(this.vy) / 420);
      const damp = (1 - Math.abs(this.steer) * 0.7) * (1 - tuck * 0.85);
      this.vx += Math.sin(this.flutter) * LEAF.flutterAccel * damp * dt;
      this.vy += Math.cos(this.flutter * 0.5) * LEAF.flutterAccel * 0.25 * damp * dt;

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > PHYS.maxSpeed) {
        const k = PHYS.maxSpeed / speed;
        this.vx *= k;
        this.vy *= k;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Point roughly along the flight path, banked into the turn.
      const heading = Math.atan2(this.vy, this.vx) + this.steer * 0.42;
      this.angle = lerpAngle(this.angle, heading, clamp(7 * dt, 0, 1));
      // Tucked leaves tumble.
      this.spin += dt * LEAF.spinRate * TAU * tuck;
      this.charge = approach(this.charge, 0, 2.2, dt);
    },

    /** Angle actually used for drawing: heading + tumble + flutter wobble. */
    get renderAngle() {
      return this.angle + this.spin + Math.sin(this.flutter) * 0.5 * (1 - this.tuck);
    },
  };
}

export function drawLeaf(ctx, leaf) {
  const r = LEAF.radius * LEAF.drawScale;
  ctx.save();
  ctx.translate(leaf.x, leaf.y);
  ctx.rotate(leaf.renderAngle);
  // Tucking curls the leaf up: squash across the chord.
  ctx.scale(1 + leaf.tuck * 0.18, 1 - leaf.tuck * 0.55 + leaf.spread * 0.08);

  if (leaf.charge > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.1);
    glow.addColorStop(0, `rgba(255,216,118,${0.34 * leaf.charge})`);
    glow.addColorStop(0.45, `rgba(255,198,96,${0.12 * leaf.charge})`);
    glow.addColorStop(1, 'rgba(255,198,96,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Stem.
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 1.2, 0);
  ctx.quadraticCurveTo(-r * 1.6, r * 0.12, -r * 1.95, r * 0.3);
  ctx.stroke();

  // Blade.
  ctx.beginPath();
  ctx.moveTo(-r * 1.22, 0);
  ctx.bezierCurveTo(-r * 0.5, -r * 0.98, r * 0.55, -r * 0.82, r * 1.3, 0);
  ctx.bezierCurveTo(r * 0.55, r * 0.82, -r * 0.5, r * 0.98, -r * 1.22, 0);
  ctx.closePath();

  const fill = ctx.createLinearGradient(-r, -r, r, r);
  const warm = clamp(leaf.charge, 0, 1);
  fill.addColorStop(0, `rgb(${Math.round(124 + warm * 72)}, ${Math.round(191 + warm * 18)}, ${Math.round(79 - warm * 16)})`);
  fill.addColorStop(1, `rgb(${Math.round(72 + warm * 86)}, ${Math.round(138 + warm * 40)}, ${Math.round(52 - warm * 8)})`);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = 'rgba(38,66,30,.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Midrib and veins.
  ctx.strokeStyle = 'rgba(245,255,220,.45)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, 0);
  ctx.lineTo(r * 1.22, 0);
  ctx.stroke();

  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(245,255,220,.28)';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const t = -0.7 + i * 0.46;
    const bx = r * t;
    for (const dir of [-1, 1]) {
      ctx.moveTo(bx, 0);
      ctx.quadraticCurveTo(bx + r * 0.3, dir * r * 0.32, bx + r * 0.52, dir * r * 0.5);
    }
  }
  ctx.stroke();

  ctx.restore();
}
