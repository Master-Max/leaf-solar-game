import { approach } from './math.js';
import { CAMERA } from './config.js';
import { groundY } from './terrain.js';

export function createCamera() {
  return {
    x: 0,
    y: 0,
    /** Snap straight to the target — used when a run starts. */
    reset(leaf, view) {
      const t = target(leaf, view);
      this.x = t.x;
      this.y = t.y;
    },
    follow(leaf, view, dt) {
      const t = target(leaf, view);
      this.x = approach(this.x, t.x, CAMERA.followRate * 1.6, dt);
      this.y = approach(this.y, t.y, CAMERA.followRate, dt);
    },
    toScreen(x, y) {
      return { x: x - this.x, y: y - this.y };
    },
  };
}

function target(leaf, view) {
  const x = leaf.x - view.w * CAMERA.leadX;
  // Follow the leaf, but never so high that the ground leaves the frame.
  const floor = groundY(leaf.x) - view.h * CAMERA.groundBias;
  const y = Math.min(leaf.y - view.h * CAMERA.anchorY, floor);
  return { x, y };
}
