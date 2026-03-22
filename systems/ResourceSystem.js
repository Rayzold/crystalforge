import { RESOURCE_MINIMUMS } from "../content/Config.js";
import { clamp } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { getBuildingPlacementBonuses } from "./MapSystem.js";
import { getCurrentTownFocus } from "./TownFocusSystem.js";
import {
  getEventRollModifier,
  getFoodOutputMultiplier,
  getGoldOutputMultiplier
} from "./CityConditionSystem.js";

function createDeltaRecord() {
  return { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 };
}

function getTradeGoodsGoldMultiplier(state) {
  const goods = Math.max(0, Number(state.cityStats?.goods ?? 0) || 0);
  const excessGoods = Math.max(0, goods - 10);
  const bonusSteps = Math.floor(excessGoods / 10);
  return 1 + Math.min(1, bonusSteps * 0.1);
}

export function getWarningFlags(state) {
  return {
    lowFood: state.resources.food <= 20,
    lowGold: state.resources.gold <= 20,
    lowMana: state.resources.mana <= 12
  };
}

export function calculateDailyResourceDelta(state) {
  const deltas = createDeltaRecord();
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);

  for (const building of state.buildings) {
    if (!building.isComplete || building.isRuined) {
      continue;
    }

    const placementBonus = getBuildingPlacementBonuses(state, building);
    const placementMultiplier = 1 + placementBonus.totalPercent;

    let goldDelta = building.resourceRates.gold * building.multiplier * placementMultiplier;
    if (goldDelta > 0 && building.tags?.includes("trade")) {
      goldDelta *= tradeGoodsGoldMultiplier;
    }
    if (goldDelta > 0) {
      goldDelta *= goldOutputMultiplier;
    }

    deltas.gold += goldDelta;
    let foodDelta = building.resourceRates.food * building.multiplier * placementMultiplier;
    if (foodDelta > 0) {
      foodDelta *= foodOutputMultiplier;
    }
    deltas.food += foodDelta;
    deltas.materials += building.resourceRates.materials * building.multiplier * placementMultiplier;
    deltas.salvage += (building.resourceRates.salvage ?? 0) * building.multiplier * placementMultiplier;
    deltas.mana += building.resourceRates.mana * building.multiplier * placementMultiplier;
    deltas.prosperity += building.stats.prosperity * 0.02 * building.multiplier * placementMultiplier;
  }

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    for (const [resource, amount] of Object.entries(citizenDefinition.production)) {
      let nextAmount = amount * count;
      if (resource === "gold" && nextAmount > 0) {
        nextAmount *= goldOutputMultiplier;
      }
      if (resource === "food" && nextAmount > 0) {
        nextAmount *= foodOutputMultiplier;
      }
      deltas[resource] = (deltas[resource] ?? 0) + nextAmount;
    }
    for (const [resource, amount] of Object.entries(citizenDefinition.consumption)) {
      deltas[resource] = (deltas[resource] ?? 0) - amount * count;
    }
  }

  const districtSummary = getDistrictSummary(state);
  for (const district of districtSummary) {
    if (district.level <= 0) {
      continue;
    }
    const bonuses = district.definition.bonuses;
    if (bonuses.goldProductionPercent) {
      deltas.gold *= 1 + (bonuses.goldProductionPercent * district.level) / 100;
    }
    if (bonuses.foodProductionPercent) {
      deltas.food *= 1 + (bonuses.foodProductionPercent * district.level) / 100;
    }
    if (bonuses.materialsProductionPercent) {
      deltas.materials *= 1 + (bonuses.materialsProductionPercent * district.level) / 100;
    }
    if (bonuses.salvageProductionPercent) {
      deltas.salvage *= 1 + (bonuses.salvageProductionPercent * district.level) / 100;
    }
    if (bonuses.manaProductionPercent) {
      deltas.mana *= 1 + (bonuses.manaProductionPercent * district.level) / 100;
    }
    deltas.prosperity += (bonuses.prosperityFlat ?? 0) * district.level * 0.05;
  }

  for (const event of state.events.active) {
    const effects = event.effects;
    deltas.gold += effects.goldFlat ?? 0;
    deltas.food += effects.foodFlat ?? 0;
    deltas.materials += effects.materialsFlat ?? 0;
    deltas.salvage += effects.salvageFlat ?? 0;
    deltas.mana += effects.manaFlat ?? 0;
    deltas.prosperity += effects.prosperityFlat ?? 0;
    if (effects.goldMultiplier) {
      deltas.gold *= 1 + effects.goldMultiplier;
    }
    if (effects.foodMultiplier) {
      deltas.food *= 1 + effects.foodMultiplier;
    }
    if (effects.materialsMultiplier) {
      deltas.materials *= 1 + effects.materialsMultiplier;
    }
    if (effects.salvageMultiplier) {
      deltas.salvage *= 1 + effects.salvageMultiplier;
    }
    if (effects.manaMultiplier) {
      deltas.mana *= 1 + effects.manaMultiplier;
    }
  }

  const focus = getCurrentTownFocus(state);
  if (focus?.resourceDaily) {
    deltas.gold += focus.resourceDaily.gold ?? 0;
    deltas.food += focus.resourceDaily.food ?? 0;
    deltas.materials += focus.resourceDaily.materials ?? 0;
    deltas.salvage += focus.resourceDaily.salvage ?? 0;
    deltas.mana += focus.resourceDaily.mana ?? 0;
    deltas.prosperity += focus.resourceDaily.prosperity ?? 0;
  }

  return deltas;
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

function roundDisplayNumber(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
}

export function getEmergencyStatus(state) {
  const deltas = calculateDailyResourceDelta(state);
  const emergencies = [];
  const foodRunwayDays = getRunwayDays(state.resources.food, deltas.food);
  const goldRunwayDays = getRunwayDays(state.resources.gold, deltas.gold);
  const manaRunwayDays = getRunwayDays(state.resources.mana, deltas.mana);
  const housingGap = roundDisplayNumber(
    Math.max(0, state.resources.population - (state.cityStats.populationSupport ?? 0)),
    2
  );

  if ((state.cityStats.morale ?? 0) <= 18) {
    emergencies.push({
      key: "morale",
      severity: (state.cityStats.morale ?? 0) <= 8 ? "critical" : "warning",
      label: "Morale strain",
      details: `Morale is ${Math.round(state.cityStats.morale ?? 0)} and the city is at risk of unrest.`
    });
  }

  if (foodRunwayDays !== null) {
    emergencies.push({
      key: "food",
      severity: foodRunwayDays <= 5 ? "critical" : "warning",
      label: "Food deficit",
      details: foodRunwayDays <= 0
        ? "Food reserves are already exhausted."
        : `${foodRunwayDays.toFixed(1)} days of food remain at the current deficit.`
    });
  }

  if (goldRunwayDays !== null && goldRunwayDays <= 10) {
    emergencies.push({
      key: "gold",
      severity: goldRunwayDays <= 4 ? "critical" : "warning",
      label: "Treasury drain",
      details: `${goldRunwayDays.toFixed(1)} days of gold remain if spending stays ahead of income.`
    });
  }

  if (manaRunwayDays !== null && manaRunwayDays <= 10) {
    emergencies.push({
      key: "mana",
      severity: manaRunwayDays <= 4 ? "critical" : "warning",
      label: "Mana drain",
      details: `${manaRunwayDays.toFixed(1)} days of mana remain at the current burn rate.`
    });
  }

  if (housingGap > 0) {
    emergencies.push({
      key: "housing",
      severity: housingGap >= 10 ? "critical" : "warning",
      label: "Housing strain",
      details: `${housingGap} citizens exceed current support capacity.`
    });
  }

  return {
    deltas,
    emergencies,
    runway: {
      foodDays: foodRunwayDays,
      goldDays: goldRunwayDays,
      manaDays: manaRunwayDays
    }
  };
}

export function getDynamicCityModifiers(state) {
  return {
    goldOutputMultiplier: getGoldOutputMultiplier(state),
    foodOutputMultiplier: getFoodOutputMultiplier(state),
    eventRollModifier: getEventRollModifier(state)
  };
}

export function applyDailyResources(state) {
  const deltas = calculateDailyResourceDelta(state);

  state.resources.gold = clamp(state.resources.gold + deltas.gold, RESOURCE_MINIMUMS.gold, 999999);
  state.resources.food = clamp(state.resources.food + deltas.food, RESOURCE_MINIMUMS.food, 999999);
  state.resources.materials = clamp(state.resources.materials + deltas.materials, RESOURCE_MINIMUMS.materials, 999999);
  state.resources.salvage = clamp(state.resources.salvage + deltas.salvage, RESOURCE_MINIMUMS.salvage, 999999);
  state.resources.mana = clamp(state.resources.mana + deltas.mana, RESOURCE_MINIMUMS.mana, 999999);
  state.resources.prosperity = clamp(
    state.resources.prosperity + deltas.prosperity,
    RESOURCE_MINIMUMS.prosperity,
    999999
  );
  state.resources.population = Math.max(
    RESOURCE_MINIMUMS.population,
    Object.values(state.citizens).reduce((sum, count) => sum + count, 0)
  );

  return deltas;
}
