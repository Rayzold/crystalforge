import { BUILDING_GRID_LIMIT } from "../content/Config.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
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
                    <article class="overflow-list__item">
                      <button class="overflow-list__main" data-action="select-building" data-building-id="${building.id}">
                        <span>${escapeHtml(building.displayName)}</span>
                        <span>${escapeHtml(building.rarity)}</span>
                        <span>${formatNumber(building.quality, 2)}%</span>
                      </button>
                      <div class="overflow-list__actions">
                        <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                        ${
                          state.ui.adminUnlocked
                            ? `<button class="button button--ghost button--danger-icon" data-action="remove-building" data-building-id="${building.id}" aria-label="Delete ${escapeHtml(building.displayName)}" title="Delete building">🗑</button>`
                            : ""
                        }
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">No overflow buildings right now.</p>`
        }
      </div>
    </section>
  `;
}
