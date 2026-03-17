import { BUILDING_ACTIVE_THRESHOLD } from "../content/Config.js";
import { AUTO_CONSTRUCTION_RATES } from "../content/Rarities.js";
import { getDriftConstructionSlots, getDriftConstructionSpeedMultiplier } from "./DriftEvolutionSystem.js";

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
  return deduped;
}

export function getConstructionQueue(state) {
  const orderedIds = normalizeConstructionPriority(state);
  return orderedIds
    .map((id) => state.buildings.find((building) => building.id === id))
    .filter(Boolean);
}

export function getActiveConstructionQueue(state) {
  return getConstructionQueue(state).slice(0, getDriftConstructionSlots(state));
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

export function getBuildingDailyRate(building, state) {
  return (
    AUTO_CONSTRUCTION_RATES[building.rarity] *
    state.constructionSpeedMultiplier *
    getDriftConstructionSpeedMultiplier(state)
  );
}

export function advanceConstructionOneDay(state, currentDate, currentDayOffset) {
  const completedToday = [];

  for (const building of getActiveConstructionQueue(state)) {
    const rate = getBuildingDailyRate(building, state);
    building.quality = Math.min(BUILDING_ACTIVE_THRESHOLD, building.quality + rate);
    building.multiplier = Math.floor(building.quality / 100);

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
