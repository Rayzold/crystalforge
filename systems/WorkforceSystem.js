import { RARITY_RANKS } from "../content/Rarities.js";
import { roundTo } from "../engine/Utils.js";

const GENERAL_OUTPUT_FLOOR = 0.25;
const SPECIALIST_OUTPUT_FLOOR = 0.7;
const SPECIALIST_DEMAND_SHARE = 0.65;
const CONSTRUCTION_WORKFORCE_SUPPORT_MULTIPLIER = 3;

const WORKFORCE_DEMAND_BY_RANK = {
  1: 2,
  2: 4,
  3: 6,
  4: 10,
  5: 16,
  6: 24
};

const PRODUCTIVE_STAT_KEYS = new Set(["goods", "income", "prosperity", "defense", "security", "prestige", "morale", "health"]);

const GENERAL_WORKFORCE_WEIGHTS = {
  Farmers: 0.8,
  Hunters: 0.7,
  Fishermen: 0.7,
  Scavengers: 0.9,
  Druids: 0.6,
  Laborers: 1,
  Crafters: 1,
  Techwrights: 1.1,
  Merchants: 0.65,
  Skycrew: 0.65,
  Scouts: 0.55,
  Defenders: 0.5,
  Soldiers: 0.45,
  Arcanists: 0.6,
  Medics: 0.55,
  Scribes: 0.55,
  Scholars: 0.45,
  Nobles: 0.2,
  Priests: 0.35,
  Entertainers: 0.35,
  Children: 0,
  Elderly: 0
};

const SPECIALIST_WORKFORCE_WEIGHTS = {
  agriculture: { Farmers: 1, Hunters: 0.8, Fishermen: 0.8, Druids: 0.65, Laborers: 0.35 },
  industry: { Laborers: 1, Crafters: 1, Techwrights: 1.15, Scavengers: 0.6 },
  trade: { Merchants: 1, Scribes: 0.7, Crafters: 0.45, Entertainers: 0.35, Skycrew: 0.35 },
  arcane: { Arcanists: 1, Scholars: 0.8, Techwrights: 0.7, Druids: 0.4, Scribes: 0.25 },
  military: { Defenders: 1, Soldiers: 1.1, Scouts: 0.6, Laborers: 0.25 },
  harbor: { Skycrew: 1, Merchants: 0.55, Fishermen: 0.45, Scouts: 0.35, Laborers: 0.3 },
  culture: { Scholars: 1, Scribes: 0.75, Entertainers: 0.75, Crafters: 0.35 },
  religious: { Priests: 1, Medics: 0.6, Druids: 0.35, Scholars: 0.25 },
  frontier: { Scouts: 1, Hunters: 0.85, Skycrew: 0.5, Defenders: 0.45, Laborers: 0.25 },
  civic: { Scribes: 1, Medics: 0.75, Entertainers: 0.55, Nobles: 0.35, Laborers: 0.25 }
};

const DISTRICT_CATEGORY_MAP = {
  "Agricultural District": "agriculture",
  "Industrial District": "industry",
  "Trade District": "trade",
  "Arcane District": "arcane",
  "Military District": "military",
  "Harbor District": "harbor",
  "Cultural District": "culture",
  "Religious District": "religious",
  "Frontier District": "frontier",
  "Residential District": "civic"
};

const WORKFORCE_CATEGORY_LABELS = {
  agriculture: "Agriculture",
  industry: "Industry",
  trade: "Trade",
  arcane: "Arcane",
  military: "Military",
  harbor: "Harbor",
  culture: "Culture",
  religious: "Religious",
  frontier: "Frontier",
  civic: "Civic"
};

const TAG_CATEGORY_PRIORITY = [
  ["arcane", "arcane"],
  ["military", "military"],
  ["security", "military"],
  ["frontier", "frontier"],
  ["industry", "industry"],
  ["trade", "trade"],
  ["agriculture", "agriculture"],
  ["harbor", "harbor"],
  ["culture", "culture"],
  ["religious", "religious"],
  ["housing", "civic"],
  ["civic", "civic"]
];

function sumWeightedCitizens(state, weights) {
  return roundTo(
    Object.entries(weights).reduce((sum, [citizenClass, weight]) => {
      return sum + (Number(state.citizens?.[citizenClass] ?? 0) || 0) * weight;
    }, 0),
    2
  );
}

function hasWorkforceManagedOutput(building) {
  const hasResourceFlow = Object.values(building.resourceRates ?? {}).some((value) => Number(value ?? 0) !== 0);
  const hasProductiveStats = Object.entries(building.stats ?? {}).some(([key, value]) => {
    const normalizedKey = key === "value" ? "goods" : key;
    return PRODUCTIVE_STAT_KEYS.has(normalizedKey) && Number(value ?? 0) > 0;
  });
  return hasResourceFlow || hasProductiveStats;
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0) || 0));
}

function getDemandMultiplier(ratio, floor) {
  return roundTo(floor + (1 - floor) * clampRatio(ratio), 4);
}

function isDemandCovered(ratio) {
  return (Number(ratio ?? 0) || 0) >= 0.9999;
}

export function isWorkforceManagedBuilding(building) {
  return Boolean(building?.isComplete && !building?.isRuined && hasWorkforceManagedOutput(building));
}

export function getBuildingWorkforceDemand(building) {
  const rank = RARITY_RANKS[building?.rarity] ?? 1;
  return WORKFORCE_DEMAND_BY_RANK[rank] ?? WORKFORCE_DEMAND_BY_RANK[1];
}

export function getBuildingWorkforceCategory(building) {
  const tags = new Set(building?.tags ?? []);
  for (const [tag, category] of TAG_CATEGORY_PRIORITY) {
    if (tags.has(tag)) {
      return category;
    }
  }
  return DISTRICT_CATEGORY_MAP[building?.district] ?? "civic";
}

export function getWorkforceCategoryLabel(category) {
  return WORKFORCE_CATEGORY_LABELS[category] ?? "Civic";
}

export function getWorkforceSummary(state) {
  const specialistDemand = {};
  let generalDemand = 0;

  for (const building of state.buildings ?? []) {
    if (!isWorkforceManagedBuilding(building)) {
      continue;
    }

    const demand = getBuildingWorkforceDemand(building);
    const category = getBuildingWorkforceCategory(building);
    generalDemand += demand;
    specialistDemand[category] = (specialistDemand[category] ?? 0) + demand * SPECIALIST_DEMAND_SHARE;
  }

  const generalSupply = sumWeightedCitizens(state, GENERAL_WORKFORCE_WEIGHTS);
  const generalRatio = generalDemand > 0 ? generalSupply / generalDemand : 1;
  const specialistRatios = {};
  const specialistMultipliers = {};
  const specialistSupply = {};

  for (const [category, weights] of Object.entries(SPECIALIST_WORKFORCE_WEIGHTS)) {
    const supply = sumWeightedCitizens(state, weights);
    const demand = specialistDemand[category] ?? 0;
    const ratio = demand > 0 ? supply / demand : 1;
    specialistSupply[category] = supply;
    specialistRatios[category] = roundTo(clampRatio(ratio), 4);
    specialistMultipliers[category] = demand > 0 ? getDemandMultiplier(ratio, SPECIALIST_OUTPUT_FLOOR) : 1;
  }

  return {
    generalSupply,
    generalDemand: roundTo(generalDemand, 2),
    generalRatio: roundTo(clampRatio(generalRatio), 4),
    generalMultiplier: generalDemand > 0 ? getDemandMultiplier(generalRatio, GENERAL_OUTPUT_FLOOR) : 1,
    specialistDemand,
    specialistSupply,
    specialistRatios,
    specialistMultipliers
  };
}

export function getBuildingWorkforceMultiplier(building, workforceSummary) {
  if (!isWorkforceManagedBuilding(building)) {
    return 1;
  }

  const category = getBuildingWorkforceCategory(building);
  const generalRatio = workforceSummary?.generalRatio ?? 1;
  const specialistRatio = workforceSummary?.specialistRatios?.[category] ?? 1;
  if (!isDemandCovered(generalRatio) || !isDemandCovered(specialistRatio)) {
    return 0;
  }
  return 1;
}

export function getBuildingWorkforceStatus(building, workforceSummary) {
  if (!isWorkforceManagedBuilding(building)) {
    return {
      isManaged: false,
      category: null,
      categoryLabel: "Unstaffed",
      demand: 0,
      specialistDemand: 0,
      generalRatio: 1,
      generalMultiplier: 1,
      specialistRatio: 1,
      specialistMultiplier: 1,
      totalMultiplier: 1,
      note: "This structure is not currently affected by workforce demand."
    };
  }

  const category = getBuildingWorkforceCategory(building);
  const demand = getBuildingWorkforceDemand(building);
  const specialistDemand = roundTo(demand * SPECIALIST_DEMAND_SHARE, 2);
  const generalRatio = workforceSummary?.generalRatio ?? 1;
  const generalMultiplier = workforceSummary?.generalMultiplier ?? 1;
  const specialistRatio = workforceSummary?.specialistRatios?.[category] ?? 1;
  const specialistMultiplier = workforceSummary?.specialistMultipliers?.[category] ?? 1;
  const totalMultiplier = getBuildingWorkforceMultiplier(building, workforceSummary);
  const pressure = [];

  if (generalMultiplier < 0.999) {
    pressure.push("general labor");
  }
  if (specialistMultiplier < 0.999) {
    pressure.push(`${getWorkforceCategoryLabel(category).toLowerCase()} specialists`);
  }

  return {
    isManaged: true,
    category,
    categoryLabel: getWorkforceCategoryLabel(category),
    demand,
    specialistDemand,
    generalRatio,
    generalMultiplier,
    specialistRatio,
    specialistMultiplier,
    totalMultiplier,
    note: pressure.length
      ? `Offline: insufficient ${pressure.join(" and ")} to operate this structure.`
      : `${getWorkforceCategoryLabel(category)} staffing is fully supporting this structure.`
  };
}

export function getConstructionWorkforceSupportBpd(workforceSummary) {
  if (!workforceSummary) {
    return {
      generalSupportBpd: 0,
      specialistSupportBpdByCategory: {},
      overflowSupportBpd: 0,
      totalSupportBpd: 0
    };
  }

  const generalExcess = Math.max(0, Number(workforceSummary.generalSupply ?? 0) - Number(workforceSummary.generalDemand ?? 0));
  const specialistSupportBpdByCategory = {};
  let totalSpecialistExcess = 0;

  for (const category of Object.keys(SPECIALIST_WORKFORCE_WEIGHTS)) {
    const specialistExcess = Math.max(
      0,
      Number(workforceSummary.specialistSupply?.[category] ?? 0) - Number(workforceSummary.specialistDemand?.[category] ?? 0)
    );
    totalSpecialistExcess += specialistExcess;
    specialistSupportBpdByCategory[category] = Math.floor(specialistExcess / 4) * CONSTRUCTION_WORKFORCE_SUPPORT_MULTIPLIER;
  }

  const generalSupportBpd = Math.floor(generalExcess / 8) * CONSTRUCTION_WORKFORCE_SUPPORT_MULTIPLIER;
  const overflowSupportBpd = Math.floor(Math.sqrt(generalExcess + totalSpecialistExcess) / 2) * CONSTRUCTION_WORKFORCE_SUPPORT_MULTIPLIER;
  const specialistSupportBpd = Object.values(specialistSupportBpdByCategory).reduce((sum, value) => sum + value, 0);

  return {
    generalSupportBpd,
    specialistSupportBpdByCategory,
    overflowSupportBpd,
    totalSupportBpd: Math.max(0, generalSupportBpd + specialistSupportBpd + overflowSupportBpd)
  };
}

export function applyBuildingWorkforceToResource(value, multiplier) {
  const numericValue = Number(value ?? 0) || 0;
  if (!numericValue) {
    return 0;
  }
  return numericValue * multiplier;
}

export function applyBuildingWorkforceToStat(key, value, multiplier) {
  const normalizedKey = key === "value" ? "goods" : key;
  const numericValue = Number(value ?? 0) || 0;

  if (!numericValue || normalizedKey === "upkeep" || normalizedKey === "populationSupport") {
    return numericValue;
  }

  return numericValue > 0 ? numericValue * multiplier : numericValue;
}