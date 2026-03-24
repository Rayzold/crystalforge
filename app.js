// Main application controller.
// This file wires together state, actions, routing, save/load, manifestation,
// admin commands, and top-level UI events. Most game-wide behavior eventually
// passes through here, while lower-level systems keep the domain rules isolated.
import { AdminConsole } from "./admin/AdminConsole.js";
import { createCatalogEntryFromInput, getBuildingEmoji, getCatalogKey } from "./content/BuildingCatalog.js";
import {
  APP_VERSION,
  BUILDING_ACTIVE_THRESHOLD,
  FIREBASE_DEFAULT_REALM_ID,
  GM_QUICK_CRYSTAL_PACKS
} from "./content/Config.js";
import { EVENT_POOLS } from "./content/EventPools.js";
import { RARITY_ORDER } from "./content/Rarities.js";
import { GameState } from "./engine/GameState.js";
import { AnimationEngine } from "./fx/AnimationEngine.js";
import { AudioEngine } from "./fx/AudioEngine.js";
import { ensureFirebaseAuth, getFirebaseUserId } from "./firebase/FirebaseConfig.js";
import {
  isFirebaseConfigured,
  loadFirebaseRealmState,
  saveFirebaseRealmState,
  subscribeFirebaseRealmState
} from "./firebase/FirebaseSharedState.js";
import { manifestIntoBuilding, removeBuilding, setBuildingQuality, setBuildingRuinState } from "./systems/BuildingSystem.js";
import { addMonthsToOffset, dateFromParts, formatDate, getMonthStartOffset, getStructuredDate } from "./systems/CalendarSystem.js";
import {
  addCitizens,
  applyCitizenBulkSet,
  promoteCitizens,
  removeCitizens,
  resetCitizens,
  setCitizens
} from "./systems/CitizenSystem.js";
import { recalculateCityStats } from "./systems/CityStatsSystem.js";
import { addCrystals, setCrystals } from "./systems/CrystalSystem.js";
import {
  activateConstruction,
  getActiveConstructionQueue,
  getAvailableConstructionQueue,
  getConstructionEtaDetails,
  moveConstructionPriority,
  normalizeConstructionPriority,
  pauseConstruction
} from "./systems/ConstructionSystem.js";
import { resetDistrictLevels, setDistrictDefinition, setDistrictLevelOverride, getDistrictSummary } from "./systems/DistrictSystem.js";
import { setDriftEvolutionStageOverride, syncDriftEvolutionState } from "./systems/DriftEvolutionSystem.js";
import { clearActiveEvents, triggerEvent } from "./systems/EventSystem.js";
import { getDailyCitySnapshot } from "./systems/CitySnapshotSystem.js";
import { manifestSelectedRarity } from "./systems/GachaSystem.js";
import { addHistoryEntry } from "./systems/HistoryLogSystem.js";
import {
  canPlaceBuildingAt,
  clearBuildingPlacement,
  findMapCell,
  forceSetBuildingPlacement,
  getBuildingPlacementBonuses,
  getBuildingAtCell,
  isFortificationBuilding,
  setBuildingPlacement
} from "./systems/MapSystem.js";
import { addShards, setShards } from "./systems/ShardSystem.js";
import {
  createLiveSessionResetState,
  createSessionSnapshot as createSessionSnapshotRecord,
  createTestingBalanceResetState,
  createSingleCommonCrystalResetState,
  exportSave,
  importSave,
  loadGameState,
  loadManualState,
  resetSave,
  restoreSessionSnapshot,
  createSerializableState,
  saveGameState,
  saveManualState,
  validateAndMigrateSave
} from "./systems/StorageSystem.js";
import { advanceTime, advanceTimeByDays } from "./systems/TimeSystem.js";
import { forceTownFocus, reopenTownFocusSelection, selectTownFocus, updateTownFocusAvailability } from "./systems/TownFocusSystem.js";
import { getEmergencyStatus, getCityTrendSummary } from "./systems/ResourceSystem.js";
import { Toasts } from "./ui/Toasts.js";
import { getDefaultTownFocusPreviewId } from "./ui/TownFocusShared.js";
import { UIRenderer } from "./ui/UIRenderer.js";

const root = document.querySelector("#app");
const pageKey = document.body.dataset.page ?? "home";
const renderer = new UIRenderer(root, pageKey);
const toasts = new Toasts();
const animationEngine = new AnimationEngine();
const audioEngine = new AudioEngine();
audioEngine.setPage(pageKey);
const gameState = new GameState(loadGameState());
const firebaseClientId = (() => {
  try {
    const key = "crystal-forge-firebase-client-id";
    const existing = sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const nextId = `firebase-client-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, nextId);
    return nextId;
  } catch (error) {
    return `firebase-client-${Math.random().toString(36).slice(2, 10)}`;
  }
})();
let adjacencyPulseTimer = null;
let focusCeremonyTimer = null;
let manifestCompleteTimer = null;
let pageEnterTimer = null;
let firebasePublishTimer = null;
let applyingFirebaseState = false;
let projectorChromeTimer = null;
let recentBuildingChangeTimer = null;
let recentStateChangeTimer = null;
let mapPlacementFxTimer = null;
let chronicleJumpHighlightTimer = null;
let manifestInProgress = false;
let mapDragState = null;
let suppressNextMapClick = false;
let navigationShortcutTimer = null;
let navigationShortcutBuffer = "";
syncDerivedState(gameState.getState());
// Rewrite the loaded session immediately so migration fixes are not lost while
// moving between pages in an already-open browser session.
saveGameState(gameState.getState());

function clearChronicleJumpHighlightTimer() {
  if (chronicleJumpHighlightTimer) {
    clearTimeout(chronicleJumpHighlightTimer);
    chronicleJumpHighlightTimer = null;
  }
}

function scheduleChronicleJumpHighlightClear(dayOffset) {
  clearChronicleJumpHighlightTimer();
  if (!Number.isFinite(dayOffset)) {
    return;
  }
  chronicleJumpHighlightTimer = window.setTimeout(() => {
    if (renderer.transientUi.chronicleJumpHighlightDay === dayOffset) {
      renderer.setTransientUi({ chronicleJumpHighlightDay: null }, getCurrentState());
    }
    chronicleJumpHighlightTimer = null;
  }, 3200);
}

function scrollChronicleDayIntoView(dayOffset) {
  if (!Number.isFinite(dayOffset)) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const dayButton = document.querySelector(`.chronicle-calendar__day[data-day-offset="${dayOffset}"]`);
      dayButton?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
  });
}

function updateFirebasePublishedMeta(payload = null, connectionState = "idle") {
  renderer.transientUi.firebasePublishedMeta = payload
    ? {
        updatedAtMs: Number(payload.updatedAtMs ?? 0) || null,
        updatedBy: payload.updatedBy ?? null,
        appVersion: payload.appVersion ?? null
      }
    : null;
  renderer.transientUi.firebaseConnectionState = connectionState;
}

async function syncFirebaseIdentityUi() {
  if (!isFirebaseConfigured()) {
    renderer.transientUi.firebaseCurrentUid = "";
    renderer.transientUi.firebaseCanPublish = false;
    return;
  }

  try {
    await ensureFirebaseAuth();
    const currentUid = getFirebaseUserId() ?? "";
    const state = getCurrentState();
    renderer.transientUi.firebaseCurrentUid = currentUid;
    renderer.transientUi.firebaseCanPublish = Boolean(
      state.ui.adminUnlocked &&
      state.settings.firebasePublisherUid &&
      currentUid &&
      state.settings.firebasePublisherUid === currentUid
    );
  } catch (error) {
    renderer.transientUi.firebaseCurrentUid = "";
    renderer.transientUi.firebaseCanPublish = false;
  }
}

function clearProjectorChromeTimer() {
  if (projectorChromeTimer) {
    clearTimeout(projectorChromeTimer);
    projectorChromeTimer = null;
  }
}

function scheduleProjectorChromeHide() {
  if (pageKey !== "player") {
    return;
  }
  clearProjectorChromeTimer();
  if (!renderer.transientUi.projectorMode) {
    return;
  }
  projectorChromeTimer = setTimeout(() => {
    renderer.setTransientUi({ projectorChromeHidden: true }, getCurrentState());
  }, 5000);
}

function revealProjectorChrome() {
  if (pageKey !== "player" || !renderer.transientUi.projectorMode) {
    return;
  }
  if (renderer.transientUi.projectorChromeHidden) {
    renderer.setTransientUi({ projectorChromeHidden: false }, getCurrentState());
  }
  scheduleProjectorChromeHide();
}

function getConfiguredFirebasePublisherUid(state = getCurrentState()) {
  return String(state.settings.firebasePublisherUid ?? "").trim();
}

function parseAppVersion(version) {
  const cleaned = String(version ?? "")
    .trim()
    .replace(/^v/i, "");
  const parts = cleaned.split(".").map((part) => Number.parseInt(part, 10));
  if (!parts.length || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return parts;
}

function compareAppVersions(leftVersion, rightVersion) {
  const left = parseAppVersion(leftVersion);
  const right = parseAppVersion(rightVersion);
  if (!left || !right) {
    return 0;
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }
  return 0;
}

function canCurrentSessionPublishToFirebase(state = getCurrentState()) {
  if (pageKey === "player" || !state.ui.adminUnlocked) {
    return false;
  }
  const configuredUid = getConfiguredFirebasePublisherUid(state);
  if (!configuredUid) {
    return false;
  }
  const currentUid = getFirebaseUserId();
  return Boolean(currentUid && currentUid === configuredUid);
}

async function getCurrentFirebaseUid() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured in this build.");
  }
  await ensureFirebaseAuth();
  return getFirebaseUserId();
}

async function ensureFirebasePublisherAccess(state = getCurrentState()) {
  const currentUid = await getCurrentFirebaseUid();
  const configuredUid = getConfiguredFirebasePublisherUid(state);
  if (!configuredUid) {
    throw new Error(`No GM publisher UID is set yet. Current browser UID: ${currentUid}`);
  }
  if (configuredUid !== currentUid) {
    throw new Error(`This browser is not the GM publisher. Current UID: ${currentUid}`);
  }
  return currentUid;
}

function markRecentBuildingChanges(buildingIds = []) {
  const ids = [...new Set(buildingIds.filter(Boolean))];
  if (!ids.length) {
    return;
  }
  renderer.setTransientUi(
    {
      recentBuildingChanges: {
        ...(renderer.transientUi.recentBuildingChanges ?? {}),
        ...Object.fromEntries(ids.map((id) => [id, Date.now()]))
      }
    },
    getCurrentState()
  );
  if (recentBuildingChangeTimer) {
    clearTimeout(recentBuildingChangeTimer);
  }
  recentBuildingChangeTimer = setTimeout(() => {
    renderer.setTransientUi({ recentBuildingChanges: {} }, getCurrentState());
    recentBuildingChangeTimer = null;
  }, 2600);
}

function scheduleRecentStateChangeClear() {
  if (recentStateChangeTimer) {
    clearTimeout(recentStateChangeTimer);
  }
  recentStateChangeTimer = setTimeout(() => {
    renderer.setTransientUi({ recentResourceChanges: {}, recentCitizenChanges: {} }, getCurrentState());
    recentStateChangeTimer = null;
  }, 2600);
}

function markRecentResourceChanges(resourceKeys = []) {
  const keys = [...new Set(resourceKeys.filter(Boolean))];
  if (!keys.length) {
    return;
  }
  renderer.setTransientUi(
    {
      recentResourceChanges: {
        ...(renderer.transientUi.recentResourceChanges ?? {}),
        ...Object.fromEntries(keys.map((key) => [key, Date.now()]))
      }
    },
    getCurrentState()
  );
  scheduleRecentStateChangeClear();
}

function markRecentCitizenChanges(citizenKeys = []) {
  const keys = [...new Set(citizenKeys.filter(Boolean))];
  if (!keys.length) {
    return;
  }
  renderer.setTransientUi(
    {
      recentCitizenChanges: {
        ...(renderer.transientUi.recentCitizenChanges ?? {}),
        ...Object.fromEntries(keys.map((key) => [key, Date.now()]))
      }
    },
    getCurrentState()
  );
  scheduleRecentStateChangeClear();
}

function syncDerivedState(state) {
  if ((state.crystals[state.selectedRarity] ?? 0) <= 0) {
    state.selectedRarity =
      RARITY_ORDER.find((rarity) => (state.crystals[rarity] ?? 0) > 0) ?? state.selectedRarity;
  }
  state.settings.currentPage = pageKey;
  state.settings.theme = "dark";
  state.settings.firebaseRealmId = getPublishedFirebaseRealmId(state);
  const driftUpdate = syncDriftEvolutionState(state);
  for (const stage of driftUpdate.newStages) {
    addHistoryEntry(state, {
      category: "Evolution",
      title: stage.name,
      details: `Drift evolution reached ${stage.name} at ${driftUpdate.manifestedCount} manifested buildings.`
    });
  }
  normalizeConstructionPriority(state);
  state.districtSummary = getDistrictSummary(state);
  state.resources.population = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
  updateTownFocusAvailability(state);
  recalculateCityStats(state);
}

function commit(mutator) {
  let result;
  gameState.update((draft) => {
    result = mutator(draft);
    syncDerivedState(draft);
    return draft;
  });
  return result;
}

function playEffect(effectName) {
  void audioEngine.playEffect(effectName);
}

function reportSuccess(message, effectName = null) {
  if (message) {
    toasts.show(message, "success");
  }
  if (effectName) {
    playEffect(effectName);
  }
}

function reportError(message, effectName = "error") {
  if (message) {
    toasts.show(message, "error");
  }
  if (effectName) {
    playEffect(effectName);
  }
}

async function copyTextToClipboard(text, successMessage) {
  if (!navigator.clipboard?.writeText) {
    reportError("Clipboard copy is not available in this browser.");
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    reportSuccess(successMessage);
    return true;
  } catch (error) {
    reportError(error.message);
    return false;
  }
}

function describeActiveBuildings(state) {
  const active = state.buildings.filter((building) => building.isComplete);
  const incubating = getActiveConstructionQueue(state);
  const waiting = getAvailableConstructionQueue(state);

  return [
    `Active Buildings (${active.length})`,
    ...(active.length ? active.map((building) => `- ${building.displayName} (${building.rarity}, ${building.quality}%)`) : ["- None"]),
    "",
    `Incubating (${incubating.length})`,
    ...(incubating.length
      ? incubating.map((building) => {
          const etaDetails = getConstructionEtaDetails(building, state);
          return `- ${building.displayName} (${building.rarity}, ${building.quality}%, ${etaDetails.isStalled ? `stalled: ${etaDetails.stallReasons.join(", ")}` : `${etaDetails.daysRemaining?.toFixed?.(1) ?? "?"}d remaining`})`;
        })
      : ["- None"]),
    "",
    `Available (${waiting.length})`,
    ...(waiting.length ? waiting.map((building) => `- ${building.displayName} (${building.rarity}, ${building.quality}%)`) : ["- None"])
  ].join("\n");
}

function describeCityStatus(state) {
  const trends = getCityTrendSummary(state);
  const emergencyState = getEmergencyStatus(state);
  return [
    `Crystal Forge City Status`,
    `Date: ${formatDate(state.calendar.dayOffset)}`,
    `Population: ${state.resources.population}`,
    `Gold: ${state.resources.gold} (${trends.find((entry) => entry.key === "gold")?.delta?.toFixed?.(1) ?? "0"}/day)`,
    `Food: ${state.resources.food} (${trends.find((entry) => entry.key === "food")?.delta?.toFixed?.(1) ?? "0"}/day)`,
    `Materials: ${state.resources.materials} (${trends.find((entry) => entry.key === "materials")?.delta?.toFixed?.(1) ?? "0"}/day)`,
    `Salvage: ${state.resources.salvage ?? 0} (${trends.find((entry) => entry.key === "salvage")?.delta?.toFixed?.(1) ?? "0"}/day)`,
    `Mana: ${state.resources.mana} (${trends.find((entry) => entry.key === "mana")?.delta?.toFixed?.(1) ?? "0"}/day)`,
    `Morale: ${Math.round(state.cityStats.morale ?? 0)}`,
    `Health: ${Math.round(state.cityStats.health ?? 0)}`,
    `Defense: ${Math.round(state.cityStats.defense ?? 0)}`,
    `Security: ${Math.round(state.cityStats.security ?? 0)}`,
    `Warnings: ${emergencyState.emergencies.length ? emergencyState.emergencies.map((entry) => entry.label).join(", ") : "None"}`
  ].join("\n");
}

function describeChronicleDay(state, dayOffset) {
  const snapshot = getDailyCitySnapshot(state, dayOffset);
  const date = getStructuredDate(dayOffset);
  const events = [...(state.events.active ?? []), ...(state.events.recent ?? []), ...(state.events.scheduled ?? [])].filter((event) => {
    const start = Number(event.startedDayOffset);
    const end = Number(event.endsDayOffset ?? event.startedDayOffset);
    return Number.isFinite(start) && dayOffset >= start && dayOffset <= end;
  });
  const note = String(state.chronicleNotes?.[String(dayOffset)] ?? "").trim();

  return [
    `${formatDate(dayOffset)}`,
    `Holiday: ${date.holiday?.name ?? "None"}`,
    `Weather: ${date.weather.icon} ${date.weather.name}`,
    `Moon: ${date.moonPhase.icon} ${date.moonPhase.name}`,
    `Events: ${events.length ? events.map((event) => event.name).join(", ") : "None"}`,
    `City Conditions: ${snapshot?.conditions?.join(", ") ?? "No snapshot recorded"}`,
    note ? `Note: ${note}` : "Note: None"
  ].join("\n");
}

function createTurnSummary(previousState, nextState, days) {
  const resourceKeys = [
    ["gold", "Gold"],
    ["food", "Food"],
    ["materials", "Materials"],
    ["salvage", "Salvage"],
    ["mana", "Mana"]
  ];
  const completedBuildings = nextState.buildings
    .filter((building) => building.isComplete && !previousState.buildings.find((entry) => entry.id === building.id)?.isComplete)
    .map((building) => building.displayName)
    .slice(0, 6);
  const previousEmergencyCount = getEmergencyStatus(previousState).emergencies.length;
  const nextEmergencyCount = getEmergencyStatus(nextState).emergencies.length;
  const previousRecentKeys = new Set((previousState.events.recent ?? []).map((event) => `${event.id ?? event.name}-${event.startedDayOffset ?? ""}`));
  const newEventTitles = (nextState.events.recent ?? [])
    .filter((event) => !previousRecentKeys.has(`${event.id ?? event.name}-${event.startedDayOffset ?? ""}`))
    .map((event) => event.name)
    .slice(0, 6);

  return {
    days,
    dateLabel: formatDate(nextState.calendar.dayOffset),
    resourceDeltas: resourceKeys.map(([key, label]) => {
      const before = Number(previousState.resources?.[key] ?? 0);
      const after = Number(nextState.resources?.[key] ?? 0);
      return {
        key,
        label,
        before,
        after,
        delta: after - before
      };
    }),
    completedBuildings,
    emergencyCount: {
      before: previousEmergencyCount,
      after: nextEmergencyCount
    },
    newEventTitles
  };
}

function playTurnAdvanceEffect(previousState, nextState, summary) {
  if ((summary.emergencyCount.after ?? 0) > (summary.emergencyCount.before ?? 0)) {
    playEffect("emergency");
    return;
  }

  const previousHoliday = getStructuredDate(previousState.calendar.dayOffset).holiday?.name ?? null;
  const nextHoliday = getStructuredDate(nextState.calendar.dayOffset).holiday?.name ?? null;
  if (nextHoliday && nextHoliday !== previousHoliday) {
    playEffect("holiday");
    return;
  }

  if (summary.newEventTitles.length) {
    playEffect("event");
    return;
  }

  if (summary.completedBuildings.length) {
    playEffect("construction-complete");
  }
}

function applyProblemFocus(problemKey) {
  const currentState = getCurrentState();
  const patch = {};

  switch (problemKey) {
    case "food":
    case "gold":
    case "mana":
    case "housing":
      patch.cityMode = "administration";
      patch.cityAdminView = "readouts";
      break;
    case "workforce":
      patch.cityMode = "buildings";
      patch.cityBuildingView = "stream";
      patch.buildingStatusFilter = "All";
      patch.buildingQuickFilter = "Understaffed";
      break;
    case "morale":
      patch.cityMode = "administration";
      patch.cityAdminView = "operations";
      break;
    case "stalled":
      patch.cityMode = "buildings";
      patch.cityBuildingView = "stream";
      patch.buildingQuickFilter = "Stalled";
      break;
    case "inputs":
      patch.cityMode = "buildings";
      patch.cityBuildingView = "stream";
      patch.buildingQuickFilter = "Consuming Input";
      break;
    default:
      patch.cityMode = "buildings";
      patch.cityBuildingView = "stream";
      break;
  }

  renderer.setTransientUi(patch, currentState);
}

function rollDice() {
  const sidesByType = {
    d2: 2,
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20,
    d100: 100
  };
  const state = getCurrentState();
  const amount = Math.max(1, Math.min(20, Number(state.settings.diceAmount ?? 1) || 1));
  const diceType = String(state.settings.diceType ?? "d20");
  const sides = sidesByType[diceType] ?? 20;
  const results = Array.from({ length: amount }, () => Math.floor(Math.random() * sides) + 1);
  const total = results.reduce((sum, value) => sum + value, 0);
  const entry = {
    label: `${amount}${diceType}`,
    results,
    total,
    rolledAt: Date.now()
  };

  commit((draft) => {
    const history = Array.isArray(draft.settings.diceHistory) ? draft.settings.diceHistory : [];
    draft.settings.diceAmount = amount;
    draft.settings.diceType = diceType;
    draft.settings.lastDiceRoll = entry;
    draft.settings.diceHistory = [entry, ...history].slice(0, 5);
  });

  void audioEngine.playUiAccent("confirm");
  reportSuccess(`${entry.label}: ${results.join(", ")} (Total ${total})`);
}

function ensureCatalogEntry(state, catalogEntry) {
  state.buildingCatalog[catalogEntry.key] = {
    ...(state.buildingCatalog[catalogEntry.key] ?? {}),
    ...catalogEntry
  };
  return state.buildingCatalog[catalogEntry.key];
}

function getCurrentState() {
  return gameState.getState();
}

function exportBuildingCatalogStatus() {
  const state = getCurrentState();
  const rows = ["Building,Rarity,District,Manifested,Quality"];

  for (const rarity of RARITY_ORDER) {
    for (const name of state.rollTables[rarity] ?? []) {
      const building = state.buildings.find((entry) => entry.name === name && entry.rarity === rarity) ?? null;
      const district = state.buildingCatalog[getCatalogKey(name, rarity)]?.district ?? "";
      rows.push(
        [
          `"${name.replaceAll('"', '""')}"`,
          rarity,
          `"${district.replaceAll('"', '""')}"`,
          building ? "Yes" : "No",
          building ? Number(building.quality).toFixed(2) : ""
        ].join(",")
      );
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "crystal-forge-building-catalog.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setRollTableList({ rarity, names }) {
  const parsedNames = [...new Set(
    String(names ?? "")
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
  )];

  commit((draft) => {
    draft.rollTables[rarity] = parsedNames;

    for (const name of parsedNames) {
      const catalogKey = getCatalogKey(name, rarity);
      if (!draft.buildingCatalog[catalogKey]) {
        draft.buildingCatalog[catalogKey] = createCatalogEntryFromInput({
          name,
          rarity,
          district: "Residential District",
          tags: ["civic"],
          iconKey: "spire",
          imagePath: "",
          specialEffect: "A newly recorded structure awaiting fuller classification."
        });
      }
    }
  });

  reportSuccess(`${rarity} roll list updated to ${parsedNames.length} building${parsedNames.length === 1 ? "" : "s"}.`);
}

function clearUrlParams() {
  window.history.replaceState({}, "", window.location.pathname);
}

function isInternalPageLink(anchor) {
  if (!anchor?.href) {
    return false;
  }
  if (anchor.target && anchor.target !== "_self") {
    return false;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) {
    return false;
  }
  if (url.hash && url.pathname === window.location.pathname && !url.search) {
    return false;
  }
  return /\.html?$/.test(url.pathname) || url.pathname.endsWith("/");
}

function startPageEnter() {
  document.body.classList.remove("is-page-leaving");
  document.body.classList.add("is-page-entering");
  window.requestAnimationFrame(() => {
    document.body.classList.add("is-page-entered");
  });
  if (pageEnterTimer) {
    window.clearTimeout(pageEnterTimer);
  }
  pageEnterTimer = window.setTimeout(() => {
    document.body.classList.remove("is-page-entering");
  }, 700);
}

function navigateWithTransition(href) {
  void audioEngine.playUiAccent("soft");
  document.body.classList.add("is-page-leaving");
  window.setTimeout(() => {
    window.location.href = href;
  }, 180);
}

function clearHoveredMapCell() {
  if (renderer.transientUi.hoveredMapCell) {
    renderer.setTransientUi({ hoveredMapCell: null }, getCurrentState());
  }
}

function getMapViewState() {
  return {
    mapZoom: Number(renderer.transientUi.mapZoom ?? 1),
    mapPanX: Number(renderer.transientUi.mapPanX ?? 0),
    mapPanY: Number(renderer.transientUi.mapPanY ?? 0)
  };
}

function applyMapViewPreview(view = getMapViewState()) {
  const svg = root.querySelector(".hex-map");
  if (!svg) {
    return;
  }
  svg.style.transform = `translate(${Number(view.mapPanX ?? 0)}px, ${Number(view.mapPanY ?? 0)}px) scale(${Number(view.mapZoom ?? 1)})`;
  svg.style.transformOrigin = "50% 50%";
}

function getFilteredUnplacedMapCandidates(state, filterKey = renderer.transientUi.mapPlacementFilter ?? "All") {
  const buildings = state.buildings.filter((building) => !building.mapPosition);
  const filtered = (() => {
    switch (filterKey) {
    case "Defense":
      return buildings.filter((building) => isFortificationBuilding(building));
    case "Trade":
      return buildings.filter((building) => (building.tags ?? []).includes("trade"));
    case "Housing":
      return buildings.filter((building) => (building.tags ?? []).includes("housing"));
    case "Pinned":
      return buildings.filter((building) => state.settings?.pinnedBuildingIds?.includes(building.id));
    case "All":
    default:
      return buildings;
    }
  })();

  return filtered.sort((left, right) => {
    if (left.rarity !== right.rarity) {
      return RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity);
    }
    return left.displayName.localeCompare(right.displayName);
  });
}

function getHexDistance(leftQ, leftR, rightQ, rightR) {
  const leftS = -leftQ - leftR;
  const rightS = -rightQ - rightR;
  return Math.max(Math.abs(leftQ - rightQ), Math.abs(leftR - rightR), Math.abs(leftS - rightS));
}

function getPlacementDistrictInfluence(state, cell) {
  const weights = new Map();
  for (const building of state.buildings) {
    if (!building.mapPosition) {
      continue;
    }

    const distance = getHexDistance(cell.q, cell.r, building.mapPosition.q, building.mapPosition.r);
    if (distance > 2) {
      continue;
    }

    const nextWeight = (weights.get(building.district) ?? 0) + (distance === 0 ? 4 : distance === 1 ? 2 : 1);
    weights.set(building.district, nextWeight);
  }

  const strongest = [...weights.entries()].sort((left, right) => right[1] - left[1])[0];
  if (!strongest) {
    return null;
  }

  return {
    district: strongest[0],
    weight: strongest[1]
  };
}

function getAutoPlacementPriority(state, building) {
  let priority = 0;
  if (state.settings?.pinnedBuildingIds?.includes(building.id)) {
    priority += 0.45;
  }
  if (isFortificationBuilding(building)) {
    priority += 0.3;
  }
  const rarityIndex = RARITY_ORDER.indexOf(building.rarity);
  if (rarityIndex >= 0) {
    priority += rarityIndex * 0.04;
  }
  return priority;
}

function getAutoPlacementScore(state, building, cell) {
  const validation = canPlaceBuildingAt(state, building.id, cell.q, cell.r);
  if (!validation.ok) {
    return Number.NEGATIVE_INFINITY;
  }

  const previewTarget = { ...building, mapPosition: { q: cell.q, r: cell.r } };
  const bonus = getBuildingPlacementBonuses(state, previewTarget);
  const districtInfluence = getPlacementDistrictInfluence(state, cell);
  let score = bonus.totalPercent;

  if (districtInfluence?.district === building.district) {
    score += 0.08;
  }
  if (bonus.sameDistrictNeighbors > 0) {
    score += 0.03;
  }
  if (bonus.relatedTagNeighbors > 0) {
    score += 0.02;
  }
  if (cell.isFortificationRing && isFortificationBuilding(building)) {
    score += 0.12;
  }

  return score;
}

function isBetterAutoPlacement(candidate, currentBest) {
  if (!candidate) {
    return false;
  }
  if (!currentBest) {
    return true;
  }

  const totalDiff = candidate.totalScore - currentBest.totalScore;
  if (Math.abs(totalDiff) > 0.0001) {
    return totalDiff > 0;
  }

  const priorityDiff = candidate.priority - currentBest.priority;
  if (Math.abs(priorityDiff) > 0.0001) {
    return priorityDiff > 0;
  }

  const scoreDiff = candidate.score - currentBest.score;
  if (Math.abs(scoreDiff) > 0.0001) {
    return scoreDiff > 0;
  }

  const candidateRarity = RARITY_ORDER.indexOf(candidate.building.rarity);
  const currentRarity = RARITY_ORDER.indexOf(currentBest.building.rarity);
  if (candidateRarity !== currentRarity) {
    return candidateRarity > currentRarity;
  }

  return candidate.building.displayName.localeCompare(currentBest.building.displayName) < 0;
}

function findBestAutoPlacement(state) {
  let bestPlacement = null;
  const openCells = state.map.cells.filter((cell) => !cell.isReserved && !getBuildingAtCell(state, cell.q, cell.r));
  const unplacedBuildings = state.buildings.filter((building) => !building.mapPosition);

  for (const building of unplacedBuildings) {
    const priority = getAutoPlacementPriority(state, building);
    for (const cell of openCells) {
      const score = getAutoPlacementScore(state, building, cell);
      if (!Number.isFinite(score)) {
        continue;
      }

      const candidate = {
        building,
        q: cell.q,
        r: cell.r,
        score,
        priority,
        totalScore: score + priority
      };

      if (isBetterAutoPlacement(candidate, bestPlacement)) {
        bestPlacement = candidate;
      }
    }
  }

  return bestPlacement;
}

function runAutoPlaceBuildings() {
  const state = getCurrentState();
  const startingUnplacedCount = state.buildings.filter((building) => !building.mapPosition).length;
  if (!startingUnplacedCount) {
    reportError("No unplaced buildings are waiting for the Town Map.");
    return;
  }

  const result = commit((draft) => {
    const placements = [];
    let nextPlacement = findBestAutoPlacement(draft);

    // Auto Place works as a greedy planner: it takes the strongest legal move,
    // commits it, then re-scores the next move against the updated city layout.
    while (nextPlacement) {
      const placementResult = setBuildingPlacement(
        draft,
        nextPlacement.building.id,
        Number(nextPlacement.q),
        Number(nextPlacement.r),
        "Auto Place"
      );
      if (!placementResult.ok) {
        break;
      }

      placements.push({
        buildingId: nextPlacement.building.id,
        q: Number(nextPlacement.q),
        r: Number(nextPlacement.r)
      });
      nextPlacement = findBestAutoPlacement(draft);
    }

    const lastPlacement = placements[placements.length - 1] ?? null;
    if (lastPlacement) {
      setSelectedBuildingAndCell(draft, lastPlacement.buildingId);
      draft.ui.selectedMapCell = { q: lastPlacement.q, r: lastPlacement.r };
    } else {
      draft.ui.selectedMapCell = null;
    }

    addHistoryEntry(draft, {
      category: "Placement",
      title: "Auto Place completed",
      details: placements.length
        ? `Auto Place assigned ${placements.length} building${placements.length === 1 ? "" : "s"} to legal hexes.`
        : "Auto Place could not find any legal hexes for the current unplaced buildings."
    });

    return {
      placements,
      remainingCount: draft.buildings.filter((building) => !building.mapPosition).length,
      lastPlacement
    };
  });

  renderer.setTransientUi(
    {
      mapPlannerBuildingId: null,
      mapPlannerMode: null,
      validPlacementMode: false,
      lastPlacement: null
    },
    getCurrentState()
  );

  if (!result.placements.length) {
    reportError("Auto Place could not find any legal hexes for the current unplaced buildings.");
    return;
  }

  markRecentBuildingChanges(result.placements.map((placement) => placement.buildingId));

  if (result.lastPlacement) {
    const placedBuilding = getCurrentState().buildings.find((building) => building.id === result.lastPlacement.buildingId) ?? null;
    showMapPlacementPulse(result.lastPlacement.q, result.lastPlacement.r, placedBuilding);
  }

  reportSuccess(
    result.remainingCount > 0
      ? `Auto-placed ${result.placements.length} buildings. ${result.remainingCount} still need legal hexes.`
      : `Auto-placed ${result.placements.length} buildings. The map found a home for everything.`
  );
}

function setMapPlannerBuilding(buildingId, mode = "chain", successMessage = null) {
  const state = getCurrentState();
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    reportError("That building is no longer available.");
    return false;
  }

  commit((draft) => {
    setSelectedBuildingAndCell(draft, building.id);
    draft.ui.selectedMapCell = null;
  });
  renderer.setTransientUi(
    {
      mapPlannerBuildingId: building.id,
      mapPlannerMode: mode,
      validPlacementMode: true
    },
    getCurrentState()
  );
  if (successMessage) {
    reportSuccess(successMessage);
  }
  return true;
}

function clearMapPlanner() {
  renderer.setTransientUi(
    {
      mapPlannerBuildingId: null,
      mapPlannerMode: null
    },
    getCurrentState()
  );
}

function advanceMapPlannerAfterPlacement(placedBuildingId) {
  if (renderer.transientUi.mapPlannerBuildingId !== placedBuildingId) {
    return;
  }

  if (renderer.transientUi.mapPlannerMode === "move") {
    clearMapPlanner();
    return;
  }

  const state = getCurrentState();
  const nextCandidate = getFilteredUnplacedMapCandidates(state).find((building) => building.id !== placedBuildingId);
  if (!nextCandidate) {
    clearMapPlanner();
    reportSuccess("Placement queue completed. The city hums with new shape.");
    return;
  }

  setMapPlannerBuilding(nextCandidate.id, "chain", `${nextCandidate.displayName} is queued for the next hex.`);
}

function showMapPlacementPulse(q, r, building = null) {
  if (mapPlacementFxTimer) {
    clearTimeout(mapPlacementFxTimer);
  }
  renderer.setTransientUi(
    {
      mapPlacementPulseCell: {
        q: Number(q),
        r: Number(r),
        emoji: building ? getBuildingEmoji(building) : null,
        rarity: building?.rarity ?? null
      }
    },
    getCurrentState()
  );
  mapPlacementFxTimer = setTimeout(() => {
    renderer.setTransientUi({ mapPlacementPulseCell: null }, getCurrentState());
    mapPlacementFxTimer = null;
  }, 1200);
}

function getPlacementZoneLabel(cell) {
  if (!cell) {
    return "Town Map";
  }
  return cell.isFortificationRing ? "Bastion Ring" : "City Ring";
}

function getPlacementSuccessMessage(building, q, r, resonanceGain = 0) {
  const cell = findMapCell(getCurrentState(), Number(q), Number(r));
  const emoji = getBuildingEmoji(building);
  const zoneLabel = getPlacementZoneLabel(cell);
  if (resonanceGain > 0) {
    return `${emoji} ${building.displayName} locked into the ${zoneLabel} at hex ${q}, ${r}. +${Math.round(
      resonanceGain * 1000
    ) / 10}% resonance.`;
  }
  return `${emoji} ${building.displayName} locked into the ${zoneLabel} at hex ${q}, ${r}.`;
}

function createMapPresetRecord(state, name) {
  return {
    id: `map-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    savedAt: Date.now(),
    placements: Object.fromEntries(
      state.buildings.map((building) => [
        building.id,
        building.mapPosition ? { q: Number(building.mapPosition.q), r: Number(building.mapPosition.r) } : null
      ])
    )
  };
}

function resetTransientUi() {
  renderer.setTransientUi(
    {
      hoveredMapCell: null,
      inspectedBuildingId: null,
      catalogOpen: false,
      manifestCompleteModal: null,
      turnSummaryModal: null,
      mapOverlay: "District",
      mapLegendOpen: true,
      mapPlannerBuildingId: null,
      mapPlannerMode: null,
      validPlacementMode: false,
      lastPlacement: null,
      mapZoom: 1,
      mapPanX: 0,
      mapPanY: 0,
      mapPlacementPulseCell: null
    },
    getCurrentState()
  );
}

function openTownFocusModal(focusId = null) {
  const state = getCurrentState();
  renderer.setTransientUi(
    {
      councilModalOpen: true,
      previewTownFocusId: focusId ?? renderer.transientUi.previewTownFocusId ?? getDefaultTownFocusPreviewId(state),
      councilModalCycleKey: state.townFocus.isSelectionPending ? String(state.townFocus.nextSelectionDayOffset) : renderer.transientUi.councilModalCycleKey
    },
    state
  );
}

function closeDirectManifestPopup() {
  document.querySelector("#direct-manifest-complete-modal")?.remove();
}

function showDirectManifestPopup(manifestCompleteModal) {
  closeDirectManifestPopup();

  const modal = document.createElement("div");
  modal.id = "direct-manifest-complete-modal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "1600";
  modal.style.display = "grid";
  modal.style.placeItems = "center";
  modal.style.background = "rgba(3, 6, 11, 0.84)";
  modal.style.backdropFilter = "blur(10px)";

  const rolledName = String(manifestCompleteModal?.rolledName ?? "Manifest Result");
  const rarity = String(manifestCompleteModal?.rarity ?? "Unknown");
  const quality = Number(manifestCompleteModal?.finalQuality ?? manifestCompleteModal?.qualityRoll ?? 0);
  const isCrystalUpgrade = Boolean(manifestCompleteModal?.isCrystalUpgrade);

  modal.innerHTML = `
    <div style="position:relative; width:min(680px, calc(100vw - 24px)); padding:28px; border-radius:24px; border:1px solid rgba(141, 214, 255, 0.22); background:linear-gradient(180deg, rgba(9, 13, 22, 0.985), rgba(6, 9, 16, 0.985)); box-shadow:0 28px 80px rgba(0, 0, 0, 0.46); color:rgba(236, 244, 255, 0.96); text-align:center;">
      <button type="button" data-role="close-direct-manifest" style="position:absolute; top:12px; right:12px; width:36px; height:36px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:inherit; cursor:pointer;">x</button>
      <p style="margin:0 0 10px; color:rgba(222, 229, 246, 0.82); letter-spacing:0.08em; text-transform:uppercase; font-size:0.82rem;">Manifestation Complete</p>
      <h2 style="margin:0 0 10px; font-size:clamp(2rem, 6vw, 3.6rem); line-height:1; text-transform:uppercase;">${rolledName}</h2>
      <p style="margin:0 0 18px; color:rgba(212, 219, 236, 0.82);">${isCrystalUpgrade ? `Crystal upgrade to ${String(manifestCompleteModal?.targetRarity ?? "higher rarity")}` : `${rarity} reality manifested successfully.`}</p>
      <div style="margin:0 auto 20px; width:min(100%, 420px); min-height:42px; display:grid; place-items:center; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:#131c31; font-size:1.1rem; font-weight:700;">${isCrystalUpgrade ? `${String(manifestCompleteModal?.sourceRarity ?? "")}${manifestCompleteModal?.targetRarity ? ` -> ${String(manifestCompleteModal.targetRarity)}` : ""}` : `${Math.round(quality)}% quality`}</div>
      <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
        <button type="button" data-role="close-direct-manifest" style="padding:10px 16px; border-radius:12px; border:1px solid rgba(141, 214, 255, 0.22); background:rgba(255,255,255,0.04); color:inherit; cursor:pointer; text-transform:uppercase; letter-spacing:0.06em; font-weight:700;">Continue</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest('[data-role="close-direct-manifest"]')) {
      closeDirectManifestPopup();
    }
  });

  document.body.append(modal);
}

function scheduleManifestModalVerification(manifestCompleteModal) {
  const animationToken = String(manifestCompleteModal?.animationToken ?? "");
  if (!animationToken) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const modal = document.querySelector("#manifest-complete-modal");
      if (modal) {
        return;
      }

      reportError("Manifest popup did not mount. Retrying.", null);
      renderer.setTransientUi({ manifestCompleteModal }, getCurrentState());

      window.requestAnimationFrame(() => {
        if (!document.querySelector("#manifest-complete-modal")) {
          reportError("Manifest popup retry failed.", null);
          showDirectManifestPopup(manifestCompleteModal);
        }
      });
    });
  });
}

function showAdjacencyPulse(payload) {
  if (adjacencyPulseTimer) {
    window.clearTimeout(adjacencyPulseTimer);
  }
  renderer.setTransientUi({ adjacencyPulse: payload }, getCurrentState());
  adjacencyPulseTimer = window.setTimeout(() => {
    renderer.setTransientUi({ adjacencyPulse: null }, getCurrentState());
  }, 1800);
}

function showFocusCeremony(focusId) {
  if (focusCeremonyTimer) {
    window.clearTimeout(focusCeremonyTimer);
  }
  renderer.setTransientUi({ focusCeremony: { focusId, startedAt: Date.now() } }, getCurrentState());
  focusCeremonyTimer = window.setTimeout(() => {
    renderer.setTransientUi({ focusCeremony: null }, getCurrentState());
  }, 1800);
}

function recordLastPlacement(payload) {
  renderer.setTransientUi({ lastPlacement: payload }, getCurrentState());
}

function setSelectedBuildingAndCell(state, buildingId) {
  state.ui.selectedBuildingId = buildingId;
  const building = state.buildings.find((entry) => entry.id === buildingId);
  state.ui.selectedMapCell = building?.mapPosition
    ? { q: building.mapPosition.q, r: building.mapPosition.r }
    : null;
}

async function handleManifest() {
  if (manifestInProgress) {
    return;
  }
  manifestInProgress = true;
  if (manifestCompleteTimer) {
    window.clearTimeout(manifestCompleteTimer);
    manifestCompleteTimer = null;
  }
  renderer.setTransientUi(
    {
      manifestInProgress: true,
      manifestCompleteModal: null
    },
    getCurrentState()
  );

  const state = getCurrentState();
  const quickManifestationsEnabled = state.settings?.quickManifestations === true;
  try {
    const result = commit((draft) => {
      const manifestResult = manifestSelectedRarity(draft, draft.selectedRarity);
      if (manifestResult.ok) {
        draft.ui.lastManifestResult = manifestResult;
        if (manifestResult.building?.id) {
          setSelectedBuildingAndCell(draft, manifestResult.building.id);
        } else {
          // Upgrade rolls no longer create a building, so clear any stale forge/map selection.
          draft.ui.selectedBuildingId = null;
          draft.ui.selectedMapCell = null;
        }
      }
      return manifestResult;
    });

    if (!result.ok) {
      reportError(result.reason);
      return;
    }

    renderer.setTransientUi(
      {
        manifestInProgress: true,
        manifestCompleteModal: null
      },
      getCurrentState()
    );
    const manifestCompleteModal = {
      animationToken: `manifest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rolledName: result.isCrystalUpgrade ? `${result.targetRarity} Crystal` : result.rolledName,
      rarity: result.rarity,
      buildingId: result.building?.id ?? null,
      isCrystalUpgrade: Boolean(result.isCrystalUpgrade),
      sourceRarity: result.sourceRarity ?? result.rarity,
      targetRarity: result.targetRarity ?? null,
      qualityRoll: result.qualityRoll,
      wasNew: Boolean(result.wasNew),
      previousQuality: result.previousQuality ?? 0,
      finalQuality: result.finalQuality ?? result.building?.quality ?? null,
      crossedActivation: Boolean(result.crossedActivation),
      durationMs: quickManifestationsEnabled ? 0 : 4200,
      revealPercent: !quickManifestationsEnabled,
      showPercentImmediately: quickManifestationsEnabled
    };
    renderer.setTransientUi(
      {
        manifestInProgress: false,
        manifestCompleteModal
      },
      getCurrentState()
    );
    scheduleManifestModalVerification(manifestCompleteModal);
    if (!quickManifestationsEnabled) {
      void audioEngine.playManifest(result.rarity).catch(() => {});
      void animationEngine.playManifestReveal(result).catch(() => {});
    }
    if (result.building?.id) {
      markRecentBuildingChanges([result.building.id]);
      reportSuccess(`${result.rolledName} manifested.`);
    } else if (result.isCrystalUpgrade) {
      reportSuccess(`${result.sourceRarity} crystal upgraded to ${result.targetRarity}.`);
    }
  } finally {
    manifestInProgress = false;
    if (!renderer.transientUi.manifestCompleteModal) {
      renderer.setTransientUi({ manifestInProgress: false }, getCurrentState());
    }
  }
}

function adjustCrystal({ mode, rarity, amount }) {
  commit((draft) => {
    if (mode === "add") addCrystals(draft, rarity, amount);
    if (mode === "remove") addCrystals(draft, rarity, -amount);
    if (mode === "set") setCrystals(draft, rarity, amount);
  });
  reportSuccess(`Updated ${rarity} crystals.`);
}

function grantCrystalPack(packId) {
  const pack = GM_QUICK_CRYSTAL_PACKS.find((entry) => entry.id === packId);
  if (!pack) {
    reportError("Crystal pack not found.");
    return;
  }

  commit((draft) => {
    for (const [rarity, amount] of Object.entries(pack.crystals ?? {})) {
      addCrystals(draft, rarity, Number(amount) || 0);
    }
    for (const [rarity, amount] of Object.entries(pack.shards ?? {})) {
      addShards(draft, rarity, Number(amount) || 0);
    }
  });
  reportSuccess(`${pack.label} granted.`);
}

function adjustShard({ mode, rarity, amount }) {
  commit((draft) => {
    if (mode === "add") addShards(draft, rarity, amount);
    if (mode === "remove") addShards(draft, rarity, -amount);
    if (mode === "set") setShards(draft, rarity, amount);
  });
  reportSuccess(`Updated ${rarity} shards.`);
}

function setResources(nextResources) {
  const currentState = getCurrentState();
  const desiredGoods = Number(nextResources.goods);
  commit((draft) => {
    draft.resources.gold = Math.max(0, Number(nextResources.gold));
    draft.resources.food = Math.max(0, Number(nextResources.food));
    draft.resources.materials = Math.max(0, Number(nextResources.materials));
    draft.resources.salvage = Math.max(0, Number(nextResources.salvage ?? draft.resources.salvage ?? 0));
    draft.resources.mana = Math.max(0, Number(nextResources.mana));
    draft.resources.prosperity = Math.max(0, Number(nextResources.prosperity));
    if (Number.isFinite(desiredGoods)) {
      const currentOverride = Number(currentState.adminOverrides?.goods ?? 0);
      const currentBaseGoods = Math.max(0, Number(currentState.cityStats?.goods ?? 0) - currentOverride);
      draft.adminOverrides.goods = desiredGoods - currentBaseGoods;
    }
  });
  markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
  reportSuccess("Resources updated.");
}

function citizenCommand({ mode, citizenClass, amount }) {
  if (mode === "add") {
    commit((draft) => addCitizens(draft, citizenClass, amount));
  }
  if (mode === "remove") {
    commit((draft) => removeCitizens(draft, citizenClass, amount));
  }
  if (mode === "set") {
    commit((draft) => setCitizens(draft, citizenClass, amount));
  }
  markRecentCitizenChanges([citizenClass]);
  reportSuccess(`Citizen change applied to ${citizenClass}.`);
}

function moveCitizens({ mode, fromClass, toClass, amount }) {
  commit((draft) => promoteCitizens(draft, fromClass, toClass, amount, "Admin", mode === "promote" ? "promoted" : "demoted"));
  markRecentCitizenChanges([fromClass, toClass]);
  reportSuccess(`${mode === "promote" ? "Promotion" : "Demotion"} applied.`);
}

function bulkCitizens(nextBulk) {
  commit((draft) => applyCitizenBulkSet(draft, nextBulk));
  markRecentCitizenChanges(Object.keys(nextBulk ?? {}));
  reportSuccess("Bulk citizen update applied.");
}

function spawnBuilding({ name, rarity, quality, catalogEntry }) {
  if (!name.trim()) {
    reportError("Building name is required.");
    return;
  }

  const result = commit((draft) => {
    const nextCatalogEntry = ensureCatalogEntry(
      draft,
      catalogEntry ?? createCatalogEntryFromInput({ name, rarity, district: "", tags: [], iconKey: "", specialEffect: "" })
    );
    if (!draft.rollTables[rarity].includes(name)) {
      draft.rollTables[rarity].push(name);
      }
      const timestamps = { date: formatDate(draft.calendar.dayOffset), dayOffset: draft.calendar.dayOffset };
      const spawnResult = manifestIntoBuilding(draft, nextCatalogEntry, Math.max(0, Number(quality)), timestamps);
      setSelectedBuildingAndCell(draft, spawnResult.building.id);
      return spawnResult;
    });
  markRecentBuildingChanges([result?.building?.id]);
  reportSuccess(`${name} spawned.`);
}

function manifestUnmanifestedBuilding({ selection, quality }) {
  const [rarity, ...nameParts] = String(selection ?? "").split("::");
  const name = nameParts.join("::").trim();

  if (!rarity || !name) {
    reportError("Choose an unmanifested building first.");
    return;
  }

  const result = commit((draft) => {
      const alreadyExists = draft.buildings.some((building) => building.name === name && building.rarity === rarity);
      if (alreadyExists) {
        throw new Error("That building is already manifested.");
    }

    const catalogEntry = draft.buildingCatalog[getCatalogKey(name, rarity)];
    if (!catalogEntry) {
      throw new Error("Building catalog entry not found.");
    }

      const timestamps = { date: formatDate(draft.calendar.dayOffset), dayOffset: draft.calendar.dayOffset };
      const manifestResult = manifestIntoBuilding(draft, catalogEntry, Math.max(1, Math.min(350, Number(quality) || 100)), timestamps);
      setSelectedBuildingAndCell(draft, manifestResult.building.id);
      return manifestResult;
    });
  markRecentBuildingChanges([result?.building?.id]);
  reportSuccess(`${name} manifested at ${Math.max(1, Math.min(350, Number(quality) || 100))}% quality.`);
}

function editBuilding({ buildingId, quality, district, iconKey, imagePath, tags, specialEffect, stats, resourceRates }) {
  commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    if (!building) {
      throw new Error("Building not found.");
    }
    setBuildingQuality(building, quality);
    building.district = district;
    building.iconKey = iconKey;
    building.imagePath = imagePath;
    building.tags = tags;
    building.specialEffect = specialEffect;
    if (stats) {
      building.stats = stats;
    }
    if (resourceRates) {
      building.resourceRates = resourceRates;
    }
    const catalogKey = getCatalogKey(building.name, building.rarity);
    draft.buildingCatalog[catalogKey] = {
      ...(draft.buildingCatalog[catalogKey] ?? {}),
      name: building.name,
      displayName: building.displayName,
      rarity: building.rarity,
      key: catalogKey,
      district,
      iconKey,
      imagePath,
      tags,
      specialEffect,
      statOverrides: stats ?? draft.buildingCatalog[catalogKey]?.statOverrides ?? null
    };
  });
  reportSuccess("Building updated.");
}

function setBuildingQualityPercent({ buildingId, quality, source = "Admin" }) {
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    if (!building) {
      throw new Error("Building not found.");
    }
    setBuildingQuality(building, quality);
    return { name: building.displayName, quality: building.quality, source };
  });
  reportSuccess(`${result.name} set to ${formatNumber(result.quality, 1)}% quality (${result.source}).`);
}

function parseBulkBuildingImageLines(rawText) {
  const lines = String(rawText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];

  for (const line of lines) {
    if (/^building name\s*,\s*image path$/i.test(line)) {
      continue;
    }

    if (line.includes("->")) {
      const [namePart, pathPart] = line.split(/\s*->\s*/, 2);
      if (namePart && pathPart) {
        entries.push({ name: namePart.trim(), imagePath: pathPart.trim() });
      }
      continue;
    }

    if (line.includes(",")) {
      const [namePart, pathPart] = line.split(/\s*,\s*/, 2);
      if (namePart && pathPart) {
        entries.push({ name: namePart.trim(), imagePath: pathPart.trim() });
      }
    }
  }

  return entries;
}

function normalizeBulkImageBuildingName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+\((Common|Uncommon|Rare|Epic|Legendary)\)$/i, "")
    .replace(/\s+\((Beyond)\)$/i, "")
    .replace(/^"|"$/g, "");
}

function applyBulkBuildingImages(rawText) {
  const parsed = parseBulkBuildingImageLines(rawText);
  if (!parsed.length) {
    throw new Error("No valid image path lines found.");
  }

  const applied = commit((draft) => {
    let count = 0;

    for (const entry of parsed) {
      const normalizedName = normalizeBulkImageBuildingName(entry.name);
      const imagePath = entry.imagePath;
      if (!normalizedName || !imagePath) {
        continue;
      }

      for (const building of draft.buildings) {
        if (building.name === normalizedName || building.displayName === normalizedName) {
          building.imagePath = imagePath;
          count += 1;
        }
      }

      for (const [catalogKey, catalogEntry] of Object.entries(draft.buildingCatalog)) {
        if (catalogEntry?.name === normalizedName || catalogEntry?.displayName === normalizedName) {
          draft.buildingCatalog[catalogKey] = {
            ...catalogEntry,
            imagePath
          };
          count += 1;
        }
      }
    }

    return count;
  });

  reportSuccess(`Applied image paths to ${applied} building record${applied === 1 ? "" : "s"}.`);
}

function normalizeFirebaseRealmId(realmId) {
  const normalized = String(realmId ?? "").trim();
  return normalized || FIREBASE_DEFAULT_REALM_ID;
}

function getPublishedFirebaseRealmId(state = getCurrentState()) {
  return normalizeFirebaseRealmId(state.settings.firebaseRealmId);
}

function preserveLocalSettingsOnSharedState(nextState, currentState = getCurrentState()) {
  const normalized = validateAndMigrateSave(nextState);
  normalized.settings = {
    ...normalized.settings,
    muted: currentState.settings.muted,
    audioMode: currentState.settings.audioMode,
    currentPage: pageKey,
    onboardingDismissed: currentState.settings.onboardingDismissed,
    liveSessionView: currentState.settings.liveSessionView,
    theme: "dark",
    firebaseRealmId: currentState.settings.firebaseRealmId,
    diceAmount: currentState.settings.diceAmount,
    diceType: currentState.settings.diceType,
    diceHistory: currentState.settings.diceHistory,
    lastDiceRoll: currentState.settings.lastDiceRoll
  };
  normalized.ui = {
    ...normalized.ui,
    adminUnlocked: currentState.ui.adminUnlocked,
    adminOpen: false
  };
  return normalized;
}

async function loadSharedStateFromFirebase(realmId) {
  const payload = await loadFirebaseRealmState(normalizeFirebaseRealmId(realmId));
  if (!payload?.state) {
    throw new Error("No shared Firebase realm state found yet.");
  }
  updateFirebasePublishedMeta(payload, "connected");
  return preserveLocalSettingsOnSharedState(payload.state);
}

async function ensureLatestAppVersionBeforeFirebaseWrite(targetRealmId, state = getCurrentState()) {
  const normalizedTargetRealmId = normalizeFirebaseRealmId(targetRealmId);
  const realmIdsToCheck = [...new Set([getPublishedFirebaseRealmId(state), normalizedTargetRealmId])];
  let newestRemoteVersion = null;

  for (const realmId of realmIdsToCheck) {
    const payload = await loadFirebaseRealmState(realmId);
    const remoteVersion = String(payload?.appVersion ?? "").trim();
    if (!remoteVersion) {
      continue;
    }
    if (!newestRemoteVersion || compareAppVersions(remoteVersion, newestRemoteVersion) > 0) {
      newestRemoteVersion = remoteVersion;
    }
  }

  if (newestRemoteVersion && compareAppVersions(APP_VERSION, newestRemoteVersion) < 0) {
    throw new Error(`Firebase write blocked. This app build (${APP_VERSION}) is older than the shared Firebase build (${newestRemoteVersion}). Refresh to the latest version before saving or publishing.`);
  }
}

async function publishSharedStateToFirebase(realmId, state = getCurrentState()) {
  await ensureLatestAppVersionBeforeFirebaseWrite(realmId, state);
  const serializable = createSerializableState(state);
  serializable.ui = {
    ...serializable.ui,
    adminUnlocked: false,
    adminOpen: false
  };
  await saveFirebaseRealmState(realmId, serializable, firebaseClientId, APP_VERSION);
  updateFirebasePublishedMeta(
    {
      updatedAtMs: Date.now(),
      updatedBy: getFirebaseUserId(),
      appVersion: APP_VERSION
    },
    "connected"
  );
}

function scheduleFirebaseAutoPublish(state) {
  return state;
}

async function publishManifestIfEnabled() {
  return null;
}

function moveBuildingOnMap({ buildingId, q, r, source = "Player" }) {
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    const previousPosition = building?.mapPosition ? { ...building.mapPosition } : null;
    const beforeBonus = building ? getBuildingPlacementBonuses(draft, building).totalPercent : 0;
    const placementResult = setBuildingPlacement(draft, buildingId, Number(q), Number(r), source);
    if (placementResult.ok) {
      draft.ui.selectedBuildingId = buildingId;
      draft.ui.selectedMapCell = { q: Number(q), r: Number(r) };
      placementResult.previousPosition = previousPosition;
      placementResult.resonanceGain =
        getBuildingPlacementBonuses(draft, placementResult.building).totalPercent - beforeBonus;
    }
    return placementResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return result;
  }

  playEffect(result.previousPosition ? "move" : "placement");
  reportSuccess(getPlacementSuccessMessage(result.building, q, r, result.resonanceGain ?? 0));
  recordLastPlacement({
    buildingId: result.building.id,
    from: result.previousPosition ?? null,
    to: { q: Number(q), r: Number(r) }
  });
  showMapPlacementPulse(q, r, result.building);
  advanceMapPlannerAfterPlacement(result.building.id);
  if ((result.resonanceGain ?? 0) > 0) {
    showAdjacencyPulse({
      buildingId: result.building.id,
      q: Number(q),
      r: Number(r),
      gain: result.resonanceGain,
      total: getBuildingPlacementBonuses(getCurrentState(), result.building).totalPercent
    });
  }
  return result;
}

function forceMoveBuildingOnMap({ buildingId, q, r, source = "Admin" }) {
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    const previousPosition = building?.mapPosition ? { ...building.mapPosition } : null;
    const beforeBonus = building ? getBuildingPlacementBonuses(draft, building).totalPercent : 0;
    const placementResult = forceSetBuildingPlacement(draft, buildingId, Number(q), Number(r), source);
    if (placementResult.ok) {
      draft.ui.selectedBuildingId = buildingId;
      draft.ui.selectedMapCell = { q: Number(q), r: Number(r) };
      placementResult.previousPosition = previousPosition;
      placementResult.resonanceGain =
        getBuildingPlacementBonuses(draft, placementResult.building).totalPercent - beforeBonus;
    }
    return placementResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return result;
  }

  playEffect(result.previousPosition ? "move" : "placement");
  if (result.displacedBuilding) {
    reportSuccess(
      `${getBuildingEmoji(result.building)} ${result.building.displayName} seized hex ${q}, ${r}. ${result.displacedBuilding.displayName} was cleared.`
    );
    recordLastPlacement({
      buildingId: result.building.id,
      from: result.previousPosition ?? null,
      to: { q: Number(q), r: Number(r) }
    });
    showMapPlacementPulse(q, r, result.building);
    advanceMapPlannerAfterPlacement(result.building.id);
    if ((result.resonanceGain ?? 0) > 0) {
      showAdjacencyPulse({
        buildingId: result.building.id,
        q: Number(q),
        r: Number(r),
        gain: result.resonanceGain,
        total: getBuildingPlacementBonuses(getCurrentState(), result.building).totalPercent
      });
    }
    return result;
  }

  reportSuccess(getPlacementSuccessMessage(result.building, q, r, result.resonanceGain ?? 0));
  recordLastPlacement({
    buildingId: result.building.id,
    from: result.previousPosition ?? null,
    to: { q: Number(q), r: Number(r) }
  });
  showMapPlacementPulse(q, r, result.building);
  advanceMapPlannerAfterPlacement(result.building.id);
  if ((result.resonanceGain ?? 0) > 0) {
    showAdjacencyPulse({
      buildingId: result.building.id,
      q: Number(q),
      r: Number(r),
      gain: result.resonanceGain,
      total: getBuildingPlacementBonuses(getCurrentState(), result.building).totalPercent
    });
  }
  return result;
}

function clearPlacement(buildingId, source = "Player") {
  const currentBuilding = getCurrentState().buildings.find((entry) => entry.id === buildingId);
  const previousPosition = currentBuilding?.mapPosition ? { ...currentBuilding.mapPosition } : null;
  const result = commit((draft) => {
    const clearResult = clearBuildingPlacement(draft, buildingId, source);
    if (clearResult.ok) {
      draft.ui.selectedMapCell = null;
    }
    return clearResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return result;
  }

  playEffect("move");
  reportSuccess(`${result.building.displayName} cleared from the map.`);
  if (previousPosition) {
    recordLastPlacement({
      buildingId: result.building.id,
      from: previousPosition,
      to: null
    });
  }
  if (renderer.transientUi.mapPlannerBuildingId === result.building.id) {
    clearMapPlanner();
  }
  return result;
}

function undoLastPlacement() {
  const lastPlacement = renderer.transientUi.lastPlacement;
  if (!lastPlacement?.buildingId) {
    reportError("No recent placement is available to undo.");
    return;
  }

  const state = getCurrentState();
  const building = state.buildings.find((entry) => entry.id === lastPlacement.buildingId);
  if (!building) {
    renderer.setTransientUi({ lastPlacement: null }, state);
    reportError("That building no longer exists.");
    return;
  }

  if (lastPlacement.from) {
    const occupant = getBuildingAtCell(state, lastPlacement.from.q, lastPlacement.from.r);
    if (occupant && occupant.id !== building.id) {
      reportError("Cannot undo that move because the previous hex is now occupied.");
      return;
    }

    const result = commit((draft) => {
      const placementResult = setBuildingPlacement(
        draft,
        building.id,
        Number(lastPlacement.from.q),
        Number(lastPlacement.from.r),
        "Undo"
      );
      if (placementResult.ok) {
        draft.ui.selectedBuildingId = building.id;
        draft.ui.selectedMapCell = { q: Number(lastPlacement.from.q), r: Number(lastPlacement.from.r) };
      }
      return placementResult;
    });

    if (!result.ok) {
      reportError(result.reason);
      return;
    }

    renderer.setTransientUi({ lastPlacement: null }, getCurrentState());
    reportSuccess(`${result.building.displayName} returned to hex ${lastPlacement.from.q}, ${lastPlacement.from.r}.`);
    return;
  }

  const result = clearPlacement(building.id, "Undo");
  if (!result?.ok) {
    return;
  }
  renderer.setTransientUi({ lastPlacement: null }, getCurrentState());
}

function reprioritizeConstruction(buildingId, direction) {
  const result = commit((draft) => moveConstructionPriority(draft, buildingId, direction));
  if (!result.ok) {
    reportError(result.reason);
    return;
  }
  if (!result.moved) {
    reportSuccess("Construction priority unchanged.");
    return;
  }

  const building = getCurrentState().buildings.find((entry) => entry.id === buildingId);
  reportSuccess(`${building?.displayName ?? "Building"} priority updated.`);
}

function setConstructionActiveState(buildingId, shouldActivate) {
  const result = commit((draft) => (shouldActivate ? activateConstruction(draft, buildingId) : pauseConstruction(draft, buildingId)));
  if (!result.ok) {
    reportError(result.reason);
    return;
  }
  if (result.changed === false) {
    reportSuccess("Incubation state unchanged.");
    return;
  }

  markRecentBuildingChanges([buildingId]);
  const building = getCurrentState().buildings.find((entry) => entry.id === buildingId);
  reportSuccess(`${building?.displayName ?? "Building"} ${shouldActivate ? "assigned to an incubator" : "removed from active incubation"}.`);
}

function setIncubatorSupportState(buildingId, supportKey, enabled) {
  const label = supportKey === "heroSupport" ? "Hero Support" : "Expert Support";
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    if (!building) {
      return { ok: false, reason: "Building not found." };
    }
    if (!building.isConstructing) {
      return { ok: false, reason: `${building.displayName} is not assigned to an incubator.` };
    }

    const nextEnabled = Boolean(enabled);
    if (building[supportKey] === nextEnabled) {
      return { ok: true, changed: false, name: building.displayName };
    }

    building[supportKey] = nextEnabled;
    return { ok: true, changed: true, name: building.displayName };
  });

  if (!result.ok) {
    reportError(result.reason);
    return;
  }
  if (result.changed === false) {
    reportSuccess(`${label} unchanged.`);
    return;
  }

  markRecentBuildingChanges([buildingId]);
  reportSuccess(`${label} ${enabled ? "enabled" : "disabled"} for ${result.name}.`);
}

function manifestBuildingNow(buildingId) {
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    if (!building) {
      return { ok: false, reason: "Building not found." };
    }
    if (building.isComplete) {
      return { ok: false, reason: `${building.displayName} is already manifested.` };
    }

    building.lastManifestedAt = formatDate(draft.calendar.dayOffset);
    building.lastManifestedDayOffset = draft.calendar.dayOffset;
    setBuildingQuality(building, BUILDING_ACTIVE_THRESHOLD);

    return { ok: true, buildingId: building.id, name: building.displayName };
  });

  if (!result.ok) {
    reportError(result.reason);
    return;
  }

  markRecentBuildingChanges([result.buildingId]);
  reportSuccess(`${result.name} manifested instantly.`);
}

function manageRollTable({ mode, name, rarity, targetRarity, nextName, catalogEntry }) {
  commit((draft) => {
    const sourceKey = getCatalogKey(name, rarity);
    if (mode === "add") {
      ensureCatalogEntry(draft, catalogEntry);
      if (!draft.rollTables[rarity].includes(name)) {
        draft.rollTables[rarity].push(name);
      }
    }

    if (mode === "remove") {
      draft.rollTables[rarity] = draft.rollTables[rarity].filter((entry) => entry !== name);
    }

    if (mode === "move") {
      draft.rollTables[rarity] = draft.rollTables[rarity].filter((entry) => entry !== name);
      if (!draft.rollTables[targetRarity].includes(name)) {
        draft.rollTables[targetRarity].push(name);
      }
      const existingCatalog = draft.buildingCatalog[sourceKey];
      if (existingCatalog) {
        const movedEntry = { ...existingCatalog, rarity: targetRarity, key: getCatalogKey(name, targetRarity) };
        delete draft.buildingCatalog[sourceKey];
        draft.buildingCatalog[movedEntry.key] = movedEntry;
      }
      for (const building of draft.buildings) {
        if (building.key === sourceKey) {
          building.rarity = targetRarity;
          building.key = getCatalogKey(building.name, targetRarity);
        }
      }
    }

    if (mode === "rename") {
      const replacementName = nextName.trim();
      if (!replacementName) {
        throw new Error("Replacement building name is required.");
      }
      for (const currentRarity of RARITY_ORDER) {
        draft.rollTables[currentRarity] = draft.rollTables[currentRarity].map((entry) => (entry === name ? replacementName : entry));
      }
      const existingCatalog = draft.buildingCatalog[sourceKey];
      if (existingCatalog) {
        delete draft.buildingCatalog[sourceKey];
        draft.buildingCatalog[getCatalogKey(replacementName, rarity)] = {
          ...existingCatalog,
          key: getCatalogKey(replacementName, rarity),
          name: replacementName,
          displayName: replacementName
        };
      }
      for (const building of draft.buildings) {
        if (building.name === name && building.rarity === rarity) {
          building.name = replacementName;
          building.displayName = replacementName;
          building.key = getCatalogKey(replacementName, rarity);
        }
      }
    }
  });

  reportSuccess("Roll table updated.");
}

const actions = {
  openAdmin() {
    commit((draft) => {
      draft.ui.adminOpen = true;
      draft.ui.adminUnlocked = true;
    });
  },
  openCatalog() {
    renderer.setTransientUi({ catalogOpen: true }, getCurrentState());
  },
  openTownFocusModal() {
    openTownFocusModal();
  },
  closeAdmin() {
    commit((draft) => {
      draft.ui.adminOpen = false;
    });
  },
  selectBuilding(buildingId) {
    commit((draft) => {
      setSelectedBuildingAndCell(draft, buildingId);
    });
  },
  dismissOnboarding() {
    commit((draft) => {
      draft.settings.onboardingDismissed = true;
    });
    reportSuccess("Guide dismissed.");
  },
  showOnboarding() {
    commit((draft) => {
      draft.settings.onboardingDismissed = false;
    });
    reportSuccess("Guide restored.");
  },
  chooseTownFocus(focusId) {
    const result = commit((draft) => {
      if (!draft.townFocus.isSelectionPending) {
        return { ok: false, reason: "The council cannot change focus yet." };
      }
      return selectTownFocus(draft, focusId, "Council");
    });
    if (!result.ok) {
      reportError(result.reason);
      return;
    }
    renderer.setTransientUi({ councilModalOpen: false }, getCurrentState());
    showFocusCeremony(focusId);
    reportSuccess(`${result.focus.name} is now the town focus.`);
  },
  setTownFocus(focusId) {
    const result = commit((draft) => forceTownFocus(draft, focusId, "Admin"));
    if (!result.ok) {
      reportError(result.reason);
      return;
    }
    reportSuccess(`${result.focus.name} force-selected.`);
  },
  reopenTownFocus() {
    commit((draft) => reopenTownFocusSelection(draft, "Admin"));
    openTownFocusModal();
    reportSuccess("Town focus council reopened.");
  },
  resetGoodsOverride() {
    commit((draft) => {
      draft.adminOverrides.goods = 0;
    });
    reportSuccess("GM goods override reset.");
  },
  adjustCrystal,
  grantCrystalPack,
  toggleLiveSessionView() {
    commit((draft) => {
      draft.settings.liveSessionView = !draft.settings.liveSessionView;
    });
    reportSuccess(`Live session view ${getCurrentState().settings.liveSessionView ? "enabled" : "disabled"}.`);
  },
  saveDriftEvolutionStage({ stageId, patch }) {
    commit((draft) => {
      setDriftEvolutionStageOverride(draft, stageId, patch);
    });
    reportSuccess("Drift evolution stage updated.");
  },
  createSessionSnapshot(name = "Session Snapshot") {
    commit((draft) => {
      draft.sessionSnapshots = [createSessionSnapshotRecord(draft, name), ...(draft.sessionSnapshots ?? [])].slice(0, 8);
      addHistoryEntry(draft, {
        category: "Snapshot",
        title: name,
        details: "A session snapshot was saved for later restoration."
      });
    });
    reportSuccess("Session snapshot saved.");
  },
  restoreSessionSnapshot(snapshotId) {
    const state = getCurrentState();
    const snapshot = (state.sessionSnapshots ?? []).find((entry) => entry.id === snapshotId);
    if (!snapshot) {
      reportError("Snapshot not found.");
      return;
    }
    const restored = restoreSessionSnapshot(snapshot);
    restored.sessionSnapshots = state.sessionSnapshots;
    restored.settings.currentPage = pageKey;
    gameState.replace(restored);
    resetTransientUi();
    markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess(`Restored snapshot "${snapshot.name}".`);
  },
  deleteSessionSnapshot(snapshotId) {
    commit((draft) => {
      draft.sessionSnapshots = (draft.sessionSnapshots ?? []).filter((entry) => entry.id !== snapshotId);
    });
    reportSuccess("Session snapshot deleted.");
  },
  saveMapPreset() {
    const state = getCurrentState();
    const nextIndex = (state.settings.mapPresets?.length ?? 0) + 1;
    const name = `Layout ${nextIndex}`;
    commit((draft) => {
      const preset = createMapPresetRecord(draft, name);
      draft.settings.mapPresets = [preset, ...(draft.settings.mapPresets ?? [])].slice(0, 8);
      addHistoryEntry(draft, {
        category: "Placement",
        title: name,
        details: "A Town Map layout preset was saved."
      });
    });
    reportSuccess(`Saved ${name}.`);
  },
  restoreMapPreset(presetId) {
    const state = getCurrentState();
    const preset = (state.settings.mapPresets ?? []).find((entry) => entry.id === presetId);
    if (!preset) {
      reportError("Map preset not found.");
      return;
    }

    commit((draft) => {
      for (const building of draft.buildings) {
        const nextPosition = preset.placements?.[building.id];
        building.mapPosition = nextPosition ? { q: Number(nextPosition.q), r: Number(nextPosition.r) } : null;
      }
      draft.ui.selectedMapCell = null;
      addHistoryEntry(draft, {
        category: "Placement",
        title: `${preset.name} restored`,
        details: "A saved Town Map layout preset was restored."
      });
    });
    clearMapPlanner();
    renderer.setTransientUi({ validPlacementMode: false }, getCurrentState());
    reportSuccess(`Restored ${preset.name}.`);
  },
  deleteMapPreset(presetId) {
    const preset = (getCurrentState().settings.mapPresets ?? []).find((entry) => entry.id === presetId);
    commit((draft) => {
      draft.settings.mapPresets = (draft.settings.mapPresets ?? []).filter((entry) => entry.id !== presetId);
    });
    reportSuccess(`${preset?.name ?? "Map preset"} deleted.`);
  },
  autoPlaceBuildings() {
    runAutoPlaceBuildings();
  },
  adjustShard,
  setResources,
  citizenCommand,
  moveCitizens,
  resetCitizens() {
    commit((draft) => resetCitizens(draft));
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess("Citizens reset.");
  },
  bulkCitizens,
  spawnBuilding,
  manifestUnmanifestedBuilding,
  editBuilding(payload) {
    editBuilding(payload);
  },
  setBuildingQuality(payload) {
    setBuildingQualityPercent(payload);
  },
  applyBulkBuildingImages(rawText) {
    applyBulkBuildingImages(rawText);
  },
  setBuildingRuinState(buildingId, isRuined) {
    commit((draft) => {
      const building = draft.buildings.find((entry) => entry.id === buildingId);
      if (!building) {
        throw new Error("Building not found.");
      }
      setBuildingRuinState(building, isRuined, "Admin");
    });
    reportSuccess(isRuined ? "Building ruined." : "Building repaired.");
  },
  removeBuilding(buildingId) {
    commit((draft) => {
      removeBuilding(draft, buildingId);
      if (draft.ui.selectedBuildingId === buildingId) {
        draft.ui.selectedBuildingId = null;
        draft.ui.selectedMapCell = null;
      }
    });
    if (renderer.transientUi.inspectedBuildingId === buildingId) {
      renderer.setTransientUi({ inspectedBuildingId: null }, getCurrentState());
    }
    reportSuccess("Building removed.");
  },
  setBuildingPlacement({ buildingId, q, r }) {
    moveBuildingOnMap({ buildingId, q, r, source: "Admin" });
  },
  forceSetBuildingPlacement({ buildingId, q, r }) {
    forceMoveBuildingOnMap({ buildingId, q, r, source: "Admin" });
  },
  clearBuildingPlacement(buildingId) {
    clearPlacement(buildingId, "Admin");
  },
  setRollTableList,
  manageRollTable,
  saveDistrict({ districtName, definition }) {
    commit((draft) => setDistrictDefinition(draft, districtName, definition));
    reportSuccess("District saved.");
  },
  setDistrictLevel({ districtName, level }) {
    commit((draft) => setDistrictLevelOverride(draft, districtName, level));
    reportSuccess("District level override saved.");
  },
  resetDistrictLevels() {
    commit((draft) => resetDistrictLevels(draft));
    reportSuccess("District overrides cleared.");
  },
  setDate({ year, month, day }) {
    const dayOffset = dateFromParts(year, month, day);
    if (dayOffset === null) {
      reportError("Invalid date.");
      return;
    }
    commit((draft) => {
      draft.calendar.dayOffset = dayOffset;
    });
    reportSuccess("Date updated.");
  },
  setSpeedMultiplier(value) {
    commit((draft) => {
      draft.constructionSpeedMultiplier = Number(value);
    });
    reportSuccess("Construction speed updated.");
  },
  triggerEvent(eventId) {
    const eventDefinition = EVENT_POOLS.find((event) => event.id === eventId);
    if (!eventDefinition) {
      reportError("Event not found.");
      return;
    }
    commit((draft) => triggerEvent(draft, eventDefinition, "admin"));
    reportSuccess(`Triggered ${eventDefinition.name}.`, "event");
  },
  clearEvents() {
    commit((draft) => clearActiveEvents(draft));
    reportSuccess("Active events cleared.");
  },
  exportSave() {
    return exportSave(getCurrentState());
  },
  async copySaveJson() {
    const json = exportSave(getCurrentState());
    await copyTextToClipboard(json, "Save JSON copied to clipboard.");
  },
  async copyCityStatus() {
    await copyTextToClipboard(describeCityStatus(getCurrentState()), "City status copied.");
  },
  async copyActiveBuildings() {
    await copyTextToClipboard(describeActiveBuildings(getCurrentState()), "Active buildings copied.");
  },
  async copyChronicleDaySummary(dayOffset) {
    await copyTextToClipboard(describeChronicleDay(getCurrentState(), dayOffset), "Day summary copied.");
  },
  toggleBuildingPin(buildingId) {
    commit((draft) => {
      const current = new Set(draft.settings.pinnedBuildingIds ?? []);
      if (current.has(buildingId)) {
        current.delete(buildingId);
      } else {
        current.add(buildingId);
      }
      draft.settings.pinnedBuildingIds = [...current];
    });
    reportSuccess((getCurrentState().settings.pinnedBuildingIds ?? []).includes(buildingId) ? "Building pinned." : "Building unpinned.");
  },
  pauseAllConstruction() {
    const affectedIds = getCurrentState().buildings.filter((building) => !building.isComplete).map((building) => building.id);
    commit((draft) => {
      draft.activeConstructionIds = [];
      draft.pausedConstructionIds = draft.buildings.filter((building) => !building.isComplete).map((building) => building.id);
      normalizeConstructionPriority(draft);
    });
    markRecentBuildingChanges(affectedIds);
    reportSuccess("All incubation paused.");
  },
  resumeAllConstruction() {
    const affectedIds = getCurrentState().buildings.filter((building) => !building.isComplete).map((building) => building.id);
    commit((draft) => {
      draft.activeConstructionIds = draft.constructionPriority.slice(0, getDriftConstructionSlots(draft));
      draft.pausedConstructionIds = [];
      normalizeConstructionPriority(draft);
    });
    markRecentBuildingChanges(affectedIds);
    reportSuccess("All incubation resumed.");
  },
  closeTurnSummary() {
    renderer.setTransientUi({ turnSummaryModal: null }, getCurrentState());
  },
  goToProblem(problemKey) {
    if (pageKey !== "city") {
      navigateWithTransition(`./city.html?problem=${encodeURIComponent(problemKey)}`);
      return;
    }
    applyProblemFocus(problemKey);
  },
  saveManualState() {
    try {
      saveManualState(getCurrentState());
      reportSuccess("Local save updated.", "save");
    } catch (error) {
      reportError(error.message);
    }
  },
  loadManualState() {
    try {
      gameState.replace(loadManualState());
      resetTransientUi();
      markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
      markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
      reportSuccess("Local save loaded.", "load");
    } catch (error) {
      reportError(error.message);
    }
  },
  async loadFirebaseRealm() {
    try {
      const nextState = await loadSharedStateFromFirebase(getPublishedFirebaseRealmId());
      gameState.replace(nextState);
      resetTransientUi();
      markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
      markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
      reportSuccess("Firebase save loaded.", "load");
    } catch (error) {
      reportError(error.message);
    }
  },
    async setFirebasePublisherUidToCurrentBrowser() {
      try {
        const currentUid = await getCurrentFirebaseUid();
        commit((draft) => {
          draft.settings.firebasePublisherUid = currentUid;
        });
        await syncFirebaseIdentityUi();
        reportSuccess(`GM publisher UID set to ${currentUid}.`);
      } catch (error) {
        reportError(error.message);
      }
    },
    clearFirebasePublisherUid() {
      commit((draft) => {
        draft.settings.firebasePublisherUid = "";
      });
      void syncFirebaseIdentityUi();
      reportSuccess("GM publisher UID cleared.");
    },
    async saveFirebaseRealm() {
    try {
      await publishSharedStateToFirebase(getPublishedFirebaseRealmId());
      reportSuccess("Firebase save updated.", "publish");
    } catch (error) {
      reportError(error.message);
    }
  },
  resetSave() {
    gameState.replace(resetSave());
    resetTransientUi();
    markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess("Save reset.");
  },
  sessionReset() {
    gameState.replace(createLiveSessionResetState());
    resetTransientUi();
    markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess("Realm reset to the live session preset.");
  },
  testingReset() {
    gameState.replace(createTestingBalanceResetState());
    resetTransientUi();
    markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess("Realm reset to the testing balance preset.");
  },
  clearBuildings() {
    commit((draft) => {
      draft.buildings = [];
      draft.constructionPriority = [];
      draft.ui.selectedBuildingId = null;
      draft.ui.selectedMapCell = null;
      draft.ui.lastManifestResult = null;
    });
    resetTransientUi();
    reportSuccess("All buildings deleted.");
  },
  fullReset() {
    gameState.replace(createSingleCommonCrystalResetState());
    resetTransientUi();
    markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
    markRecentCitizenChanges(Object.keys(getCurrentState().citizens ?? {}));
    reportSuccess("Realm fully reset. You now begin with 1 Common crystal.");
  },
  reportError
};

const adminConsole = new AdminConsole(actions);

gameState.subscribe((state) => {
  saveGameState(state);
  audioEngine.setMuted(state.settings.muted);
  audioEngine.setPage(pageKey);
  document.body.dataset.theme = state.settings.theme ?? "dark";
  renderer.render(state);
  applyMapViewPreview();
  adminConsole.render(state);
});

window.addEventListener("pagehide", () => {
  saveGameState(getCurrentState());
});

document.addEventListener(
  "pointerdown",
  () => {
    void audioEngine.unlock();
  },
  { once: true }
);

document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[href]");
  if (!anchor) {
    return;
  }
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  if (!isInternalPageLink(anchor)) {
    return;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.href === window.location.href) {
    return;
  }
  event.preventDefault();
  navigateWithTransition(url.href);
});

if (pageKey === "player") {
  ["mousemove", "pointermove", "touchstart", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      revealProjectorChrome();
    });
  });
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
}

function clearNavigationShortcutTimer() {
  if (navigationShortcutTimer) {
    window.clearTimeout(navigationShortcutTimer);
    navigationShortcutTimer = null;
  }
}

// The hidden admin code uses the same number keys as page shortcuts, so let
// possible 432! prefixes wait briefly before navigating away.
function getAdminUnlockPrefix(buffer) {
  const code = "432!";
  for (let length = Math.min(buffer.length, code.length); length > 0; length -= 1) {
    const suffix = buffer.slice(-length);
    if (code.startsWith(suffix)) {
      return suffix;
    }
  }
  return "";
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (isTypingTarget(event.target)) {
    return;
  }

  const key = event.key;
  const shortcuts = {
    "1": "./gm.html",
    "2": "./forge.html",
    "3": "./city.html",
    "4": "./citizens.html",
    "5": "./chronicle.html"
  };
  const isAdminCodeKey = key.length === 1 && /[0-9!]/.test(key);

  if (isAdminCodeKey) {
    navigationShortcutBuffer = `${navigationShortcutBuffer}${key}`.slice(-4);
  } else {
    navigationShortcutBuffer = "";
    clearNavigationShortcutTimer();
  }

  const adminUnlockPrefix = getAdminUnlockPrefix(navigationShortcutBuffer);

  if (!shortcuts[key]) {
    if (navigationShortcutBuffer === "432!") {
      clearNavigationShortcutTimer();
      navigationShortcutBuffer = "";
    } else if (!adminUnlockPrefix) {
      clearNavigationShortcutTimer();
    }
    return;
  }

  if (["2", "3", "4"].includes(key) && adminUnlockPrefix) {
    event.preventDefault();
    clearNavigationShortcutTimer();
    const pendingKey = key;
    const pendingPrefix = adminUnlockPrefix;
    navigationShortcutTimer = window.setTimeout(() => {
      if (navigationShortcutBuffer === pendingPrefix) {
        navigationShortcutBuffer = "";
        navigateWithTransition(shortcuts[pendingKey]);
      }
      clearNavigationShortcutTimer();
    }, 360);
    return;
  }

  event.preventDefault();
  clearNavigationShortcutTimer();
  navigationShortcutBuffer = "";
  navigateWithTransition(shortcuts[key]);
});

root.addEventListener("click", async (event) => {
  if (suppressNextMapClick && event.target.closest(".hex-map__cell")) {
    suppressNextMapClick = false;
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  switch (action) {
    case "select-rarity":
      commit((draft) => {
        draft.selectedRarity = target.dataset.rarity;
      });
      break;
    case "manifest":
      await handleManifest();
      break;
    case "toggle-quick-manifest":
      commit((draft) => {
        draft.settings.quickManifestations = draft.settings.quickManifestations !== true;
      });
      break;
    case "advance-time": {
      const previousState = structuredClone(getCurrentState());
      const result = commit((draft) => advanceTime(draft, target.dataset.step));
      const nextState = getCurrentState();
      const turnSummary = createTurnSummary(previousState, nextState, result.days);
      markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
      renderer.setTransientUi({ turnSummaryModal: turnSummary }, nextState);
      playTurnAdvanceEffect(previousState, nextState, turnSummary);
      reportSuccess(`Advanced ${result.days} days.`);
      break;
    }
    case "advance-custom-time": {
      const panel = target.closest(".calendar-panel, .city-workspace, .city-admin-view, .panel");
      const input = panel?.querySelector('[data-role="custom-days"]') ?? root.querySelector('[data-role="custom-days"]');
      const days = Math.max(1, Math.floor(Number(input?.value) || 0));
      const previousState = structuredClone(getCurrentState());
      const result = commit((draft) => advanceTimeByDays(draft, days));
      const nextState = getCurrentState();
      const turnSummary = createTurnSummary(previousState, nextState, result.days);
      markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
      renderer.setTransientUi({ turnSummaryModal: turnSummary }, nextState);
      playTurnAdvanceEffect(previousState, nextState, turnSummary);
      reportSuccess(`Advanced ${result.days} days.`);
      break;
    }
    case "advance-selected-time": {
      const panel = target.closest(".calendar-panel, .city-workspace, .city-admin-view, .panel");
      const input = panel?.querySelector('[data-role="advance-days-preset"]') ?? root.querySelector('[data-role="advance-days-preset"]');
      const days = Math.max(1, Math.floor(Number(input?.value) || 0));
      const previousState = structuredClone(getCurrentState());
      const result = commit((draft) => advanceTimeByDays(draft, days));
      const nextState = getCurrentState();
      const turnSummary = createTurnSummary(previousState, nextState, result.days);
      markRecentResourceChanges(["gold", "food", "materials", "salvage", "mana", "prosperity"]);
      renderer.setTransientUi({ turnSummaryModal: turnSummary }, nextState);
      playTurnAdvanceEffect(previousState, nextState, turnSummary);
      reportSuccess(`Advanced ${result.days} days.`);
      break;
    }
    case "select-building":
      commit((draft) => {
        setSelectedBuildingAndCell(draft, target.dataset.buildingId);
      });
      break;
    case "inspect-building":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ inspectedBuildingId: target.dataset.buildingId }, getCurrentState());
      break;
    case "remove-building":
      void audioEngine.playUiAccent("soft");
      actions.removeBuilding(target.dataset.buildingId);
      break;
    case "open-catalog":
      void audioEngine.playUiAccent("soft");
      actions.openCatalog();
      break;
    case "open-town-focus-modal":
      void audioEngine.playUiAccent("soft");
      actions.openTownFocusModal();
      break;
    case "set-home-shelf":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ homeShelfTab: target.dataset.shelf }, getCurrentState());
      break;
    case "set-city-view":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ cityView: target.dataset.view }, getCurrentState());
      break;
    case "set-city-mode":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ cityMode: target.dataset.view }, getCurrentState());
      break;
    case "set-city-building-view":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ cityBuildingView: target.dataset.view }, getCurrentState());
      break;
    case "set-map-placement-filter":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ mapPlacementFilter: target.dataset.filter ?? "All" }, getCurrentState());
      break;
    case "set-map-overlay":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ mapOverlay: target.dataset.overlay ?? "District" }, getCurrentState());
      break;
    case "toggle-map-legend":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ mapLegendOpen: !renderer.transientUi.mapLegendOpen }, getCurrentState());
      break;
    case "toggle-valid-placement-mode":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ validPlacementMode: !renderer.transientUi.validPlacementMode }, getCurrentState());
      break;
    case "arm-map-building":
      void audioEngine.playUiAccent("soft");
      setMapPlannerBuilding(target.dataset.buildingId, "chain", "Placement planner armed.");
      break;
    case "clear-map-planner":
      void audioEngine.playUiAccent("soft");
      clearMapPlanner();
      reportSuccess("Placement planner cleared.");
      break;
    case "move-map-building":
      void audioEngine.playUiAccent("soft");
      setMapPlannerBuilding(target.dataset.buildingId, "move", "Move mode armed. Click a new hex to reposition it.");
      break;
    case "save-map-preset":
      void audioEngine.playUiAccent("soft");
      actions.saveMapPreset();
      break;
    case "auto-place-buildings":
      void audioEngine.playUiAccent("confirm");
      actions.autoPlaceBuildings();
      break;
    case "restore-map-preset":
      void audioEngine.playUiAccent("soft");
      actions.restoreMapPreset(target.dataset.presetId);
      break;
    case "delete-map-preset":
      void audioEngine.playUiAccent("soft");
      actions.deleteMapPreset(target.dataset.presetId);
      break;
    case "adjust-map-zoom": {
      void audioEngine.playUiAccent("soft");
      const delta = Number(target.dataset.delta ?? 0);
      const nextZoom = Math.min(1.85, Math.max(0.75, Number(renderer.transientUi.mapZoom ?? 1) + delta));
      renderer.setTransientUi({ mapZoom: nextZoom }, getCurrentState());
      break;
    }
    case "reset-map-view":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ mapZoom: 1, mapPanX: 0, mapPanY: 0 }, getCurrentState());
      break;
    case "set-city-admin-view":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ cityAdminView: target.dataset.view }, getCurrentState());
      break;
    case "set-city-aside-view":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ cityAsideView: target.dataset.view }, getCurrentState());
      break;
    case "set-building-filter":
      commit((draft) => {
        draft.buildingFilter = target.dataset.filter ?? target.value ?? "All";
      });
      break;
    case "set-building-status-filter":
      renderer.setTransientUi({ buildingStatusFilter: target.dataset.filter ?? target.value ?? "All" }, getCurrentState());
      break;
    case "set-building-quick-filter":
      renderer.setTransientUi({ buildingQuickFilter: target.dataset.filter ?? target.value ?? "All" }, getCurrentState());
      break;
    case "toggle-forge-nav":
      renderer.setTransientUi({ forgeNavCollapsed: !renderer.transientUi.forgeNavCollapsed }, getCurrentState());
      break;
    case "toggle-session-view":
      actions.toggleLiveSessionView();
      break;
    case "toggle-dice-history":
      renderer.setTransientUi({ diceHistoryOpen: !renderer.transientUi.diceHistoryOpen }, getCurrentState());
      break;
    case "toggle-town-focus-panel":
      renderer.setTransientUi({ homeTownFocusExpanded: !renderer.transientUi.homeTownFocusExpanded }, getCurrentState());
      break;
    case "toggle-player-citizens":
      renderer.setTransientUi({ playerCitizensOpen: !renderer.transientUi.playerCitizensOpen }, getCurrentState());
      break;
    case "toggle-player-hide-completed":
      renderer.setTransientUi({ playerHideCompleted: !renderer.transientUi.playerHideCompleted }, getCurrentState());
      break;
    case "toggle-incubator-support":
      setIncubatorSupportState(target.dataset.buildingId, target.dataset.supportKey, target.dataset.enabled !== "true");
      break;
    case "set-player-building-rarity-filter":
      renderer.setTransientUi({ playerBuildingRarityFilter: target.dataset.rarity ?? "All" }, getCurrentState());
      break;
    case "copy-city-status":
      await actions.copyCityStatus();
      break;
    case "copy-active-buildings":
      await actions.copyActiveBuildings();
      break;
    case "copy-chronicle-day-summary":
      await actions.copyChronicleDaySummary(Number(target.dataset.dayOffset ?? getCurrentState().calendar.dayOffset));
      break;
    case "go-to-problem":
      actions.goToProblem(target.dataset.problem ?? "overview");
      break;
    case "roll-dice":
      rollDice();
      break;
    case "open-home-help":
      void audioEngine.playUiAccent("soft");
      renderer.setTransientUi({ homeHelpOpen: true }, getCurrentState());
      break;
    case "save-manual-state":
      actions.saveManualState();
      break;
    case "load-manual-state":
      actions.loadManualState();
      break;
    case "save-firebase-realm":
      await actions.saveFirebaseRealm();
      break;
    case "load-firebase-realm":
      await actions.loadFirebaseRealm();
      break;
    case "chronicle-prev-month":
    case "chronicle-next-month": {
      void audioEngine.playUiAccent("soft");
      const targetMonthOffset =
        Number(target.dataset.monthOffset) ||
        addMonthsToOffset(
          renderer.transientUi.chronicleMonthOffset ?? getCurrentState().calendar.dayOffset,
          action === "chronicle-prev-month" ? -1 : 1
        );
      renderer.setTransientUi(
        {
          chronicleMonthOffset: getMonthStartOffset(targetMonthOffset),
          chronicleSelectedDayOffset: getMonthStartOffset(targetMonthOffset),
          chronicleJumpHighlightDay: null
        },
        getCurrentState()
      );
      clearChronicleJumpHighlightTimer();
      break;
    }
    case "select-chronicle-day": {
      void audioEngine.playUiAccent("soft");
      const selectedDayOffset = Number(target.dataset.dayOffset ?? getCurrentState().calendar.dayOffset);
      const shouldHighlightJump = target.dataset.highlightJump === "1";
      renderer.setTransientUi(
        {
          chronicleMonthOffset: getMonthStartOffset(selectedDayOffset),
          chronicleSelectedDayOffset: selectedDayOffset,
          chronicleJumpHighlightDay: shouldHighlightJump ? selectedDayOffset : null
        },
        getCurrentState()
      );
      if (shouldHighlightJump) {
        scheduleChronicleJumpHighlightClear(selectedDayOffset);
        scrollChronicleDayIntoView(selectedDayOffset);
      } else {
        clearChronicleJumpHighlightTimer();
      }
      break;
    }
    case "save-chronicle-note": {
      const panel = target.closest(".chronicle-calendar");
      const input = panel?.querySelector('[data-role="chronicle-note"]');
      const dayOffset = Number(target.dataset.dayOffset ?? input?.dataset.dayOffset ?? getCurrentState().calendar.dayOffset);
      const rawNoteText = String(input?.value ?? "");
      const noteText = rawNoteText.trim();
      commit((draft) => {
        const key = String(dayOffset);
        if (noteText) {
          draft.chronicleNotes[key] = rawNoteText;
        } else {
          delete draft.chronicleNotes[key];
        }
      });
      reportSuccess(noteText ? "Chronicle note saved." : "Chronicle note cleared.");
      break;
    }
    case "preview-town-focus":
      openTownFocusModal(target.dataset.focusId);
      break;
    case "export-building-catalog":
      exportBuildingCatalogStatus();
      reportSuccess("Building catalog status exported.");
      break;
    case "close-modal":
      void audioEngine.playUiAccent("soft");
      if (target.dataset.modal === "building-detail-modal") {
        renderer.setTransientUi({ inspectedBuildingId: null }, getCurrentState());
      } else if (target.dataset.modal === "building-catalog-modal") {
        renderer.setTransientUi({ catalogOpen: false }, getCurrentState());
      } else if (target.dataset.modal === "home-help-modal") {
        renderer.setTransientUi({ homeHelpOpen: false }, getCurrentState());
      } else if (target.dataset.modal === "town-focus-council-modal") {
        renderer.setTransientUi({ councilModalOpen: false }, getCurrentState());
      }
      break;
    case "close-manifest-complete":
      void audioEngine.playUiAccent("confirm");
      if (manifestCompleteTimer) {
        window.clearTimeout(manifestCompleteTimer);
        manifestCompleteTimer = null;
      }
      renderer.setTransientUi({ manifestCompleteModal: null }, getCurrentState());
      break;
    case "manifest-place-building": {
      void audioEngine.playUiAccent("confirm");
      const buildingId = target.dataset.buildingId;
      if (manifestCompleteTimer) {
        window.clearTimeout(manifestCompleteTimer);
        manifestCompleteTimer = null;
      }
      renderer.setTransientUi({ manifestCompleteModal: null }, getCurrentState());
      navigateWithTransition(`./city.html?focusBuilding=${encodeURIComponent(buildingId)}`);
      break;
    }
    case "select-map-cell": {
      const q = Number(target.dataset.q);
      const r = Number(target.dataset.r);
      const currentState = getCurrentState();
      const occupant = getBuildingAtCell(currentState, q, r);

      if (occupant) {
        commit((draft) => {
          setSelectedBuildingAndCell(draft, occupant.id);
          draft.ui.selectedMapCell = { q, r };
        });
        reportSuccess(`${occupant.displayName} selected from hex ${q}, ${r}.`);
        return;
      }

      const cell = findMapCell(currentState, q, r);
      if (cell?.isReserved) {
        reportError("The central forge core cannot be assigned.");
        return;
      }
      const plannerBuildingId = renderer.transientUi.mapPlannerBuildingId;
      if (plannerBuildingId) {
        const plannerBuilding = currentState.buildings.find((entry) => entry.id === plannerBuildingId);
        if (!plannerBuilding) {
          clearMapPlanner();
        } else {
          const validation = canPlaceBuildingAt(currentState, plannerBuildingId, q, r);
          if (validation.ok) {
            moveBuildingOnMap({
              buildingId: plannerBuildingId,
              q,
              r,
              source: renderer.transientUi.mapPlannerMode === "move" ? "Move" : "Planner"
            });
            return;
          }
          reportError(validation.reason);
        }
      }
      commit((draft) => {
        draft.ui.selectedMapCell = { q, r };
      });
      break;
    }
    case "clear-map-cell-selection":
      commit((draft) => {
        draft.ui.selectedMapCell = null;
      });
      break;
    case "place-building-on-cell": {
      const buildingId = target.dataset.buildingId;
      const q = Number(target.dataset.q);
      const r = Number(target.dataset.r);
      if (!buildingId || Number.isNaN(q) || Number.isNaN(r)) {
        reportError("That placement request is incomplete.");
        return;
      }
      moveBuildingOnMap({ buildingId, q, r, source: "Player" });
      break;
    }
    case "clear-map-building-placement":
      clearPlacement(target.dataset.buildingId, "Player");
      break;
    case "undo-last-placement":
      undoLastPlacement();
      break;
    case "dismiss-onboarding":
      actions.dismissOnboarding();
      break;
    case "show-onboarding":
      actions.showOnboarding();
      break;
    case "choose-town-focus":
      actions.chooseTownFocus(target.dataset.focusId);
      break;
    case "clear-building-placement": {
      const selectedBuilding = getCurrentState().buildings.find(
        (building) => building.id === getCurrentState().ui.selectedBuildingId
      );
      if (!selectedBuilding) {
        reportError("Select a building first.");
        return;
      }
      clearPlacement(selectedBuilding.id, "Player");
      break;
    }
    case "prioritize-construction":
      reprioritizeConstruction(target.dataset.buildingId, target.dataset.direction);
      break;
    case "activate-construction":
      setConstructionActiveState(target.dataset.buildingId, true);
      break;
    case "pause-construction":
      setConstructionActiveState(target.dataset.buildingId, false);
      break;
    case "pause-all-construction":
      actions.pauseAllConstruction();
      break;
    case "resume-all-construction":
      actions.resumeAllConstruction();
      break;
    case "toggle-building-pin":
      actions.toggleBuildingPin(target.dataset.buildingId);
      break;
    case "save-building-quality": {
      if (!getCurrentState().ui.adminUnlocked) {
        reportError("Unlock GM mode before editing building quality.");
        break;
      }
      const card = target.closest(".building-card");
      const qualityInput = card?.querySelector('[data-role="gm-building-quality-input"]');
      const quality = Number(qualityInput?.value);
      if (!Number.isFinite(quality)) {
        reportError("Enter a valid quality percentage.");
        break;
      }
      actions.setBuildingQuality({
        buildingId: target.dataset.buildingId,
        quality,
        source: "City GM"
      });
      break;
    }
    case "manifest-building-now":
      manifestBuildingNow(target.dataset.buildingId);
      break;
    case "close-turn-summary":
      actions.closeTurnSummary();
      break;
    case "upgrade-crystal": {
      reportError("Crystal upgrades now happen automatically when rolled. Manifest again to seek a higher rarity.");
      break;
    }
    case "toggle-mute":
      commit((draft) => {
        draft.settings.muted = !draft.settings.muted;
      });
      break;
    case "enter-fullscreen":
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      } else {
        await document.documentElement.requestFullscreen?.().catch(() => {});
      }
      break;
    case "toggle-projector-mode": {
      const nextProjectorMode = !renderer.transientUi.projectorMode;
      renderer.setTransientUi(
        {
          projectorMode: nextProjectorMode,
          projectorChromeHidden: false
        },
        getCurrentState()
      );
      if (nextProjectorMode) {
        scheduleProjectorChromeHide();
      } else {
        clearProjectorChromeTimer();
      }
      reportSuccess(`Projector mode ${nextProjectorMode ? "enabled" : "disabled"}.`);
      break;
    }
    case "open-admin":
      if (pageKey === "player") {
        reportError("Admin tools are hidden in Player Mode.");
        return;
      }
      void audioEngine.playUiAccent("soft");
      actions.openAdmin();
      break;
    default:
      break;
  }
});

root.addEventListener("mouseover", (event) => {
  if (mapDragState) {
    return;
  }
  const cell = event.target.closest(".hex-map__cell");
  if (!cell) {
    return;
  }

  const q = Number(cell.dataset.q);
  const r = Number(cell.dataset.r);
  const hovered = renderer.transientUi.hoveredMapCell;
  if (hovered && hovered.q === q && hovered.r === r) {
    return;
  }

  renderer.setTransientUi({ hoveredMapCell: { q, r } }, getCurrentState());
});

root.addEventListener("mouseout", (event) => {
  if (mapDragState) {
    return;
  }
  const cell = event.target.closest(".hex-map__cell");
  if (!cell) {
    return;
  }

  const nextCell = event.relatedTarget?.closest?.(".hex-map__cell");
  if (nextCell) {
    return;
  }

  window.setTimeout(() => {
    if (root.querySelector(".hex-map-wrap:hover")) {
      return;
    }
    clearHoveredMapCell();
  }, 0);
});

root.addEventListener(
  "wheel",
  (event) => {
    const svg = event.target.closest(".hex-map");
    if (!svg) {
      return;
    }
    event.preventDefault();
    const currentZoom = Number(renderer.transientUi.mapZoom ?? 1);
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = Math.min(1.85, Math.max(0.75, currentZoom + delta));
    renderer.setTransientUi({ mapZoom: nextZoom }, getCurrentState());
  },
  { passive: false }
);

document.addEventListener("pointerdown", (event) => {
  const svg = event.target.closest(".hex-map");
  if (!svg || event.button !== 0) {
    return;
  }
  if (renderer.transientUi.hoveredMapCell) {
    renderer.setTransientUi({ hoveredMapCell: null }, getCurrentState());
  }
  const liveSvg = root.querySelector(".hex-map");
  mapDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: Number(renderer.transientUi.mapPanX ?? 0),
    originY: Number(renderer.transientUi.mapPanY ?? 0),
    zoom: Number(renderer.transientUi.mapZoom ?? 1),
    moved: false
  };
  liveSvg?.classList.add("is-dragging");
});

document.addEventListener("pointermove", (event) => {
  if (!mapDragState || event.pointerId !== mapDragState.pointerId) {
    return;
  }

  const dx = event.clientX - mapDragState.startX;
  const dy = event.clientY - mapDragState.startY;
  if (!mapDragState.moved && Math.hypot(dx, dy) > 6) {
    mapDragState.moved = true;
  }
  if (!mapDragState.moved) {
    return;
  }

  applyMapViewPreview({
    mapZoom: mapDragState.zoom,
    mapPanX: mapDragState.originX + dx,
    mapPanY: mapDragState.originY + dy
  });
});

document.addEventListener("pointerup", (event) => {
  if (!mapDragState || event.pointerId !== mapDragState.pointerId) {
    return;
  }

  const dx = event.clientX - mapDragState.startX;
  const dy = event.clientY - mapDragState.startY;
  const nextPanX = mapDragState.originX + dx;
  const nextPanY = mapDragState.originY + dy;
  const moved = mapDragState.moved;
  root.querySelector(".hex-map")?.classList.remove("is-dragging");
  mapDragState = null;

  if (moved) {
    suppressNextMapClick = true;
    renderer.setTransientUi({ mapPanX: nextPanX, mapPanY: nextPanY }, getCurrentState());
  }
});

document.addEventListener("pointercancel", () => {
  root.querySelector(".hex-map")?.classList.remove("is-dragging");
  mapDragState = null;
  applyMapViewPreview(getMapViewState());
});

root.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  if (target.dataset.action === "set-building-filter") {
    commit((draft) => {
      draft.buildingFilter = target.dataset.filter ?? target.value ?? "All";
    });
  }

  if (target.dataset.action === "set-building-status-filter") {
    renderer.setTransientUi({ buildingStatusFilter: target.dataset.filter ?? target.value ?? "All" }, getCurrentState());
  }

  if (target.dataset.action === "set-building-quick-filter") {
    renderer.setTransientUi({ buildingQuickFilter: target.dataset.filter ?? target.value ?? "All" }, getCurrentState());
  }

  if (target.dataset.action === "set-speed-multiplier") {
    commit((draft) => {
      draft.constructionSpeedMultiplier = Number(target.value);
    });
  }

  if (target.dataset.action === "set-building-sort") {
    renderer.setTransientUi({ buildingSort: target.value }, getCurrentState());
  }

  if (target.dataset.action === "set-catalog-filter") {
    renderer.setTransientUi(
      {
        catalogFilters: {
          ...(renderer.transientUi.catalogFilters ?? {}),
          [target.dataset.filterKey]: target.value ?? "All"
        }
      },
      getCurrentState()
    );
  }

  if (target.dataset.action === "set-dice-type") {
    commit((draft) => {
      draft.settings.diceType = target.value ?? "d20";
    });
  }

});

root.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  if (target.dataset.action === "set-dice-amount") {
    commit((draft) => {
      draft.settings.diceAmount = Math.max(1, Math.min(20, Number(target.value) || 1));
    });
  }
});

audioEngine.setMuted(getCurrentState().settings.muted);
document.body.dataset.theme = "dark";

function applyUrlFocusTargets() {
  const params = new URLSearchParams(window.location.search);
  const focusBuildingId = params.get("focusBuilding");
  const openDossier = params.get("openDossier") === "1";
  const focusEventId = params.get("focusEvent");
  const focusChronicleDayParam = params.get("focusChronicleDay");
  const focusChronicleDay = focusChronicleDayParam === null ? null : Number(focusChronicleDayParam);
  const focusProblem = params.get("problem");

  if (!focusBuildingId && !focusEventId && !Number.isFinite(focusChronicleDay) && !focusProblem) {
    return;
  }

  if (focusBuildingId) {
    const building = getCurrentState().buildings.find((entry) => entry.id === focusBuildingId);
    if (building) {
      commit((draft) => {
        setSelectedBuildingAndCell(draft, building.id);
      });
      if (openDossier) {
        renderer.setTransientUi({ inspectedBuildingId: building.id }, getCurrentState());
      }
    }
  }

  if (focusEventId) {
    renderer.setTransientUi({ focusEventId }, getCurrentState());
  }

  if (Number.isFinite(focusChronicleDay)) {
    renderer.setTransientUi(
      {
        chronicleMonthOffset: getMonthStartOffset(focusChronicleDay),
        chronicleSelectedDayOffset: focusChronicleDay,
        chronicleJumpHighlightDay: focusChronicleDay
      },
      getCurrentState()
    );
    scheduleChronicleJumpHighlightClear(focusChronicleDay);
    scrollChronicleDayIntoView(focusChronicleDay);
  }

  if (focusProblem) {
    applyProblemFocus(focusProblem);
  }

  clearUrlParams();
}



renderer.render(getCurrentState());
applyMapViewPreview();
adminConsole.render(getCurrentState());

applyUrlFocusTargets();
startPageEnter();

