import { LEAF, PHYS } from './config.js';
import { approach, clamp, TAU } from './math.js';

export function createLeaf(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    /** Blade angle. 0 is parallel to the ground, ±PI/2 is edge-on. */
    angle: 0,
    angularVel: 0,
    steer: 0,
    /** 0..1 how brightly the leaf is glowing from absorbed light. */
    charge: 0,

    get speed() { return Math.hypot(this.vx, this.vy); },

    update(dt, input) {
      this.steer = approach(this.steer, input.steer, PHYS.steerRate, dt);

      // Attitude is the whole control scheme: the player rotates the blade and
      // the air does the rest.
      this.angularVel = approach(this.angularVel, this.steer * PHYS.maxAngularVel, PHYS.angularRate, dt);
      this.angle += this.angularVel * dt;

      // Blade frame: `n` is the face normal, `t` runs along the blade.
      const nx = Math.sin(this.angle);
      const ny = -Math.cos(this.angle);
      const tx = Math.cos(this.angle);
      const ty = Math.sin(this.angle);

      // The air is still, so airspeed is just how fast the leaf is going.
      const vn = this.vx * nx + this.vy * ny;
      const vt = this.vx * tx + this.vy * ty;
      const fn = -PHYS.faceDrag * vn * Math.abs(vn);
      const ft = -PHYS.edgeDrag * vt * Math.abs(vt);

      // The face force points along the normal, so a tilted blade is pushed
      // sideways as well as up: that is the glide.
      this.vx += (fn * nx + ft * tx) * dt;
      this.vy += (fn * ny + ft * ty + PHYS.gravity) * dt;

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > PHYS.maxSpeed) {
        const k = PHYS.maxSpeed / speed;
        this.vx *= k;
        this.vy *= k;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.charge = approach(this.charge, 0, 2.2, dt);
    },

    /** What gets drawn is the true blade angle — the player has to read it. */
    get renderAngle() { return this.angle; },
  };
}

export function drawLeaf(ctx, leaf) {
  const r = LEAF.radius * LEAF.drawScale;
  ctx.save();
  ctx.translate(leaf.x, leaf.y);
  ctx.rotate(leaf.renderAngle);

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
