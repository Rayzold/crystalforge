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
      <div class="manifest-panel__hero">
        <span class="manifest-panel__eyebrow">Manifest Chamber</span>
        <h3>Call forth a ${escapeHtml(state.selectedRarity)} reality.</h3>
        <p class="manifest-panel__text">Each invocation consumes 1 crystal from the selected reality level.</p>
      </div>
      <div class="manifest-panel__controls manifest-panel__controls--centered">
        <button class="button manifest-panel__button" data-action="manifest">Manifest</button>
        <button class="button button--ghost manifest-panel__audio" data-action="toggle-mute">${state.settings.muted ? "Audio Off" : "Audio On"}</button>
      </div>
      ${
        last
          ? `
            <div class="manifest-result manifest-result--forge">
              <strong>${escapeHtml(last.rolledName)}</strong>
              <span>${escapeHtml(last.rarity)} reality / quality ${formatNumber(last.qualityRoll)}%</span>
              <span>${last.overflow ? `${formatNumber(last.overflow)} overflow into shards` : last.wasNew ? "New structure manifested" : "Merged into an existing structure"}</span>
            </div>
          `
          : ""
      }
      ${
        canUpgradeCrystals
          ? `
            <div class="upgrade-panel">
              <h4>Crystal Upgrade</h4>
              <p>Completed Crystal Upgrade selected. Evolve one available crystal upward into a higher reality.</p>
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
