import { TAU } from './math.js';

/** Fixed-capacity particle pool — no allocation once it is warmed up. */
export class Particles {
  constructor(capacity = 600) {
    this.items = Array.from({ length: capacity }, () => ({ life: 0 }));
    this.cursor = 0;
  }

  spawn(props) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    Object.assign(p, { vx: 0, vy: 0, drag: 1.4, gravity: 0, size: 3, additive: true }, props);
    p.maxLife = p.life;
    return p;
  }

  /**
   * A segment of light dissolving and streaming into the leaf.
   * Spawns at the segment and flies towards (tx, ty).
   */
  drawIn(x, y, tx, ty, height = 0) {
    const travel = 0.22 + Math.random() * 0.28;
    const vx = (tx - x) / travel;
    const vy = (ty - y) / travel;
    for (let i = 0; i < 2; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 12,
        vx: vx * 0.85 + (Math.random() - 0.5) * 70,
        vy: vy * 0.85 + (Math.random() - 0.5) * 70,
        drag: 0.5,
        life: travel,
        size: 1.5 + Math.random() * 2.4,
        color: `255, ${Math.round(226 + height * 22)}, ${Math.round(150 + height * 60)}`,
      });
    }
  }

  burst(x, y, count, color, speed = 260) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.25 + Math.random());
      this.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.7,
        size: 2 + Math.random() * 4,
        color,
        gravity: 420,
        drag: 2.2,
        additive: false,
      });
    }
  }

  update(dt) {
    for (const p of this.items) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const additive of [false, true]) {
      ctx.save();
      if (additive) ctx.globalCompositeOperation = 'lighter';
      for (const p of this.items) {
        if (p.life <= 0 || !!p.additive !== additive) continue;
        const t = p.life / p.maxLife;
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.fillStyle = `rgb(${p.color})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
