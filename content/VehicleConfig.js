// Expedition vehicles define how many missions can run at once and the flavor
// of travel they provide: speed, cargo, safety, scouting, and stealth.
// The roster is split into three land buggies and three elemental airships,
// from lighter craft to heavier late-game transports.
export const VEHICLE_DEFINITIONS = {
  scoutBuggy: {
    id: "scoutBuggy",
    name: "Scout Buggy",
    emoji: "\u{1F3CE}\uFE0F",
    type: "land",
    imagePath: "./assets/images/vehicles/Scout Buggy.png",
    sizeLabel: "Light Land Buggy",
    timeMultiplier: 0.95,
    cargoMultiplier: 0.85,
    safety: 0.92,
    scouting: 1.18,
    stealth: 1.08,
    favoredMissionTags: ["resourceRun", "crystalHunt", "relicRecovery"],
    summary: "A light overland buggy built to move fast, scout ahead, and slip through rough terrain."
  },
  trailBuggy: {
    id: "trailBuggy",
    name: "Trail Buggy",
    emoji: "\u{1F699}",
    type: "land",
    imagePath: "./assets/images/vehicles/Trail Buggy.png",
    sizeLabel: "Mid Land Buggy",
    timeMultiplier: 0.82,
    cargoMultiplier: 1,
    safety: 1.02,
    scouting: 1.06,
    stealth: 1,
    favoredMissionTags: ["rescue", "recruit", "resourceRun", "diplomatic"],
    summary: "A dependable all-round expedition buggy with better pace, crew room, and everyday range."
  },
  siegeBuggy: {
    id: "siegeBuggy",
    name: "Siege Buggy",
    emoji: "\u{1F69B}",
    type: "land",
    imagePath: "./assets/images/vehicles/Siege Buggy.png",
    sizeLabel: "Heavy Land Buggy",
    timeMultiplier: 0.72,
    cargoMultiplier: 1.22,
    safety: 1.14,
    scouting: 0.94,
    stealth: 0.9,
    favoredMissionTags: ["monsterHunt", "rescue", "recruit", "diplomatic"],
    summary: "A heavier fortified buggy that carries more people and cargo while pushing farther in hostile ground."
  },
  elementalSkiff: {
    id: "elementalSkiff",
    name: "Elemental Skiff",
    emoji: "\u{1F6E9}\uFE0F",
    type: "air",
    imagePath: "./assets/images/vehicles/Elemental Skiff.png",
    sizeLabel: "Light Elemental Airship",
    timeMultiplier: 0.65,
    cargoMultiplier: 0.9,
    safety: 0.96,
    scouting: 1.18,
    stealth: 1.1,
    favoredMissionTags: ["crystalHunt", "pilgrimage", "relicRecovery"],
    summary: "A small elemental airship that reaches fragile sites quickly and favors scouting over haul strength."
  },
  elementalFrigate: {
    id: "elementalFrigate",
    name: "Elemental Frigate",
    emoji: "\u{1F6F8}",
    type: "air",
    imagePath: "./assets/images/vehicles/Elemental Frigate.png",
    sizeLabel: "Mid Elemental Airship",
    timeMultiplier: 0.5,
    cargoMultiplier: 1.02,
    safety: 1.04,
    scouting: 1.08,
    stealth: 1,
    favoredMissionTags: ["relicRecovery", "diplomatic", "crystalHunt", "pilgrimage"],
    summary: "A balanced elemental airship that halves travel time while keeping a steadier hold and crew bay."
  },
  grandElementalAirship: {
    id: "grandElementalAirship",
    name: "Grand Elemental Airship",
    emoji: "\u{1F6A2}",
    type: "air",
    imagePath: "./assets/images/vehicles/Grand Elemental Airship.png",
    sizeLabel: "Heavy Elemental Airship",
    timeMultiplier: 0.35,
    cargoMultiplier: 1.18,
    safety: 1.12,
    scouting: 0.98,
    stealth: 0.92,
    favoredMissionTags: ["diplomatic", "recruit", "monsterHunt", "relicRecovery"],
    summary: "A towering elemental flagship that crosses great distance quickly while hauling elite crews and heavier returns."
  }
};

export const VEHICLE_TYPE_SECTIONS = [
  {
    type: "land",
    title: "Land Vehicles",
    detail: "Buggies and overland rigs built for roads, ruins, and hostile ground."
  },
  {
    type: "air",
    title: "Air Vehicles",
    detail: "Elemental ships that trade altitude and speed for stronger reach across the frontier."
  }
];

export const VEHICLE_ORDER = Object.keys(VEHICLE_DEFINITIONS);

export function createDefaultVehicleFleet(overrides = {}) {
  return Object.fromEntries(
    VEHICLE_ORDER.map((vehicleId) => [vehicleId, Math.max(0, Number(overrides?.[vehicleId] ?? 0) || 0)])
  );
}
