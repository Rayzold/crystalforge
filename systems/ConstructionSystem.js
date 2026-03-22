// Incubation and build-progress rules.
// This system converts building points per day into quality gain, applies
// support-bpd from completed structures, and computes ETA/stall information.
import { BUILDING_ACTIVE_THRESHOLD } from "../content/Config.js";
import { getBuildingConstructionSupportBpd } from "../content/BuildingCatalog.js";
import { RARITY_BUILD_POINTS_PER_PERCENT, RARITY_RANKS } from "../content/Rarities.js";
import { roundTo } from "../engine/Utils.js";
import { getDriftConstructionSlots, getDriftConstructionSpeedMultiplier } from "./DriftEvolutionSystem.js";
import { getBuildingMultiplier } from "./BuildingSystem.js";

export { getDriftConstructionSlots };

const BASE_INCUBATION_BPD = 10;
const CONSTRUCTION_BONUS_THRESHOLDS = {
  materials: 100,
  salvage: 50,
  mana: 1
};

function sortConstructionPriority(left, right) {
  if (right.quality !== left.quality) {
    return right.quality - left.quality;
  }
  if ((left.createdDayOffset ?? 0) !== (right.createdDayOffset ?? 0)) {
    return (left.createdDayOffset ?? 0) - (right.createdDayOffset ?? 0);
  }
  return left.displayName.localeCompare(right.displayName);
}

function getDefaultConstructionQueue(state) {
  return state.buildings
    .filter((building) => building.quality < BUILDING_ACTIVE_THRESHOLD)
    .sort(sortConstructionPriority)
    .map((building) => building.id);
}

function clampConstructionSpeedMultiplier(multiplier) {
  return Math.max(0, Number(multiplier ?? 1) || 0);
}

function createResourcePool(resources = {}) {
  return {
    materials: Math.max(0, Number(resources.materials ?? 0) || 0),
    salvage: Math.max(0, Number(resources.salvage ?? 0) || 0),
    mana: Math.max(0, Number(resources.mana ?? 0) || 0)
  };
}

function getConstructionSpeedMultiplier(state) {
  return clampConstructionSpeedMultiplier(state.constructionSpeedMultiplier) * getDriftConstructionSpeedMultiplier(state);
}

function getBuildingRank(buildingOrRarity) {
  const rarity = typeof buildingOrRarity === "string" ? buildingOrRarity : buildingOrRarity?.rarity;
  return RARITY_RANKS[rarity] ?? 1;
}

function getBuildPointsPerPercent(buildingOrRarity) {
  const rarity = typeof buildingOrRarity === "string" ? buildingOrRarity : buildingOrRarity?.rarity;
  return RARITY_BUILD_POINTS_PER_PERCENT[rarity] ?? RARITY_BUILD_POINTS_PER_PERCENT.Common;
}

function getConstructionRequirementProfile(building) {
  const tags = new Set(building.tags ?? []);
  const rank = getBuildingRank(building);
  const requiresSalvage =
    rank >= 2 &&
    (
      tags.has("industry") ||
      tags.has("military") ||
      tags.has("harbor") ||
      tags.has("civic") ||
      tags.has("culture") ||
      tags.has("arcane") ||
      tags.has("frontier")
    );
  const requiresMana =
    tags.has("arcane") ||
    tags.has("frontier") ||
    (tags.has("religious") && rank >= 3);

  return {
    rank,
    requiresSalvage,
    requiresMana,
    pointsPerPercent: getBuildPointsPerPercent(building),
    materialPerPercent: rank ** 2,
    salvagePerPercent: requiresSalvage ? rank ** 2 : 0,
    manaPerPercent: requiresMana ? rank : 0
  };
}

function getCompletedConstructionSupportBuildingBpd(state) {
  return state.buildings.reduce((sum, building) => {
    if (!building.isComplete || building.isRuined) {
      return sum;
    }

    const supportBpd = getBuildingConstructionSupportBpd(building);
    if (!supportBpd) {
      return sum;
    }

    return sum + supportBpd * Math.max(1, getBuildingMultiplier(building.quality));
  }, 0);
}

function getEffectiveConstructionSupportBpd(state) {
  const rawSupportBpd = getCompletedConstructionSupportBuildingBpd(state);
  const speedMultiplier = getConstructionSpeedMultiplier(state);
  const extraMultiplier = Math.max(0, speedMultiplier - 1);
  return rawSupportBpd + Math.floor(rawSupportBpd * extraMultiplier * 0.5);
}

function calculatePercentCost(profile, percent) {
  return {
    materials: profile.materialPerPercent * percent,
    salvage: profile.salvagePerPercent * percent,
    mana: profile.manaPerPercent * percent
  };
}

function getMaxAffordablePercent(resourcePool, profile, reserveMode = false) {
  const limits = [];

  const materialReserve = reserveMode ? CONSTRUCTION_BONUS_THRESHOLDS.materials : 0;
  const salvageReserve = reserveMode ? CONSTRUCTION_BONUS_THRESHOLDS.salvage : 0;
  const manaReserve = reserveMode ? CONSTRUCTION_BONUS_THRESHOLDS.mana : 0;

  limits.push(Math.max(0, resourcePool.materials - materialReserve) / profile.materialPerPercent);

  if (profile.salvagePerPercent > 0) {
    limits.push(Math.max(0, resourcePool.salvage - salvageReserve) / profile.salvagePerPercent);
  }

  if (profile.manaPerPercent > 0) {
    limits.push(Math.max(0, resourcePool.mana - manaReserve) / profile.manaPerPercent);
  }

  return Math.max(0, Math.min(...limits));
}

function spendFromResourcePool(resourcePool, costs) {
  resourcePool.materials = Math.max(0, resourcePool.materials - costs.materials);
  resourcePool.salvage = Math.max(0, resourcePool.salvage - costs.salvage);
  resourcePool.mana = Math.max(0, resourcePool.mana - costs.mana);
}

function getStallReasons(profile, resourcePool) {
  const reasons = [];
  if (resourcePool.materials <= 0) {
    reasons.push("materials depleted");
  }
  if (profile.salvagePerPercent > 0 && resourcePool.salvage <= 0) {
    reasons.push("salvage depleted");
  }
  if (profile.manaPerPercent > 0 && resourcePool.mana <= 0) {
    reasons.push("mana depleted");
  }
  return reasons;
}

function calculateConstructionDayDetails(building, state, resourcePool) {
  const quality = Number(building.quality ?? 0);
  const remainingPercent = Math.max(0, BUILDING_ACTIVE_THRESHOLD - quality);
  const profile = getConstructionRequirementProfile(building);
  const speedMultiplier = getConstructionSpeedMultiplier(state);
  const baseBpd = BASE_INCUBATION_BPD * speedMultiplier;
  const rawSupportBpd = getCompletedConstructionSupportBuildingBpd(state);
  const supportBpd = getEffectiveConstructionSupportBpd(state);

  if (remainingPercent <= 0) {
    return {
      rank: profile.rank,
      pointsPerPercent: profile.pointsPerPercent,
      remainingPercent,
      baseBpd,
      rawSupportBpd,
      supportBpd,
      totalBpd: 0,
      rate: 0,
      dailyPercent: 0,
      basePercent: 0,
      supportPercent: 0,
      dailyCosts: { materials: 0, salvage: 0, mana: 0 },
      requiresSalvage: profile.requiresSalvage,
      requiresMana: profile.requiresMana,
      isStalled: false,
      stallReasons: [],
      supportReserved: false,
      readyDayOffset: state.calendar.dayOffset,
      daysRemaining: 0
    };
  }

  const baseTargetPercent = baseBpd / profile.pointsPerPercent;
  const baseAffordablePercent = getMaxAffordablePercent(resourcePool, profile, false);
  const basePercent = Math.min(remainingPercent, baseTargetPercent, baseAffordablePercent);
  const baseCosts = calculatePercentCost(profile, basePercent);

  const afterBasePool = { ...resourcePool };
  spendFromResourcePool(afterBasePool, baseCosts);

  const supportTargetPercent = supportBpd / profile.pointsPerPercent;
  const supportAffordablePercent = getMaxAffordablePercent(afterBasePool, profile, true);
  const supportPercent = Math.min(Math.max(0, remainingPercent - basePercent), supportTargetPercent, supportAffordablePercent);
  const supportCosts = calculatePercentCost(profile, supportPercent);

  const dailyPercent = roundTo(basePercent + supportPercent, 4);
  const dailyCosts = {
    materials: roundTo(baseCosts.materials + supportCosts.materials, 4),
    salvage: roundTo(baseCosts.salvage + supportCosts.salvage, 4),
    mana: roundTo(baseCosts.mana + supportCosts.mana, 4)
  };
  const totalBpd = roundTo(dailyPercent * profile.pointsPerPercent, 2);
  const supportReserved = supportBpd > 0 && supportPercent < supportTargetPercent;
  const isStalled = dailyPercent <= 0;

  return {
    rank: profile.rank,
    pointsPerPercent: profile.pointsPerPercent,
    remainingPercent,
    baseBpd: roundTo(baseBpd, 2),
    rawSupportBpd,
    supportBpd,
    totalBpd,
    rate: roundTo(dailyPercent, 4),
    dailyPercent: roundTo(dailyPercent, 4),
    basePercent: roundTo(basePercent, 4),
    supportPercent: roundTo(supportPercent, 4),
    dailyCosts,
    requiresSalvage: profile.requiresSalvage,
    requiresMana: profile.requiresMana,
    isStalled,
    stallReasons: isStalled ? getStallReasons(profile, resourcePool) : [],
    supportReserved
  };
}

function buildActiveConstructionPreview(state) {
  const preview = new Map();
  const resourcePool = createResourcePool(state.resources);

  for (const building of getActiveConstructionQueue(state)) {
    const details = calculateConstructionDayDetails(building, state, resourcePool);
    spendFromResourcePool(resourcePool, details.dailyCosts);
    preview.set(building.id, details);
  }

  return preview;
}

export function normalizeConstructionPriority(state) {
  const validIds = new Set(
    state.buildings
      .filter((building) => building.quality < BUILDING_ACTIVE_THRESHOLD)
      .map((building) => building.id)
  );
  const persisted = Array.isArray(state.constructionPriority) ? state.constructionPriority : [];
  const deduped = [];
  const seen = new Set();

  for (const id of persisted) {
    if (!validIds.has(id) || seen.has(id)) {
      continue;
    }
    deduped.push(id);
    seen.add(id);
  }

  for (const id of getDefaultConstructionQueue(state)) {
    if (seen.has(id)) {
      continue;
    }
    deduped.push(id);
    seen.add(id);
  }

  state.constructionPriority = deduped;
  const paused = Array.isArray(state.pausedConstructionIds) ? state.pausedConstructionIds : [];
  state.pausedConstructionIds = paused.filter((id, index) => validIds.has(id) && paused.indexOf(id) === index);
  return deduped;
}

export function getConstructionQueue(state) {
  const orderedIds = normalizeConstructionPriority(state);
  return orderedIds
    .map((id) => state.buildings.find((building) => building.id === id))
    .filter(Boolean);
}

export function getActiveConstructionQueue(state) {
  const pausedIds = new Set(state.pausedConstructionIds ?? []);
  return getConstructionQueue(state)
    .filter((building) => !pausedIds.has(building.id))
    .slice(0, getDriftConstructionSlots(state));
}

export function getAvailableConstructionQueue(state) {
  const activeIds = new Set(getActiveConstructionQueue(state).map((building) => building.id));
  return getConstructionQueue(state).filter((building) => !activeIds.has(building.id));
}

export function getConstructionQueuePosition(state, buildingId) {
  return getConstructionQueue(state).findIndex((building) => building.id === buildingId);
}

export function isBuildingActivelyConstructed(state, buildingId) {
  return getActiveConstructionQueue(state).some((building) => building.id === buildingId);
}

export function moveConstructionPriority(state, buildingId, direction) {
  const queue = normalizeConstructionPriority(state);
  const index = queue.indexOf(buildingId);
  if (index === -1) {
    return { ok: false, reason: "Building is not in the construction queue." };
  }

  if (direction === "top") {
    if (index === 0) {
      return { ok: true, moved: false };
    }
    queue.splice(index, 1);
    queue.unshift(buildingId);
    return { ok: true, moved: true };
  }

  const delta = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const targetIndex = index + delta;
  if (delta === 0 || targetIndex < 0 || targetIndex >= queue.length) {
    return { ok: true, moved: false };
  }

  [queue[index], queue[targetIndex]] = [queue[targetIndex], queue[index]];
  return { ok: true, moved: true };
}

export function pauseConstruction(state, buildingId) {
  const queue = normalizeConstructionPriority(state);
  const activeIds = new Set(getActiveConstructionQueue(state).map((building) => building.id));
  if (!queue.includes(buildingId)) {
    return { ok: false, reason: "Building is not in the construction queue." };
  }
  if (!activeIds.has(buildingId)) {
    return { ok: true, changed: false };
  }

  const paused = new Set(state.pausedConstructionIds ?? []);
  paused.add(buildingId);
  state.pausedConstructionIds = Array.from(paused);
  return { ok: true, changed: true };
}

export function activateConstruction(state, buildingId) {
  const queue = normalizeConstructionPriority(state);
  const index = queue.indexOf(buildingId);
  if (index === -1) {
    return { ok: false, reason: "Building is not in the construction queue." };
  }

  state.pausedConstructionIds = (state.pausedConstructionIds ?? []).filter((id) => id !== buildingId);
  if (index > 0) {
    queue.splice(index, 1);
    queue.unshift(buildingId);
  }
  return { ok: true, changed: true };
}

export function getConstructionProgressDetails(building, state, options = {}) {
  const { assumeActive = false } = options;

  if ((assumeActive || isBuildingActivelyConstructed(state, building.id)) && building.quality < BUILDING_ACTIVE_THRESHOLD) {
    return buildActiveConstructionPreview(state).get(building.id) ?? calculateConstructionDayDetails(building, state, createResourcePool(state.resources));
  }

  return calculateConstructionDayDetails(building, state, createResourcePool(state.resources));
}

export function getBuildingDailyRate(building, state) {
  return getConstructionProgressDetails(building, state).dailyPercent;
}

export function getConstructionEtaDetails(building, state, options = {}) {
  const progress = getConstructionProgressDetails(building, state, options);
  const remainingPercent = Math.max(0, BUILDING_ACTIVE_THRESHOLD - Number(building.quality ?? 0));

  if (remainingPercent <= 0) {
    return {
      ...progress,
      remainingPercent,
      daysRemaining: 0,
      readyDayOffset: state.calendar.dayOffset
    };
  }

  if (progress.dailyPercent <= 0) {
    return {
      ...progress,
      remainingPercent,
      daysRemaining: null,
      readyDayOffset: null
    };
  }

  const rawDaysRemaining = remainingPercent / progress.dailyPercent;
  return {
    ...progress,
    remainingPercent,
    daysRemaining: Math.ceil(rawDaysRemaining * 10) / 10,
    readyDayOffset: state.calendar.dayOffset + Math.ceil(rawDaysRemaining)
  };
}

export function advanceConstructionOneDay(state, currentDate, currentDayOffset) {
  const completedToday = [];

  for (const building of getActiveConstructionQueue(state)) {
    const details = getConstructionProgressDetails(building, state, { assumeActive: true });
    if (details.dailyPercent <= 0) {
      continue;
    }

    spendFromResourcePool(state.resources, details.dailyCosts);
    building.quality = Math.min(BUILDING_ACTIVE_THRESHOLD, Number(building.quality ?? 0) + details.dailyPercent);
    building.multiplier = getBuildingMultiplier(building.quality);

    if (building.quality >= BUILDING_ACTIVE_THRESHOLD && !building.isComplete) {
      building.isComplete = true;
      building.completedAt = currentDate;
      building.completedDayOffset = currentDayOffset;
      building.history.push({
        type: "completion",
        at: currentDate,
        details: `${building.displayName} completed through Drift incubation.`
      });
      completedToday.push(building);
    }
  }

  return completedToday;
}
