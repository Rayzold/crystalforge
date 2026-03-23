import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderBuildingArt } from "./BuildingArt.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderForgeCommandDeck(state) {
  const totalRolls = Object.values(state.crystals).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return `
    <section class="forge-command">
      <div class="forge-command__headline">
        <p class="forge-command__eyebrow">Manifest Your Destiny</p>
        <h2>Crystal Forge</h2>
      </div>
      <div class="forge-command__actions">
        <button class="button button--ghost" data-action="open-catalog">Catalog</button>
        <button class="button button--ghost" data-action="open-admin">Admin</button>
      </div>
      <div class="forge-command__footer">
        <span>The realities answer only when invoked with precision.</span>
        <strong>Total Rolls: ${formatNumber(totalRolls, 0)}</strong>
      </div>
    </section>
  `;
}

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
                          renderBuildingArt(
                            building?.imagePath,
                            `${entry.title} artwork`,
                            `<div class="manifest-shrine__fallback">${escapeHtml(entry.title.slice(0, 1))}</div>`
                          )
                        }
                      </div>
                      <div class="manifest-shrine__meta">
                        <span>${escapeHtml(entry.date)}</span>
                        <strong>${escapeHtml(entry.title)}</strong>
                        <p>${escapeHtml(entry.details)}</p>
                        ${
                          building
                            ? `<button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>`
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
  const visual = renderBuildingArt(
    selectedBuilding?.imagePath,
    `${selectedBuilding?.displayName ?? state.selectedRarity} artwork`,
    `<div class="forge-stage__orb"><span>${escapeHtml(state.selectedRarity)}</span></div>`
  );

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
            <article><span>Last Roll</span><strong>${state.ui.lastManifestResult ? (state.ui.lastManifestResult.isCrystalUpgrade ? "Upgrade" : `${formatNumber(state.ui.lastManifestResult.qualityRoll)}%`) : "None"}</strong></article>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderForgePage(state) {
  return {
    title: "Forge",
    subtitle: "Choose a crystal and manifest.",
    content: `
      ${renderForgeCommandDeck(state)}
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      ${renderForgeStage(state)}
      ${renderManifestShrine(state)}
    `
  };
}
