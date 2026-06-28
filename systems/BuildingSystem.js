// Building instance lifecycle helpers.
// This file handles quality thresholds, building stages, manifestation merges,
// overflow into shards, and metadata updates for individual structures.
import { BUILDING_ACTIVE_THRESHOLD, BUILDING_QUALITY_CAP } from "../content/Config.js?v=v1.7.21-20260628063649";
import { getCatalogKey } from "../content/BuildingCatalog.js?v=v1.7.21-20260628063649";
import { createId } from "../engine/Utils.js?v=v1.7.21-20260628063649";
import { createBuildingGameplayProfile } from "./BalanceSystem.js?v=v1.7.21-20260628063649";
import { addShards } from "./ShardSystem.js?v=v1.7.21-20260628063649";

export function getBuildingMultiplier(quality) {
  if (quality >= BUILDING_QUALITY_CAP) {
    return 3;
  }
  if (quality >= 220) {
    return 2;
  }
  if (quality >= BUILDING_ACTIVE_THRESHOLD) {
    return 1;
  }
  return 0;
}

export function getBuildingLevel(quality) {
  return Math.max(1, getBuildingMultiplier(quality));
}

export function canEmpowerBuilding(building) {
  return Boolean(
    building &&
      building.isComplete &&
      !building.isRuined &&
      Number(building.quality ?? 0) >= BUILDING_ACTIVE_THRESHOLD &&
      Number(building.quality ?? 0) < BUILDING_QUALITY_CAP
  );
}

export function getEmpowermentCandidates(state) {
  return [...(state.buildings ?? [])]
    .filter(canEmpowerBuilding)
    .sort((left, right) => {
      const qualityDelta = Number(left.quality ?? 0) - Number(right.quality ?? 0);
      if (qualityDelta !== 0) {
        return qualityDelta;
      }
      return left.displayName.localeCompare(right.displayName);
    });
}

export function formatBuildingQualityDisplay(building) {
  const quality = Number(building?.quality ?? 0);
  if (quality >= 300) {
    return `Level ${getBuildingLevel(quality)}`;
  }
  if (quality >= 200) {
    return "Level 2";
  }
  if (quality >= BUILDING_ACTIVE_THRESHOLD) {
    return "Active";
  }
  return `${Math.round(quality)}%`;
}

export function formatBuildingExactQualityDisplay(building) {
  const quality = Number(building?.quality ?? 0);
  return `${Math.round(quality)}%`;
}

export function getBuildingCatalogStatusLabel(building) {
  if (!building) {
    return "Not Found";
  }

  if (building.isRuined) {
    return "Inactive";
  }

  const multiplier = getBuildingMultiplier(building.quality);
  if (multiplier >= 3) {
    return "Active x3";
  }
  if (multiplier >= 2) {
    return "Active x2";
  }
  if (multiplier >= 1) {
    return "Active";
  }
  return "Inactive";
}

function updateCompletionState(building, completedAt, completedDayOffset) {
  const wasComplete = building.isComplete;
  building.multiplier = getBuildingMultiplier(building.quality);
  building.isComplete = building.quality >= BUILDING_ACTIVE_THRESHOLD;
  if (!wasComplete && building.isComplete && !building.completedAt) {
    building.completedAt = completedAt;
    building.completedDayOffset = completedDayOffset;
    building.history.push({
      type: "completion",
      at: completedAt,
      details: `${building.displayName} completed at 100% quality.`
    });
  }
}

export function createBuildingInstance(state, catalogEntry, quality, timestamps) {
  const profile = createBuildingGameplayProfile(catalogEntry);
  const building = {
    id: createId("building"),
    key: catalogEntry.key,
    name: catalogEntry.name,
    displayName: catalogEntry.displayName ?? catalogEntry.name,
    rarity: catalogEntry.rarity,
    quality,
    multiplier: 0,
    isComplete: false,
    isRuined: false,
    district: catalogEntry.district,
    iconKey: catalogEntry.iconKey,
    imagePath: catalogEntry.imagePath ?? null,
    imageData: "",
    flavorText: catalogEntry.flavorText ?? null,
    mapPosition: null,
    tags: catalogEntry.tags,
    stats: profile.stats,
    resourceRates: profile.resourceRates,
    tierOverrides:
      catalogEntry.tierOverrides && typeof catalogEntry.tierOverrides === "object"
        ? structuredClone(catalogEntry.tierOverrides)
        : {},
    apexNote: typeof catalogEntry.apexNote === "string" ? catalogEntry.apexNote : "",
    citizenEffects: profile.citizenEffects,
    specialEffect: catalogEntry.specialEffect,
    createdAt: timestamps.date,
    createdDayOffset: timestamps.dayOffset,
    lastManifestedAt: timestamps.date,
    lastManifestedDayOffset: timestamps.dayOffset,
    completedAt: null,
    completedDayOffset: null,
    history: [{ type: "manifest", at: timestamps.date, details: `Manifested at ${quality}% quality.` }]
  };

  updateCompletionState(building, timestamps.date, timestamps.dayOffset);
  state.buildings.push(building);
  return { building, overflow: 0, wasNew: true };
}

export function manifestIntoBuilding(state, catalogEntry, qualityRoll, timestamps) {
  const key = getCatalogKey(catalogEntry.name, catalogEntry.rarity);
  const existing = state.buildings.find((building) => building.key === key);

  if (!existing) {
    const created = createBuildingInstance(state, catalogEntry, qualityRoll, timestamps);
    return {
      ...created,
      previousQuality: 0,
      appliedQuality: qualityRoll,
      finalQuality: created.building.quality,
      crossedActivation: created.building.quality >= BUILDING_ACTIVE_THRESHOLD
    };
  }

  const previousQuality = existing.quality;
  existing.lastManifestedAt = timestamps.date;
  existing.lastManifestedDayOffset = timestamps.dayOffset;
  existing.history.push({
    type: "manifest",
    at: timestamps.date,
    details: `Manifested additional ${qualityRoll}% quality.`
  });

  const targetQuality = existing.quality + qualityRoll;
  const overflow = Math.max(0, targetQuality - BUILDING_QUALITY_CAP);
  existing.quality = Math.min(BUILDING_QUALITY_CAP, targetQuality);
  updateCompletionState(existing, timestamps.date, timestamps.dayOffset);
  if (overflow > 0) {
    addShards(state, catalogEntry.rarity, overflow);
  }
  return {
    building: existing,
    overflow,
    wasNew: false,
    previousQuality,
    appliedQuality: qualityRoll,
    finalQuality: existing.quality,
    crossedActivation: previousQuality < BUILDING_ACTIVE_THRESHOLD && existing.quality >= BUILDING_ACTIVE_THRESHOLD
  };
}

export function removeBuilding(state, buildingId) {
  state.buildings = state.buildings.filter((building) => building.id !== buildingId);
}

export function setBuildingQuality(building, quality) {
  const wasComplete = building.isComplete;
  building.quality = Math.max(0, Math.min(BUILDING_QUALITY_CAP, Number(quality)));
  building.multiplier = getBuildingMultiplier(building.quality);
  building.isComplete = building.quality >= BUILDING_ACTIVE_THRESHOLD;
  if (!wasComplete && building.isComplete && !building.completedAt) {
    building.completedAt = building.lastManifestedAt ?? building.createdAt ?? null;
    building.completedDayOffset = building.lastManifestedDayOffset ?? building.createdDayOffset ?? null;
    building.history.push({
      type: "completion",
      at: building.completedAt,
      details: `${building.displayName} completed after an admin quality update.`
    });
  }
}

export function getEmpowermentShardCostAtQuality(quality) {
  const normalizedQuality = Math.max(BUILDING_ACTIVE_THRESHOLD, Number(quality) || 0);
  if (normalizedQuality >= 300) {
    return 4;
  }
  if (normalizedQuality >= 200) {
    return 3;
  }
  return 2;
}

export function getEmpowermentShardProjection(startQuality, availableShards, requestedAmount = 1) {
  const previousQuality = Math.max(BUILDING_ACTIVE_THRESHOLD, Number(startQuality) || BUILDING_ACTIVE_THRESHOLD);
  const remainingQuality = Math.max(0, BUILDING_QUALITY_CAP - previousQuality);
  const shardBudget = Math.max(0, Math.floor(Number(availableShards) || 0));
  const requestedQuality =
    requestedAmount === "max"
      ? Math.ceil(remainingQuality)
      : Math.max(1, Math.floor(Number(requestedAmount) || 1));
  const maxQualitySteps = Math.min(Math.ceil(remainingQuality), requestedQuality);
  let spentShards = 0;
  let appliedSteps = 0;

  for (let index = 0; index < maxQualitySteps; index += 1) {
    const stepCost = getEmpowermentShardCostAtQuality(previousQuality + appliedSteps);
    if (spentShards + stepCost > shardBudget) {
      break;
    }
    spentShards += stepCost;
    appliedSteps += 1;
  }

  return {
    requestedQuality,
    appliedQuality: Math.min(remainingQuality, appliedSteps),
    spentShards,
    remainingQuality,
    nextPercentCost: remainingQuality > 0 ? getEmpowermentShardCostAtQuality(previousQuality) : 0
  };
}

export function empowerBuildingWithShards(state, buildingId, requestedAmount = 1) {
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return { ok: false, reason: "Building not found." };
  }
  if (!building.isComplete || Number(building.quality ?? 0) < BUILDING_ACTIVE_THRESHOLD) {
    return { ok: false, reason: `${building.displayName} must be manifested at 100% before it can be empowered.` };
  }
  if (building.isRuined) {
    return { ok: false, reason: `${building.displayName} is ruined and cannot be empowered right now.` };
  }

  const previousQuality = Number(building.quality ?? 0) || 0;
  const remainingQuality = Math.max(0, BUILDING_QUALITY_CAP - previousQuality);
  if (remainingQuality <= 0) {
    return { ok: false, reason: `${building.displayName} is already empowered to ${BUILDING_QUALITY_CAP}%.` };
  }

  const availableShards = Math.max(0, Math.floor(Number(state.shards?.[building.rarity] ?? 0) || 0));
  if (availableShards <= 0) {
    return { ok: false, reason: `No ${building.rarity} shards are available.` };
  }

  const projection = getEmpowermentShardProjection(previousQuality, availableShards, requestedAmount);
  const { spentShards, appliedQuality, requestedQuality, nextPercentCost } = projection;

  if (spentShards <= 0 || appliedQuality <= 0) {
    return { ok: false, reason: `${building.displayName} needs ${nextPercentCost} ${building.rarity} shards for the next 1% quality.` };
  }

  state.shards[building.rarity] = availableShards - spentShards;
  setBuildingQuality(building, previousQuality + appliedQuality);
  building.lastEmpoweredAt = state.calendar?.dayOffset !== undefined ? state.calendar.dayOffset : null;
  building.history = Array.isArray(building.history) ? building.history : [];
  building.history.push({
    type: "empowerment",
    at: state.calendar?.dayOffset !== undefined ? `Day ${state.calendar.dayOffset}` : "Unknown",
    details: `Empowered with ${spentShards} ${building.rarity} shard${spentShards === 1 ? "" : "s"} to ${Math.round(building.quality)}% quality.`
  });

  return {
    ok: true,
    buildingId: building.id,
    name: building.displayName,
    rarity: building.rarity,
    previousQuality,
    finalQuality: building.quality,
    spentShards,
    appliedQuality,
    requestedQuality,
    remainingShards: state.shards[building.rarity],
    capped: building.quality >= BUILDING_QUALITY_CAP
  };
}

export function setBuildingRuinState(building, isRuined, source = "Admin") {
  building.isRuined = Boolean(isRuined);
  building.history.push({
    type: building.isRuined ? "ruined" : "repaired",
    at: building.lastManifestedAt ?? building.createdAt ?? "Unknown",
    details: building.isRuined
      ? `${building.displayName} was marked ruined by ${source}.`
      : `${building.displayName} was repaired by ${source}.`
  });
}

export function updateBuildingMetadata(state, buildingId, updates) {
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return null;
  }
  Object.assign(building, updates);
  setBuildingQuality(building, building.quality);
  return building;
}

export const BUILDING_OUTPUT_RESOURCE_KEYS = ["gold", "food", "materials", "salvage", "mana"];
const BUILDING_OUTPUT_TIERS = [2, 3];

function normalizeOutputRates(rawRates) {
  const rates = {};
  for (const key of BUILDING_OUTPUT_RESOURCE_KEYS) {
    const numeric = Number(rawRates?.[key]);
    rates[key] = Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
  }
  return rates;
}

function normalizeTierOverrides(rawTierOverrides) {
  if (!rawTierOverrides || typeof rawTierOverrides !== "object") {
    return {};
  }
  const normalized = {};
  for (const tier of BUILDING_OUTPUT_TIERS) {
    const source = rawTierOverrides[tier] ?? rawTierOverrides[String(tier)];
    if (source && typeof source === "object") {
      normalized[tier] = normalizeOutputRates(source);
    }
  }
  return normalized;
}

// Resolve the effective per-day rate for a single resource at the building's
// current quality tier. Tiers default to base x multiplier, but an explicit
// per-tier override (set in the Building Output editor) takes precedence.
export function getBuildingTierResourceRate(building, resource) {
  const multiplier = Number(building?.multiplier ?? 0);
  if (multiplier <= 0) {
    return 0;
  }
  const base = Number(building?.resourceRates?.[resource] ?? 0) || 0;
  if (multiplier === 1) {
    return base;
  }
  const override = building?.tierOverrides?.[multiplier]?.[resource];
  if (override !== undefined && override !== null && Number.isFinite(Number(override))) {
    return Number(override);
  }
  return base * multiplier;
}

// List one editable row per distinct building TYPE currently in play, including
// base rates and any per-tier overrides from a representative instance.
export function getBuildingOutputTypes(state) {
  const byKey = new Map();
  for (const building of state.buildings ?? []) {
    if (!building?.key || byKey.has(building.key)) {
      continue;
    }
    byKey.set(building.key, {
      key: building.key,
      name: building.displayName ?? building.name ?? building.key,
      rarity: building.rarity ?? "",
      rates: normalizeOutputRates(building.resourceRates),
      tierOverrides: normalizeTierOverrides(building.tierOverrides)
    });
  }
  return [...byKey.values()].sort((left, right) => left.name.localeCompare(right.name));
}

// Apply new base output rates (and optional per-tier overrides) to every
// instance of a building type, and store catalog overrides so future manifests
// of that type inherit the same configuration.
// payload: { base: {...}, tierOverrides: { 2?: {...}, 3?: {...} } }
export function setBuildingOutputRates(state, key, payload = {}) {
  if (!key) {
    return false;
  }
  const base = normalizeOutputRates(payload.base ?? payload);
  const tierOverrides = normalizeTierOverrides(payload.tierOverrides);
  let touched = 0;
  for (const building of state.buildings ?? []) {
    if (building.key !== key) {
      continue;
    }
    building.resourceRates = { ...building.resourceRates, ...base };
    building.tierOverrides = tierOverrides;
    touched += 1;
  }
  if (state.buildingCatalog?.[key]) {
    state.buildingCatalog[key].resourceOverrides = {
      ...(state.buildingCatalog[key].resourceOverrides ?? {}),
      ...base
    };
    state.buildingCatalog[key].tierOverrides = tierOverrides;
  }
  return touched > 0;
}

// True once a building has reached the 350% quality cap (its x3 apex), where
// the DM-noted apex bonus comes online.
export function isBuildingAtApex(building) {
  return Number(building?.quality ?? 0) >= BUILDING_QUALITY_CAP;
}

// The DM's note describing the bonus a building gains at 350%. Applied to every
// instance of the building type plus the catalog, so all copies and future
// manifests share the same apex bonus description.
export function setBuildingApexNote(state, buildingId, note) {
  const target = (state.buildings ?? []).find((entry) => entry.id === buildingId);
  if (!target) {
    return false;
  }
  const cleanNote = String(note ?? "").slice(0, 600);
  const key = target.key;
  for (const building of state.buildings ?? []) {
    if (building.key === key) {
      building.apexNote = cleanNote;
    }
  }
  if (state.buildingCatalog?.[key]) {
    state.buildingCatalog[key].apexNote = cleanNote;
  }
  return true;
}

export function setBuildingImageData(state, buildingId, dataUrl) {
  const target = (state.buildings ?? []).find((entry) => entry.id === buildingId);
  if (!target) {
    return false;
  }
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
    target.imageData = dataUrl;
    return true;
  }
  return false;
}

export function clearBuildingImageData(state, buildingId) {
  const target = (state.buildings ?? []).find((entry) => entry.id === buildingId);
  if (!target) {
    return false;
  }
  target.imageData = "";
  return true;
}
