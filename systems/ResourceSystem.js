// Daily economy engine.
// This system totals resource production/consumption, applies district, focus,
// placement, and city-condition modifiers, and produces warning/delta summaries.
import { RESOURCE_MINIMUMS } from "../content/Config.js";
import { clamp } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { getBuildingPlacementBonuses } from "./MapSystem.js";
import { getCurrentTownFocus } from "./TownFocusSystem.js";
import {
  applyBuildingWorkforceToResource,
  getBuildingWorkforceMultiplier,
  getWorkforceSummary
} from "./WorkforceSystem.js";
import {
  getEventRollModifier,
  getFoodOutputMultiplier,
  getGoldOutputMultiplier
} from "./CityConditionSystem.js";

function createDeltaRecord() {
  return { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 };
}

function addDeltaInto(target, source) {
  for (const key of Object.keys(target)) {
    target[key] += Number(source?.[key] ?? 0);
  }
}

function sortContributionRows(left, right) {
  return Math.abs(right.amount) - Math.abs(left.amount);
}

function getBuildingProductionDelta(state, workforceSummary, tradeGoodsGoldMultiplier, goldOutputMultiplier, foodOutputMultiplier) {
  const deltas = createDeltaRecord();

  for (const building of state.buildings) {
    if (!building.isComplete || building.isRuined) {
      continue;
    }

    const placementBonus = getBuildingPlacementBonuses(state, building);
    const placementMultiplier = 1 + placementBonus.totalPercent;
    const workforceMultiplier = getBuildingWorkforceMultiplier(building, workforceSummary);

    let goldDelta = applyBuildingWorkforceToResource(building.resourceRates.gold, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (goldDelta > 0 && building.tags?.includes("trade")) {
      goldDelta *= tradeGoodsGoldMultiplier;
    }
    if (goldDelta > 0) {
      goldDelta *= goldOutputMultiplier;
    }

    deltas.gold += goldDelta;

    let foodDelta = applyBuildingWorkforceToResource(building.resourceRates.food, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (foodDelta > 0) {
      foodDelta *= foodOutputMultiplier;
    }

    deltas.food += foodDelta;
    deltas.materials += applyBuildingWorkforceToResource(building.resourceRates.materials, workforceMultiplier) * building.multiplier * placementMultiplier;
    deltas.salvage += applyBuildingWorkforceToResource(building.resourceRates.salvage ?? 0, workforceMultiplier) * building.multiplier * placementMultiplier;
    deltas.mana += applyBuildingWorkforceToResource(building.resourceRates.mana, workforceMultiplier) * building.multiplier * placementMultiplier;
    deltas.prosperity += applyBuildingWorkforceToResource(building.stats.prosperity * 0.02, workforceMultiplier) * building.multiplier * placementMultiplier;
  }

  return deltas;
}

function getCitizenProductionDelta(state, goldOutputMultiplier, foodOutputMultiplier) {
  const deltas = createDeltaRecord();

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
  }

  return deltas;
}

function getCitizenConsumptionDelta(state) {
  const deltas = createDeltaRecord();

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    for (const [resource, amount] of Object.entries(citizenDefinition.consumption)) {
      deltas[resource] = (deltas[resource] ?? 0) - amount * count;
    }
  }

  return deltas;
}

function applyDistrictProductionBonuses(deltas, districtSummary) {
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

  return deltas;
}

export function getTradeGoodsGoldMultiplier(state) {
  const goods = Math.max(0, Number(state.cityStats?.goods ?? 0) || 0);
  const excessGoods = Math.max(0, goods - 10);
  const bonusSteps = Math.floor(excessGoods / 10);
  return 1 + Math.min(0.6, bonusSteps * 0.08);
}

export function getGoodsSummary(state) {
  const total = Math.max(0, Number(state.cityStats?.goods ?? 0) || 0);
  const gmOverride = Number(state.adminOverrides?.goods ?? 0) || 0;
  const base = Math.max(0, total - gmOverride);
  const multiplier = getTradeGoodsGoldMultiplier(state);
  const nextThreshold = total <= 10 ? 20 : Math.ceil((total + 0.0001) / 10) * 10;
  const toNextThreshold = Math.max(0, nextThreshold - total);

  return {
    total,
    base,
    gmOverride,
    multiplier,
    nextThreshold,
    toNextThreshold
  };
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
  const workforceSummary = getWorkforceSummary(state);
  const districtSummary = getDistrictSummary(state);
  const buildingProduction = applyDistrictProductionBonuses(
    getBuildingProductionDelta(state, workforceSummary, tradeGoodsGoldMultiplier, goldOutputMultiplier, foodOutputMultiplier),
    districtSummary
  );
  const citizenProduction = getCitizenProductionDelta(state, goldOutputMultiplier, foodOutputMultiplier);
  const citizenConsumption = getCitizenConsumptionDelta(state);

  addDeltaInto(deltas, buildingProduction);
  addDeltaInto(deltas, citizenProduction);
  addDeltaInto(deltas, citizenConsumption);

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

export function getEconomyDebugSummary(state) {
  const resources = ["gold", "food", "materials", "salvage", "mana", "prosperity"];
  const buildingBaseProduction = createDeltaRecord();
  const districtBonus = createDeltaRecord();
  const citizenProduction = createDeltaRecord();
  const citizenConsumption = createDeltaRecord();
  const eventProduction = createDeltaRecord();
  const focusProduction = createDeltaRecord();
  const net = calculateDailyResourceDelta(state);
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);
  const workforceSummary = getWorkforceSummary(state);
  const districtSummary = getDistrictSummary(state);
  const baseBuildingProduction = getBuildingProductionDelta(
    state,
    workforceSummary,
    tradeGoodsGoldMultiplier,
    goldOutputMultiplier,
    foodOutputMultiplier
  );
  const districtAdjustedBuildingProduction = applyDistrictProductionBonuses(structuredClone(baseBuildingProduction), districtSummary);
  addDeltaInto(buildingBaseProduction, baseBuildingProduction);
  for (const resource of resources) {
    districtBonus[resource] = Number(districtAdjustedBuildingProduction[resource] ?? 0) - Number(baseBuildingProduction[resource] ?? 0);
  }
  addDeltaInto(citizenProduction, getCitizenProductionDelta(state, goldOutputMultiplier, foodOutputMultiplier));
  addDeltaInto(citizenConsumption, getCitizenConsumptionDelta(state));
  const districtModifiers = [];
  for (const district of districtSummary) {
    if (district.level <= 0) {
      continue;
    }
    const bonuses = district.definition.bonuses;
    const applied = [];
    if (bonuses.goldProductionPercent) applied.push(`gold x${(1 + (bonuses.goldProductionPercent * district.level) / 100).toFixed(2)}`);
    if (bonuses.foodProductionPercent) applied.push(`food x${(1 + (bonuses.foodProductionPercent * district.level) / 100).toFixed(2)}`);
    if (bonuses.materialsProductionPercent) applied.push(`materials x${(1 + (bonuses.materialsProductionPercent * district.level) / 100).toFixed(2)}`);
    if (bonuses.salvageProductionPercent) applied.push(`salvage x${(1 + (bonuses.salvageProductionPercent * district.level) / 100).toFixed(2)}`);
    if (bonuses.manaProductionPercent) applied.push(`mana x${(1 + (bonuses.manaProductionPercent * district.level) / 100).toFixed(2)}`);
    if (bonuses.prosperityFlat) applied.push(`prosperity +${(bonuses.prosperityFlat * district.level * 0.05).toFixed(2)}`);
    if (applied.length) {
      districtModifiers.push(`${district.name}: ${applied.join(", ")}`);
    }
  }

  for (const event of state.events.active) {
    const effects = event.effects;
    eventProduction.gold += effects.goldFlat ?? 0;
    eventProduction.food += effects.foodFlat ?? 0;
    eventProduction.materials += effects.materialsFlat ?? 0;
    eventProduction.salvage += effects.salvageFlat ?? 0;
    eventProduction.mana += effects.manaFlat ?? 0;
    eventProduction.prosperity += effects.prosperityFlat ?? 0;
  }

  const focus = getCurrentTownFocus(state);
  if (focus?.resourceDaily) {
    focusProduction.gold += focus.resourceDaily.gold ?? 0;
    focusProduction.food += focus.resourceDaily.food ?? 0;
    focusProduction.materials += focus.resourceDaily.materials ?? 0;
    focusProduction.salvage += focus.resourceDaily.salvage ?? 0;
    focusProduction.mana += focus.resourceDaily.mana ?? 0;
    focusProduction.prosperity += focus.resourceDaily.prosperity ?? 0;
  }

  return {
    rows: resources.map((resource) => ({
      resource,
      stock: Number(state.resources?.[resource] ?? 0),
      buildingBaseProduction: Number(buildingBaseProduction[resource] ?? 0),
      districtBonus: Number(districtBonus[resource] ?? 0),
      citizenProduction: Number(citizenProduction[resource] ?? 0),
      citizenConsumption: Number(citizenConsumption[resource] ?? 0),
      eventProduction: Number(eventProduction[resource] ?? 0),
      focusProduction: Number(focusProduction[resource] ?? 0),
      net: Number(net[resource] ?? 0)
    })),
    modifiers: {
      tradeGoodsGoldMultiplier,
      goldOutputMultiplier,
      foodOutputMultiplier
    },
    districtModifiers
  };
}

export function getEconomyTopContributorsSummary(state) {
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);
  const workforceSummary = getWorkforceSummary(state);
  const gold = [];
  const food = [];
  const materials = [];
  const salvage = [];
  const mana = [];

  for (const building of state.buildings) {
    if (!building.isComplete || building.isRuined) {
      continue;
    }

    const placementBonus = getBuildingPlacementBonuses(state, building);
    const placementMultiplier = 1 + placementBonus.totalPercent;
    const workforceMultiplier = getBuildingWorkforceMultiplier(building, workforceSummary);

    let goldAmount = applyBuildingWorkforceToResource(building.resourceRates.gold, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (goldAmount > 0 && building.tags?.includes("trade")) {
      goldAmount *= tradeGoodsGoldMultiplier;
    }
    if (goldAmount > 0) {
      goldAmount *= goldOutputMultiplier;
    }
    if (Math.abs(goldAmount) > 0.005) {
      gold.push({
        label: building.displayName,
        channel: "Building",
        amount: Number(goldAmount)
      });
    }

    let foodAmount = applyBuildingWorkforceToResource(building.resourceRates.food, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (foodAmount > 0) {
      foodAmount *= foodOutputMultiplier;
    }
    if (Math.abs(foodAmount) > 0.005) {
      food.push({
        label: building.displayName,
        channel: "Building",
        amount: Number(foodAmount)
      });
    }

    const materialsAmount = applyBuildingWorkforceToResource(building.resourceRates.materials, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (Math.abs(materialsAmount) > 0.005) {
      materials.push({
        label: building.displayName,
        channel: "Building",
        amount: Number(materialsAmount)
      });
    }

    const salvageAmount = applyBuildingWorkforceToResource(building.resourceRates.salvage ?? 0, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (Math.abs(salvageAmount) > 0.005) {
      salvage.push({
        label: building.displayName,
        channel: "Building",
        amount: Number(salvageAmount)
      });
    }

    const manaAmount = applyBuildingWorkforceToResource(building.resourceRates.mana, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (Math.abs(manaAmount) > 0.005) {
      mana.push({
        label: building.displayName,
        channel: "Building",
        amount: Number(manaAmount)
      });
    }
  }

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    const goldAmount = ((citizenDefinition.production?.gold ?? 0) * count * goldOutputMultiplier) - ((citizenDefinition.consumption?.gold ?? 0) * count);
    const foodAmount = ((citizenDefinition.production?.food ?? 0) * count * foodOutputMultiplier) - ((citizenDefinition.consumption?.food ?? 0) * count);
    const materialsAmount = ((citizenDefinition.production?.materials ?? 0) * count) - ((citizenDefinition.consumption?.materials ?? 0) * count);
    const salvageAmount = ((citizenDefinition.production?.salvage ?? 0) * count) - ((citizenDefinition.consumption?.salvage ?? 0) * count);
    const manaAmount = ((citizenDefinition.production?.mana ?? 0) * count) - ((citizenDefinition.consumption?.mana ?? 0) * count);

    if (Math.abs(goldAmount) > 0.005) {
      gold.push({ label: citizenClass, channel: "Citizens", amount: Number(goldAmount) });
    }
    if (Math.abs(foodAmount) > 0.005) {
      food.push({ label: citizenClass, channel: "Citizens", amount: Number(foodAmount) });
    }
    if (Math.abs(materialsAmount) > 0.005) {
      materials.push({ label: citizenClass, channel: "Citizens", amount: Number(materialsAmount) });
    }
    if (Math.abs(salvageAmount) > 0.005) {
      salvage.push({ label: citizenClass, channel: "Citizens", amount: Number(salvageAmount) });
    }
    if (Math.abs(manaAmount) > 0.005) {
      mana.push({ label: citizenClass, channel: "Citizens", amount: Number(manaAmount) });
    }
  }

  for (const event of state.events.active) {
    const goldAmount = Number(event.effects?.goldFlat ?? 0);
    const foodAmount = Number(event.effects?.foodFlat ?? 0);
    const materialsAmount = Number(event.effects?.materialsFlat ?? 0);
    const salvageAmount = Number(event.effects?.salvageFlat ?? 0);
    const manaAmount = Number(event.effects?.manaFlat ?? 0);
    if (Math.abs(goldAmount) > 0.005) {
      gold.push({ label: event.title ?? event.name ?? "Event", channel: "Event", amount: goldAmount });
    }
    if (Math.abs(foodAmount) > 0.005) {
      food.push({ label: event.title ?? event.name ?? "Event", channel: "Event", amount: foodAmount });
    }
    if (Math.abs(materialsAmount) > 0.005) {
      materials.push({ label: event.title ?? event.name ?? "Event", channel: "Event", amount: materialsAmount });
    }
    if (Math.abs(salvageAmount) > 0.005) {
      salvage.push({ label: event.title ?? event.name ?? "Event", channel: "Event", amount: salvageAmount });
    }
    if (Math.abs(manaAmount) > 0.005) {
      mana.push({ label: event.title ?? event.name ?? "Event", channel: "Event", amount: manaAmount });
    }
  }

  const focus = getCurrentTownFocus(state);
  if (focus?.resourceDaily) {
    const focusLabel = focus.name ?? "Town Focus";
    const goldAmount = Number(focus.resourceDaily.gold ?? 0);
    const foodAmount = Number(focus.resourceDaily.food ?? 0);
    const materialsAmount = Number(focus.resourceDaily.materials ?? 0);
    const salvageAmount = Number(focus.resourceDaily.salvage ?? 0);
    const manaAmount = Number(focus.resourceDaily.mana ?? 0);
    if (Math.abs(goldAmount) > 0.005) {
      gold.push({ label: focusLabel, channel: "Focus", amount: goldAmount });
    }
    if (Math.abs(foodAmount) > 0.005) {
      food.push({ label: focusLabel, channel: "Focus", amount: foodAmount });
    }
    if (Math.abs(materialsAmount) > 0.005) {
      materials.push({ label: focusLabel, channel: "Focus", amount: materialsAmount });
    }
    if (Math.abs(salvageAmount) > 0.005) {
      salvage.push({ label: focusLabel, channel: "Focus", amount: salvageAmount });
    }
    if (Math.abs(manaAmount) > 0.005) {
      mana.push({ label: focusLabel, channel: "Focus", amount: manaAmount });
    }
  }

  return {
    gold: gold.sort(sortContributionRows).slice(0, 5),
    food: food.sort(sortContributionRows).slice(0, 5),
    materials: materials.sort(sortContributionRows).slice(0, 5),
    salvage: salvage.sort(sortContributionRows).slice(0, 5),
    mana: mana.sort(sortContributionRows).slice(0, 5)
  };
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

function formatPercent(value) {
  return `${roundDisplayNumber((Number(value ?? 0) || 0) * 100, 0)}%`;
}

export function getEmergencyStatus(state) {
  const deltas = calculateDailyResourceDelta(state);
  const emergencies = [];
  const foodRunwayDays = getRunwayDays(state.resources.food, deltas.food);
  const goldRunwayDays = getRunwayDays(state.resources.gold, deltas.gold);
  const manaRunwayDays = getRunwayDays(state.resources.mana, deltas.mana);
  const workforceSummary = getWorkforceSummary(state);
  const incompleteBuildings = state.buildings.filter((building) => !building.isComplete && !building.isRuined).length;
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

  if ((workforceSummary.generalDemand ?? 0) > 0 && (workforceSummary.generalRatio ?? 1) < 0.8) {
    const severity = (workforceSummary.generalRatio ?? 1) < 0.55 ? "critical" : "warning";
    const incubationDetail = incompleteBuildings > 0
      ? " Excess staffing is too thin to strongly boost incubation support right now."
      : "";
    emergencies.push({
      key: "workforce",
      severity,
      label: "Workforce strain",
      details: `${formatPercent(workforceSummary.generalRatio)} of general staffing demand is covered, reducing staffed building output.${incubationDetail}`
    });
  }

  return {
    deltas,
    emergencies,
    runway: {
      foodDays: foodRunwayDays,
      goldDays: goldRunwayDays,
      manaDays: manaRunwayDays
    },
    workforce: {
      supply: workforceSummary.generalSupply ?? 0,
      demand: workforceSummary.generalDemand ?? 0,
      staffingRatio: workforceSummary.generalRatio ?? 1
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

function formatTrendLabel(value) {
  if (Math.abs(value) < 0.005) {
    return "Flat";
  }
  return value > 0 ? "Rising" : "Falling";
}

export function getCityTrendSummary(state) {
  const deltas = calculateDailyResourceDelta(state);
  const modifiers = getDynamicCityModifiers(state);
  return [
    {
      key: "gold",
      label: "Gold",
      delta: deltas.gold,
      stock: state.resources.gold,
      trend: formatTrendLabel(deltas.gold),
      detail: `Trade output x${modifiers.goldOutputMultiplier.toFixed(2)}`
    },
    {
      key: "food",
      label: "Food",
      delta: deltas.food,
      stock: state.resources.food,
      trend: formatTrendLabel(deltas.food),
      detail: `Food output x${modifiers.foodOutputMultiplier.toFixed(2)}`
    },
    {
      key: "materials",
      label: "Materials",
      delta: deltas.materials,
      stock: state.resources.materials,
      trend: formatTrendLabel(deltas.materials),
      detail: "Construction and workshop stock"
    },
    {
      key: "salvage",
      label: "Salvage",
      delta: deltas.salvage,
      stock: state.resources.salvage ?? 0,
      trend: formatTrendLabel(deltas.salvage),
      detail: "Advanced mechanical parts"
    },
    {
      key: "mana",
      label: "Mana",
      delta: deltas.mana,
      stock: state.resources.mana,
      trend: formatTrendLabel(deltas.mana),
      detail: `Event pressure ${modifiers.eventRollModifier >= 0 ? "+" : ""}${modifiers.eventRollModifier.toFixed(2)}`
    },
    {
      key: "prosperity",
      label: "Prosperity",
      delta: deltas.prosperity,
      stock: state.resources.prosperity,
      trend: formatTrendLabel(deltas.prosperity),
      detail: "Economic confidence"
    }
  ];
}

export function getResourceChainSummary(state) {
  const completedBuildings = state.buildings.filter((building) => building.isComplete && !building.isRuined);
  const producers = completedBuildings.filter((building) =>
    (building.resourceRates.food ?? 0) > 0 ||
    (building.resourceRates.materials ?? 0) > 0 ||
    (building.resourceRates.salvage ?? 0) > 0 ||
    (building.resourceRates.mana ?? 0) > 0
  );
  const refiners = completedBuildings.filter((building) =>
    (building.resourceRates.goods ?? 0) > 0 || Object.values(building.resourceRates ?? {}).some((value) => Number(value) < 0)
  );
  const traders = completedBuildings.filter((building) =>
    (building.resourceRates.gold ?? 0) > 0 || building.tags?.includes("trade")
  );

  return [
    {
      key: "producers",
      title: "Producers",
      detail: "Raw food, materials, mana, and salvage.",
      buildings: producers
    },
    {
      key: "refiners",
      title: "Refiners",
      detail: "Goods makers and buildings that consume stock to shape better output.",
      buildings: refiners
    },
    {
      key: "traders",
      title: "Traders",
      detail: "Markets and exchange buildings that turn the city's output into gold.",
      buildings: traders
    }
  ];
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
