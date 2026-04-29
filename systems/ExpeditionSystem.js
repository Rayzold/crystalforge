// Expedition and notable-citizen system.
// This module owns mission launch/return logic, vehicle limits, unique-citizen
// generation, and the calendar-facing summaries that make departures and
// expected returns visible in Chronicle.
import {
  EXPEDITION_APPROACHES,
  EXPEDITION_DURATION_OPTIONS,
  EXPEDITION_MISSION_TEMPLATES,
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
import { getCurrentTownFocus } from "./TownFocusSystem.js";

const RESOURCE_KEYS = ["food", "gold", "materials", "mana"];
const EXPEDITION_RESOURCE_REWARD_KEYS = ["gold", "food", "materials", "salvage", "mana", "prosperity"];
const DEFAULT_UNIQUE_THRESHOLD = 120;
const MAX_RECENT_RETURNS = 10;
const EXPEDITION_BOARD_REFRESH_DAYS = 7;
const JOURNEY_STAGE_DAY_SPAN = 4;
const MAX_JOURNEY_STAGES = 5;
const EXPEDITION_GENERAL_CALLSIGNS = [
  "Rainwake",
  "Northglass",
  "Bright Ember",
  "Drift Arrow",
  "Ash Lantern",
  "Sky Rook",
  "Farseam",
  "Cinder Bell",
  "Wayfinder",
  "Ghost Current",
  "Stormthread",
  "Silver Wake",
  "Dawn Spur",
  "Blue Lantern",
  "Horizon Pike",
  "Ember Current"
];
const EXPEDITION_CALLSIGN_POOLS = {
  rescue: [
    "Lantern Wake",
    "Mercy Bell",
    "Hearthward",
    "Beacon Thread",
    "Shelter Wing",
    "Kindled Road",
    "Ash Harbor",
    "Morrow Light",
    "Cinder Veil",
    "Warm Signal",
    "Dawn Refuge",
    "Safe Return",
    "Harbor Mercy",
    "Winter Hearth"
  ],
  recruit: [
    "Open Banner",
    "Bridgewind",
    "New Accord",
    "Threshold Song",
    "Road Lantern",
    "Far Welcome",
    "Hearth Oath",
    "Crosswake",
    "Gatefire",
    "Gathering Bell",
    "Clear Promise",
    "Wanderhome",
    "New Hearth",
    "Far Covenant"
  ],
  resourceRun: [
    "Iron Rain",
    "Loadstar",
    "Stonewake",
    "Mulefire",
    "Dust Harbor",
    "Timber Gale",
    "Grain Echo",
    "Coal Thread",
    "Roadforge",
    "Quarry Wind",
    "Supply Rook",
    "Carry Dawn",
    "Cargo Lantern",
    "Gravel Song"
  ],
  crystalHunt: [
    "Shardflare",
    "Prism Wake",
    "Blue Echo",
    "Glassfire",
    "Aether Pike",
    "Mana Vein",
    "Starfract",
    "Lumen Drift",
    "Bright Fault",
    "Crystal Thorn",
    "Sky Prism",
    "Halo Spark",
    "Veinfire",
    "Gleamwake"
  ],
  relicRecovery: [
    "Vaultwind",
    "Dust Lantern",
    "Old Flame",
    "Gravespark",
    "Sealbreaker",
    "Ruinwake",
    "Ember Key",
    "Silent Spire",
    "Tombglass",
    "Lockstar",
    "Ash Reliquary",
    "Deep Cinder",
    "Sealwake",
    "Cairn Bell"
  ],
  diplomatic: [
    "White Banner",
    "Silver Accord",
    "Bridgewake",
    "Soft Bell",
    "Trucewind",
    "Golden Thread",
    "Velvet Pike",
    "Open Sky",
    "Clear Parlance",
    "Peace Ember",
    "Crown Current",
    "Blue Compact",
    "Gilded Truce",
    "Velvet Accord"
  ],
  monsterHunt: [
    "Red Fang",
    "Ash Pike",
    "Black Spur",
    "Ember Talon",
    "Rookfire",
    "Gorewind",
    "Night Harrow",
    "Iron Thorn",
    "Grim Step",
    "Storm Spear",
    "Blood Lantern",
    "Hollow Claw",
    "Wolf Ember",
    "Razor Wake"
  ],
  pilgrimage: [
    "Veilstar",
    "Stillwater",
    "Halo Wind",
    "Dawn Psalm",
    "Quiet Ember",
    "Glass Hymn",
    "Moon Road",
    "Gentle Flame",
    "Sainted Wake",
    "Sun Veil",
    "Bright Mercy",
    "Soft Pilgrim",
    "Ash Psalm",
    "Quiet Halo"
  ]
};
const EXPEDITION_CALLSIGN_OVERFLOW = {
  rescue: {
    prefixes: ["Lantern", "Mercy", "Hearth", "Beacon", "Shelter", "Kindled"],
    suffixes: ["Wake", "Bell", "Road", "Wing", "Harbor", "Promise"]
  },
  recruit: {
    prefixes: ["Open", "Bridge", "Threshold", "Gathering", "Banner", "Far"],
    suffixes: ["Accord", "Wake", "Promise", "Road", "Song", "Welcome"]
  },
  resourceRun: {
    prefixes: ["Iron", "Stone", "Dust", "Load", "Quarry", "Timber"],
    suffixes: ["Wake", "Wind", "Forge", "Thread", "Harbor", "Rain"]
  },
  crystalHunt: {
    prefixes: ["Shard", "Prism", "Glass", "Blue", "Halo", "Lumen"],
    suffixes: ["Wake", "Flare", "Echo", "Spark", "Fault", "Drift"]
  },
  relicRecovery: {
    prefixes: ["Vault", "Dust", "Ruin", "Ember", "Silent", "Ash"],
    suffixes: ["Wind", "Lantern", "Key", "Wake", "Spire", "Cinder"]
  },
  diplomatic: {
    prefixes: ["Silver", "White", "Bridge", "Open", "Golden", "Truce"],
    suffixes: ["Accord", "Bell", "Wake", "Thread", "Sky", "Compact"]
  },
  monsterHunt: {
    prefixes: ["Red", "Ash", "Black", "Storm", "Grim", "Iron"],
    suffixes: ["Fang", "Pike", "Spur", "Talon", "Claw", "Spear"]
  },
  pilgrimage: {
    prefixes: ["Veil", "Dawn", "Halo", "Still", "Moon", "Bright"],
    suffixes: ["Star", "Psalm", "Wake", "Flame", "Road", "Mercy"]
  },
  fallback: {
    prefixes: ["Rain", "North", "Bright", "Ash", "Storm", "Silver"],
    suffixes: ["Wake", "Ember", "Thread", "Rook", "Current", "Bell"]
  }
};
const LEGACY_VEHICLE_ID_MAP = {
  caravanWagon: "siegeBuggy",
  surveyWalker: "trailBuggy",
  cloudskiff: "elementalSkiff",
  skybarge: "grandElementalAirship"
};

const MISSION_RISK_SETTINGS = {
  Low: { difficulty: 0.88, reward: 0.92, unique: 0.45, label: "Low Risk" },
  Medium: { difficulty: 1, reward: 1, unique: 1, label: "Medium Risk" },
  High: { difficulty: 1.18, reward: 1.15, unique: 1.18, label: "High Risk" }
};

const MISSION_DISTANCE_SETTINGS = {
  Near: { difficulty: 0.92, label: "Near" },
  Mid: { difficulty: 1, label: "Mid" },
  Far: { difficulty: 1.12, label: "Far" }
};

const LEGEND_ASSIGNMENT_POSTS = [
  {
    id: "district",
    label: "District Post",
    iconKey: "building",
    summary: "Anchors this legend inside the Drift, deepening their city-facing strengths."
  },
  {
    id: "expedition",
    label: "Expedition Wing",
    iconKey: "route",
    summary: "Turns this legend into a field mentor who sharpens matching expeditions."
  },
  {
    id: "council",
    label: "Council Seat",
    iconKey: "calendar",
    summary: "Seats this legend near policy and daily governance."
  }
];
const LEGEND_ASSIGNMENT_POST_BY_ID = Object.fromEntries(LEGEND_ASSIGNMENT_POSTS.map((post) => [post.id, post]));
const EXPEDITION_RELIC_SLOTS = [
  {
    id: "spire",
    label: "Signal Spire",
    summary: "Projects route relics into the city so their guidance affects daily operations."
  },
  {
    id: "vault",
    label: "Reliquary Vault",
    summary: "Anchors trophies and artifacts into the Drift as stable civic bonuses."
  }
];
const EXPEDITION_RELIC_SLOT_BY_ID = Object.fromEntries(EXPEDITION_RELIC_SLOTS.map((slot) => [slot.id, slot]));
const EXPEDITION_RELIC_TYPE_CHANCE = {
  rescue: 0.15,
  recruit: 0.16,
  resourceRun: 0.22,
  crystalHunt: 0.28,
  relicRecovery: 0.46,
  diplomatic: 0.18,
  monsterHunt: 0.34,
  pilgrimage: 0.24
};
const EXPEDITION_RELIC_TEMPLATES = [
  {
    id: "glassway-compass",
    name: "Glassway Compass",
    kindLabel: "Relic",
    iconKey: "route",
    summary: "A routefinder calibrated to profit currents and safe return lines.",
    effectText: "Guides crews toward cleaner routes and better trade finds.",
    sourceTypeIds: ["resourceRun", "relicRecovery", "diplomatic"],
    bonuses: {
      resources: { gold: 0.8, prosperity: 0.4 },
      expeditionPowerPercent: 12,
      expeditionTags: ["resourceRun", "diplomatic"]
    },
    synergy: {
      summary: "Its routes flare brightest when a field legend is steering the city's trade push.",
      requirements: [
        { type: "legendPost", value: "expedition", label: "An active legend in the Expedition Wing" },
        { type: "townFocus", value: "trade-drive", label: "Town Focus: Trade Drive" }
      ],
      bonuses: {
        resources: { gold: 0.5, prosperity: 0.3 },
        expeditionPowerPercent: 8,
        expeditionTags: ["resourceRun", "diplomatic"]
      }
    }
  },
  {
    id: "vaultbreaker-gauntlet",
    name: "Vaultbreaker Gauntlet",
    kindLabel: "Relic",
    iconKey: "salvage",
    summary: "An articulated relic glove built for prying open fused ruin seals.",
    effectText: "Turns salvage crews into much sharper recovery teams.",
    sourceTypeIds: ["relicRecovery", "resourceRun", "monsterHunt"],
    bonuses: {
      resources: { salvage: 1.4, materials: 0.8 },
      expeditionPowerPercent: 10,
      expeditionTags: ["relicRecovery", "resourceRun"]
    },
    synergy: {
      summary: "It wakes up around real workshops and heavier recovery discipline.",
      requirements: [{ type: "buildingTag", value: "industry", label: "1 active industry building" }],
      bonuses: {
        resources: { salvage: 0.9, materials: 0.7 },
        expeditionPowerPercent: 6,
        expeditionTags: ["relicRecovery"]
      }
    }
  },
  {
    id: "storm-prism-cage",
    name: "Storm Prism Cage",
    kindLabel: "Relic",
    iconKey: "mana",
    summary: "A humming crystal lattice that drinks in stray mana and route-signals.",
    effectText: "Steadies mana flow and sharpens arcane field expeditions.",
    sourceTypeIds: ["crystalHunt", "pilgrimage", "relicRecovery"],
    bonuses: {
      resources: { mana: 0.9, prosperity: 0.3 },
      stats: { prestige: 5 },
      expeditionPowerPercent: 12,
      expeditionTags: ["crystalHunt", "pilgrimage"]
    },
    synergy: {
      summary: "Arcane infrastructure and crystal policy let it draw a much cleaner charge.",
      requirements: [
        { type: "buildingTag", value: "arcane", label: "1 active arcane building" },
        { type: "townFocus", value: "crystal-expedition", label: "Town Focus: Crystal Expedition" }
      ],
      bonuses: {
        resources: { mana: 0.7 },
        stats: { prestige: 4 },
        expeditionPowerPercent: 8,
        expeditionTags: ["crystalHunt", "relicRecovery"]
      }
    }
  },
  {
    id: "emberroot-urn",
    name: "Emberroot Urn",
    kindLabel: "Relic",
    iconKey: "food",
    summary: "An old ward vessel packed with seed-char and soil that never cools.",
    effectText: "Improves food resilience and helps the city recover its strength.",
    sourceTypeIds: ["rescue", "resourceRun", "pilgrimage"],
    bonuses: {
      resources: { food: 1.1, prosperity: 0.4 },
      stats: { health: 6, morale: 4 }
    },
    synergy: {
      summary: "It settles into a stronger civic hearth when a district legend protects the food spine.",
      requirements: [
        { type: "legendPost", value: "district", label: "An active legend in a District Post" },
        { type: "buildingTag", value: "agriculture", label: "1 active agriculture building" }
      ],
      bonuses: {
        resources: { food: 0.9 },
        stats: { health: 4, morale: 3 }
      }
    }
  },
  {
    id: "bastion-tusk-standard",
    name: "Bastion Tusk Standard",
    kindLabel: "Trophy",
    iconKey: "defense",
    summary: "A war-banner strung with plated tusk fragments from a fallen siege beast.",
    effectText: "Hardens the city watch and keeps dangerous routes from slipping the net.",
    sourceTypeIds: ["monsterHunt", "rescue"],
    bonuses: {
      stats: { defense: 10, security: 6 },
      expeditionPowerPercent: 8,
      expeditionTags: ["monsterHunt", "rescue"]
    },
    synergy: {
      summary: "Mounted in a real watch-line, it keeps frontier predators from slipping close.",
      requirements: [{ type: "buildingTag", value: "military", label: "1 active military building" }],
      bonuses: {
        stats: { defense: 6, security: 4 },
        expeditionPowerPercent: 6,
        expeditionTags: ["monsterHunt", "rescue"]
      }
    }
  },
  {
    id: "ledger-of-last-markets",
    name: "Ledger of Last Markets",
    kindLabel: "Relic",
    iconKey: "gold",
    summary: "A trade-book full of vanished buyers, prices, and route margins.",
    effectText: "Improves civic trade instincts and makes diplomatic runs pay cleaner dividends.",
    sourceTypeIds: ["diplomatic", "recruit", "resourceRun"],
    bonuses: {
      resources: { gold: 0.6, prosperity: 0.6 },
      stats: { prestige: 5 },
      expeditionPowerPercent: 10,
      expeditionTags: ["diplomatic", "recruit"]
    },
    synergy: {
      summary: "Market memory compounds when the Drift is openly leaning into trade.",
      requirements: [
        { type: "buildingTag", value: "trade", label: "1 active trade building" },
        { type: "townFocus", value: "trade-drive", label: "Town Focus: Trade Drive" }
      ],
      bonuses: {
        resources: { gold: 0.6, prosperity: 0.5 },
        expeditionPowerPercent: 6,
        expeditionTags: ["diplomatic", "recruit", "resourceRun"]
      }
    }
  },
  {
    id: "mercy-banner",
    name: "Mercy Banner",
    kindLabel: "Trophy",
    iconKey: "health",
    summary: "A field standard carried back from a mission where the crew chose lives over loot.",
    effectText: "Raises morale, health, and the odds of getting people home alive.",
    sourceTypeIds: ["rescue", "monsterHunt", "recruit"],
    bonuses: {
      stats: { morale: 8, health: 8 },
      expeditionPowerPercent: 6,
      expeditionTags: ["rescue", "recruit", "monsterHunt"]
    },
    synergy: {
      summary: "Its field vows matter most when the council is explicitly restoring the city's spirit.",
      requirements: [
        { type: "legendPost", value: "council", label: "An active legend in the Council Seat" },
        { type: "townFocus", value: "civic-restoration", label: "Town Focus: Civic Restoration" }
      ],
      bonuses: {
        resources: { prosperity: 0.4 },
        stats: { morale: 5, health: 5 },
        expeditionPowerPercent: 4,
        expeditionTags: ["rescue", "recruit"]
      }
    }
  },
  {
    id: "star-map-vellum",
    name: "Star Map Vellum",
    kindLabel: "Relic",
    iconKey: "signal",
    summary: "A living chart that shifts to show routes hidden under weather, ruin-glare, and old wards.",
    effectText: "Makes distant scouting sharper and raises the city's confidence in strange roads.",
    sourceTypeIds: ["crystalHunt", "relicRecovery", "diplomatic", "pilgrimage"],
    bonuses: {
      resources: { mana: 0.6, prosperity: 0.5 },
      stats: { security: 4, prestige: 3 },
      expeditionPowerPercent: 14,
      expeditionTags: ["crystalHunt", "relicRecovery", "pilgrimage"]
    },
    synergy: {
      summary: "Its route lattice sharpens when frontier planning and expedition command are aligned.",
      requirements: [
        { type: "legendPost", value: "expedition", label: "An active legend in the Expedition Wing" },
        { type: "townFocus", value: "crystal-expedition", label: "Town Focus: Crystal Expedition" }
      ],
      bonuses: {
        resources: { mana: 0.4, prosperity: 0.4 },
        stats: { security: 3 },
        expeditionPowerPercent: 9,
        expeditionTags: ["crystalHunt", "pilgrimage", "relicRecovery"]
      }
    }
  }
];

const LEGEND_ORIGIN_PATTERNS = {
  rescue: [
    "Pulled free from %mission% and escorted home%vehicle%.",
    "Found at the edge of %mission% and persuaded to return with the convoy%vehicle%.",
    "Walked out of %mission% beside the crew and chose the Drift over the wastes%vehicle%."
  ],
  recruit: [
    "Met during %mission% and won over as the road turned back toward the Drift%vehicle%.",
    "Came aboard after %mission% proved the Drift still had a future worth betting on%vehicle%.",
    "Joined the return from %mission% after seeing the crew hold formation under pressure%vehicle%."
  ],
  resourceRun: [
    "Unearthed amid the hard work of %mission%, where salvage crews found more than stockpiles%vehicle%.",
    "Stepped out of the dust and wreckage around %mission%, carrying routes the city had long forgotten%vehicle%.",
    "Returned from %mission% with the crews, reading opportunity where others saw only scrap%vehicle%."
  ],
  crystalHunt: [
    "First marked by the crystal echoes of %mission% before following the signal line back%vehicle%.",
    "Answered the harmonic pull of %mission% and emerged with the convoy under a veil of blue fire%vehicle%.",
    "Came in from %mission% carrying shard-light, route signs, and a name the crew would not forget%vehicle%."
  ],
  relicRecovery: [
    "Recovered during %mission%, where relic vaults and broken halls hid a living answer among the spoils%vehicle%.",
    "Walked out of %mission% with the crew after the old ruins finally gave up one more secret%vehicle%.",
    "Claimed from the long silence of %mission% and brought back under heavy guard%vehicle%."
  ],
  diplomatic: [
    "Met on the road through %mission%, where parley turned into an oath of shared cause%vehicle%.",
    "Came back with the delegates from %mission%, carrying gifts, terms, and a sharper read of the world%vehicle%.",
    "Chose the Drift after %mission% proved its word still carried weight beyond the walls%vehicle%."
  ],
  monsterHunt: [
    "Seen first at %mission%, standing where the hunt had gone hottest before returning with the victors%vehicle%.",
    "Came in from %mission% with trophy crews and a reputation already spreading ahead of them%vehicle%.",
    "Walked back from %mission% through bloodied ground, choosing the Drift after the beast fell%vehicle%."
  ],
  pilgrimage: [
    "Arrived through the long road of %mission%, carrying omens, vows, and a steadier kind of silence%vehicle%.",
    "Followed the sacred line of %mission% until it bent toward the Drift and stayed there%vehicle%.",
    "Returned from %mission% with the crew as though the route itself had chosen a new keeper%vehicle%."
  ]
};

const LEGEND_ARRIVAL_PATTERNS = {
  wallMarshal: [
    "Took the Bastion Oath on %joinedAt% and was handed command of the outer watch before dusk.",
    "Reached the gates on %joinedAt%, measured the walls once, and started drilling the watch that same night."
  ],
  horizonSeer: [
    "Marked new approach lines into the Drift on %joinedAt% before even asking for rest.",
    "Arrived on %joinedAt% with wind-burned maps and a route memory no scout in Drift could match."
  ],
  rootkeeper: [
    "Set root-charms around the first ward circle on %joinedAt%, and the kitchens noticed the change by evening.",
    "Crossed into Drift on %joinedAt% carrying living cuttings, river mud, and a calmer pulse for the city."
  ],
  quartermaster: [
    "Spent %joinedAt% counting stores, broken tools, and wasted motions before anyone thought to introduce them.",
    "Reached the city on %joinedAt% and turned the first unloading line into a lesson in order."
  ],
  manasavant: [
    "Stepped into the Drift on %joinedAt% and the lantern lattice steadied around them.",
    "Arrived on %joinedAt% with crystal dust on their sleeves and a cleaner rhythm in every nearby circuit."
  ],
  skybroker: [
    "Spent the evening of %joinedAt% learning prices, names, and promises before the market fires dimmed.",
    "Reached Drift on %joinedAt% already speaking in routes, margins, and opportunities no one else had named."
  ],
  mercysaint: [
    "Opened a field clinic on %joinedAt% before the crew had even finished unloading the wagons.",
    "Entered the city on %joinedAt% with triage cloth, prayer ash, and the kind of calm people obey."
  ],
  archivistRegent: [
    "Claimed a quiet desk on %joinedAt% and had already corrected three records by moonrise.",
    "Arrived on %joinedAt% with sealed folios, old songs, and a memory sharp enough to reorder the ledgers."
  ]
};

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

const ARCANE_JOURNEY_TYPES = new Set(["crystalHunt", "pilgrimage"]);
const SALVAGE_JOURNEY_TYPES = new Set(["resourceRun", "relicRecovery", "monsterHunt"]);
const SOCIAL_JOURNEY_TYPES = new Set(["rescue", "recruit", "diplomatic"]);
const JOURNEY_STAGE_PRESENTATION = {
  journey: { cue: "Route Decision", iconKey: "route", tone: "balanced" },
  supply: { cue: "Supply Pressure", iconKey: "supplies", tone: "caution" },
  signal: { cue: "Strange Signal", iconKey: "signal", tone: "mystery" },
  excavation: { cue: "Buried Opportunity", iconKey: "excavation", tone: "opportunity" },
  encounter: { cue: "Threat Contact", iconKey: "encounter", tone: "danger" },
  crossing: { cue: "Terrain Obstacle", iconKey: "crossing", tone: "challenge" },
  contact: { cue: "Roadside Contact", iconKey: "contact", tone: "social" }
};
const JOURNEY_RESOURCE_LABELS = {
  gold: "Gold",
  food: "Food",
  materials: "Materials",
  salvage: "Salvage",
  mana: "Mana",
  prosperity: "Prosperity"
};

function createEmptyResourceRecord() {
  return { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 };
}

function createEmptyLegendStatRecord() {
  return { prosperity: 0, defense: 0, security: 0, prestige: 0, morale: 0, health: 0 };
}

function createEmptyCrystalRecord() {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0]));
}

function createEmptyTeamRecord() {
  return {};
}

function createRelicBonusRecord(partial = {}) {
  return {
    resources: { ...createEmptyResourceRecord(), ...(partial.resources ?? {}) },
    stats: { ...createEmptyLegendStatRecord(), ...(partial.stats ?? {}) },
    expeditionPowerPercent: Math.max(0, Number(partial.expeditionPowerPercent ?? 0) || 0),
    expeditionTags: Array.isArray(partial.expeditionTags) ? [...new Set(partial.expeditionTags.filter(Boolean))] : []
  };
}

function createRelicSynergyRequirementRecord(partial = {}) {
  const type = typeof partial.type === "string" ? partial.type.trim() : "";
  const value = typeof partial.value === "string" ? partial.value.trim() : "";
  return {
    type,
    value,
    label: String(partial.label ?? value).trim() || value
  };
}

function normalizeExpeditionRelicSynergy(source = null) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const requirements = Array.isArray(source.requirements)
    ? source.requirements
        .map((requirement) => createRelicSynergyRequirementRecord(requirement))
        .filter((requirement) => requirement.type && requirement.value)
    : [];

  if (!requirements.length) {
    return null;
  }

  const bonuses = createRelicBonusRecord(source.bonuses);
  return {
    summary: String(source.summary ?? "Matching conditions can awaken a stronger relic state.").trim() || "Matching conditions can awaken a stronger relic state.",
    requirements,
    bonuses,
    bonusSummary: buildExpeditionRelicBonusSummary({ bonuses })
  };
}

function addRelicBonuses(target, source) {
  for (const [key, amount] of Object.entries(source?.resources ?? {})) {
    target.resources[key] = (target.resources[key] ?? 0) + (Number(amount) || 0);
  }
  for (const [key, amount] of Object.entries(source?.stats ?? {})) {
    target.stats[key] = (target.stats[key] ?? 0) + (Number(amount) || 0);
  }
  target.expeditionPowerPercent += Number(source?.expeditionPowerPercent ?? 0) || 0;
  target.expeditionTags = [...new Set([...(target.expeditionTags ?? []), ...(source?.expeditionTags ?? [])])];
  return target;
}

function normalizeVehicleId(vehicleId) {
  const candidate = LEGACY_VEHICLE_ID_MAP[vehicleId] ?? vehicleId;
  return VEHICLE_DEFINITIONS[candidate] ? candidate : VEHICLE_ORDER[0];
}

function createExpeditionRecentRecord(partial = {}) {
  const vehicleId = normalizeVehicleId(partial.vehicleId ?? VEHICLE_ORDER[0]);
  const expeditionNumber = Math.max(1, Number(partial.expeditionNumber ?? 1) || 1);
  const expeditionTypeId = String(partial.typeId ?? "resourceRun").trim() || "resourceRun";
  const expeditionCallsign =
    String(partial.expeditionCallsign ?? getExpeditionCallsign(expeditionTypeId, expeditionNumber)).trim() ||
    getExpeditionCallsign(expeditionTypeId, expeditionNumber);
  return {
    id: partial.id ?? createId("expedition-return"),
    expeditionNumber,
    expeditionCallsign,
    expeditionLabel:
      String(partial.expeditionLabel ?? `Expedition ${expeditionNumber}: ${expeditionCallsign}`).trim() ||
      `Expedition ${expeditionNumber}: ${expeditionCallsign}`,
    typeId: partial.typeId ?? "resourceRun",
    typeLabel: partial.typeLabel ?? "Expedition",
    missionId: partial.missionId ?? null,
    missionName: partial.missionName ?? partial.typeLabel ?? "Expedition",
    vehicleId,
    vehicleName: partial.vehicleName ?? VEHICLE_DEFINITIONS[vehicleId]?.name ?? "Vehicle",
    returnDayOffset: Number(partial.returnDayOffset ?? 0) || 0,
    returnDateLabel: partial.returnDateLabel ?? formatDate(Number(partial.returnDayOffset ?? 0) || 0),
    outcomeLabel: partial.outcomeLabel ?? "Returned",
    summary: partial.summary ?? "The expedition returned.",
    narrative: partial.narrative ?? partial.summary ?? "The expedition returned.",
    detailLines: Array.isArray(partial.detailLines) ? [...partial.detailLines] : [],
    rewards: {
      resources: { ...createEmptyResourceRecord(), ...(partial.rewards?.resources ?? {}) },
      crystals: { ...createEmptyCrystalRecord(), ...(partial.rewards?.crystals ?? {}) },
      shards: { ...createEmptyCrystalRecord(), ...(partial.rewards?.shards ?? {}) },
      recruits: structuredClone(partial.rewards?.recruits ?? {}),
      uniqueCitizen: partial.rewards?.uniqueCitizen ?? null,
      relic: partial.rewards?.relic ? normalizeExpeditionRelic(partial.rewards.relic) : null
    }
  };
}

export function createDefaultExpeditionState() {
  return {
    board: [],
    active: [],
    pending: [],
    recent: [],
    relics: [],
    aftermaths: [],
    followUps: [],
    lastRefreshDayOffset: null,
    nextExpeditionNumber: 1,
    uniqueProgress: 0,
    nextUniqueThreshold: DEFAULT_UNIQUE_THRESHOLD
  };
}

function createEmptyAftermathStatRecord() {
  return { prosperity: 0, defense: 0, security: 0, prestige: 0, morale: 0, health: 0, populationSupport: 0 };
}

function createAftermathEffectRecord(partial = {}) {
  return {
    resources: { ...createEmptyResourceRecord(), ...(partial.resources ?? {}) },
    stats: { ...createEmptyAftermathStatRecord(), ...(partial.stats ?? {}) }
  };
}

function normalizeExpeditionAftermath(entry = {}) {
  return {
    id: String(entry.id ?? createId("expedition-aftermath")),
    title: String(entry.title ?? "Expedition Aftermath").trim() || "Expedition Aftermath",
    summary: String(entry.summary ?? "A recent expedition left a temporary mark on the Drift.").trim() || "A recent expedition left a temporary mark on the Drift.",
    effectText: String(entry.effectText ?? "").trim(),
    iconKey: String(entry.iconKey ?? "route").trim() || "route",
    sourceMissionName: String(entry.sourceMissionName ?? "Expedition").trim() || "Expedition",
    severity: ["boon", "warning", "strain"].includes(String(entry.severity ?? "")) ? entry.severity : "boon",
    startedDayOffset: Number(entry.startedDayOffset ?? 0) || 0,
    expiresDayOffset: Math.max(Number(entry.expiresDayOffset ?? 0) || 0, Number(entry.startedDayOffset ?? 0) || 0),
    startedAt: String(entry.startedAt ?? formatDate(Number(entry.startedDayOffset ?? 0) || 0)),
    expiresAt: String(entry.expiresAt ?? formatDate(Number(entry.expiresDayOffset ?? 0) || 0)),
    effects: createAftermathEffectRecord(entry.effects)
  };
}

function normalizeExpeditionFollowUpOption(option = {}) {
  return {
    id: String(option.id ?? createId("expedition-follow-up-option")),
    label: String(option.label ?? "Choose").trim() || "Choose",
    summary: String(option.summary ?? "").trim(),
    outcome: String(option.outcome ?? "").trim(),
    effects: createAftermathEffectRecord(option.effects),
    durationDeltaDays: Number(option.durationDeltaDays ?? 0) || 0
  };
}

function normalizeExpeditionFollowUp(entry = {}) {
  return {
    id: String(entry.id ?? createId("expedition-follow-up")),
    aftermathId: String(entry.aftermathId ?? "").trim() || null,
    title: String(entry.title ?? "Expedition Follow-up").trim() || "Expedition Follow-up",
    detail: String(entry.detail ?? "A recent expedition consequence needs a policy answer.").trim() || "A recent expedition consequence needs a policy answer.",
    iconKey: String(entry.iconKey ?? "route").trim() || "route",
    sourceMissionName: String(entry.sourceMissionName ?? "Expedition").trim() || "Expedition",
    urgency: ["critical", "high", "medium", "low"].includes(String(entry.urgency ?? "")) ? entry.urgency : "medium",
    createdDayOffset: Number(entry.createdDayOffset ?? 0) || 0,
    options: Array.isArray(entry.options) ? entry.options.map((option) => normalizeExpeditionFollowUpOption(option)) : [],
    chosenOptionId: typeof entry.chosenOptionId === "string" && entry.chosenOptionId.trim() ? entry.chosenOptionId.trim() : null
  };
}

function buildExpeditionRelicBonusSummary(relic) {
  const bonuses = createRelicBonusRecord(relic?.bonuses);
  const resourceParts = Object.entries(bonuses.resources)
    .filter(([, amount]) => Number(amount) > 0)
    .slice(0, 2)
    .map(([key, amount]) => formatLegendBonusPart(key, amount));
  const statParts = Object.entries(bonuses.stats)
    .filter(([, amount]) => Number(amount) > 0)
    .slice(0, 2)
    .map(([key, amount]) => formatLegendBonusPart(key, amount));
  const expeditionPart =
    bonuses.expeditionPowerPercent > 0
      ? `+${roundTo(bonuses.expeditionPowerPercent, 0)}% expedition power${
          bonuses.expeditionTags.length
            ? ` on ${bonuses.expeditionTags.map((tag) => EXPEDITION_TYPES[tag]?.label ?? tag).join(", ")}`
            : ""
        }`
      : "";
  return joinLegendBonusParts([...resourceParts, ...statParts, expeditionPart]);
}

function createExpeditionRelicRecord(template, expedition, discoveredDayOffset) {
  return normalizeExpeditionRelic({
    id: createId("expedition-relic"),
    templateId: template.id,
    name: template.name,
    kindLabel: template.kindLabel ?? "Relic",
    iconKey: template.iconKey ?? "relic",
    summary: template.summary,
    effectText: template.effectText,
    sourceTypeId: expedition?.typeId ?? null,
    sourceLabel: expedition?.typeLabel ?? EXPEDITION_TYPES[expedition?.typeId]?.label ?? "Expedition",
    sourceMissionName: expedition?.missionName ?? expedition?.typeLabel ?? "Expedition",
    discoveredDayOffset,
    discoveredAt: formatDate(discoveredDayOffset),
    equippedSlotId: null,
    bonuses: createRelicBonusRecord(template.bonuses),
    synergy: normalizeExpeditionRelicSynergy(template.synergy),
    bonusSummary: buildExpeditionRelicBonusSummary({ bonuses: template.bonuses })
  });
}

function normalizeExpeditionRelic(source = {}) {
  const bonuses = createRelicBonusRecord(source?.bonuses);
  const synergy = normalizeExpeditionRelicSynergy(source?.synergy);
  return {
    id: String(source?.id ?? createId("expedition-relic")),
    templateId: typeof source?.templateId === "string" && source.templateId.trim() ? source.templateId.trim() : null,
    name: String(source?.name ?? "Recovered Relic").trim() || "Recovered Relic",
    kindLabel: String(source?.kindLabel ?? "Relic").trim() || "Relic",
    iconKey: String(source?.iconKey ?? "relic").trim() || "relic",
    summary: String(source?.summary ?? "Recovered from the frontier.").trim() || "Recovered from the frontier.",
    effectText: String(source?.effectText ?? "Its presence changes how the Drift functions.").trim() || "Its presence changes how the Drift functions.",
    sourceTypeId: typeof source?.sourceTypeId === "string" && source.sourceTypeId.trim() ? source.sourceTypeId.trim() : null,
    sourceLabel:
      typeof source?.sourceLabel === "string" && source.sourceLabel.trim()
        ? source.sourceLabel.trim()
        : (EXPEDITION_TYPES[source?.sourceTypeId]?.label ?? "Expedition"),
    sourceMissionName: String(source?.sourceMissionName ?? source?.sourceLabel ?? "Expedition").trim() || "Expedition",
    discoveredDayOffset: Number(source?.discoveredDayOffset ?? 0) || 0,
    discoveredAt: String(source?.discoveredAt ?? formatDate(Number(source?.discoveredDayOffset ?? 0) || 0)),
    equippedSlotId:
      typeof source?.equippedSlotId === "string" && EXPEDITION_RELIC_SLOT_BY_ID[source.equippedSlotId]
        ? source.equippedSlotId
        : null,
    bonuses,
    synergy,
    bonusSummary:
      typeof source?.bonusSummary === "string" && source.bonusSummary.trim()
        ? source.bonusSummary.trim()
        : buildExpeditionRelicBonusSummary({ bonuses })
  };
}

function normalizeJourneyEffects(effects = {}) {
  return {
    successDelta: Number(effects?.successDelta ?? 0) || 0,
    rewardMultiplier: Math.max(0.5, Number(effects?.rewardMultiplier ?? 1) || 1),
    recruitMultiplier: Math.max(0.5, Number(effects?.recruitMultiplier ?? 1) || 1),
    uniquePercentBonus: Number(effects?.uniquePercentBonus ?? 0) || 0,
    resourceBonuses: { ...createEmptyResourceRecord(), ...(effects?.resourceBonuses ?? {}) },
    crystalBonuses: { ...createEmptyCrystalRecord(), ...(effects?.crystalBonuses ?? {}) },
    shardBonuses: { ...createEmptyCrystalRecord(), ...(effects?.shardBonuses ?? {}) },
    modifier: String(effects?.modifier ?? "").trim(),
    result: String(effects?.result ?? "").trim()
  };
}

function formatJourneyTagAmount(value) {
  const rounded = roundTo(Number(value ?? 0) || 0, Math.abs(Number(value ?? 0) || 0) >= 10 ? 0 : 1);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getJourneyOptionTone(effects = {}) {
  if ((effects.successDelta ?? 0) >= 0.05 && (effects.rewardMultiplier ?? 1) <= 0.96) {
    return "cautious";
  }
  if ((effects.successDelta ?? 0) <= -0.05 && (effects.rewardMultiplier ?? 1) >= 1.04) {
    return "aggressive";
  }
  if ((effects.uniquePercentBonus ?? 0) >= 4 || Object.values(effects.resourceBonuses ?? {}).some((value) => Number(value) > 0.5)) {
    return "opportunity";
  }
  return "balanced";
}

function getJourneyOptionTags(effects = {}) {
  const tags = [];
  const resourceTags = Object.entries(effects.resourceBonuses ?? {})
    .filter(([, amount]) => Number(amount) > 0.5)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 2)
    .map(([resource, amount]) => `+${formatJourneyTagAmount(amount)} ${JOURNEY_RESOURCE_LABELS[resource] ?? resource}`);

  if ((effects.successDelta ?? 0) >= 0.05) {
    tags.push("Safer");
  } else if ((effects.successDelta ?? 0) <= -0.05) {
    tags.push("Riskier");
  }

  if ((effects.rewardMultiplier ?? 1) >= 1.05) {
    tags.push("Bigger Haul");
  } else if ((effects.rewardMultiplier ?? 1) <= 0.95) {
    tags.push("Lighter Haul");
  }

  if ((effects.recruitMultiplier ?? 1) >= 1.05) {
    tags.push("Recruit Chance");
  }

  if ((effects.uniquePercentBonus ?? 0) >= 4) {
    tags.push("Legend Chance");
  }

  if (Object.values(effects.crystalBonuses ?? {}).some((value) => Number(value) > 0)) {
    tags.push("Crystal Find");
  }

  if (Object.values(effects.shardBonuses ?? {}).some((value) => Number(value) > 0)) {
    tags.push("Shard Find");
  }

  tags.push(...resourceTags);
  return [...new Set(tags)].slice(0, 4);
}

function normalizeJourneyOption(option = {}) {
  const effects = normalizeJourneyEffects(option?.effects);
  return {
    id: String(option?.id ?? createId("journey-option")),
    label: String(option?.label ?? "Choice").trim() || "Choice",
    summary: String(option?.summary ?? "").trim(),
    tone: String(option?.tone ?? getJourneyOptionTone(effects)).trim() || "balanced",
    tags: Array.isArray(option?.tags) ? option.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4) : getJourneyOptionTags(effects),
    effects
  };
}

function normalizeActiveExpedition(entry = {}) {
  const vehicleId = normalizeVehicleId(entry.vehicleId ?? VEHICLE_ORDER[0]);
  const expeditionNumber = Math.max(1, Number(entry.expeditionNumber ?? 1) || 1);
  const expeditionTypeId = String(entry.typeId ?? "resourceRun").trim() || "resourceRun";
  const expeditionCallsign =
    String(entry.expeditionCallsign ?? getExpeditionCallsign(expeditionTypeId, expeditionNumber)).trim() ||
    getExpeditionCallsign(expeditionTypeId, expeditionNumber);
  return {
    id: String(entry.id ?? createId("expedition")),
    expeditionNumber,
    expeditionCallsign,
    expeditionLabel: String(entry.expeditionLabel ?? `Expedition ${expeditionNumber}: ${expeditionCallsign}`).trim() || `Expedition ${expeditionNumber}: ${expeditionCallsign}`,
    typeId: entry.typeId ?? "resourceRun",
    typeLabel: entry.typeLabel ?? EXPEDITION_TYPES[entry.typeId]?.label ?? "Expedition",
    missionId: entry.missionId ?? null,
    missionName: entry.missionName ?? entry.typeLabel ?? EXPEDITION_TYPES[entry.typeId]?.label ?? "Expedition",
    missionSummary: entry.missionSummary ?? "",
    missionRisk: MISSION_RISK_SETTINGS[entry.missionRisk] ? entry.missionRisk : "Medium",
    missionDistance: MISSION_DISTANCE_SETTINGS[entry.missionDistance] ? entry.missionDistance : "Mid",
    missionIsSpecial: entry.missionIsSpecial === true,
    vehicleId,
    vehicleName: VEHICLE_DEFINITIONS[vehicleId]?.name ?? entry.vehicleName ?? "Vehicle",
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
    rewardPercent: Number(entry.rewardPercent ?? 0) || 0,
    uniquePercent: Number(entry.uniquePercent ?? 0) || 0,
    buildingSynergySummary: Array.isArray(entry.buildingSynergySummary) ? [...entry.buildingSynergySummary] : [],
    delayCount: Math.max(0, Number(entry.delayCount ?? 0) || 0),
    notes: String(entry.notes ?? "")
  };
}

function normalizePendingJourneyStage(stage = {}, index = 0) {
  const options = Array.isArray(stage?.options) ? stage.options.map((entry) => normalizeJourneyOption(entry)) : [];
  const presentation = JOURNEY_STAGE_PRESENTATION[String(stage?.kind ?? "journey").trim() || "journey"] ?? JOURNEY_STAGE_PRESENTATION.journey;
  return {
    id: String(stage?.id ?? createId("journey-stage")),
    index: Math.max(0, Number(stage?.index ?? index) || index),
    dayMarker: Math.max(1, Number(stage?.dayMarker ?? (index + 1) * JOURNEY_STAGE_DAY_SPAN) || (index + 1) * JOURNEY_STAGE_DAY_SPAN),
    kind: String(stage?.kind ?? "journey").trim() || "journey",
    cue: String(stage?.cue ?? presentation.cue).trim() || presentation.cue,
    iconKey: String(stage?.iconKey ?? presentation.iconKey).trim() || presentation.iconKey,
    tone: String(stage?.tone ?? presentation.tone).trim() || presentation.tone,
    title: String(stage?.title ?? "Journey Stage").trim() || "Journey Stage",
    prompt: String(stage?.prompt ?? "").trim(),
    options,
    chosenOptionId: stage?.chosenOptionId ? String(stage.chosenOptionId) : null,
    chosenLabel: stage?.chosenLabel ? String(stage.chosenLabel) : null,
    chosenSummary: stage?.chosenSummary ? String(stage.chosenSummary) : null
  };
}

function normalizePendingJourney(entry = {}) {
  const stages = Array.isArray(entry?.stages) ? entry.stages.map((stage, index) => normalizePendingJourneyStage(stage, index)) : [];
  return {
    id: String(entry?.id ?? createId("expedition-journey")),
    expedition: normalizeActiveExpedition(entry?.expedition ?? {}),
    returnDayOffset: Number(entry?.returnDayOffset ?? 0) || 0,
    returnDateLabel: String(entry?.returnDateLabel ?? formatDate(Number(entry?.returnDayOffset ?? 0) || 0)),
    travelDays: Math.max(1, Number(entry?.travelDays ?? 1) || 1),
    currentStageIndex: Math.max(0, Math.min(stages.length, Number(entry?.currentStageIndex ?? 0) || 0)),
    stages
  };
}

function normalizeMissionCard(card) {
  const type = EXPEDITION_TYPES[card?.typeId] ?? EXPEDITION_TYPES.resourceRun;
  const risk = MISSION_RISK_SETTINGS[card?.risk] ? card.risk : "Medium";
  const distance = MISSION_DISTANCE_SETTINGS[card?.distance] ? card.distance : "Mid";
  const suggestedDurationDays = EXPEDITION_DURATION_OPTIONS.includes(Number(card?.suggestedDurationDays))
    ? Number(card.suggestedDurationDays)
    : 7;
  return {
    id: String(card?.id ?? createId("mission")),
    templateId: String(card?.templateId ?? card?.id ?? "mission"),
    typeId: type.id,
    typeLabel: type.label,
    typeEmoji: type.emoji,
    name: String(card?.name ?? type.label).trim() || type.label,
    summary: String(card?.summary ?? type.summary).trim() || type.summary,
    risk,
    distance,
    suggestedDurationDays,
    likelyRewards: Array.isArray(card?.likelyRewards) ? [...card.likelyRewards] : [],
    recommendedVehicleTags: Array.isArray(card?.recommendedVehicleTags) ? [...card.recommendedVehicleTags] : [],
    buildingTags: Array.isArray(card?.buildingTags) ? [...card.buildingTags] : [],
    terrainTags: Array.isArray(card?.terrainTags) ? [...card.terrainTags] : [],
    isSpecial: card?.isSpecial === true,
    expiresDayOffset: Number(card?.expiresDayOffset ?? 0) || 0
  };
}

export function normalizeVehicleFleet(sourceFleet) {
  const baseFleet = createDefaultVehicleFleet();
  const migratedFleet = { ...baseFleet };
  for (const [rawVehicleId, amount] of Object.entries(sourceFleet ?? {})) {
    const vehicleId = normalizeVehicleId(rawVehicleId);
    if (VEHICLE_DEFINITIONS[vehicleId]?.requiresFleet === false) {
      continue;
    }
    migratedFleet[vehicleId] = (migratedFleet[vehicleId] ?? 0) + (Math.max(0, Number(amount) || 0));
  }
  return Object.fromEntries(
    VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId]?.requiresFleet !== false).map((vehicleId) => [
      vehicleId,
      Math.max(0, Number(migratedFleet?.[vehicleId] ?? baseFleet[vehicleId] ?? 0) || 0)
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
      archetypeId: typeof entry.archetypeId === "string" && entry.archetypeId.trim() ? entry.archetypeId.trim() : null,
      assignmentPostId:
        typeof entry.assignmentPostId === "string" && LEGEND_ASSIGNMENT_POST_BY_ID[entry.assignmentPostId]
          ? entry.assignmentPostId
          : null,
      bonuses: structuredClone(entry.bonuses ?? {}),
      expeditionTags: Array.isArray(entry.expeditionTags) ? [...entry.expeditionTags] : [],
      joinedDayOffset: Number(entry.joinedDayOffset ?? 0) || 0,
      joinedAt: String(entry.joinedAt ?? formatDate(Number(entry.joinedDayOffset ?? 0) || 0)),
      status: UNIQUE_STATUS_LABELS[entry.status] ? entry.status : "inCity",
      sourceTypeId: entry.sourceTypeId ?? null,
      originLabel:
        typeof entry.originLabel === "string" && entry.originLabel.trim()
          ? entry.originLabel.trim()
          : (EXPEDITION_TYPES[entry.sourceTypeId]?.label ?? "Unrecorded Route"),
      originMemory:
        typeof entry.originMemory === "string" && entry.originMemory.trim()
          ? entry.originMemory.trim()
          : `Reached the Drift by way of ${EXPEDITION_TYPES[entry.sourceTypeId]?.label ?? "an unrecorded road"} and stayed.`,
      arrivalLine:
        typeof entry.arrivalLine === "string" && entry.arrivalLine.trim()
          ? entry.arrivalLine.trim()
          : `Entered the city on ${String(entry.joinedAt ?? formatDate(Number(entry.joinedDayOffset ?? 0) || 0))}.`,
      sigilSeed:
        typeof entry.sigilSeed === "string" && entry.sigilSeed.trim()
          ? entry.sigilSeed.trim()
          : `${String(entry.fullName ?? "Unknown Notable")}|${String(entry.title ?? "Unique Citizen")}|${String(entry.sourceTypeId ?? "unknown")}`,
      routeHistory: Array.isArray(entry.routeHistory)
        ? entry.routeHistory
            .filter((record) => record && typeof record === "object")
            .map((record) => ({
              id: String(record.id ?? createId("legend-route")),
              kind: String(record.kind ?? "route").trim() || "route",
              label: String(record.label ?? "Recorded Route").trim() || "Recorded Route",
              detail: String(record.detail ?? "").trim(),
              date: String(record.date ?? formatDate(Number(record.dayOffset ?? entry.joinedDayOffset ?? 0) || 0)),
              dayOffset: Number(record.dayOffset ?? entry.joinedDayOffset ?? 0) || 0
            }))
        : [
            {
              id: createId("legend-route"),
              kind: "arrival",
              label: entry.originLabel ?? (EXPEDITION_TYPES[entry.sourceTypeId]?.label ?? "Recorded Route"),
              detail: entry.originMemory ?? "Reached the Drift and stayed.",
              date: String(entry.joinedAt ?? formatDate(Number(entry.joinedDayOffset ?? 0) || 0)),
              dayOffset: Number(entry.joinedDayOffset ?? 0) || 0
            }
          ]
    }));
}

function getPositiveRecord(source, template) {
  return Object.fromEntries(
    Object.keys(template).map((key) => [key, Math.max(0, Number(source?.[key] ?? 0) || 0)])
  );
}

function scalePositiveRecord(source, template, factor, decimals = 0) {
  return Object.fromEntries(
    Object.keys(template).map((key) => {
      const value = Math.max(0, Number(source?.[key] ?? 0) || 0);
      return [key, value > 0 ? roundTo(value * factor, decimals) : 0];
    })
  );
}

function pickStrongestPositiveBonus(record) {
  return Object.entries(record ?? {})
    .filter(([, amount]) => Number(amount) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))[0] ?? null;
}

function formatLegendBonusPart(key, amount) {
  const numericAmount = Number(amount ?? 0) || 0;
  if (numericAmount <= 0) {
    return "";
  }
  if (EXPEDITION_RESOURCE_REWARD_KEYS.includes(key)) {
    return `+${roundTo(numericAmount, 1)} ${key}/day`;
  }
  return `+${roundTo(numericAmount, 0)} ${key}`;
}

function joinLegendBonusParts(parts = []) {
  const filtered = parts.filter(Boolean);
  if (!filtered.length) {
    return "No active specialty bonus.";
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  if (filtered.length === 2) {
    return `${filtered[0]} and ${filtered[1]}`;
  }
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered[filtered.length - 1]}`;
}

export function getLegendAssignmentPosts() {
  return LEGEND_ASSIGNMENT_POSTS.map((post) => ({ ...post }));
}

export function getLegendAssignmentDetails(uniqueCitizen) {
  const assignmentPost = LEGEND_ASSIGNMENT_POST_BY_ID[uniqueCitizen?.assignmentPostId] ?? null;
  const resourceBonuses = createEmptyResourceRecord();
  const statBonuses = createEmptyLegendStatRecord();
  const expeditionTags = Array.isArray(uniqueCitizen?.expeditionTags) ? [...uniqueCitizen.expeditionTags] : [];
  let expeditionPowerPercent = 0;

  if (!assignmentPost) {
    return {
      post: null,
      iconKey: "citizens",
      summary: "At large in the city. This legend is only contributing their innate bonuses right now.",
      resourceBonuses,
      statBonuses,
      expeditionPowerPercent,
      expeditionTags,
      bonusSummary: "No active assignment bonus."
    };
  }

  const baseResources = getPositiveRecord(uniqueCitizen?.bonuses?.resources, createEmptyResourceRecord());
  const baseStats = getPositiveRecord(uniqueCitizen?.bonuses?.stats, createEmptyLegendStatRecord());

  if (assignmentPost.id === "district") {
    Object.assign(resourceBonuses, scalePositiveRecord(baseResources, createEmptyResourceRecord(), 0.55, 1));
    const strongestStat = pickStrongestPositiveBonus(baseStats);
    if (strongestStat) {
      statBonuses[strongestStat[0]] = Math.max(2, roundTo(Number(strongestStat[1]) * 0.22, 0));
    } else if (!Object.values(resourceBonuses).some((amount) => amount > 0)) {
      statBonuses.prosperity = 2;
    }
  } else if (assignmentPost.id === "council") {
    Object.assign(statBonuses, scalePositiveRecord(baseStats, createEmptyLegendStatRecord(), 0.45, 0));
    if (!Object.values(statBonuses).some((amount) => amount > 0)) {
      statBonuses.prestige = 2;
    }
  } else if (assignmentPost.id === "expedition") {
    expeditionPowerPercent = Math.max(6, roundTo(Math.max(0, Number(uniqueCitizen?.bonuses?.expeditionPowerPercent ?? 0) || 0) * 0.85, 0));
  }

  const resourceParts = Object.entries(resourceBonuses)
    .filter(([, amount]) => Number(amount) > 0)
    .slice(0, 2)
    .map(([key, amount]) => formatLegendBonusPart(key, amount));
  const statParts = Object.entries(statBonuses)
    .filter(([, amount]) => Number(amount) > 0)
    .slice(0, 2)
    .map(([key, amount]) => formatLegendBonusPart(key, amount));
  const expeditionPart =
    expeditionPowerPercent > 0
      ? `+${roundTo(expeditionPowerPercent, 0)}% expedition power${expeditionTags.length ? ` on ${expeditionTags.map((tag) => EXPEDITION_TYPES[tag]?.label ?? tag).join(", ")}` : ""}`
      : "";

  return {
    post: assignmentPost,
    iconKey: assignmentPost.iconKey,
    summary: assignmentPost.summary,
    resourceBonuses,
    statBonuses,
    expeditionPowerPercent,
    expeditionTags,
    bonusSummary: joinLegendBonusParts([...resourceParts, ...statParts, expeditionPart])
  };
}

export function setUniqueCitizenAssignment(state, citizenId, assignmentPostId = null) {
  const uniqueCitizen = (state.uniqueCitizens ?? []).find((entry) => entry.id === citizenId);
  if (!uniqueCitizen) {
    return { ok: false, reason: "Legend not found." };
  }

  const normalizedAssignmentId =
    typeof assignmentPostId === "string" && LEGEND_ASSIGNMENT_POST_BY_ID[assignmentPostId] ? assignmentPostId : null;
  uniqueCitizen.assignmentPostId = normalizedAssignmentId;
  uniqueCitizen.routeHistory = [
    {
      id: createId("legend-route"),
      kind: "assignment",
      label: normalizedAssignmentId ? (LEGEND_ASSIGNMENT_POST_BY_ID[normalizedAssignmentId]?.label ?? "Legend Post") : "At Large",
      detail: normalizedAssignmentId
        ? `${uniqueCitizen.fullName} accepted the ${LEGEND_ASSIGNMENT_POST_BY_ID[normalizedAssignmentId]?.label ?? "assigned"} role.`
        : `${uniqueCitizen.fullName} was released from formal duty and remains at large in the Drift.`,
      date: formatDate(state.calendar.dayOffset),
      dayOffset: state.calendar.dayOffset
    },
    ...(uniqueCitizen.routeHistory ?? [])
  ].slice(0, 8);
  return {
    ok: true,
    citizen: uniqueCitizen,
    assignment: getLegendAssignmentDetails(uniqueCitizen)
  };
}

export function getExpeditionRelicSlots() {
  return EXPEDITION_RELIC_SLOTS.map((slot) => ({ ...slot }));
}

export function getEquippedExpeditionRelics(state) {
  const expeditionState = normalizeExpeditionState(state.expeditions);
  return (expeditionState.relics ?? []).filter((relic) => relic.equippedSlotId && EXPEDITION_RELIC_SLOT_BY_ID[relic.equippedSlotId]);
}

function getRelicSynergyRequirementStatus(state, requirement) {
  if (requirement.type === "legendPost") {
    const match = (state.uniqueCitizens ?? []).find(
      (citizen) => citizen?.status === "inCity" && citizen?.assignmentPostId === requirement.value
    );
    return {
      ...requirement,
      met: Boolean(match),
      context: match ? `${match.fullName ?? match.title ?? "A legend"} is covering this post.` : "No legend is holding this post yet."
    };
  }

  if (requirement.type === "townFocus") {
    const focus = getCurrentTownFocus(state);
    const met = focus?.id === requirement.value;
    return {
      ...requirement,
      met,
      context: met ? `${focus?.name ?? "Current focus"} is active.` : `${requirement.label} is not active right now.`
    };
  }

  if (requirement.type === "buildingTag") {
    const activeBuildings = (state.buildings ?? []).filter(
      (building) => building?.isComplete && !building?.isRuined && Array.isArray(building.tags) && building.tags.includes(requirement.value)
    );
    return {
      ...requirement,
      met: activeBuildings.length > 0,
      context:
        activeBuildings.length > 0
          ? `${activeBuildings[0].displayName ?? activeBuildings[0].name ?? "An active building"} satisfies this link.`
          : `${requirement.label} is still missing.`
    };
  }

  return {
    ...requirement,
    met: false,
    context: "This synergy requirement is not recognized."
  };
}

export function getExpeditionRelicSynergyStatus(state, relic) {
  const synergy = normalizeExpeditionRelicSynergy(relic?.synergy);
  if (!synergy) {
    return null;
  }

  const requirementStatuses = synergy.requirements.map((requirement) => getRelicSynergyRequirementStatus(state, requirement));
  return {
    ...synergy,
    requirementStatuses,
    active: requirementStatuses.every((requirement) => requirement.met),
    missingLabels: requirementStatuses.filter((requirement) => !requirement.met).map((requirement) => requirement.label),
    metLabels: requirementStatuses.filter((requirement) => requirement.met).map((requirement) => requirement.label)
  };
}

export function getExpeditionRelicActiveBonuses(state, relic) {
  const bonuses = createRelicBonusRecord(relic?.bonuses);
  const synergy = getExpeditionRelicSynergyStatus(state, relic);
  const synergyBonuses = synergy?.active ? createRelicBonusRecord(synergy.bonuses) : createRelicBonusRecord();
  if (synergy?.active) {
    addRelicBonuses(bonuses, synergy.bonuses);
  }
  return {
    bonuses,
    synergy,
    synergyBonuses
  };
}

export function getEquippedExpeditionRelicBonuses(state) {
  return getEquippedExpeditionRelics(state).reduce(
    (record, relic) => {
      const activeBonuses = getExpeditionRelicActiveBonuses(state, relic).bonuses;
      addRelicBonuses(record, activeBonuses);
      return record;
    },
    {
      resources: createEmptyResourceRecord(),
      stats: createEmptyLegendStatRecord(),
      expeditionPowerPercent: 0,
      expeditionTags: []
    }
  );
}

function getExpeditionRelicExpeditionPowerPercent(state, expeditionTypeId) {
  return getEquippedExpeditionRelics(state).reduce((sum, relic) => {
    const activeBonuses = getExpeditionRelicActiveBonuses(state, relic).bonuses;
    const tags = activeBonuses.expeditionTags ?? [];
    if (Array.isArray(tags) && tags.length && expeditionTypeId && !tags.includes(expeditionTypeId)) {
      return sum;
    }
    return sum + (Number(activeBonuses.expeditionPowerPercent ?? 0) || 0);
  }, 0);
}

export function getExpeditionRelicOverview(state) {
  const expeditionState = normalizeExpeditionState(state.expeditions);
  const relics = expeditionState.relics ?? [];
  const equippedBySlot = Object.fromEntries(EXPEDITION_RELIC_SLOTS.map((slot) => [slot.id, null]));
  for (const relic of relics) {
    if (relic.equippedSlotId && equippedBySlot[relic.equippedSlotId] === null) {
      equippedBySlot[relic.equippedSlotId] = relic;
    }
  }

  const equippedRelics = Object.values(equippedBySlot).filter(Boolean);
  const storedRelics = relics.filter((relic) => !relic.equippedSlotId);
  return {
    totalRelics: relics.length,
    equippedCount: equippedRelics.length,
    activeSynergies: equippedRelics.filter((relic) => getExpeditionRelicSynergyStatus(state, relic)?.active).length,
    storedRelics: storedRelics.length,
    emptySlots: EXPEDITION_RELIC_SLOTS.filter((slot) => !equippedBySlot[slot.id]).length,
    equippedBySlot,
    equippedRelics,
    storedRelicsList: storedRelics
  };
}

export function setExpeditionRelicSlot(state, relicId, slotId = null) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const relics = state.expeditions.relics ?? [];
  const relic = relics.find((entry) => entry.id === relicId);
  if (!relic) {
    return { ok: false, reason: "Relic not found." };
  }

  if (!slotId) {
    relic.equippedSlotId = null;
    return { ok: true, relic, slot: null };
  }

  const slot = EXPEDITION_RELIC_SLOT_BY_ID[slotId] ?? null;
  if (!slot) {
    return { ok: false, reason: "Relic slot not found." };
  }

  const currentOccupant = relics.find((entry) => entry.equippedSlotId === slot.id);
  if (currentOccupant) {
    currentOccupant.equippedSlotId = null;
  }
  relic.equippedSlotId = slot.id;

  return {
    ok: true,
    relic,
    slot,
    replacedRelic: currentOccupant && currentOccupant.id !== relic.id ? currentOccupant : null
  };
}

export function normalizeExpeditionState(sourceState) {
  const base = createDefaultExpeditionState();
  const relics = Array.isArray(sourceState?.relics)
    ? sourceState.relics.filter((entry) => entry && typeof entry === "object").map((entry) => normalizeExpeditionRelic(entry))
    : base.relics;
  const claimedRelicSlots = new Set();
  for (const relic of relics) {
    if (!relic.equippedSlotId) {
      continue;
    }
    if (claimedRelicSlots.has(relic.equippedSlotId)) {
      relic.equippedSlotId = null;
      continue;
    }
    claimedRelicSlots.add(relic.equippedSlotId);
  }
  return {
    board: Array.isArray(sourceState?.board) ? sourceState.board.map((entry) => normalizeMissionCard(entry)) : base.board,
    active: Array.isArray(sourceState?.active)
      ? sourceState.active
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => normalizeActiveExpedition(entry))
      : base.active,
    pending: Array.isArray(sourceState?.pending)
      ? sourceState.pending.filter((entry) => entry && typeof entry === "object").map((entry) => normalizePendingJourney(entry))
      : base.pending,
    recent: Array.isArray(sourceState?.recent)
      ? sourceState.recent.map((entry) => createExpeditionRecentRecord(entry)).slice(0, MAX_RECENT_RETURNS)
      : base.recent,
    relics,
    aftermaths: Array.isArray(sourceState?.aftermaths)
      ? sourceState.aftermaths.filter((entry) => entry && typeof entry === "object").map((entry) => normalizeExpeditionAftermath(entry))
      : base.aftermaths,
    followUps: Array.isArray(sourceState?.followUps)
      ? sourceState.followUps.filter((entry) => entry && typeof entry === "object").map((entry) => normalizeExpeditionFollowUp(entry))
      : base.followUps,
    lastRefreshDayOffset:
      sourceState?.lastRefreshDayOffset === null || sourceState?.lastRefreshDayOffset === undefined
        ? base.lastRefreshDayOffset
        : Number(sourceState.lastRefreshDayOffset) || 0,
    nextExpeditionNumber: Math.max(1, Number(sourceState?.nextExpeditionNumber ?? base.nextExpeditionNumber) || 1),
    uniqueProgress: Math.max(0, Number(sourceState?.uniqueProgress ?? base.uniqueProgress) || 0),
    nextUniqueThreshold: Math.max(60, Number(sourceState?.nextUniqueThreshold ?? base.nextUniqueThreshold) || DEFAULT_UNIQUE_THRESHOLD)
  };
}

function getMissionApproach(approachId) {
  return EXPEDITION_APPROACHES[approachId] ?? EXPEDITION_APPROACHES.balanced;
}

function getExpeditionCallsign(typeId, number) {
  const normalizedNumber = Math.max(1, Number(number ?? 1) || 1);
  const pool = EXPEDITION_CALLSIGN_POOLS[typeId] ?? EXPEDITION_GENERAL_CALLSIGNS;
  if (normalizedNumber <= pool.length) {
    return pool[normalizedNumber - 1];
  }

  const overflowPool = EXPEDITION_CALLSIGN_OVERFLOW[typeId] ?? EXPEDITION_CALLSIGN_OVERFLOW.fallback;
  const overflowIndex = normalizedNumber - pool.length - 1;
  const prefix = overflowPool.prefixes[overflowIndex % overflowPool.prefixes.length];
  const suffix = overflowPool.suffixes[Math.floor(overflowIndex / overflowPool.prefixes.length) % overflowPool.suffixes.length];
  return `${prefix} ${suffix}`;
}

export function formatExpeditionDisplayName(expedition) {
  const expeditionNumber = Math.max(1, Number(expedition?.expeditionNumber ?? 1) || 1);
  const expeditionTypeId = String(expedition?.typeId ?? "resourceRun").trim() || "resourceRun";
  const expeditionCallsign =
    String(expedition?.expeditionCallsign ?? getExpeditionCallsign(expeditionTypeId, expeditionNumber)).trim() ||
    getExpeditionCallsign(expeditionTypeId, expeditionNumber);
  return String(expedition?.expeditionLabel ?? "").trim() || `Expedition ${expeditionNumber}: ${expeditionCallsign}`;
}

function getExpeditionType(typeId) {
  return EXPEDITION_TYPES[typeId] ?? EXPEDITION_TYPES.resourceRun;
}

function getVehicleDefinition(vehicleId) {
  return VEHICLE_DEFINITIONS[normalizeVehicleId(vehicleId)] ?? VEHICLE_DEFINITIONS[VEHICLE_ORDER[0]];
}

function getMissionRiskSettings(risk) {
  return MISSION_RISK_SETTINGS[risk] ?? MISSION_RISK_SETTINGS.Medium;
}

function getMissionDistanceSettings(distance) {
  return MISSION_DISTANCE_SETTINGS[distance] ?? MISSION_DISTANCE_SETTINGS.Mid;
}

function randomIntInclusive(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function drawMissionTemplates(isSpecial, count, excludedTemplateIds = new Set()) {
  const pool = EXPEDITION_MISSION_TEMPLATES.filter((template) => Boolean(template.isSpecial) === Boolean(isSpecial) && !excludedTemplateIds.has(template.id));
  const picks = [];
  const remaining = [...pool];
  while (remaining.length && picks.length < count) {
    const index = Math.floor(Math.random() * remaining.length);
    picks.push(remaining.splice(index, 1)[0]);
  }
  return picks;
}

function createMissionCardFromTemplate(state, template) {
  const type = getExpeditionType(template.typeId);
  const expiresInDays = randomIntInclusive(7, 14);
  return normalizeMissionCard({
    id: createId("mission"),
    templateId: template.id,
    typeId: type.id,
    name: template.name,
    summary: template.summary,
    risk: template.risk,
    distance: template.distance,
    suggestedDurationDays: template.suggestedDurationDays,
    likelyRewards: template.likelyRewards,
    recommendedVehicleTags: template.recommendedVehicleTags,
    buildingTags: template.buildingTags,
    terrainTags: template.terrainTags,
    isSpecial: template.isSpecial === true,
    expiresDayOffset: state.calendar.dayOffset + expiresInDays
  });
}

export function refreshExpeditionBoardIfNeeded(state, { force = false } = {}) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const currentDay = Number(state.calendar?.dayOffset ?? 0) || 0;
  const board = (state.expeditions.board ?? []).filter((mission) => mission.expiresDayOffset >= currentDay);
  const shouldRefresh =
    force ||
    state.expeditions.lastRefreshDayOffset === null ||
    currentDay - Number(state.expeditions.lastRefreshDayOffset ?? currentDay) >= EXPEDITION_BOARD_REFRESH_DAYS;

  if (!shouldRefresh) {
    state.expeditions.board = board;
    return state.expeditions.board;
  }

  const normalCount = 4 + randomIntInclusive(1, 3);
  const specialCount = randomIntInclusive(0, 2);
  const excludedTemplateIds = new Set();
  const nextBoard = [];

  for (const template of drawMissionTemplates(false, normalCount, excludedTemplateIds)) {
    excludedTemplateIds.add(template.id);
    nextBoard.push(createMissionCardFromTemplate(state, template));
  }

  for (const template of drawMissionTemplates(true, specialCount, excludedTemplateIds)) {
    excludedTemplateIds.add(template.id);
    nextBoard.push(createMissionCardFromTemplate(state, template));
  }

  state.expeditions.board = nextBoard;
  state.expeditions.lastRefreshDayOffset = currentDay;
  return nextBoard;
}

function findMissionCard(state, missionId, fallbackTypeId = EXPEDITION_ORDER[0]) {
  const board = state.expeditions?.board ?? [];
  if (missionId) {
    const match = board.find((mission) => mission.id === missionId);
    if (match) {
      return match;
    }
  }
  return board[0] ?? normalizeMissionCard({ typeId: fallbackTypeId });
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
    if (VEHICLE_DEFINITIONS[expedition.vehicleId]?.requiresFleet === false) {
      continue;
    }
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
    VEHICLE_ORDER.map((vehicleId) => {
      const definition = VEHICLE_DEFINITIONS[vehicleId];
      if (definition?.requiresFleet === false) {
        return [vehicleId, 1];
      }
      return [vehicleId, Math.max(0, (vehicles[vehicleId] ?? 0) - (assignments[vehicleId] ?? 0))];
    })
  );
}

export function getExpeditionCalendarEntries(state) {
  return (state.expeditions?.active ?? []).map((expedition) => ({
    id: `${expedition.id}-return`,
    dayOffset: expedition.expectedReturnDayOffset,
    name: `Expected Return: ${expedition.missionName ?? expedition.typeLabel}`,
    type: "Expedition",
    description: `${expedition.missionName ?? expedition.typeLabel} is expected to return ${getExpeditionTravelLabel(expedition)}.`
  }));
}

export function getUniqueCitizenResourceBonuses(state) {
  const total = createEmptyResourceRecord();
  for (const uniqueCitizen of state.uniqueCitizens ?? []) {
    if (uniqueCitizen.status !== "inCity") {
      continue;
    }
    const assignment = getLegendAssignmentDetails(uniqueCitizen);
    for (const key of EXPEDITION_RESOURCE_REWARD_KEYS) {
      total[key] += Number(uniqueCitizen.bonuses?.resources?.[key] ?? 0) || 0;
      total[key] += Number(assignment.resourceBonuses?.[key] ?? 0) || 0;
    }
  }
  const relicBonuses = getEquippedExpeditionRelicBonuses(state);
  for (const key of EXPEDITION_RESOURCE_REWARD_KEYS) {
    total[key] += Number(relicBonuses.resources?.[key] ?? 0) || 0;
  }
  return total;
}

export function getUniqueCitizenStatBonuses(state) {
  const totals = (state.uniqueCitizens ?? []).reduce(
    (record, uniqueCitizen) => {
      if (uniqueCitizen.status !== "inCity") {
        return record;
      }
      const assignment = getLegendAssignmentDetails(uniqueCitizen);
      for (const [key, amount] of Object.entries(uniqueCitizen.bonuses?.stats ?? {})) {
        record[key] = (record[key] ?? 0) + (Number(amount) || 0);
      }
      for (const [key, amount] of Object.entries(assignment.statBonuses ?? {})) {
        record[key] = (record[key] ?? 0) + (Number(amount) || 0);
      }
      return record;
    },
    { prosperity: 0, defense: 0, security: 0, prestige: 0, morale: 0, health: 0 }
  );
  const relicBonuses = getEquippedExpeditionRelicBonuses(state);
  for (const [key, amount] of Object.entries(relicBonuses.stats ?? {})) {
    totals[key] = (totals[key] ?? 0) + (Number(amount) || 0);
  }
  return totals;
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
    const assignment = getLegendAssignmentDetails(uniqueCitizen);
    percent += Number(uniqueCitizen.bonuses?.expeditionPowerPercent ?? 0) || 0;
    percent += Number(assignment.expeditionPowerPercent ?? 0) || 0;
  }
  percent += getExpeditionRelicExpeditionPowerPercent(state, expeditionTypeId);
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

function getTeamRequestSize(teamRequest) {
  return Object.values(teamRequest ?? {}).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
}

function getVehicleCapacity(vehicle) {
  return Math.max(0, Math.floor(Number(vehicle?.maxPeople ?? 0) || 0));
}

function getExpeditionTravelLabel(expedition) {
  if (VEHICLE_DEFINITIONS[expedition?.vehicleId]?.requiresFleet === false) {
    return "on foot";
  }
  return `aboard the ${expedition?.vehicleName ?? "assigned vehicle"}`;
}

function getBuildingIdentitySet(building) {
  return new Set([building?.name, building?.displayName, building?.key].filter(Boolean));
}

function getExpeditionBuildingSynergy(state, mission, vehicle) {
  const summary = [];
  const bonuses = {
    powerPercent: 0,
    rewardPercent: 0,
    uniquePercent: 0,
    safetyPercent: 0
  };

  for (const building of state.buildings ?? []) {
    if (!building?.isComplete || building?.isRuined) {
      continue;
    }
    const ids = getBuildingIdentitySet(building);
    const matches = (name) => ids.has(name);

    if (matches("Skyharbor") && vehicle.type === "air") {
      bonuses.powerPercent += 10;
      bonuses.rewardPercent += 10;
      summary.push("Skyharbor supports air missions.");
    }
    if (matches("Airship Dockyard") && vehicle.type === "air") {
      bonuses.powerPercent += 15;
      summary.push("Airship Dockyard streamlines air deployment.");
    }
    if (matches("Trade Post") && mission.typeId === "diplomatic") {
      bonuses.powerPercent += 6;
      bonuses.rewardPercent += 20;
      summary.push("Trade Post strengthens diplomatic returns.");
    }
    if (matches("Market Square") && ["diplomatic", "recruit"].includes(mission.typeId)) {
      bonuses.rewardPercent += 10;
      summary.push("Market Square attracts better trade and recruits.");
    }
    if (matches("Beast Pens") && mission.typeId === "monsterHunt") {
      bonuses.powerPercent += 8;
      bonuses.rewardPercent += 20;
      summary.push("Beast Pens improve monster capture logistics.");
    }
    if (matches("Town Guard Post") && ["rescue", "monsterHunt"].includes(mission.typeId)) {
      bonuses.powerPercent += 5;
      bonuses.safetyPercent += 8;
      summary.push("Town Guard Post supports risky field operations.");
    }
    if (matches("Barracks") && ["recruit", "monsterHunt"].includes(mission.typeId)) {
      bonuses.powerPercent += 10;
      summary.push("Barracks harden expedition crews.");
    }
    if (matches("Hospital")) {
      bonuses.safetyPercent += 12;
      summary.push("Hospital reduces expedition strain.");
    }
    if (matches("Raestorum Center")) {
      bonuses.safetyPercent += 20;
      if (["rescue", "pilgrimage"].includes(mission.typeId)) {
        bonuses.powerPercent += 6;
      }
      summary.push("Raestorum Center improves recovery and survival.");
    }
    if (matches("Oracle") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 6;
      bonuses.uniquePercent += 12;
      summary.push("Oracle sharpens foresight for arcane journeys.");
    }
    if (matches("Relic Sanctum") && mission.typeId === "relicRecovery") {
      bonuses.rewardPercent += 15;
      bonuses.uniquePercent += 8;
      summary.push("Relic Sanctum resonates with relic expeditions.");
    }
    if (matches("Arcana Tower") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 8;
      bonuses.rewardPercent += 20;
      summary.push("Arcana Tower amplifies arcane expeditions.");
    }
    if (matches("Library") && ["relicRecovery", "diplomatic"].includes(mission.typeId)) {
      bonuses.powerPercent += 8;
      summary.push("Library knowledge clarifies mission planning.");
    }
    if (matches("School of Driftum") && ["crystalHunt", "pilgrimage"].includes(mission.typeId)) {
      bonuses.powerPercent += 12;
      summary.push("School of Driftum boosts magical fieldcraft.");
    }
    if (matches("Workshop Quarter") && vehicle.type === "land") {
      bonuses.powerPercent += 6;
      bonuses.rewardPercent += 10;
      summary.push("Workshop Quarter supports long overland supply runs.");
    }
    if (matches("Caravan Outpost") && vehicle.type === "land") {
      bonuses.powerPercent += 5;
      bonuses.rewardPercent += 10;
      summary.push("Caravan Outpost helps land buggies travel better.");
    }
    if (matches("Lighthouse") && ["resourceRun", "diplomatic"].includes(mission.typeId)) {
      bonuses.safetyPercent += 8;
      summary.push("Lighthouse improves route confidence.");
    }
  }

  return {
    ...bonuses,
    summary: [...new Set(summary)]
  };
}

function computeExpeditionPowerScore(state, expeditionType, mission, approach, vehicle, team, committedResources, durationDays, buildingSynergy) {
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
  const missionRisk = getMissionRiskSettings(mission?.risk);
  const favoredVehicleBonus = (vehicle.favoredMissionTags ?? []).includes(expeditionType.id) ? 0.08 : 0;
  const scoutingBonus = (Number(vehicle.scouting ?? 1) - 1) * 0.55;
  const stealthBonus = (Number(vehicle.stealth ?? 1) - 1) * 0.2;
  const cargoBonus = (Number(vehicle.cargoMultiplier ?? 1) - 1) * 0.45;
  const safetyBonus = (Number(vehicle.safety ?? 1) - 1) * 0.3;
  const vehicleFactor = 1 + favoredVehicleBonus + scoutingBonus + stealthBonus + cargoBonus + safetyBonus;
  const synergyFactor = 1 + (Number(buildingSynergy?.powerPercent ?? 0) || 0) / 100;
  const rewardFactor = 1 + (Number(missionRisk.reward ?? 1) - 1);

  return roundTo(
    (teamPower + supplyScore) *
      durationFactor *
      (Number(approach.rewardModifier ?? 1) || 1) *
      uniqueBonus *
      vehicleFactor *
      synergyFactor *
      rewardFactor,
    2
  );
}

function computeExpeditionDifficultyScore(expeditionType, mission, approach, vehicle, durationDays, buildingSynergy) {
  const baseDifficulty = 5 + durationDays * 1.2;
  const missionPressure = 1 + Number(expeditionType.uniqueWeight ?? 1) * 0.18;
  const missionRisk = getMissionRiskSettings(mission?.risk);
  const distancePressure = getMissionDistanceSettings(mission?.distance);
  const vehicleMitigation =
    1 -
    clamp(
      ((Number(vehicle.safety ?? 1) - 1) * 0.22 + (Number(vehicle.scouting ?? 1) - 1) * 0.18) +
        (Number(buildingSynergy?.safetyPercent ?? 0) || 0) / 100,
      0,
      0.3
    );
  return roundTo(
    baseDifficulty *
      missionPressure *
      missionRisk.difficulty *
      distancePressure.difficulty *
      (Number(approach.riskModifier ?? 1) || 1) *
      vehicleMitigation,
    2
  );
}

export function getExpeditionOutcomeLabel(successScore) {
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

function buildExpeditionRelicReward(state, expedition, rewardScore) {
  const expeditionState = normalizeExpeditionState(state.expeditions);
  const ownedTemplateIds = new Set((expeditionState.relics ?? []).map((relic) => relic.templateId).filter(Boolean));
  const availableTemplates = EXPEDITION_RELIC_TEMPLATES.filter((template) => !ownedTemplateIds.has(template.id));
  if (!availableTemplates.length) {
    return null;
  }

  const baseChance = Number(EXPEDITION_RELIC_TYPE_CHANCE[expedition?.typeId] ?? 0.14) || 0.14;
  const riskBonus = expedition?.missionRisk === "High" ? 0.14 : expedition?.missionRisk === "Medium" ? 0.06 : 0.02;
  const qualityBonus = clamp((Number(rewardScore ?? 0) - 8) * 0.015, 0, 0.16);
  const specialBonus = expedition?.missionIsSpecial ? 0.08 : 0;
  const successBonus = clamp((Number(expedition?.successScore ?? 0) - 1) * 0.12, 0, 0.08);
  const relicChance = clamp(baseChance + riskBonus + qualityBonus + specialBonus + successBonus, 0.08, 0.78);
  if (Math.random() > relicChance) {
    return null;
  }

  const selectedTemplateId = getWeightedRandomChoice(
    Object.fromEntries(
      availableTemplates.map((template) => [
        template.id,
        (template.sourceTypeIds?.includes(expedition?.typeId) ? 3.5 : 1) +
          (template.kindLabel === "Trophy" && expedition?.typeId === "monsterHunt" ? 1.5 : 0)
      ])
    )
  );
  const template = availableTemplates.find((entry) => entry.id === selectedTemplateId) ?? availableTemplates[0];
  return createExpeditionRelicRecord(template, expedition, Number(state.calendar?.dayOffset ?? 0) || 0);
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

function summarizeRelicReward(relic) {
  if (!relic) {
    return "";
  }
  return `${relic.name} (${relic.kindLabel})`;
}

function hashLegendSeed(value = "") {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash);
}

function pickLegendPattern(options, seedValue, fallback) {
  if (!Array.isArray(options) || !options.length) {
    return fallback;
  }
  return options[seedValue % options.length] ?? fallback;
}

function applyLegendPattern(template, replacements) {
  return Object.entries(replacements).reduce(
    (result, [token, value]) => result.replaceAll(token, value),
    String(template ?? "")
  );
}

function buildUniqueCitizenIdentity(expedition, archetype, fullName, joinedAt) {
  const expeditionType = EXPEDITION_TYPES[expedition?.typeId] ?? null;
  const missionLabel = String(expedition?.missionName ?? expeditionType?.label ?? "the frontier road").trim() || "the frontier road";
  const vehicleClause = expedition?.vehicleName ? ` ${getExpeditionTravelLabel(expedition)}` : "";
  const seedValue = hashLegendSeed(`${fullName}|${archetype?.id ?? "legend"}|${expedition?.typeId ?? "unknown"}|${missionLabel}`);
  const originTemplate = pickLegendPattern(
    LEGEND_ORIGIN_PATTERNS[expedition?.typeId],
    seedValue,
    "Reached the Drift by way of %mission% and chose to remain%vehicle%."
  );
  const arrivalTemplate = pickLegendPattern(
    LEGEND_ARRIVAL_PATTERNS[archetype?.id],
    seedValue,
    "Entered the Drift on %joinedAt% and immediately drew notice from the city."
  );

  return {
    originLabel: expeditionType?.label ?? "Unrecorded Route",
    originMemory: applyLegendPattern(originTemplate, {
      "%mission%": missionLabel,
      "%vehicle%": vehicleClause,
      "%type%": expeditionType?.label ?? "Expedition"
    }),
    arrivalLine: applyLegendPattern(arrivalTemplate, {
      "%joinedAt%": joinedAt,
      "%mission%": missionLabel
    }),
    sigilSeed: `${fullName}|${archetype?.id ?? "legend"}|${expedition?.typeId ?? "unknown"}|${missionLabel}`
  };
}

function createUniqueCitizen(state, expedition) {
  const expeditionTypeId = expedition?.typeId ?? null;
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

  const joinedAt = formatDate(state.calendar.dayOffset);
  const identity = buildUniqueCitizenIdentity(expedition, archetype, fullName, joinedAt);

  const uniqueCitizen = {
    id: createId("unique-citizen"),
    fullName,
    title: archetype.title,
    className: archetype.className,
    effectText: archetype.effectText,
    archetypeId: archetype.id,
    assignmentPostId: null,
    bonuses: structuredClone(archetype.bonuses ?? {}),
    expeditionTags: [...(archetype.expeditionTags ?? [])],
    joinedDayOffset: state.calendar.dayOffset,
    joinedAt,
    status: "inCity",
    sourceTypeId: expeditionTypeId,
    routeHistory: [
      {
        id: createId("legend-route"),
        kind: "arrival",
        label: identity.originLabel,
        detail: identity.originMemory,
        date: joinedAt,
        dayOffset: state.calendar.dayOffset
      }
    ],
    ...identity
  };

  state.uniqueCitizens = [...(state.uniqueCitizens ?? []), uniqueCitizen];
  addCitizensByRarity(state, archetype.className, "Epic", 1, "Unique Citizen");
  return uniqueCitizen;
}

export function addManualUniqueCitizen(state, payload = {}) {
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

  const archetype =
    UNIQUE_CITIZEN_ARCHETYPES.find((entry) => entry.id === String(payload.archetypeId ?? "").trim()) ??
    UNIQUE_CITIZEN_ARCHETYPES[0];
  if (!archetype) {
    return { ok: false, reason: "No Legend archetypes are available." };
  }

  const existingNames = new Set((state.uniqueCitizens ?? []).map((entry) => String(entry.fullName ?? "").trim().toLowerCase()).filter(Boolean));
  let fullName = String(payload.fullName ?? "").trim();
  if (fullName && existingNames.has(fullName.toLowerCase())) {
    return { ok: false, reason: "A Legend with that name already exists." };
  }

  let guard = 0;
  while (!fullName && guard < 24) {
    const candidateName = drawUniqueCitizenFullName(Math.random());
    if (!existingNames.has(candidateName.toLowerCase())) {
      fullName = candidateName;
      break;
    }
    guard += 1;
  }
  if (!fullName) {
    fullName = `Manual Legend ${state.uniqueCitizens.length + 1}`;
  }

  const sourceTypeId =
    EXPEDITION_TYPES[String(payload.sourceTypeId ?? "").trim()]?.id ??
    archetype.expeditionTags?.find((typeId) => EXPEDITION_TYPES[typeId]) ??
    EXPEDITION_ORDER[0] ??
    null;
  const joinedDayOffset = Number(state.calendar?.dayOffset ?? 0) || 0;
  const joinedAt = formatDate(joinedDayOffset);
  const originLabel = String(payload.originLabel ?? "").trim();
  const sourceLabel = EXPEDITION_TYPES[sourceTypeId]?.label ?? "Manual Addition";
  const manualExpedition = {
    typeId: sourceTypeId,
    typeLabel: sourceLabel,
    missionName: originLabel || sourceLabel
  };
  const identity = buildUniqueCitizenIdentity(manualExpedition, archetype, fullName, joinedAt);
  const title = String(payload.title ?? "").trim() || archetype.title;
  const effectText = String(payload.effectText ?? "").trim() || archetype.effectText;
  const originMemory = String(payload.originMemory ?? "").trim() || identity.originMemory;
  const arrivalLine = String(payload.arrivalLine ?? "").trim() || identity.arrivalLine;

  const uniqueCitizen = normalizeUniqueCitizens([
    {
      id: createId("unique-citizen"),
      fullName,
      title,
      className: archetype.className,
      effectText,
      archetypeId: archetype.id,
      assignmentPostId: null,
      bonuses: structuredClone(archetype.bonuses ?? {}),
      expeditionTags: [...(archetype.expeditionTags ?? [])],
      joinedDayOffset,
      joinedAt,
      status: "inCity",
      sourceTypeId,
      originLabel: originLabel || identity.originLabel,
      originMemory,
      arrivalLine,
      sigilSeed: identity.sigilSeed,
      routeHistory: [
        {
          id: createId("legend-route"),
          kind: "manual",
          label: originLabel || identity.originLabel,
          detail: originMemory,
          date: joinedAt,
          dayOffset: joinedDayOffset
        }
      ]
    }
  ])[0];

  state.uniqueCitizens = [...(state.uniqueCitizens ?? []), uniqueCitizen];
  addCitizensByRarity(state, uniqueCitizen.className, "Epic", 1, "Manual Legend");
  state.historyLog = Array.isArray(state.historyLog) ? state.historyLog : [];
  addHistoryEntry(state, {
    category: "Legend",
    title: uniqueCitizen.fullName,
    details: `${uniqueCitizen.fullName} was added manually as ${uniqueCitizen.title}.`
  });

  return { ok: true, citizen: uniqueCitizen };
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
  if (rewards.relic) {
    state.expeditions = normalizeExpeditionState(state.expeditions);
    state.expeditions.relics = [normalizeExpeditionRelic(rewards.relic), ...(state.expeditions.relics ?? [])];
  }
}

function scaleRecruitBundles(recruits, multiplier) {
  for (const bundle of Object.values(recruits ?? {})) {
    for (const rarity of Object.keys(bundle ?? {})) {
      bundle[rarity] = Math.max(0, Math.round((Number(bundle[rarity]) || 0) * multiplier));
    }
  }
}

function applyExpeditionOutcomeModifiers(expedition, rewards) {
  const modifiers = [];

  if (expedition.successScore >= 1.25 && Math.random() < 0.35) {
    for (const key of Object.keys(rewards.resources ?? {})) {
      rewards.resources[key] = Math.max(0, Math.round((Number(rewards.resources[key]) || 0) * 1.2));
    }
    modifiers.push("Bonus Cache");
  }

  if (expedition.successScore < 0.8 && Math.random() < 0.3) {
    for (const key of Object.keys(rewards.resources ?? {})) {
      rewards.resources[key] = Math.max(0, Math.round((Number(rewards.resources[key]) || 0) * 0.8));
    }
    scaleRecruitBundles(rewards.recruits, 0.8);
    modifiers.push("Lost Supplies");
  }

  if (expedition.typeId === "monsterHunt" && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.resources.salvage = (Number(rewards.resources.salvage) || 0) + 6;
    modifiers.push("Captured Trophy");
  }

  if (expedition.typeId === "rescue" && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.recruits.Laborers = rewards.recruits.Laborers ?? { Common: 0, Rare: 0, Epic: 0 };
    rewards.recruits.Laborers.Common += randomIntInclusive(1, 3);
    modifiers.push("Unexpected Survivors");
  }

  if (["crystalHunt", "pilgrimage"].includes(expedition.typeId) && expedition.successScore >= 1 && Math.random() < 0.25) {
    rewards.resources.mana = (Number(rewards.resources.mana) || 0) + 4;
    rewards.shards.Common = (Number(rewards.shards.Common) || 0) + 10;
    modifiers.push("Arcane Windfall");
  }

  return modifiers;
}

function buildExpeditionRewards(state, expedition, journeyProjection = null) {
  const expeditionType = getExpeditionType(expedition.typeId);
  const missionRisk = getMissionRiskSettings(expedition.missionRisk);
  const qualityNoise = 0.88 + Math.random() * 0.3;
  const rewardSynergy = 1 + (Number(expedition.rewardPercent ?? 0) || 0) / 100;
  const rewardScore = Math.max(
    0.75,
    expedition.successScore *
      qualityNoise *
      4 *
      missionRisk.reward *
      rewardSynergy *
      (Number(journeyProjection?.rewardMultiplier ?? 1) || 1)
  );
  const citizenRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.citizens ?? 0) || 0);
  const resourceRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.resources ?? 0) || 0);
  const crystalRewardScore = rewardScore * (Number(expeditionType.rewardFocus?.crystals ?? 0) || 0);
  const recruits = buildRecruitRewards(expeditionType, citizenRewardScore);
  const resources = buildResourceRewards(expeditionType, resourceRewardScore);
  const crystalRewards = buildCrystalRewards(expeditionType, crystalRewardScore);
  scaleRecruitBundles(recruits, Number(journeyProjection?.recruitMultiplier ?? 1) || 1);
  addResourceBonuses(resources, journeyProjection?.resourceBonuses);
  addCrystalBonuses(crystalRewards.crystals, journeyProjection?.crystalBonuses);
  addCrystalBonuses(crystalRewards.shards, journeyProjection?.shardBonuses);

  state.expeditions.uniqueProgress += Math.round(
    rewardScore *
      (Number(expeditionType.uniqueWeight ?? 1) || 1) *
      missionRisk.unique *
      (1 + (Number(journeyProjection?.uniquePercent ?? expedition.uniquePercent ?? 0) || 0) / 100)
  );

  let uniqueCitizen = null;
  if (state.expeditions.uniqueProgress >= state.expeditions.nextUniqueThreshold && expedition.successScore >= 0.9) {
    uniqueCitizen = createUniqueCitizen(state, expedition);
    state.expeditions.uniqueProgress -= state.expeditions.nextUniqueThreshold;
    state.expeditions.nextUniqueThreshold = Math.round(state.expeditions.nextUniqueThreshold * 1.28 + 30);
  }

  const relic = buildExpeditionRelicReward(state, expedition, rewardScore);

  const modifiers = applyExpeditionOutcomeModifiers(expedition, {
    resources,
    recruits,
    ...crystalRewards
  });

  if (journeyProjection?.modifiers?.length) {
    modifiers.unshift(...journeyProjection.modifiers);
  }

  return {
    resources,
    recruits,
    relic,
    uniqueCitizen,
    modifiers,
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

function addResourceBonuses(target, source) {
  for (const key of EXPEDITION_RESOURCE_REWARD_KEYS) {
    target[key] = (Number(target[key]) || 0) + (Number(source?.[key] ?? 0) || 0);
  }
}

function addCrystalBonuses(target, source) {
  for (const rarity of RARITY_ORDER) {
    target[rarity] = (Number(target[rarity]) || 0) + (Number(source?.[rarity] ?? 0) || 0);
  }
}

function createExpeditionAftermath(state, expedition, config = {}) {
  const durationDays = Math.max(3, Number(config.durationDays ?? 8) || 8);
  return normalizeExpeditionAftermath({
    id: createId("expedition-aftermath"),
    title: config.title,
    summary: config.summary,
    effectText: config.effectText,
    iconKey: config.iconKey,
    sourceMissionName: expedition.missionName ?? expedition.typeLabel ?? "Expedition",
    severity: config.severity,
    startedDayOffset: state.calendar.dayOffset,
    expiresDayOffset: state.calendar.dayOffset + durationDays,
    startedAt: formatDate(state.calendar.dayOffset),
    expiresAt: formatDate(state.calendar.dayOffset + durationDays),
    effects: config.effects
  });
}

function createExpeditionFollowUp(state, expedition, aftermath, config = {}) {
  return normalizeExpeditionFollowUp({
    id: createId("expedition-follow-up"),
    aftermathId: aftermath?.id ?? null,
    title: config.title,
    detail: config.detail,
    iconKey: config.iconKey ?? aftermath?.iconKey ?? "route",
    sourceMissionName: expedition.missionName ?? expedition.typeLabel ?? "Expedition",
    urgency: config.urgency ?? "medium",
    createdDayOffset: state.calendar.dayOffset,
    options: config.options
  });
}

function buildExpeditionAftermathPackage(state, expedition, rewards, journeyProjection = null) {
  const modifiers = new Set([...(rewards.modifiers ?? []), ...(journeyProjection?.modifiers ?? [])]);

  if (modifiers.has("Unexpected Survivors")) {
    const aftermath = createExpeditionAftermath(state, expedition, {
      title: "Recovered Families",
      summary: "The return brought in extra survivors who need shelter and civic steadiness for a short stretch.",
      effectText: "+6 prosperity and +4 morale while the city absorbs the newcomers.",
      iconKey: "citizens",
      severity: "boon",
      durationDays: 10,
      effects: { stats: { prosperity: 6, morale: 4, populationSupport: 40 } }
    });
    const followUp = createExpeditionFollowUp(state, expedition, aftermath, {
      title: "Recovered families need placement",
      detail: "The returnees can be folded into the city carefully or settled quickly for immediate relief.",
      urgency: "medium",
      iconKey: "citizens",
      options: [
        {
          id: "settle-carefully",
          label: "Settle Carefully",
          summary: "Lean into a longer civic welcome.",
          outcome: "Extended the recovered-families boon with a steadier civic response.",
          effects: { stats: { morale: 3, health: 2 } },
          durationDeltaDays: 4
        },
        {
          id: "settle-fast",
          label: "Settle Fast",
          summary: "Convert the arrivals into immediate labor and stores.",
          outcome: "Converted part of the return into immediate food and materials.",
          effects: { resources: { food: 20, materials: 16 } },
          durationDeltaDays: -2
        }
      ]
    });
    return { aftermath, followUp };
  }

  if (modifiers.has("Arcane Windfall")) {
    const aftermath = createExpeditionAftermath(state, expedition, {
      title: "Open Ley Window",
      summary: "The return disturbed a useful arcane channel that will hum for a few days.",
      effectText: "+1.5 mana/day and +5 prestige while the ley window holds.",
      iconKey: "mana",
      severity: "boon",
      durationDays: 9,
      effects: { resources: { mana: 1.5 }, stats: { prestige: 5 } }
    });
    const followUp = createExpeditionFollowUp(state, expedition, aftermath, {
      title: "A ley window is still open",
      detail: "You can harvest it aggressively or stabilize it for a safer, longer benefit.",
      urgency: "high",
      iconKey: "mana",
      options: [
        {
          id: "harvest-window",
          label: "Harvest It",
          summary: "Take immediate mana before the channel fades.",
          outcome: "Drew immediate mana from the unstable ley window.",
          effects: { resources: { mana: 24 } },
          durationDeltaDays: -3
        },
        {
          id: "stabilize-window",
          label: "Stabilize It",
          summary: "Extend the benefit and soften the instability.",
          outcome: "Stabilized the ley window for a longer arcane dividend.",
          effects: { stats: { prestige: 2 }, resources: { mana: 0.5 } },
          durationDeltaDays: 4
        }
      ]
    });
    return { aftermath, followUp };
  }

  if (modifiers.has("Lost Supplies")) {
    const aftermath = createExpeditionAftermath(state, expedition, {
      title: "Shaken Logistics",
      summary: "The return line came back strained and local stores are compensating for the disruption.",
      effectText: "-1 food/day, -1 materials/day, and -4 morale until the route quiets down.",
      iconKey: "supplies",
      severity: "strain",
      durationDays: 8,
      effects: { resources: { food: -1, materials: -1 }, stats: { morale: -4 } }
    });
    const followUp = createExpeditionFollowUp(state, expedition, aftermath, {
      title: "Repair the shaken route",
      detail: "The city can absorb the loss and restore discipline, or patch it with salvage and move on.",
      urgency: "high",
      iconKey: "supplies",
      options: [
        {
          id: "stabilize-route",
          label: "Stabilize It",
          summary: "Reduce the strain at the cost of supplies now.",
          outcome: "Spent stores to settle the shaken route.",
          effects: { resources: { food: -10, materials: -8 }, stats: { morale: 3 } },
          durationDeltaDays: -4
        },
        {
          id: "patch-route",
          label: "Patch It",
          summary: "Accept the strain and squeeze value back from salvage crews.",
          outcome: "Patched the route with rough salvage work.",
          effects: { resources: { salvage: 14 } },
          durationDeltaDays: 0
        }
      ]
    });
    return { aftermath, followUp };
  }

  if (expedition.typeId === "diplomatic" && rewards.resources?.gold > 0) {
    return {
      aftermath: createExpeditionAftermath(state, expedition, {
        title: "Open Trade Window",
        summary: "The diplomatic route left local buyers and brokers unusually receptive for a short while.",
        effectText: "+1.2 gold/day and +4 prosperity while the window stays open.",
        iconKey: "gold",
        severity: "boon",
        durationDays: 7,
        effects: { resources: { gold: 1.2 }, stats: { prosperity: 4 } }
      }),
      followUp: null
    };
  }

  return { aftermath: null, followUp: null };
}

function pruneExpeditionThreads(state) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const currentDay = Number(state.calendar?.dayOffset ?? 0) || 0;
  const activeAftermathIds = new Set();
  state.expeditions.aftermaths = (state.expeditions.aftermaths ?? []).filter((entry) => {
    const keep = Number(entry.expiresDayOffset ?? 0) >= currentDay;
    if (keep) {
      activeAftermathIds.add(entry.id);
    }
    return keep;
  });
  state.expeditions.followUps = (state.expeditions.followUps ?? []).filter(
    (entry) => !entry.chosenOptionId && (!entry.aftermathId || activeAftermathIds.has(entry.aftermathId))
  );
}

function createJourneyOption({ id, label, summary, effects = {} }) {
  return normalizeJourneyOption({
    id,
    label,
    summary,
    effects
  });
}

function getJourneyTravelDays(expedition, returnDayOffset, travelDaysOverride = null) {
  const overrideDays = Number(travelDaysOverride);
  if (Number.isFinite(overrideDays) && overrideDays > 0) {
    return Math.max(1, Math.round(overrideDays));
  }

  return Math.max(1, Number(returnDayOffset ?? expedition.expectedReturnDayOffset ?? 0) - Number(expedition.departedDayOffset ?? 0));
}

function createJourneyBonusBundle(expedition, bundleKey) {
  const resourceBonuses = createEmptyResourceRecord();
  const crystalBonuses = createEmptyCrystalRecord();
  const shardBonuses = createEmptyCrystalRecord();
  let recruitMultiplier = 1;
  let uniquePercentBonus = 0;

  switch (bundleKey) {
    case "supplies":
      if (SALVAGE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.food += 4;
        resourceBonuses.materials += 4;
        resourceBonuses.salvage += 3;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.food += 3;
        resourceBonuses.gold += 4;
        resourceBonuses.prosperity += 2;
      } else {
        resourceBonuses.food += 2;
        resourceBonuses.mana += 3;
        resourceBonuses.salvage += 2;
      }
      break;
    case "discovery":
      if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 5;
        shardBonuses.Common += 10;
        shardBonuses.Uncommon += 3;
        uniquePercentBonus += 8;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.gold += 5;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.06;
        uniquePercentBonus += 4;
      } else {
        resourceBonuses.salvage += 6;
        resourceBonuses.materials += 4;
        uniquePercentBonus += 4;
      }
      break;
    case "excavation":
      if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 4;
        shardBonuses.Common += 12;
        shardBonuses.Uncommon += 4;
        if (expedition.typeId === "crystalHunt") {
          crystalBonuses.Common += 1;
        }
        uniquePercentBonus += 6;
      } else if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.gold += 4;
        resourceBonuses.materials += 3;
        recruitMultiplier += 0.08;
      } else {
        resourceBonuses.salvage += 8;
        resourceBonuses.materials += 6;
        shardBonuses.Common += 5;
      }
      break;
    case "contact":
      if (expedition.typeId === "diplomatic") {
        resourceBonuses.gold += 10;
        resourceBonuses.prosperity += 6;
        recruitMultiplier += 0.1;
      } else if (["rescue", "recruit"].includes(expedition.typeId)) {
        resourceBonuses.food += 3;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.14;
      } else if (expedition.typeId === "pilgrimage") {
        resourceBonuses.mana += 4;
        resourceBonuses.prosperity += 4;
        recruitMultiplier += 0.08;
      } else {
        resourceBonuses.gold += 4;
        resourceBonuses.food += 2;
        recruitMultiplier += 0.05;
      }
      break;
    case "combat":
      if (["monsterHunt", "rescue"].includes(expedition.typeId)) {
        resourceBonuses.salvage += 6;
        resourceBonuses.food += 2;
        resourceBonuses.materials += 3;
      } else if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
        resourceBonuses.mana += 3;
        resourceBonuses.salvage += 4;
        shardBonuses.Common += 5;
      } else {
        resourceBonuses.salvage += 5;
        resourceBonuses.materials += 4;
        resourceBonuses.gold += 2;
      }
      break;
    default:
      break;
  }

  return {
    resourceBonuses,
    crystalBonuses,
    shardBonuses,
    recruitMultiplier,
    uniquePercentBonus
  };
}

function buildSupplyJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "supply",
    title: "Supply Strain",
    prompt: `By day ${dayMarker}, the crew traveling ${getExpeditionTravelLabel(expedition)} is burning through stores faster than planned and needs to decide how to steady the route.`,
    options: [
      createJourneyOption({
        id: "salvage-stores",
        label: "Salvage the Route",
        summary: "Strip nearby ruins and camps for fresh stores. Higher haul, rougher passage.",
        effects: {
          ...createJourneyBonusBundle(expedition, "supplies"),
          successDelta: -0.04,
          rewardMultiplier: 1.04,
          modifier: "Route salvage",
          result: "salvaged the road itself to keep the mission moving"
        }
      }),
      createJourneyOption({
        id: "ration-carefully",
        label: "Ration Carefully",
        summary: "Protect the crew and secure the return, but expect a lighter haul.",
        effects: {
          successDelta: 0.08,
          rewardMultiplier: 0.9,
          modifier: "Tight rationing",
          result: "cut the route down to the essentials and protected the crew"
        }
      }),
      createJourneyOption({
        id: "push-with-reserves",
        label: "Push With Reserves",
        summary: "Maintain pace and pressure. Faster haul, shakier footing.",
        effects: {
          successDelta: -0.08,
          rewardMultiplier: 1.07,
          modifier: "Hidden reserves spent",
          result: "burned reserve packs to keep the expedition aggressive"
        }
      })
    ]
  };
}

function buildSignalJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "signal",
    title: ARCANE_JOURNEY_TYPES.has(expedition.typeId) ? "Strange Echo" : "Unmarked Landmark",
    prompt: `Near day ${dayMarker}, ${expedition.missionName} passes a strange pull off the main route. The crew can lean into it, survey it, or leave it untouched.`,
    options: [
      createJourneyOption({
        id: "approach-signal",
        label: "Approach It",
        summary: "Investigate the oddity directly for rare insight or hidden gain.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: -0.07,
          rewardMultiplier: 1.06,
          modifier: "Strange detour",
          result: "leaned into the unknown instead of staying on the safe line"
        }
      }),
      createJourneyOption({
        id: "survey-signal",
        label: "Survey From Range",
        summary: "Take a measured read without fully committing.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: 0.03,
          rewardMultiplier: 0.98,
          recruitMultiplier: 1,
          modifier: "Measured survey",
          result: "surveyed the anomaly carefully before moving on"
        }
      }),
      createJourneyOption({
        id: "avoid-signal",
        label: "Avoid It",
        summary: "Keep the crew safe and maintain discipline, even if it costs opportunities.",
        effects: {
          successDelta: 0.08,
          rewardMultiplier: 0.92,
          modifier: "Skipped anomaly",
          result: "gave the strange place a wide berth and stayed disciplined"
        }
      })
    ]
  };
}

function buildExcavationJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "excavation",
    title: SALVAGE_JOURNEY_TYPES.has(expedition.typeId) ? "Promising Cache" : "Buried Site",
    prompt: `By day ${dayMarker}, the crew finds a place worth digging into. Time spent here could change the whole return.`,
    options: [
      createJourneyOption({
        id: "dig-deep",
        label: "Dig Properly",
        summary: "Commit labor and time for the biggest possible payoff.",
        effects: {
          ...createJourneyBonusBundle(expedition, "excavation"),
          successDelta: -0.06,
          rewardMultiplier: 1.09,
          modifier: "Deep excavation",
          result: "stayed long enough to pry the best pieces out of the site"
        }
      }),
      createJourneyOption({
        id: "take-surface",
        label: "Take Surface Finds",
        summary: "Grab the obvious value and avoid getting bogged down.",
        effects: {
          ...createJourneyBonusBundle(expedition, "discovery"),
          successDelta: 0,
          rewardMultiplier: 1.02,
          modifier: "Surface salvage",
          result: "took what was easy to lift and kept the route alive"
        }
      }),
      createJourneyOption({
        id: "mark-and-move",
        label: "Mark It And Move",
        summary: "Leave the deeper prize for another day and preserve the mission.",
        effects: {
          successDelta: 0.05,
          rewardMultiplier: 0.94,
          modifier: "Skipped dig",
          result: "marked the site for later and kept the expedition intact"
        }
      })
    ]
  };
}

function buildEncounterJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "encounter",
    title: expedition.typeId === "monsterHunt" ? "Enemy Contact" : "Threat On The Route",
    prompt: `Around day ${dayMarker}, the crew meets resistance that can be fought, outplayed, or avoided entirely.`,
    options: [
      createJourneyOption({
        id: "fight-through",
        label: "Fight Through",
        summary: "Press the threat head-on for a stronger haul at higher risk.",
        effects: {
          ...createJourneyBonusBundle(expedition, "combat"),
          successDelta: -0.1,
          rewardMultiplier: 1.12,
          modifier: "Direct engagement",
          result: "fought through the pressure instead of conceding the route"
        }
      }),
      createJourneyOption({
        id: "set-ambush",
        label: "Outplay Them",
        summary: "Use scouting and positioning to keep initiative without a full clash.",
        effects: {
          ...createJourneyBonusBundle(expedition, "combat"),
          successDelta: 0.02,
          rewardMultiplier: 1.03,
          modifier: "Tactical contact",
          result: "used positioning and traps to win without a full grind"
        }
      }),
      createJourneyOption({
        id: "avoid-conflict",
        label: "Avoid Conflict",
        summary: "Keep the crew safe and preserve the return, even if it costs prize.",
        effects: {
          successDelta: 0.09,
          rewardMultiplier: 0.88,
          modifier: "Avoided contact",
          result: "refused the fight and protected the crew over the haul"
        }
      })
    ]
  };
}

function buildCrossingJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "crossing",
    title: "Broken Passage",
    prompt: `Near day ${dayMarker}, the expedition reaches a crossing that can be forced, repaired, or rerouted around.`,
    options: [
      createJourneyOption({
        id: "force-crossing",
        label: "Force The Crossing",
        summary: "Take the dangerous line and keep pace.",
        effects: {
          successDelta: -0.06,
          rewardMultiplier: 1.08,
          modifier: "Forced crossing",
          result: "forced the passage instead of slowing down"
        }
      }),
      createJourneyOption({
        id: "secure-crossing",
        label: "Secure It First",
        summary: "Spend effort on a safer passage and protect the return.",
        effects: {
          ...createJourneyBonusBundle(expedition, "supplies"),
          successDelta: 0.06,
          rewardMultiplier: 0.95,
          modifier: "Secured passage",
          result: "made the crossing stable before moving the whole crew through"
        }
      }),
      createJourneyOption({
        id: "scout-reroute",
        label: "Scout A Reroute",
        summary: "Look for a smarter line that preserves both pace and safety.",
        effects: {
          successDelta: 0.03,
          rewardMultiplier: 0.99,
          uniquePercentBonus: 4,
          modifier: "Alternate route",
          result: "found a workable alternate line instead of committing blind"
        }
      })
    ]
  };
}

function buildContactJourneyStage(expedition, index, dayMarker) {
  return {
    id: createId("journey-stage"),
    index,
    dayMarker,
    kind: "contact",
    title: expedition.typeId === "diplomatic" ? "Unexpected Delegation" : "People On The Road",
    prompt: `By day ${dayMarker}, the crew runs into people who might trade, join, or slow the mission depending on how the expedition handles them.`,
    options: [
      createJourneyOption({
        id: "stop-and-help",
        label: "Stop And Engage",
        summary: "Take the time to help, escort, or negotiate with the people on the route.",
        effects: {
          ...createJourneyBonusBundle(expedition, "contact"),
          successDelta: 0.02,
          rewardMultiplier: 0.98,
          modifier: "Deliberate contact",
          result: "spent real time dealing with the people they found instead of brushing past"
        }
      }),
      createJourneyOption({
        id: "bargain-fast",
        label: "Bargain Fast",
        summary: "Trade quickly and pull value from the stop without lingering.",
        effects: {
          ...createJourneyBonusBundle(expedition, "contact"),
          successDelta: -0.02,
          rewardMultiplier: 1.05,
          recruitMultiplier: 1,
          modifier: "Hard bargain",
          result: "cut a fast bargain and kept the expedition moving"
        }
      }),
      createJourneyOption({
        id: "pass-by",
        label: "Pass By",
        summary: "Keep the crew focused on the mission and leave the detour behind.",
        effects: {
          successDelta: 0.05,
          rewardMultiplier: 0.93,
          modifier: "Stayed focused",
          result: "held the line and refused to drift off mission"
        }
      })
    ]
  };
}

function pickJourneyStageKinds(expedition, stageCount) {
  const teamSize = getTeamCount(expedition.team);
  const committedFood = Number(expedition.committedResources?.food ?? 0) || 0;
  const lowSupplies = committedFood < Math.max(4, teamSize * 2);
  const preferred = [];

  if (lowSupplies) {
    preferred.push("supply");
  }
  if (expedition.missionDistance === "Far" || Number(expedition.delayCount ?? 0) > 0) {
    preferred.push("crossing");
  }
  if (ARCANE_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("signal");
  }
  if (SALVAGE_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("excavation");
  }
  if (SOCIAL_JOURNEY_TYPES.has(expedition.typeId)) {
    preferred.push("contact");
  }
  if (expedition.missionRisk === "High" || ["monsterHunt", "rescue"].includes(expedition.typeId)) {
    preferred.push("encounter");
  }

  const stagePreferenceOrder = [
    ["supply", "crossing", "contact", "signal", "encounter", "excavation"],
    ["signal", "contact", "crossing", "supply", "encounter", "excavation"],
    ["encounter", "excavation", "signal", "contact", "crossing", "supply"],
    ["excavation", "encounter", "contact", "signal", "crossing", "supply"],
    ["contact", "crossing", "signal", "encounter", "excavation", "supply"]
  ];
  const fallback = ["crossing", "signal", "encounter", "excavation", "contact", "supply"];
  const sequence = [];

  for (let index = 0; index < stageCount; index += 1) {
    const preferredForStage = stagePreferenceOrder[Math.min(index, stagePreferenceOrder.length - 1)];
    const nextKind =
      preferredForStage.find((kind) => preferred.includes(kind) && !sequence.includes(kind)) ??
      preferred.find((kind) => !sequence.includes(kind)) ??
      fallback.find((kind) => !sequence.includes(kind)) ??
      fallback[index % fallback.length];
    sequence.push(nextKind);
  }

  return sequence;
}

function buildJourneyStage(kind, expedition, index, dayMarker) {
  switch (kind) {
    case "supply":
      return buildSupplyJourneyStage(expedition, index, dayMarker);
    case "signal":
      return buildSignalJourneyStage(expedition, index, dayMarker);
    case "excavation":
      return buildExcavationJourneyStage(expedition, index, dayMarker);
    case "encounter":
      return buildEncounterJourneyStage(expedition, index, dayMarker);
    case "crossing":
      return buildCrossingJourneyStage(expedition, index, dayMarker);
    case "contact":
    default:
      return buildContactJourneyStage(expedition, index, dayMarker);
  }
}

function createPendingExpeditionJourney(state, expedition, returnDayOffset = state.calendar.dayOffset, options = {}) {
  const travelDays = getJourneyTravelDays(expedition, returnDayOffset, options.travelDaysOverride);
  const stageCount = Math.max(1, Math.min(MAX_JOURNEY_STAGES, Math.ceil(travelDays / JOURNEY_STAGE_DAY_SPAN)));
  const stageKinds = pickJourneyStageKinds(expedition, stageCount);
  const stages = stageKinds.map((kind, index) =>
    buildJourneyStage(kind, expedition, index, Math.min(travelDays, (index + 1) * JOURNEY_STAGE_DAY_SPAN))
  );

  addTeamBackToCity(state, expedition.team);

  addHistoryEntry(state, {
    category: "Expedition",
    title: `Debrief Ready: ${expedition.missionName ?? expedition.typeLabel}`,
    details: `${expedition.missionName ?? expedition.typeLabel} made it back to the Drift. Resolve ${stageCount} journey stage(s) to settle the final rewards.`
  });

  return normalizePendingJourney({
    id: createId("expedition-journey"),
    expedition,
    returnDayOffset,
    returnDateLabel: formatDate(returnDayOffset),
    travelDays,
    currentStageIndex: 0,
    stages
  });
}

function getJourneyProjection(journey) {
  const successBase = Number(journey?.expedition?.successScore ?? 0) || 0;
  const uniquePercentBase = Number(journey?.expedition?.uniquePercent ?? 0) || 0;
  const resourceBonuses = createEmptyResourceRecord();
  const crystalBonuses = createEmptyCrystalRecord();
  const shardBonuses = createEmptyCrystalRecord();
  const stageHighlights = [];
  const modifiers = [];
  let successDelta = 0;
  let rewardMultiplier = 1;
  let recruitMultiplier = 1;
  let uniquePercentBonus = 0;

  for (const stage of journey?.stages ?? []) {
    if (!stage?.chosenOptionId) {
      continue;
    }
    const selectedOption = (stage.options ?? []).find((option) => option.id === stage.chosenOptionId);
    if (!selectedOption) {
      continue;
    }
    const effects = normalizeJourneyEffects(selectedOption.effects);
    successDelta += effects.successDelta;
    rewardMultiplier *= effects.rewardMultiplier;
    recruitMultiplier *= effects.recruitMultiplier;
    uniquePercentBonus += effects.uniquePercentBonus;
    addResourceBonuses(resourceBonuses, effects.resourceBonuses);
    addCrystalBonuses(crystalBonuses, effects.crystalBonuses);
    addCrystalBonuses(shardBonuses, effects.shardBonuses);
    if (effects.modifier) {
      modifiers.push(effects.modifier);
    }
    stageHighlights.push(`Day ${stage.dayMarker}: ${stage.chosenLabel ?? selectedOption.label} - ${effects.result || selectedOption.summary}`);
  }

  const successScore = clamp(successBase + successDelta, 0.45, 2.25);
  return {
    successScore,
    rewardMultiplier: clamp(rewardMultiplier, 0.55, 1.75),
    recruitMultiplier: clamp(recruitMultiplier, 0.65, 1.85),
    uniquePercent: uniquePercentBase + uniquePercentBonus,
    resourceBonuses,
    crystalBonuses,
    shardBonuses,
    modifiers,
    stageHighlights
  };
}

export function getExpeditionJourneyProjection(journey) {
  const projection = getJourneyProjection(journey);
  return {
    ...projection,
    outcomeLabel: getExpeditionOutcomeLabel(projection.successScore)
  };
}

export function getExpeditionJourneyOptionPreview(journey, optionId) {
  const previewJourney = normalizePendingJourney(structuredClone(journey ?? {}));
  const currentStage = previewJourney.stages?.[previewJourney.currentStageIndex] ?? null;
  if (!currentStage) {
    return null;
  }

  const selectedOption = (currentStage.options ?? []).find((option) => option.id === optionId) ?? null;
  if (!selectedOption) {
    return null;
  }

  currentStage.chosenOptionId = selectedOption.id;
  currentStage.chosenLabel = selectedOption.label;
  currentStage.chosenSummary = selectedOption.summary;
  return getExpeditionJourneyProjection(previewJourney);
}

export function getCurrentPendingExpeditionJourney(state) {
  const pending = normalizeExpeditionState(state.expeditions).pending ?? [];
  return pending[0] ?? null;
}

export function hasPendingExpeditionJourneys(state) {
  return Boolean(getCurrentPendingExpeditionJourney(state));
}

function resolveExpeditionReturn(state, expedition, returnDayOffset = state.calendar.dayOffset, journey = null) {
  const journeyProjection = journey ? getJourneyProjection(journey) : null;
  const resolvedExpedition = journeyProjection
    ? {
        ...expedition,
        successScore: journeyProjection.successScore,
        uniquePercent: journeyProjection.uniquePercent
      }
    : expedition;
  const rewards = buildExpeditionRewards(state, resolvedExpedition, journeyProjection);
  grantRewardCollections(state, rewards);
  const outcomeLabel = getExpeditionOutcomeLabel(resolvedExpedition.successScore);
  const rewardSummaryParts = [
    summarizeRecruitRewards(rewards.recruits),
    summarizeResourceRewards(rewards.resources),
    summarizeCrystalRewards(rewards.crystals, rewards.shards),
    rewards.relic ? `Recovered ${rewards.relic.name}, ${rewards.relic.kindLabel.toLowerCase()}.` : "",
    rewards.uniqueCitizen ? `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift.` : ""
  ].filter(Boolean);
  const narrative =
    outcomeLabel === "Strong Return"
      ? `${expedition.missionName ?? expedition.typeLabel} came back ahead of expectation with disciplined momentum and a fuller hold.`
      : outcomeLabel === "Steady Return"
        ? `${expedition.missionName ?? expedition.typeLabel} returned in good order with solid gains and no major collapse.`
        : outcomeLabel === "Hard Return"
          ? `${expedition.missionName ?? expedition.typeLabel} returned battered but useful, with enough recovered value to justify the risk.`
          : `${expedition.missionName ?? expedition.typeLabel} returned thin and strained, but the crew made it back alive.`;
  const stageHighlights = journeyProjection?.stageHighlights ?? [];
  const summary =
    rewardSummaryParts.join(" | ") ||
    `${expedition.missionName ?? expedition.typeLabel} returned light, but the crew made it home intact.`;
  const detailLines = [
    `${outcomeLabel} on a ${String(expedition.missionRisk ?? "Medium").toLowerCase()}-risk route.`,
    ...stageHighlights,
    ...((rewards.modifiers ?? []).map((modifier) => `Outcome modifier: ${modifier}`)),
    ...rewardSummaryParts,
    ...(rewards.relic ? [`Relic effect: ${rewards.relic.bonusSummary}`] : []),
    ...(expedition.buildingSynergySummary ?? []).slice(0, 2)
  ].filter(Boolean);

  addHistoryEntry(state, {
    category: "Expedition",
    title: `Return: ${expedition.missionName ?? expedition.typeLabel}`,
    details: `${narrative} ${summary}`
  });

  if (rewards.uniqueCitizen) {
    addHistoryEntry(state, {
      category: "Unique Citizen",
      title: rewards.uniqueCitizen.fullName,
      details: `${rewards.uniqueCitizen.fullName}, ${rewards.uniqueCitizen.title}, joined the Drift. ${rewards.uniqueCitizen.effectText}`
    });
  }

  if (rewards.relic) {
    addHistoryEntry(state, {
      category: rewards.relic.kindLabel,
      title: rewards.relic.name,
      details: `${rewards.relic.name} was recovered from ${expedition.missionName ?? expedition.typeLabel}. ${rewards.relic.effectText} ${rewards.relic.bonusSummary}`
    });
  }

  return createExpeditionRecentRecord({
    expeditionNumber: expedition.expeditionNumber,
    expeditionCallsign: expedition.expeditionCallsign,
    expeditionLabel: expedition.expeditionLabel,
    typeId: expedition.typeId,
    typeLabel: expedition.typeLabel,
    missionId: expedition.missionId,
    missionName: expedition.missionName,
    vehicleId: expedition.vehicleId,
    vehicleName: expedition.vehicleName,
    returnDayOffset,
    returnDateLabel: formatDate(returnDayOffset),
    outcomeLabel,
    summary,
    narrative,
    detailLines,
    rewards
  });
}

export function resolveExpeditionJourneyChoice(state, journeyId, optionId) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  const pendingJourneys = state.expeditions.pending ?? [];
  const journeyIndex = pendingJourneys.findIndex((entry) => entry.id === journeyId);
  if (journeyIndex === -1) {
    return { ok: false, reason: "That expedition journey is no longer waiting." };
  }

  const journey = pendingJourneys[journeyIndex];
  const stage = journey.stages?.[journey.currentStageIndex] ?? null;
  if (!stage) {
    return { ok: false, reason: "This expedition journey is already complete." };
  }

  const selectedOption = (stage.options ?? []).find((entry) => entry.id === optionId) ?? null;
  if (!selectedOption) {
    return { ok: false, reason: "That journey choice is no longer available." };
  }

  stage.chosenOptionId = selectedOption.id;
  stage.chosenLabel = selectedOption.label;
  stage.chosenSummary = selectedOption.summary;
  journey.currentStageIndex += 1;

  if (journey.currentStageIndex < (journey.stages?.length ?? 0)) {
    return {
      ok: true,
      completed: false,
      journey,
      stage
    };
  }

  const record = resolveExpeditionReturn(state, journey.expedition, journey.returnDayOffset, journey);
  state.expeditions.pending = pendingJourneys.filter((entry) => entry.id !== journey.id);
  state.expeditions.recent = [record, ...(state.expeditions.recent ?? [])].slice(0, MAX_RECENT_RETURNS);
  return {
    ok: true,
    completed: true,
    journey,
    record
  };
}

function buildPreviewInsights(preview) {
  const strengths = [];
  const risks = [];
  const mission = preview.mission;
  const expeditionType = preview.expeditionType;
  const teamRequest = preview.teamRequest ?? {};

  const favoredAssigned = Object.entries(expeditionType.favoredClasses ?? {})
    .filter(([citizenClass, weight]) => Number(weight) > 1 && (teamRequest[citizenClass] ?? 0) > 0)
    .map(([citizenClass]) => citizenClass);
  if (favoredAssigned.length) {
    strengths.push(`Favored crew assigned: ${favoredAssigned.slice(0, 3).join(", ")}.`);
  } else {
    risks.push("No favored crew is assigned yet.");
  }

  if (Number(preview.vehicle.timeMultiplier ?? 1) < 1) {
    strengths.push(
      `${preview.vehicle.name} trims travel time by ${Math.max(1, Math.round((1 - Number(preview.vehicle.timeMultiplier ?? 1)) * 100))}%.`
    );
  }
  if ((preview.vehicle.favoredMissionTags ?? []).includes(mission.typeId)) {
    strengths.push(`${preview.vehicle.name} is well suited to this mission.`);
  }
  if (preview.vehicle.requiresFleet === false) {
    risks.push("Traveling without a vehicle slows the route and leaves less room for supplies.");
  }
  if ((preview.buildingSynergy.summary ?? []).length) {
    strengths.push(...preview.buildingSynergy.summary.slice(0, 3));
  } else {
    risks.push("No active building is currently boosting this mission.");
  }

  if ((preview.committedResources.food ?? 0) <= 0) {
    risks.push("No food has been committed.");
  } else if ((preview.committedResources.food ?? 0) >= Math.max(6, preview.teamSize * 2)) {
    strengths.push("Food stores are strong enough for the journey.");
  }

  if (mission.risk === "High" && (teamRequest.Medics ?? 0) <= 0 && (teamRequest.Defenders ?? 0) <= 0) {
    risks.push("High-risk mission without Medics or Defenders.");
  }
  if (mission.distance === "Far" && preview.vehicle.type !== "air") {
    risks.push("Far mission without air travel will be slower and riskier.");
  }
  if (preview.teamSize < 2) {
    risks.push("The crew is extremely small.");
  }
  if (preview.vehicleCapacity > 0 && preview.teamSize > preview.vehicleCapacity) {
    risks.push(`${preview.vehicle.name} is over capacity by ${preview.teamSize - preview.vehicleCapacity} people.`);
  } else if (preview.vehicleCapacity > 0 && preview.teamSize >= Math.max(1, preview.vehicleCapacity - 2)) {
    strengths.push(`${preview.vehicle.name} is being used close to full capacity.`);
  }
  if (preview.successScore >= 1.2) {
    strengths.push("Current setup points to a strong return.");
  } else if (preview.successScore < 0.85) {
    risks.push("Current setup points to a thin return.");
  }

  return {
    strengths: [...new Set(strengths)],
    risks: [...new Set(risks)]
  };
}

export function createExpeditionLaunchPreview(state, draft = {}) {
  const mission = findMissionCard(state, draft.missionId, draft.typeId ?? EXPEDITION_ORDER[0]);
  const expeditionType = getExpeditionType(mission.typeId);
  const vehicle = getVehicleDefinition(draft.vehicleId ?? VEHICLE_ORDER[0]);
  const approach = getMissionApproach(draft.approachId ?? "balanced");
  const durationDaysBase = EXPEDITION_DURATION_OPTIONS.includes(Number(draft.durationDays))
    ? Number(draft.durationDays)
    : Number(mission.suggestedDurationDays ?? EXPEDITION_DURATION_OPTIONS[1]);
  const durationDays = getEffectiveDurationDays(durationDaysBase, vehicle);
  const committedResources = createExpeditionResourceCommitment(draft.resources);
  const teamRequest = createTeamRequest(draft.team);
  const removedTeam = Object.fromEntries(
    Object.entries(teamRequest).map(([citizenClass, amount]) => [
      citizenClass,
      { Common: amount, Rare: 0, Epic: 0 }
    ])
  );
  const buildingSynergy = getExpeditionBuildingSynergy(state, mission, vehicle);
  const powerScore = computeExpeditionPowerScore(
    state,
    expeditionType,
    mission,
    approach,
    vehicle,
    removedTeam,
    committedResources,
    durationDaysBase,
    buildingSynergy
  );
  const difficultyScore = computeExpeditionDifficultyScore(expeditionType, mission, approach, vehicle, durationDaysBase, buildingSynergy);
  const successScore = difficultyScore > 0 ? powerScore / difficultyScore : 1;
  const preview = {
    mission,
    expeditionType,
    vehicle,
    approach,
    durationDaysBase,
    durationDays,
    committedResources,
    teamRequest,
    teamSize: getTeamRequestSize(teamRequest),
    vehicleCapacity: getVehicleCapacity(vehicle),
    seatsRemaining: getVehicleCapacity(vehicle) - getTeamRequestSize(teamRequest),
    powerScore,
    difficultyScore,
    successScore,
    expectedReturnDayOffset: state.calendar.dayOffset + durationDays,
    buildingSynergy
  };

  return {
    ...preview,
    ...buildPreviewInsights(preview)
  };
}

export function startExpedition(state, payload) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);
  refreshExpeditionBoardIfNeeded(state);

  if (!(state.expeditions.board ?? []).length) {
    return { ok: false, reason: "No mission cards are available right now." };
  }
  if (!(state.expeditions.board ?? []).some((mission) => mission.id === payload?.missionId)) {
    return { ok: false, reason: "Pick a mission card from the Mission Board first." };
  }

  const preview = createExpeditionLaunchPreview(state, payload);
  const availableVehicles = getAvailableVehicleCounts(state);
  if (preview.vehicle.requiresFleet !== false && (availableVehicles[preview.vehicle.id] ?? 0) <= 0) {
    return { ok: false, reason: `No free ${preview.vehicle.name} is available.` };
  }
  if (preview.teamSize <= 0) {
    return { ok: false, reason: "Assign at least one citizen to the expedition." };
  }
  if (preview.vehicleCapacity > 0 && preview.teamSize > preview.vehicleCapacity) {
    return { ok: false, reason: `${preview.vehicle.name} can carry at most ${preview.vehicleCapacity} people.` };
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
    preview.mission,
    preview.approach,
    preview.vehicle,
    team,
    preview.committedResources,
    preview.durationDaysBase,
    preview.buildingSynergy
  );
  const actualDifficultyScore = computeExpeditionDifficultyScore(
    preview.expeditionType,
    preview.mission,
    preview.approach,
    preview.vehicle,
    preview.durationDaysBase,
    preview.buildingSynergy
  );
  const actualSuccessScore = actualDifficultyScore > 0 ? actualPowerScore / actualDifficultyScore : 1;
  const expeditionNumber = Math.max(1, Number(state.expeditions.nextExpeditionNumber ?? 1) || 1);
  const expeditionCallsign = getExpeditionCallsign(preview.expeditionType.id, expeditionNumber);
  const expeditionLabel = `Expedition ${expeditionNumber}: ${expeditionCallsign}`;

  const expedition = {
    id: createId("expedition"),
    expeditionNumber,
    expeditionCallsign,
    expeditionLabel,
    typeId: preview.expeditionType.id,
    typeLabel: preview.expeditionType.label,
    missionId: preview.mission.id,
    missionName: preview.mission.name,
    missionSummary: preview.mission.summary,
    missionRisk: preview.mission.risk,
    missionDistance: preview.mission.distance,
    missionIsSpecial: preview.mission.isSpecial === true,
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
    rewardPercent: preview.buildingSynergy.rewardPercent,
    uniquePercent: preview.buildingSynergy.uniquePercent,
    buildingSynergySummary: [...(preview.buildingSynergy.summary ?? [])],
    delayCount: 0,
    notes:
      preview.vehicle.requiresFleet === false
        ? `${preview.teamSize} personnel departed on foot for a ${preview.mission.risk.toLowerCase()}-risk route.`
        : `${preview.teamSize} personnel aboard the ${preview.vehicle.name} for a ${preview.mission.risk.toLowerCase()}-risk route.`
  };

  state.expeditions.nextExpeditionNumber = expeditionNumber + 1;
  state.expeditions.board = (state.expeditions.board ?? []).filter((mission) => mission.id !== preview.mission.id);

  if (payload?.instantResults === true || payload?.resolveImmediately === true) {
    const currentDayOffset = Number(state.calendar?.dayOffset ?? 0) || 0;
    const instantExpedition = {
      ...expedition,
      expectedReturnDayOffset: currentDayOffset,
      expectedReturnAt: formatDate(currentDayOffset),
      scheduledExpectedReturnDayOffset: expedition.expectedReturnDayOffset,
      scheduledExpectedReturnAt: expedition.expectedReturnAt,
      instantResults: true,
      notes: `${expedition.notes} Results were resolved immediately without advancing the calendar.`
    };
    addHistoryEntry(state, {
      category: "Expedition",
      title: `Departure: ${instantExpedition.expeditionLabel}`,
      details: `${instantExpedition.expeditionLabel} departed for ${instantExpedition.missionName} on ${instantExpedition.departedAt} ${getExpeditionTravelLabel(instantExpedition)} and resolved immediately. Route math used the ${preview.durationDays} day plan; the calendar stayed on ${instantExpedition.departedAt}.`
    });
    const journey = createPendingExpeditionJourney(state, instantExpedition, currentDayOffset, {
      travelDaysOverride: preview.durationDays
    });
    state.expeditions.pending = [journey, ...(state.expeditions.pending ?? [])];
    return { ok: true, expedition: instantExpedition, preview, journey, resolvedImmediately: true };
  }

  state.expeditions.active = [...state.expeditions.active, expedition];
  addHistoryEntry(state, {
    category: "Expedition",
    title: `Departure: ${expedition.expeditionLabel}`,
    details: `${expedition.expeditionLabel} departed for ${expedition.missionName} on ${expedition.departedAt} ${getExpeditionTravelLabel(expedition)}. Expected return ${expedition.expectedReturnAt}.`
  });

  return { ok: true, expedition, preview };
}

export function advanceExpeditionsOneDay(state) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

  const remaining = [];
  const pendingJourneys = [];

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
        title: `Delayed: ${expedition.missionName ?? expedition.typeLabel}`,
        details: `${expedition.missionName ?? expedition.typeLabel} reported delays and now expects to return on ${expedition.expectedReturnAt}.`
      });
      continue;
    }

    pendingJourneys.push(createPendingExpeditionJourney(state, expedition, state.calendar.dayOffset));
  }

  state.expeditions.active = remaining;
  if (pendingJourneys.length) {
    state.expeditions.pending = [...pendingJourneys, ...(state.expeditions.pending ?? [])];
  }
  return pendingJourneys;
}

export function forceReturnExpedition(state, expeditionId = null) {
  state.expeditions = normalizeExpeditionState(state.expeditions);
  state.vehicles = normalizeVehicleFleet(state.vehicles);
  state.uniqueCitizens = normalizeUniqueCitizens(state.uniqueCitizens);

  if (!state.expeditions.active.length) {
    return { ok: false, reason: "No active expedition is currently deployed." };
  }

  const target =
    expeditionId
      ? state.expeditions.active.find((expedition) => expedition.id === expeditionId)
      : [...state.expeditions.active].sort((left, right) => left.expectedReturnDayOffset - right.expectedReturnDayOffset)[0];

  if (!target) {
    return { ok: false, reason: "That expedition could not be found." };
  }

  target.delayCount = Math.max(1, Number(target.delayCount ?? 0) || 0);
  target.expectedReturnDayOffset = Number(state.calendar?.dayOffset ?? 0) || 0;
  target.expectedReturnAt = formatDate(target.expectedReturnDayOffset);
  state.expeditions.active = state.expeditions.active.filter((expedition) => expedition.id !== target.id);
  const journey = createPendingExpeditionJourney(state, target, target.expectedReturnDayOffset);
  state.expeditions.pending = [journey, ...(state.expeditions.pending ?? [])];
  return { ok: true, expedition: target, journey };
}

export function getExpeditionOverview(state) {
  const expeditionState = normalizeExpeditionState(state.expeditions);
  const vehicles = normalizeVehicleFleet(state.vehicles);
  const availableVehicles = getAvailableVehicleCounts({ ...state, expeditions: expeditionState, vehicles });
  const totalVehicles = Object.values(vehicles).reduce((sum, value) => sum + value, 0);
  const freeVehicles = Object.values(availableVehicles).reduce((sum, value) => sum + value, 0);
  const relicOverview = getExpeditionRelicOverview({ ...state, expeditions: expeditionState });

  return {
    totalVehicles,
    freeVehicles,
    boardMissions: expeditionState.board.length,
    activeExpeditions: expeditionState.active.length,
    pendingJourneys: expeditionState.pending.length,
    relics: relicOverview.totalRelics,
    slottedRelics: relicOverview.equippedCount,
    uniqueProgress: expeditionState.uniqueProgress,
    nextUniqueThreshold: expeditionState.nextUniqueThreshold,
    uniqueCitizens: (state.uniqueCitizens ?? []).length
  };
}
