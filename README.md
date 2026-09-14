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
| `A` `D` / `←` `→` | Turn the blade. **That is the only control.** |
| `R` | Restart |
| `M` | Mute |

Touch works too: drag left or right to turn the blade.

How the leaf flies is decided entirely by the angle you hold it at:

| Blade angle | Sink | What it is good for |
|---|---|---|
| flat (parallel to the ground) | 150 px/s | Hanging in the air. The wind slides past an edge-on blade, so you drift but slowly. |
| tilted ~15° | 186 px/s | Best glide — 1.1 forward for every 1 down. This is how you cross a gap. |
| tilted 45° | 422 px/s | Committed descent that still carries you sideways. |
| edge-on (perpendicular) | 561 px/s | Nothing to catch the air. You drop like a stone — and inside a beam you climb like one. |

Tilt right and you glide east with the wind; tilt left and you claw your way
west against it, paying for it in altitude. The force always acts along the
blade's face, which is why a tilted leaf is pushed sideways as well as up.

The tension is that the wind is always pushing you east, so holding station
inside a beam long enough to drain it costs you distance. Going edge-on
multiplies your climb rate inside the light, but the same angle makes you fall
like a stone the moment you leave it.

## Running it locally

Plain ES modules, no build step and no dependencies — but browsers refuse to load
modules over `file://`, so serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages.
Pages has to be switched on once, by hand:

> **Settings → Pages → Build and deployment → Source: GitHub Actions**

This step cannot be automated: a workflow's `GITHUB_TOKEN` is allowed to deploy
to an existing Pages site but not to create one, so `configure-pages` fails with
*Resource not accessible by integration* until someone with admin on the
repository flips that switch.

After that the workflow runs on every push to the branches listed in its `on:`
block, and can also be started from the Actions tab via *Run workflow*.

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
- `PHYS.faceDrag` and `PHYS.edgeDrag` are the whole flight model. Force is
  computed against the air (not the ground) and applied along the blade's
  normal, so glide, sink, and how hard the wind shoves you all fall out of the
  one angle. The ratio between them sets the spread of sink rates; the absolute
  values set the speeds (`sqrt(gravity / coefficient)` is the terminal sink).
- `PHYS.maxAngularVel` and `PHYS.angularRate` decide how quickly the player can
  change attitude — the only authority they have.
