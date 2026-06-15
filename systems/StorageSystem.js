// Save, load, and migration layer.
// This file creates fresh game states, normalizes imported data, keeps manual
// and session saves stable, and upgrades old save shapes into the current model.
import {
  DEFAULT_START_PRESET,
  DEFAULT_START_STATE,
  MANUAL_SAVE_KEY,
  SAVE_VERSION,
  SPEED_MULTIPLIERS,
  START_STATE_PRESETS,
  createEmptyCitizenCollection,
  createEmptyCollection,
  createDefaultDistrictState,
  createDefaultRollTables
} from "../content/Config.js?v=v1.7.20-20260615092907";
import { BASE_BUILDING_CATALOG, buildFlavorText } from "../content/BuildingCatalog.js?v=v1.7.20-20260615092907";
import { getNextRarity } from "../content/Rarities.js?v=v1.7.20-20260615092907";
import { createId, safeJsonParse } from "../engine/Utils.js?v=v1.7.20-20260615092907";
import { formatDate } from "./CalendarSystem.js?v=v1.7.20-20260615092907";
import {
  createCitizenDefinitionsSnapshot,
  createCitizenRarityRoster,
  normalizeCitizenRarityRoster,
  normalizeCitizens,
  syncCitizenTotalsFromRoster
} from "./CitizenSystem.js?v=v1.7.20-20260615092907";
import { normalizeCrystalCollection } from "./CrystalSystem.js?v=v1.7.20-20260615092907";
import { recalculateCityStats } from "./CityStatsSystem.js?v=v1.7.20-20260615092907";
import { getDistrictSummary } from "./DistrictSystem.js?v=v1.7.20-20260615092907";
import { normalizeShardCollection } from "./ShardSystem.js?v=v1.7.20-20260615092907";
import { createMapCells } from "./MapSystem.js?v=v1.7.20-20260615092907";
import { createDefaultDriftEvolutionState, normalizeDriftEvolutionState, syncDriftEvolutionState } from "./DriftEvolutionSystem.js?v=v1.7.20-20260615092907";
import { getDriftConstructionSlots, normalizeConstructionPriority } from "./ConstructionSystem.js?v=v1.7.20-20260615092907";
import { createDefaultTownFocusState, normalizeTownFocusState } from "./TownFocusSystem.js?v=v1.7.20-20260615092907";
import { captureDailyCitySnapshot } from "./CitySnapshotSystem.js?v=v1.7.20-20260615092907";
import {
  createDefaultExpeditionState,
  normalizeExpeditionState,
  normalizeUniqueCitizens,
  normalizeVehicleFleet
} from "./ExpeditionSystem.js?v=v1.7.20-20260615092907";
import { createDefaultVehicleFleet } from "../content/VehicleConfig.js?v=v1.7.20-20260615092907";
import { normalizeBehemoths } from "./BehemothSystem.js?v=v1.7.20-20260615092907";
import { normalizeNpcs } from "./NpcSystem.js?v=v1.7.20-20260615092907";
import { normalizeAwakenedRoster } from "./AwakenedSystem.js?v=v1.7.20-20260615092907";
import { normalizeCraftingItems } from "./CraftingSystem.js?v=v1.7.20-20260615092907";
import { normalizeCooldowns } from "./CooldownSystem.js?v=v1.7.20-20260615092907";

const SESSION_STATE_KEY = "crystal-forge-session-state-v1";
const BUILD_NOTES_SEEN_KEY = "crystal-forge-build-notes-seen-v1";
// Auto-saved snapshot in localStorage. Written on pagehide / visibility-hidden
// so closing the tab does not lose progress. Read as a fallback when
// sessionStorage is empty at boot.
const AUTO_SAVE_KEY = "crystal-forge-auto-save-v1";

// Three local save slots. Slot 1 reuses the original MANUAL_SAVE_KEY so
// existing local saves keep loading; slots 2 and 3 use parallel keys.
export const MANUAL_SAVE_SLOTS = [
  { id: 1, label: "Slot 1", key: MANUAL_SAVE_KEY },
  { id: 2, label: "Slot 2", key: `${MANUAL_SAVE_KEY}-2` },
  { id: 3, label: "Slot 3", key: `${MANUAL_SAVE_KEY}-3` }
];

function getManualSaveStorageKey(slotId = 1) {
  const slot = MANUAL_SAVE_SLOTS.find((entry) => entry.id === Number(slotId)) ?? MANUAL_SAVE_SLOTS[0];
  return slot.key;
}

function normalizeConstructionSpeedMultiplier(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  if (SPEED_MULTIPLIERS.includes(numeric)) {
    return numeric;
  }

  return SPEED_MULTIPLIERS.reduce(
    (closest, option) => (Math.abs(option - numeric) < Math.abs(closest - numeric) ? option : closest),
    SPEED_MULTIPLIERS[0] ?? fallback
  );
}

function getStartPreset(preset = DEFAULT_START_PRESET) {
  return structuredClone(START_STATE_PRESETS[preset] ?? DEFAULT_START_STATE);
}

function getManualSaveRawText(slotId = 1) {
  return localStorage.getItem(getManualSaveStorageKey(slotId));
}

function getSessionSaveRawText() {
  try {
    return sessionStorage.getItem(SESSION_STATE_KEY);
  } catch (error) {
    return null;
  }
}

export function getSeenBuildNotesVersion() {
  try {
    return localStorage.getItem(BUILD_NOTES_SEEN_KEY);
  } catch (error) {
    return null;
  }
}

export function markBuildNotesVersionSeen(version) {
  const normalizedVersion = String(version ?? "").trim();
  if (!normalizedVersion) {
    return;
  }
  try {
    localStorage.setItem(BUILD_NOTES_SEEN_KEY, normalizedVersion);
  } catch (error) {
    // Ignore storage failures so the modal never blocks app use.
  }
}

export function createInitialState(preset = DEFAULT_START_PRESET) {
  const startState = getStartPreset(preset);
  const isTestingPreset = preset === "testing";
  const initialVehicles = createDefaultVehicleFleet(
    isTestingPreset
      ? { scoutBuggy: 2, trailBuggy: 2, siegeBuggy: 1, elementalSkiff: 1, elementalFrigate: 1, grandElementalAirship: 1 }
      : { scoutBuggy: 1, trailBuggy: 1, siegeBuggy: 0, elementalSkiff: 0, elementalFrigate: 0, grandElementalAirship: 0 }
  );
  const state = {
    version: SAVE_VERSION,
    selectedRarity: startState.selectedRarity,
    buildingFilter: startState.buildingFilter,
    constructionSpeedMultiplier: startState.constructionSpeedMultiplier,
    crystals: normalizeCrystalCollection(startState.crystals),
    shards: normalizeShardCollection(startState.shards),
    resources: structuredClone(startState.resources),
    citizens: normalizeCitizens(startState.citizens),
    citizenRarityRoster: createCitizenRarityRoster(startState.citizens),
    citizenDefinitions: createCitizenDefinitionsSnapshot(),
    vehicles: initialVehicles,
    expeditions: createDefaultExpeditionState(),
    uniqueCitizens: [],
    behemoths: [],
    npcs: [],
    awakened: [],
    playerCharacters: [],
    craftingItems: [],
    cooldowns: [],
    buildings: [],
    rollTables: createDefaultRollTables(),
    buildingCatalog: structuredClone(BASE_BUILDING_CATALOG),
    districts: createDefaultDistrictState(),
    map: {
      cells: createMapCells()
    },
    districtSummary: [],
    cityStats: {},
    constructionPriority: [],
    activeConstructionIds: [],
    pausedConstructionIds: [],
    events: { active: [], recent: [], scheduled: [] },
    chronicleNotes: {},
    weatherOverrides: {},
    historyLog: [],
    calendar: { dayOffset: 0 },
    dailyCitySnapshots: {},
    driftEvolution: createDefaultDriftEvolutionState(),
    townFocus: createDefaultTownFocusState(),
    sessionSnapshots: [],
    adminOverrides: {
      goods: 0
    },
    dailyResourceModifiers: createDefaultDailyResourceModifiers(),
    settings: structuredClone(startState.settings),
    ui: {
      selectedBuildingId: null,
      selectedMapCell: null,
      empowermentSlotBuildingId: null,
      adminUnlocked: false,
      adminOpen: false,
      lastManifestResult: null
    }
  };

  syncCitizenTotalsFromRoster(state);
  syncDriftEvolutionState(state);
  normalizeConstructionPriority(state);
  state.districtSummary = getDistrictSummary(state);
  recalculateCityStats(state);
  captureDailyCitySnapshot(state);
  return state;
}

export function createSingleCommonCrystalResetState() {
  const state = createInitialState("session");
  state.selectedRarity = "Common";
  state.crystals = createEmptyCollection(0);
  state.crystals.Common = 1;
  state.shards = createEmptyCollection(0);
  state.resources = {
    gold: 0,
    food: 0,
    materials: 0,
    salvage: 0,
    mana: 0,
    population: 0,
    prosperity: 0
  };
  state.citizens = createEmptyCitizenCollection(0);
  state.citizenRarityRoster = createCitizenRarityRoster();
  state.vehicles = createDefaultVehicleFleet({ scoutBuggy: 1, trailBuggy: 1, siegeBuggy: 0, elementalSkiff: 0, elementalFrigate: 0, grandElementalAirship: 0 });
  state.expeditions = createDefaultExpeditionState();
  state.uniqueCitizens = [];
  state.behemoths = [];
  state.npcs = [];
  state.awakened = [];
  state.playerCharacters = [];
  state.craftingItems = [];
  state.buildings = [];
  state.constructionPriority = [];
  state.activeConstructionIds = [];
  state.pausedConstructionIds = [];
  state.events = { active: [], recent: [], scheduled: [] };
  state.chronicleNotes = {};
  state.historyLog = [];
  state.calendar = { dayOffset: 0 };
  state.dailyCitySnapshots = {};
  state.driftEvolution = createDefaultDriftEvolutionState();
  state.townFocus = createDefaultTownFocusState();
  state.sessionSnapshots = [];
  state.settings = structuredClone(getStartPreset("session").settings);
  state.ui = {
    selectedBuildingId: null,
    selectedMapCell: null,
    adminUnlocked: false,
    adminOpen: false,
    lastManifestResult: null
  };
  state.districts = createDefaultDistrictState();
  state.rollTables = createDefaultRollTables();
  state.buildingCatalog = structuredClone(BASE_BUILDING_CATALOG);
  state.map = { cells: createMapCells() };
  syncCitizenTotalsFromRoster(state);
  syncDriftEvolutionState(state);
  normalizeConstructionPriority(state);
  state.districtSummary = getDistrictSummary(state);
  recalculateCityStats(state);
  return state;
}

export function createLiveSessionResetState() {
  return createInitialState("session");
}

export function createTestingBalanceResetState() {
  return createInitialState("testing");
}

function stripSnapshotsForSnapshot(state) {
  return {
    ...structuredClone(state),
    sessionSnapshots: []
  };
}

export function createSessionSnapshot(state, name = "Session Snapshot") {
  return {
    id: createId("snapshot"),
    name: String(name || "Session Snapshot").trim() || "Session Snapshot",
    createdAt: Date.now(),
    dateLabel: formatDate(state.calendar.dayOffset),
    buildingCount: state.buildings.length,
    payload: stripSnapshotsForSnapshot(state)
  };
}

export function restoreSessionSnapshot(snapshot) {
  return validateAndMigrateSave(snapshot?.payload ?? null);
}

function normalizeBuildingCatalog(sourceCatalog) {
  const baseCatalog = structuredClone(BASE_BUILDING_CATALOG);
  return Object.fromEntries(
    Object.entries(baseCatalog).map(([key, baseEntry]) => {
      const sourceEntry = sourceCatalog?.[key] ?? {};
      const entry = {
        ...baseEntry,
        ...sourceEntry,
        imagePath: sourceEntry.imagePath ?? baseEntry.imagePath ?? null
      };

      return [
      key,
      {
        ...entry,
        flavorText:
          entry.flavorText ??
          buildFlavorText({
            name: entry.name,
            district: entry.district,
            tags: entry.tags ?? [],
            rarity: entry.rarity
          })
      }
    ];
    })
  );
}

function normalizeBuildings(buildings, catalog) {
  if (!Array.isArray(buildings)) {
    return [];
  }
  return buildings.map((building) => ({
    ...building,
    isRuined: Boolean(building.isRuined),
    heroSupport: building.heroSupport === true,
    expertSupport: building.expertSupport === true,
    imagePath: building.imagePath || catalog?.[building.key]?.imagePath || null,
    imageData:
      typeof building.imageData === "string" && building.imageData.startsWith("data:image/")
        ? building.imageData
        : "",
    flavorText: building.flavorText ?? catalog?.[building.key]?.flavorText ?? null,
    mapPosition:
      typeof building.mapPosition?.q === "number" && typeof building.mapPosition?.r === "number"
        ? { q: building.mapPosition.q, r: building.mapPosition.r }
        : null
  }));
}

function normalizeSelectedMapCell(selectedMapCell) {
  if (
    typeof selectedMapCell?.q === "number" &&
    typeof selectedMapCell?.r === "number"
  ) {
    return { q: selectedMapCell.q, r: selectedMapCell.r };
  }
  return null;
}

function normalizeRollTables(sourceTables) {
  const baseTables = createDefaultRollTables();
  if (!sourceTables || typeof sourceTables !== "object") {
    return baseTables;
  }
  // Every building name the saved tables already reference, across all rarities.
  // Used so genuinely-new buildings get merged into old saves while GM removals
  // and moves are preserved (a building the GM pulled won't reappear).
  const knownNames = new Set();
  for (const list of Object.values(sourceTables)) {
    if (Array.isArray(list)) {
      for (const name of list) {
        knownNames.add(name);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(baseTables).map(([rarity, defaultBuildings]) => {
      const saved = Array.isArray(sourceTables[rarity]) ? [...sourceTables[rarity]] : null;
      if (!saved) {
        return [rarity, defaultBuildings];
      }
      // Append default-pool entries that are brand new (not present in any saved
      // table yet), so newly shipped buildings become rollable in existing saves.
      const additions = defaultBuildings.filter((name) => !knownNames.has(name));
      return [rarity, [...saved, ...additions]];
    })
  );
}

function normalizeDistrictState(sourceDistricts) {
  const baseDistricts = createDefaultDistrictState();
  if (!sourceDistricts || typeof sourceDistricts !== "object") {
    return baseDistricts;
  }
  return {
    definitions: {
      ...baseDistricts.definitions,
      ...(sourceDistricts.definitions ?? {})
    },
    levelOverrides: {
      ...(sourceDistricts.levelOverrides ?? {})
    }
  };
}

function normalizeSettings(sourceSettings, baseSettings) {
  const normalized = {
    ...baseSettings,
    ...(sourceSettings ?? {})
  };
  const allowedDensities = new Set(["comfort", "compact", "dense"]);
  normalized.muted = normalized.muted === true;
  normalized.quickManifestations = normalized.quickManifestations === true;
  normalized.onboardingDismissed = normalized.onboardingDismissed === true;
  normalized.liveSessionView = normalized.liveSessionView === true;
  normalized.uiDensity = allowedDensities.has(normalized.uiDensity) ? normalized.uiDensity : (baseSettings?.uiDensity ?? "compact");
  normalized.conciseMode = normalized.conciseMode === true;
  const allowedTextSizes = new Set(["small", "medium", "large"]);
  normalized.textSize = allowedTextSizes.has(normalized.textSize) ? normalized.textSize : (baseSettings?.textSize ?? "large");
  normalized.decisionSnoozes =
    normalized.decisionSnoozes && typeof normalized.decisionSnoozes === "object"
      ? Object.fromEntries(
          Object.entries(normalized.decisionSnoozes)
            .filter(([key, value]) => typeof key === "string" && key.trim() && Number.isFinite(Number(value)) && Number(value) > 0)
            .map(([key, value]) => [key, Math.max(1, Math.round(Number(value)))])
        )
      : {};
  normalized.decisionHistory = Array.isArray(normalized.decisionHistory)
    ? normalized.decisionHistory
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : createId("decision-history"),
          kind: typeof entry.kind === "string" && entry.kind.trim() ? entry.kind.trim() : "resolved",
          title: typeof entry.title === "string" ? entry.title.trim() : "",
          detail: typeof entry.detail === "string" ? entry.detail.trim() : "",
          outcome: typeof entry.outcome === "string" ? entry.outcome.trim() : "",
          date: typeof entry.date === "string" ? entry.date.trim() : formatDate(0),
          dayOffset: Number.isFinite(Number(entry.dayOffset)) ? Number(entry.dayOffset) : 0,
          iconKey: typeof entry.iconKey === "string" && entry.iconKey.trim() ? entry.iconKey.trim() : "route"
        }))
        .filter((entry) => entry.title || entry.outcome)
        .slice(0, 10)
    : [];
  normalized.claimedGoalRewardIds = Array.isArray(normalized.claimedGoalRewardIds)
    ? [...new Set(normalized.claimedGoalRewardIds.filter((entry) => typeof entry === "string" && entry.trim()))]
    : [];
  normalized.pinnedBuildingIds = Array.isArray(normalized.pinnedBuildingIds)
    ? [...new Set(normalized.pinnedBuildingIds.filter((id) => typeof id === "string" && id.trim()))]
    : [];
  normalized.lockedMapBuildingIds = Array.isArray(normalized.lockedMapBuildingIds)
    ? [...new Set(normalized.lockedMapBuildingIds.filter((id) => typeof id === "string" && id.trim()))]
    : [];
  normalized.mapPresets = Array.isArray(normalized.mapPresets)
    ? normalized.mapPresets.filter((preset) => preset && typeof preset === "object").slice(0, 8)
    : [];
  delete normalized.activeSaveSlot;
  delete normalized.sharedStateUrl;
  delete normalized.autoLoadSharedState;
  delete normalized.firebasePublishedRealmId;
  delete normalized.firebaseWorkingRealmId;
  delete normalized.firebasePublisherUid;
  delete normalized.firebaseWorkflowVersion;
  delete normalized.firebaseAutoLoad;
  delete normalized.firebaseLiveSync;
  delete normalized.firebaseAutoPublish;
  return normalized;
}

function normalizeAdminOverrides(sourceOverrides, baseOverrides) {
  const normalized = {
    ...baseOverrides,
    ...(sourceOverrides ?? {})
  };
  normalized.goods = Number.isFinite(Number(normalized.goods)) ? Number(normalized.goods) : 0;
  return normalized;
}

const DAILY_RESOURCE_MODIFIER_KEYS = ["gold", "food", "materials", "salvage", "mana", "prosperity"];

export function createDefaultDailyResourceModifiers() {
  return Object.fromEntries(DAILY_RESOURCE_MODIFIER_KEYS.map((key) => [key, 0]));
}

function normalizeDailyResourceModifiers(source) {
  const normalized = createDefaultDailyResourceModifiers();
  if (source && typeof source === "object") {
    for (const key of DAILY_RESOURCE_MODIFIER_KEYS) {
      const numeric = Number(source[key]);
      if (Number.isFinite(numeric)) {
        normalized[key] = Math.round(numeric * 100) / 100;
      }
    }
  }
  return normalized;
}

function migrateLegacyCrystalUpgradeBuildings(state) {
  const legacyUpgradeBuildings = state.buildings.filter((building) => building.name === "Crystal Upgrade");
  if (!legacyUpgradeBuildings.length) {
    return;
  }

  const removedIds = new Set(legacyUpgradeBuildings.map((building) => building.id));
  const grantedCrystals = {};

  for (const building of legacyUpgradeBuildings) {
    const targetRarity = getNextRarity(building.rarity);
    if (!targetRarity) {
      continue;
    }

    // Approximate how many upgrades this old building represented so we can refund value as crystals.
    const manifestCount = Math.max(
      1,
      Array.isArray(building.history)
        ? building.history.filter((entry) => entry?.type === "manifest").length
        : Math.round(Math.max(1, Number(building.quality ?? 100)) / 100)
    );

    grantedCrystals[targetRarity] = (grantedCrystals[targetRarity] ?? 0) + manifestCount;
  }

  state.buildings = state.buildings.filter((building) => !removedIds.has(building.id));
  state.constructionPriority = state.constructionPriority.filter((buildingId) => !removedIds.has(buildingId));
  state.pausedConstructionIds = state.pausedConstructionIds.filter((buildingId) => !removedIds.has(buildingId));

  if (removedIds.has(state.ui?.selectedBuildingId)) {
    state.ui.selectedBuildingId = null;
  }

  for (const [rarity, amount] of Object.entries(grantedCrystals)) {
    state.crystals[rarity] = (state.crystals[rarity] ?? 0) + amount;
  }

  const summary = Object.entries(grantedCrystals).map(([rarity, amount]) => `${amount} ${rarity}`).join(", ");
  if (summary) {
    state.historyLog.unshift({
      category: "Crystal Upgrade",
      title: "Legacy crystal upgrades consolidated",
      details: `Old Crystal Upgrade buildings were removed and converted into crystal gains: ${summary}.`,
      date: formatDate(state.calendar.dayOffset)
    });
  }
}

function hasAdminCitizenHistory(rawSave) {
  return Array.isArray(rawSave?.historyLog) &&
    rawSave.historyLog.some((entry) => {
      const title = String(entry?.title ?? "");
      const details = String(entry?.details ?? "");
      return entry?.category === "Citizens" && /admin/i.test(`${title} ${details}`);
    });
}

function hasLikelyCitizenInflation(nextState, rawSave) {
  const totalPopulation = Object.values(nextState.citizens ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const suspiciousClasses = ["Merchants", "Nobles", "Scribes", "Soldiers"];
  return (
    Number(rawSave?.version ?? 0) < 11 &&
    totalPopulation > 100000 &&
    suspiciousClasses.some((citizenClass) => Number(nextState.citizens?.[citizenClass] ?? 0) > 1000)
  );
}

function repairLikelyCitizenInflation(rawSave, nextState, base) {
  if (!hasLikelyCitizenInflation(nextState, rawSave) || hasAdminCitizenHistory(rawSave)) {
    return;
  }

  nextState.citizens = structuredClone(base.citizens);
  nextState.citizenRarityRoster = createCitizenRarityRoster(base.citizens);
  syncCitizenTotalsFromRoster(nextState);
  nextState.historyLog = [
    {
      category: "Citizens",
      title: "Citizen inflation repaired",
      details: "A pre-v1.2.59 save had runaway citizen growth from legacy migration and was restored to the current baseline roster.",
      date: formatDate(nextState.calendar?.dayOffset ?? 0)
    },
    ...(Array.isArray(nextState.historyLog) ? nextState.historyLog : [])
  ];
}

function normalizeEmpowermentSlot(state) {
  const slotBuildingId = state.ui?.empowermentSlotBuildingId ?? null;
  if (!slotBuildingId) {
    state.ui.empowermentSlotBuildingId = null;
    return;
  }

  const building = state.buildings.find((entry) => entry.id === slotBuildingId);
  if (!building || !building.isComplete || building.isRuined) {
    state.ui.empowermentSlotBuildingId = null;
  }
}

export function validateAndMigrateSave(rawSave) {
  const base = createInitialState();
  if (!rawSave || typeof rawSave !== "object") {
    return base;
  }

  const normalizedCatalog = normalizeBuildingCatalog(rawSave.buildingCatalog);
  const normalizedCitizens = normalizeCitizens(rawSave.citizens ?? base.citizens);
  const normalizedCitizenRarityRoster = normalizeCitizenRarityRoster(rawSave.citizenRarityRoster, normalizedCitizens);

  const nextState = {
    ...base,
    ...rawSave,
    version: SAVE_VERSION,
    constructionSpeedMultiplier: normalizeConstructionSpeedMultiplier(
      rawSave.constructionSpeedMultiplier,
      base.constructionSpeedMultiplier
    ),
    crystals: normalizeCrystalCollection(rawSave.crystals ?? base.crystals),
    shards: normalizeShardCollection(rawSave.shards ?? base.shards),
    resources: { ...base.resources, ...(rawSave.resources ?? {}) },
    citizens: normalizedCitizens,
    citizenRarityRoster: normalizedCitizenRarityRoster,
    buildings: normalizeBuildings(rawSave.buildings, normalizedCatalog),
    vehicles: normalizeVehicleFleet(rawSave.vehicles ?? base.vehicles),
    expeditions: normalizeExpeditionState(rawSave.expeditions ?? base.expeditions),
    uniqueCitizens: normalizeUniqueCitizens(rawSave.uniqueCitizens ?? base.uniqueCitizens),
    behemoths: normalizeBehemoths(rawSave.behemoths ?? base.behemoths),
    npcs: normalizeNpcs(rawSave.npcs ?? base.npcs),
    awakened: normalizeAwakenedRoster(rawSave.awakened ?? base.awakened),
    playerCharacters: Array.isArray(rawSave.playerCharacters) ? rawSave.playerCharacters : [],
    craftingItems: normalizeCraftingItems(rawSave.craftingItems ?? []),
    cooldowns: normalizeCooldowns(rawSave.cooldowns ?? []),
    rollTables: normalizeRollTables(rawSave.rollTables),
    buildingCatalog: normalizedCatalog,
    districts: normalizeDistrictState(rawSave.districts),
    map: {
      cells: createMapCells()
    },
    constructionPriority: Array.isArray(rawSave.constructionPriority) ? rawSave.constructionPriority : [],
    activeConstructionIds: Array.isArray(rawSave.activeConstructionIds) ? rawSave.activeConstructionIds : [],
    pausedConstructionIds: Array.isArray(rawSave.pausedConstructionIds) ? rawSave.pausedConstructionIds : [],
    events: {
      active: Array.isArray(rawSave.events?.active) ? rawSave.events.active : [],
      recent: Array.isArray(rawSave.events?.recent) ? rawSave.events.recent : [],
      scheduled: Array.isArray(rawSave.events?.scheduled) ? rawSave.events.scheduled : []
    },
    chronicleNotes: rawSave.chronicleNotes && typeof rawSave.chronicleNotes === "object" ? rawSave.chronicleNotes : {},
    weatherOverrides: rawSave.weatherOverrides && typeof rawSave.weatherOverrides === "object" ? rawSave.weatherOverrides : {},
    historyLog: Array.isArray(rawSave.historyLog) ? rawSave.historyLog : [],
    calendar: { dayOffset: Number(rawSave.calendar?.dayOffset ?? 0) },
    dailyCitySnapshots:
      rawSave.dailyCitySnapshots && typeof rawSave.dailyCitySnapshots === "object"
        ? structuredClone(rawSave.dailyCitySnapshots)
        : {},
    driftEvolution: normalizeDriftEvolutionState(rawSave.driftEvolution, Array.isArray(rawSave.buildings) ? rawSave.buildings.length : 0),
    townFocus: normalizeTownFocusState(rawSave.townFocus),
    sessionSnapshots: Array.isArray(rawSave.sessionSnapshots) ? rawSave.sessionSnapshots : [],
    adminOverrides: normalizeAdminOverrides(rawSave.adminOverrides, base.adminOverrides),
    dailyResourceModifiers: normalizeDailyResourceModifiers(rawSave.dailyResourceModifiers),
    settings: normalizeSettings(rawSave.settings, base.settings),
    ui: {
      ...base.ui,
      ...(rawSave.ui ?? {}),
      selectedMapCell: normalizeSelectedMapCell(rawSave.ui?.selectedMapCell)
    },
    citizenDefinitions: createCitizenDefinitionsSnapshot()
  };

  if (!Array.isArray(rawSave?.activeConstructionIds)) {
    const seededActiveIds = nextState.constructionPriority
      .filter((buildingId) => !(nextState.pausedConstructionIds ?? []).includes(buildingId))
      .slice(0, getDriftConstructionSlots(nextState));
    nextState.activeConstructionIds = seededActiveIds;
  }

  syncCitizenTotalsFromRoster(nextState);
  repairLikelyCitizenInflation(rawSave, nextState, base);
  // Old saves may still contain Crystal Upgrade as a building, so normalize them into crystals on load.
  migrateLegacyCrystalUpgradeBuildings(nextState);
  syncDriftEvolutionState(nextState);
  normalizeConstructionPriority(nextState);
  normalizeEmpowermentSlot(nextState);
  nextState.districtSummary = getDistrictSummary(nextState);
  recalculateCityStats(nextState);
  captureDailyCitySnapshot(nextState);
  return nextState;
}

export function loadGameState() {
  const sessionParsed = safeJsonParse(getSessionSaveRawText());
  if (sessionParsed) {
    return validateAndMigrateSave(sessionParsed);
  }
  // Fallback: when sessionStorage is empty (closed tab, fresh tab, browser
  // restart) try the auto-saved snapshot in localStorage before starting
  // a brand new game.
  try {
    const autoParsed = safeJsonParse(localStorage.getItem(AUTO_SAVE_KEY));
    if (autoParsed) {
      return validateAndMigrateSave(autoParsed);
    }
  } catch (error) {
    // localStorage may be unavailable (privacy mode); fall through.
  }
  return createInitialState();
}

export function saveAutoLocalState(state) {
  try {
    const serializable = createSerializableState(state, { autoSavedAt: Date.now() });
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(serializable));
  } catch (error) {
    // Quota or privacy mode — silent failure keeps the in-memory game alive.
  }
}

export function clearAutoLocalState() {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

export function getAutoSaveMeta() {
  try {
    const parsed = safeJsonParse(localStorage.getItem(AUTO_SAVE_KEY));
    if (!parsed) {
      return null;
    }
    return {
      autoSavedAt: Number(parsed.autoSavedAt ?? 0) || null,
      buildingCount: Array.isArray(parsed.buildings) ? parsed.buildings.length : 0,
      population: Number(parsed.resources?.population ?? 0) || 0
    };
  } catch (error) {
    return null;
  }
}

export function createSerializableState(state, extraFields = {}) {
  return {
    ...state,
    ...extraFields,
    ui: {
      ...state.ui,
      adminOpen: false
    }
  };
}

export function saveGameState(state) {
  try {
    const serializable = createSerializableState(state, {
      sessionSavedAt: Date.now()
    });
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(serializable));
  } catch (error) {
    // Ignore session storage failures and keep the in-memory game running.
  }
  return state;
}

export function clearSessionState() {
  try {
    sessionStorage.removeItem(SESSION_STATE_KEY);
  } catch (error) {
    // Ignore session storage failures.
  }
}

export function saveManualState(state, slotId = 1) {
  const serializable = createSerializableState(state, {
    manualSavedAt: Date.now()
  });
  localStorage.setItem(getManualSaveStorageKey(slotId), JSON.stringify(serializable));
  return serializable.manualSavedAt;
}

export function loadManualState(slotId = 1) {
  const rawText = getManualSaveRawText(slotId);
  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    throw new Error("This slot has no local save yet.");
  }
  return validateAndMigrateSave(parsed);
}

export function getManualSaveMeta(slotId = 1) {
  const rawText = getManualSaveRawText(slotId);
  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    return null;
  }
  return {
    slotId: Number(slotId),
    manualSavedAt: Number(parsed.manualSavedAt ?? 0) || null,
    buildingCount: Array.isArray(parsed.buildings) ? parsed.buildings.length : 0,
    population: Number(parsed.resources?.population ?? 0) || 0
  };
}

export function getAllManualSaveMeta() {
  return MANUAL_SAVE_SLOTS.map((slot) => {
    return (
      getManualSaveMeta(slot.id) ?? {
        slotId: slot.id,
        manualSavedAt: null,
        buildingCount: 0,
        population: 0
      }
    );
  });
}

export function deleteManualSave(slotId = 1) {
  localStorage.removeItem(getManualSaveStorageKey(slotId));
}

export function exportSave(state) {
  return JSON.stringify(state, null, 2);
}

export function importSave(saveText) {
  const parsed = safeJsonParse(saveText);
  if (!parsed) {
    throw new Error("Invalid save JSON.");
  }
  return validateAndMigrateSave(parsed);
}

export function resetSave() {
  for (const slot of MANUAL_SAVE_SLOTS) {
    localStorage.removeItem(slot.key);
  }
  clearAutoLocalState();
  return createInitialState();
}
