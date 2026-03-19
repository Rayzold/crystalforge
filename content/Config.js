import { BUILDING_POOLS } from "./BuildingPools.js";
import { BASE_DISTRICT_CONFIG } from "./DistrictConfig.js";
import { DRIFT_POPULATION_GOALS } from "./DriftEvolutionConfig.js";
import { CITIZEN_CLASSES } from "./CitizenConfig.js";
import { RARITY_ORDER, RARITY_POWER } from "./Rarities.js";

export const APP_NAME = "Crystal Forge";
export const APP_VERSION = "v0.8.1";
export const SAVE_VERSION = 7;
export const STORAGE_KEY = "crystal-forge-save";
export const MANUAL_SAVE_KEY = "crystal-forge-manual-save";
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDI51M8_ywD944xPSByUujzMdATeoy503I",
  authDomain: "crystal-forge-web.firebaseapp.com",
  projectId: "crystal-forge-web",
  storageBucket: "crystal-forge-web.firebasestorage.app",
  messagingSenderId: "17853564289",
  appId: "1:17853564289:web:aacbe34f771431c2085480",
  measurementId: "G-KZTVKXPSK"
};
export const FIREBASE_REALM_COLLECTION = "realms";
export const FIREBASE_DEFAULT_REALM_ID = "main";
export const MASCOT_MEDIA = {
  enabled: true,
  videoPath: "./assets/video/drift-mascot.mp4",
  label: "Drift mascot"
};
export const PAGE_ROUTES = [
  { key: "home", label: "Home", href: "./index.html" },
  { key: "forge", label: "Forge", href: "./forge.html" },
  { key: "city", label: "City", href: "./city.html" },
  { key: "citizens", label: "Citizens", href: "./citizens.html" },
  { key: "chronicle", label: "Chronicle", href: "./chronicle.html" }
];
export const BUILDING_QUALITY_CAP = 350;
export const BUILDING_ACTIVE_THRESHOLD = 100;
export const BUILDING_GRID_LIMIT = 12;
export const MAX_HISTORY_ENTRIES = 250;
export const MAX_RECENT_EVENTS = 12;
export const SPEED_MULTIPLIERS = [1, 2, 3, 5, 10, 20, 50, 100];
export const RESOURCE_MINIMUMS = {
  gold: 0,
  food: 0,
  materials: 0,
  salvage: 0,
  mana: 0,
  population: 0,
  prosperity: 0
};

export const EVENT_STEP_CHANCES = {
  day: 0.05,
  "3days": 0.1,
  week: 0.25,
  month: 0.6,
  year: 0.95
};

export const STEP_DURATIONS = {
  day: 1,
  "3days": 3,
  week: 7,
  month: 28,
  year: 336
};

export const START_STATE_PRESETS = {
  session: {
    selectedRarity: "Common",
    buildingFilter: "All",
    constructionSpeedMultiplier: 1,
    crystals: { Common: 2, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Beyond: 0 },
    shards: { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Beyond: 0 },
    resources: {
      gold: 160,
      food: 120,
      materials: 90,
      salvage: 18,
      mana: 25,
      population: 60,
      prosperity: 18
    },
    citizens: {
      Children: 7,
      Elderly: 4,
      Farmers: 12,
      Hunters: 3,
      Miners: 4,
      Laborers: 12,
      Craftsmen: 5,
      Merchants: 3,
      Skycrew: 0,
      Scavengers: 2,
      Guards: 2,
      Soldiers: 2,
      Administrators: 1,
      Scholars: 1,
      Clergy: 1,
      Healers: 0,
      Entertainers: 0,
      Nobles: 1,
      Mages: 0,
      Heroes: 0
    },
    settings: {
      muted: false,
      audioMode: "hybrid",
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: true,
      theme: "dark",
      sharedStateUrl: "",
      autoLoadSharedState: false,
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      firebaseAutoLoad: true,
      firebaseLiveSync: true,
      firebaseAutoPublish: true,
      diceAmount: 1,
      diceType: "d20",
      diceHistory: [],
      lastDiceRoll: null
    }
  },
  testing: {
    selectedRarity: "Common",
    buildingFilter: "All",
    constructionSpeedMultiplier: 1,
    crystals: { Common: 8, Uncommon: 5, Rare: 3, Epic: 1, Legendary: 1, Beyond: 0 },
    shards: { Common: 32, Uncommon: 14, Rare: 7, Epic: 0, Legendary: 0, Beyond: 0 },
    resources: {
      gold: 1200,
      food: 900,
      materials: 750,
      salvage: 180,
      mana: 350,
      population: DRIFT_POPULATION_GOALS.startingPopulation,
      prosperity: 280
    },
    citizens: {
      Children: 48,
      Elderly: 34,
      Farmers: 82,
      Hunters: 18,
      Miners: 34,
      Laborers: 72,
      Craftsmen: 40,
      Merchants: 24,
      Skycrew: 4,
      Scavengers: 16,
      Guards: 18,
      Soldiers: 14,
      Administrators: 10,
      Scholars: 9,
      Clergy: 9,
      Healers: 6,
      Entertainers: 5,
      Nobles: 4,
      Mages: 3,
      Heroes: 1
    },
    settings: {
      muted: false,
      audioMode: "hybrid",
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: false,
      theme: "dark",
      sharedStateUrl: "",
      autoLoadSharedState: false,
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      firebaseAutoLoad: true,
      firebaseLiveSync: true,
      firebaseAutoPublish: true,
      diceAmount: 1,
      diceType: "d20",
      diceHistory: [],
      lastDiceRoll: null
    }
  }
};

export const DEFAULT_START_PRESET = "session";

export const GM_QUICK_CRYSTAL_PACKS = [
  {
    id: "common-pulse",
    label: "Common +1",
    summary: "Grant 1 Common crystal",
    crystals: { Common: 1 }
  },
  {
    id: "common-burst",
    label: "Common +3",
    summary: "Grant 3 Common crystals",
    crystals: { Common: 3 }
  },
  {
    id: "tier-ladder",
    label: "Tier Ladder",
    summary: "Grant 1 crystal to Common, Uncommon, and Rare",
    crystals: { Common: 1, Uncommon: 1, Rare: 1 }
  },
  {
    id: "rare-drop",
    label: "Rare +1",
    summary: "Grant 1 Rare crystal",
    crystals: { Rare: 1 }
  },
  {
    id: "epic-drop",
    label: "Epic +1",
    summary: "Grant 1 Epic crystal",
    crystals: { Epic: 1 }
  },
  {
    id: "session-pack",
    label: "Session Pack",
    summary: "Grant 2 Common, 1 Uncommon, and 1 Rare crystal",
    crystals: { Common: 2, Uncommon: 1, Rare: 1 }
  },
  {
    id: "recovery-pack",
    label: "Recovery Pack",
    summary: "Grant 2 Common crystals and 50 Common shards",
    crystals: { Common: 2 },
    shards: { Common: 50 }
  },
  {
    id: "legend-spark",
    label: "Legend Spark",
    summary: "Grant 1 Legendary crystal",
    crystals: { Legendary: 1 }
  }
];

export const GM_QUICK_EVENT_IDS = [
  "trade-boom",
  "merchant-caravan-arrival",
  "festival",
  "bandit-raid",
  "arcane-storm"
];

export const DEFAULT_START_STATE = START_STATE_PRESETS[DEFAULT_START_PRESET];

export const AUDIO_FILE_CANDIDATES = {
  Common: ["./assets/audio/common-manifest.mp3", "./assets/audio/common-manifest.wav"],
  Uncommon: ["./assets/audio/uncommon-manifest.mp3", "./assets/audio/uncommon-manifest.wav"],
  Rare: ["./assets/audio/rare-manifest.mp3", "./assets/audio/rare-manifest.wav"],
  Epic: ["./assets/audio/epic-manifest.mp3", "./assets/audio/epic-manifest.wav"],
  Legendary: ["./assets/audio/legendary-manifest.mp3", "./assets/audio/legendary-manifest.wav"],
  Beyond: ["./assets/audio/beyond-manifest.mp3", "./assets/audio/beyond-manifest.wav"]
};

export const AMBIENT_AUDIO_FILE_CANDIDATES = {
  home: ["./assets/audio/home-ambient.mp3", "./assets/audio/home-ambient.wav"],
  forge: ["./assets/audio/forge-ambient.mp3", "./assets/audio/forge-ambient.wav"],
  city: ["./assets/audio/city-ambient.mp3", "./assets/audio/city-ambient.wav"],
  citizens: ["./assets/audio/citizens-ambient.mp3", "./assets/audio/citizens-ambient.wav"],
  chronicle: ["./assets/audio/chronicle-ambient.mp3", "./assets/audio/chronicle-ambient.wav"]
};

export function createDefaultRollTables() {
  return structuredClone(BUILDING_POOLS);
}

export function createDefaultDistrictState() {
  return { definitions: structuredClone(BASE_DISTRICT_CONFIG), levelOverrides: {} };
}

export function createEmptyCollection(initialValue = 0) {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, initialValue]));
}

export function createEmptyCitizenCollection(initialValue = 0) {
  return Object.fromEntries(CITIZEN_CLASSES.map((citizenClass) => [citizenClass, initialValue]));
}

export const CONFIG_SNAPSHOT = {
  rarityOrder: RARITY_ORDER,
  rarityPower: RARITY_POWER,
  poolSizes: Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, BUILDING_POOLS[rarity].length])),
  districtNames: Object.keys(BASE_DISTRICT_CONFIG),
  citizenClasses: CITIZEN_CLASSES
};
