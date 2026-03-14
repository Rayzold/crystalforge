import { RESOURCE_MINIMUMS } from "../content/Config.js";
import { clamp } from "../engine/Utils.js";
import { getDistrictSummary } from "./DistrictSystem.js";

function createDeltaRecord() {
  return { gold: 0, food: 0, materials: 0, mana: 0, prosperity: 0 };
}

export function getWarningFlags(state) {
  return {
    lowFood: state.resources.food <= 20,
    lowGold: state.resources.gold <= 20,
    lowMana: state.resources.mana <= 12
  };
}

export function applyDailyResources(state) {
  const deltas = createDeltaRecord();

  for (const building of state.buildings) {
    if (!building.isComplete) {
      continue;
    }

    deltas.gold += building.resourceRates.gold * building.multiplier;
    deltas.food += building.resourceRates.food * building.multiplier;
    deltas.materials += building.resourceRates.materials * building.multiplier;
    deltas.mana += building.resourceRates.mana * building.multiplier;
    deltas.prosperity += building.stats.prosperity * 0.02 * building.multiplier;
  }

  for (const [citizenClass, count] of Object.entries(state.citizens)) {
    const citizenDefinition = state.citizenDefinitions[citizenClass];
    for (const [resource, amount] of Object.entries(citizenDefinition.production)) {
      deltas[resource] = (deltas[resource] ?? 0) + amount * count;
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
    if (effects.manaMultiplier) {
      deltas.mana *= 1 + effects.manaMultiplier;
    }
  }

  state.resources.gold = clamp(state.resources.gold + deltas.gold, RESOURCE_MINIMUMS.gold, 999999);
  state.resources.food = clamp(state.resources.food + deltas.food, RESOURCE_MINIMUMS.food, 999999);
  state.resources.materials = clamp(state.resources.materials + deltas.materials, RESOURCE_MINIMUMS.materials, 999999);
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
