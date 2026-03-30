// Expedition vehicles define how many missions can run at once and whether a
// mission benefits from faster travel through the air.
export const VEHICLE_DEFINITIONS = {
  caravanWagon: {
    id: "caravanWagon",
    name: "Caravan Wagon",
    emoji: "🛻",
    type: "land",
    timeMultiplier: 1,
    cargoMultiplier: 1.15,
    summary: "Reliable land transport for most expeditions."
  },
  surveyWalker: {
    id: "surveyWalker",
    name: "Survey Walker",
    emoji: "🧭",
    type: "land",
    timeMultiplier: 0.9,
    cargoMultiplier: 1,
    summary: "A tougher overland platform built for scouting and hard terrain."
  },
  cloudskiff: {
    id: "cloudskiff",
    name: "Cloudskiff",
    emoji: "🛩️",
    type: "air",
    timeMultiplier: 0.5,
    cargoMultiplier: 0.9,
    summary: "Fast aerial travel that cuts expedition time in half."
  },
  skybarge: {
    id: "skybarge",
    name: "Skybarge",
    emoji: "🚢",
    type: "air",
    timeMultiplier: 0.5,
    cargoMultiplier: 1.1,
    summary: "A larger airship that moves quickly while carrying heavier returns."
  }
};

export const VEHICLE_ORDER = Object.keys(VEHICLE_DEFINITIONS);

export function createDefaultVehicleFleet(overrides = {}) {
  return Object.fromEntries(
    VEHICLE_ORDER.map((vehicleId) => [vehicleId, Math.max(0, Number(overrides?.[vehicleId] ?? 0) || 0)])
  );
}
