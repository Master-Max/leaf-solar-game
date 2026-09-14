import { clamp, fbm1, lerp } from './math.js';
import { TERRAIN, TREE, PX_PER_M, RAMP_METRES } from './config.js';

/** Ground height at world x. Flat around the tree, hillier the further you go. */
export function groundY(x) {
  const ramp = clamp(x / PX_PER_M / RAMP_METRES, 0, 1);
  const amp = lerp(TERRAIN.ampStart, TERRAIN.ampEnd, ramp);
  const settle = clamp((x - TERRAIN.flatUntil) / 600, 0, 1);
  const n = fbm1(x / TERRAIN.wavelength + 13.5, 4) - 0.5;
  return n * amp * 2 * settle;
}

export function drawGround(ctx, cam, view) {
  const step = 12;
  const left = cam.x - step;
  const right = cam.x + view.w + step;
  const bottom = cam.y + view.h;

  // Three stacked bands give the hill a bit of depth without any art assets.
  const bands = [
    { offset: 0, fill: '#41603a', top: 'rgba(150,200,110,.55)' },
    { offset: 26, fill: '#2f4a2c', top: null },
    { offset: 70, fill: '#1e3320', top: null },
  ];

  for (const band of bands) {
    ctx.beginPath();
    ctx.moveTo(left, bottom + 40);
    for (let x = left; x <= right; x += step) ctx.lineTo(x, groundY(x) + band.offset);
    ctx.lineTo(right, bottom + 40);
    ctx.closePath();
    ctx.fillStyle = band.fill;
    ctx.fill();

    if (band.top) {
      // Sunlit rim along the crest.
      ctx.beginPath();
      for (let x = left; x <= right; x += step) {
        if (x === left) ctx.moveTo(x, groundY(x));
        else ctx.lineTo(x, groundY(x));
      }
      ctx.strokeStyle = band.top;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

/** The tree the leaf starts on, drawn once at the left edge of the world. */
export function drawTree(ctx, time) {
  const baseY = groundY(TREE.x);
  ctx.save();
  ctx.translate(TREE.x, baseY);

  ctx.strokeStyle = '#3b2a1e';
  ctx.lineCap = 'round';

  // Trunk.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(10, -TREE.height * 0.4, -12, -TREE.height * 0.7, 4, -TREE.height);
  ctx.lineWidth = 34;
  ctx.stroke();

  const limbs = [
    { t: 0.52, dx: 150, dy: -110, w: 15 },
    { t: 0.66, dx: -120, dy: -90, w: 13 },
    { t: 0.80, dx: 130, dy: -70, w: 11 },
    { t: 0.90, dx: -90, dy: -60, w: 9 },
  ];
  for (const limb of limbs) {
    const y0 = -TREE.height * limb.t;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(limb.dx * 0.5, y0 - 10, limb.dx, y0 + limb.dy);
    ctx.lineWidth = limb.w;
    ctx.stroke();
  }

  // Canopy: clumps of foliage that sway gently.
  for (let i = 0; i < 120; i++) {
    const a = i * 2.39996;
    const r = 26 + Math.sqrt(i) * 17;
    const cx = Math.cos(a) * r * 1.15 + Math.sin(time * 0.6 + i) * 3;
    const cy = -TREE.height * 0.78 + Math.sin(a) * r * 0.62 + Math.cos(time * 0.5 + i) * 3;
    if (cy > -TREE.height * 0.3) continue;
    const shade = 0.55 + ((i * 37) % 100) / 220;
    ctx.fillStyle = `rgb(${Math.round(78 * shade)}, ${Math.round(150 * shade)}, ${Math.round(62 * shade)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 17, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
