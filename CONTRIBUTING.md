# Contributing to Road Rage

Welcome! This guide covers everything you need to add new content, fix bugs, and keep the codebase healthy.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Branch & PR Workflow](#2-branch--pr-workflow)
3. [Code Style](#3-code-style)
4. [Adding a New Track](#4-adding-a-new-track-checklist)
5. [Adding a New Car](#5-adding-a-new-car-checklist)
6. [Adding a New Feature](#6-adding-a-new-feature)
7. [Testing Expectations](#7-testing-expectations)
8. [Known Gotchas](#8-known-gotchas)

---

## 1. Project Setup

```bash
cd neon-circuit
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm test           # Vitest unit tests
npm run lint       # ESLint
npm run build      # Production bundle (only when validating a release)
```

**Node version:** 18 or higher.

---

## 2. Branch & PR Workflow

| Action | Convention |
|--------|------------|
| New track | `feat/track-<name>` |
| New car | `feat/car-<name>` |
| Bug fix | `fix/<short-description>` |
| Refactor | `refactor/<scope>` |
| Docs | `docs/<scope>` |

- Open a PR against `main`.
- Include a brief description of what changed and why.
- If you changed physics constants, describe the before/after feel difference.
- Screenshots or a short screen-recording are welcome for visual changes.

---

## 3. Code Style

ESLint enforces most of this automatically (`npm run lint`):

- **`const` first** — use `let` only when the variable is reassigned.
- **No `var`.**
- **Single quotes** for strings.
- **Trailing commas** in multi-line arrays/objects.
- **Semicolons** required.
- **Arrow functions** for callbacks.

File-level conventions:
- Every file starts with a JSDoc comment block explaining its responsibility.
- Use `@param` and `@returns` JSDoc on exported functions.
- Internal helpers go after the last export, separated by a `// ─── Private` comment.

---

## 4. Adding a New Track — Checklist

Estimated time: ~30–60 min for a first track.

```
□  1. Copy src/content/tracks/_template/ → src/content/tracks/your-track-name/
□  2. Edit track.js:
       - Set controlPoints (8–14 THREE.Vector3 on Y=0)
       - Set roadWidth (default: 13)
       - Set boostPadIndices (5 entries recommended, evenly spaced)
□  3. Edit scenery.js (optional but recommended for visual identity)
□  4. Register in src/content/tracks/index.js:
       'your-track-name': () => import('./your-track-name/track.js'),
□  5. Test: change loadTrack('sunset-grid') in src/main.js to your ID
□  6. Verify boost pads light up correctly (check track indices)
□  7. Play 3 laps to confirm the AI finishes and lap counting works
□  8. Revert main.js change (track selection UI is a future feature)
```

> **Spline tips:**  
> Keep the last control point 10–30 world units from the first to avoid a sharp join kink. All points should be on Y=0 unless you want elevation changes (currently unsupported by the physics boundary clamping).

---

## 5. Adding a New Car — Checklist

Estimated time: ~15–30 min.

```
□  1. Copy src/content/cars/_template/ → src/content/cars/your-car-name/
□  2. Edit car.js:
       - Set id to match the folder name
       - Adjust shellScale / canopyScale for body proportions
       - Adjust wheelPositions (x=track width, y≈0.44, z=wheelbase)
□  3. Edit stats.js to tune physics feel (see tuning guide inside the file)
□  4. Register in src/content/cars/index.js:
       'your-car-name': () => import('./your-car-name/car.js'),
□  5. Test by loading it in src/main.js:
       const playerCarDef = await loadCar('your-car-name');
□  6. Check that wheels are positioned correctly (not floating/clipping)
□  7. Check that drifting and boost feel appropriate for the stats you chose
```

---

## 6. Adding a New Feature

For features that touch engine code (`core/`, `physics/`, `race/`):

1. Read the existing module thoroughly before editing.
2. Keep each module's responsibility narrow — if a function doesn't fit, it probably belongs in a new file.
3. If you change public function signatures, update all call sites in `main.js`.
4. Add unit tests for any pure-logic function (see `tests/`).

For UI features (`ui/`):
- DOM reads happen **once** in `init*()` functions; cache references.
- `update*()` functions are called **every frame** — no allocations, no DOM queries inside them.

---

## 7. Testing Expectations

Unit tests live in `tests/` and run with Vitest:

- **Pure logic modules** (ranking.js, physics helpers) — must have tests.
- **Three.js / DOM dependent modules** — integration-tested manually for now.
- Run `npm test` before every PR. A failing test blocks merge.

To add a test file:

```js
// tests/my-module.test.js
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/path/to/my-module.js';

describe('myFunction', () => {
  it('does the right thing', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

---

## 8. Known Gotchas

> These are lessons learned from building the original 1741-line script. Don't repeat them.

### `crossedHalfway` flag (lap counting)
Cars increment their lap counter only when they cross sample index ~0 **after** having passed the halfway marker (~sample 240). Without this guard, a car spawned near index 0 would count an immediate lap. AI cars are initialised with `crossedHalfway = true` because they spawn at high sample indices — this is intentional, not a bug.

### AI car `lap` initialises to `0`, player to `1`
The AI starts at `lap: 0` so that its first legitimate crossing of the finish line sets it to `lap: 1`. The player starts at `lap: 1`. Mixing these up breaks ranking.

### Mobile caching (the rename-to-v6 problem)
Vite's hashed filenames (`assets/[name].[hash].js`) solve this automatically. Never manually rename files to bust cache — use `npm run build` and let the hash change.

### `screen.orientation.lock()` on iOS
iOS Safari rejects `screen.orientation.lock('landscape')` silently. The `initOverlay()` function catches this and falls through to a "rotate device" prompt. Do not await this call without a `try/catch`.

### Audio autoplay policy
`initAudio()` must be called inside a user gesture handler (the start button click). Calling it on page load will fail on all modern browsers with no error thrown.

### Mobile viewport height
Use `100dvh` (not `100vh`) for the canvas and overlay. On mobile, `100vh` includes the browser chrome and causes layout overflow.
