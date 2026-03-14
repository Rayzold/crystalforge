import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { formatNumber } from "../engine/Utils.js";

export function renderCrystalSelector(state) {
  return `
    <section class="panel crystal-panel">
      <div class="panel__header">
        <h3>Crystals</h3>
        <span class="panel__subtle">Select a rarity to manifest</span>
      </div>
      <div class="crystal-panel__list">
        ${RARITY_ORDER.map((rarity) => {
          const selected = state.selectedRarity === rarity;
          return `
            <button
              class="crystal-option ${selected ? "is-selected" : ""}"
              data-action="select-rarity"
              data-rarity="${rarity}"
              style="--rarity-color:${RARITY_COLORS[rarity]}"
            >
              <span class="crystal-option__name">${rarity}</span>
              <span class="crystal-option__counts">${formatNumber(state.crystals[rarity])} crystal</span>
              <span class="crystal-option__counts">${formatNumber(state.shards[rarity])} shards</span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
