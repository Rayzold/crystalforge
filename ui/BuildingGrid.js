import { BUILDING_GRID_LIMIT } from "../content/Config.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { sortBuildings } from "../engine/Utils.js";
import { renderBuildingCard } from "./BuildingCard.js";

export function getVisibleBuildings(state) {
  const sorted = sortBuildings(state.buildings, RARITY_ORDER);
  if (state.buildingFilter === "All") {
    return sorted;
  }
  return sorted.filter((building) => building.rarity === state.buildingFilter);
}

export function renderBuildingGrid(state) {
  const visibleBuildings = getVisibleBuildings(state);
  const mainGrid = visibleBuildings.slice(0, BUILDING_GRID_LIMIT);

  return `
    <section class="panel building-grid-panel">
      <div class="panel__header">
        <h3>Forge Ledger</h3>
        <div class="building-grid-panel__controls">
          <label>
            Filter
            <select data-action="set-building-filter">
              <option value="All" ${state.buildingFilter === "All" ? "selected" : ""}>All</option>
              ${RARITY_ORDER.map(
                (rarity) => `<option value="${rarity}" ${state.buildingFilter === rarity ? "selected" : ""}>${rarity}</option>`
              ).join("")}
            </select>
          </label>
          <span class="panel__subtle">${visibleBuildings.length} buildings tracked</span>
        </div>
      </div>
      <div class="building-grid">
        ${mainGrid.length ? mainGrid.map((building) => renderBuildingCard(building, state)).join("") : `<p class="empty-state">No buildings yet. Manifest your first structure.</p>`}
      </div>
    </section>
  `;
}
