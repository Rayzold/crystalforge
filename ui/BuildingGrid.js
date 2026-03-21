import { BUILDING_GRID_LIMIT } from "../content/Config.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { sortBuildings } from "../engine/Utils.js";
import { getActiveConstructionQueue, getDriftConstructionSlots, isBuildingActivelyConstructed } from "../systems/ConstructionSystem.js";
import { renderBuildingCard } from "./BuildingCard.js";

function sortVisibleBuildings(buildings, sortKey) {
  switch (sortKey) {
    case "quality":
      return [...buildings].sort((left, right) => right.quality - left.quality || right.createdDayOffset - left.createdDayOffset);
    case "rarity":
      return sortBuildings(buildings, RARITY_ORDER);
    case "newest":
    default:
      return [...buildings].sort((left, right) => right.createdDayOffset - left.createdDayOffset || right.quality - left.quality);
  }
}

export function getVisibleBuildings(state) {
  const sorted = sortVisibleBuildings(state.buildings, state.transientUi?.buildingSort ?? "newest");
  const rarityFiltered =
    state.buildingFilter === "All"
      ? sorted
      : sorted.filter((building) => building.rarity === state.buildingFilter);

  const statusFilter = state.transientUi?.buildingStatusFilter ?? "All";
  switch (statusFilter) {
    case "Manifested":
      return rarityFiltered.filter((building) => building.isComplete);
    case "Unmanifested":
      return rarityFiltered.filter((building) => !building.isComplete);
    case "Available":
      return rarityFiltered.filter((building) => !building.isComplete && !isBuildingActivelyConstructed(state, building.id));
    default:
      return rarityFiltered;
  }
}

export function renderBuildingGrid(state, options = {}) {
  const { limit = BUILDING_GRID_LIMIT, showHeader = true, className = "" } = options;
  const visibleBuildings = getVisibleBuildings(state);
  const mainGrid = limit == null ? visibleBuildings : visibleBuildings.slice(0, limit);
  const activeConstruction = getActiveConstructionQueue(state);
  const constructionSlots = getDriftConstructionSlots(state);

  return `
    <section class="panel building-grid-panel ${className}">
      ${
        showHeader
          ? `
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
                <span class="panel__subtle">${visibleBuildings.length} buildings tracked / ${activeConstruction.length} of ${constructionSlots} Drift slots active</span>
              </div>
            </div>
          `
          : ""
      }
      <div class="building-grid ${className ? `${className}__grid` : ""}">
        ${mainGrid.length ? mainGrid.map((building) => renderBuildingCard(building, state)).join("") : `<p class="empty-state">No buildings yet. Manifest your first structure.</p>`}
      </div>
    </section>
  `;
}
