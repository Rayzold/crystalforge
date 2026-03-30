// Expedition and notable-citizen system.
// This module owns mission launch/return logic, vehicle limits, unique-citizen
// generation, and the calendar-facing summaries that make departures and
// expected returns visible in Chronicle.
import {
  EXPEDITION_APPROACHES,
  EXPEDITION_DURATION_OPTIONS,
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

function createExpeditionRecentRecord(partial = {}) {
  return {
    id: partial.id ?? createId("expedition-return"),
    typeId: partial.typeId ?? "resourceRun",
    typeLabel: partial.typeLabel ?? "Expedition",
    vehicleId: partial.vehicleId ?? "caravanWagon",
    vehicleName: partial.vehicleName ?? "Caravan Wagon",
    returnDayOffset: Number(partial.returnDayOffset ?? 0) || 0,
    returnDateLabel: partial.returnDateLabel ?? formatDate(Number(partial.returnDayOffset ?? 0) || 0),
    outcomeLabel: partial.outcomeLabel ?? "Returned",
    summary: partial.summary ?? "The expedition returned.",
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
    active: [],
    recent: [],
    uniqueProgress: 0,
    nextUniqueThreshold: DEFAULT_UNIQUE_THRESHOLD
  };
}

export function normalizeVehicleFleet(sourceFleet) {
  const baseFleet = createDefaultVehicleFleet();
  return Object.fromEntries(
    VEHICLE_ORDER.map((vehicleId) => [
      vehicleId,
      Math.max(0, Number(sourceFleet?.[vehicleId] ?? baseFleet[vehicleId] ?? 0) || 0)
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
    active: Array.isArray(sourceState?.active)
      ? sourceState.active
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => ({
            id: String(entry.id ?? createId("expedition")),
            typeId: entry.typeId ?? "resourceRun",
            typeLabel: entry.typeLabel ?? EXPEDITION_TYPES[entry.typeId]?.label ?? "Expedition",
            vehicleId: entry.vehicleId ?? "caravanWagon",
            vehicleName: entry.vehicleName ?? VEHICLE_DEFINITIONS[entry.vehicleId]?.name ?? "Vehicle",
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
            delayCount: Math.max(0, Number(entry.delayCount ?? 0) || 0),
            notes: String(entry.notes ?? "")
          }))
      : base.active,
    recent: Array.isArray(sourceState?.recent)
      ? sourceState.recent.map((entry) => createExpeditionRecentRecord(entry)).slice(0, MAX_RECENT_RETURNS)
      : base.recent,
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
  return VEHICLE_DEFINITIONS[vehicleId] ?? VEHICLE_DEFINITIONS.caravanWagon;
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
    name: `Expected Return: ${expedition.typeLabel}`,
    type: "Expedition",
    description: `${expedition.typeLabel} is expected to return aboard the ${expedition.vehicleName}.`
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

function computeExpeditionPowerScore(state, expeditionType, approach, vehicle, team, committedResources, durationDays) {
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

  return roundTo((teamPower + supplyScore) * durationFactor * (Number(approach.rewardModifier ?? 1) || 1) * uniqueBonus * (Number(vehicle.cargoMultiplier ?? 1) || 1), 2);
}

function computeExpeditionDifficultyScore(expeditionType, approach, durationDays) {
  const baseDifficulty = 5 + durationDays * 1.2;
  const missionPressure = 1 + Number(expeditionType.uniqueWeight ?? 1) * 0.18;
  return roundTo(baseDifficulty * missionPressure * (Number(approach.riskModifier ?? 1) || 1), 2);
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

function buildExpeditionRewards(state, expedition) {
  const expeditionType = getExpeditionType(expedition.typeId);
  const qualityNoise = 0.88 + Math.random() * 0.3;
  const rewardScore = Math.max(0.75, expedition.successScore * qualityNoise * 4);
  const citizenRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.citizens ?? 0) || 0);
  const resourceRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.resources ?? 0) || 0);
  const crystalRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.crystals ?? 0) || 0);
  const recruits = buildRecruitRewards(expeditionType, citizenRewardScore);
  const resources = buildResourceRewards(expeditionType, resourceRewardScore);
  const crystalRewards = buildCrystalRewards(expeditionType, crystalRewardScore);

  state.expeditions.uniqueProgress += Math.round(rewardScore * (Number(expeditionType.uniqueWeight ?? 1) || 1));

  let uniqueCitizen = null;
  if (state.expeditions.uniqueProgress >= state.expeditions.nextUniqueThreshold && expedition.successScore >= 0.9) {
    uniqueCitizen = createUniqueCitizen(state, expedition.typeId);
    state.expeditions.uniqueProgress -= state.expeditions.nextUniqueThreshold;
    state.expeditions.nextUniqueThreshold = Math.round(state.expeditions.nextUniqueThreshold * 1.28 + 30);
  }

  return {
    resources,
    recruits,
    uniqueCitizen,
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

function countExpeditionRewards(rewards) {
  return {
    recruits: Object.values(rewards.recruits ?? {}).reduce((sum, bundle) => sum + getBundleCount(bundle), 0),
    resources: EXPEDITION_RESOURCE_REWARD_KEYS.reduce((sum, key) => sum + (Number(rewards.resources?.[key] ?? 0) || 0), 0),
    crystals:
      RARITY_ORDER.reduce((sum, rarity) => sum + (Number(rewards.crystals?.[rarity] ?? 0) || 0), 0) +
      RARITY_ORDER.reduce((sum, rarity) => sum + (Number(rewards.shards?.[rarity] ?? 0) || 0), 0) / 100
  };
}

export function createExpeditionLaunchPreview(state, draft = {}) {
  const expeditionType = getExpeditionType(draft.typeId ?? EXPEDITION_ORDER[0]);
  const vehicle = getVehicleDefinition(draft.vehicleId ?? VEHICLE_ORDER[0]);
  const approach = getMissionApproach(draft.approachId ?? "balanced");
  const durationDaysBase = EXPEDITION_DURATION_OPTIONS.includes(Number(draft.durationDays))
    ? Number(draft.durationDays)
    : EXPEDITION_DURATION_OPTIONS[1];
  const durationDays = getEffectiveDurationDays(durationDaysBase, vehicle);
  const committedResources = createExpeditionResourceCommitment(draft.resources);
  const teamRequest = createTeamRequest(draft.team);
  const removedTeam = Object.fromEntries(
    Object.entries(teamRequest).map(([citizenClass, amount]) => [
      citizenClass,
      { Common: amount, Rare: 0, Epic: 0 }
    ])
  );
  const powerScore = computeExpeditionPowerScore(state, expeditionType, approach, vehicle, removedTeam, committedResources, durationDaysBase);
  const difficultyScore = computeExpeditionDifficultyScore(expeditionType, approach, durationDaysBase);
  const successScore = difficultyScore > 0 ? powerScore / difficultyScore : 1;

  return {
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
    expectedReturnDayOffset: state.calendar.dayOffset + durationDays
  };
}

export function startExpedition(state, payload) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

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
    preview.approach,
    preview.vehicle,
    team,
    preview.committedResources,
    preview.durationDaysBase
  );
  const actualDifficultyScore = computeExpeditionDifficultyScore(
    preview.expeditionType,
    preview.approach,
    preview.durationDaysBase
  );
  const actualSuccessScore = actualDifficultyScore > 0 ? actualPowerScore / actualDifficultyScore : 1;

  const expedition = {
    id: createId("expedition"),
    typeId: preview.expeditionType.id,
    typeLabel: preview.expeditionType.label,
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
    delayCount: 0,
    notes: `${preview.teamSize} personnel aboard the ${preview.vehicle.name}.`
  };

  state.expeditions.active = [...state.expeditions.active, expedition];
  addHistoryEntry(state, {
    category: "Expedition",
    title: `Departure: ${expedition.typeLabel}`,
    details: `${expedition.typeLabel} departed on ${expedition.departedAt} aboard the ${expedition.vehicleName}. Expected return ${expedition.expectedReturnAt}.`
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
        title: `Delayed: ${expedition.typeLabel}`,
        details: `${expedition.typeLabel} reported delays and now expects to return on ${expedition.expectedReturnAt}.`
      });
      continue;
    }

    addTeamBackToCity(state, expedition.team);
    const rewards = buildExpeditionRewards(state, expedition);
    grantRewardCollections(state, rewards);
    const outcomeLabel = rollOutcomeLabel(expedition.successScore);
    const rewardCounts = countExpeditionRewards(rewards);
    const rewardSummaryParts = [
      summarizeRecruitRewards(rewards.recruits),
      summarizeResourceRewards(rewards.resources),
      summarizeCrystalRewards(rewards.crystals, rewards.shards),
      rewards.uniqueCitizen ? `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift.` : ""
    ].filter(Boolean);
    const summary =
      rewardSummaryParts.join(" | ") ||
      `${expedition.typeLabel} returned light, but the crew made it home intact.`;

    addHistoryEntry(state, {
      category: "Expedition",
      title: `Return: ${expedition.typeLabel}`,
      details: `${expedition.typeLabel} returned on ${formatDate(state.calendar.dayOffset)}. ${summary}`
    });

    if (rewards.uniqueCitizen) {
      addHistoryEntry(state, {
        category: "Unique Citizen",
        title: rewards.uniqueCitizen.fullName,
        details: `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift. ${rewards.uniqueCitizen.effectText}`
      });
    }

    returned.push(
      createExpeditionRecentRecord({
        typeId: expedition.typeId,
        typeLabel: expedition.typeLabel,
        vehicleId: expedition.vehicleId,
        vehicleName: expedition.vehicleName,
        returnDayOffset: state.calendar.dayOffset,
        returnDateLabel: formatDate(state.calendar.dayOffset),
        outcomeLabel,
        summary,
        rewards
      })
    );
  }

  state.expeditions.active = remaining;
  state.expeditions.recent = [...returned.reverse(), ...(state.expeditions.recent ?? [])].slice(0, MAX_RECENT_RETURNS);
  return returned;
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
    activeExpeditions: expeditionState.active.length,
    uniqueProgress: expeditionState.uniqueProgress,
    nextUniqueThreshold: expeditionState.nextUniqueThreshold,
    uniqueCitizens: (state.uniqueCitizens ?? []).length
  };
}
