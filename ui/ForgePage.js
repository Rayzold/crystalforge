import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderManifestShrine(state) {
  const recentEntries = state.historyLog
    .filter((entry) => entry.category === "Manifest")
    .slice(0, 5)
    .map((entry) => {
      const building = state.buildings.find((candidate) => candidate.displayName === entry.title || candidate.name === entry.title) ?? null;
      return { entry, building };
    });

  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Manifest Shrine</h3>
        <span class="panel__subtle">Recent crystal revelations</span>
      </div>
      <div class="manifest-shrine">
        ${
          recentEntries.length
            ? recentEntries
                .map(
                  ({ entry, building }) => `
                    <article class="manifest-shrine__card ${building ? `rarity-${building.rarity.toLowerCase()}` : ""}">
                      <div class="manifest-shrine__art">
                        ${
                          building?.imagePath
                            ? `<img src="${escapeHtml(building.imagePath)}" alt="${escapeHtml(entry.title)} artwork" loading="lazy" />`
                            : `<div class="manifest-shrine__fallback">${escapeHtml(entry.title.slice(0, 1))}</div>`
                        }
                      </div>
                      <div class="manifest-shrine__meta">
                        <span>${escapeHtml(entry.date)}</span>
                        <strong>${escapeHtml(entry.title)}</strong>
                        <p>${escapeHtml(entry.details)}</p>
                        ${
                          building
                            ? `<button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Dossier</button>`
                            : ""
                        }
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">Your recent crystal revelations will gather here once the forge begins turning.</p>`
        }
      </div>
    </section>
  `;
}

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
      ${renderManifestShrine(state)}
    `,
    aside: `
      ${renderCrystalSelector(state)}
    `
  };
}
