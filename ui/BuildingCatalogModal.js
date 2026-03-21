import { getCatalogKey } from "../content/BuildingCatalog.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderModal } from "./Modal.js";

function getCatalogEntries(state) {
  return RARITY_ORDER.flatMap((rarity) =>
    (state.rollTables[rarity] ?? []).map((name) => {
      const entry = state.buildingCatalog[getCatalogKey(name, rarity)];
      const manifested = state.buildings.find((building) => building.name === name && building.rarity === rarity) ?? null;
      const status = manifested ? (manifested.isRuined ? "Ruined" : "Manifested") : "Not Manifested";
      return {
        name,
        rarity,
        district: entry?.district ?? "Unknown District",
        manifested,
        status
      };
    })
  );
}

function filterEntries(entries, filters) {
  return entries.filter((entry) => {
    if (filters.rarity !== "All" && entry.rarity !== filters.rarity) {
      return false;
    }
    if (filters.district !== "All" && entry.district !== filters.district) {
      return false;
    }
    if (filters.status !== "All" && entry.status !== filters.status) {
      return false;
    }
    return true;
  });
}

function renderRows(entries) {
  if (!entries.length) {
    return `
      <tr>
        <td colspan="5" class="catalog-table__empty">No buildings match the current filters.</td>
      </tr>
    `;
  }

  return entries
    .map((entry) => `
      <tr>
        <td>${escapeHtml(entry.name)}</td>
        <td>${escapeHtml(entry.rarity)}</td>
        <td>${escapeHtml(entry.district)}</td>
        <td>${escapeHtml(entry.status)}</td>
        <td>${entry.manifested ? `${formatNumber(entry.manifested.quality, 2)}%` : "0%"}</td>
      </tr>
    `)
    .join("");
}

export function renderBuildingCatalogModal(state) {
  if (!state.transientUi?.catalogOpen) {
    return "";
  }

  const filters = state.transientUi.catalogFilters ?? {
    rarity: "All",
    district: "All",
    status: "All"
  };
  const entries = getCatalogEntries(state);
  const filteredEntries = filterEntries(entries, filters);
  const districts = [...new Set(entries.map((entry) => entry.district))].sort((left, right) => left.localeCompare(right));
  const statuses = ["Manifested", "Not Manifested", "Ruined"];

  return renderModal({
    id: "building-catalog-modal",
    title: "Authored Building Catalog",
    open: true,
    wide: true,
    content: `
      <div class="catalog-modal">
        <div class="catalog-modal__toolbar">
          <p class="catalog-modal__intro">
            This table lists the current rollable building entries, their district placement, manifestation state, and manifested quality percentage.
          </p>
          <button class="button button--ghost" data-action="export-building-catalog">Export Manifest Status</button>
        </div>
        <div class="catalog-modal__filters">
          <label>
            <span>Rarity</span>
            <select data-action="set-catalog-filter" data-filter-key="rarity">
              <option value="All" ${filters.rarity === "All" ? "selected" : ""}>All</option>
              ${RARITY_ORDER.map((rarity) => `<option value="${rarity}" ${filters.rarity === rarity ? "selected" : ""}>${escapeHtml(rarity)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>District</span>
            <select data-action="set-catalog-filter" data-filter-key="district">
              <option value="All" ${filters.district === "All" ? "selected" : ""}>All</option>
              ${districts.map((district) => `<option value="${district}" ${filters.district === district ? "selected" : ""}>${escapeHtml(district)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select data-action="set-catalog-filter" data-filter-key="status">
              <option value="All" ${filters.status === "All" ? "selected" : ""}>All</option>
              ${statuses.map((status) => `<option value="${status}" ${filters.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Rarity</th>
                <th>District</th>
                <th>Status</th>
                <th>Manifested %</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows(filteredEntries)}
            </tbody>
          </table>
        </div>
      </div>
    `
  });
}
