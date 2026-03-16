import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderForgeStage(state) {
  const selectedBuilding = state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const visual = selectedBuilding?.imagePath
    ? `<img src="${escapeHtml(selectedBuilding.imagePath)}" alt="${escapeHtml(selectedBuilding.displayName)} artwork" loading="lazy" />`
    : `<div class="forge-stage__orb"><span>${escapeHtml(state.selectedRarity)}</span></div>`;

  return `
    <section class="scene-panel scene-panel--forge">
      <div class="forge-stage">
        <div class="forge-stage__visual">
          <div class="forge-stage__sigil forge-stage__sigil--left"></div>
          <div class="forge-stage__sigil forge-stage__sigil--right"></div>
          <div class="forge-stage__altar-glow"></div>
          ${visual}
        </div>
        <div class="forge-stage__copy">
          <p class="world-summary__eyebrow">Manifest Chamber</p>
          <h2>${selectedBuilding ? escapeHtml(selectedBuilding.displayName) : "Awaiting Manifest"}</h2>
          <p>${
            selectedBuilding
              ? `${escapeHtml(selectedBuilding.specialEffect)} Current quality ${formatNumber(selectedBuilding.quality, 2)}%.`
              : "Select a crystal level from the availability table and manifest a structure. The reveal page now gives the roll room more focus."
          }</p>
          <div class="forge-stage__ritual-notes">
            <article><span>Reality Level</span><strong>${escapeHtml(state.selectedRarity)}</strong></article>
            <article><span>Available</span><strong>${formatNumber(state.crystals[state.selectedRarity] ?? 0)}</strong></article>
            <article><span>Last Roll</span><strong>${state.ui.lastManifestResult ? `${formatNumber(state.ui.lastManifestResult.qualityRoll)}%` : "None"}</strong></article>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderForgePage(state) {
  return {
    title: "The Forge",
    subtitle: "Manifest buildings through persistent crystal availability, with evolution changing crystal reality instead of spending your stock.",
    content: `
      ${renderForgeStage(state)}
      ${renderManifestPanel(state)}
    `,
    aside: `
      ${renderCrystalSelector(state)}
    `
  };
}
