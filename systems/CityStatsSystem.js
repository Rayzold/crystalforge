// Aggregated city stat calculation.
// This file turns citizens, buildings, districts, and condition modifiers into
// the shared city-stat block used across the UI and downstream systems.
import { sumObjectValues } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { scalePopulationSupport } from "./DriftEvolutionSystem.js";
import { getBuildingPlacementBonuses } from "./MapSystem.js";
import { getCurrentTownFocus } from "./TownFocusSystem.js";
import { getGoodsOutputMultiplier, getHousingStrainPenalty } from "./CityConditionSystem.js";

const EMPTY_CITY_STATS = {
  goods: 0,
  income: 0,
  upkeep: 0,
  prosperity: 0,
  defense: 0,
  security: 0,
  prestige: 0,
  morale: 0,
  health: 0,
  populationSupport: 0
};

function applyPercent(value, percent) {
  return value * (1 + percent / 100);
}

function getTradeGoodsGoldMultiplier(state) {
  const goods = Math.max(0, Number(state.cityStats?.goods ?? 0) || 0);
  const excessGoods = Math.max(0, goods - 10);
  const bonusSteps = Math.floor(excessGoods / 10);
  return 1 + Math.min(1, bonusSteps * 0.1);
}

export function recalculateCityStats(state) {
  const nextStats = structuredClone(EMPTY_CITY_STATS);
  let rawPopulationSupport = 0;
  const goodsOutputMultiplier = getGoodsOutputMultiplier(state);

  for (const building of state.buildings) {
    if (!building.isComplete || building.isRuined) {
      continue;
    }
    const placementMultiplier = 1 + getBuildingPlacementBonuses(state, building).totalPercent;
    for (const [key, value] of Object.entries(building.stats)) {
      const normalizedKey = key === "value" ? "goods" : key;
      const statContribution = value * building.multiplier * placementMultiplier;
      nextStats[normalizedKey] =
        (nextStats[normalizedKey] ?? 0) +
        (normalizedKey === "goods" && statContribution > 0 ? statContribution * goodsOutputMultiplier : statContribution);
    }
    rawPopulationSupport += building.citizenEffects.populationSupport * placementMultiplier;
  }

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    for (const [statKey, statValue] of Object.entries(citizenDefinition.stats)) {
      const normalizedKey = statKey === "value" ? "goods" : statKey;
      const statContribution = statValue * count;
      nextStats[normalizedKey] =
        (nextStats[normalizedKey] ?? 0) +
        (normalizedKey === "goods" && statContribution > 0 ? statContribution * goodsOutputMultiplier : statContribution);
    }
  }

  const districtSummary = getDistrictSummary(state);
  state.districtSummary = districtSummary;
  for (const district of districtSummary) {
    const bonuses = district.definition.bonuses;
    if (district.level <= 0) {
      continue;
    }

    nextStats.prosperity += (bonuses.prosperityFlat ?? 0) * district.level;
    nextStats.defense += (bonuses.defenseFlat ?? 0) * district.level;
    nextStats.security += (bonuses.securityFlat ?? 0) * district.level;
    nextStats.prestige += (bonuses.prestigeFlat ?? 0) * district.level;
    nextStats.morale += (bonuses.moraleFlat ?? 0) * district.level;
    rawPopulationSupport += (bonuses.populationSupportFlat ?? 0) * district.level;
  }

  for (const event of state.events.active) {
    const effects = event.effects;
    nextStats.defense += effects.defenseFlat ?? 0;
    nextStats.security += effects.securityFlat ?? 0;
    nextStats.prestige += effects.prestigeFlat ?? 0;
    nextStats.morale += effects.moraleFlat ?? 0;
    nextStats.health += effects.healthFlat ?? 0;
    nextStats.prosperity += effects.prosperityFlat ?? 0;
  }

  const townFocus = getCurrentTownFocus(state);
  if (townFocus?.statFlat) {
    nextStats.defense += townFocus.statFlat.defense ?? 0;
    nextStats.security += townFocus.statFlat.security ?? 0;
    nextStats.prestige += townFocus.statFlat.prestige ?? 0;
    nextStats.morale += townFocus.statFlat.morale ?? 0;
    nextStats.health += townFocus.statFlat.health ?? 0;
    nextStats.prosperity += townFocus.statFlat.prosperity ?? 0;
  }

  const totalIncome = sumObjectValues(
    state.buildings
      .filter((building) => building.isComplete && !building.isRuined)
      .reduce(
        (record, building) => {
          const placementMultiplier = 1 + getBuildingPlacementBonuses(state, building).totalPercent;
          let goldIncome = Math.max(0, building.resourceRates.gold) * building.multiplier * placementMultiplier;
          if (goldIncome > 0 && building.tags?.includes("trade")) {
            goldIncome *= getTradeGoodsGoldMultiplier(state);
          }
          record.gold += goldIncome;
          record.food += Math.max(0, building.resourceRates.food) * building.multiplier * placementMultiplier;
          record.materials += Math.max(0, building.resourceRates.materials) * building.multiplier * placementMultiplier;
          record.mana += Math.max(0, building.resourceRates.mana) * building.multiplier * placementMultiplier;
          return record;
        },
        { gold: 0, food: 0, materials: 0, mana: 0 }
      )
  );

  nextStats.income += totalIncome;
  nextStats.upkeep += state.buildings
    .filter((building) => building.isComplete && !building.isRuined)
    .reduce((sum, building) => sum + Math.max(0, building.stats.upkeep) * building.multiplier, 0);

  for (const district of districtSummary) {
    const bonuses = district.definition.bonuses;
    if (district.level <= 0) {
      continue;
    }
    if (bonuses.defensePercent) {
      nextStats.defense = applyPercent(nextStats.defense, bonuses.defensePercent * district.level);
    }
    if (bonuses.securityPercent) {
      nextStats.security = applyPercent(nextStats.security, bonuses.securityPercent * district.level);
    }
  }

  nextStats.prosperity += state.resources.prosperity;
  nextStats.populationSupport = scalePopulationSupport(rawPopulationSupport);
  const housingPenalty = getHousingStrainPenalty({ ...state, cityStats: { ...state.cityStats, populationSupport: nextStats.populationSupport } });
  nextStats.morale = Math.max(0, nextStats.morale - housingPenalty.morale);
  nextStats.health = Math.max(0, nextStats.health - housingPenalty.health);
  nextStats.prosperity = Math.max(0, nextStats.prosperity - housingPenalty.prosperity);
  state.cityStats = nextStats;
  return nextStats;
}
