// Every tunable number lives here so the feel of the game can be dialled in
// from one place. World units are CSS pixels; y grows downward, sea level y=0.

export const PX_PER_M = 32;

/** Metres of distance at which the difficulty ramp tops out. */
export const RAMP_METRES = 3000;

export const PHYS = {
  gravity: 820,
  // Quadratic drag coefficients, picked so terminal fall speed is
  // 215 px/s gliding, 540 px/s tucked, 115 px/s spread wide.
  dragGlide: 0.01774,
  dragTuck: 0.00281,
  dragSpread: 0.06200,
  // Sideways acceleration the player commands by steering. Strong enough to
  // hold station inside a beam, at the cost of making no forward progress.
  steerGlide: 470,
  steerTuck: 760,
  steerSpread: 280,
  // How eagerly the leaf is carried along by the wind (1/s).
  sailGlide: 1.5,
  sailTuck: 0.85,
  sailSpread: 2.6,
  maxSpeed: 1600,
  // How fast tuck/spread inputs blend in and out.
  postureRate: 9,
};

export const LEAF = {
  radius: 13,
  drawScale: 1.9,
  // Natural flutter: a leaf never falls straight.
  flutterAccel: 210,
  flutterFreq: 1.9,
  spinRate: 2.6,
};

export const BEAM = {
  segments: 100,
  /** Segments absorbed per second while the leaf sits inside a beam. */
  absorbRate: 26,
  /** Upward impulse (px/s) granted by one segment. */
  liftPerSegment: 62,
  widthMin: 200,
  widthMax: 320,
  /** How far up and down the column the leaf can pull light in, in segments. */
  reach: 36,
  segHeightStart: 21,
  segHeightEnd: 13,
  gapStart: 640,
  gapEnd: 1500,
  gapJitter: 0.26,
  clearanceMin: 40,
  clearanceMax: 230,
  firstX: 560,
};

export const WIND = {
  base: 85,
  /** Extra px/s of tailwind per pixel of altitude. */
  perAltitude: 0.045,
  altitudeCap: 3000,
  gust: 45,
  gustRate: 0.22,
};

export const TERRAIN = {
  wavelength: 900,
  ampStart: 40,
  ampEnd: 190,
  /** World x before which the ground stays flat (the clearing round the tree). */
  flatUntil: 900,
};

export const TREE = {
  x: 60,
  height: 780,
  perchX: 150,
  perchY: -700,
};

export const CAMERA = {
  leadX: 0.34,
  anchorY: 0.45,
  /** Keep the horizon in view when the leaf is low. */
  groundBias: 0.78,
  followRate: 5.5,
};
