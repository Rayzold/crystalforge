import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderForgeStage(state) {
  const selectedBuilding = state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;

  return `
    <section class="scene-panel scene-panel--forge">
      <div class="forge-stage">
        <div class="forge-stage__visual">
          ${
            selectedBuilding?.imagePath
              ? `<img src="${escapeHtml(selectedBuilding.imagePath)}" alt="${escapeHtml(selectedBuilding.displayName)} artwork" loading="lazy" />`
              : `<div class="forge-stage__orb"><span>${escapeHtml(state.selectedRarity)}</span></div>`
          }
        </div>
        <div class="forge-stage__copy">
          <p class="world-summary__eyebrow">Manifest Chamber</p>
          <h2>${selectedBuilding ? escapeHtml(selectedBuilding.displayName) : "Awaiting Manifest"}</h2>
          <p>${
            selectedBuilding
              ? `${escapeHtml(selectedBuilding.specialEffect)} Current quality ${formatNumber(selectedBuilding.quality, 2)}%.`
              : "Select a crystal rarity and manifest a structure. The reveal page now gives the roll room more focus."
          }</p>
        </div>
      </div>
    </section>
  `;
}

export function renderForgePage(state) {
  return {
    title: "The Forge",
    subtitle: "Manifest buildings in a dedicated ritual chamber with a focused stage, inventory rail, and reveal feedback.",
    content: `
      ${renderForgeStage(state)}
      ${renderManifestPanel(state)}
    `,
    aside: `
      ${renderCrystalSelector(state)}
    `
  };
}
