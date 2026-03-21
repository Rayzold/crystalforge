import { CRYSTAL_LEVEL_LABELS, RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { formatNumber } from "../engine/Utils.js";

function renderCrystalIcon(rarity) {
  const outlines = {
    Common: `<polygon points="24,5 39,24 24,43 9,24" />
      <polyline points="24,5 29,24 24,43 19,24 24,5" />
      <line x1="9" y1="24" x2="39" y2="24" />`,
    Uncommon: `<polygon points="24,4 41,19 33,44 15,44 7,19" />
      <polyline points="24,4 29,19 24,44 19,19 24,4" />
      <line x1="7" y1="19" x2="41" y2="19" />`,
    Rare: `<polygon points="24,3 37,14 40,29 24,45 8,29 11,14" />
      <polyline points="24,3 28,16 24,45 20,16 24,3" />
      <line x1="11" y1="14" x2="37" y2="14" />
      <line x1="8" y1="29" x2="40" y2="29" />`,
    Epic: `<polygon points="24,3 35,10 41,24 35,38 24,45 13,38 7,24 13,10" />
      <polyline points="24,3 29,15 24,45 19,15 24,3" />
      <line x1="7" y1="24" x2="41" y2="24" />`,
    Legendary: `<path d="M24 4 L38 15 L35 33 L24 44 L13 33 L10 15 Z" />
      <path d="M24 4 L24 44" />
      <path d="M10 15 L38 15" />
      <path d="M13 33 L35 33" />
      <path d="M15 10 L33 38" />
      <path d="M33 10 L15 38" />`,
    Beyond: `<path d="M24 2 L34 10 L43 24 L34 38 L24 46 L14 38 L5 24 L14 10 Z" />
      <path d="M24 2 L24 46" />
      <path d="M5 24 L43 24" />
      <path d="M12 12 L36 36" />
      <path d="M36 12 L12 36" />
      <circle cx="24" cy="24" r="6" />`
  };

  return `
    <svg class="crystal-card__icon" viewBox="0 0 48 48" aria-hidden="true" style="--icon-color:${RARITY_COLORS[rarity]}">
      <circle cx="24" cy="24" r="18" fill="none" stroke="var(--icon-color)" stroke-opacity="0.18" stroke-width="1.2" />
      <g fill="none" stroke="var(--icon-color)" stroke-width="2.35" stroke-linejoin="round" stroke-linecap="round">
        ${outlines[rarity]}
      </g>
    </svg>
  `;
}

export function renderCrystalSelector(state) {
  const visibleRarities = RARITY_ORDER.filter((rarity) => (state.crystals[rarity] ?? 0) > 0);
  const selectedRarity = state.selectedRarity;
  const lastManifest = state.ui.lastManifestResult;
  const totalVisible = visibleRarities.reduce((sum, rarity) => sum + (state.crystals[rarity] ?? 0), 0);

  return `
    <section class="panel crystal-panel crystal-panel--forge">
      <div class="panel__header crystal-panel__header">
        <div>
          <h3>Select Your Crystal</h3>
          <span class="panel__subtle">Each reality has equal odds within its own pool.</span>
        </div>
        <span class="crystal-panel__total">Available rolls: ${formatNumber(totalVisible, 0)}</span>
      </div>
      <div class="crystal-panel__status crystal-panel__status--forge">
        <article>
          <span>Selected Reality</span>
          <strong>${CRYSTAL_LEVEL_LABELS[selectedRarity]} / ${selectedRarity}</strong>
          <small>${formatNumber(state.crystals[selectedRarity] ?? 0)} crystals remaining</small>
          <small>${formatNumber(state.shards[selectedRarity] ?? 0)} shards stored</small>
        </article>
        <article>
          <span>Manifest Rule</span>
          <strong>Each manifest costs 1 crystal</strong>
          <small>When a level reaches 0, it disappears from the table until crystals return.</small>
        </article>
      </div>
      ${
        visibleRarities.length
          ? `
            <div class="crystal-grid">
              ${visibleRarities.map((rarity) => {
                const selected = state.selectedRarity === rarity;
                return `
                  <button
                    class="crystal-card ${selected ? "is-selected" : ""} ${lastManifest?.rarity === rarity ? "is-recent" : ""}"
                    data-action="select-rarity"
                    data-rarity="${rarity}"
                    style="--rarity-color:${RARITY_COLORS[rarity]}"
                    type="button"
                  >
                    <span class="crystal-card__level">${CRYSTAL_LEVEL_LABELS[rarity]}</span>
                    <span class="crystal-card__glyph">${renderCrystalIcon(rarity)}</span>
                    <span class="crystal-card__name">${rarity}</span>
                    <strong class="crystal-card__value">${formatNumber(state.crystals[rarity])}</strong>
                    <small class="crystal-card__shards">${formatNumber(state.shards[rarity])} shards</small>
                  </button>
                `;
              }).join("")}
            </div>
          `
          : `<p class="empty-state">No crystal levels are currently available.</p>`
      }
    </section>
  `;
}
