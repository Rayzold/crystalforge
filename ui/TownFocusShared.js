import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { calculateDailyResourceDelta } from "../systems/ResourceSystem.js";
import { getCurrentTownFocus, getMayorSuggestions } from "../systems/TownFocusSystem.js";

const RESOURCE_KEYS = ["gold", "food", "materials", "mana", "prosperity"];
const STAT_KEYS = ["defense", "security", "morale", "health", "prestige", "prosperity"];

function createRecord(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function getFocusResourceRecord(focus) {
  const record = createRecord(RESOURCE_KEYS);
  if (!focus?.resourceDaily) {
    return record;
  }
  for (const key of RESOURCE_KEYS) {
    record[key] = focus.resourceDaily[key] ?? 0;
  }
  return record;
}

function getFocusStatRecord(focus) {
  const record = createRecord(STAT_KEYS);
  if (!focus?.statFlat) {
    return record;
  }
  for (const key of STAT_KEYS) {
    record[key] = focus.statFlat[key] ?? 0;
  }
  return record;
}

function getFocusShardRecord(focus) {
  const record = Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0]));
  if (!focus?.shardDaily) {
    return record;
  }
  for (const rarity of RARITY_ORDER) {
    record[rarity] = focus.shardDaily[rarity] ?? 0;
  }
  return record;
}

function getRunwayDays(stockpile, dailyDelta) {
  if (dailyDelta >= 0) {
    return null;
  }
  if (stockpile <= 0) {
    return 0;
  }
  return stockpile / Math.abs(dailyDelta);
}

function sortHighlights(left, right) {
  return Math.abs(right.change) - Math.abs(left.change);
}

export function getDefaultTownFocusPreviewId(state) {
  return (
    getMayorSuggestions(state)[0]?.focusId ??
    getCurrentTownFocus(state)?.id ??
    Object.keys(TOWN_FOCUS_DEFINITIONS)[0]
  );
}

export function renderTownFocusBadge(focus, { compact = false } = {}) {
  if (!focus) {
    return "";
  }

  return `
    <div class="town-focus-badge town-focus-badge--${focus.id} ${compact ? "town-focus-badge--compact" : ""}">
      <span>${escapeHtml(focus.badgeLabel ?? focus.name)}</span>
      <strong>${escapeHtml(compact ? (focus.badgeShort ?? focus.name) : focus.name)}</strong>
    </div>
  `;
}

export function renderTownFocusEffectSummary(focus) {
  const parts = [];

  for (const [resource, amount] of Object.entries(focus.resourceDaily ?? {})) {
    parts.push(`${amount >= 0 ? "+" : ""}${formatNumber(amount, 2)} ${resource}/day`);
  }
  for (const [rarity, amount] of Object.entries(focus.shardDaily ?? {})) {
    parts.push(`+${formatNumber(amount, 2)} ${rarity} shards/day`);
  }
  for (const [stat, amount] of Object.entries(focus.statFlat ?? {})) {
    parts.push(`${amount >= 0 ? "+" : ""}${formatNumber(amount, 2)} ${stat}`);
  }

  return parts.join(" / ");
}

export function calculateTownFocusPreview(state, focusId) {
  const targetFocus = TOWN_FOCUS_DEFINITIONS[focusId];
  const currentFocus = getCurrentTownFocus(state);
  const currentDelta = calculateDailyResourceDelta(state);
  const projectedDelta = { ...currentDelta };
  const currentFocusResources = getFocusResourceRecord(currentFocus);
  const targetFocusResources = getFocusResourceRecord(targetFocus);

  for (const key of RESOURCE_KEYS) {
    projectedDelta[key] += targetFocusResources[key] - currentFocusResources[key];
  }

  const currentFocusStats = getFocusStatRecord(currentFocus);
  const targetFocusStats = getFocusStatRecord(targetFocus);
  const projectedStats = {};
  const statShift = {};

  for (const key of STAT_KEYS) {
    projectedStats[key] = (state.cityStats[key] ?? 0) + targetFocusStats[key] - currentFocusStats[key];
    statShift[key] = targetFocusStats[key] - currentFocusStats[key];
  }

  const currentFocusShards = getFocusShardRecord(currentFocus);
  const targetFocusShards = getFocusShardRecord(targetFocus);
  const projectedShards = {};
  const shardShift = {};

  for (const rarity of RARITY_ORDER) {
    projectedShards[rarity] = targetFocusShards[rarity];
    shardShift[rarity] = targetFocusShards[rarity] - currentFocusShards[rarity];
  }

  const deltaShift = {};
  for (const key of RESOURCE_KEYS) {
    deltaShift[key] = targetFocusResources[key] - currentFocusResources[key];
  }

  const resourceHighlights = RESOURCE_KEYS
    .map((key) => ({
      key,
      label: `${key}/day`,
      projected: projectedDelta[key],
      change: deltaShift[key]
    }))
    .filter((entry) => entry.change !== 0)
    .sort(sortHighlights);

  const statHighlights = STAT_KEYS
    .map((key) => ({
      key,
      label: key,
      projected: projectedStats[key],
      change: statShift[key]
    }))
    .filter((entry) => entry.change !== 0)
    .sort(sortHighlights);

  const shardHighlights = RARITY_ORDER
    .map((rarity) => ({
      key: rarity,
      label: `${rarity} shards/day`,
      projected: projectedShards[rarity],
      change: shardShift[rarity]
    }))
    .filter((entry) => entry.projected !== 0 || entry.change !== 0)
    .sort(sortHighlights);

  return {
    focus: targetFocus,
    currentFocus,
    currentDelta,
    projectedDelta,
    deltaShift,
    projectedStats,
    statShift,
    projectedShards,
    shardShift,
    resourceHighlights,
    statHighlights,
    shardHighlights,
    runway: {
      foodDays: getRunwayDays(state.resources.food, projectedDelta.food),
      goldDays: getRunwayDays(state.resources.gold, projectedDelta.gold),
      manaDays: getRunwayDays(state.resources.mana, projectedDelta.mana)
    }
  };
}

export function renderTownFocusProjectionStrip(preview) {
  const highlights = [...preview.resourceHighlights, ...preview.statHighlights, ...preview.shardHighlights].slice(0, 4);

  if (!highlights.length) {
    return `<p class="town-focus-card__projection empty-state">No change from the current focus.</p>`;
  }

  return `
    <div class="town-focus-card__projection">
      ${highlights
        .map(
          (entry) => `
            <article>
              <span>${escapeHtml(entry.label)}</span>
              <strong>${formatSigned(entry.change, 2)}</strong>
              <small>Result ${formatSigned(entry.projected, 2)}</small>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}
