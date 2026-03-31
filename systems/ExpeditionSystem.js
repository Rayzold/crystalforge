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
const JOURNEY_STAGE_DAY_SPAN = 4;
const MAX_JOURNEY_STAGES = 5;
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

const ARCANE_JOURNEY_TYPES = new Set(["crystalHunt", "pilgrimage"]);
const SALVAGE_JOURNEY_TYPES = new Set(["resourceRun", "relicRecovery", "monsterHunt"]);
const SOCIAL_JOURNEY_TYPES = new Set(["rescue", "recruit", "diplomatic"]);

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
    pending: [],
    recent: [],
    lastRefreshDayOffset: null,
    uniqueProgress: 0,
    nextUniqueThreshold: DEFAULT_UNIQUE_THRESHOLD
  };
}

function normalizeJourneyEffects(effects = {}) {
  return {
    successDelta: Number(effects?.successDelta ?? 0) || 0,
    rewardMultiplier: Math.max(0.5, Number(effects?.rewardMultiplier ?? 1) || 1),
    recruitMultiplier: Math.max(0.5, Number(effects?.recruitMultiplier ?? 1) || 1),
    uniquePercentBonus: Number(effects?.uniquePercentBonus ?? 0) || 0,
    resourceBonuses: { ...createEmptyResourceRecord(), ...(effects?.resourceBonuses ?? {}) },
    crystalBonuses: { ...createEmptyCrystalRecord(), ...(effects?.crystalBonuses ?? {}) },
    shardBonuses: { ...createEmptyCrystalRecord(), ...(effects?.shardBonuses ?? {}) },
    modifier: String(effects?.modifier ?? "").trim(),
    result: String(effects?.result ?? "").trim()
  };
}

function normalizeJourneyOption(option = {}) {
  return {
    id: String(option?.id ?? createId("journey-option")),
    label: String(option?.label ?? "Choice").trim() || "Choice",
    summary: String(option?.summary ?? "").trim(),
    effects: normalizeJourneyEffects(option?.effects)
  };
}

function normalizeActiveExpedition(entry = {}) {
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
    rewardPercent: Number(entry.rewardPercent ?? 0) || 0,
    uniquePercent: Number(entry.uniquePercent ?? 0) || 0,
    buildingSynergySummary: Array.isArray(entry.buildingSynergySummary) ? [...entry.buildingSynergySummary] : [],
    delayCount: Math.max(0, Number(entry.delayCount ?? 0) || 0),
    notes: String(entry.notes ?? "")
  };
}

function normalizePendingJourneyStage(stage = {}, index = 0) {
  const options = Array.isArray(stage?.options) ? stage.options.map((entry) => normalizeJourneyOption(entry)) : [];
  return {
    id: String(stage?.id ?? createId("journey-stage")),
    index: Math.max(0, Number(stage?.index ?? index) || index),
    dayMarker: Math.max(1, Number(stage?.dayMarker ?? (index + 1) * JOURNEY_STAGE_DAY_SPAN) || (index + 1) * JOURNEY_STAGE_DAY_SPAN),
    kind: String(stage?.kind ?? "journey").trim() || "journey",
    title: String(stage?.title ?? "Journey Stage").trim() || "Journey Stage",
    prompt: String(stage?.prompt ?? "").trim(),
    options,
    chosenOptionId: stage?.chosenOptionId ? String(stage.chosenOptionId) : null,
    chosenLabel: stage?.chosenLabel ? String(stage.chosenLabel) : null,
    chosenSummary: stage?.chosenSummary ? String(stage.chosenSummary) : null
  };
}

function normalizePendingJourney(entry = {}) {
  const stages = Array.isArray(entry?.stages) ? entry.stages.map((stage, index) => normalizePendingJourneyStage(stage, index)) : [];
  return {
    id: String(entry?.id ?? createId("expedition-journey")),
    expedition: normalizeActiveExpedition(entry?.expedition ?? {}),
    returnDayOffset: Number(entry?.returnDayOffset ?? 0) || 0,
    returnDateLabel: String(entry?.returnDateLabel ?? formatDate(Number(entry?.returnDayOffset ?? 0) || 0)),
    travelDays: Math.max(1, Number(entry?.travelDays ?? 1) || 1),
    currentStageIndex: Math.max(0, Math.min(stages.length, Number(entry?.currentStageIndex ?? 0) || 0)),
    stages
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
          .map((entry) => normalizeActiveExpedition(entry))
      : base.active,
    pending: Array.isArray(sourceState?.pending)
      ? sourceState.pending.filter((entry) => entry && typeof entry === "object").map((entry) => normalizePendingJourney(entry))
      : base.pending,
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

export function getExpeditionOutcomeLabel(successScore) {
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

function buildExpeditionRewards(state, expedition, journeyProjection = null) {
  const expeditionType = getExpeditionType(expedition.typeId);
  const missionRisk = getMissionRiskSettings(expedition.missionRisk);
  const qualityNoise = 0.88 + Math.random() * 0.3;
  const rewardSynergy = 1 + (Number(expedition.rewardPercent ?? 0) || 0) / 100;
  const rewardScore = Math.max(
    0.75,
    expedition.successScore *
      qualityNoise *
      4 *
      missionRisk.reward *
      rewardSynergy *
      (Number(journeyProjection?.rewardMultiplier ?? 1) || 1)
  );
  const citizenRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.citizens ?? 0) || 0);
  const resourceRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.resources ?? 0) || 0);
  const crystalRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.crystals ?? 0) || 0);
  const recruits = buildRecruitRewards(expeditionType, citizenRewardScore);
  const resources = buildResourceRewards(expeditionType, resourceRewardScore);
  const crystalRewards = buildCrystalRewards(expeditionType, crystalRewardScore);
  scaleRecruitBundles(recruits, Number(journeyProjection?.recruitMultiplier ?? 1) || 1);
  addResourceBonuses(resources, journeyProjection?.resourceBonuses);
  addCrystalBonuses(crystalRewards.crystals, journeyProjection?.crystalBonuses);
  addCrystalBonuses(crystalRewards.shards, journeyProjection?.shardBonuses);

  state.expeditions.uniqueProgress += Math.round(
    rewardScore *
      (Number(expeditionType.uniqueWeight ?? 1) || 1) *
      missionRisk.unique *
      (1 + (Number(journeyProjection?.uniquePercent ?? expedition.uniquePercent ?? 0) || 0) / 100)
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

  if (journeyProjection?.modifiers?.length) {
    modifiers.unshift(...journeyProjection.modifiers);
  }

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

function addResourceBonuses(target, source) {
  for (const key of EXPEDITION_RESOURCE_REWARD_KEYS) {
    target[key] = (Number(target[key]) || 0) + (Number(source?.[key] ?? 0) || 0);
  }
}

function addCrystalBonuses(target, source) {
  for (const rarity of RARITY_ORDER) {
    target[rarity] = (Number(target[rarity]) || 0) + (Number(source?.[rarity] ?? 0) || 0);
  }
}

function createJourneyOption({ id, label, summary, effects = {} }) {
  return normalizeJourneyOption({
    id,
    label,
    summary,
    effects
  });
}

function getJourneyTravelDays(expedition, returnDayOffset) {
  return Math.max(1, Number(returnDayOffset ?? expedition.expectedReturnDayOffset ?? 0) - Number(expedition.departedDayOffset ?? 0));
}

function createJourneyBonusBundle(expedition, bundleKey) {
  const resourceBonuses = createEmptyResourceRecord();
  const crystalBonuses = createEmptyCrystalRecord();
  const shardBonuses = createEmptyCrystalRecord();
  let recruitMultiplier = 1;
  let uniquePercentBonus = 0;

  switch (bundleKey) {
    case "supplies":
      if (SALVAGE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.food += 4;
        resourceBonuses.materials += 4;
        resourceBonuses.salvage += 3;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.food += 3;
        resourceBonuses.gold += 4;
        resourceBonuses.prosperity += 2;
      } else {
        resourceBonuses.food += 2;
        resourceBonuses.mana += 3;
        resourceBonuses.salvage += 2;
      }
      break;
    case "discovery":
      if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 5;
        shardBonuses.Common += 10;
        shardBonuses.Uncommon += 3;
        uniquePercentBonus += 8;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.gold += 5;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.06;
        uniquePercentBonus += 4;
      } else {
        resourceBonuses.salvage += 6;
        resourceBonuses.materials += 4;
        uniquePercentBonus += 4;
      }
      break;
    case "excavation":
      if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 4;
        shardBonuses.Common += 12;
        shardBonuses.Uncommon += 4;
        if (expedition.typeId === "crystalHunt") {
          crystalBonuses.Common += 1;
        }
        uniquePercentBonus += 6;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.gold += 4;
        resourceBonuses.materials += 3;
        recruitMultiplier += 0.08;
      } else {
        resourceBonuses.salvage += 8;
        resourceBonuses.materials += 6;
        shardBonuses.Common += 5;
      }
      break;
    case "contact":
      if (expedition.typeId === "diplomatic") {
        resourceBonuses.gold += 10;
        resourceBonuses.prosperity += 6;
        recruitMultiplier += 0.1;
      } else if (["rescue", "recruit"].includes(expedition.typeId)) {
        resourceBonuses.food += 3;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.14;
      } else if (expedition.typeId === "pilgrimage") {
        resourceBonuses.mana += 4;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.08;
      } else {
        resourceBonuses.gold += 4;
        resourceBonuses.food += 2;
        recruitMultiplier += 0.05;
      }
      break;
    case "combat":
      if (["monsterHunt", "rescue"].includes(expedition.typeId)) {
        resourceBonuses.salvage += 6;
        resourceBonuses.food += 2;
        resourceBonuses.materials += 3;
      } else if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 3;
        resourceBonuses.salvage += 4;
        shardBonuses.Common += 5;
      } else {
        resourceBonuses.salvage += 5;
        resourceBonuses.materials += 4;
        resourceBonuses.gold += 2;
      }
      break;
    default:
      break;
  }

  return {
    resourceBonuses,
    crystalBonuses,
    shardBonuses,
    recruitMultiplier,
    uniquePercentBonus
  };
}

function buildSupplyJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "supply",
    title: "Supply Strain",
    prompt: `By day ${dayMarker}, the crew aboard the ${expedition.vehicleName} is burning through stores faster than planned and needs to decide how to steady the route.`,
    options: [
      createJourneyOption({
        id: "salvage-stores",
        label: "Salvage the Route",
        summary: "Strip nearby ruins and camps for fresh stores. Higher haul, rougher passage.",
        effects: {
          ...createJourneyBonusBundle(expedition, "supplies"),
          successDelta: -0.04,
          rewardMultiplier: 1.04,
          modifier: "Route salvage",
          result: "salvaged the road itself to keep the mission moving"
        }
      }),
      createJourneyOption({
        id: "ration-carefully",
        label: "Ration Carefully",
        summary: "Protect the crew and secure the return, but expect a lighter haul.",
        effects: {
          successDelta: 0.08,
          rewardMultiplier: 0.9,
          modifier: "Tight rationing",
          result: "cut the route down to the essentials and protected the crew"
        }
      }),
      createJourneyOption({
        id: "push-with-reserves",
        label: "Push With Reserves",
        summary: "Maintain pace and pressure. Faster haul, shakier footing.",
        effects: {
          successDelta: -0.08,
          rewardMultiplier: 1.07,
          modifier: "Hidden reserves spent",
          result: "burned reserve packs to keep the expedition aggressive"
        }
      })
    ]
  };
}

function buildSignalJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "signal",
    title: ARCANE_JOURNEY_TYPES.has(expedition.typeId) ? "Strange Echo" : "Unmarked Landmark",
    prompt: `Near day ${dayMarker}, ${expedition.missionName} passes a strange pull off the main route. The crew can lean into it, survey it, or leave it untouched.`,
    options: [
      createJourneyOption({
        id: "approach-signal",
        label: "Approach It",
        summary: "Investigate the oddity directly for rare insight or hidden gain.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: -0.07,
          rewardMultiplier: 1.06,
          modifier: "Strange detour",
          result: "leaned into the unknown instead of staying on the safe line"
        }
      }),
      createJourneyOption({
        id: "survey-signal",
        label: "Survey From Range",
        summary: "Take a measured read without fully committing.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: 0.03,
          rewardMultiplier: 0.98,
          recruitMultiplier: 1,
          modifier: "Measured survey",
          result: "surveyed the anomaly carefully before moving on"
        }
      }),
      createJourneyOption({
        id: "avoid-signal",
        label: "Avoid It",
        summary: "Keep the crew safe and maintain discipline, even if it costs opportunities.",
        effects: {
          successDelta: 0.08,
          rewardMultiplier: 0.92,
          modifier: "Skipped anomaly",
          result: "gave the strange place a wide berth and stayed disciplined"
        }
      })
    ]
  };
}

function buildExcavationJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "excavation",
    title: SALVAGE_JOURNEY_TYPES.has(expedition.typeId) ? "Promising Cache" : "Buried Site",
    prompt: `By day ${dayMarker}, the crew finds a place worth digging into. Time spent here could change the whole return.`,
    options: [
      createJourneyOption({
        id: "dig-deep",
        label: "Dig Properly",
        summary: "Commit labor and time for the biggest possible payoff.",
        effects: {
          ...createJourneyBonusBundle(expedition, "excavation"),
          successDelta: -0.06,
          rewardMultiplier: 1.09,
          modifier: "Deep excavation",
          result: "stayed long enough to pry the best pieces out of the site"
        }
      }),
      createJourneyOption({
        id: "take-surface",
        label: "Take Surface Finds",
        summary: "Grab the obvious value and avoid getting bogged down.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: 0,
          rewardMultiplier: 1.02,
          modifier: "Surface salvage",
          result: "took what was easy to lift and kept the route alive"
        }
      }),
      createJourneyOption({
        id: "mark-and-move",
        label: "Mark It And Move",
        summary: "Leave the deeper prize for another day and preserve the mission.",
        effects: {
          successDelta: 0.05,
          rewardMultiplier: 0.94,
          modifier: "Skipped dig",
          result: "marked the site for later and kept the expedition intact"
        }
      })
    ]
  };
}

function buildEncounterJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "encounter",
    title: expedition.typeId === "monsterHunt" ? "Enemy Contact" : "Threat On The Route",
    prompt: `Around day ${dayMarker}, the crew meets resistance that can be fought, outplayed, or avoided entirely.`,
    options: [
      createJourneyOption({
        id: "fight-through",
        label: "Fight Through",
        summary: "Press the threat head-on for a stronger haul at higher risk.",
        effects: {
          ...createJourneyBonusBundle(expedition, "combat"),
          successDelta: -0.1,
          rewardMultiplier: 1.12,
          modifier: "Direct engagement",
          result: "fought through the pressure instead of conceding the route"
        }
      }),
      createJourneyOption({
        id: "set-ambush",
        label: "Outplay Them",
        summary: "Use scouting and positioning to keep initiative without a full clash.",
        effects: {
          ...createJourneyBonusBundle(expedition, "combat"),
          successDelta: 0.02,
          rewardMultiplier: 1.03,
          modifier: "Tactical contact",
          result: "used positioning and traps to win without a full grind"
        }
      }),
      createJourneyOption({
        id: "avoid-conflict",
        label: "Avoid Conflict",
        summary: "Keep the crew safe and preserve the return, even if it costs prize.",
        effects: {
          successDelta: 0.09,
          rewardMultiplier: 0.88,
          modifier: "Avoided contact",
          result: "refused the fight and protected the crew over the haul"
        }
      })
    ]
  };
}

function buildCrossingJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "crossing",
    title: "Broken Passage",
    prompt: `Near day ${dayMarker}, the expedition reaches a crossing that can be forced, repaired, or rerouted around.`,
    options: [
      createJourneyOption({
        id: "force-crossing",
        label: "Force The Crossing",
        summary: "Take the dangerous line and keep pace.",
        effects: {
          successDelta: -0.06,
          rewardMultiplier: 1.08,
          modifier: "Forced crossing",
          result: "forced the passage instead of slowing down"
        }
      }),
      createJourneyOption({
        id: "secure-crossing",
        label: "Secure It First",
        summary: "Spend effort on a safer passage and protect the return.",
        effects: {
          ...createJourneyBonusBundle(expedition, "supplies"),
          successDelta: 0.06,
          rewardMultiplier: 0.95,
          modifier: "Secured passage",
          result: "made the crossing stable before moving the whole crew through"
        }
      }),
      createJourneyOption({
        id: "scout-reroute",
        label: "Scout A Reroute",
        summary: "Look for a smarter line that preserves both pace and safety.",
        effects: {
          successDelta: 0.03,
          rewardMultiplier: 0.99,
          uniquePercentBonus: 4,
          modifier: "Alternate route",
          result: "found a workable alternate line instead of committing blind"
        }
      })
    ]
  };
}

function buildContactJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "contact",
    title: expedition.typeId === "diplomatic" ? "Unexpected Delegation" : "People On The Road",
    prompt: `By day ${dayMarker}, the crew runs into people who might trade, join, or slow the mission depending on how the expedition handles them.`,
    options: [
      createJourneyOption({
        id: "stop-and-help",
        label: "Stop And Engage",
        summary: "Take the time to help, escort, or negotiate with the people on the route.",
        effects: {
          ...createJourneyBonusBundle(expedition, "contact"),
          successDelta: 0.02,
          rewardMultiplier: 0.98,
          modifier: "Deliberate contact",
          result: "spent real time dealing with the people they found instead of brushing past"
        }
      }),
      createJourneyOption({
        id: "bargain-fast",
        label: "Bargain Fast",
        summary: "Trade quickly and pull value from the stop without lingering.",
        effects: {
          ...createJourneyBonusBundle(expedition, "contact"),
          successDelta: -0.02,
          rewardMultiplier: 1.05,
          recruitMultiplier: 1,
          modifier: "Hard bargain",
          result: "cut a fast bargain and kept the expedition moving"
        }
      }),
      createJourneyOption({
        id: "pass-by",
        label: "Pass By",
        summary: "Keep the crew focused on the mission and leave the detour behind.",
        effects: {
          successDelta: 0.05,
          rewardMultiplier: 0.93,
          modifier: "Stayed focused",
          result: "held the line and refused to drift off mission"
        }
      })
    ]
  };
}

function pickJourneyStageKinds(expedition, stageCount) {
  const teamSize = getTeamCount(expedition.team);
  const committedFood = Number(expedition.committedResources?.food ?? 0) || 0;
  const lowSupplies = committedFood < Math.max(4, teamSize * 2);
  const preferred = [];

  if (lowSupplies) {
    preferred.push("supply");
  }
  if (expedition.missionDistance === "Far" || Number(expedition.delayCount ?? 0) > 0) {
    preferred.push("crossing");
  }
  if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("signal");
  }
  if (SALVAGE_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("excavation");
  }
  if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("contact");
  }
  if (expedition.missionRisk === "High" || ["monsterHunt", "rescue"].includes(expedition.typeId)) {
    preferred.push("encounter");
  }

  const stagePreferenceOrder = [
    ["supply", "crossing", "contact", "signal", "encounter", "excavation"],
    ["signal", "contact", "crossing", "supply", "encounter", "excavation"],
    ["encounter", "excavation", "signal", "contact", "crossing", "supply"],
    ["excavation", "encounter", "contact", "signal", "crossing", "supply"],
    ["contact", "crossing", "signal", "encounter", "excavation", "supply"]
  ];
  const fallback = ["crossing", "signal", "encounter", "excavation", "contact", "supply"];
  const sequence = [];

  for (let index = 0; index < stageCount; index += 1) {
    const preferredForStage = stagePreferenceOrder[Math.min(index, stagePreferenceOrder.length - 1)];
    const nextKind =
      preferredForStage.find((kind) => preferred.includes(kind) && !sequence.includes(kind)) ??
      preferred.find((kind) => !sequence.includes(kind)) ??
      fallback.find((kind) => !sequence.includes(kind)) ??
      fallback[index % fallback.length];
    sequence.push(nextKind);
  }

  return sequence;
}

function buildJourneyStage(kind, expedition, index, dayMarker) {
  switch (kind) {
    case "supply":
      return buildSupplyJourneyStage(expedition, index, dayMarker);
    case "signal":
      return buildSignalJourneyStage(expedition, index, dayMarker);
    case "excavation":
      return buildExcavationJourneyStage(expedition, index, dayMarker);
    case "encounter":
      return buildEncounterJourneyStage(expedition, index, dayMarker);
    case "crossing":
      return buildCrossingJourneyStage(expedition, index, dayMarker);
    case "contact":
    default:
      return buildContactJourneyStage(expedition, index, dayMarker);
  }
}

function createPendingExpeditionJourney(state, expedition, returnDayOffset = state.calendar.dayOffset) {
  const travelDays = getJourneyTravelDays(expedition, returnDayOffset);
  const stageCount = Math.max(1, Math.min(MAX_JOURNEY_STAGES, Math.ceil(travelDays / JOURNEY_STAGE_DAY_SPAN)));
  const stageKinds = pickJourneyStageKinds(expedition, stageCount);
  const stages = stageKinds.map((kind, index) =>
    buildJourneyStage(kind, expedition, index, Math.min(travelDays, (index + 1) * JOURNEY_STAGE_DAY_SPAN))
  );

  addTeamBackToCity(state, expedition.team);

  addHistoryEntry(state, {
    category: "Expedition",
    title: `Debrief Ready: ${expedition.missionName ?? expedition.typeLabel}`,
    details: `${expedition.missionName ?? expedition.typeLabel} made it back to the Drift. Resolve ${stageCount} journey stage(s) to settle the final rewards.`
  });

  return normalizePendingJourney({
    id: createId("expedition-journey"),
    expedition,
    returnDayOffset,
    returnDateLabel: formatDate(returnDayOffset),
    travelDays,
    currentStageIndex: 0,
    stages
  });
}

function getJourneyProjection(journey) {
  const successBase = Number(journey?.expedition?.successScore ?? 0) || 0;
  const uniquePercentBase = Number(journey?.expedition?.uniquePercent ?? 0) || 0;
  const resourceBonuses = createEmptyResourceRecord();
  const crystalBonuses = createEmptyCrystalRecord();
  const shardBonuses = createEmptyCrystalRecord();
  const stageHighlights = [];
  const modifiers = [];
  let successDelta = 0;
  let rewardMultiplier = 1;
  let recruitMultiplier = 1;
  let uniquePercentBonus = 0;

  for (const stage of journey?.stages ?? []) {
    if (!stage?.chosenOptionId) {
      continue;
    }
    const selectedOption = (stage.options ?? []).find((option) => option.id === stage.chosenOptionId);
    if (!selectedOption) {
      continue;
    }
    const effects = normalizeJourneyEffects(selectedOption.effects);
    successDelta += effects.successDelta;
    rewardMultiplier *= effects.rewardMultiplier;
    recruitMultiplier *= effects.recruitMultiplier;
    uniquePercentBonus += effects.uniquePercentBonus;
    addResourceBonuses(resourceBonuses, effects.resourceBonuses);
    addCrystalBonuses(crystalBonuses, effects.crystalBonuses);
    addCrystalBonuses(shardBonuses, effects.shardBonuses);
    if (effects.modifier) {
      modifiers.push(effects.modifier);
    }
    stageHighlights.push(`Day ${stage.dayMarker}: ${stage.chosenLabel ?? selectedOption.label} - ${effects.result || selectedOption.summary}`);
  }

  const successScore = clamp(successBase + successDelta, 0.45, 2.25);
  return {
    successScore,
    rewardMultiplier: clamp(rewardMultiplier, 0.55, 1.75),
    recruitMultiplier: clamp(recruitMultiplier, 0.65, 1.85),
    uniquePercent: uniquePercentBase + uniquePercentBonus,
    resourceBonuses,
    crystalBonuses,
    shardBonuses,
    modifiers,
    stageHighlights
  };
}

export function getExpeditionJourneyProjection(journey) {
  const projection = getJourneyProjection(journey);
  return {
    ...projection,
    outcomeLabel: getExpeditionOutcomeLabel(projection.successScore)
  };
}

export function getCurrentPendingExpeditionJourney(state) {
  const pending = normalizeExpeditionState(state.expeditions).pending ?? [];
  return pending[0] ?? null;
}

export function hasPendingExpeditionJourneys(state) {
  return Boolean(getCurrentPendingExpeditionJourney(state));
}

function resolveExpeditionReturn(state, expedition, returnDayOffset = state.calendar.dayOffset, journey = null) {
  const journeyProjection = journey ? getJourneyProjection(journey) : null;
  const resolvedExpedition = journeyProjection
    ? {
        ...expedition,
        successScore: journeyProjection.successScore,
        uniquePercent: journeyProjection.uniquePercent
      }
    : expedition;
  const rewards = buildExpeditionRewards(state, resolvedExpedition, journeyProjection);
  grantRewardCollections(state, rewards);
  const outcomeLabel = getExpeditionOutcomeLabel(resolvedExpedition.successScore);
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
  const stageHighlights = journeyProjection?.stageHighlights ?? [];
  const summary =
    rewardSummaryParts.join(" | ") ||
    `${expedition.missionName ?? expedition.typeLabel} returned light, but the crew made it home intact.`;
  const detailLines = [
    `${outcomeLabel} on a ${String(expedition.missionRisk ?? "Medium").toLowerCase()}-risk route.`,
    ...stageHighlights,
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

export function resolveExpeditionJourneyChoice(state, journeyId, optionId) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const pendingJourneys = state.expeditions.pending ?? [];
  const journeyIndex = pendingJourneys.findIndex((entry) => entry.id === journeyId);
  if (journeyIndex === -1) {
    return { ok: false, reason: "That expedition journey is no longer waiting." };
  }

  const journey = pendingJourneys[journeyIndex];
  const stage = journey.stages?.[journey.currentStageIndex] ?? null;
  if (!stage) {
    return { ok: false, reason: "This expedition journey is already complete." };
  }

  const selectedOption = (stage.options ?? []).find((entry) => entry.id === optionId) ?? null;
  if (!selectedOption) {
    return { ok: false, reason: "That journey choice is no longer available." };
  }

  stage.chosenOptionId = selectedOption.id;
  stage.chosenLabel = selectedOption.label;
  stage.chosenSummary = selectedOption.summary;
  journey.currentStageIndex += 1;

  if (journey.currentStageIndex < (journey.stages?.length ?? 0)) {
    return {
      ok: true,
      completed: false,
      journey,
      stage
    };
  }

  const record = resolveExpeditionReturn(state, journey.expedition, journey.returnDayOffset, journey);
  state.expeditions.pending = pendingJourneys.filter((entry) => entry.id !== journey.id);
  state.expeditions.recent = [record, ...(state.expeditions.recent ?? [])].slice(0, MAX_RECENT_RETURNS);
  return {
    ok: true,
    completed: true,
    journey,
    record
  };
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
  const pendingJourneys = [];

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

    pendingJourneys.push(createPendingExpeditionJourney(state, expedition, state.calendar.dayOffset));
  }

  state.expeditions.active = remaining;
  if (pendingJourneys.length) {
    state.expeditions.pending = [...pendingJourneys, ...(state.expeditions.pending ?? [])];
  }
  return pendingJourneys;
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
  const journey = createPendingExpeditionJourney(state, target, target.expectedReturnDayOffset);
  state.expeditions.pending = [journey, ...(state.expeditions.pending ?? [])];
  return { ok: true, expedition: target, journey };
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
    pendingJourneys: expeditionState.pending.length,
    uniqueProgress: expeditionState.uniqueProgress,
    nextUniqueThreshold: expeditionState.nextUniqueThreshold,
    uniqueCitizens: (state.uniqueCitizens ?? []).length
  };
}
