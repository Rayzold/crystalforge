import { BUILDING_ACTIVE_THRESHOLD } from "../content/Config.js";
import { AUTO_CONSTRUCTION_RATES } from "../content/Rarities.js";

export function getBuildingDailyRate(building, speedMultiplier) {
  return AUTO_CONSTRUCTION_RATES[building.rarity] * speedMultiplier;
}

export function advanceConstructionOneDay(state, currentDate, currentDayOffset) {
  const completedToday = [];

  for (const building of state.buildings) {
    if (building.quality >= BUILDING_ACTIVE_THRESHOLD) {
      continue;
    }

    const rate = getBuildingDailyRate(building, state.constructionSpeedMultiplier);
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
