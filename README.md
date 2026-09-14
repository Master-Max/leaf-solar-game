# Leaf on the Light

A small browser game. You are a leaf that has just let go of its branch, and the
wind is going east. Sunbeams stand in the air as columns of a hundred slivers of
light — touch one and you rise a little. Every sliver you swallow is gone for
good, so a beam is a finite tank of lift that you burn a hole through as you climb.

Stay off the ground for as long as you can.

**Play:** <https://master-max.github.io/leaf-solar-game/>

## Controls

| | |
|---|---|
| `A` `D` / `←` `→` | Lean left and right |
| `S` / `↓` | **Tuck** — dive fast, steer sharply, rocket up a beam |
| `W` / `space` | **Spread** — hang in the air and let the wind carry you |
| `R` | Restart |
| `M` | Mute |

Touch works too: drag to lean, drag down to tuck, drag up to spread.

The tension is that the wind is always pushing you east, so holding station
inside a beam long enough to drain it costs you distance. Tucking triples your
climb rate but makes you fall like a stone the moment you leave the light.

## Running it locally

Plain ES modules, no build step and no dependencies — but browsers refuse to load
modules over `file://`, so serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages. It
passes `enablement: true` to `actions/configure-pages`, so the first run switches
Pages on by itself — no visit to Settings required. After that it runs on every
push to the branches listed in its `on:` block, and can also be started from the
Actions tab via *Run workflow*.

## Layout

```
index.html         canvas, HUD and the start/end cards
src/config.js      every tunable number — flight model, beams, wind, terrain
src/game.js        state machine, beam harvesting, draw order
src/leaf.js        leaf physics and the vector leaf
src/beams.js       light columns: segments, streaming, rendering
src/terrain.js     procedural ground and the starting tree
src/sky.js         sky gradient, sun, clouds, parallax ranges, pollen
src/camera.js      follow camera
src/particles.js   fixed-capacity particle pool
src/input.js       keyboard / mouse / touch → steer, tuck, spread
src/audio.js       WebAudio synth — no audio files
src/math.js        clamp/lerp, value noise, seeded RNG
```

`window.__game` is exposed in the console for poking at a live run
(`__game.leaf`, `__game.beams.beams`, `__game.energy`).

### Tuning

Almost everything worth changing lives in `src/config.js`:

- `BEAM.absorbRate` × `BEAM.liftPerSegment` is the upward acceleration a beam
  applies (currently 1612 px/s² against 820 px/s² of gravity).
- `BEAM.reach` is how far up and down a column the leaf can pull light in. It is
  deliberately large, so the beam dissolves around the leaf instead of only
  directly under it.
- `PHYS.drag*` are quadratic coefficients chosen from terminal speeds: 215 px/s
  gliding, 540 tucked, 115 spread.
- `PHYS.steer*` against `PHYS.sail*` decides whether the player can hold station
  in a beam against the wind. They currently can, at the cost of forward speed.
