// Central configuration and boot-time defaults.
// This file defines versioning, starting presets, high-level tuning constants,
// route metadata, and user-facing build notes that explain what changed.
import { BUILDING_POOLS } from "./BuildingPools.js";
import { BASE_DISTRICT_CONFIG } from "./DistrictConfig.js";
import { CITIZEN_CLASSES } from "./CitizenConfig.js";
import { RARITY_ORDER, RARITY_POWER } from "./Rarities.js";

export const APP_NAME = "Crystal Forge";
export const APP_VERSION = "v1.2.54";
export const SAVE_VERSION = 10;
export const MANUAL_SAVE_KEY = "crystal-forge-manual-save-v3";
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDl51M8_ywD944xPSByUujzMdATeoy503I",
  authDomain: "crystal-forge-web.firebaseapp.com",
  projectId: "crystal-forge-web",
  storageBucket: "crystal-forge-web.firebasestorage.app",
  messagingSenderId: "17853564289",
  appId: "1:17853564289:web:aacbe34f771431c2085480",
  measurementId: "G-KZTVKXKPSK"
};
export const FIREBASE_REALM_COLLECTION = "realms";
export const FIREBASE_DEFAULT_REALM_ID = "main";
export const MASCOT_MEDIA = {
  enabled: true,
  videoPath: "./assets/video/drift-mascot.mp4",
  label: "Drift mascot"
};
export const PAGE_ROUTES = [
  { key: "home", label: "Home", href: "./gm.html" },
  { key: "forge", label: "Forge", href: "./forge.html" },
  { key: "city", label: "City", href: "./city.html" },
  { key: "citizens", label: "Citizens", href: "./citizens.html" },
  { key: "chronicle", label: "Chronicle", href: "./chronicle.html" }
];
export const BUILD_NOTES = [
  "Player-facing wording is now more consistent across the app: completed buildings read as Active, raw percentages read as quality, and bpd labels expand more clearly into build points/day where space allows.",
  "GM admin now includes an economy debug table for stock, building output, citizen production and consumption, event/focus modifiers, and net daily flow, while wording around roll quality versus building stage has been tightened.",
  "A final readability pass slightly sharpened panel surfaces and lifted muted labels, making windows feel crisper while keeping supporting text easier to read.",
  "A second eye-comfort pass made windows a bit more distinct while also softening the background glow and texture, so content panels feel clearer without making the UI harsher.",
  "Panel and window contrast has been tightened slightly so the major surfaces separate more clearly from the background and feel easier on the eyes during longer sessions.",
  "Crystal Upgrade no longer creates a placeable building: when rolled, it immediately elevates the manifested crystal into the next rarity and older saved Crystal Upgrade buildings are consolidated back into crystal gains.",
  "Moving between Forge, City, Chronicle, and Home now keeps the live realm in session storage, so active buildings and spent crystals no longer disappear just because you changed pages.",
  "The manifestation completion popup now resolves in a single reveal path instead of re-triggering itself after the first animation.",
  "The city stream now supports pinned buildings, quick troubleshooting filters, and impact-based sorting so high-priority structures stay easier to find.",
  "Emergency warnings can now jump straight to the relevant city view, Home can copy city or building summaries, and Chronicle can copy a selected day summary for table notes.",
  "Incubation now supports pause-all and resume-all controls, Player Mode can hide completed buildings, and advancing time now opens a turn summary card showing stock changes and new outcomes.",
  "The GM shell now has an always-visible daily resource delta strip, so food, gold, materials, salvage, and mana momentum stay readable across pages.",
  "Building cards now warn when consumed inputs are low or missing, and stalled incubation explains itself before you need to open the full dossier.",
  "Home now includes a lightweight release checklist so GM prep can quickly confirm shared save presence, local backup, map placement, Chronicle snapshots, and player-screen readiness.",
  "GM Home and Player Mode now include a rules glossary, a city-trends panel, and a resource-chain view so the economy is easier to read at a glance.",
  "Building dossiers and stream cards now explain a structure's role, what it directly produces or consumes, and why incubation is stalled when support cuts out.",
  "Chronicle day details now include a recorded city snapshot with morale, health, defense, security, population support, and the day's emergency state when a snapshot exists.",
  "Recent-change highlighting now extends beyond buildings: resource trends and citizen roster entries can visibly pulse after the city state changes.",
  "Previously light Beyond-tier landmarks now have explicit mechanics, and helper image-reference files have been cleaned to match current names like Trade Center and Workshop Quarter.",
  "All Rare buildings now have custom flavor text as well, giving the third tier clearer identity instead of relying on the generic district phrasing.",
  "All Uncommon buildings now have custom flavor text too, so the second tier no longer falls back to the repetitive district-generated copy.",
  "All Common buildings now have custom flavor text, replacing the old district-generated lines with shorter, more specific descriptions that better fit each structure's role.",
  "Planar Tentacles now pulls in a much richer gold stream on top of its harvested food, materials, and salvage, making it feel like a true legendary planar siphon.",
  "Planar Tentacles now acts like a true legendary land-harvester, dragging in food, materials, salvage, and some gold from the surrounding world while still consuming mana to sustain the breach.",
  "Morale, health, prosperity, defense, security, and housing strain now matter more directly: strong values boost output and safety, while weak values suppress production and make military or social trouble more likely.",
  "Building catalog values now sync directly to the reviewed BUILDING_OUTPUTS.csv sheet, with the retired General Store row removed and a new BUILDING_OUTPUTS_WITH_BPD.csv export added for construction support review.",
  "Release cleanup removed the unused General Store compatibility alias, cut old save-workflow remnants, and moved manual local saves onto a fresh v3 key.",
  "General Store has been renamed to Trade Center, Grain Silo now protects stored supply instead of generating food, and the common trade/support balance has been tightened around Inn and Stables.",
  "Ranks 4 through 6 now follow the same economy structure: advanced industry and arcane infrastructure produce goods, salvage, mana, and materials, while true trade and exchange buildings stay gold-focused.",
  "Rank 2 and Rank 3 buildings now follow the same economy logic as Rank 1: workshops and refiners lean into goods, materials, mana, and salvage, while trade-facing buildings focus on gold.",
  "Rank 1 buildings now follow a cleaner split: producers make food, materials, or goods, while trade buildings focus on gold and gain extra value from excess goods already in the city.",
  "Crystal Upgrade manifestations now read as upgrade manifestations in the completion popup instead of showing a rarity label.",
  "The Open Map button in City now carries a map icon and a brighter accent, so the Town Map reads like a primary destination instead of another small toggle.",
  "Distillation House has been replaced by Workshop Quarter, a clearer rare-tier goods producer for the city economy.",
  "Building surfaces now expose the full building name on mouseover, including compact sidebar, player, queue, and incubation entries.",
  "The new construction model and the City map flow now read together more cleanly during active session management."
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
      population: 270,
      prosperity: 18
    },
    citizens: {
      Farmers: 52,
      Hunters: 18,
      Fishermen: 26,
      Scavengers: 8,
      Druids: 0,
      Laborers: 28,
      Crafters: 18,
      Techwrights: 8,
      Merchants: 10,
      Skycrew: 0,
      Scouts: 6,
      Defenders: 18,
      Soldiers: 12,
      Arcanists: 4,
      Medics: 6,
      Scribes: 8,
      Scholars: 0,
      Nobles: 10,
      Priests: 12,
      Entertainers: 8,
      Children: 28,
      Elderly: 18
    },
    settings: {
      muted: false,
      audioMode: "hybrid",
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: true,
      theme: "dark",
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      pinnedBuildingIds: [],
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
      population: 270,
      prosperity: 280
    },
    citizens: {
      Farmers: 52,
      Hunters: 18,
      Fishermen: 26,
      Scavengers: 8,
      Druids: 0,
      Laborers: 28,
      Crafters: 18,
      Techwrights: 8,
      Merchants: 10,
      Skycrew: 0,
      Scouts: 6,
      Defenders: 18,
      Soldiers: 12,
      Arcanists: 4,
      Medics: 6,
      Scribes: 8,
      Scholars: 0,
      Nobles: 10,
      Priests: 12,
      Entertainers: 8,
      Children: 28,
      Elderly: 18
    },
    settings: {
      muted: false,
      audioMode: "hybrid",
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: false,
      theme: "dark",
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      pinnedBuildingIds: [],
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
