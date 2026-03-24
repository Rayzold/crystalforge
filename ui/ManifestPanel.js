import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderBuildingArt } from "./BuildingArt.js";

export function renderManifestPanel(state) {
  const last = state.ui.lastManifestResult;
  const manifestInProgress = Boolean(state.transientUi?.manifestInProgress);
  const selectedCrystals = Number(state.crystals?.[state.selectedRarity] ?? 0);
  const canManifest = !manifestInProgress && selectedCrystals > 0;
  const quickManifestationsEnabled = Boolean(state.settings?.quickManifestations);

  return `
    <section class="panel manifest-panel">
      <div class="manifest-panel__hero">
        <span class="manifest-panel__eyebrow">Manifest Chamber</span>
        <h3>Call forth a ${escapeHtml(state.selectedRarity)} reality.</h3>
      </div>
      <div class="manifest-panel__controls manifest-panel__controls--centered">
        <button class="button manifest-panel__button" data-action="manifest" ${canManifest ? "" : "disabled"}>
          ${manifestInProgress ? "Manifesting..." : "Manifest"}
        </button>
        <button class="button button--ghost manifest-panel__audio" data-action="toggle-mute">${state.settings.muted ? "Audio Off" : "Audio On"}</button>
      </div>
      <button class="manifest-panel__switch ${quickManifestationsEnabled ? "is-active" : ""}" type="button" data-action="toggle-quick-manifest" aria-pressed="${quickManifestationsEnabled ? "true" : "false"}">
        <span class="manifest-panel__switch-track"><span class="manifest-panel__switch-thumb"></span></span>
        <span class="manifest-panel__switch-copy">
          <strong>Quick Manifestations</strong>
          <small>${quickManifestationsEnabled ? "Enabled" : "Disabled"}</small>
        </span>
      </button>
      ${
        last
          ? `
            <div class="manifest-result manifest-result--forge">
              ${
                last.isCrystalUpgrade
                  ? `<div class="manifest-result__art manifest-result__art--upgrade"><div class="manifest-result__fallback">${escapeHtml(last.targetRarity?.slice(0, 1) ?? "U")}</div></div>`
                  : `<div class="manifest-result__art">${renderBuildingArt(last.building?.imagePath, `${last.rolledName} artwork`, `<div class="manifest-result__fallback">${escapeHtml(last.rolledName.slice(0, 1))}</div>`)}</div>`
              }
              <div class="manifest-result__copy">
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
            </div>
          `
          : ""
      }
    </section>
  `;
}
