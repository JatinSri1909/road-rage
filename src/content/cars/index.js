/**
 * Maps car IDs to dynamic imports. Vite code-splits each car into its
 * own chunk. The selection menu (future feature) can call `getCarIds()`
 * to populate its list without touching engine code.
 *
 * ─── HOW TO ADD A NEW CAR ─────────────────────────────────────────────────
 *   1. Copy `_template/` → `your-car-name/`
 *   2. Fill in car.js (mesh config) and stats.js (physics parameters)
 *   3. Add one entry to the REGISTRY below
 *   4. That's it — no engine code changes required
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Each car module must export a default `CarDefinition` object.
 * See _template/car.js for the required shape.
 */

const REGISTRY = {
  'phoenix-gt': () => import('./phoenix-gt/car.js'),
  // 'shadow-v8':  () => import('./shadow-v8/car.js'),  // example
};

/**
 * Loads and returns a car definition by ID.
 * @param {string} id — must match a key in REGISTRY
 * @returns {Promise<import('./_template/car.js').CarDefinition>}
 */
export async function loadCar(id) {
  const loader = REGISTRY[id];
  if (!loader) throw new Error(`[cars] Unknown car: "${id}". Check content/cars/index.js`);
  const mod = await loader();
  return mod.default;
}

/** Returns all registered car IDs (for a future car-select UI). */
export function getCarIds() {
  return Object.keys(REGISTRY);
}
