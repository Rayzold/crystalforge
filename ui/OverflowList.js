import { BUILDING_GRID_LIMIT } from "../content/Config.js";
import { formatNumber } from "../engine/Utils.js";
import { getVisibleBuildings } from "./BuildingGrid.js";

export function renderOverflowList(state) {
  const overflow = getVisibleBuildings(state).slice(BUILDING_GRID_LIMIT);

  return `
    <section class="panel overflow-panel">
      <div class="panel__header">
        <h3>Overflow Buildings</h3>
        <span class="panel__subtle">${overflow.length} beyond the main grid</span>
      </div>
      <div class="overflow-list">
        ${
          overflow.length
            ? overflow
                .map(
                  (building) => `
                    <button class="overflow-list__item" data-action="select-building" data-building-id="${building.id}">
                      <span>${building.displayName}</span>
                      <span>${building.rarity}</span>
                      <span>${formatNumber(building.quality, 2)}%</span>
                    </button>
                  `
                )
                .join("")
            : `<p class="empty-state">No overflow buildings right now.</p>`
        }
      </div>
    </section>
  `;
}
