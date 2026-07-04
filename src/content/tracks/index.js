/**
 * Maps track IDs to dynamic imports. Vite will code-split each track
 * into its own chunk, so the initial bundle stays small even as you
 * add more tracks.
 *
 * ─── HOW TO ADD A NEW TRACK ───────────────────────────────────────────────
 *   1. Copy `_template/` → `your-track-name/`
 *   2. Fill in track.js (spline + layout) and scenery.js (decorations)
 *   3. Add one entry to the REGISTRY below
 *   4. That's it — no engine code changes required
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Each track module must export a default `TrackDefinition` object.
 * See _template/track.js for the required shape.
 */

const REGISTRY = {
  'sunset-grid': () => import('./sunset-grid/track.js'),
  // 'neon-valley': () => import('./neon-valley/track.js'),  // example
};

/**
 * Loads and returns a track definition by ID.
 * @param {string} id — must match a key in REGISTRY
 * @returns {Promise<import('./_template/track.js').TrackDefinition>}
 */
export async function loadTrack(id) {
  const loader = REGISTRY[id];
  if (!loader) throw new Error(`[tracks] Unknown track: "${id}". Check content/tracks/index.js`);
  const mod = await loader();
  return mod.default;
}

/** Returns all registered track IDs (for a future track-select UI). */
export function getTrackIds() {
  return Object.keys(REGISTRY);
}
