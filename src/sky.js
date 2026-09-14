import { clamp, lerp, noise1, TAU } from './math.js';

// Sky colour stops keyed by altitude in pixels above sea level.
const BANDS = [
  { alt: -200, top: [186, 214, 226], bottom: [214, 226, 214] },
  { alt: 0,    top: [142, 196, 232], bottom: [206, 228, 220] },
  { alt: 1200, top: [ 76, 148, 214], bottom: [168, 208, 232] },
  { alt: 2800, top: [ 34,  84, 168], bottom: [110, 172, 218] },
  { alt: 5000, top: [ 14,  34,  90], bottom: [ 48, 100, 170] },
  { alt: 9000, top: [  6,  12,  38], bottom: [ 18,  44, 104] },
];

function bandColour(alt) {
  let i = 0;
  while (i < BANDS.length - 2 && alt > BANDS[i + 1].alt) i++;
  const a = BANDS[i];
  const b = BANDS[i + 1];
  const t = clamp((alt - a.alt) / (b.alt - a.alt), 0, 1);
  const mix = (p, q) => `rgb(${Math.round(lerp(p[0], q[0], t))},${Math.round(lerp(p[1], q[1], t))},${Math.round(lerp(p[2], q[2], t))})`;
  return { top: mix(a.top, b.top), bottom: mix(a.bottom, b.bottom) };
}

export function drawSky(ctx, cam, view) {
  const alt = -(cam.y + view.h * 0.5);
  const { top, bottom } = bandColour(alt);
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);

  // Stars fade in once the air gets thin.
  const starAlpha = clamp((alt - 2600) / 3200, 0, 0.85);
  if (starAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = starAlpha;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) {
      const sx = ((noise1(i * 3.1) * 2 - 0.5) * view.w * 1.6 - cam.x * 0.03) % (view.w + 40);
      const sy = (noise1(i * 7.7 + 40) * view.h * 0.75 - cam.y * 0.02) % (view.h * 0.8);
      const s = 0.6 + noise1(i * 1.3) * 1.3;
      ctx.beginPath();
      ctx.arc((sx + view.w + 40) % (view.w + 40), (sy + view.h) % view.h, s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawSun(ctx, cam, view, time) {
  // Barely parallaxes — it is a very long way off.
  const x = view.w * 0.76 - cam.x * 0.012;
  const y = view.h * 0.15 - cam.y * 0.035;
  const R = 300;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x, y, 0, x, y, R);
  halo.addColorStop(0, 'rgba(255,248,214,0.42)');
  halo.addColorStop(0.10, 'rgba(255,232,168,0.22)');
  halo.addColorStop(0.35, 'rgba(255,214,132,0.07)');
  halo.addColorStop(1, 'rgba(255,206,120,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,252,236,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 26 + Math.sin(time * 0.8) * 1.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawClouds(ctx, cam, view, time) {
  const layers = [
    { parallax: 0.10, y: -2600, scale: 2.6, alpha: 0.30, spacing: 1100 },
    { parallax: 0.24, y: -1100, scale: 1.8, alpha: 0.40, spacing: 900 },
    { parallax: 0.44, y: -300, scale: 1.2, alpha: 0.48, spacing: 780 },
  ];
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (const layer of layers) {
    const ox = -cam.x * layer.parallax + time * 6 * layer.parallax;
    const oy = -cam.y * layer.parallax + layer.y * (1 - layer.parallax);
    const first = Math.floor((-ox - 500) / layer.spacing);
    const count = Math.ceil(view.w / layer.spacing) + 3;
    for (let i = first; i < first + count; i++) {
      const cx = i * layer.spacing + ox + noise1(i * 2.3) * 300;
      const cy = oy + (noise1(i * 5.1 + 9) - 0.5) * 520;
      if (cy < -300 || cy > view.h + 300) continue;
      const s = layer.scale * (0.75 + noise1(i * 3.9) * 0.6);
      // One path per cloud so overlapping puffs do not stack up in alpha.
      ctx.globalAlpha = layer.alpha * (0.55 + noise1(i * 1.7) * 0.45);
      ctx.beginPath();
      for (let p = 0; p < 6; p++) {
        const px = cx + (p - 2.5) * 52 * s;
        const py = cy + Math.sin(p * 1.9 + i) * 14 * s;
        const taper = 1 - Math.abs(p - 2.5) / 3.6;
        ctx.ellipse(px, py, 70 * s * taper, 30 * s * taper, 0, 0, TAU);
      }
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Distant hill silhouettes, drawn in screen space with parallax. */
export function drawParallaxHills(ctx, cam, view) {
  const layers = [
    { parallax: 0.20, amp: 70, base: 0.70, colour: 'rgba(120,152,150,0.45)', wavelength: 520 },
    { parallax: 0.38, amp: 96, base: 0.78, colour: 'rgba(84,118,104,0.60)', wavelength: 380 },
    { parallax: 0.60, amp: 120, base: 0.86, colour: 'rgba(56,86,70,0.75)', wavelength: 300 },
  ];
  for (const layer of layers) {
    // Ranges sink out of frame as the leaf climbs.
    const yShift = -cam.y * layer.parallax * 0.85;
    const baseY = view.h * layer.base + yShift;
    if (baseY - layer.amp > view.h + 20) continue;
    ctx.beginPath();
    ctx.moveTo(-10, view.h + 10);
    for (let sx = -10; sx <= view.w + 10; sx += 14) {
      const wx = (sx + cam.x * layer.parallax) / layer.wavelength;
      ctx.lineTo(sx, baseY - (noise1(wx) + noise1(wx * 2.7) * 0.4) * layer.amp);
    }
    ctx.lineTo(view.w + 10, view.h + 10);
    ctx.closePath();
    ctx.fillStyle = layer.colour;
    ctx.fill();
  }
}

/** Drifting pollen in front of everything — cheap sense of speed. */
export function drawMotes(ctx, cam, view, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 44; i++) {
    const parallax = 0.55 + (i % 7) * 0.07;
    const span = view.w + 160;
    const drift = time * (14 + (i % 5) * 9);
    let x = (i * 137.5 - cam.x * parallax + drift) % span;
    if (x < 0) x += span;
    let y = (i * 91.7 - cam.y * parallax * 0.9 + Math.sin(time * 0.7 + i) * 26) % (view.h + 120);
    if (y < 0) y += view.h + 120;
    ctx.globalAlpha = 0.05 + ((i * 13) % 10) / 90;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(x - 80, y - 60, 0.8 + (i % 3) * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
