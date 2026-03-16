import { BASE_BUILDING_CATALOG, getCatalogKey } from "../content/BuildingCatalog.js";
import { BUILDING_POOLS } from "../content/BuildingPools.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml } from "../engine/Utils.js";
import { renderModal } from "./Modal.js";

function renderRows() {
  return RARITY_ORDER.flatMap((rarity) =>
    BUILDING_POOLS[rarity].map((name) => {
      const entry = BASE_BUILDING_CATALOG[getCatalogKey(name, rarity)];
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(rarity)}</td>
          <td>${escapeHtml(entry?.district ?? "Unknown District")}</td>
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
        <p class="catalog-modal__intro">
          This table lists the authored, non-generated building entries from the base roll pools, including split rarity entries such as Crystal Upgrade.
        </p>
        <div class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Rarity</th>
                <th>District</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows()}
            </tbody>
          </table>
        </div>
      </div>
    `
  });
}
