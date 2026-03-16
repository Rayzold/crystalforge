import { CRYSTAL_LEVEL_LABELS, RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { formatNumber } from "../engine/Utils.js";

export function renderCrystalSelector(state) {
  const visibleRarities = RARITY_ORDER.filter((rarity) => (state.crystals[rarity] ?? 0) > 0);

  return `
    <section class="panel crystal-panel">
      <div class="panel__header">
        <h3>Crystal Availability</h3>
        <span class="panel__subtle">Select a reality level to manifest from</span>
      </div>
      ${
        visibleRarities.length
          ? `
            <div class="crystal-table">
              <div class="crystal-table__head">Level</div>
              <div class="crystal-table__head">Reality</div>
              <div class="crystal-table__head">Available</div>
              <div class="crystal-table__head">Shards</div>
              ${visibleRarities.map((rarity) => {
                const selected = state.selectedRarity === rarity;
                return `
                  <button
                    class="crystal-row ${selected ? "is-selected" : ""}"
                    data-action="select-rarity"
                    data-rarity="${rarity}"
                    style="--rarity-color:${RARITY_COLORS[rarity]}"
                  >
                    <span>${CRYSTAL_LEVEL_LABELS[rarity]}</span>
                    <span class="crystal-row__name">${rarity}</span>
                    <span>${formatNumber(state.crystals[rarity])}</span>
                    <span>${formatNumber(state.shards[rarity])}</span>
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
