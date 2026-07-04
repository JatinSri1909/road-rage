/**
 * Pre-race track picker. Renders one button per track passed in — driven
 * entirely by the track registry.
 */

/**
 * @param {object} options
 * @param {import('../content/tracks/_template/track.js').TrackDefinition[]} options.tracks
 * @param {string[]} options.trackIds
 * @param {(trackId: string) => void} options.onSelect
 */
export function initTrackSelect({ tracks, trackIds, onSelect }) {
  const container = document.getElementById('trackSelect');
  if (!container || tracks.length === 0) return;

  // Default to the first registered track.
  onSelect(trackIds[0]);

  container.innerHTML = tracks.map((track, i) => {
    const id = trackIds[i];
    const name = track.name || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const width = track.roadWidth || 13;
    const boosts = track.boostPadIndices ? track.boostPadIndices.length : 0;
    return `
      <button class="track-option${i === 0 ? ' selected' : ''}" data-id="${id}" type="button">
        <span class="track-option-name">${name}</span>
        <span class="track-option-stats">
          <span>WIDTH ${width}</span>
          <span>BOOSTS ${boosts}</span>
        </span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.track-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (!id) return;
      container.querySelectorAll('.track-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(id);
    }, { passive: true });
  });
}
