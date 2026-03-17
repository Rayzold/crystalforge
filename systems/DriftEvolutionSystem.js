import { BASE_BUILDING_CATALOG } from "../content/BuildingCatalog.js";
import { DISTRICT_LEVEL_THRESHOLDS, BASE_DISTRICT_CONFIG } from "../content/DistrictConfig.js";
import { DRIFT_EVOLUTION_STAGES, DRIFT_POPULATION_GOALS } from "../content/DriftEvolutionConfig.js";
import { createBuildingGameplayProfile } from "./BalanceSystem.js";

function getDistrictLevelFromCount(count) {
  return DISTRICT_LEVEL_THRESHOLDS.reduce((level, threshold, index) => {
    if (count >= threshold) {
      return index + 1;
    }
    return level;
  }, 0);
}

function calculateFullRosterRawPopulationSupport() {
  const catalogEntries = Object.values(BASE_BUILDING_CATALOG);
  const districtCounts = new Map();
  let total = 0;

  for (const entry of catalogEntries) {
    const profile = createBuildingGameplayProfile(entry);
    total += profile.citizenEffects.populationSupport ?? 0;
    districtCounts.set(entry.district, (districtCounts.get(entry.district) ?? 0) + 1);
  }

  for (const [districtName, count] of districtCounts.entries()) {
    const definition = BASE_DISTRICT_CONFIG[districtName];
    if (!definition) {
      continue;
    }
    const level = getDistrictLevelFromCount(count);
    total += (definition.bonuses.populationSupportFlat ?? 0) * level;
  }

  return total;
}

const FULL_ROSTER_RAW_POPULATION_SUPPORT = calculateFullRosterRawPopulationSupport();
const POPULATION_SUPPORT_SCALE =
  FULL_ROSTER_RAW_POPULATION_SUPPORT > 0
    ? (DRIFT_POPULATION_GOALS.optimalPopulation - DRIFT_POPULATION_GOALS.baseSupport) /
      FULL_ROSTER_RAW_POPULATION_SUPPORT
    : 1;

export function createDefaultDriftEvolutionState() {
  return {
    currentStageId: DRIFT_EVOLUTION_STAGES[0].id,
    unlockedStageIds: [DRIFT_EVOLUTION_STAGES[0].id],
    manifestedBuildingCount: 0
  };
}

export function getManifestedBuildingCount(state) {
  return state.buildings.length;
}

export function getCurrentDriftEvolution(state) {
  const currentId = state.driftEvolution?.currentStageId ?? DRIFT_EVOLUTION_STAGES[0].id;
  return (
    DRIFT_EVOLUTION_STAGES.find((stage) => stage.id === currentId) ??
    DRIFT_EVOLUTION_STAGES[0]
  );
}

export function getUnlockedDriftStages(state) {
  const unlockedIds = state.driftEvolution?.unlockedStageIds ?? [DRIFT_EVOLUTION_STAGES[0].id];
  return DRIFT_EVOLUTION_STAGES.filter((stage) => unlockedIds.includes(stage.id));
}

export function getNextDriftEvolutionStage(state) {
  const currentStage = getCurrentDriftEvolution(state);
  return DRIFT_EVOLUTION_STAGES.find((stage) => stage.threshold > currentStage.threshold) ?? null;
}

export function syncDriftEvolutionState(state) {
  const manifestedCount = getManifestedBuildingCount(state);
  const thresholdUnlockedStages = DRIFT_EVOLUTION_STAGES.filter((stage) => manifestedCount >= stage.threshold);
  const previousUnlockedIds = new Set(state.driftEvolution?.unlockedStageIds ?? []);
  const unlockedIds = new Set([...previousUnlockedIds, ...thresholdUnlockedStages.map((stage) => stage.id)]);
  const unlockedStages = DRIFT_EVOLUTION_STAGES.filter((stage) => unlockedIds.has(stage.id));
  const currentStage = unlockedStages[unlockedStages.length - 1] ?? DRIFT_EVOLUTION_STAGES[0];
  const newStages = thresholdUnlockedStages.filter((stage) => !previousUnlockedIds.has(stage.id));

  state.driftEvolution = {
    currentStageId: currentStage.id,
    unlockedStageIds: unlockedStages.map((stage) => stage.id),
    manifestedBuildingCount: manifestedCount
  };

  return {
    currentStage,
    newStages,
    manifestedCount
  };
}

export function normalizeDriftEvolutionState(sourceState, buildingCount = 0) {
  const base = createDefaultDriftEvolutionState();
  return {
    currentStageId: sourceState?.currentStageId ?? base.currentStageId,
    unlockedStageIds: Array.isArray(sourceState?.unlockedStageIds) && sourceState.unlockedStageIds.length
      ? sourceState.unlockedStageIds
      : base.unlockedStageIds,
    manifestedBuildingCount: Number(sourceState?.manifestedBuildingCount ?? buildingCount)
  };
}

export function getDriftConstructionSlots(state) {
  return getCurrentDriftEvolution(state).constructionSlots;
}

export function getDriftConstructionSpeedMultiplier(state) {
  return 1 + getCurrentDriftEvolution(state).constructionSpeedPercent / 100;
}

export function getBasePopulationSupport() {
  return DRIFT_POPULATION_GOALS.baseSupport;
}

export function scalePopulationSupport(rawSupport) {
  return Math.round(getBasePopulationSupport() + rawSupport * POPULATION_SUPPORT_SCALE);
}

export function getPopulationGoals() {
  return DRIFT_POPULATION_GOALS;
}

export function getFullRosterPopulationSupportTarget() {
  return scalePopulationSupport(FULL_ROSTER_RAW_POPULATION_SUPPORT);
}
