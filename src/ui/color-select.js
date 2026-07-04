/**
 * Pre-race color picker presets. Allows selecting Factory Paint (which updates
 * dynamically depending on the selected car) or one of several high-vibrancy
 * neon presets.
 */

export const COLOR_PRESETS = [
  { id: 'factory', name: 'Factory Paint', primary: null, accent: null },
  { id: 'pink', primary: 0xff2e9a, accent: 0x00e5ff, name: 'Neon Pink' },
  { id: 'cyan', primary: 0x00e5ff, accent: 0xff2e9a, name: 'Cyan Surge' },
  { id: 'lime', primary: 0x8aff4d, accent: 0xff2e9a, name: 'Acid Lime' },
  { id: 'purple', primary: 0xb026ff, accent: 0x00e5ff, name: 'Vapor Purple' },
  { id: 'gold', primary: 0xffb020, accent: 0x1a1a1a, name: 'Solar Gold' },
  { id: 'crimson', primary: 0xff003c, accent: 0xffffff, name: 'Crimson Red' },
];

/**
 * @param {object} options
 * @param {(preset: { id: string, primary: number|null, accent: number|null }) => void} options.onSelect
 */
export function initColorSelect({ onSelect }) {
  const container = document.getElementById('colorSelect');
  if (!container) return;

  // Default to Factory Paint
  onSelect(COLOR_PRESETS[0]);

  container.innerHTML = COLOR_PRESETS.map((preset, i) => {
    const isFactory = preset.id === 'factory';
    const primaryHex = isFactory ? '#777' : '#' + preset.primary.toString(16).padStart(6, '0');
    const accentHex = isFactory ? '#999' : '#' + preset.accent.toString(16).padStart(6, '0');
    return `
      <button class="color-option${i === 0 ? ' selected' : ''}" 
              data-id="${preset.id}" 
              style="background-color: ${primaryHex}; --accent-color: ${accentHex}; --glow-color: ${primaryHex};" 
              title="${preset.name}"
              type="button">
      </button>
    `;
  }).join('');

  container.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const preset = COLOR_PRESETS.find(p => p.id === id);
      if (!preset) return;

      container.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(preset);
    }, { passive: true });
  });
}

/**
 * Updates the visual paint preview of the 'Factory Paint' option button.
 * @param {object} carDef
 */
export function updateFactoryOptionColors(carDef) {
  const factoryBtn = document.querySelector('.color-option[data-id="factory"]');
  if (!factoryBtn || !carDef) return;
  const primaryHex = '#' + carDef.color.toString(16).padStart(6, '0');
  const accentHex = '#' + carDef.accentColor.toString(16).padStart(6, '0');
  factoryBtn.style.backgroundColor = primaryHex;
  factoryBtn.style.setProperty('--accent-color', accentHex);
  factoryBtn.style.setProperty('--glow-color', primaryHex);
}
