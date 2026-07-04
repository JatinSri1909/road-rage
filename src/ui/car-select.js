/**
 * Pre-race car picker. Renders one button per car passed in — driven
 * entirely by whatever's in the registry (content/cars/index.js), so
 * adding a new car there is the only change needed; this file doesn't
 * know or care how many cars exist.
 *
 * If only one car is registered, the picker hides itself rather than
 * showing a pointless single-option list.
 */

/**
 * @param {object} options
 * @param {import('../content/cars/_template/car.js').CarDefinition[]} options.cars
 * @param {(car: import('../content/cars/_template/car.js').CarDefinition) => void} options.onSelect
 */
export function initCarSelect({ cars, onSelect }) {
  const container = document.getElementById('carSelect');
  if (!container || cars.length === 0) return;

  // Default to the first registered car.
  onSelect(cars[0]);

  if (cars.length < 2) {
    container.classList.add('hidden');
    return;
  }

  container.innerHTML = cars.map((car, i) => `
    <button class="car-option${i === 0 ? ' selected' : ''}" data-id="${car.id}" type="button">
      <span class="car-option-name">${car.name}</span>
      <span class="car-option-stats">
        <span>TOP ${Math.round(car.stats.maxSpeed * 3.6)}</span>
        <span>GRIP ${car.stats.gripNormal.toFixed(1)}</span>
      </span>
    </button>
  `).join('');

  container.querySelectorAll('.car-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const car = cars.find(c => c.id === btn.dataset.id);
      if (!car) return;
      container.querySelectorAll('.car-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(car);
    }, { passive: true });
  });
}