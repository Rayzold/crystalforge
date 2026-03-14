import { sumObjectValues } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";

const EMPTY_CITY_STATS = {
  value: 0,
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

export function recalculateCityStats(state) {
  const nextStats = structuredClone(EMPTY_CITY_STATS);

  for (const building of state.buildings) {
    if (!building.isComplete) {
      continue;
    }
    for (const [key, value] of Object.entries(building.stats)) {
      nextStats[key] = (nextStats[key] ?? 0) + value * building.multiplier;
    }
    nextStats.populationSupport += building.citizenEffects.populationSupport * building.multiplier;
  }

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    for (const [statKey, statValue] of Object.entries(citizenDefinition.stats)) {
      nextStats[statKey] = (nextStats[statKey] ?? 0) + statValue * count;
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
    nextStats.populationSupport += (bonuses.populationSupportFlat ?? 0) * district.level;
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

  const totalIncome = sumObjectValues(
    state.buildings
      .filter((building) => building.isComplete)
      .reduce(
        (record, building) => {
          record.gold += Math.max(0, building.resourceRates.gold) * building.multiplier;
          record.food += Math.max(0, building.resourceRates.food) * building.multiplier;
          record.materials += Math.max(0, building.resourceRates.materials) * building.multiplier;
          record.mana += Math.max(0, building.resourceRates.mana) * building.multiplier;
          return record;
        },
        { gold: 0, food: 0, materials: 0, mana: 0 }
      )
  );

  nextStats.income += totalIncome;
  nextStats.upkeep += state.buildings
    .filter((building) => building.isComplete)
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
  state.cityStats = nextStats;
  return nextStats;
}
