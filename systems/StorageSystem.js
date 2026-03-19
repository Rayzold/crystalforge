import {
  DEFAULT_START_PRESET,
  DEFAULT_START_STATE,
  MANUAL_SAVE_KEY,
  SAVE_VERSION,
  START_STATE_PRESETS,
  STORAGE_KEY,
  createEmptyCitizenCollection,
  createEmptyCollection,
  createDefaultDistrictState,
  createDefaultRollTables
} from "../content/Config.js";
import { BASE_BUILDING_CATALOG, buildFlavorText } from "../content/BuildingCatalog.js";
import { createId, safeJsonParse } from "../engine/Utils.js";
import { formatDate } from "./CalendarSystem.js";
import { createCitizenDefinitionsSnapshot, normalizeCitizens } from "./CitizenSystem.js";
import { normalizeCrystalCollection } from "./CrystalSystem.js";
import { recalculateCityStats } from "./CityStatsSystem.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { normalizeShardCollection } from "./ShardSystem.js";
import { createMapCells } from "./MapSystem.js";
import { createDefaultDriftEvolutionState, normalizeDriftEvolutionState, syncDriftEvolutionState } from "./DriftEvolutionSystem.js";
import { normalizeConstructionPriority } from "./ConstructionSystem.js";
import { createDefaultTownFocusState, normalizeTownFocusState } from "./TownFocusSystem.js";

function getStartPreset(preset = DEFAULT_START_PRESET) {
  return structuredClone(START_STATE_PRESETS[preset] ?? DEFAULT_START_STATE);
}

export function createInitialState(preset = DEFAULT_START_PRESET) {
  const startState = getStartPreset(preset);
  const state = {
    version: SAVE_VERSION,
    selectedRarity: startState.selectedRarity,
    buildingFilter: startState.buildingFilter,
    constructionSpeedMultiplier: startState.constructionSpeedMultiplier,
    crystals: normalizeCrystalCollection(startState.crystals),
    shards: normalizeShardCollection(startState.shards),
    resources: structuredClone(startState.resources),
    citizens: normalizeCitizens(startState.citizens),
    citizenDefinitions: createCitizenDefinitionsSnapshot(),
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
    events: { active: [], recent: [], scheduled: [] },
    chronicleNotes: {},
    historyLog: [],
    calendar: { dayOffset: 0 },
    driftEvolution: createDefaultDriftEvolutionState(),
    townFocus: createDefaultTownFocusState(),
    sessionSnapshots: [],
    settings: structuredClone(startState.settings),
    ui: {
      selectedBuildingId: null,
      selectedMapCell: null,
      adminUnlocked: false,
      adminOpen: false,
      lastManifestResult: null
    }
  };

  state.resources.population = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
  syncDriftEvolutionState(state);
  normalizeConstructionPriority(state);
  state.districtSummary = getDistrictSummary(state);
  recalculateCityStats(state);
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
    mana: 0,
    population: 0,
    prosperity: 0
  };
  state.citizens = createEmptyCitizenCollection(0);
  state.buildings = [];
  state.constructionPriority = [];
  state.events = { active: [], recent: [], scheduled: [] };
  state.chronicleNotes = {};
  state.historyLog = [];
  state.calendar = { dayOffset: 0 };
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
  state.resources.population = 0;
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

function normalizeBuildingCatalog(sourceCatalog, sourceVersion = SAVE_VERSION) {
  const baseCatalog = structuredClone(BASE_BUILDING_CATALOG);
  const mergedCatalog =
    Number(sourceVersion ?? 0) < 7
      ? {
          ...baseCatalog,
          ...Object.fromEntries(
            Object.entries(sourceCatalog ?? {}).filter(([key]) => !baseCatalog[key])
          )
        }
      : { ...baseCatalog, ...(sourceCatalog ?? {}) };
  return Object.fromEntries(
    Object.entries(mergedCatalog).map(([key, entry]) => [
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
    ])
  );
}

function normalizeBuildings(buildings, catalog) {
  if (!Array.isArray(buildings)) {
    return [];
  }
  return buildings.map((building) => ({
    ...building,
    isRuined: Boolean(building.isRuined),
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

function normalizeRollTables(sourceTables, sourceVersion = SAVE_VERSION) {
  const baseTables = createDefaultRollTables();
  if (!sourceTables || typeof sourceTables !== "object") {
    return baseTables;
  }
  if (Number(sourceVersion ?? 0) < 7) {
    return baseTables;
  }
  return Object.fromEntries(
    Object.entries(baseTables).map(([rarity, buildings]) => [
      rarity,
      Array.isArray(sourceTables[rarity]) ? sourceTables[rarity] : buildings
    ])
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

export function validateAndMigrateSave(rawSave) {
  const base = createInitialState();
  if (!rawSave || typeof rawSave !== "object") {
    return base;
  }

  const normalizedCatalog = normalizeBuildingCatalog(rawSave.buildingCatalog, rawSave.version);

  const nextState = {
    ...base,
    ...rawSave,
    version: SAVE_VERSION,
    crystals: normalizeCrystalCollection(rawSave.crystals ?? base.crystals),
    shards: normalizeShardCollection(rawSave.shards ?? base.shards),
    resources: { ...base.resources, ...(rawSave.resources ?? {}) },
    citizens: normalizeCitizens(rawSave.citizens ?? base.citizens),
    buildings: normalizeBuildings(rawSave.buildings, normalizedCatalog),
    rollTables: normalizeRollTables(rawSave.rollTables, rawSave.version),
    buildingCatalog: normalizedCatalog,
    districts: normalizeDistrictState(rawSave.districts),
    map: {
      cells: createMapCells()
    },
    constructionPriority: Array.isArray(rawSave.constructionPriority) ? rawSave.constructionPriority : [],
    events: {
      active: Array.isArray(rawSave.events?.active) ? rawSave.events.active : [],
      recent: Array.isArray(rawSave.events?.recent) ? rawSave.events.recent : [],
      scheduled: Array.isArray(rawSave.events?.scheduled) ? rawSave.events.scheduled : []
    },
    chronicleNotes: rawSave.chronicleNotes && typeof rawSave.chronicleNotes === "object" ? rawSave.chronicleNotes : {},
    historyLog: Array.isArray(rawSave.historyLog) ? rawSave.historyLog : [],
    calendar: { dayOffset: Number(rawSave.calendar?.dayOffset ?? 0) },
    driftEvolution: normalizeDriftEvolutionState(rawSave.driftEvolution, Array.isArray(rawSave.buildings) ? rawSave.buildings.length : 0),
    townFocus: normalizeTownFocusState(rawSave.townFocus),
    sessionSnapshots: Array.isArray(rawSave.sessionSnapshots) ? rawSave.sessionSnapshots : [],
    settings: { ...base.settings, ...(rawSave.settings ?? {}) },
    ui: {
      ...base.ui,
      ...(rawSave.ui ?? {}),
      selectedMapCell: normalizeSelectedMapCell(rawSave.ui?.selectedMapCell)
    },
    citizenDefinitions: createCitizenDefinitionsSnapshot()
  };

  nextState.resources.population = Object.values(nextState.citizens).reduce((sum, value) => sum + value, 0);
  syncDriftEvolutionState(nextState);
  normalizeConstructionPriority(nextState);
  nextState.districtSummary = getDistrictSummary(nextState);
  recalculateCityStats(nextState);
  return nextState;
}

export function loadGameState() {
  const rawText = localStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse(rawText);
  return validateAndMigrateSave(parsed);
}

export function saveGameState(state) {
  const serializable = {
    ...state,
    ui: {
      ...state.ui,
      adminOpen: false
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

export function saveManualState(state) {
  const serializable = {
    ...state,
    manualSavedAt: Date.now(),
    ui: {
      ...state.ui,
      adminOpen: false
    }
  };
  localStorage.setItem(MANUAL_SAVE_KEY, JSON.stringify(serializable));
  return serializable.manualSavedAt;
}

export function loadManualState() {
  const rawText = localStorage.getItem(MANUAL_SAVE_KEY);
  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    throw new Error("No manual save found.");
  }
  return validateAndMigrateSave(parsed);
}

export function getManualSaveMeta() {
  const rawText = localStorage.getItem(MANUAL_SAVE_KEY);
  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    return null;
  }
  return {
    manualSavedAt: Number(parsed.manualSavedAt ?? 0) || null,
    buildingCount: Array.isArray(parsed.buildings) ? parsed.buildings.length : 0,
    population: Number(parsed.resources?.population ?? 0) || 0
  };
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
  localStorage.removeItem(STORAGE_KEY);
  return createInitialState();
}
