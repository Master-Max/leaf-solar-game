import { BEAM, LEAF, PX_PER_M, TREE } from './config.js';
import { clamp, TAU } from './math.js';
import { createCamera } from './camera.js';
import { createLeaf, drawLeaf } from './leaf.js';
import { BeamField } from './beams.js';
import { Particles } from './particles.js';
import { drawGround, drawTree, groundY } from './terrain.js';
import { drawClouds, drawMotes, drawParallaxHills, drawSky, drawSun } from './sky.js';

const BEST_KEY = 'leaf-solar-game:best';

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* private mode */ }
}

export class Game {
  constructor({ ctx, view, input, audio, onStateChange }) {
    this.ctx = ctx;
    this.view = view;
    this.input = input;
    this.audio = audio;
    this.onStateChange = onStateChange || (() => {});
    this.camera = createCamera();
    this.particles = new Particles();
    this.time = 0;
    this.best = readBest();
    this.reset();
  }

  reset() {
    this.state = 'ready';
    this.leaf = createLeaf(TREE.perchX, TREE.perchY);
    this.beams = new BeamField();
    this.camera.reset(this.leaf, this.view);
    this.beams.update(this.camera, this.view);
    this.energy = 0;
    this.peakAltitude = -TREE.perchY;
    this.absorbTimer = 0;
    this.absorbTicks = 0;
    this.activeBeam = null;
    this.flash = 0;
    this.deathTimer = 0;
    this.final = null;
    this.lastScreenPos = { x: this.view.w * 0.34, y: this.view.h * 0.45 };
    this.onStateChange(this.state, this.stats);
  }

  get distance() { return Math.max(0, Math.round((this.leaf.x - TREE.perchX) / PX_PER_M)); }
  get altitude() { return Math.max(0, Math.round(-this.leaf.y / PX_PER_M)); }
  get stats() {
    return {
      distance: this.distance,
      energy: this.energy,
      altitude: this.altitude,
      peak: Math.round(this.peakAltitude / PX_PER_M),
      best: this.best,
    };
  }

  /** Stats for the end card: frozen at the moment of impact. */
  get result() { return this.final || { ...this.stats, record: false }; }

  launch() {
    if (this.state !== 'ready') return;
    this.state = 'flying';
    // The leaf simply lets go: at rest, flat, everything from here is the
    // player's doing.
    this.leaf.vx = 0;
    this.leaf.vy = 0;
    this.leaf.angle = 0;
    this.leaf.angularVel = 0;
    this.audio.detach();
    this.particles.burst(this.leaf.x, this.leaf.y, 10, '124,191,79', 120);
    this.onStateChange(this.state, this.stats);
  }

  die() {
    if (this.state !== 'flying') return;
    this.state = 'dying';
    this.deathTimer = 0;
    this.audio.crash();
    this.audio.silenceWind();
    this.particles.burst(this.leaf.x, groundY(this.leaf.x), 26, '150,190,110', 300);
    // Snapshot before the leaf slides on, so the end card matches the HUD.
    const record = this.distance > 0 && this.distance > this.best;
    this.final = { ...this.stats, record };
    if (record) {
      this.best = this.distance;
      writeBest(this.best);
      this.final.best = this.best;
    }
  }

  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 2.4);

    if (this.state === 'ready') {
      // Leaf waits on the branch, trembling in the breeze.
      this.leaf.x = TREE.perchX + Math.sin(this.time * 1.4) * 3;
      this.leaf.y = TREE.perchY + Math.sin(this.time * 1.9) * 2;
      this.leaf.angle = 0.2 + Math.sin(this.time * 1.1) * 0.25;
    } else if (this.state === 'flying') {
      const command = this.input.read(this.lastScreenPos);
      this.leaf.update(dt, command);
      this.harvest(dt);
      this.peakAltitude = Math.max(this.peakAltitude, -this.leaf.y);
      if (this.leaf.y >= groundY(this.leaf.x) - LEAF.radius * 0.4) this.die();
      this.audio.updateWind(this.leaf.speed);
    } else if (this.state === 'dying') {
      this.deathTimer += dt;
      this.leaf.x += this.leaf.vx * dt * 0.1;
      if (this.deathTimer > 0.8) {
        this.state = 'dead';
        this.onStateChange(this.state, this.result);
      }
    }

    this.camera.follow(this.leaf, this.view, dt);
    this.beams.update(this.camera, this.view);
    this.particles.update(dt);
    const screen = this.camera.toScreen(this.leaf.x, this.leaf.y);
    this.lastScreenPos = screen;
  }

  /** Eat light segments out of whichever beam the leaf is standing in. */
  harvest(dt) {
    const beam = this.beams.beamAt(this.leaf.x, LEAF.radius);
    if (!beam) {
      this.activeBeam = null;
      this.absorbTimer = 0;
      return;
    }
    if (beam !== this.activeBeam) {
      this.activeBeam = beam;
      if (beam.indexAt(this.leaf.y) !== -1) this.audio.enterBeam();
    }

    this.absorbTimer += dt;
    const interval = 1 / BEAM.absorbRate;
    let guard = 16;
    while (this.absorbTimer >= interval && guard-- > 0) {
      const i = beam.nearestLit(this.leaf.y);
      if (i < 0) {
        this.absorbTimer = 0;
        break;
      }
      beam.consume(i);
      this.absorbTimer -= interval;
      this.leaf.vy -= BEAM.liftPerSegment;
      this.leaf.charge = Math.min(1, this.leaf.charge + 0.3);
      this.energy++;
      this.flash = Math.min(1, this.flash + 0.12);
      this.particles.drawIn(
        beam.x + (Math.random() - 0.5) * beam.width * 0.7,
        beam.segmentCentreY(i),
        this.leaf.x, this.leaf.y,
        i / BEAM.segments,
      );
      // One chime per few segments, otherwise it turns into a buzz.
      if (this.absorbTicks++ % 3 === 0) this.audio.absorb(i / BEAM.segments);
    }
  }

  draw() {
    const { ctx, view, camera } = this;
    ctx.clearRect(0, 0, view.w, view.h);

    // Screen-space backdrop.
    drawSky(ctx, camera, view);
    drawSun(ctx, camera, view, this.time);
    drawClouds(ctx, camera, view, this.time);
    drawParallaxHills(ctx, camera, view);

    // World-space layer.
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawGround(ctx, camera, view);
    if (camera.x < TREE.x + 600) drawTree(ctx, this.time);
    this.beams.draw(ctx, camera, view, this.time);
    this.particles.draw(ctx);
    if (this.state !== 'dead') drawLeaf(ctx, this.leaf);
    ctx.restore();

    drawMotes(ctx, camera, view, this.time);
    this.drawBeamMarker();
    this.drawFlash();
  }

  /** Arrow at the screen edge pointing at the next unspent beam. */
  drawBeamMarker() {
    if (this.state !== 'flying') return;
    const beam = this.beams.nextAhead(this.leaf.x);
    if (!beam) return;
    const sx = beam.x - this.camera.x;
    if (sx < this.view.w - 60) return;

    const { ctx, view } = this;
    const sy = clamp(beam.segmentCentreY(0) - this.camera.y, 40, view.h - 40);
    const pulse = 0.55 + 0.35 * Math.sin(this.time * 4);
    ctx.save();
    ctx.translate(view.w - 26, sy);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd978';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = pulse * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Warm bloom around the edges while the leaf is drinking light. */
  drawFlash() {
    if (this.flash <= 0.01) return;
    const { ctx, view } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(
      this.lastScreenPos.x, this.lastScreenPos.y, 0,
      this.lastScreenPos.x, this.lastScreenPos.y, Math.max(view.w, view.h) * 0.75,
    );
    g.addColorStop(0, `rgba(255,232,160,${0.10 * this.flash})`);
    g.addColorStop(1, 'rgba(255,232,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }
}
