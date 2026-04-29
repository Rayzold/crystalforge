// Incubation and build-progress rules.
// This system converts building points per day into quality gain, applies
// support-bpd from completed structures, and computes ETA/stall information.
import { BUILDING_ACTIVE_THRESHOLD, SPEED_MULTIPLIERS } from "../content/Config.js";
import { getBuildingConstructionSupportBpd } from "../content/BuildingCatalog.js";
import { RARITY_BUILD_POINTS_PER_PERCENT, RARITY_RANKS } from "../content/Rarities.js";
import { roundTo } from "../engine/Utils.js";
import { getDriftConstructionSlots, getDriftConstructionSpeedMultiplier } from "./DriftEvolutionSystem.js";
import { getBuildingMultiplier } from "./BuildingSystem.js";
import {
  getBuildingWorkforceCategory,
  getConstructionWorkforceSupportBpd,
  getWorkforceSummary
} from "./WorkforceSystem.js";

export { getDriftConstructionSlots };

export const INCUBATOR_QUEUE_LIMIT = 5;

const BASE_INCUBATION_BPD = 10;
const CONSTRUCTION_BONUS_THRESHOLDS = {
  materials: 100,
  mana: 10
};
const INCUBATOR_ACCELERATION_MULTIPLIER = 3;
const SUPPORT_ACCELERATION_MULTIPLIER = 2;

export function getIncubatorSupportMultiplier(building) {
  return 1 + (building?.heroSupport ? 1 : 0) + (building?.expertSupport ? 0.5 : 0);
}

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
  const numeric = Number(multiplier ?? 1);
  if (!Number.isFinite(numeric)) {
    return 1;
  }

  return Math.min(Math.max(...SPEED_MULTIPLIERS), Math.max(Math.min(...SPEED_MULTIPLIERS), numeric));
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
  const rank = getBuildingRank(building);
  const tags = new Set(building.tags ?? []);
  const district = String(building.district ?? "");
  const isArcaneOrFrontier = tags.has("arcane") || tags.has("frontier") || district === "Arcane District" || district === "Frontier District";
  const isMilitary = tags.has("military") || district === "Military District";
  const requiresSalvage = rank >= 3;
  const requiresMana =
    isArcaneOrFrontier ||
    (isMilitary && rank >= 5);

  return {
    rank,
    requiresSalvage,
    requiresMana,
    pointsPerPercent: getBuildPointsPerPercent(building),
    materialDailyCost: rank ** 2 * 10,
    salvageDailyCost: requiresSalvage ? rank ** 2 * 10 : 0,
    manaDailyCost: requiresMana ? rank * 2 : 0
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

function createConstructionSupportAllocation(buildings = []) {
  return new Map(buildings.map((building) => [building.id, 0]));
}

function distributeSharedSupportBpd(buildings, totalBpd, allocation) {
  const normalizedBpd = Math.max(0, Math.floor(Number(totalBpd ?? 0) || 0));
  if (!buildings.length || normalizedBpd <= 0) {
    return allocation;
  }

  let remainingBpd = normalizedBpd;
  let remainingBuildings = buildings.length;

  for (const building of buildings) {
    const guaranteedShare = Math.floor(remainingBpd / remainingBuildings);
    allocation.set(building.id, (allocation.get(building.id) ?? 0) + guaranteedShare);
    remainingBpd -= guaranteedShare;
    remainingBuildings -= 1;
  }

  for (let index = 0; remainingBpd > 0; index = (index + 1) % buildings.length) {
    const building = buildings[index];
    allocation.set(building.id, (allocation.get(building.id) ?? 0) + 1);
    remainingBpd -= 1;
  }

  return allocation;
}

function buildActiveConstructionWorkforceSupportAllocation(activeQueue, workforceSummary) {
  const allocation = createConstructionSupportAllocation(activeQueue);
  if (!activeQueue.length) {
    return allocation;
  }

  const supportPools = getConstructionWorkforceSupportBpd(workforceSummary);
  distributeSharedSupportBpd(activeQueue, supportPools.generalSupportBpd, allocation);
  distributeSharedSupportBpd(activeQueue, supportPools.overflowSupportBpd, allocation);

  const categoryBuckets = new Map();
  for (const building of activeQueue) {
    const category = getBuildingWorkforceCategory(building);
    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(category, []);
    }
    categoryBuckets.get(category).push(building);
  }

  for (const [category, buildings] of categoryBuckets.entries()) {
    const categorySupportBpd = supportPools.specialistSupportBpdByCategory?.[category] ?? 0;
    distributeSharedSupportBpd(buildings, categorySupportBpd, allocation);
  }

  return allocation;
}

function getAccelerationDailyCosts(profile) {
  return {
    materials: profile.materialDailyCost,
    salvage: profile.salvageDailyCost,
    mana: profile.manaDailyCost
  };
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
  if (profile.requiresSalvage && resourcePool.salvage <= 0) {
    reasons.push("salvage depleted");
  }
  if (profile.requiresMana && resourcePool.mana <= 0) {
    reasons.push("mana depleted");
  }
  return reasons;
}

function getAccelerationStatus(profile, resourcePool, usageScale = 1) {
  const fullDailyCosts = getAccelerationDailyCosts(profile);
  const demandScale = Math.max(0, Math.min(1, Number(usageScale ?? 1) || 0));
  const dailyCosts = {
    materials: roundTo(fullDailyCosts.materials * demandScale, 4),
    salvage: roundTo(fullDailyCosts.salvage * demandScale, 4),
    mana: roundTo(fullDailyCosts.mana * demandScale, 4)
  };
  const blockers = [];

  if (resourcePool.materials <= CONSTRUCTION_BONUS_THRESHOLDS.materials) {
    blockers.push(`materials must stay above ${CONSTRUCTION_BONUS_THRESHOLDS.materials}`);
  } else if (resourcePool.materials - CONSTRUCTION_BONUS_THRESHOLDS.materials < dailyCosts.materials) {
    blockers.push(`need ${dailyCosts.materials} materials beyond the ${CONSTRUCTION_BONUS_THRESHOLDS.materials} reserve`);
  }

  if (dailyCosts.salvage > 0 && resourcePool.salvage < dailyCosts.salvage) {
    blockers.push(`need ${dailyCosts.salvage} salvage`);
  }

  if (dailyCosts.mana > 0) {
    if (resourcePool.mana <= CONSTRUCTION_BONUS_THRESHOLDS.mana) {
      blockers.push(`mana must stay above ${CONSTRUCTION_BONUS_THRESHOLDS.mana}`);
    } else if (resourcePool.mana - CONSTRUCTION_BONUS_THRESHOLDS.mana < dailyCosts.mana) {
      blockers.push(`need ${dailyCosts.mana} mana beyond the ${CONSTRUCTION_BONUS_THRESHOLDS.mana} reserve`);
    }
  }

  return {
    isApplied: blockers.length === 0,
    dailyCosts: blockers.length === 0 ? dailyCosts : { materials: 0, salvage: 0, mana: 0 },
    blockers
  };
}

function calculateConstructionDayDetails(building, state, resourcePool, options = {}) {
  const { workforceSummary: providedWorkforceSummary, workforceSupportBpd: providedWorkforceSupportBpd } = options;
  const quality = Number(building.quality ?? 0);
  const remainingPercent = Math.max(0, BUILDING_ACTIVE_THRESHOLD - quality);
  const profile = getConstructionRequirementProfile(building);
  const speedMultiplier = getConstructionSpeedMultiplier(state);
  const baseBpd = BASE_INCUBATION_BPD * speedMultiplier;
  const workforceSummary = providedWorkforceSummary ?? getWorkforceSummary(state);
  const buildingSupportBpd = getCompletedConstructionSupportBuildingBpd(state);
  const workforceSupportBpd = Math.max(0, Number(providedWorkforceSupportBpd ?? 0) || 0);
  const rawSupportBpd = buildingSupportBpd + workforceSupportBpd;
  const supportBpd = (() => {
    const extraMultiplier = Math.max(0, speedMultiplier - 1);
    return rawSupportBpd + Math.floor(rawSupportBpd * extraMultiplier * 0.5);
  })();
  // Near completion, acceleration should only ask for the fraction of support
  // resources needed to cover the remaining work, not a whole extra day.
  const acceleratedCapacityPercent =
    (baseBpd * INCUBATOR_ACCELERATION_MULTIPLIER + supportBpd * SUPPORT_ACCELERATION_MULTIPLIER) /
    profile.pointsPerPercent;
  const accelerationUsageScale =
    acceleratedCapacityPercent > 0 ? Math.min(1, remainingPercent / acceleratedCapacityPercent) : 1;
  const acceleration = getAccelerationStatus(profile, resourcePool, accelerationUsageScale);
  const incubatorSupportMultiplier = getIncubatorSupportMultiplier(building);
  const effectiveBaseBpd = baseBpd * (acceleration.isApplied ? INCUBATOR_ACCELERATION_MULTIPLIER : 1);
  const effectiveSupportBpd = supportBpd * (acceleration.isApplied ? SUPPORT_ACCELERATION_MULTIPLIER : 1);

  if (remainingPercent <= 0) {
    return {
      rank: profile.rank,
      pointsPerPercent: profile.pointsPerPercent,
      remainingPercent,
      baseBpd: roundTo(baseBpd, 2),
      effectiveBaseBpd: roundTo(effectiveBaseBpd, 2),
      buildingSupportBpd: roundTo(buildingSupportBpd, 2),
      workforceSupportBpd: roundTo(workforceSupportBpd, 2),
      rawSupportBpd,
      supportBpd,
      effectiveSupportBpd: roundTo(effectiveSupportBpd, 2),
      incubatorSupportMultiplier: roundTo(incubatorSupportMultiplier, 2),
      heroSupport: Boolean(building?.heroSupport),
      expertSupport: Boolean(building?.expertSupport),
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
      accelerationApplied: acceleration.isApplied,
      accelerationBlocked: false,
      accelerationReasons: [],
      supportReserved: false,
      readyDayOffset: state.calendar.dayOffset,
      daysRemaining: 0
    };
  }

  const baseTargetPercent = effectiveBaseBpd / profile.pointsPerPercent;
  const basePercent = Math.min(remainingPercent, baseTargetPercent);
  const supportTargetPercent = effectiveSupportBpd / profile.pointsPerPercent;
  const supportPercent = Math.min(Math.max(0, remainingPercent - basePercent), supportTargetPercent);
  const rawDailyPercent = basePercent + supportPercent;
  // Keep the real construction progress unrounded so the last sliver of a
  // building can still finish cleanly on the next day instead of rounding
  // down to zero and getting stuck just under 100%.
  const dailyPercent = Math.min(remainingPercent, rawDailyPercent * incubatorSupportMultiplier);
  const dailyCosts = {
    materials: roundTo(acceleration.dailyCosts.materials, 4),
    salvage: roundTo(acceleration.dailyCosts.salvage, 4),
    mana: roundTo(acceleration.dailyCosts.mana, 4)
  };
  const totalBpd = roundTo(dailyPercent * profile.pointsPerPercent, 2);
  const supportReserved = !acceleration.isApplied && supportBpd > 0;
  const isStalled = dailyPercent <= 0;

  return {
    rank: profile.rank,
    pointsPerPercent: profile.pointsPerPercent,
    remainingPercent,
    baseBpd: roundTo(baseBpd, 2),
    effectiveBaseBpd: roundTo(effectiveBaseBpd, 2),
    buildingSupportBpd: roundTo(buildingSupportBpd, 2),
    workforceSupportBpd: roundTo(workforceSupportBpd, 2),
    rawSupportBpd,
    supportBpd,
    effectiveSupportBpd: roundTo(effectiveSupportBpd, 2),
    incubatorSupportMultiplier: roundTo(incubatorSupportMultiplier, 2),
    heroSupport: Boolean(building?.heroSupport),
    expertSupport: Boolean(building?.expertSupport),
    totalBpd,
    rate: dailyPercent,
    dailyPercent,
    basePercent: Math.min(remainingPercent, basePercent * incubatorSupportMultiplier),
    supportPercent: Math.min(
      Math.max(0, remainingPercent - Math.min(remainingPercent, basePercent * incubatorSupportMultiplier)),
      supportPercent * incubatorSupportMultiplier
    ),
    dailyCosts,
    requiresSalvage: profile.requiresSalvage,
    requiresMana: profile.requiresMana,
    isStalled,
    stallReasons: isStalled ? getStallReasons(profile, resourcePool) : [],
    accelerationApplied: acceleration.isApplied,
    accelerationBlocked: !acceleration.isApplied,
    accelerationReasons: acceleration.blockers,
    supportReserved
  };
}

function buildActiveConstructionPreview(state) {
  const preview = new Map();
  const resourcePool = createResourcePool(state.resources);
  const activeQueue = getActiveConstructionQueue(state);
  const workforceSummary = getWorkforceSummary(state);
  const workforceSupportAllocation = buildActiveConstructionWorkforceSupportAllocation(activeQueue, workforceSummary);

  for (const building of activeQueue) {
    const details = calculateConstructionDayDetails(building, state, resourcePool, {
      workforceSummary,
      workforceSupportBpd: workforceSupportAllocation.get(building.id) ?? 0
    });
    spendFromResourcePool(resourcePool, details.dailyCosts);
    preview.set(building.id, details);
  }

  return preview;
}

function syncActiveConstructionAssignments(state) {
  const queue = state.constructionPriority ?? [];
  const slots = getDriftConstructionSlots(state);
  const pausedIds = new Set(state.pausedConstructionIds ?? []);
  const nextActiveIds = [];

  for (const id of state.activeConstructionIds ?? []) {
    if (nextActiveIds.length >= slots) {
      break;
    }
    if (!queue.includes(id) || pausedIds.has(id) || nextActiveIds.includes(id)) {
      continue;
    }
    nextActiveIds.push(id);
  }

  for (const id of queue) {
    if (nextActiveIds.length >= slots) {
      break;
    }
    if (pausedIds.has(id) || nextActiveIds.includes(id)) {
      continue;
    }
    nextActiveIds.push(id);
  }

  state.activeConstructionIds = nextActiveIds;
  return nextActiveIds;
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
  const active = Array.isArray(state.activeConstructionIds) ? state.activeConstructionIds : [];
  state.activeConstructionIds = active.filter((id, index) => validIds.has(id) && active.indexOf(id) === index);
  const paused = Array.isArray(state.pausedConstructionIds) ? state.pausedConstructionIds : [];
  state.pausedConstructionIds = paused.filter((id, index) => validIds.has(id) && paused.indexOf(id) === index);
  syncActiveConstructionAssignments(state);
  return deduped;
}

export function getConstructionQueue(state) {
  const orderedIds = normalizeConstructionPriority(state);
  return orderedIds
    .map((id) => state.buildings.find((building) => building.id === id))
    .filter(Boolean);
}

export function getActiveConstructionQueue(state) {
  const activeIds = new Set(state.activeConstructionIds ?? []);
  return getConstructionQueue(state)
    .filter((building) => activeIds.has(building.id))
    .slice(0, getDriftConstructionSlots(state));
}

export function getAvailableConstructionQueue(state) {
  const activeIds = new Set(getActiveConstructionQueue(state).map((building) => building.id));
  return getConstructionQueue(state).filter((building) => !activeIds.has(building.id));
}

export function getIncubatorQueuedBuildings(state, limit = INCUBATOR_QUEUE_LIMIT) {
  const activeIds = new Set(getActiveConstructionQueue(state).map((building) => building.id));
  const pausedIds = new Set(state.pausedConstructionIds ?? []);
  return getConstructionQueue(state)
    .filter((building) => !activeIds.has(building.id) && !pausedIds.has(building.id))
    .slice(0, limit);
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

  state.activeConstructionIds = (state.activeConstructionIds ?? []).filter((id) => id !== buildingId);
  state.pausedConstructionIds = [...new Set([...(state.pausedConstructionIds ?? []), buildingId])];
  syncActiveConstructionAssignments(state);
  return { ok: true, changed: true };
}

export function activateConstruction(state, buildingId) {
  const queue = normalizeConstructionPriority(state);
  const index = queue.indexOf(buildingId);
  if (index === -1) {
    return { ok: false, reason: "Building is not in the construction queue." };
  }

  const currentActiveIds = [...(state.activeConstructionIds ?? [])];
  if (currentActiveIds.includes(buildingId)) {
    return { ok: true, changed: false };
  }
  state.pausedConstructionIds = (state.pausedConstructionIds ?? []).filter((id) => id !== buildingId);
  const reorderedQueue = queue.filter((id) => id !== buildingId);
  const insertIndex = Math.min(currentActiveIds.length, reorderedQueue.length);
  reorderedQueue.splice(insertIndex, 0, buildingId);
  state.constructionPriority = reorderedQueue;
  syncActiveConstructionAssignments(state);
  return {
    ok: true,
    changed: true,
    queued: !state.activeConstructionIds.includes(buildingId)
  };
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
