// Expedition and notable-citizen system.
// This module owns mission launch/return logic, vehicle limits, unique-citizen
// generation, and the calendar-facing summaries that make departures and
// expected returns visible in Chronicle.
import {
  EXPEDITION_APPROACHES,
  EXPEDITION_DURATION_OPTIONS,
  EXPEDITION_MISSION_TEMPLATES,
  EXPEDITION_ORDER,
  EXPEDITION_TYPES
} from "../content/ExpeditionConfig.js";
import { CITIZEN_RARITY_OUTPUT_MULTIPLIERS } from "../content/CitizenConfig.js";
import { UNIQUE_CITIZEN_ARCHETYPES, drawUniqueCitizenFullName } from "../content/UniqueCitizenConfig.js";
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER, createDefaultVehicleFleet } from "../content/VehicleConfig.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { clamp, createId, roundTo } from "../engine/Utils.js";
import { addCrystals } from "./CrystalSystem.js";
import {
  addCitizenRarityBundle,
  addCitizensByRarity,
  takeCitizensFromRoster
} from "./CitizenSystem.js";
import { formatDate } from "./CalendarSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { addShards } from "./ShardSystem.js";

const RESOURCE_KEYS = ["food", "gold", "materials", "mana"];
const EXPEDITION_RESOURCE_REWARD_KEYS = ["gold", "food", "materials", "salvage", "mana", "prosperity"];
const DEFAULT_UNIQUE_THRESHOLD = 120;
const MAX_RECENT_RETURNS = 10;
const EXPEDITION_BOARD_REFRESH_DAYS = 7;
const LEGACY_VEHICLE_ID_MAP = {
  caravanWagon: "siegeBuggy",
  surveyWalker: "trailBuggy",
  cloudskiff: "elementalSkiff",
  skybarge: "grandElementalAirship"
};

const MISSION_RISK_SETTINGS = {
  Low: { difficulty: 0.88, reward: 0.92, unique: 0.45, label: "Low Risk" },
  Medium: { difficulty: 1, reward: 1, unique: 1, label: "Medium Risk" },
  High: { difficulty: 1.18, reward: 1.15, unique: 1.18, label: "High Risk" }
};

const MISSION_DISTANCE_SETTINGS = {
  Near: { difficulty: 0.92, label: "Near" },
  Mid: { difficulty: 1, label: "Mid" },
  Far: { difficulty: 1.12, label: "Far" }
};

const TYPE_RESOURCE_PALETTES = {
  rescue: { food: 1.05, gold: 0.3, materials: 0.25, mana: 0.15, prosperity: 0.2 },
  recruit: { gold: 0.75, food: 0.35, materials: 0.3, prosperity: 0.35 },
  resourceRun: { food: 0.95, materials: 1.05, salvage: 0.8, gold: 0.2 },
  crystalHunt: { mana: 1.15, salvage: 0.55, materials: 0.25, gold: 0.15 },
  relicRecovery: { salvage: 0.95, materials: 0.6, mana: 0.55, gold: 0.3 },
  diplomatic: { gold: 1.15, prosperity: 0.75, food: 0.2, materials: 0.1 },
  monsterHunt: { food: 0.8, salvage: 0.75, materials: 0.5, gold: 0.2 },
  pilgrimage: { mana: 0.95, prosperity: 0.55, gold: 0.3, food: 0.2 }
};

const UNIQUE_STATUS_LABELS = {
  inCity: "In City"
};

function createEmptyResourceRecord() {
  return { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 };
}

function createEmptyCrystalRecord() {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0]));
}

function createEmptyTeamRecord() {
  return {};
}

function normalizeVehicleId(vehicleId) {
  const candidate = LEGACY_VEHICLE_ID_MAP[vehicleId] ?? vehicleId;
  return VEHICLE_DEFINITIONS[candidate] ? candidate : VEHICLE_ORDER[0];
}

function createExpeditionRecentRecord(partial = {}) {
  const vehicleId = normalizeVehicleId(partial.vehicleId ?? VEHICLE_ORDER[0]);
  return {
    id: partial.id ?? createId("expedition-return"),
    typeId: partial.typeId ?? "resourceRun",
    typeLabel: partial.typeLabel ?? "Expedition",
    missionId: partial.missionId ?? null,
    missionName: partial.missionName ?? partial.typeLabel ?? "Expedition",
    vehicleId,
    vehicleName: partial.vehicleName ?? VEHICLE_DEFINITIONS[vehicleId]?.name ?? "Vehicle",
    returnDayOffset: Number(partial.returnDayOffset ?? 0) || 0,
    returnDateLabel: partial.returnDateLabel ?? formatDate(Number(partial.returnDayOffset ?? 0) || 0),
    outcomeLabel: partial.outcomeLabel ?? "Returned",
    summary: partial.summary ?? "The expedition returned.",
    narrative: partial.narrative ?? partial.summary ?? "The expedition returned.",
    detailLines: Array.isArray(partial.detailLines) ? [...partial.detailLines] : [],
    rewards: {
      resources: { ...createEmptyResourceRecord(), ...(partial.rewards?.resources ?? {}) },
      crystals: { ...createEmptyCrystalRecord(), ...(partial.rewards?.crystals ?? {}) },
      shards: { ...createEmptyCrystalRecord(), ...(partial.rewards?.shards ?? {}) },
      recruits: structuredClone(partial.rewards?.recruits ?? {}),
      uniqueCitizen: partial.rewards?.uniqueCitizen ?? null
    }
  };
}

export function createDefaultExpeditionState() {
  return {
    board: [],
    active: [],
    recent: [],
    lastRefreshDayOffset: null,
    uniqueProgress: 0,
    nextUniqueThreshold: DEFAULT_UNIQUE_THRESHOLD
  };
}

function normalizeMissionCard(card) {
  const type = EXPEDITION_TYPES[card?.typeId] ?? EXPEDITION_TYPES.resourceRun;
  const risk = MISSION_RISK_SETTINGS[card?.risk] ? card.risk : "Medium";
  const distance = MISSION_DISTANCE_SETTINGS[card?.distance] ? card.distance : "Mid";
  const suggestedDurationDays = EXPEDITION_DURATION_OPTIONS.includes(Number(card?.suggestedDurationDays))
    ? Number(card.suggestedDurationDays)
    : 7;
  return {
    id: String(card?.id ?? createId("mission")),
    templateId: String(card?.templateId ?? card?.id ?? "mission"),
    typeId: type.id,
    typeLabel: type.label,
    typeEmoji: type.emoji,
    name: String(card?.name ?? type.label).trim() || type.label,
    summary: String(card?.summary ?? type.summary).trim() || type.summary,
    risk,
    distance,
    suggestedDurationDays,
    likelyRewards: Array.isArray(card?.likelyRewards) ? [...card.likelyRewards] : [],
    recommendedVehicleTags: Array.isArray(card?.recommendedVehicleTags) ? [...card.recommendedVehicleTags] : [],
    buildingTags: Array.isArray(card?.buildingTags) ? [...card.buildingTags] : [],
    terrainTags: Array.isArray(card?.terrainTags) ? [...card.terrainTags] : [],
    isSpecial: card?.isSpecial === true,
    expiresDayOffset: Number(card?.expiresDayOffset ?? 0) || 0
  };
}

export function normalizeVehicleFleet(sourceFleet) {
  const baseFleet = createDefaultVehicleFleet();
  const migratedFleet = { ...baseFleet };
  for (const [rawVehicleId, amount] of Object.entries(sourceFleet ?? {})) {
    const vehicleId = normalizeVehicleId(rawVehicleId);
    migratedFleet[vehicleId] = (migratedFleet[vehicleId] ?? 0) + (Math.max(0, Number(amount) || 0));
  }
  return Object.fromEntries(
    VEHICLE_ORDER.map((vehicleId) => [
      vehicleId,
      Math.max(0, Number(migratedFleet?.[vehicleId] ?? baseFleet[vehicleId] ?? 0) || 0)
    ])
  );
}

export function normalizeUniqueCitizens(sourceCitizens) {
  if (!Array.isArray(sourceCitizens)) {
    return [];
  }

  return sourceCitizens
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id: String(entry.id ?? createId("unique-citizen")),
      fullName: String(entry.fullName ?? "Unknown Notable").trim() || "Unknown Notable",
      title: String(entry.title ?? "Unique Citizen").trim() || "Unique Citizen",
      className: String(entry.className ?? "Citizens").trim() || "Citizens",
      effectText: String(entry.effectText ?? "Their presence changes the Drift.").trim() || "Their presence changes the Drift.",
      bonuses: structuredClone(entry.bonuses ?? {}),
      expeditionTags: Array.isArray(entry.expeditionTags) ? [...entry.expeditionTags] : [],
      joinedDayOffset: Number(entry.joinedDayOffset ?? 0) || 0,
      joinedAt: String(entry.joinedAt ?? formatDate(Number(entry.joinedDayOffset ?? 0) || 0)),
      status: UNIQUE_STATUS_LABELS[entry.status] ? entry.status : "inCity",
      sourceTypeId: entry.sourceTypeId ?? null
    }));
}

export function normalizeExpeditionState(sourceState) {
  const base = createDefaultExpeditionState();
  return {
    board: Array.isArray(sourceState?.board) ? sourceState.board.map((entry) => normalizeMissionCard(entry)) : base.board,
    active: Array.isArray(sourceState?.active)
      ? sourceState.active
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => {
            const vehicleId = normalizeVehicleId(entry.vehicleId ?? VEHICLE_ORDER[0]);
            return {
            id: String(entry.id ?? createId("expedition")),
            typeId: entry.typeId ?? "resourceRun",
            typeLabel: entry.typeLabel ?? EXPEDITION_TYPES[entry.typeId]?.label ?? "Expedition",
            missionId: entry.missionId ?? null,
            missionName: entry.missionName ?? entry.typeLabel ?? EXPEDITION_TYPES[entry.typeId]?.label ?? "Expedition",
            missionSummary: entry.missionSummary ?? "",
            missionRisk: MISSION_RISK_SETTINGS[entry.missionRisk] ? entry.missionRisk : "Medium",
            missionDistance: MISSION_DISTANCE_SETTINGS[entry.missionDistance] ? entry.missionDistance : "Mid",
            missionIsSpecial: entry.missionIsSpecial === true,
            vehicleId,
            vehicleName: VEHICLE_DEFINITIONS[vehicleId]?.name ?? entry.vehicleName ?? "Vehicle",
            approachId: entry.approachId ?? "balanced",
            durationDaysBase: Math.max(1, Number(entry.durationDaysBase ?? entry.durationDays ?? 7) || 7),
            durationDays: Math.max(1, Number(entry.durationDays ?? 7) || 7),
            departedDayOffset: Number(entry.departedDayOffset ?? 0) || 0,
            departedAt: String(entry.departedAt ?? formatDate(Number(entry.departedDayOffset ?? 0) || 0)),
            expectedReturnDayOffset: Number(entry.expectedReturnDayOffset ?? 0) || 0,
            expectedReturnAt: String(entry.expectedReturnAt ?? formatDate(Number(entry.expectedReturnDayOffset ?? 0) || 0)),
            committedResources: Object.fromEntries(
              RESOURCE_KEYS.map((resource) => [resource, Math.max(0, Number(entry.committedResources?.[resource] ?? 0) || 0)])
            ),
            team: structuredClone(entry.team ?? {}),
            powerScore: Number(entry.powerScore ?? 0) || 0,
            difficultyScore: Number(entry.difficultyScore ?? 0) || 0,
            successScore: Number(entry.successScore ?? 0) || 0,
            buildingSynergySummary: Array.isArray(entry.buildingSynergySummary) ? [...entry.buildingSynergySummary] : [],
            delayCount: Math.max(0, Number(entry.delayCount ?? 0) || 0),
            notes: String(entry.notes ?? "")
          };
          })
      : base.active,
    recent: Array.isArray(sourceState?.recent)
      ? sourceState.recent.map((entry) => createExpeditionRecentRecord(entry)).slice(0, MAX_RECENT_RETURNS)
      : base.recent,
    lastRefreshDayOffset:
      sourceState?.lastRefreshDayOffset === null || sourceState?.lastRefreshDayOffset === undefined
        ? base.lastRefreshDayOffset
        : Number(sourceState.lastRefreshDayOffset) || 0,
    uniqueProgress: Math.max(0, Number(sourceState?.uniqueProgress ?? base.uniqueProgress) || 0),
    nextUniqueThreshold: Math.max(60, Number(sourceState?.nextUniqueThreshold ?? base.nextUniqueThreshold) || DEFAULT_UNIQUE_THRESHOLD)
  };
}

function getMissionApproach(approachId) {
  return EXPEDITION_APPROACHES[approachId] ?? EXPEDITION_APPROACHES.balanced;
}

function getExpeditionType(typeId) {
  return EXPEDITION_TYPES[typeId] ?? EXPEDITION_TYPES.resourceRun;
}

function getVehicleDefinition(vehicleId) {
  return VEHICLE_DEFINITIONS[normalizeVehicleId(vehicleId)] ?? VEHICLE_DEFINITIONS[VEHICLE_ORDER[0]];
}

function getMissionRiskSettings(risk) {
  return MISSION_RISK_SETTINGS[risk] ?? MISSION_RISK_SETTINGS.Medium;
}

function getMissionDistanceSettings(distance) {
  return MISSION_DISTANCE_SETTINGS[distance] ?? MISSION_DISTANCE_SETTINGS.Mid;
}

function randomIntInclusive(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function drawMissionTemplates(isSpecial, count, excludedTemplateIds = new Set()) {
  const pool = EXPEDITION_MISSION_TEMPLATES.filter((template) => Boolean(template.isSpecial) === Boolean(isSpecial) && !excludedTemplateIds.has(template.id));
  const picks = [];
  const remaining = [...pool];
  while (remaining.length && picks.length < count) {
    const index = Math.floor(Math.random() * remaining.length);
    picks.push(remaining.splice(index, 1)[0]);
  }
  return picks;
}

function createMissionCardFromTemplate(state, template) {
  const type = getExpeditionType(template.typeId);
  const expiresInDays = randomIntInclusive(7, 14);
  return normalizeMissionCard({
    id: createId("mission"),
    templateId: template.id,
    typeId: type.id,
    name: template.name,
    summary: template.summary,
    risk: template.risk,
    distance: template.distance,
    suggestedDurationDays: template.suggestedDurationDays,
    likelyRewards: template.likelyRewards,
    recommendedVehicleTags: template.recommendedVehicleTags,
    buildingTags: template.buildingTags,
    terrainTags: template.terrainTags,
    isSpecial: template.isSpecial === true,
    expiresDayOffset: state.calendar.dayOffset + expiresInDays
  });
}

export function refreshExpeditionBoardIfNeeded(state, { force = false } = {}) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const currentDay = Number(state.calendar?.dayOffset ?? 0) || 0;
  const board = (state.expeditions.board ?? []).filter((mission) => mission.expiresDayOffset >= currentDay);
  const shouldRefresh =
    force ||
    state.expeditions.lastRefreshDayOffset === null ||
    currentDay - Number(state.expeditions.lastRefreshDayOffset ?? currentDay) >= EXPEDITION_BOARD_REFRESH_DAYS;

  if (!shouldRefresh) {
    state.expeditions.board = board;
    return state.expeditions.board;
  }

  const normalCount = 4 + randomIntInclusive(1, 3);
  const specialCount = randomIntInclusive(0, 2);
  const excludedTemplateIds = new Set();
  const nextBoard = [];

  for (const template of drawMissionTemplates(false, normalCount, excludedTemplateIds)) {
    excludedTemplateIds.add(template.id);
    nextBoard.push(createMissionCardFromTemplate(state, template));
  }

  for (const template of drawMissionTemplates(true, specialCount, excludedTemplateIds)) {
    excludedTemplateIds.add(template.id);
    nextBoard.push(createMissionCardFromTemplate(state, template));
  }

  state.expeditions.board = nextBoard;
  state.expeditions.lastRefreshDayOffset = currentDay;
  return nextBoard;
}

function findMissionCard(state, missionId, fallbackTypeId = EXPEDITION_ORDER[0]) {
  const board = state.expeditions?.board ?? [];
  if (missionId) {
    const match = board.find((mission) => mission.id === missionId);
    if (match) {
      return match;
    }
  }
  return board[0] ?? normalizeMissionCard({ typeId: fallbackTypeId });
}

function getBundleCount(bundle) {
  return Object.values(bundle ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function getTeamCount(team) {
  return Object.values(team ?? {}).reduce((sum, bundle) => sum + getBundleCount(bundle), 0);
}

function getWeightedRandomChoice(weightMap) {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  if (!entries.length) {
    return null;
  }
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  let cursor = Math.random() * total;
  for (const [key, weight] of entries) {
    cursor -= Number(weight);
    if (cursor <= 0) {
      return key;
    }
  }
  return entries[entries.length - 1][0];
}

function getReservedUniqueCitizenCounts(state) {
  const reserved = {};
  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    reserved[uniqueCitizen.className] = (reserved[uniqueCitizen.className] ?? 0) + 1;
  }
  return reserved;
}

export function getAvailableExpeditionCitizenCount(state, citizenClass) {
  const reserved = getReservedUniqueCitizenCounts(state);
  return Math.max(0, Number(state.citizens?.[citizenClass] ?? 0) - Number(reserved[citizenClass] ?? 0));
}

export function getVehicleAssignments(state) {
  const assignments = Object.fromEntries(VEHICLE_ORDER.map((vehicleId) => [vehicleId, 0]));
  for (const expedition of state.expeditions?.active ?? []) {
    if (assignments[expedition.vehicleId] === undefined) {
      assignments[expedition.vehicleId] = 0;
    }
    assignments[expedition.vehicleId] += 1;
  }
  return assignments;
}

export function getAvailableVehicleCounts(state) {
  const vehicles = normalizeVehicleFleet(state.vehicles);
  const assignments = getVehicleAssignments(state);
  return Object.fromEntries(
    VEHICLE_ORDER.map((vehicleId) => [vehicleId, Math.max(0, vehicles[vehicleId] - (assignments[vehicleId] ?? 0))])
  );
}

export function getExpeditionCalendarEntries(state) {
  return (state.expeditions?.active ?? []).map((expedition) => ({
    id: `${expedition.id}-return`,
    dayOffset: expedition.expectedReturnDayOffset,
    name: `Expected Return: ${expedition.missionName ?? expedition.typeLabel}`,
    type: "Expedition",
    description: `${expedition.missionName ?? expedition.typeLabel} is expected to return aboard the ${expedition.vehicleName}.`
  }));
}

export function getUniqueCitizenResourceBonuses(state) {
  const total = createEmptyResourceRecord();
  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    for (const key of EXPEDITION_RESOURCE_REWARD_KEYS) {
      total[key] += Number(uniqueCitizen.bonuses?.resources?.[key] ?? 0) || 0;
    }
  }
  return total;
}

export function getUniqueCitizenStatBonuses(state) {
  return (state.uniqueCitizens ?? []).reduce(
    (record, uniqueCitizen) => {
      if (uniqueCitizen.status !== "inCity") {
        return record;
      }
      for (const [key, amount] of Object.entries(uniqueCitizen.bonuses?.stats ?? {})) {
        record[key] = (record[key] ?? 0) + (Number(amount) || 0);
      }
      return record;
    },
    { prosperity: 0, defense: 0, security: 0, prestige: 0, morale: 0, health: 0 }
  );
}

function getUniqueCitizenExpeditionPowerPercent(state, expeditionTypeId) {
  let percent = 0;
  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    const tags = uniqueCitizen.expeditionTags ?? [];
    if (Array.isArray(tags) && tags.length && !tags.includes(expeditionTypeId)) {
      continue;
    }
    percent += Number(uniqueCitizen.bonuses?.expeditionPowerPercent ?? 0) || 0;
  }
  return percent;
}

function getEffectiveDurationDays(durationDays, vehicle) {
  return Math.max(1, Math.ceil(durationDays * (Number(vehicle?.timeMultiplier ?? 1) || 1)));
}

function createExpeditionResourceCommitment(input) {
  return Object.fromEntries(
    RESOURCE_KEYS.map((resource) => [resource, Math.max(0, Number(input?.[resource] ?? 0) || 0)])
  );
}

function createTeamRequest(input) {
  return Object.fromEntries(
    Object.entries(input ?? {})
      .map(([citizenClass, amount]) => [citizenClass, Math.max(0, Math.floor(Number(amount) || 0))])
      .filter(([, amount]) => amount > 0)
  );
}

function getBuildingIdentitySet(building) {
  return new Set([building?.name, building?.displayName, building?.key].filter(Boolean));
}

function getExpeditionBuildingSynergy(state, mission, vehicle) {
  const summary = [];
  const bonuses = {
    powerPercent: 0,
    rewardPercent: 0,
    uniquePercent: 0,
    safetyPercent: 0
  };

  for (const building of state.buildings ?? []) {
    if (!building?.isComplete || building?.isRuined) {
      continue;
    }
    const ids = getBuildingIdentitySet(building);
    const matches = (name) => ids.has(name);

    if (matches("Skyharbor") && vehicle.type === "air") {
      bonuses.powerPercent += 10;
      bonuses.rewardPercent += 10;
      summary.push("Skyharbor supports air missions.");
    }
    if (matches("Airship Dockyard") && vehicle.type === "air") {
      bonuses.powerPercent += 15;
      summary.push("Airship Dockyard streamlines air deployment.");
    }
    if (matches("Trade Post") && mission.typeId === "diplomatic") {
      bonuses.powerPercent += 6;
      bonuses.rewardPercent += 20;
      summary.push("Trade Post strengthens diplomatic returns.");
    }
    if (matches("Market Square") && ["diplomatic", "recruit"].includes(mission.typeId)) {
      bonuses.rewardPercent += 10;
      summary.push("Market Square attracts better trade and recruits.");
    }
    if (matches("Beast Pens") && mission.typeId === "monsterHunt") {
      bonuses.powerPercent += 8;
      bonuses.rewardPercent += 20;
      summary.push("Beast Pens improve monster capture logistics.");
    }
    if (matches("Town Guard Post") && ["rescue", "monsterHunt"].includes(mission.typeId)) {
      bonuses.powerPercent += 5;
      bonuses.safetyPercent += 8;
      summary.push("Town Guard Post supports risky field operations.");
    }
    if (matches("Barracks") && ["recruit", "monsterHunt"].includes(mission.typeId)) {
      bonuses.powerPercent += 10;
      summary.push("Barracks harden expedition crews.");
    }
    if (matches("Hospital")) {
      bonuses.safetyPercent += 12;
      summary.push("Hospital reduces expedition strain.");
    }
    if (matches("Raestorum Center")) {
      bonuses.safetyPercent += 20;
      if (["rescue", "pilgrimage"].includes(mission.typeId)) {
        bonuses.powerPercent += 6;
      }
      summary.push("Raestorum Center improves recovery and survival.");
    }
    if (matches("Oracle") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 6;
      bonuses.uniquePercent += 12;
      summary.push("Oracle sharpens foresight for arcane journeys.");
    }
    if (matches("Relic Sanctum") && mission.typeId === "relicRecovery") {
      bonuses.rewardPercent += 15;
      bonuses.uniquePercent += 8;
      summary.push("Relic Sanctum resonates with relic expeditions.");
    }
    if (matches("Arcana Tower") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 8;
      bonuses.rewardPercent += 20;
      summary.push("Arcana Tower amplifies arcane expeditions.");
    }
    if (matches("Library") && ["relicRecovery", "diplomatic"].includes(mission.typeId)) {
      bonuses.powerPercent += 8;
      summary.push("Library knowledge clarifies mission planning.");
    }
    if (matches("School of Driftum") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 12;
      summary.push("School of Driftum boosts magical fieldcraft.");
    }
    if (matches("Workshop Quarter") && vehicle.type === "land") {
      bonuses.powerPercent += 6;
      bonuses.rewardPercent += 10;
      summary.push("Workshop Quarter supports long overland supply runs.");
    }
    if (matches("Caravan Outpost") && vehicle.type === "land") {
      bonuses.powerPercent += 5;
      bonuses.rewardPercent += 10;
      summary.push("Caravan Outpost helps land buggies travel better.");
    }
    if (matches("Lighthouse") && ["resourceRun", "diplomatic"].includes(mission.typeId)) {
      bonuses.safetyPercent += 8;
      summary.push("Lighthouse improves route confidence.");
    }
  }

  return {
    ...bonuses,
    summary: [...new Set(summary)]
  };
}

function computeExpeditionPowerScore(state, expeditionType, mission, approach, vehicle, team, committedResources, durationDays, buildingSynergy) {
  const teamPower = Object.entries(team).reduce((sum, [citizenClass, bundle]) => {
    const classWeight = Number(expeditionType.favoredClasses?.[citizenClass] ?? 1) || 1;
    const bundlePower = Object.entries(bundle).reduce(
      (raritySum, [rarity, count]) => raritySum + (Number(count) || 0) * (CITIZEN_RARITY_OUTPUT_MULTIPLIERS[rarity] ?? 1),
      0
    );
    return sum + bundlePower * classWeight;
  }, 0);

  const supplyScore =
    committedResources.food * 0.06 +
    committedResources.gold * 0.05 +
    committedResources.materials * 0.04 +
    committedResources.mana * 0.08;
  const durationFactor = 1 + durationDays / 14;
  const uniqueBonus = 1 + getUniqueCitizenExpeditionPowerPercent(state, expeditionType.id) / 100;
  const missionRisk = getMissionRiskSettings(mission?.risk);
  const favoredVehicleBonus = (vehicle.favoredMissionTags ?? []).includes(expeditionType.id) ? 0.08 : 0;
  const scoutingBonus = (Number(vehicle.scouting ?? 1) - 1) * 0.55;
  const stealthBonus = (Number(vehicle.stealth ?? 1) - 1) * 0.2;
  const cargoBonus = (Number(vehicle.cargoMultiplier ?? 1) - 1) * 0.45;
  const safetyBonus = (Number(vehicle.safety ?? 1) - 1) * 0.3;
  const vehicleFactor = 1 + favoredVehicleBonus + scoutingBonus + stealthBonus + cargoBonus + safetyBonus;
  const synergyFactor = 1 + (Number(buildingSynergy?.powerPercent ?? 0) || 0) / 100;
  const rewardFactor = 1 + (Number(missionRisk.reward ?? 1) - 1);

  return roundTo(
    (teamPower + supplyScore) *
      durationFactor *
      (Number(approach.rewardModifier ?? 1) || 1) *
      uniqueBonus *
      vehicleFactor *
      synergyFactor *
      rewardFactor,
    2
  );
}

function computeExpeditionDifficultyScore(expeditionType, mission, approach, vehicle, durationDays, buildingSynergy) {
  const baseDifficulty = 5 + durationDays * 1.2;
  const missionPressure = 1 + Number(expeditionType.uniqueWeight ?? 1) * 0.18;
  const missionRisk = getMissionRiskSettings(mission?.risk);
  const distancePressure = getMissionDistanceSettings(mission?.distance);
  const vehicleMitigation =
    1 -
    clamp(
      ((Number(vehicle.safety ?? 1) - 1) * 0.22 + (Number(vehicle.scouting ?? 1) - 1) * 0.18) +
        (Number(buildingSynergy?.safetyPercent ?? 0) || 0) / 100,
      0,
      0.3
    );
  return roundTo(
    baseDifficulty *
      missionPressure *
      missionRisk.difficulty *
      distancePressure.difficulty *
      (Number(approach.riskModifier ?? 1) || 1) *
      vehicleMitigation,
    2
  );
}

function rollOutcomeLabel(successScore) {
  if (successScore >= 1.35) {
    return "Strong Return";
  }
  if (successScore >= 1.05) {
    return "Steady Return";
  }
  if (successScore >= 0.8) {
    return "Hard Return";
  }
  return "Thin Return";
}

function buildRecruitRewards(expeditionType, rewardScore) {
  const totalRecruits = Math.max(0, Math.min(18, Math.round(rewardScore * (0.8 + Math.random() * 0.45))));
  const recruits = {};
  if (totalRecruits <= 0) {
    return recruits;
  }

  const rareChance = clamp(0.12 + rewardScore * 0.015, 0.12, 0.42);
  const epicChance = clamp(0.025 + rewardScore * 0.006, 0.02, 0.16);

  for (let index = 0; index < totalRecruits; index += 1) {
    const citizenClass = getWeightedRandomChoice(expeditionType.recruitWeights) ?? "Laborers";
    const rarityRoll = Math.random();
    const rarity = rarityRoll <= epicChance ? "Epic" : rarityRoll <= epicChance + rareChance ? "Rare" : "Common";
    recruits[citizenClass] = recruits[citizenClass] ?? { Common: 0, Rare: 0, Epic: 0 };
    recruits[citizenClass][rarity] += 1;
  }

  return recruits;
}

function buildResourceRewards(expeditionType, rewardScore) {
  const palette = TYPE_RESOURCE_PALETTES[expeditionType.id] ?? TYPE_RESOURCE_PALETTES.resourceRun;
  const rewards = createEmptyResourceRecord();
  const scale = rewardScore * (0.75 + Math.random() * 0.4);
  for (const [resource, weight] of Object.entries(palette)) {
    const baseAmount = scale * Number(weight);
    rewards[resource] = Math.max(0, Math.round(baseAmount * 4));
  }
  return rewards;
}

function buildCrystalRewards(expeditionType, rewardScore) {
  const crystals = createEmptyCrystalRecord();
  const shards = createEmptyCrystalRecord();
  const crystalBias = Number(expeditionType.rewardFocus?.crystals ?? 0) || 0;
  if (crystalBias <= 0) {
    return { crystals, shards };
  }

  const shardScale = rewardScore * crystalBias * (12 + Math.random() * 8);
  shards.Common += Math.round(shardScale * 0.65);
  shards.Uncommon += Math.round(shardScale * 0.24);
  if (rewardScore >= 8) {
    shards.Rare += Math.round(shardScale * 0.08);
  }
  if (rewardScore >= 13) {
    shards.Epic += Math.round(shardScale * 0.03);
  }

  const crystalRoll = rewardScore * crystalBias * (0.16 + Math.random() * 0.12);
  if (crystalRoll >= 3.8) {
    crystals.Epic += 1;
  } else if (crystalRoll >= 2.2) {
    crystals.Rare += 1;
  } else if (crystalRoll >= 1.15) {
    crystals.Uncommon += 1;
  } else if (crystalRoll >= 0.55) {
    crystals.Common += 1;
  }

  return { crystals, shards };
}

function summarizeRecruitRewards(recruits) {
  const segments = [];
  for (const [citizenClass, bundle] of Object.entries(recruits ?? {})) {
    for (const [rarity, amount] of Object.entries(bundle ?? {})) {
      if ((Number(amount) || 0) <= 0) {
        continue;
      }
      segments.push(`${amount} ${rarity} ${citizenClass}`);
    }
  }
  return segments.join(", ");
}

function summarizeResourceRewards(resources) {
  return EXPEDITION_RESOURCE_REWARD_KEYS
    .filter((key) => Number(resources?.[key] ?? 0) > 0)
    .map((key) => `${resources[key]} ${key}`)
    .join(", ");
}

function summarizeCrystalRewards(crystals, shards) {
  const parts = [];
  for (const rarity of RARITY_ORDER) {
    const crystalCount = Number(crystals?.[rarity] ?? 0) || 0;
    const shardCount = Number(shards?.[rarity] ?? 0) || 0;
    if (crystalCount > 0) {
      parts.push(`${crystalCount} ${rarity} crystal${crystalCount === 1 ? "" : "s"}`);
    }
    if (shardCount > 0) {
      parts.push(`${shardCount} ${rarity} shard${shardCount === 1 ? "" : "s"}`);
    }
  }
  return parts.join(", ");
}

function createUniqueCitizen(state, expeditionTypeId) {
  const availableArchetypes = UNIQUE_CITIZEN_ARCHETYPES.filter((entry) => entry.expeditionTags?.includes(expeditionTypeId));
  const archetypePool = availableArchetypes.length ? availableArchetypes : UNIQUE_CITIZEN_ARCHETYPES;
  const archetype = archetypePool[Math.floor(Math.random() * archetypePool.length)];
  const existingNames = new Set((state.uniqueCitizens ?? []).map((entry) => entry.fullName));
  let fullName = drawUniqueCitizenFullName(Math.random());
  let guard = 0;
  while (existingNames.has(fullName) && guard < 12) {
    fullName = drawUniqueCitizenFullName(Math.random());
    guard += 1;
  }

  const uniqueCitizen = {
    id: createId("unique-citizen"),
    fullName,
    title: archetype.title,
    className: archetype.className,
    effectText: archetype.effectText,
    bonuses: structuredClone(archetype.bonuses ?? {}),
    expeditionTags: [...(archetype.expeditionTags ?? [])],
    joinedDayOffset: state.calendar.dayOffset,
    joinedAt: formatDate(state.calendar.dayOffset),
    status: "inCity",
    sourceTypeId: expeditionTypeId
  };

  state.uniqueCitizens = [...(state.uniqueCitizens ?? []), uniqueCitizen];
  addCitizensByRarity(state, archetype.className, "Epic", 1, "Unique Citizen");
  return uniqueCitizen;
}

function grantRewardCollections(state, rewards) {
  for (const [resource, amount] of Object.entries(rewards.resources ?? {})) {
    state.resources[resource] = Math.max(0, Number(state.resources?.[resource] ?? 0) + (Number(amount) || 0));
  }
  for (const [rarity, amount] of Object.entries(rewards.crystals ?? {})) {
    if ((Number(amount) || 0) > 0) {
      addCrystals(state, rarity, amount);
    }
  }
  for (const [rarity, amount] of Object.entries(rewards.shards ?? {})) {
    if ((Number(amount) || 0) > 0) {
      addShards(state, rarity, amount);
    }
  }
  for (const [citizenClass, bundle] of Object.entries(rewards.recruits ?? {})) {
    addCitizenRarityBundle(state, citizenClass, bundle);
  }
}

function scaleRecruitBundles(recruits, multiplier) {
  for (const bundle of Object.values(recruits ?? {})) {
    for (const rarity of Object.keys(bundle ?? {})) {
      bundle[rarity] = Math.max(0, Math.round((Number(bundle[rarity]) || 0) * multiplier));
    }
  }
}

function applyExpeditionOutcomeModifiers(expedition, rewards) {
  const modifiers = [];

  if (expedition.successScore >= 1.25 && Math.random() < 0.35) {
    for (const key of Object.keys(rewards.resources ?? {})) {
      rewards.resources[key] = Math.max(0, Math.round((Number(rewards.resources[key]) || 0) * 1.2));
    }
    modifiers.push("Bonus Cache");
  }

  if (expedition.successScore < 0.8 && Math.random() < 0.3) {
    for (const key of Object.keys(rewards.resources ?? {})) {
      rewards.resources[key] = Math.max(0, Math.round((Number(rewards.resources[key]) || 0) * 0.8));
    }
    scaleRecruitBundles(rewards.recruits, 0.8);
    modifiers.push("Lost Supplies");
  }

  if (expedition.typeId === "monsterHunt" && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.resources.salvage = (Number(rewards.resources.salvage) || 0) + 6;
    modifiers.push("Captured Trophy");
  }

  if (expedition.typeId === "rescue" && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.recruits.Laborers = rewards.recruits.Laborers ?? { Common: 0, Rare: 0, Epic: 0 };
    rewards.recruits.Laborers.Common += randomIntInclusive(1, 3);
    modifiers.push("Unexpected Survivors");
  }

  if (["crystalHunt", "pilgrimage"].includes(expedition.typeId) && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.resources.mana = (Number(rewards.resources.mana) || 0) + 4;
    rewards.shards.Common = (Number(rewards.shards.Common) || 0) + 10;
    modifiers.push("Arcane Windfall");
  }

  return modifiers;
}

function buildExpeditionRewards(state, expedition) {
  const expeditionType = getExpeditionType(expedition.typeId);
  const missionRisk = getMissionRiskSettings(expedition.missionRisk);
  const qualityNoise = 0.88 + Math.random() * 0.3;
  const rewardSynergy = 1 + (Number(expedition.rewardPercent ?? 0) || 0) / 100;
  const rewardScore = Math.max(0.75, expedition.successScore * qualityNoise * 4 * missionRisk.reward * rewardSynergy);
  const citizenRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.citizens ?? 0) || 0);
  const resourceRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.resources ?? 0) || 0);
  const crystalRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.crystals ?? 0) || 0);
  const recruits = buildRecruitRewards(expeditionType, citizenRewardScore);
  const resources = buildResourceRewards(expeditionType, resourceRewardScore);
  const crystalRewards = buildCrystalRewards(expeditionType, crystalRewardScore);

  state.expeditions.uniqueProgress += Math.round(
    rewardScore *
      (Number(expeditionType.uniqueWeight ?? 1) || 1) *
      missionRisk.unique *
      (1 + (Number(expedition.uniquePercent ?? 0) || 0) / 100)
  );

  let uniqueCitizen = null;
  if (state.expeditions.uniqueProgress >= state.expeditions.nextUniqueThreshold && expedition.successScore >= 0.9) {
    uniqueCitizen = createUniqueCitizen(state, expedition.typeId);
    state.expeditions.uniqueProgress -= state.expeditions.nextUniqueThreshold;
    state.expeditions.nextUniqueThreshold = Math.round(state.expeditions.nextUniqueThreshold * 1.28 + 30);
  }

  const modifiers = applyExpeditionOutcomeModifiers(expedition, {
    resources,
    recruits,
    ...crystalRewards
  });

  return {
    resources,
    recruits,
    uniqueCitizen,
    modifiers,
    ...crystalRewards
  };
}

function shouldDelayExpedition(expedition) {
  if (expedition.delayCount >= 1) {
    return false;
  }
  if (expedition.successScore >= 0.82) {
    return false;
  }
  return Math.random() < clamp(0.18 + (0.82 - expedition.successScore) * 0.45, 0.18, 0.55);
}

function addTeamBackToCity(state, team) {
  for (const [citizenClass, bundle] of Object.entries(team ?? {})) {
    addCitizenRarityBundle(state, citizenClass, bundle);
  }
}

function resolveExpeditionReturn(state, expedition, returnDayOffset = state.calendar.dayOffset) {
  addTeamBackToCity(state, expedition.team);
  const rewards = buildExpeditionRewards(state, expedition);
  grantRewardCollections(state, rewards);
  const outcomeLabel = rollOutcomeLabel(expedition.successScore);
  const rewardSummaryParts = [
    summarizeRecruitRewards(rewards.recruits),
    summarizeResourceRewards(rewards.resources),
    summarizeCrystalRewards(rewards.crystals, rewards.shards),
    rewards.uniqueCitizen ? `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift.` : ""
  ].filter(Boolean);
  const narrative =
    outcomeLabel === "Strong Return"
      ? `${expedition.missionName ?? expedition.typeLabel} came back ahead of expectation with disciplined momentum and a fuller hold.`
      : outcomeLabel === "Steady Return"
        ? `${expedition.missionName ?? expedition.typeLabel} returned in good order with solid gains and no major collapse.`
        : outcomeLabel === "Hard Return"
          ? `${expedition.missionName ?? expedition.typeLabel} returned battered but useful, with enough recovered value to justify the risk.`
          : `${expedition.missionName ?? expedition.typeLabel} returned thin and strained, but the crew made it back alive.`;
  const summary =
    rewardSummaryParts.join(" | ") ||
    `${expedition.missionName ?? expedition.typeLabel} returned light, but the crew made it home intact.`;
  const detailLines = [
    `${outcomeLabel} on a ${String(expedition.missionRisk ?? "Medium").toLowerCase()}-risk route.`,
    ...((rewards.modifiers ?? []).map((modifier) => `Outcome modifier: ${modifier}`)),
    ...rewardSummaryParts,
    ...(expedition.buildingSynergySummary ?? []).slice(0, 2)
  ].filter(Boolean);

  addHistoryEntry(state, {
    category: "Expedition",
    title: `Return: ${expedition.missionName ?? expedition.typeLabel}`,
    details: `${narrative} ${summary}`
  });

  if (rewards.uniqueCitizen) {
    addHistoryEntry(state, {
      category: "Unique Citizen",
      title: rewards.uniqueCitizen.fullName,
      details: `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift. ${rewards.uniqueCitizen.effectText}`
    });
  }

  return createExpeditionRecentRecord({
    typeId: expedition.typeId,
    typeLabel: expedition.typeLabel,
    missionId: expedition.missionId,
    missionName: expedition.missionName,
    vehicleId: expedition.vehicleId,
    vehicleName: expedition.vehicleName,
    returnDayOffset,
    returnDateLabel: formatDate(returnDayOffset),
    outcomeLabel,
    summary,
    narrative,
    detailLines,
    rewards
  });
}

function buildPreviewInsights(preview) {
  const strengths = [];
  const risks = [];
  const mission = preview.mission;
  const expeditionType = preview.expeditionType;
  const teamRequest = preview.teamRequest ?? {};

  const favoredAssigned = Object.entries(expeditionType.favoredClasses ?? {})
    .filter(([citizenClass, weight]) => Number(weight) > 1 && (teamRequest[citizenClass] ?? 0) > 0)
    .map(([citizenClass]) => citizenClass);
  if (favoredAssigned.length) {
    strengths.push(`Favored crew assigned: ${favoredAssigned.slice(0, 3).join(", ")}.`);
  } else {
    risks.push("No favored crew is assigned yet.");
  }

  if (Number(preview.vehicle.timeMultiplier ?? 1) < 1) {
    strengths.push(
      `${preview.vehicle.name} trims travel time by ${Math.max(1, Math.round((1 - Number(preview.vehicle.timeMultiplier ?? 1)) * 100))}%.`
    );
  }
  if ((preview.vehicle.favoredMissionTags ?? []).includes(mission.typeId)) {
    strengths.push(`${preview.vehicle.name} is well suited to this mission.`);
  }
  if ((preview.buildingSynergy.summary ?? []).length) {
    strengths.push(...preview.buildingSynergy.summary.slice(0, 3));
  } else {
    risks.push("No active building is currently boosting this mission.");
  }

  if ((preview.committedResources.food ?? 0) <= 0) {
    risks.push("No food has been committed.");
  } else if ((preview.committedResources.food ?? 0) >= Math.max(6, preview.teamSize * 2)) {
    strengths.push("Food stores are strong enough for the journey.");
  }

  if (mission.risk === "High" && (teamRequest.Medics ?? 0) <= 0 && (teamRequest.Defenders ?? 0) <= 0) {
    risks.push("High-risk mission without Medics or Defenders.");
  }
  if (mission.distance === "Far" && preview.vehicle.type !== "air") {
    risks.push("Far mission without air travel will be slower and riskier.");
  }
  if (preview.teamSize < 2) {
    risks.push("The crew is extremely small.");
  }
  if (preview.successScore >= 1.2) {
    strengths.push("Current setup points to a strong return.");
  } else if (preview.successScore < 0.85) {
    risks.push("Current setup points to a thin return.");
  }

  return {
    strengths: [...new Set(strengths)],
    risks: [...new Set(risks)]
  };
}

export function createExpeditionLaunchPreview(state, draft = {}) {
  const mission = findMissionCard(state, draft.missionId, draft.typeId ?? EXPEDITION_ORDER[0]);
  const expeditionType = getExpeditionType(mission.typeId);
  const vehicle = getVehicleDefinition(draft.vehicleId ?? VEHICLE_ORDER[0]);
  const approach = getMissionApproach(draft.approachId ?? "balanced");
  const durationDaysBase = EXPEDITION_DURATION_OPTIONS.includes(Number(draft.durationDays))
    ? Number(draft.durationDays)
    : Number(mission.suggestedDurationDays ?? EXPEDITION_DURATION_OPTIONS[1]);
  const durationDays = getEffectiveDurationDays(durationDaysBase, vehicle);
  const committedResources = createExpeditionResourceCommitment(draft.resources);
  const teamRequest = createTeamRequest(draft.team);
  const removedTeam = Object.fromEntries(
    Object.entries(teamRequest).map(([citizenClass, amount]) => [
      citizenClass,
      { Common: amount, Rare: 0, Epic: 0 }
    ])
  );
  const buildingSynergy = getExpeditionBuildingSynergy(state, mission, vehicle);
  const powerScore = computeExpeditionPowerScore(
    state,
    expeditionType,
    mission,
    approach,
    vehicle,
    removedTeam,
    committedResources,
    durationDaysBase,
    buildingSynergy
  );
  const difficultyScore = computeExpeditionDifficultyScore(expeditionType, mission, approach, vehicle, durationDaysBase, buildingSynergy);
  const successScore = difficultyScore > 0 ? powerScore / difficultyScore : 1;
  const preview = {
    mission,
    expeditionType,
    vehicle,
    approach,
    durationDaysBase,
    durationDays,
    committedResources,
    teamRequest,
    teamSize: Object.values(teamRequest).reduce((sum, amount) => sum + amount, 0),
    powerScore,
    difficultyScore,
    successScore,
    expectedReturnDayOffset: state.calendar.dayOffset + durationDays,
    buildingSynergy
  };

  return {
    ...preview,
    ...buildPreviewInsights(preview)
  };
}

export function startExpedition(state, payload) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);
  refreshExpeditionBoardIfNeeded(state);

  if (!(state.expeditions.board ?? []).length) {
    return { ok: false, reason: "No mission cards are available right now." };
  }
  if (!(state.expeditions.board ?? []).some((mission) => mission.id === payload?.missionId)) {
    return { ok: false, reason: "Pick a mission card from the Mission Board first." };
  }

  const preview = createExpeditionLaunchPreview(state, payload);
  const availableVehicles = getAvailableVehicleCounts(state);
  if ((availableVehicles[preview.vehicle.id] ?? 0) <= 0) {
    return { ok: false, reason: `No free ${preview.vehicle.name} is available.` };
  }
  if (preview.teamSize <= 0) {
    return { ok: false, reason: "Assign at least one citizen to the expedition." };
  }

  for (const [citizenClass, amount] of Object.entries(preview.teamRequest)) {
    if (!preview.expeditionType.allowedClasses.includes(citizenClass)) {
      return { ok: false, reason: `${citizenClass} cannot join a ${preview.expeditionType.label}.` };
    }
    if (amount > getAvailableExpeditionCitizenCount(state, citizenClass)) {
      return { ok: false, reason: `Not enough available ${citizenClass} are free to leave the Drift.` };
    }
  }

  for (const [resource, amount] of Object.entries(preview.committedResources)) {
    if (amount > Number(state.resources?.[resource] ?? 0)) {
      return { ok: false, reason: `Not enough ${resource} is available for this expedition.` };
    }
  }

  const team = createEmptyTeamRecord();
  for (const [citizenClass, amount] of Object.entries(preview.teamRequest)) {
    team[citizenClass] = takeCitizensFromRoster(state, citizenClass, amount);
  }
  for (const [resource, amount] of Object.entries(preview.committedResources)) {
    state.resources[resource] = Math.max(0, Number(state.resources?.[resource] ?? 0) - amount);
  }

  const actualPowerScore = computeExpeditionPowerScore(
    state,
    preview.expeditionType,
    preview.mission,
    preview.approach,
    preview.vehicle,
    team,
    preview.committedResources,
    preview.durationDaysBase,
    preview.buildingSynergy
  );
  const actualDifficultyScore = computeExpeditionDifficultyScore(
    preview.expeditionType,
    preview.mission,
    preview.approach,
    preview.vehicle,
    preview.durationDaysBase,
    preview.buildingSynergy
  );
  const actualSuccessScore = actualDifficultyScore > 0 ? actualPowerScore / actualDifficultyScore : 1;

  const expedition = {
    id: createId("expedition"),
    typeId: preview.expeditionType.id,
    typeLabel: preview.expeditionType.label,
    missionId: preview.mission.id,
    missionName: preview.mission.name,
    missionSummary: preview.mission.summary,
    missionRisk: preview.mission.risk,
    missionDistance: preview.mission.distance,
    missionIsSpecial: preview.mission.isSpecial === true,
    vehicleId: preview.vehicle.id,
    vehicleName: preview.vehicle.name,
    approachId: preview.approach.id,
    durationDaysBase: preview.durationDaysBase,
    durationDays: preview.durationDays,
    departedDayOffset: state.calendar.dayOffset,
    departedAt: formatDate(state.calendar.dayOffset),
    expectedReturnDayOffset: preview.expectedReturnDayOffset,
    expectedReturnAt: formatDate(preview.expectedReturnDayOffset),
    committedResources: preview.committedResources,
    team,
    powerScore: actualPowerScore,
    difficultyScore: actualDifficultyScore,
    successScore: actualSuccessScore,
    rewardPercent: preview.buildingSynergy.rewardPercent,
    uniquePercent: preview.buildingSynergy.uniquePercent,
    buildingSynergySummary: [...(preview.buildingSynergy.summary ?? [])],
    delayCount: 0,
    notes: `${preview.teamSize} personnel aboard the ${preview.vehicle.name} for a ${preview.mission.risk.toLowerCase()}-risk route.`
  };

  state.expeditions.active = [...state.expeditions.active, expedition];
  state.expeditions.board = (state.expeditions.board ?? []).filter((mission) => mission.id !== preview.mission.id);
  addHistoryEntry(state, {
    category: "Expedition",
    title: `Departure: ${expedition.missionName}`,
    details: `${expedition.missionName} departed on ${expedition.departedAt} aboard the ${expedition.vehicleName}. Expected return ${expedition.expectedReturnAt}.`
  });

  return { ok: true, expedition, preview };
}

export function advanceExpeditionsOneDay(state) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

  const remaining = [];
  const returned = [];

  for (const expedition of state.expeditions.active) {
    if (expedition.expectedReturnDayOffset > state.calendar.dayOffset) {
      remaining.push(expedition);
      continue;
    }

    if (shouldDelayExpedition(expedition)) {
      const delayDays = Math.max(1, Math.min(2, Math.round((1.1 - expedition.successScore) * 2)));
      expedition.delayCount += 1;
      expedition.expectedReturnDayOffset += delayDays;
      expedition.expectedReturnAt = formatDate(expedition.expectedReturnDayOffset);
      remaining.push(expedition);
      addHistoryEntry(state, {
        category: "Expedition",
        title: `Delayed: ${expedition.missionName ?? expedition.typeLabel}`,
        details: `${expedition.missionName ?? expedition.typeLabel} reported delays and now expects to return on ${expedition.expectedReturnAt}.`
      });
      continue;
    }

    returned.push(resolveExpeditionReturn(state, expedition, state.calendar.dayOffset));
  }

  state.expeditions.active = remaining;
  state.expeditions.recent = [...returned.reverse(), ...(state.expeditions.recent ?? [])].slice(0, MAX_RECENT_RETURNS);
  return returned;
}

export function forceReturnExpedition(state, expeditionId = null) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

  if (!state.expeditions.active.length) {
    return { ok: false, reason: "No active expedition is currently deployed." };
  }

  const target =
    expeditionId
      ? state.expeditions.active.find((expedition) => expedition.id === expeditionId)
      : [...state.expeditions.active].sort((left, right) => left.expectedReturnDayOffset - right.expectedReturnDayOffset)[0];

  if (!target) {
    return { ok: false, reason: "That expedition could not be found." };
  }

  target.delayCount = Math.max(1, Number(target.delayCount ?? 0) || 0);
  target.expectedReturnDayOffset = Number(state.calendar?.dayOffset ?? 0) || 0;
  target.expectedReturnAt = formatDate(target.expectedReturnDayOffset);
  state.expeditions.active = state.expeditions.active.filter((expedition) => expedition.id !== target.id);
  const record = resolveExpeditionReturn(state, target, target.expectedReturnDayOffset);
  state.expeditions.recent = [record, ...(state.expeditions.recent ?? [])].slice(0, MAX_RECENT_RETURNS);
  return { ok: true, expedition: target, record };
}

export function getExpeditionOverview(state) {
  const expeditionState = normalizeExpeditionState(state.expeditions);
  const vehicles = normalizeVehicleFleet(state.vehicles);
  const availableVehicles = getAvailableVehicleCounts({ ...state, expeditions: expeditionState, vehicles });
  const totalVehicles = Object.values(vehicles).reduce((sum, value) => sum + value, 0);
  const freeVehicles = Object.values(availableVehicles).reduce((sum, value) => sum + value, 0);

  return {
    totalVehicles,
    freeVehicles,
    boardMissions: expeditionState.board.length,
    activeExpeditions: expeditionState.active.length,
    uniqueProgress: expeditionState.uniqueProgress,
    nextUniqueThreshold: expeditionState.nextUniqueThreshold,
    uniqueCitizens: (state.uniqueCitizens ?? []).length
  };
}
