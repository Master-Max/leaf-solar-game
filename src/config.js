// Every tunable number lives here so the feel of the game can be dialled in
// from one place. World units are CSS pixels; y grows downward, sea level y=0.

export const PX_PER_M = 32;

/** Metres of distance at which the difficulty ramp tops out. */
export const RAMP_METRES = 1200;

export const PHYS = {
  gravity: 410,
  // Thin-aerofoil model, driven by angle of attack: the angle between the
  // blade and the air actually flowing over it.
  //   drag  opposes the airflow,           Cd = dragMin + dragSpan * sin^2(a)
  //   lift  acts across it and turns you,  Cl = lift * sin(2a)
  // Edge-on to the flow (a = 0) there is almost nothing to slow the leaf, so it
  // builds speed; broadside (a = 90) drag peaks and lift vanishes, which is why
  // a leaf held flat still sinks slowest from a standstill.
  // Lift is what lets the leaf keep its energy through a turn, so this is the
  // number that decides whether a loop closes.
  lift: 0.040,
  dragMin: 0.00041,
  dragSpan: 0.03607,
  // Attitude control: the player commands a rotation rate, not a force.
  maxAngularVel: 5.0,
  angularRate: 14,
  steerRate: 16,
  maxSpeed: 1600,
};

export const LEAF = {
  radius: 13,
  drawScale: 1.9,
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
  segHeightEnd: 15,
  gapStart: 620,
  gapEnd: 1800,
  gapJitter: 0.26,
  clearanceMin: 40,
  clearanceMax: 230,
  firstX: 560,
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
