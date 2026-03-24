import { getBuildingEconomySummary, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import {
  getConstructionEtaDetails,
  getConstructionQueuePosition,
  getDriftConstructionSlots,
  isBuildingActivelyConstructed
} from "../systems/ConstructionSystem.js";
import { formatBuildingExactQualityDisplay, formatBuildingQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";
import { renderUiIcon } from "./UiIcons.js";

function renderIcon(iconKey) {
  const shapes = {
    leaf: `<path d="M32 10c-12 2-20 13-20 24 0 10 7 20 20 20s20-10 20-20C52 22 44 12 32 10Zm0 7c4 8 2 21-8 28" />`,
    coins: `<circle cx="24" cy="28" r="10" /><circle cx="40" cy="36" r="10" />`,
    home: `<path d="M10 30 32 12l22 18v20H10Z" /><path d="M24 50V34h16v16" />`,
    shield: `<path d="M32 10 52 18v14c0 12-8 20-20 24C20 52 12 44 12 32V18Z" />`,
    hammer: `<path d="M18 16h16v10H18zM34 18l12-8 6 6-8 12ZM28 26l6 6-16 16-6-6Z" />`,
    star: `<path d="m32 8 6 16 16 2-12 10 4 16-14-9-14 9 4-16L10 26l16-2Z" />`,
    spire: `<path d="M32 8 46 24 40 24 48 56 16 56 24 24 18 24Z" />`,
    anchor: `<path d="M32 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 12v24m-14-8c2 10 8 14 14 14s12-4 14-14m-18 0h-8m34 0h-8" />`,
    scroll: `<path d="M18 14h24a8 8 0 1 1 0 16H20a8 8 0 1 0 0 16h26" />`,
    gate: `<path d="M14 54V20l18-10 18 10v34H14Zm18 0V28" />`,
    crown: `<path d="m12 46 6-20 14 10 14-10 6 20ZM18 18l6 8 8-14 8 14 6-8" />`,
    clock: `<circle cx="32" cy="32" r="20" /><path d="M32 20v14l10 6" />`,
    columns: `<path d="M16 50V20m12 30V20m12 30V20m12 30V20M10 18h44M10 50h44" />`,
    guild: `<path d="M14 50V18h36v32Zm8-24h20m-20 8h20m-20 8h12" />`,
    castle: `<path d="M14 54V18h10v8h8v-8h10v8h8v-8h8v36Z" />`,
    signal: `<path d="M32 20v24m0-24 10 10m-10-10-10 10m10 6 14 14m-14-14-14 14" />`,
    crystal: `<path d="m32 8 14 18-14 30-14-30Z" />`,
    banner: `<path d="M18 10v44M22 12h20l-4 8 4 8H22Z" />`,
    wave: `<path d="M10 36c8 0 8-8 16-8s8 8 16 8 8-8 16-8v16H10Z" />`
  };

  return `
    <svg viewBox="0 0 64 64" class="building-card__icon-svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      ${shapes[iconKey] ?? shapes.spire}
    </svg>
  `;
}

function renderMedia(building) {
  return `
    <div class="building-card__banner ${building.imagePath ? "" : "building-card__banner--fallback"}">
      ${renderBuildingArt(
        building.imagePath,
        `${building.displayName} artwork`,
        `<div class="building-card__icon">${renderIcon(building.iconKey)}</div>`
      )}
    </div>
  `;
}

function renderStatList(record, inactive) {
  return Object.entries(record)
    .map(
      ([key, value]) => `
        <li class="${inactive ? "is-muted" : ""}">
          <span>${escapeHtml(key)}</span>
          <strong>${formatSigned(value)}</strong>
        </li>
      `
    )
    .join("");
}

function getCompactStatus(building, { isIncomplete, isActiveConstruction, queuePosition, driftSlots, eta }) {
  if (building.isRuined) {
    return "Ruined / inactive until repaired";
  }
  if (!isIncomplete) {
    return `Operational / Quality ${formatBuildingQualityDisplay(building)}`;
  }
  if (isActiveConstruction) {
    return eta ? `Growing now / ETA ${eta}` : "Growing now / stalled";
  }
  return `Queued #${queuePosition + 1} / ${driftSlots} slots`;
}

function getCompactStageBadge(building) {
  return `${Math.round(Number(building.quality ?? 0))}%`;
}

function getQualityMultiplierReadout(building) {
  const multiplier = getBuildingMultiplier(building?.quality ?? 0);
  return `${formatBuildingExactQualityDisplay(building)}${multiplier > 1 ? ` · ${multiplier}x` : ""}`;
}

function getInputWarnings(building, state, etaDetails, economySummary) {
  const warnings = [];
  if (etaDetails?.isStalled) {
    warnings.push(`Stalled: ${etaDetails.stallReasons?.join(", ") || "insufficient stock"}`);
  }

  for (const entry of economySummary.consumes) {
    if (entry.key === "upkeep") {
      continue;
    }
    const stock = Number(state.resources?.[entry.key] ?? 0);
    const lowThreshold = Math.max(5, Number(entry.value ?? 0) * 2);
    if (stock <= 0) {
      warnings.push(`No ${entry.key} available`);
    } else if (stock <= lowThreshold) {
      warnings.push(`Low ${entry.key}`);
    }
  }

  return [...new Set(warnings)];
}

function getBuildingSignature(building) {
  const primaryTag = building.tags?.[0] ?? "";
  const signatures = {
    agriculture: ["food", "Harvest"],
    trade: ["gold", "Trade"],
    industry: ["materials", "Industry"],
    military: ["defense", "Military"],
    arcane: ["mana", "Arcane"],
    religious: ["health", "Sacred"],
    civic: ["history", "Civic"],
    housing: ["population", "Housing"],
    harbor: ["route", "Harbor"],
    culture: ["prestige", "Culture"],
    frontier: ["event", "Frontier"]
  };
  return signatures[primaryTag] ?? ["building", "Structure"];
}

export function renderBuildingCard(building, state) {
  const buildingEmoji = getBuildingEmoji(building);
  const selected = state.ui.selectedBuildingId === building.id;
  const isRecentlyChanged = Boolean(state.transientUi?.recentBuildingChanges?.[building.id]);
  const isPinned = Boolean(state.settings?.pinnedBuildingIds?.includes(building.id));
  const isIncomplete = !building.isComplete;
  const isRuined = Boolean(building.isRuined);
  const isActiveConstruction = isIncomplete && isBuildingActivelyConstructed(state, building.id);
  const etaDetails = isIncomplete ? getConstructionEtaDetails(building, state) : null;
  const queuePosition = isIncomplete ? getConstructionQueuePosition(state, building.id) : -1;
  const driftSlots = getDriftConstructionSlots(state);
  const eta = isActiveConstruction && etaDetails?.readyDayOffset !== null ? formatDate(etaDetails.readyDayOffset) : null;
  const progressPercent = Math.min(100, building.quality);
  const [signatureIcon, signatureLabel] = getBuildingSignature(building);
  const economySummary = getBuildingEconomySummary(building);
  const topStats = Object.entries(building.stats ?? {})
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 3);
  const summaryRate = Object.entries(building.resourceRates ?? {})
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 2);
  const compactStatus = getCompactStatus(building, { isIncomplete, isActiveConstruction, queuePosition, driftSlots, eta });
  const inputWarnings = getInputWarnings(building, state, etaDetails, economySummary);

  return `
    <article class="building-card building-card--stream ${selected ? "is-selected" : ""} ${isIncomplete ? "is-incomplete" : ""} ${isRuined ? "is-ruined" : ""} ${isRecentlyChanged ? "is-recently-changed" : ""} ${isPinned ? "is-pinned" : ""}" style="--rarity-color:${RARITY_COLORS[building.rarity]}">
      <button class="building-card__select" data-action="select-building" data-building-id="${building.id}" title="${escapeHtml(`${buildingEmoji} ${building.displayName}`)}" aria-label="${escapeHtml(`${buildingEmoji} ${building.displayName}`)}">
        <div class="building-card__visual">
          ${renderMedia(building)}
          <div class="building-card__overlay">
            <span class="building-card__rarity">${escapeHtml(building.rarity)}</span>
            <span class="building-card__district">${escapeHtml(building.district)}</span>
          </div>
        </div>
        <div class="building-card__signature">
          <div class="building-card__signature-mark">
            ${renderUiIcon(signatureIcon, signatureLabel)}
          </div>
          <div>
            <span>${escapeHtml(signatureLabel)} Profile</span>
            <strong>${escapeHtml(`${buildingEmoji} ${building.displayName}`)}</strong>
            <small>${escapeHtml(`${economySummary.role.label} / ${economySummary.produces.length ? "Produces" : economySummary.consumes.length ? "Consumes" : "Support"}`)}</small>
          </div>
        </div>
        <div class="building-card__header">
          <div>
            <h4>${building.mapPosition ? `Hex ${building.mapPosition.q}, ${building.mapPosition.r}` : "Awaiting placement"}</h4>
            <p>${escapeHtml(compactStatus)}</p>
          </div>
          <strong class="building-card__multiplier">${building.isComplete ? getQualityMultiplierReadout(building) : "--"}</strong>
        </div>
        <div class="building-card__quality">
          <span>${building.isComplete ? escapeHtml(getQualityMultiplierReadout(building)) : `Quality ${escapeHtml(formatBuildingQualityDisplay(building))}`}</span>
          <span>${isRuined ? "Ruined" : building.isComplete ? "Complete" : "Incomplete"}</span>
        </div>
        <div class="progress-bar"><span style="width:${progressPercent}%"></span></div>
        <div class="building-card__meta building-card__meta--compact">
          <span>${
            isRuined
              ? "Bonuses offline"
              : isIncomplete
                ? etaDetails?.isStalled
                  ? "Incubation stalled"
                  : `${formatNumber(etaDetails?.totalBpd ?? 0, 1)} build points/day / ${formatNumber(etaDetails?.dailyPercent ?? 0, 2)}% quality per day`
                : `Completed ${escapeHtml(building.completedAt ?? "today")}`
          }</span>
          <span>${escapeHtml(building.district)}</span>
        </div>
        <div class="building-card__spotlights">
          ${topStats
            .map(
              ([key, value]) => `
                <article class="building-card__spotlight ${isIncomplete ? "is-muted" : ""}">
                  <span>${escapeHtml(key)}</span>
                  <strong>${formatSigned(value)}</strong>
                </article>
              `
            )
            .join("")}
        </div>
        <p class="building-card__effect">${escapeHtml(building.specialEffect)}</p>
        <p class="building-card__flavor">${escapeHtml(building.flavorText ?? "A newly etched structure waits to define its place in Drift.")}</p>
        ${
          inputWarnings.length
            ? `<div class="building-card__warning-strip">${inputWarnings
                .map((warning) => `<span>${escapeHtml(warning)}</span>`)
                .join("")}</div>`
            : ""
        }
        <div class="building-card__resource-strip">
          ${
            summaryRate.length
              ? summaryRate
                  .map(
                    ([key, value]) => `
                      <span class="${isIncomplete ? "is-muted" : ""}">
                        ${escapeHtml(key)} ${formatSigned(value)}
                      </span>
                    `
                  )
                  .join("")
              : `<span class="is-muted">No major daily rates</span>`
          }
          ${
            economySummary.consumes.length
              ? `<span class="is-muted">Consumes ${escapeHtml(economySummary.consumes.map((entry) => entry.key).join(", "))}</span>`
              : ""
          }
        </div>
      </button>
      <div class="building-card__actions">
        ${
          state.ui.adminUnlocked
            ? `
              <label class="building-card__gm-quality-editor">
                <span>Quality %</span>
                <input
                  class="building-card__gm-quality-input"
                  type="number"
                  min="0"
                  max="350"
                  step="0.1"
                  value="${Number(building.quality ?? 0)}"
                  data-role="gm-building-quality-input"
                />
              </label>
              <button class="button button--ghost" data-action="save-building-quality" data-building-id="${building.id}">Save Quality</button>
            `
            : ""
        }
        <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
        <button class="button button--ghost building-card__pin-button ${isPinned ? "is-active" : ""}" data-action="toggle-building-pin" data-building-id="${building.id}">${isPinned ? "Unpin" : "Pin"}</button>
        ${
          state.ui.adminUnlocked
            ? `<button class="button button--ghost button--danger-icon" data-action="remove-building" data-building-id="${building.id}" aria-label="Delete ${escapeHtml(building.displayName)}" title="Delete building">🗑</button>`
            : ""
        }
      </div>
    </article>
  `;
}
