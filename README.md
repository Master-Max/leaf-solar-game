# Leaf on the Light

A small browser game. You are a leaf that has just let go of its branch. The air
is still, nothing is coming to help you, and the angle you hold the blade at is
the only say you get. Sunbeams stand in the air as columns of a hundred slivers
of light — touch one and you rise a little. Every sliver you swallow is gone for
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

How the leaf flies is decided entirely by the angle you hold it at. Held at a
fixed angle and dropped from rest, it settles into:

| Blade angle | Sink | Forward | |
|---|---|---|---|
| flat, from a standstill | 106 px/s | 0 | Straight down. Broadside to the air, no lift at all. |
| flat, once moving | **23 px/s** | 234 px/s | Best glide, better than **10:1**. Almost free distance. |
| 5° | 44 px/s | 332 px/s | Cruise. |
| 15° | 143 px/s | 498 px/s | Trading height for speed in a hurry. |
| 45° | 598 px/s | 592 px/s | Committed dive that still carries you sideways. |
| edge-on (perpendicular) | **1000 px/s** | 0 | Terminal velocity. Nothing to catch the air. |

Parallel to the ground still sinks least and perpendicular still sinks most, by
a factor of ten. The subtlety is that dead flat is a knife edge: with no forward
speed the blade is exactly broadside and makes no lift, but a quarter of a degree
of tilt is enough for the leaf to accelerate away into a 10:1 glide.

### Momentum and loops

Top speed is **1000 px/s** in a sustained edge-on dive (`PHYS.maxSpeed` caps it
at 1600 for safety, which normal flight never reaches). That is enough to fly
aerobatics — hold the turn at speed and the leaf comes all the way round:

| Entry speed | Loop time | Loop height | Speed kept |
|---|---|---|---|
| 300 px/s | 1.51 s | 67 px | 51% |
| 600 px/s | 1.42 s | 183 px | 62% |
| 1000 px/s | 1.40 s | 320 px | 61% |

Loops close from any entry speed above roughly 250 px/s, and three in a row is
comfortable. What makes this possible is lift: it acts *across* the airflow, so
it turns the leaf without spending its energy. A leaf that only had drag — every
force opposing motion — bleeds out and can never come round.

The force still reverses when you are **rising**: climbing a beam, the air
arrives from below, so the tilt that glided you east on the way down carries you
west on the way up. Getting height and getting distance want opposite hands.

Every metre you travel has to be bought with height you earned in a beam, but at
10:1 a little height buys a lot of ground.

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
src/config.js      every tunable number — flight model, beams, terrain
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
- `PHYS.lift`, `PHYS.dragMin` and `PHYS.dragSpan` are the whole flight model,
  all driven by angle of attack — the angle between the blade and the air
  actually flowing over it, not the blade's angle to the ground.
  - `dragMin` is drag edge-on to the flow. It alone sets top speed:
    `sqrt(gravity / dragMin)` is the terminal dive, currently 1000 px/s.
  - `dragMin + dragSpan` is drag broadside. `sqrt(gravity / (dragMin + dragSpan))`
    is the flat sink from a standstill, currently 106 px/s.
  - `PHYS.lift` decides how much energy survives a turn, and so whether loops
    close. Best glide works out near `lift / sqrt(dragMin * dragSpan) / 4`.
    Halve it and loops stop closing; raise it and the leaf glides forever.
- `PHYS.maxAngularVel` and `PHYS.angularRate` decide how quickly the player can
  change attitude — the only authority they have.
