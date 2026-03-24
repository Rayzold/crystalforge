// Central configuration and boot-time defaults.
// This file defines versioning, starting presets, high-level tuning constants,
// route metadata, and user-facing build notes that explain what changed.
import { BUILDING_POOLS } from "./BuildingPools.js";
import { BASE_DISTRICT_CONFIG } from "./DistrictConfig.js";
import { CITIZEN_CLASSES } from "./CitizenConfig.js";
import { RARITY_ORDER, RARITY_POWER } from "./Rarities.js";

export const APP_NAME = "Crystal Forge";
export const APP_VERSION = "v1.3.32";
export const SAVE_VERSION = 11;
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
  { key: "chronicle", label: "Chronicle", href: "./chronicle.html" },
  { key: "help", label: "Help", href: "./help.html" }
];
export const BUILD_NOTES = [
  "Ambient page loops now use the same cached direct-play path as manifest and effect audio, so asset-backed background tracks start more reliably after the first user gesture.",
  "Asset-backed effect hooks now cover placement, move, error, construction completion, events, holidays, emergencies, and save/load/publish feedback, with exact drop-in paths documented under assets/audio.",
  "Manifest music now preloads and starts more reliably from the manifest click itself, and the current build version is pinned in the top-right page chrome.",
  "A large building-art drop landed in assets/images/buildings, lifting coverage from 88 catalog matches to 114 and cutting the remaining missing-image checklist down to 27 exact filenames.",
  "Manifest results now show building art immediately, full manifestation reveals are much slower by default, and a new default-off Quick Manifestations switch can skip straight to the result.",
  "Building art coverage was cleaned up again: the stray Something.png asset was removed, Adventurers' Guildhall now matches the catalog name, and a fresh missing-image checklist was generated from the current catalog.",
  "Chronicle's next-holiday jump now adopts each holiday's own accent, City and Player callouts show compact countdown pills, and Chronicle jump targets scroll into view automatically.",
  "Chronicle now includes a direct next-holiday jump in the calendar header, the City command strip shows a compact holiday countdown badge, and jump highlights fade on their own after a short pulse.",
  "Player Mode now links upcoming holidays into Chronicle, yearly events show countdown badges, and jump-targeted holiday days pulse with a subtle highlight ring.",
  "Upcoming holiday cards now open Chronicle on the exact day, and the Home dashboard plus yearly event strip both surface holiday glyphs and quick jumps.",
  "Upcoming holidays now share a richer presentation across City and Chronicle: each card gets its own glyph, holiday-type accent, and Chronicle callout.",
  "The next-holiday card in the session clock now has its own highlighted treatment, making upcoming celebrations easier to spot at a glance.",
  "The session clock now calls out the next upcoming holiday by name, date, and flavor text so you can see what is approaching at a glance.",
  "The Help page now renders the full building image filename guide in-app, while keeping the plain text guide available for copying exact filenames.",
  "The Help page now links directly to the generated building image filename guide so artwork can be named to match the automatic pickup rules.",
  "Buildings now automatically look for committed artwork at assets/images/buildings/<building key>.png, including rarity keys like Crystal Upgrade__Epic.png, and the main HTML views fall back cleanly if a specific image is missing.",
  "Reference material now lives on the Help page: Rules Glossary, Building Roles, Build Notes, and the Release Checklist were consolidated there, and the build tag now sits quietly in the page chrome.",
  "Building artwork now ships from committed asset paths: supported buildings automatically show images from assets/images/buildings on deployed builds.",
  "Town Map planning is much smarter: Auto Place now supports preview/confirm, defense-only or civilian-only passes, district targeting, compact mode, re-roll placement, and lockable structures.",
  "Town Map now includes Auto Place, which greedily assigns unplaced buildings to strong legal hexes while still respecting bastion-only defense rules.",
  "Town Map now feels more playful: placement toasts are punchier, the drawer language is friendlier, and new hex placements burst with a quick celebratory effect.",
  "Town Map is now the main city-planning view: click empty hexes to open a placement drawer, use overlays and recommendations, arm chained placements, and save or restore layout presets.",
  "The map now reads more clearly: buildings use real art or icons, the outer bastion ring is defense-only, occupied hexes have quick actions, and placement can be undone.",
  "Manifestation flow is more reliable: repeated manifests animate quality carry-over cleanly, and Crystal Upgrade now becomes the next-rarity crystal instead of a placeable building.",
  "Active building readouts are clearer across the app, showing exact percentages like 125% or 272% with 2x or 3x production markers when a structure is upgraded.",
  "Incubator slots are now manual assignments, so canceling a build leaves the slot empty until someone explicitly chooses the next building to incubate.",
  "Citizens are now protected from runaway growth on load, and live session state is rewritten into the current format immediately so page navigation stays stable.",
  "Economy readability is much stronger: Home and Player Mode include trends, chains, glossary help, build notes, and clearer daily resource delta readouts.",
  "Exact building quality now reads more consistently across the app: stream cards, player lists, featured structures, and dossiers all show values like 125% or 272% · 2x instead of relying only on stage labels.",
  "Buildings explain themselves better: cards and dossiers show role, outputs, inputs, stalled reasons, and custom flavor text from Common through Beyond.",
  "Chronicle is richer for session play, with yearly events, weather, moon phases, city snapshots, and copyable day summaries.",
  "Recent polish focused on comfort and workflow: stronger contrast, cleaner wording, troubleshooting filters, turn summaries, and a more readable GM shell."
].filter((note) => !note.startsWith("Exact building quality now reads more consistently"));
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
      quickManifestations: false,
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: true,
      theme: "dark",
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      pinnedBuildingIds: [],
      lockedMapBuildingIds: [],
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
      quickManifestations: false,
      currentPage: "home",
      onboardingDismissed: false,
      liveSessionView: false,
      theme: "dark",
      firebaseRealmId: FIREBASE_DEFAULT_REALM_ID,
      pinnedBuildingIds: [],
      lockedMapBuildingIds: [],
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

export const EFFECT_AUDIO_FILE_CANDIDATES = {
  soft: ["./assets/audio/ui-soft.mp3", "./assets/audio/ui-soft.wav"],
  confirm: ["./assets/audio/ui-confirm.mp3", "./assets/audio/ui-confirm.wav"],
  error: ["./assets/audio/ui-error.mp3", "./assets/audio/ui-error.wav"],
  placement: ["./assets/audio/building-placement.mp3", "./assets/audio/building-placement.wav"],
  move: ["./assets/audio/building-move.mp3", "./assets/audio/building-move.wav"],
  "construction-complete": ["./assets/audio/construction-complete.mp3", "./assets/audio/construction-complete.wav"],
  event: ["./assets/audio/event-stinger.mp3", "./assets/audio/event-stinger.wav"],
  emergency: ["./assets/audio/emergency-alert.mp3", "./assets/audio/emergency-alert.wav"],
  holiday: ["./assets/audio/holiday-stinger.mp3", "./assets/audio/holiday-stinger.wav"],
  save: ["./assets/audio/save-success.mp3", "./assets/audio/save-success.wav"],
  load: ["./assets/audio/load-success.mp3", "./assets/audio/load-success.wav"],
  publish: ["./assets/audio/publish-success.mp3", "./assets/audio/publish-success.wav"]
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
