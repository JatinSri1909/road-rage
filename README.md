# Road Rage

A mobile-first 3D browser racing game built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/).

Race 3 laps against 3 AI opponents on a sunset synthwave circuit. Drift through corners, hit boost pads, and use your nitro at the right moment.

---

## Quick Start

```bash
npm install
npm run dev      # → http://localhost:5173
```

**Desktop controls:** Arrow keys / WASD · Shift = drift · Space = nitro  
**Mobile:** Virtual joystick + Drift/NOS buttons · Landscape mode required

---

## Project Structure

```
src/
├── core/        Engine (renderer, scene, camera, audio, loop)
├── physics/     Vehicle physics and collision
├── race/        Race rules, AI, lap counting, countdown
├── entities/    Car mesh + state factory, track mesh builder
├── content/     ← Add new tracks and cars here
│   ├── tracks/  One folder per track + index.js registry
│   └── cars/    One folder per car + index.js registry
├── ui/          HUD, minimap, overlay, touch/keyboard controls
├── effects/     Particles, procedural textures
└── styles/      main.css
```

See [AGENTS.md](./AGENTS.md) for the full architecture reference (AI-agent and human readable).  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for the PR workflow and step-by-step guides to add tracks/cars.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production bundle (hashed filenames) |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |

---

## Adding Content

**New track** — copy `src/content/tracks/_template/`, fill in spline points, register in `src/content/tracks/index.js`.  
**New car** — copy `src/content/cars/_template/`, adjust mesh + stats, register in `src/content/cars/index.js`.

Both operations require exactly **one line change** in the registry file and zero engine code changes.

---

## Tech Stack

- **Three.js r128** — 3D rendering
- **Vite 5** — bundler + dev server (HMR, code-splitting, cache-busting hashes)
- **Vitest** — unit testing
- **ESLint** — code style

No framework. No TypeScript. Vanilla ES modules.

---

## Roadmap

- [ ] Track selection UI
- [ ] Car selection UI
- [ ] Gyroscope steering (skeleton in `ui/controls/steering-wheel.js`)
- [ ] Second circuit
- [ ] Lap time splits / best lap display
- [ ] Leaderboard (local storage)
