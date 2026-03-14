import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getBuildingDailyRate } from "../systems/ConstructionSystem.js";

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
  if (building.imagePath) {
    return `
      <div class="building-card__art">
        <img src="${escapeHtml(building.imagePath)}" alt="${escapeHtml(building.displayName)} artwork" loading="lazy" />
      </div>
    `;
  }

  return `<div class="building-card__icon">${renderIcon(building.iconKey)}</div>`;
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

export function renderBuildingCard(building, state) {
  const selected = state.ui.selectedBuildingId === building.id;
  const isIncomplete = !building.isComplete;
  const rate = getBuildingDailyRate(building, state.constructionSpeedMultiplier);
  const daysRemaining = rate > 0 && isIncomplete ? Math.ceil((100 - building.quality) / rate) : 0;
  const eta = isIncomplete ? formatDate(state.calendar.dayOffset + daysRemaining) : null;
  const progressPercent = Math.min(100, building.quality);

  return `
    <article class="building-card ${selected ? "is-selected" : ""} ${isIncomplete ? "is-incomplete" : ""}" style="--rarity-color:${RARITY_COLORS[building.rarity]}">
      <button class="building-card__select" data-action="select-building" data-building-id="${building.id}">
        <div class="building-card__header">
          ${renderMedia(building)}
          <div>
            <h4>${escapeHtml(building.displayName)}</h4>
            <p>${escapeHtml(building.rarity)} / ${escapeHtml(building.district)}</p>
          </div>
        </div>
        <div class="building-card__quality">
          <span>Quality ${formatNumber(building.quality, 2)}%</span>
          <span>${building.isComplete ? `Active x${building.multiplier}` : "Inactive"}</span>
        </div>
        <div class="progress-bar"><span style="width:${progressPercent}%"></span></div>
        <div class="building-card__meta">
          <span>Auto ${formatNumber(rate, 2)}% / day</span>
          <span>${building.isComplete ? `Completed ${escapeHtml(building.completedAt ?? "today")}` : `ETA ${escapeHtml(eta)}`}</span>
        </div>
        <div class="building-card__meta">
          <span>${building.mapPosition ? `Hex ${building.mapPosition.q}, ${building.mapPosition.r}` : "Unplaced on map"}</span>
          <span>${building.isComplete ? `Active x${building.multiplier}` : "Needs placement planning"}</span>
        </div>
        <p class="building-card__effect">${escapeHtml(building.specialEffect)}</p>
        <div class="building-card__columns">
          <div>
            <h5>Stats</h5>
            <ul class="building-card__list">${renderStatList(building.stats, isIncomplete)}</ul>
          </div>
          <div>
            <h5>Resources / day</h5>
            <ul class="building-card__list">${renderStatList(building.resourceRates, isIncomplete)}</ul>
          </div>
        </div>
        <div class="building-card__footer">
          <span>Created ${escapeHtml(building.createdAt)}</span>
          <span>Manifested ${escapeHtml(building.lastManifestedAt)}</span>
        </div>
      </button>
    </article>
  `;
}
