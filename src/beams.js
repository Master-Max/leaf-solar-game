import { BEAM, PX_PER_M, RAMP_METRES } from './config.js';
import { clamp, lerp, makeRng, rangeFrom } from './math.js';
import { groundY } from './terrain.js';

/**
 * A column of sunlight, sliced into BEAM.segments pieces stacked bottom-up.
 * Segment 0 sits at the bottom of the column. Segments are consumed on touch
 * and never come back, so every beam is a finite tank of lift.
 */
class Beam {
  constructor(x, width, segHeight, bottomY) {
    this.x = x;
    this.width = width;
    this.segHeight = segHeight;
    this.bottomY = bottomY;
    this.topY = bottomY - segHeight * BEAM.segments;
    this.alive = new Uint8Array(BEAM.segments).fill(1);
    this.remaining = BEAM.segments;
    // Per-beam phase so neighbouring columns do not shimmer in lockstep.
    this.phase = (x * 0.013) % Math.PI;
  }

  get spent() { return this.remaining === 0; }

  segmentCentreY(i) { return this.bottomY - (i + 0.5) * this.segHeight; }

  /** Index of the segment containing world y, or -1 if outside the column. */
  indexAt(y) {
    const i = Math.floor((this.bottomY - y) / this.segHeight);
    return i >= 0 && i < BEAM.segments ? i : -1;
  }

  /** Nearest still-lit segment to world y, searching outwards. `-1` if none near. */
  nearestLit(y, reach = BEAM.reach) {
    const centre = clamp(this.indexAt(y), 0, BEAM.segments - 1);
    if (this.indexAt(y) === -1) return -1;
    for (let d = 0; d <= reach; d++) {
      if (this.alive[centre - d]) return centre - d;
      if (this.alive[centre + d]) return centre + d;
    }
    return -1;
  }

  consume(i) {
    if (!this.alive[i]) return false;
    this.alive[i] = 0;
    this.remaining--;
    return true;
  }
}

/**
 * Streams beams in ahead of the camera and drops them once they are behind.
 * Seeded, so a run can be replayed exactly by reusing the seed.
 */
export class BeamField {
  constructor(seed = (Math.random() * 1e9) | 0) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.beams = [];
    this.nextX = BEAM.firstX;
  }

  /** Difficulty ramp 0..1 based on how far the run has travelled. */
  static ramp(x) { return clamp(x / PX_PER_M / RAMP_METRES, 0, 1); }

  spawnUpTo(x) {
    while (this.nextX < x) {
      const t = BeamField.ramp(this.nextX);
      const width = rangeFrom(this.rng, BEAM.widthMin, BEAM.widthMax);
      const segHeight = lerp(BEAM.segHeightStart, BEAM.segHeightEnd, t);
      const clearance = rangeFrom(this.rng, BEAM.clearanceMin, BEAM.clearanceMax);
      this.beams.push(new Beam(this.nextX, width, segHeight, groundY(this.nextX) - clearance));

      const gap = lerp(BEAM.gapStart, BEAM.gapEnd, t);
      const jitter = 1 + (this.rng() * 2 - 1) * BEAM.gapJitter;
      this.nextX += gap * jitter;
    }
  }

  prune(x) {
    while (this.beams.length && this.beams[0].x < x) this.beams.shift();
  }

  update(cam, view) {
    this.spawnUpTo(cam.x + view.w * 2.2);
    this.prune(cam.x - view.w);
  }

  /** The beam the leaf is currently inside, if any. */
  beamAt(x, radius) {
    for (const beam of this.beams) {
      if (beam.spent) continue;
      if (Math.abs(x - beam.x) < beam.width * 0.5 + radius * 0.55) return beam;
    }
    return null;
  }

  /** First beam ahead of `x` with light left in it — used for the edge marker. */
  nextAhead(x) {
    for (const beam of this.beams) if (!beam.spent && beam.x > x) return beam;
    return null;
  }

  /**
   * Fills one vertical run of the shaft, dissolving the ends where the leaf
   * has bitten the column apart rather than leaving a hard rectangular hole.
   */
  static fillRun(ctx, x, width, yTop, yBottom, fadeTop, fadeBottom) {
    const STEPS = 5;
    const height = yBottom - yTop;
    const fade = Math.min(height * 0.5, 44);
    const top = fadeTop ? fade : 0;
    const bot = fadeBottom ? fade : 0;
    const base = ctx.globalAlpha;

    if (height - top - bot > 0) ctx.fillRect(x, yTop + top, width, height - top - bot);
    for (let k = 0; k < STEPS; k++) {
      const a = (k + 1) / (STEPS + 1);
      ctx.globalAlpha = base * a * a;
      const band = fade / STEPS;
      if (fadeTop) ctx.fillRect(x, yTop + fade - (k + 1) * band, width, band);
      if (fadeBottom) ctx.fillRect(x, yBottom - fade + k * band, width, band);
    }
    ctx.globalAlpha = base;
  }

  draw(ctx, cam, view, time) {
    const left = cam.x - 120;
    const right = cam.x + view.w + 120;
    const top = cam.y - 60;
    const bottom = cam.y + view.h + 60;

    for (const beam of this.beams) {
      if (beam.spent) continue;
      if (beam.x + beam.width < left || beam.x - beam.width > right) continue;
      if (beam.bottomY < top || beam.topY > bottom) continue;

      const half = beam.width * 0.5;
      // Walk only the segments that are on screen.
      const first = clamp(Math.floor((beam.bottomY - bottom) / beam.segHeight), 0, BEAM.segments - 1);
      const last = clamp(Math.ceil((beam.bottomY - top) / beam.segHeight), 0, BEAM.segments - 1);

      // Contiguous runs of lit segments, so an untouched column reads as one
      // solid shaft and every bite the leaf has taken shows as a clean gap.
      const runs = [];
      for (let i = first; i <= last; i++) {
        if (!beam.alive[i]) continue;
        let j = i;
        while (j + 1 <= last && beam.alive[j + 1]) j++;
        runs.push([i, j]);
        i = j;
      }
      if (!runs.length) continue;

      const body = ctx.createLinearGradient(beam.x - half, 0, beam.x + half, 0);
      body.addColorStop(0, 'rgba(255,224,150,0)');
      body.addColorStop(0.28, 'rgba(255,233,175,0.20)');
      body.addColorStop(0.5, 'rgba(255,248,218,0.34)');
      body.addColorStop(0.72, 'rgba(255,233,175,0.20)');
      body.addColorStop(1, 'rgba(255,224,150,0)');

      const coreW = half * 0.5;
      const core = ctx.createLinearGradient(beam.x - coreW, 0, beam.x + coreW, 0);
      core.addColorStop(0, 'rgba(255,226,150,0)');
      core.addColorStop(0.5, 'rgba(255,244,206,0.28)');
      core.addColorStop(1, 'rgba(255,226,150,0)');

      for (const [i, j] of runs) {
        const yTop = beam.bottomY - (j + 1) * beam.segHeight;
        const yBottom = beam.bottomY - i * beam.segHeight;
        // Only the ends that were cut get dissolved; the real top and bottom
        // of the column keep their own shape.
        const cutTop = j < BEAM.segments - 1;
        const cutBottom = i > 0;

        ctx.fillStyle = body;
        BeamField.fillRun(ctx, beam.x - half, beam.width, yTop, yBottom, cutTop, cutBottom);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = core;
        ctx.globalAlpha = 0.68 + 0.32 * Math.sin(time * 1.7 + i * 0.12 + beam.phase);
        BeamField.fillRun(ctx, beam.x - coreW, coreW * 2, yTop, yBottom, cutTop, cutBottom);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}
