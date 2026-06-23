import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260623073844";
import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js?v=v1.7.20-20260623073844";
import { renderBuildingArt } from "./BuildingArt.js?v=v1.7.20-20260623073844";
import { renderCrystalSelector } from "./CrystalSelector.js?v=v1.7.20-20260623073844";
import { renderManifestPanel } from "./ManifestPanel.js?v=v1.7.20-20260623073844";

function renderQuickAddCrystals(state) {
  return `
    <section class="panel quick-add-crystals">
      <div class="panel__header">
        <h3>Quick Add Crystals</h3>
        <span class="panel__subtle">Available stock per reality level</span>
      </div>
      <div class="quick-add-crystals__grid">
        ${RARITY_ORDER.map((rarity) => {
          const count = Number(state.crystals?.[rarity] ?? 0);
          const color = RARITY_COLORS[rarity] ?? "#b4bcc8";
          return `
            <article class="quick-add-crystals__row" style="--rarity-color:${color}">
              <div class="quick-add-crystals__head">
                <span class="quick-add-crystals__dot" aria-hidden="true"></span>
                <strong>${escapeHtml(rarity)}</strong>
              </div>
              <strong class="quick-add-crystals__count">${formatNumber(count, 0)}</strong>
              <div class="quick-add-crystals__controls">
                <button class="button button--ghost button--small" type="button" data-action="quick-adjust-crystal" data-rarity="${escapeHtml(rarity)}" data-delta="-1" ${count <= 0 ? "disabled" : ""}>−1</button>
                <button class="button button--ghost button--small" type="button" data-action="quick-adjust-crystal" data-rarity="${escapeHtml(rarity)}" data-delta="1">+1</button>
                <button class="button button--ghost button--small" type="button" data-action="quick-adjust-crystal" data-rarity="${escapeHtml(rarity)}" data-delta="5">+5</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderForgeCommandDeck(state) {
  const totalRolls = Object.values(state.crystals).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return `
    <section class="forge-command">
      <div class="forge-command__headline">
        <p class="forge-command__eyebrow">Forge</p>
        <h2>Crystal Forge</h2>
      </div>
      <div class="forge-command__actions">
        <button class="button button--ghost" data-action="open-catalog">Catalog</button>
        <button class="button button--ghost" data-action="open-admin">Admin</button>
      </div>
      <div class="forge-command__footer">
        <span></span>
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
        <span class="panel__subtle">Recent rolls</span>
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
                            building,
                            `${entry.title} artwork`,
                            `<div class="manifest-shrine__fallback">${escapeHtml(entry.title.slice(0, 1))}</div>`
                          )
                        }
                      </div>
                      <div class="manifest-shrine__meta">
                        <span>${escapeHtml(entry.date)}</span>
                        <strong>${escapeHtml(entry.title)}</strong>
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
            : `<p class="empty-state">No rolls yet.</p>`
        }
      </div>
    </section>
  `;
}

function renderForgeStage(state) {
  const selectedBuilding = state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const visual = renderBuildingArt(
    selectedBuilding,
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
              ? `Quality ${formatNumber(selectedBuilding.quality, 2)}%.`
              : "Select a crystal and manifest."
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
    subtitle: "Manifest buildings.",
    content: `
      ${renderForgeCommandDeck(state)}
      ${renderQuickAddCrystals(state)}
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      ${renderForgeStage(state)}
      ${renderManifestShrine(state)}
    `
  };
}
