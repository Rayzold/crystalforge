import { DISTRICT_LEVEL_THRESHOLDS } from "../content/DistrictConfig.js";

function getLevelFromCount(count) {
  return DISTRICT_LEVEL_THRESHOLDS.reduce((level, threshold, index) => {
    if (count >= threshold) {
      return index + 1;
    }
    return level;
  }, 0);
}

export function getDistrictSummary(state) {
  return Object.values(state.districts.definitions).map((definition) => {
    const count = state.buildings.filter((building) => building.district === definition.name).length;
    const activeCount = state.buildings.filter(
      (building) => building.district === definition.name && building.isComplete
    ).length;
    const derivedLevel = getLevelFromCount(count);
    const manualLevel = state.districts.levelOverrides[definition.name];

    return {
      name: definition.name,
      definition,
      buildingCount: count,
      activeCount,
      level: typeof manualLevel === "number" ? manualLevel : derivedLevel,
      derivedLevel,
      bonusText: definition.bonusText
    };
  });
}

export function setDistrictDefinition(state, districtName, nextDefinition) {
  state.districts.definitions[districtName] = {
    ...(state.districts.definitions[districtName] ?? {}),
    ...nextDefinition,
    name: districtName
  };
}

export function setDistrictLevelOverride(state, districtName, level) {
  if (level === null || level === undefined || Number.isNaN(Number(level))) {
    delete state.districts.levelOverrides[districtName];
    return;
  }
  state.districts.levelOverrides[districtName] = Math.max(0, Number(level));
}

export function resetDistrictLevels(state) {
  state.districts.levelOverrides = {};
}
