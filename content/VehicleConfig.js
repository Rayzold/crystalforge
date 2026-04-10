// Expedition vehicles define how many missions can run at once and the flavor
// of travel they provide: speed, cargo, safety, scouting, and stealth.
// The roster is split into three land buggies and three elemental airships,
// from lighter craft to heavier late-game transports.
export const VEHICLE_DEFINITIONS = {
  onFoot: {
    id: "onFoot",
    name: "On Foot",
    emoji: "\u{1F6B6}",
    type: "land",
    requiresFleet: false,
    showInFleetRoster: false,
    sizeLabel: "No Vehicle",
    maxPeople: 30,
    timeMultiplier: 3,
    cargoMultiplier: 0.2,
    safety: 0.84,
    scouting: 1.18,
    stealth: 1.02,
    favoredMissionTags: ["rescue", "pilgrimage", "relicRecovery"],
    summary: "A land expedition traveling without a vehicle. Extremely slow and poor at hauling, but quieter on the ground and viable for crews up to thirty."
  },
  scoutBuggy: {
    id: "scoutBuggy",
    name: "Scout Buggy",
    emoji: "\u{1F3CE}\uFE0F",
    type: "land",
    imagePath: "./assets/images/vehicles/Scout Buggy.png",
    sizeLabel: "Light Land Buggy",
    maxPeople: 10,
    timeMultiplier: 0.72,
    cargoMultiplier: 0.45,
    safety: 0.8,
    scouting: 1.35,
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
    maxPeople: 20,
    timeMultiplier: 0.92,
    cargoMultiplier: 0.9,
    safety: 0.98,
    scouting: 1,
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
    maxPeople: 60,
    timeMultiplier: 1.4,
    cargoMultiplier: 1.45,
    safety: 1.18,
    scouting: 0.35,
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
    maxPeople: 20,
    timeMultiplier: 0.42,
    cargoMultiplier: 1.5,
    safety: 0.88,
    scouting: 1.28,
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
    maxPeople: 50,
    timeMultiplier: 0.78,
    cargoMultiplier: 3,
    safety: 1.05,
    scouting: 1,
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
    maxPeople: 120,
    timeMultiplier: 0.96,
    cargoMultiplier: 5,
    safety: 1.22,
    scouting: 0.74,
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
    VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId]?.requiresFleet !== false).map((vehicleId) => [
      vehicleId,
      Math.max(0, Number(overrides?.[vehicleId] ?? 0) || 0)
    ])
  );
}
