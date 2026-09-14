import { clamp } from './math.js';

/**
 * Normalises keyboard, mouse and touch into three analogue axes:
 *   steer  -1 (left) .. 1 (right)
 *   tuck    0 .. 1   curl up: fast, streamlined, sharp steering
 *   spread  0 .. 1   flatten out: draggy, floaty, carried by the wind
 */
export function createInput(canvas) {
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };
  const listeners = { start: [], restart: [], mute: [] };

  const emit = (name) => listeners[name].forEach((fn) => fn());
  const held = (...codes) => codes.some((c) => keys.has(c));

  addEventListener('keydown', (e) => {
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    keys.add(e.code);
    if (e.code === 'KeyM') emit('mute');
    if (e.code === 'KeyR') emit('restart');
    if (e.code === 'Space' || e.code === 'Enter') emit('start');
    // Stop the page from scrolling under the canvas.
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    pointer.active = false;
  });

  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    pointer.active = true;
    setPointer(e);
    emit('start');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointer.active) setPointer(e);
  });
  const release = () => { pointer.active = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    on(name, fn) { listeners[name].push(fn); },

    /**
     * @param {{x:number,y:number}} leafScreenPos where the leaf is drawn, so
     *   pointer input can be read as "lean towards my finger".
     */
    read(leafScreenPos) {
      let steer = 0;
      if (held('ArrowLeft', 'KeyA')) steer -= 1;
      if (held('ArrowRight', 'KeyD')) steer += 1;
      let tuck = held('ArrowDown', 'KeyS') ? 1 : 0;
      let spread = held('ArrowUp', 'KeyW', 'Space') ? 1 : 0;

      if (pointer.active && leafScreenPos) {
        const dx = (pointer.x - leafScreenPos.x) / 190;
        const dy = (pointer.y - leafScreenPos.y) / 190;
        steer = clamp(steer + dx, -1, 1);
        if (dy > 0) tuck = Math.max(tuck, clamp(dy, 0, 1));
        else spread = Math.max(spread, clamp(-dy, 0, 1));
      }

      // Tuck and spread are opposites; whichever is stronger wins.
      if (tuck > 0 && spread > 0) {
        const net = tuck - spread;
        tuck = Math.max(0, net);
        spread = Math.max(0, -net);
      }
      return { steer: clamp(steer, -1, 1), tuck, spread };
    },
  };
}
