import { getNextRarity } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";

export function renderManifestPanel(state) {
  const last = state.ui.lastManifestResult;
  const selectedBuilding = state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const canUpgradeCrystals =
    selectedBuilding &&
    selectedBuilding.name === "Crystal Upgrade" &&
    selectedBuilding.isComplete;

  return `
    <section class="panel manifest-panel">
      <div class="panel__header">
        <h3>Manifest Forge</h3>
        <div class="manifest-panel__controls">
          <button class="button" data-action="manifest">Manifest ${state.selectedRarity}</button>
          <button class="button button--ghost" data-action="toggle-mute">${state.settings.muted ? "Audio Off" : "Audio On"}</button>
        </div>
      </div>
      <p class="manifest-panel__text">Press MANIFEST to consume one ${escapeHtml(state.selectedRarity)} crystal and reveal a building from that pool.</p>
      ${
        last
          ? `
            <div class="manifest-result">
              <strong>${escapeHtml(last.rolledName)}</strong>
              <span>${escapeHtml(last.rarity)} roll / ${formatNumber(last.qualityRoll)}%</span>
              <span>${last.overflow ? `${formatNumber(last.overflow)} overflow into shards` : last.wasNew ? "New building manifested" : "Merged with existing building"}</span>
            </div>
          `
          : ""
      }
      ${
        canUpgradeCrystals
          ? `
            <div class="upgrade-panel">
              <h4>Crystal Upgrade</h4>
              <p>Completed Crystal Upgrade selected. Convert one crystal upward.</p>
              <div class="upgrade-panel__buttons">
                ${["Common", "Uncommon", "Rare", "Epic", "Legendary"]
                  .map((rarity) => {
                    const next = getNextRarity(rarity);
                    return `
                      <button class="button button--ghost" data-action="upgrade-crystal" data-rarity="${rarity}">
                        ${rarity} to ${next}
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `
          : `<div class="manifest-panel__hint">Select a completed Crystal Upgrade building to unlock crystal conversion.</div>`
      }
    </section>
  `;
}
