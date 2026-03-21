import { BUILDING_ACTIVE_THRESHOLD, BUILDING_QUALITY_CAP } from "../content/Config.js";
import { getCatalogKey } from "../content/BuildingCatalog.js";
import { createId } from "../engine/Utils.js";
import { createBuildingGameplayProfile } from "./BalanceSystem.js";
import { addShards } from "./ShardSystem.js";

function getMultiplier(quality) {
  return Math.min(3, Math.floor(quality / 100));
}

function updateCompletionState(building, completedAt, completedDayOffset) {
  const wasComplete = building.isComplete;
  building.multiplier = getMultiplier(building.quality);
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
    flavorText: catalogEntry.flavorText ?? null,
    mapPosition: null,
    tags: catalogEntry.tags,
    stats: profile.stats,
    resourceRates: profile.resourceRates,
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
    return createBuildingInstance(state, catalogEntry, qualityRoll, timestamps);
  }

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
  return { building: existing, overflow, wasNew: false };
}

export function removeBuilding(state, buildingId) {
  state.buildings = state.buildings.filter((building) => building.id !== buildingId);
}

export function setBuildingQuality(building, quality) {
  const wasComplete = building.isComplete;
  building.quality = Math.max(0, Math.min(BUILDING_QUALITY_CAP, Number(quality)));
  building.multiplier = getMultiplier(building.quality);
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
