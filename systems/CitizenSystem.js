import {
  CITIZEN_CLASSES,
  CITIZEN_DEFINITIONS,
  CITIZEN_PROMOTION_PATHS
} from "../content/CitizenConfig.js";
import { sumObjectValues } from "../engine/Utils.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";

const LEGACY_CITIZEN_MIGRATION = {
  Peasants: { Farmers: 0.55, Laborers: 0.25, Children: 0.1, Elderly: 0.1 },
  Workers: { Laborers: 0.4, Craftsmen: 0.25, Miners: 0.2, Scavengers: 0.15 },
  Merchants: { Merchants: 0.7, Administrators: 0.15, Entertainers: 0.15 },
  Scholars: { Scholars: 0.7, Administrators: 0.15, Healers: 0.15 },
  Clergy: { Clergy: 0.75, Healers: 0.25 },
  Soldiers: { Guards: 0.45, Soldiers: 0.45, Heroes: 0.1 },
  Nobles: { Nobles: 0.85, Administrators: 0.15 },
  Mages: { Mages: 0.85, Scholars: 0.15 }
};

export function createCitizenDefinitionsSnapshot() {
  return structuredClone(CITIZEN_DEFINITIONS);
}

export function normalizeCitizens(citizens) {
  const normalized = Object.fromEntries(
    CITIZEN_CLASSES.map((citizenClass) => [citizenClass, Math.max(0, Number(citizens?.[citizenClass] ?? 0))])
  );

  if (!citizens || typeof citizens !== "object") {
    return normalized;
  }

  for (const [legacyClass, distribution] of Object.entries(LEGACY_CITIZEN_MIGRATION)) {
    const legacyCount = Math.max(0, Number(citizens[legacyClass] ?? 0));
    if (!legacyCount) {
      continue;
    }

    let assigned = 0;
    const entries = Object.entries(distribution);
    entries.forEach(([nextClass, ratio], index) => {
      const amount =
        index === entries.length - 1
          ? legacyCount - assigned
          : Math.floor(legacyCount * ratio);
      normalized[nextClass] = (normalized[nextClass] ?? 0) + amount;
      assigned += amount;
    });
  }

  return normalized;
}

export function getTotalPopulation(state) {
  return sumObjectValues(state.citizens);
}

function applyCitizenDelta(state, citizenClass, amount) {
  state.citizens[citizenClass] = Math.max(0, (state.citizens[citizenClass] ?? 0) + amount);
  state.resources.population = getTotalPopulation(state);
}

export function addCitizens(state, citizenClass, amount, source = "Admin") {
  applyCitizenDelta(state, citizenClass, Math.max(0, Number(amount)));
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} added ${amount} ${citizenClass}`,
    details: `${source} added ${amount} ${citizenClass}.`
  });
}

export function removeCitizens(state, citizenClass, amount, source = "Admin") {
  const actualAmount = Math.min(state.citizens[citizenClass] ?? 0, Math.max(0, Number(amount)));
  applyCitizenDelta(state, citizenClass, -actualAmount);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} removed ${actualAmount} ${citizenClass}`,
    details: `${source} removed ${actualAmount} ${citizenClass}.`
  });
}

export function setCitizens(state, citizenClass, amount, source = "Admin") {
  state.citizens[citizenClass] = Math.max(0, Number(amount));
  state.resources.population = getTotalPopulation(state);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} set ${citizenClass} to ${state.citizens[citizenClass]}`,
    details: `${source} set ${citizenClass} to ${state.citizens[citizenClass]}.`
  });
}

export function promoteCitizens(state, fromClass, toClass, amount, source = "Admin", action = "promoted") {
  const moveAmount = Math.min(state.citizens[fromClass] ?? 0, Math.max(0, Number(amount)));
  if (moveAmount <= 0) {
    return;
  }
  state.citizens[fromClass] -= moveAmount;
  state.citizens[toClass] = (state.citizens[toClass] ?? 0) + moveAmount;
  state.resources.population = getTotalPopulation(state);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} ${action} ${moveAmount} ${fromClass} to ${toClass}`,
    details: `${source} ${action} ${moveAmount} ${fromClass} to ${toClass}.`
  });
}

export function resetCitizens(state, source = "Admin") {
  for (const citizenClass of CITIZEN_CLASSES) {
    state.citizens[citizenClass] = 0;
  }
  state.resources.population = 0;
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} reset all citizen counts`,
    details: `${source} reset all citizen counts.`
  });
}

export function applyCitizenBulkSet(state, bulkValues, source = "Admin") {
  for (const citizenClass of CITIZEN_CLASSES) {
    if (bulkValues[citizenClass] === undefined) {
      continue;
    }
    state.citizens[citizenClass] = Math.max(0, Number(bulkValues[citizenClass]));
  }
  state.resources.population = getTotalPopulation(state);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} applied bulk citizen update`,
    details: `${source} applied bulk changes across citizen classes.`
  });
}

function hasAnyActiveBuildings(state, buildingNames) {
  return state.buildings.some((building) => building.isComplete && buildingNames.includes(building.name));
}

function districtLevelAtLeast(state, requirement) {
  return state.districtSummary.some(
    (district) => district.name === requirement.district && district.level >= requirement.level
  );
}

function meetsPromotionRequirements(state, requirement) {
  if (requirement.buildingsAny && !hasAnyActiveBuildings(state, requirement.buildingsAny)) {
    return false;
  }
  if (requirement.prosperityAtLeast && state.resources.prosperity < requirement.prosperityAtLeast) {
    return false;
  }
  if (requirement.resourceAtLeast) {
    for (const [resource, amount] of Object.entries(requirement.resourceAtLeast)) {
      if ((state.resources[resource] ?? 0) < amount) {
        return false;
      }
    }
  }
  if (requirement.districtLevel && !districtLevelAtLeast(state, requirement.districtLevel)) {
    return false;
  }
  return true;
}

export function runCitizenPromotions(state) {
  for (const path of CITIZEN_PROMOTION_PATHS) {
    if (!meetsPromotionRequirements(state, path.requirements)) {
      continue;
    }
    if ((state.citizens[path.from] ?? 0) <= 0) {
      continue;
    }
    promoteCitizens(state, path.from, path.to, 1, "City", "promoted");
  }
}
