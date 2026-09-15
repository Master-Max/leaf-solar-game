import { Game } from './game.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const overlay = document.getElementById('overlay');
const card = document.getElementById('card');
const hud = document.getElementById('hud');
const muteLabel = document.getElementById('mute');
const readout = {
  dist: document.getElementById('hud-dist'),
  energy: document.getElementById('hud-energy'),
  alt: document.getElementById('hud-alt'),
  speed: document.getElementById('hud-speed'),
};

const view = { w: 0, h: 0 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = canvas.clientWidth;
  view.h = canvas.clientHeight;
  canvas.width = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const audio = createAudio();

// --- overlay cards ------------------------------------------------------

const CONTROLS = `
  <div class="keys">
    <div><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd></div><div>Turn the blade. That is the only control.</div>
    <div>flat</div><div>Broadside to the air — the slowest way down, but it takes you nowhere</div>
    <div>tilted</div><div>The face pushes sideways as well as down: this is your glide</div>
    <div>edge&#8209;on</div><div>Nothing to catch the air — you drop like a stone, and climb like one inside a beam</div>
    <div>rising</div><div>The air now comes from below, so the same tilt carries you the <em>other</em> way</div>
    <div><kbd>R</kbd></div><div>Restart &nbsp;·&nbsp; <kbd>M</kbd> mute</div>
  </div>`;

function readyCard() {
  return `
    <h1>Leaf on the Light</h1>
    <p class="tag">The air is still and nothing is coming to help you.<br>
      Sunbeams are stacks of a hundred slivers of light — drink one and you rise a little.
      Every sliver you swallow is gone for good, and the angle you hold the blade at
      is the only say you get.</p>
    ${CONTROLS}
    <button class="cta" id="go">Let go of the branch</button>
    <p class="note">Touch works too: drag left or right to turn the blade.</p>`;
}

function deadCard(s) {
  const record = !!s.record;
  return `
    <h1>${record ? 'Furthest yet' : 'Grounded'}</h1>
    <p class="tag">${record ? 'Nothing has ever glided this far.' : 'The ground found you. Try a different line.'}</p>
    <div class="scores">
      <div class="stat"><b>${s.distance}</b><span>metres</span></div>
      <div class="stat gold"><b>${s.energy}</b><span>light</span></div>
      <div class="stat"><b>${s.peak}</b><span>peak</span></div>
    </div>
    <button class="cta" id="go">Fall again</button>
    <p class="note">Best: ${s.best} m &nbsp;·&nbsp; press <kbd>R</kbd> or <kbd>space</kbd></p>`;
}

const game = new Game({ ctx, view, input, audio, onStateChange: render });
// Handy for tuning from the devtools console: __game.leaf, __game.beams, ...
window.__game = game;

function render(state, stats) {
  const inFlight = state === 'flying' || state === 'dying';
  overlay.hidden = inFlight;
  hud.classList.toggle('on', inFlight);
  if (inFlight) return;
  card.innerHTML = state === 'dead' ? deadCard(stats) : readyCard();
  card.querySelector('#go')?.addEventListener('click', (e) => {
    e.stopPropagation();
    begin();
  });
}

function begin() {
  audio.unlock();
  if (game.state === 'ready') game.launch();
  else if (game.state === 'dead') {
    game.reset();
    game.launch();
  }
}

overlay.addEventListener('pointerdown', () => begin());
input.on('start', begin);
input.on('restart', () => {
  if (game.state === 'flying' || game.state === 'dying') {
    game.reset();
    game.launch();
  } else begin();
});
input.on('mute', () => {
  audio.unlock();
  muteLabel.textContent = audio.toggleMute() ? 'M · sound off' : 'M · sound on';
});

render(game.state, game.stats);

// --- main loop ----------------------------------------------------------

const STEP = 1 / 120;
let accumulator = 0;
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  // Clamp so a backgrounded tab does not fast-forward the whole run.
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  accumulator += elapsed;

  let steps = 0;
  while (accumulator >= STEP && steps++ < 40) {
    game.update(STEP);
    accumulator -= STEP;
  }

  game.draw();

  if (game.state === 'flying') {
    const s = game.stats;
    readout.dist.textContent = s.distance;
    readout.energy.textContent = s.energy;
    readout.alt.textContent = s.altitude;
    readout.speed.textContent = Math.round(Math.hypot(game.leaf.vx, game.leaf.vy));
  }
}
requestAnimationFrame(frame);
