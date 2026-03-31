// Daily economy engine.
// This system totals resource production/consumption, applies district, focus,
// placement, and city-condition modifiers, and produces warning/delta summaries.
import {
  CITIZEN_RARITY_OUTPUT_MULTIPLIERS,
  CITIZEN_RARITY_UPKEEP_MULTIPLIERS
} from "../content/CitizenConfig.js";
import { RESOURCE_MINIMUMS } from "../content/Config.js";
import { clamp } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import {
  getEquippedExpeditionRelics,
  getExpeditionRelicActiveBonuses,
  getLegendAssignmentDetails,
  getUniqueCitizenResourceBonuses
} from "./ExpeditionSystem.js";
import { getBuildingPlacementBonuses } from "./MapSystem.js";
import { getCurrentTownFocus, getSuggestedFocusForAlert } from "./TownFocusSystem.js";
import { iterateCitizenRarityEntries } from "./CitizenSystem.js";
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

const ECONOMY_RESOURCE_KEYS = ["gold", "food", "materials", "salvage", "mana", "prosperity"];

function createDeltaRecord() {
  return { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 };
}

function createContributionRecord() {
  return Object.fromEntries(ECONOMY_RESOURCE_KEYS.map((resource) => [resource, []]));
}

function addDeltaInto(target, source) {
  for (const key of Object.keys(target)) {
    target[key] += Number(source?.[key] ?? 0);
  }
}

function addContribution(target, resource, label, channel, amount) {
  if (!target[resource]) {
    return;
  }
  const numericAmount = Number(amount ?? 0);
  if (Math.abs(numericAmount) <= 0.005) {
    return;
  }
  target[resource].push({
    label,
    channel,
    amount: numericAmount
  });
}

function sortContributionRows(left, right) {
  return Math.abs(right.amount) - Math.abs(left.amount);
}

function sortPositiveContributionRows(left, right) {
  return right.amount - left.amount;
}

function sortNegativeContributionRows(left, right) {
  return left.amount - right.amount;
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
    deltas.prosperity +=
      applyBuildingWorkforceToResource((building.stats.prosperity ?? 0) * 0.02, workforceMultiplier) * building.multiplier * placementMultiplier;
  }

  return deltas;
}

function getCitizenProductionDelta(state, goldOutputMultiplier, foodOutputMultiplier) {
  const deltas = createDeltaRecord();

  iterateCitizenRarityEntries(state, (citizenClass, rarity, count) => {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    const outputMultiplier = CITIZEN_RARITY_OUTPUT_MULTIPLIERS[rarity] ?? 1;
    for (const [resource, amount] of Object.entries(citizenDefinition.production)) {
      let nextAmount = amount * count * outputMultiplier;
      if (resource === "gold" && nextAmount > 0) {
        nextAmount *= goldOutputMultiplier;
      }
      if (resource === "food" && nextAmount > 0) {
        nextAmount *= foodOutputMultiplier;
      }
      deltas[resource] = (deltas[resource] ?? 0) + nextAmount;
    }
  });

  return deltas;
}

function getCitizenConsumptionDelta(state) {
  const deltas = createDeltaRecord();

  iterateCitizenRarityEntries(state, (citizenClass, rarity, count) => {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    const upkeepMultiplier = CITIZEN_RARITY_UPKEEP_MULTIPLIERS[rarity] ?? 1;
    for (const [resource, amount] of Object.entries(citizenDefinition.consumption)) {
      deltas[resource] = (deltas[resource] ?? 0) - amount * count * upkeepMultiplier;
    }
  });

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
  const uniqueCitizenBonuses = getUniqueCitizenResourceBonuses(state);

  addDeltaInto(deltas, buildingProduction);
  addDeltaInto(deltas, citizenProduction);
  addDeltaInto(deltas, citizenConsumption);
  addDeltaInto(deltas, uniqueCitizenBonuses);

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
  const uniqueCitizenProduction = createDeltaRecord();
  const relicProduction = createDeltaRecord();
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
  const uniqueCitizenBonuses = createDeltaRecord();
  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    const assignment = getLegendAssignmentDetails(uniqueCitizen);
    addDeltaInto(uniqueCitizenBonuses, uniqueCitizen.bonuses?.resources);
    addDeltaInto(uniqueCitizenBonuses, assignment.resourceBonuses);
  }
  addDeltaInto(uniqueCitizenProduction, uniqueCitizenBonuses);
  for (const relic of getEquippedExpeditionRelics(state)) {
    addDeltaInto(relicProduction, getExpeditionRelicActiveBonuses(state, relic).bonuses.resources);
  }
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
      uniqueCitizenProduction: Number(uniqueCitizenProduction[resource] ?? 0),
      relicProduction: Number(relicProduction[resource] ?? 0),
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

export function getEconomyContributionBreakdown(state) {
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);
  const workforceSummary = getWorkforceSummary(state);
  const contributions = createContributionRecord();

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
    addContribution(contributions, "gold", building.displayName, "Building", goldAmount);

    let foodAmount = applyBuildingWorkforceToResource(building.resourceRates.food, workforceMultiplier) * building.multiplier * placementMultiplier;
    if (foodAmount > 0) {
      foodAmount *= foodOutputMultiplier;
    }
    addContribution(contributions, "food", building.displayName, "Building", foodAmount);

    const materialsAmount = applyBuildingWorkforceToResource(building.resourceRates.materials, workforceMultiplier) * building.multiplier * placementMultiplier;
    addContribution(contributions, "materials", building.displayName, "Building", materialsAmount);

    const salvageAmount = applyBuildingWorkforceToResource(building.resourceRates.salvage ?? 0, workforceMultiplier) * building.multiplier * placementMultiplier;
    addContribution(contributions, "salvage", building.displayName, "Building", salvageAmount);

    const manaAmount = applyBuildingWorkforceToResource(building.resourceRates.mana, workforceMultiplier) * building.multiplier * placementMultiplier;
    addContribution(contributions, "mana", building.displayName, "Building", manaAmount);

    const prosperityAmount =
      applyBuildingWorkforceToResource((building.stats.prosperity ?? 0) * 0.02, workforceMultiplier) * building.multiplier * placementMultiplier;
    addContribution(contributions, "prosperity", building.displayName, "Building", prosperityAmount);
  }

  const citizenTotals = new Map();
  iterateCitizenRarityEntries(state, (citizenClass, rarity, count) => {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    const outputMultiplier = CITIZEN_RARITY_OUTPUT_MULTIPLIERS[rarity] ?? 1;
    const upkeepMultiplier = CITIZEN_RARITY_UPKEEP_MULTIPLIERS[rarity] ?? 1;
    const totals = citizenTotals.get(citizenClass) ?? createDeltaRecord();
    citizenTotals.set(citizenClass, totals);

    for (const [resource, amount] of Object.entries(citizenDefinition.production ?? {})) {
      let nextAmount = amount * count * outputMultiplier;
      if (resource === "gold" && nextAmount > 0) {
        nextAmount *= goldOutputMultiplier;
      }
      if (resource === "food" && nextAmount > 0) {
        nextAmount *= foodOutputMultiplier;
      }
      totals[resource] = (totals[resource] ?? 0) + nextAmount;
    }

    for (const [resource, amount] of Object.entries(citizenDefinition.consumption ?? {})) {
      totals[resource] = (totals[resource] ?? 0) - amount * count * upkeepMultiplier;
    }
  });

  for (const [citizenClass, totals] of citizenTotals.entries()) {
    for (const resource of ECONOMY_RESOURCE_KEYS) {
      addContribution(contributions, resource, citizenClass, "Citizens", totals[resource] ?? 0);
    }
  }

  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    const assignment = getLegendAssignmentDetails(uniqueCitizen);
    for (const resource of ECONOMY_RESOURCE_KEYS) {
      addContribution(
        contributions,
        resource,
        uniqueCitizen.fullName ?? uniqueCitizen.title ?? "Legend",
        "Legend",
        uniqueCitizen.bonuses?.resources?.[resource] ?? 0
      );
      addContribution(
        contributions,
        resource,
        assignment.post ? `${uniqueCitizen.fullName ?? uniqueCitizen.title ?? "Legend"} (${assignment.post.label})` : "Legend Post",
        "Legend Post",
        assignment.resourceBonuses?.[resource] ?? 0
      );
    }
  }

  for (const relic of getEquippedExpeditionRelics(state)) {
    const activeBonuses = getExpeditionRelicActiveBonuses(state, relic);
    for (const resource of ECONOMY_RESOURCE_KEYS) {
      addContribution(
        contributions,
        resource,
        relic.name ?? relic.kindLabel ?? "Relic",
        relic.kindLabel ?? "Relic",
        relic.bonuses?.resources?.[resource] ?? 0
      );
      addContribution(
        contributions,
        resource,
        `${relic.name ?? relic.kindLabel ?? "Relic"} Synergy`,
        "Relic Synergy",
        activeBonuses.synergy?.active ? activeBonuses.synergyBonuses?.resources?.[resource] ?? 0 : 0
      );
    }
  }

  for (const event of state.events.active) {
    const goldAmount = Number(event.effects?.goldFlat ?? 0);
    const foodAmount = Number(event.effects?.foodFlat ?? 0);
    const materialsAmount = Number(event.effects?.materialsFlat ?? 0);
    const salvageAmount = Number(event.effects?.salvageFlat ?? 0);
    const manaAmount = Number(event.effects?.manaFlat ?? 0);
    const prosperityAmount = Number(event.effects?.prosperityFlat ?? 0);
    const eventLabel = event.title ?? event.name ?? "Event";
    addContribution(contributions, "gold", eventLabel, "Event", goldAmount);
    addContribution(contributions, "food", eventLabel, "Event", foodAmount);
    addContribution(contributions, "materials", eventLabel, "Event", materialsAmount);
    addContribution(contributions, "salvage", eventLabel, "Event", salvageAmount);
    addContribution(contributions, "mana", eventLabel, "Event", manaAmount);
    addContribution(contributions, "prosperity", eventLabel, "Event", prosperityAmount);
  }

  const focus = getCurrentTownFocus(state);
  if (focus?.resourceDaily) {
    const focusLabel = focus.name ?? "Town Focus";
    const goldAmount = Number(focus.resourceDaily.gold ?? 0);
    const foodAmount = Number(focus.resourceDaily.food ?? 0);
    const materialsAmount = Number(focus.resourceDaily.materials ?? 0);
    const salvageAmount = Number(focus.resourceDaily.salvage ?? 0);
    const manaAmount = Number(focus.resourceDaily.mana ?? 0);
    const prosperityAmount = Number(focus.resourceDaily.prosperity ?? 0);
    addContribution(contributions, "gold", focusLabel, "Focus", goldAmount);
    addContribution(contributions, "food", focusLabel, "Focus", foodAmount);
    addContribution(contributions, "materials", focusLabel, "Focus", materialsAmount);
    addContribution(contributions, "salvage", focusLabel, "Focus", salvageAmount);
    addContribution(contributions, "mana", focusLabel, "Focus", manaAmount);
    addContribution(contributions, "prosperity", focusLabel, "Focus", prosperityAmount);
  }

  return Object.fromEntries(
    ECONOMY_RESOURCE_KEYS.map((resource) => {
      const entries = contributions[resource] ?? [];
      return [
        resource,
        {
          sources: entries.filter((entry) => entry.amount > 0.005).sort(sortPositiveContributionRows).slice(0, 5),
          drains: entries.filter((entry) => entry.amount < -0.005).sort(sortNegativeContributionRows).slice(0, 5)
        }
      ];
    })
  );
}

export function getEconomyTopContributorsSummary(state) {
  const contributionBreakdown = getEconomyContributionBreakdown(state);
  return Object.fromEntries(
    Object.entries(contributionBreakdown).map(([resource, entry]) => [
      resource,
      [...(entry.sources ?? []), ...(entry.drains ?? [])].sort(sortContributionRows).slice(0, 5)
    ])
  );
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

function formatSignedAmount(value, decimals = 2) {
  const numericValue = Number(value ?? 0) || 0;
  return `${numericValue >= 0 ? "+" : ""}${roundDisplayNumber(numericValue, decimals)}`;
}

function getEmergencyFixes(state, emergencyKey) {
  const suggestedFocus = getSuggestedFocusForAlert(state, emergencyKey);
  const focusFix = suggestedFocus ? `Shift town focus toward ${suggestedFocus.name}.` : "";
  const fixesByKey = {
    morale: [
      "Stabilize shortages and civic pressure before morale drops further.",
      focusFix || "Lean on civic, cultural, or religious buildings to restore confidence."
    ],
    food: [
      "Staff agriculture and food-chain buildings before advancing time further.",
      focusFix || "Pause nonessential growth until food turns positive again."
    ],
    gold: [
      "Bring trade and goods output online or trim upkeep-heavy expansion.",
      focusFix || "Prioritize markets, merchants, and commerce routes."
    ],
    mana: [
      "Staff arcane buildings and crystal routes before mana reaches zero.",
      focusFix || "Slow mana-heavy plans until the burn rate stabilizes."
    ],
    housing: [
      "Manifest or place more housing and civic support buildings.",
      focusFix || "Slow fresh population growth until support catches up."
    ],
    workforce: [
      "Recruit or rescue more citizens before adding more active load.",
      "Pause or deprioritize lower-value operated buildings to reduce staffing demand."
    ]
  };
  return (fixesByKey[emergencyKey] ?? []).filter(Boolean).slice(0, 2);
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
  const pressureCount = [
    foodRunwayDays !== null,
    goldRunwayDays !== null && goldRunwayDays <= 10,
    manaRunwayDays !== null && manaRunwayDays <= 10,
    housingGap > 0,
    (workforceSummary.generalDemand ?? 0) > 0 && (workforceSummary.generalRatio ?? 1) < 1
  ].filter(Boolean).length;

  if ((state.cityStats.morale ?? 0) <= 18) {
    emergencies.push({
      key: "morale",
      severity: (state.cityStats.morale ?? 0) <= 8 ? "critical" : "warning",
      label: "Morale strain",
      details: `Morale is ${Math.round(state.cityStats.morale ?? 0)} and the city is at risk of unrest.`,
      cause: `Morale is sitting at ${Math.round(state.cityStats.morale ?? 0)} while ${pressureCount} other pressure point${pressureCount === 1 ? "" : "s"} are dragging confidence down.`,
      fixes: getEmergencyFixes(state, "morale")
    });
  }

  if (foodRunwayDays !== null) {
    emergencies.push({
      key: "food",
      severity: foodRunwayDays <= 5 ? "critical" : "warning",
      label: "Food deficit",
      details: foodRunwayDays <= 0
        ? "Food reserves are already exhausted."
        : `${foodRunwayDays.toFixed(1)} days of food remain at the current deficit.`,
      cause: `Food is moving at ${formatSignedAmount(deltas.food)} per day with ${roundDisplayNumber(state.resources.food ?? 0, 1)} currently stored.`,
      fixes: getEmergencyFixes(state, "food")
    });
  }

  if (goldRunwayDays !== null && goldRunwayDays <= 10) {
    emergencies.push({
      key: "gold",
      severity: goldRunwayDays <= 4 ? "critical" : "warning",
      label: "Treasury drain",
      details: `${goldRunwayDays.toFixed(1)} days of gold remain if spending stays ahead of income.`,
      cause: `Gold is moving at ${formatSignedAmount(deltas.gold)} per day with ${roundDisplayNumber(state.resources.gold ?? 0, 1)} in the treasury.`,
      fixes: getEmergencyFixes(state, "gold")
    });
  }

  if (manaRunwayDays !== null && manaRunwayDays <= 10) {
    emergencies.push({
      key: "mana",
      severity: manaRunwayDays <= 4 ? "critical" : "warning",
      label: "Mana drain",
      details: `${manaRunwayDays.toFixed(1)} days of mana remain at the current burn rate.`,
      cause: `Mana is moving at ${formatSignedAmount(deltas.mana)} per day with ${roundDisplayNumber(state.resources.mana ?? 0, 1)} still available.`,
      fixes: getEmergencyFixes(state, "mana")
    });
  }

  if (housingGap > 0) {
    emergencies.push({
      key: "housing",
      severity: housingGap >= 10 ? "critical" : "warning",
      label: "Housing strain",
      details: `${housingGap} citizens exceed current support capacity.`,
      cause: `${roundDisplayNumber(state.resources.population ?? 0, 0)} residents are competing for only ${roundDisplayNumber(state.cityStats.populationSupport ?? 0, 0)} support capacity.`,
      fixes: getEmergencyFixes(state, "housing")
    });
  }

  if ((workforceSummary.generalDemand ?? 0) > 0 && (workforceSummary.generalRatio ?? 1) < 1) {
    const severity = (workforceSummary.generalRatio ?? 1) < 0.75 ? "critical" : "warning";
    const incubationDetail = incompleteBuildings > 0
      ? " Excess staffing is too thin to strongly boost incubation support right now."
      : "";
    emergencies.push({
      key: "workforce",
      severity,
      label: "Workforce strain",
      details: `${formatPercent(workforceSummary.generalRatio)} of general staffing demand is covered, shutting down operated building production until staffing recovers.${incubationDetail}`,
      cause: `${roundDisplayNumber(workforceSummary.generalSupply ?? 0, 0)} available general workers are trying to cover ${roundDisplayNumber(workforceSummary.generalDemand ?? 0, 0)} demand.`,
      fixes: getEmergencyFixes(state, "workforce")
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
