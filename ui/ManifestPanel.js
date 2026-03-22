import { escapeHtml, formatNumber } from "../engine/Utils.js";

export function renderManifestPanel(state) {
  const last = state.ui.lastManifestResult;
  const manifestInProgress = Boolean(state.transientUi?.manifestInProgress);
  const selectedCrystals = Number(state.crystals?.[state.selectedRarity] ?? 0);
  const canManifest = !manifestInProgress && selectedCrystals > 0;

  return `
    <section class="panel manifest-panel">
      <div class="manifest-panel__hero">
        <span class="manifest-panel__eyebrow">Manifest Chamber</span>
        <h3>Call forth a ${escapeHtml(state.selectedRarity)} reality.</h3>
        <p class="manifest-panel__text">Each invocation consumes 1 crystal from the selected reality level.</p>
      </div>
      <div class="manifest-panel__controls manifest-panel__controls--centered">
        <button class="button manifest-panel__button" data-action="manifest" ${canManifest ? "" : "disabled"}>
          ${manifestInProgress ? "Manifesting..." : "Manifest"}
        </button>
        <button class="button button--ghost manifest-panel__audio" data-action="toggle-mute">${state.settings.muted ? "Audio Off" : "Audio On"}</button>
      </div>
      ${
        last
          ? `
            <div class="manifest-result manifest-result--forge">
              <strong>${escapeHtml(last.isCrystalUpgrade ? `${last.sourceRarity} to ${last.targetRarity}` : last.rolledName)}</strong>
              ${
                last.isCrystalUpgrade
                  ? `
                    <span>Crystal upgrade / forge now set to ${escapeHtml(last.targetRarity)}</span>
                    <span>No structure was created. Your next manifest will use the upgraded rarity.</span>
                  `
                  : `
                    <span>${escapeHtml(last.rarity)} reality / roll ${formatNumber(last.qualityRoll)}% quality</span>
                    <span>${last.overflow ? `${formatNumber(last.overflow)} overflow into shards` : last.wasNew ? "New structure added to the Drift" : "Added quality to an existing structure"}</span>
                  `
              }
            </div>
          `
          : ""
      }
      <div class="manifest-panel__hint">If a roll lands on Crystal Upgrade, the current crystal is consumed and immediately elevated into the next rarity instead of creating a building.</div>
    </section>
  `;
}
