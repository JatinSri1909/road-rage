# AGENTS.md — AI Agent Context for Road Rage

This file is the primary context document for AI coding agents (Copilot, Claude, Gemini, etc.).
Read this before touching any code. It tells you where things live, which files are safe to edit,
and the exact patterns to follow so you don't break the game.

---

## Repo Layout (Quick Reference)

```
neon-circuit/
├── src/
│   ├── main.js              ← Bootstrap wiring ONLY. Don't add logic here.
│   ├── core/                ← Engine internals. Edit carefully.
│   │   ├── renderer.js      ← WebGLRenderer init + resize
│   │   ├── scene.js         ← THREE.Scene, fog, sky/env textures, sun
│   │   ├── camera.js        ← Follow camera + shake
│   │   ├── loop.js          ← requestAnimationFrame, delta-time cap
│   │   ├── audio.js         ← Dual-oscillator engine sound
│   │   └── device.js        ← Mobile detection + body class
│   ├── physics/             ← Physics math. Edit carefully.
│   │   ├── vehicle-physics.js  ← Player velocity-vector model
│   │   └── collision.js        ← Car-car push-apart + boost pad hit
│   ├── race/                ← Race rules. Relatively safe to edit.
│   │   ├── race-state.js    ← Lap counter, timer, finish detection
│   │   ├── ranking.js       ← computeRank, isBetter, ordinal (pure, tested)
│   │   ├── ai-driver.js     ← AI behavior per frame
│   │   └── countdown.js     ← 3-2-1-GO! sequence
│   ├── entities/            ← Reusable game objects.
│   │   ├── car.js           ← Car mesh builder + state factory
│   │   └── track-builder.js ← Builds road mesh from a TrackDefinition
│   ├── content/             ← WHERE NEW CONTENT GOES. Safe to add files here.
│   │   ├── tracks/
│   │   │   ├── index.js     ← Registry (add new track: 1 line here)
│   │   │   ├── sunset-grid/ ← Existing track: track.js + scenery.js
│   │   │   └── _template/   ← Copy this for a new track
│   │   └── cars/
│   │       ├── index.js     ← Registry (add new car: 1 line here)
│   │       ├── phoenix-gt/  ← Existing car: car.js + stats.js
│   │       └── _template/   ← Copy this for a new car
│   ├── ui/
│   │   ├── hud.js           ← Frame-level HUD updates (lap, speed, nitro)
│   │   ├── minimap.js       ← Canvas 2D minimap
│   │   ├── overlay.js       ← Start screen + mobile fullscreen logic
│   │   └── controls/
│   │       ├── keyboard-input.js   ← Arrow/WASD/Shift/Space bindings
│   │       ├── touch-joystick.js   ← Virtual joystick (relative-delta)
│   │       ├── action-buttons.js   ← Drift + nitro mobile buttons
│   │       └── steering-wheel.js   ← Gyroscope steering (TODO)
│   ├── effects/
│   │   ├── particles.js     ← Sprite particle pool (smoke, sparks)
│   │   └── textures.js      ← Procedural canvas textures (sky, sun, glow)
│   └── styles/
│       └── main.css         ← All game CSS (migrated from styles.css)
├── tests/
│   ├── ranking.test.js      ← Vitest tests for ranking.js
│   └── vehicle-physics.test.js ← Vitest tests for nearestSampleIdx
├── AGENTS.md                ← You are here
├── CONTRIBUTING.md          ← Human contributor guide
├── package.json
├── vite.config.js
└── .eslintrc.cjs
```

---

## Hot vs Cold Files

| Temperature | Files | Meaning |
|-------------|-------|---------|
| 🔥 Hot (safe to edit freely) | `content/tracks/*`, `content/cars/*`, `ui/hud.js`, `ui/minimap.js`, `race/ranking.js`, `race/ai-driver.js`, `race/countdown.js` | These are extension points. Changes here are isolated and easy to verify. |
| 🌡 Warm (edit with care) | `race/race-state.js`, `entities/car.js`, `entities/track-builder.js`, `ui/overlay.js`, `ui/controls/*` | Touch these only when necessary. Read the whole file before changing it. |
| 🧊 Cold (high risk, rarely change) | `core/*`, `physics/*`, `main.js` | Engine internals. A subtle change here can break physics, rendering, or audio. Always run the full game after edits. |

---

## Adding a New Track (Exact Pattern)

1. **Copy** `src/content/tracks/_template/` → `src/content/tracks/your-track-name/`
2. **Edit** `track.js`:
   ```js
   const yourTrack = {
     controlPoints: [ /* 8–14 THREE.Vector3 on Y=0 */ ],
     tension:        0.5,
     roadWidth:      13,
     samples:        480,
     boostPadIndices: [60, 150, 240, 330, 420],
   };
   export default yourTrack;
   ```
3. **Register** in `src/content/tracks/index.js`:
   ```js
   'your-track-name': () => import('./your-track-name/track.js'),
   ```
4. That's it. No engine code changes needed.

---

## Adding a New Car (Exact Pattern)

1. **Copy** `src/content/cars/_template/` → `src/content/cars/your-car-name/`
2. **Edit** `car.js` (mesh geometry) and `stats.js` (physics numbers).
3. **Register** in `src/content/cars/index.js`:
   ```js
   'your-car-name': () => import('./your-car-name/car.js'),
   ```
4. That's it.

---

## Key Invariants — Don't Break These

### 1. `crossedHalfway` flag
A lap increment only fires when `car.crossedHalfway === true`.
This flag is set when the car passes sample indices between `SAMPLES * 0.4` and `SAMPLES * 0.6`.
**AI cars initialise with `crossedHalfway = true`** because they spawn at high sample indices (behind the start line). Player initialises with `crossedHalfway = false`.

### 2. AI `lap` starts at `0`, player at `1`
When an AI car's first lap crossing happens, it increments from 0 → 1 (matching the player's start). Changing this breaks ranking from frame 1.

### 3. `progress` formula
```js
car.progress = (car.lap - 1) * SAMPLES + displayIdx;
```
`ranking.js` sorts cars by this number. Do not change the formula without updating tests.

### 4. HUD updates are per-frame — no allocations inside `updateHUD()`
DOM element references are cached once in `initHUD()`. The update function must not call `document.getElementById()` or create objects.

### 5. Audio must be initialised inside a user gesture
`initAudio()` in `core/audio.js` must be called from a click/touch handler. Calling it on page load silently fails.

### 6. `main.js` is wiring only
`src/main.js` contains zero game logic — only import/init calls in dependency order. If you find yourself adding logic to main.js, it belongs in a dedicated module instead.

---

## Data Flow Diagram

```
User Input (keyboard / joystick / buttons)
       ↓
  input object (plain JS object mutated in-place)
       ↓
  vehicle-physics.js → mutates player.pos, player.heading, player.velocity
  ai-driver.js       → mutates each aiCar.pos, aiCar.heading, aiCar.speed
       ↓
  collision.js       → resolves overlapping car positions
       ↓
  race-state.js      → updateLapProgress() → updates car.lap, car.progress
                     → checkFinish()       → triggers finish screen
       ↓
  hud.js / minimap.js → reads car state, writes DOM
  camera.js           → reads player.pos, writes camera position
  audio.js            → reads player.speed, writes AudioContext params
       ↓
  renderer.render(scene, camera)   ← called once per frame in loop.js
```

---

## Tricky Spots with Context

### Rubber-band tuning (`race/ai-driver.js`)
```js
const rubber = THREE.MathUtils.clamp(1 + gap / 1400, 1.0, 1.15);
```
`gap = player.progress - car.progress`. The `/1400` divisor was arrived at empirically: below `/1000` the AI feels magnetically attracted to the player; above `/2000` they fall too far behind on long straights. Don't blindly tighten this.

### Joystick drift vs steer axis (`ui/controls/touch-joystick.js`)
```js
input.steer = -normX;   // negative because left = negative X in canvas space
```
The sign flip is intentional. Left on the joystick should steer left in the game world.

### Track boundary clamping (`physics/vehicle-physics.js`)
```js
const maxLat = ROAD_W / 2 - 1.1;
```
The `1.1` is the car half-width buffer. Reducing it causes visual clipping with the guardrail. Increasing it makes the track feel wider than it is.

### Boost pad flag reset window (`physics/collision.js`)
```js
if (diff < 4)  { if (!car.padFlags[pi]) applyBoostPad(car); }
if (diff > 10) { car.padFlags[pi] = false; }
```
The asymmetric window (4 to enter, 10 to exit) prevents double-triggering when the car is near the boundary. Keep the exit threshold at least 2× the enter threshold.

---

## Running Tests

```bash
npm test                 # run all tests once
npm test -- --watch     # watch mode during development
npm run lint             # check code style
```

Tests live in `tests/`. Every pure-function module should have a test file. The test runner is Vitest — syntax is identical to Jest.

---

## What Needs Doing (Future Work)

If you're an AI agent looking for an unambiguous next task, these are well-scoped:

- [ ] **Track select UI** — a pre-race menu that calls `getTrackIds()` from `content/tracks/index.js` and lets the player pick a circuit.
- [ ] **Car select UI** — same pattern, calls `getCarIds()` from `content/cars/index.js`.
- [ ] **Gyroscope steering** — implement `steering-wheel.js` (skeleton already in place, see the file for implementation notes).
- [ ] **Second track** — copy `_template/`, design a new spline, register it. A good test of the content system.
- [ ] **Lap times / best lap** — `race-state.js` already tracks `raceTime`; add per-lap splits.
- [ ] **Sound design pass** — `core/audio.js` uses a simple oscillator pair. A second pass with a noise layer for wheel-spin would improve feel.
