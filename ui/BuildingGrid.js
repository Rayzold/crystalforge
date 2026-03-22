import { BUILDING_GRID_LIMIT } from "../content/Config.js";
import { getBuildingEconomySummary } from "../content/BuildingCatalog.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { sortBuildings } from "../engine/Utils.js";
import { getActiveConstructionQueue, getConstructionEtaDetails, getDriftConstructionSlots, isBuildingActivelyConstructed } from "../systems/ConstructionSystem.js";
import { renderBuildingCard } from "./BuildingCard.js";

function getPinnedBuildingIds(state) {
  return new Set(state.settings?.pinnedBuildingIds ?? []);
}

function getImpactScore(building, sortKey) {
  switch (sortKey) {
    case "impact-gold":
      return Number(building.resourceRates?.gold ?? 0);
    case "impact-food":
      return Number(building.resourceRates?.food ?? 0);
    case "impact-materials":
      return Number(building.resourceRates?.materials ?? 0);
    case "impact-mana":
      return Number(building.resourceRates?.mana ?? 0);
    case "impact-defense":
      return Number(building.stats?.defense ?? 0);
    case "impact-security":
      return Number(building.stats?.security ?? 0);
    default:
      return 0;
  }
}

function sortVisibleBuildings(buildings, sortKey, pinnedIds = new Set()) {
  const withPinnedPriority = (left, right) => Number(pinnedIds.has(right.id)) - Number(pinnedIds.has(left.id));
  switch (sortKey) {
    case "quality":
      return [...buildings].sort(
        (left, right) =>
          withPinnedPriority(left, right) ||
          right.quality - left.quality ||
          right.createdDayOffset - left.createdDayOffset
      );
    case "rarity":
      return [...sortBuildings(buildings, RARITY_ORDER)].sort((left, right) => withPinnedPriority(left, right));
    case "impact-gold":
    case "impact-food":
    case "impact-materials":
    case "impact-mana":
    case "impact-defense":
    case "impact-security":
      return [...buildings].sort(
        (left, right) =>
          withPinnedPriority(left, right) ||
          getImpactScore(right, sortKey) - getImpactScore(left, sortKey) ||
          right.quality - left.quality ||
          right.createdDayOffset - left.createdDayOffset
      );
    case "newest":
    default:
      return [...buildings].sort(
        (left, right) =>
          withPinnedPriority(left, right) ||
          right.createdDayOffset - left.createdDayOffset ||
          right.quality - left.quality
      );
  }
}

function matchesQuickFilter(building, state, quickFilter) {
  if (!quickFilter || quickFilter === "All") {
    return true;
  }

  const economySummary = getBuildingEconomySummary(building);

  switch (quickFilter) {
    case "Pinned":
      return Boolean(state.settings?.pinnedBuildingIds?.includes(building.id));
    case "Stalled":
      return !building.isComplete && getConstructionEtaDetails(building, state).isStalled;
    case "Consuming Input":
      return economySummary.consumes.some((entry) => entry.key !== "upkeep");
    case "Produces Gold":
      return Number(building.resourceRates?.gold ?? 0) > 0;
    case "Produces Food":
      return Number(building.resourceRates?.food ?? 0) > 0;
    case "Produces Materials":
      return Number(building.resourceRates?.materials ?? 0) > 0;
    default:
      return true;
  }
}

export function getVisibleBuildings(state) {
  const pinnedIds = getPinnedBuildingIds(state);
  const sorted = sortVisibleBuildings(state.buildings, state.transientUi?.buildingSort ?? "newest", pinnedIds);
  const rarityFiltered =
    state.buildingFilter === "All"
      ? sorted
      : sorted.filter((building) => building.rarity === state.buildingFilter);
  const quickFilter = state.transientUi?.buildingQuickFilter ?? "All";
  const quickFiltered = rarityFiltered.filter((building) => matchesQuickFilter(building, state, quickFilter));

  const statusFilter = state.transientUi?.buildingStatusFilter ?? "All";
  switch (statusFilter) {
    case "Active":
      return quickFiltered.filter((building) => building.isComplete);
    case "Incomplete":
      return quickFiltered.filter((building) => !building.isComplete);
    case "Available":
      return quickFiltered.filter((building) => !building.isComplete && !isBuildingActivelyConstructed(state, building.id));
    default:
      return quickFiltered;
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
