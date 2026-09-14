// Small math helpers shared across the game. All angles are radians.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** Frame-rate independent exponential approach of `a` towards `b`. */
export const approach = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

// --- deterministic noise -----------------------------------------------

function hash1(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Smooth 1D value noise in [0,1]. */
export function noise1(x) {
  const i = Math.floor(x);
  return lerp(hash1(i), hash1(i + 1), smoothstep(x - i));
}

/** Fractal value noise in [0,1]. */
export function fbm1(x, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// --- seeded RNG (mulberry32) -------------------------------------------

/** Returns a deterministic `() => [0,1)` generator. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rangeFrom = (rng, lo, hi) => lo + rng() * (hi - lo);
