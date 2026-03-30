import { getBuildingEconomySummary, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatBuildingExactQualityDisplay, getBuildingCatalogStatusLabel, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";

function renderMetricList(entries, emptyLabel) {
  if (!entries.length) {
    return `<p class="empty-state">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <ul class="manifest-result__list">
      ${entries
        .map(
          (entry) => `
            <li>
              <span>${escapeHtml(entry.label)}</span>
              <strong>${escapeHtml(entry.value)}</strong>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderLastManifestDetails(building) {
  if (!building) {
    return "";
  }

  const economySummary = getBuildingEconomySummary(building);
  const qualityReadout = `${formatBuildingExactQualityDisplay(building)}${
    getBuildingMultiplier(building.quality) > 1 ? ` / x${getBuildingMultiplier(building.quality)}` : ""
  }`;
  const stats = Object.entries(building.stats ?? {})
    .filter(([, value]) => Math.abs(Number(value) || 0) > 0)
    .map(([label, value]) => ({ label, value: formatSigned(value) }));
  const resources = Object.entries(building.resourceRates ?? {})
    .filter(([, value]) => Math.abs(Number(value) || 0) > 0)
    .map(([label, value]) => ({ label: `${label}/day`, value: formatSigned(value) }));

  return `
    <div class="manifest-result__details">
      <p class="manifest-result__effect">${escapeHtml(building.specialEffect ?? "No special effect recorded.")}</p>
      <p class="manifest-result__flavor">${escapeHtml(building.flavorText ?? "No flavor text recorded.")}</p>
      <div class="manifest-result__facts">
        <article><span>Status</span><strong>${escapeHtml(getBuildingCatalogStatusLabel(building))}</strong></article>
        <article><span>Current Quality</span><strong>${escapeHtml(qualityReadout)}</strong></article>
        <article><span>District</span><strong>${escapeHtml(building.district ?? "Unknown")}</strong></article>
        <article><span>Last Manifested</span><strong>${escapeHtml(building.lastManifestedAt ?? "Unknown")}</strong></article>
      </div>
      <div class="manifest-result__chips">
        <span class="detail-chip">${escapeHtml(`${getBuildingEmoji(building)} ${building.rarity}`)}</span>
        ${(building.tags ?? []).map((tag) => `<span class="detail-chip">${escapeHtml(tag)}</span>`).join("") || `<span class="detail-chip">untagged</span>`}
      </div>
      <div class="manifest-result__grid">
        <section class="manifest-result__panel">
          <h4>City Stats</h4>
          ${renderMetricList(stats, "No city stat changes.")}
        </section>
        <section class="manifest-result__panel">
          <h4>Resource Rhythm</h4>
          ${renderMetricList(resources, "No direct resource flow.")}
        </section>
        <section class="manifest-result__panel">
          <h4>Produces</h4>
          ${renderMetricList((economySummary.produces ?? []).map((entry) => ({ label: entry.key, value: formatSigned(entry.value) })), "No direct production.")}
        </section>
        <section class="manifest-result__panel">
          <h4>Consumes</h4>
          ${renderMetricList((economySummary.consumes ?? []).map((entry) => ({ label: entry.key, value: formatSigned(entry.value) })), "No direct costs.")}
        </section>
      </div>
      <div class="manifest-result__actions">
        <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
      </div>
    </div>
  `;
}

export function renderManifestPanel(state) {
  const last = state.ui.lastManifestResult;
  const manifestInProgress = Boolean(state.transientUi?.manifestInProgress);
  const selectedCrystals = Number(state.crystals?.[state.selectedRarity] ?? 0);
  const canManifest = !manifestInProgress && selectedCrystals > 0;
  const quickManifestationsEnabled = state.settings?.quickManifestations === true;

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
                      ${renderLastManifestDetails(last.building)}
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
