import {
  CITIZEN_CLASSES,
  CITIZEN_DEFINITIONS,
  CITIZEN_RARITIES,
  CITIZEN_PROMOTION_PATHS
} from "../content/CitizenConfig.js";
import { sumObjectValues } from "../engine/Utils.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";

// Legacy-only class names from pre-rework saves.
// Do not include names that are also valid current classes, or load-time
// normalization will re-inflate those citizens every time a save is read.
const LEGACY_CITIZEN_MIGRATION = {
  Peasants: { Farmers: 0.5, Laborers: 0.2, Children: 0.15, Elderly: 0.15 },
  Workers: { Laborers: 0.4, Crafters: 0.25, Fishermen: 0.1, Techwrights: 0.1, Scavengers: 0.15 },
  Clergy: { Priests: 0.7, Medics: 0.3 },
  Mages: { Arcanists: 0.75, Techwrights: 0.25 },
  Miners: { Scavengers: 0.4, Laborers: 0.3, Techwrights: 0.3 },
  Craftsmen: { Crafters: 0.8, Techwrights: 0.2 },
  Guards: { Defenders: 0.8, Scouts: 0.2 },
  Administrators: { Scribes: 0.8, Nobles: 0.2 },
  Healers: { Medics: 1 },
  Heroes: { Soldiers: 0.5, Nobles: 0.25, Arcanists: 0.25 }
};

export function createCitizenDefinitionsSnapshot() {
  return structuredClone(CITIZEN_DEFINITIONS);
}

export function createCitizenRarityRoster(counts = {}, defaultRarity = "Common") {
  return Object.fromEntries(
    CITIZEN_CLASSES.map((citizenClass) => [
      citizenClass,
      Object.fromEntries(
        CITIZEN_RARITIES.map((rarity) => [
          rarity,
          rarity === defaultRarity ? Math.max(0, Number(counts?.[citizenClass] ?? 0) || 0) : 0
        ])
      )
    ])
  );
}

export function normalizeCitizenRarityRoster(roster, counts = {}) {
  const normalized = createCitizenRarityRoster();

  for (const citizenClass of CITIZEN_CLASSES) {
    for (const rarity of CITIZEN_RARITIES) {
      normalized[citizenClass][rarity] = Math.max(0, Number(roster?.[citizenClass]?.[rarity] ?? 0) || 0);
    }

    const rosterTotal = CITIZEN_RARITIES.reduce((sum, rarity) => sum + normalized[citizenClass][rarity], 0);
    const countTotal = Math.max(0, Number(counts?.[citizenClass] ?? 0) || 0);
    if (countTotal > rosterTotal) {
      normalized[citizenClass].Common += countTotal - rosterTotal;
    }
  }

  return normalized;
}

export function syncCitizenTotalsFromRoster(state) {
  state.citizens = state.citizens ?? {};
  for (const citizenClass of CITIZEN_CLASSES) {
    state.citizens[citizenClass] = CITIZEN_RARITIES.reduce(
      (sum, rarity) => sum + Math.max(0, Number(state.citizenRarityRoster?.[citizenClass]?.[rarity] ?? 0) || 0),
      0
    );
  }
  state.resources.population = getTotalPopulation(state);
}

function ensureCitizenRarityRoster(state) {
  if (!state.citizenRarityRoster) {
    state.citizenRarityRoster = createCitizenRarityRoster(state.citizens);
  }
}

export function iterateCitizenRarityEntries(state, callback) {
  const roster = normalizeCitizenRarityRoster(state.citizenRarityRoster, state.citizens);
  for (const citizenClass of CITIZEN_CLASSES) {
    for (const rarity of CITIZEN_RARITIES) {
      const count = Math.max(0, Number(roster[citizenClass]?.[rarity] ?? 0) || 0);
      if (count <= 0) {
        continue;
      }
      callback(citizenClass, rarity, count);
    }
  }
}

export function addCitizensByRarity(state, citizenClass, rarity, amount, source = "Expedition") {
  ensureCitizenRarityRoster(state);
  const normalizedRarity = CITIZEN_RARITIES.includes(rarity) ? rarity : "Common";
  state.citizenRarityRoster[citizenClass][normalizedRarity] =
    Math.max(0, Number(state.citizenRarityRoster[citizenClass][normalizedRarity] ?? 0) || 0) + Math.max(0, Number(amount) || 0);
  syncCitizenTotalsFromRoster(state);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} added ${amount} ${normalizedRarity} ${citizenClass}`,
    details: `${source} added ${amount} ${normalizedRarity} ${citizenClass}.`
  });
}

export function takeCitizensFromRoster(state, citizenClass, amount, preferredOrder = ["Common", "Rare", "Epic"]) {
  ensureCitizenRarityRoster(state);
  const nextAmount = Math.max(0, Number(amount) || 0);
  const removed = Object.fromEntries(CITIZEN_RARITIES.map((rarity) => [rarity, 0]));
  let remaining = nextAmount;

  for (const rarity of preferredOrder) {
    if (!CITIZEN_RARITIES.includes(rarity) || remaining <= 0) {
      continue;
    }
    const available = Math.max(0, Number(state.citizenRarityRoster[citizenClass]?.[rarity] ?? 0) || 0);
    const used = Math.min(available, remaining);
    if (used <= 0) {
      continue;
    }
    state.citizenRarityRoster[citizenClass][rarity] = available - used;
    removed[rarity] += used;
    remaining -= used;
  }

  syncCitizenTotalsFromRoster(state);
  return removed;
}

function addCitizenBundle(state, citizenClass, bundle) {
  ensureCitizenRarityRoster(state);
  for (const rarity of CITIZEN_RARITIES) {
    state.citizenRarityRoster[citizenClass][rarity] =
      Math.max(0, Number(state.citizenRarityRoster[citizenClass][rarity] ?? 0) || 0) +
      Math.max(0, Number(bundle?.[rarity] ?? 0) || 0);
  }
  syncCitizenTotalsFromRoster(state);
}

export function addCitizenRarityBundle(state, citizenClass, bundle) {
  addCitizenBundle(state, citizenClass, bundle);
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
  if (amount >= 0) {
    addCitizenBundle(state, citizenClass, { Common: Math.max(0, Number(amount) || 0) });
    return;
  }
  takeCitizensFromRoster(state, citizenClass, Math.abs(amount));
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
  ensureCitizenRarityRoster(state);
  state.citizenRarityRoster[citizenClass] = { Common: Math.max(0, Number(amount) || 0), Rare: 0, Epic: 0 };
  syncCitizenTotalsFromRoster(state);
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
  const movedBundle = takeCitizensFromRoster(state, fromClass, moveAmount);
  addCitizenBundle(state, toClass, movedBundle);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} ${action} ${moveAmount} ${fromClass} to ${toClass}`,
    details: `${source} ${action} ${moveAmount} ${fromClass} to ${toClass}.`
  });
}

export function resetCitizens(state, source = "Admin") {
  state.citizenRarityRoster = createCitizenRarityRoster();
  syncCitizenTotalsFromRoster(state);
  addHistoryEntry(state, {
    category: "Citizens",
    title: `${source} reset all citizen counts`,
    details: `${source} reset all citizen counts.`
  });
}

export function applyCitizenBulkSet(state, bulkValues, source = "Admin") {
  ensureCitizenRarityRoster(state);
  for (const citizenClass of CITIZEN_CLASSES) {
    if (bulkValues[citizenClass] === undefined) {
      continue;
    }
    state.citizenRarityRoster[citizenClass] = {
      Common: Math.max(0, Number(bulkValues[citizenClass]) || 0),
      Rare: 0,
      Epic: 0
    };
  }
  syncCitizenTotalsFromRoster(state);
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
