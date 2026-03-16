import { BASE_BUILDING_CATALOG, getCatalogKey } from "../content/BuildingCatalog.js";
import { BUILDING_POOLS } from "../content/BuildingPools.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderModal } from "./Modal.js";

function renderRows(state) {
  return RARITY_ORDER.flatMap((rarity) =>
    BUILDING_POOLS[rarity].map((name) => {
      const entry = BASE_BUILDING_CATALOG[getCatalogKey(name, rarity)];
      const manifested = state.buildings.find((building) => building.name === name && building.rarity === rarity) ?? null;
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(rarity)}</td>
          <td>${escapeHtml(entry?.district ?? "Unknown District")}</td>
          <td>${manifested ? `Manifested (${formatNumber(manifested.quality, 2)}%)` : "Not Manifested"}</td>
        </tr>
      `;
    })
  ).join("");
}

export function renderBuildingCatalogModal(state) {
  if (!state.transientUi?.catalogOpen) {
    return "";
  }

  return renderModal({
    id: "building-catalog-modal",
    title: "Authored Building Catalog",
    open: true,
    wide: true,
    content: `
      <div class="catalog-modal">
        <div class="catalog-modal__toolbar">
          <p class="catalog-modal__intro">
            This table lists the authored, non-generated building entries from the base roll pools, including split rarity entries such as Crystal Upgrade.
          </p>
          <button class="button button--ghost" data-action="export-building-catalog">Export Manifest Status</button>
        </div>
        <div class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Rarity</th>
                <th>District</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows(state)}
            </tbody>
          </table>
        </div>
      </div>
    `
  });
}
