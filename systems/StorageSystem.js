import {
  DEFAULT_START_STATE,
  SAVE_VERSION,
  STORAGE_KEY,
  createDefaultDistrictState,
  createDefaultRollTables
} from "../content/Config.js";
import { BASE_BUILDING_CATALOG } from "../content/BuildingCatalog.js";
import { safeJsonParse } from "../engine/Utils.js";
import { createCitizenDefinitionsSnapshot, normalizeCitizens } from "./CitizenSystem.js";
import { normalizeCrystalCollection } from "./CrystalSystem.js";
import { recalculateCityStats } from "./CityStatsSystem.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { normalizeShardCollection } from "./ShardSystem.js";

export function createInitialState() {
  const state = {
    version: SAVE_VERSION,
    selectedRarity: DEFAULT_START_STATE.selectedRarity,
    buildingFilter: DEFAULT_START_STATE.buildingFilter,
    constructionSpeedMultiplier: DEFAULT_START_STATE.constructionSpeedMultiplier,
    crystals: normalizeCrystalCollection(DEFAULT_START_STATE.crystals),
    shards: normalizeShardCollection(DEFAULT_START_STATE.shards),
    resources: structuredClone(DEFAULT_START_STATE.resources),
    citizens: normalizeCitizens(DEFAULT_START_STATE.citizens),
    citizenDefinitions: createCitizenDefinitionsSnapshot(),
    buildings: [],
    rollTables: createDefaultRollTables(),
    buildingCatalog: structuredClone(BASE_BUILDING_CATALOG),
    districts: createDefaultDistrictState(),
    districtSummary: [],
    cityStats: {},
    events: { active: [], recent: [] },
    historyLog: [],
    calendar: { dayOffset: 0 },
    settings: structuredClone(DEFAULT_START_STATE.settings),
    ui: {
      selectedBuildingId: null,
      adminOpen: false,
      lastManifestResult: null
    }
  };

  state.resources.population = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
  state.districtSummary = getDistrictSummary(state);
  recalculateCityStats(state);
  return state;
}

function normalizeBuildingCatalog(sourceCatalog) {
  return { ...structuredClone(BASE_BUILDING_CATALOG), ...(sourceCatalog ?? {}) };
}

function normalizeRollTables(sourceTables) {
  const baseTables = createDefaultRollTables();
  if (!sourceTables || typeof sourceTables !== "object") {
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

  const nextState = {
    ...base,
    ...rawSave,
    version: SAVE_VERSION,
    crystals: normalizeCrystalCollection(rawSave.crystals ?? base.crystals),
    shards: normalizeShardCollection(rawSave.shards ?? base.shards),
    resources: { ...base.resources, ...(rawSave.resources ?? {}) },
    citizens: normalizeCitizens(rawSave.citizens ?? base.citizens),
    buildings: Array.isArray(rawSave.buildings) ? rawSave.buildings : [],
    rollTables: normalizeRollTables(rawSave.rollTables),
    buildingCatalog: normalizeBuildingCatalog(rawSave.buildingCatalog),
    districts: normalizeDistrictState(rawSave.districts),
    events: {
      active: Array.isArray(rawSave.events?.active) ? rawSave.events.active : [],
      recent: Array.isArray(rawSave.events?.recent) ? rawSave.events.recent : []
    },
    historyLog: Array.isArray(rawSave.historyLog) ? rawSave.historyLog : [],
    calendar: { dayOffset: Number(rawSave.calendar?.dayOffset ?? 0) },
    settings: { ...base.settings, ...(rawSave.settings ?? {}) },
    ui: { ...base.ui, ...(rawSave.ui ?? {}) },
    citizenDefinitions: createCitizenDefinitionsSnapshot()
  };

  nextState.resources.population = Object.values(nextState.citizens).reduce((sum, value) => sum + value, 0);
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
