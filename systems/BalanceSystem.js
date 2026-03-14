import { RARITY_POWER } from "../content/Rarities.js";
import { seededFloat } from "../engine/Random.js";
import { roundTo } from "../engine/Utils.js";

const EMPTY_STATS = {
  value: 0,
  income: 0,
  upkeep: 0,
  prosperity: 0,
  defense: 0,
  security: 0,
  prestige: 0,
  morale: 0,
  health: 0
};

const EMPTY_RESOURCES = { gold: 0, food: 0, materials: 0, mana: 0 };
const EMPTY_CITIZEN_EFFECTS = { populationSupport: 0, prosperityAffinity: 0, moraleAffinity: 0 };

const TAG_PROFILES = {
  agriculture: {
    stats: { income: 0.75, prosperity: 0.24, health: 0.2, value: 0.2 },
    resources: { food: 1.8, gold: 0.22, materials: 0.12 },
    citizens: { populationSupport: 0.3, prosperityAffinity: 0.2 }
  },
  trade: {
    stats: { value: 0.9, income: 1.1, prestige: 0.25, security: 0.1 },
    resources: { gold: 1.7, food: 0.08, materials: 0.1 },
    citizens: { prosperityAffinity: 0.35 }
  },
  industry: {
    stats: { value: 0.8, income: 0.55, upkeep: 0.24, defense: 0.1 },
    resources: { materials: 1.6, gold: 0.35, food: -0.12 },
    citizens: { populationSupport: 0.2 }
  },
  military: {
    stats: { defense: 1.2, security: 0.95, morale: 0.16, upkeep: 0.45 },
    resources: { gold: -0.6, food: -0.28, materials: -0.16 },
    citizens: { moraleAffinity: 0.15 }
  },
  arcane: {
    stats: { prestige: 0.62, prosperity: 0.3, value: 0.32, upkeep: 0.28 },
    resources: { mana: 1.55, gold: -0.22, materials: -0.1 },
    citizens: { prosperityAffinity: 0.2, moraleAffinity: 0.08 }
  },
  religious: {
    stats: { morale: 0.88, health: 0.45, prosperity: 0.28, prestige: 0.22 },
    resources: { gold: 0.12, food: 0.2, mana: 0.2 },
    citizens: { moraleAffinity: 0.35, populationSupport: 0.18 }
  },
  civic: {
    stats: { security: 0.42, prosperity: 0.32, value: 0.25, morale: 0.15 },
    resources: { gold: 0.25, food: 0.05, materials: 0.05 },
    citizens: { prosperityAffinity: 0.24 }
  },
  housing: {
    stats: { morale: 0.35, health: 0.35, prosperity: 0.26, upkeep: 0.1 },
    resources: { food: -0.18, gold: -0.08 },
    citizens: { populationSupport: 0.8, moraleAffinity: 0.2 }
  },
  harbor: {
    stats: { income: 0.7, security: 0.28, value: 0.45, prestige: 0.15 },
    resources: { gold: 1, materials: 0.8, food: 0.2 },
    citizens: { prosperityAffinity: 0.22 }
  },
  culture: {
    stats: { prestige: 0.8, morale: 0.4, prosperity: 0.36, health: 0.1 },
    resources: { gold: 0.3, mana: 0.16 },
    citizens: { prosperityAffinity: 0.3, moraleAffinity: 0.22 }
  },
  frontier: {
    stats: { defense: 0.7, security: 0.55, prestige: 0.32, value: 0.2 },
    resources: { materials: 0.3, food: 0.24, gold: 0.15, mana: 0.1 },
    citizens: { populationSupport: 0.12, moraleAffinity: 0.06 }
  },
  security: {
    stats: { defense: 0.35, security: 0.5, upkeep: 0.16 },
    resources: { gold: -0.12 },
    citizens: {}
  }
};

function mergeWeighted(target, source = {}) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

export function createBuildingGameplayProfile(definition) {
  const basePower = RARITY_POWER[definition.rarity];
  const statsWeights = structuredClone(EMPTY_STATS);
  const resourceWeights = structuredClone(EMPTY_RESOURCES);
  const citizenWeights = structuredClone(EMPTY_CITIZEN_EFFECTS);

  for (const tag of definition.tags) {
    const profile = TAG_PROFILES[tag];
    if (!profile) {
      continue;
    }
    mergeWeighted(statsWeights, profile.stats);
    mergeWeighted(resourceWeights, profile.resources);
    mergeWeighted(citizenWeights, profile.citizens);
  }

  const stats = {};
  for (const key of Object.keys(EMPTY_STATS)) {
    const variance = seededFloat(`${definition.key}:${key}`, 0.85, 1.15);
    const statWeight = statsWeights[key] ?? 0;
    stats[key] = definition.statOverrides?.[key] ?? Math.round(basePower * statWeight * variance);
  }

  const resourceRates = {};
  for (const key of Object.keys(EMPTY_RESOURCES)) {
    const variance = seededFloat(`${definition.key}:resource:${key}`, 0.9, 1.1);
    resourceRates[key] = roundTo(((basePower / 18) * (resourceWeights[key] ?? 0)) * variance, 2);
  }

  const citizenEffects = {};
  for (const key of Object.keys(EMPTY_CITIZEN_EFFECTS)) {
    const variance = seededFloat(`${definition.key}:citizen:${key}`, 0.92, 1.08);
    citizenEffects[key] = roundTo(((basePower / 20) * (citizenWeights[key] ?? 0)) * variance, 2);
  }

  return { stats, resourceRates, citizenEffects };
}
