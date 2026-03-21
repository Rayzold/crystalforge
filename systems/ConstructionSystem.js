import { BUILDING_ACTIVE_THRESHOLD } from "../content/Config.js";
import { AUTO_CONSTRUCTION_RATES } from "../content/Rarities.js";
import { getDriftConstructionSlots, getDriftConstructionSpeedMultiplier } from "./DriftEvolutionSystem.js";
import { getBuildingMultiplier } from "./BuildingSystem.js";

export { getDriftConstructionSlots };

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

export function getBuildingDailyRate(building, state) {
  return (
    AUTO_CONSTRUCTION_RATES[building.rarity] *
    state.constructionSpeedMultiplier *
    getDriftConstructionSpeedMultiplier(state)
  );
}

export function getConstructionEtaDetails(building, state) {
  const rate = getBuildingDailyRate(building, state);
  const remainingPercent = Math.max(0, BUILDING_ACTIVE_THRESHOLD - Number(building.quality ?? 0));

  if (remainingPercent <= 0 || rate <= 0) {
    return {
      rate,
      remainingPercent,
      daysRemaining: 0,
      readyDayOffset: state.calendar.dayOffset
    };
  }

  const rawDaysRemaining = remainingPercent / rate;
  const daysRemaining = Math.ceil(rawDaysRemaining * 10) / 10;
  const readyDayOffset = state.calendar.dayOffset + Math.ceil(rawDaysRemaining);

  return {
    rate,
    remainingPercent,
    daysRemaining,
    readyDayOffset
  };
}

export function advanceConstructionOneDay(state, currentDate, currentDayOffset) {
  const completedToday = [];

  for (const building of getActiveConstructionQueue(state)) {
    const rate = getBuildingDailyRate(building, state);
    building.quality = Math.min(BUILDING_ACTIVE_THRESHOLD, building.quality + rate);
    building.multiplier = getBuildingMultiplier(building.quality);

    if (building.quality >= BUILDING_ACTIVE_THRESHOLD && !building.isComplete) {
      building.isComplete = true;
      building.completedAt = currentDate;
      building.completedDayOffset = currentDayOffset;
      building.history.push({
        type: "completion",
        at: currentDate,
        details: `${building.displayName} completed through auto-construction.`
      });
      completedToday.push(building);
    }
  }

  return completedToday;
}
