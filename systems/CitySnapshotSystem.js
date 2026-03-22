import { calculateDailyResourceDelta, getEmergencyStatus } from "./ResourceSystem.js";

function toConditionLabels(state) {
  const labels = [];
  const morale = Number(state.cityStats?.morale ?? 0);
  const health = Number(state.cityStats?.health ?? 0);
  const defense = Number(state.cityStats?.defense ?? 0);
  const security = Number(state.cityStats?.security ?? 0);
  const prosperity = Number(state.resources?.prosperity ?? 0);
  const support = Number(state.cityStats?.populationSupport ?? 0);
  const population = Number(state.resources?.population ?? 0);

  if (prosperity >= 150) labels.push("Booming");
  else if (prosperity <= 10) labels.push("Poor");

  if (morale >= 90) labels.push("Inspired");
  else if (morale <= 18) labels.push("Strained");

  if (health >= 80) labels.push("Healthy");
  else if (health <= 20) labels.push("Unwell");

  if (security >= 60 && defense >= 80) labels.push("Secure");
  else if (security <= 25 || defense <= 35) labels.push("Exposed");

  if (population > support) labels.push("Overcrowded");

  return labels.length ? labels : ["Steady"];
}

export function createDailyCitySnapshot(state) {
  const deltas = calculateDailyResourceDelta(state);
  const emergencyStatus = getEmergencyStatus(state);
  return {
    recordedAtDayOffset: state.calendar.dayOffset,
    resources: {
      gold: Number(state.resources.gold ?? 0),
      food: Number(state.resources.food ?? 0),
      materials: Number(state.resources.materials ?? 0),
      salvage: Number(state.resources.salvage ?? 0),
      mana: Number(state.resources.mana ?? 0),
      prosperity: Number(state.resources.prosperity ?? 0),
      population: Number(state.resources.population ?? 0)
    },
    cityStats: {
      morale: Number(state.cityStats?.morale ?? 0),
      health: Number(state.cityStats?.health ?? 0),
      defense: Number(state.cityStats?.defense ?? 0),
      security: Number(state.cityStats?.security ?? 0),
      prestige: Number(state.cityStats?.prestige ?? 0),
      goods: Number(state.cityStats?.goods ?? 0),
      populationSupport: Number(state.cityStats?.populationSupport ?? 0)
    },
    deltas: {
      gold: Number(deltas.gold ?? 0),
      food: Number(deltas.food ?? 0),
      materials: Number(deltas.materials ?? 0),
      salvage: Number(deltas.salvage ?? 0),
      mana: Number(deltas.mana ?? 0),
      prosperity: Number(deltas.prosperity ?? 0)
    },
    conditions: toConditionLabels(state),
    emergencies: emergencyStatus.emergencies.map((entry) => entry.label)
  };
}

export function captureDailyCitySnapshot(state) {
  const key = String(state.calendar.dayOffset);
  state.dailyCitySnapshots = state.dailyCitySnapshots ?? {};
  state.dailyCitySnapshots[key] = createDailyCitySnapshot(state);
}

export function getDailyCitySnapshot(state, dayOffset) {
  const key = String(dayOffset);
  return state.dailyCitySnapshots?.[key] ?? (dayOffset === state.calendar.dayOffset ? createDailyCitySnapshot(state) : null);
}
