import { AdminConsole } from "./admin/AdminConsole.js";
import { createCatalogEntryFromInput, getCatalogKey } from "./content/BuildingCatalog.js";
import {
  FIREBASE_DEFAULT_REALM_ID,
  FIREBASE_DEFAULT_WORKING_REALM_ID,
  SAVE_SLOT_COUNT,
  GM_QUICK_CRYSTAL_PACKS
} from "./content/Config.js";
import { EVENT_POOLS } from "./content/EventPools.js";
import { getNextRarity, RARITY_ORDER } from "./content/Rarities.js";
import { GameState } from "./engine/GameState.js";
import { AnimationEngine } from "./fx/AnimationEngine.js";
import { AudioEngine } from "./fx/AudioEngine.js";
import {
  isFirebaseConfigured,
  loadFirebaseRealmState,
  saveFirebaseRealmState,
  subscribeFirebaseRealmState
} from "./firebase/FirebaseSharedState.js";
import { manifestIntoBuilding, removeBuilding, setBuildingQuality, setBuildingRuinState } from "./systems/BuildingSystem.js";
import { addMonthsToOffset, dateFromParts, formatDate, getMonthStartOffset } from "./systems/CalendarSystem.js";
import {
  addCitizens,
  applyCitizenBulkSet,
  promoteCitizens,
  removeCitizens,
  resetCitizens,
  setCitizens
} from "./systems/CitizenSystem.js";
import { recalculateCityStats } from "./systems/CityStatsSystem.js";
import { addCrystals, setCrystals, spendCrystal } from "./systems/CrystalSystem.js";
import { activateConstruction, moveConstructionPriority, normalizeConstructionPriority, pauseConstruction } from "./systems/ConstructionSystem.js";
import { resetDistrictLevels, setDistrictDefinition, setDistrictLevelOverride, getDistrictSummary } from "./systems/DistrictSystem.js";
import { setDriftEvolutionStageOverride, syncDriftEvolutionState } from "./systems/DriftEvolutionSystem.js";
import { clearActiveEvents, triggerEvent } from "./systems/EventSystem.js";
import { manifestSelectedRarity } from "./systems/GachaSystem.js";
import { addHistoryEntry } from "./systems/HistoryLogSystem.js";
import {
  clearBuildingPlacement,
  findMapCell,
  forceSetBuildingPlacement,
  getBuildingPlacementBonuses,
  getBuildingAtCell,
  setBuildingPlacement
} from "./systems/MapSystem.js";
import { addShards, setShards } from "./systems/ShardSystem.js";
import {
  createInitialState,
  createLiveSessionResetState,
  createSessionSnapshot as createSessionSnapshotRecord,
  createTestingBalanceResetState,
  createSingleCommonCrystalResetState,
  exportSave,
  importSave,
  loadManualState,
  loadGameState,
  resetSave,
  restoreSessionSnapshot,
  createSerializableState,
  saveManualState,
  saveGameState,
  validateAndMigrateSave
} from "./systems/StorageSystem.js";
import { advanceTime, advanceTimeByDays } from "./systems/TimeSystem.js";
import { forceTownFocus, reopenTownFocusSelection, selectTownFocus, updateTownFocusAvailability } from "./systems/TownFocusSystem.js";
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
let firebaseUnsubscribe = null;
let firebasePublishTimer = null;
let applyingFirebaseState = false;
syncDerivedState(gameState.getState());

function syncDerivedState(state) {
  if ((state.crystals[state.selectedRarity] ?? 0) <= 0) {
    state.selectedRarity =
      RARITY_ORDER.find((rarity) => (state.crystals[rarity] ?? 0) > 0) ?? state.selectedRarity;
  }
  state.settings.currentPage = pageKey;
  state.settings.theme = "dark";
  const publishedRealmId = getPublishedFirebaseRealmId(state);
  state.settings.firebaseRealmId = publishedRealmId;
  state.settings.firebasePublishedRealmId = publishedRealmId;
  state.settings.firebaseWorkingRealmId = getWorkingFirebaseRealmId(state);
  if ((state.settings.firebaseWorkflowVersion ?? 1) < 2) {
    state.settings.firebaseAutoLoad = true;
    state.settings.firebaseLiveSync = false;
    state.settings.firebaseAutoPublish = false;
    state.settings.firebaseWorkflowVersion = 2;
  }
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

function reportSuccess(message) {
  if (message) {
    toasts.show(message, "success");
  }
}

function reportError(message) {
  if (message) {
    toasts.show(message, "error");
  }
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

function resetTransientUi() {
  renderer.setTransientUi(
    {
      hoveredMapCell: null,
      inspectedBuildingId: null,
      catalogOpen: false,
      manifestCompleteModal: null
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

function setSelectedBuildingAndCell(state, buildingId) {
  state.ui.selectedBuildingId = buildingId;
  const building = state.buildings.find((entry) => entry.id === buildingId);
  state.ui.selectedMapCell = building?.mapPosition
    ? { q: building.mapPosition.q, r: building.mapPosition.r }
    : null;
}

async function handleManifest() {
  const state = getCurrentState();
  const result = commit((draft) => {
    const manifestResult = manifestSelectedRarity(draft, draft.selectedRarity);
    if (manifestResult.ok) {
      draft.ui.lastManifestResult = manifestResult;
      setSelectedBuildingAndCell(draft, manifestResult.building.id);
    }
    return manifestResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return;
  }

  await publishManifestIfEnabled();
  await audioEngine.playManifest(result.rarity);
  await animationEngine.playManifestReveal(result);
  if (manifestCompleteTimer) {
    window.clearTimeout(manifestCompleteTimer);
  }
  renderer.setTransientUi(
    {
      manifestCompleteModal: {
        rolledName: result.rolledName,
        rarity: result.rarity,
        buildingId: result.building.id,
        qualityRoll: result.qualityRoll,
        durationMs: 900,
        revealPercent: false
      }
    },
    getCurrentState()
  );
  manifestCompleteTimer = window.setTimeout(() => {
    renderer.setTransientUi(
      {
        manifestCompleteModal: {
          rolledName: result.rolledName,
          rarity: result.rarity,
          buildingId: result.building.id,
          qualityRoll: result.qualityRoll,
          durationMs: 900,
          revealPercent: true
        }
      },
      getCurrentState()
    );
  }, 900);
  reportSuccess(`${result.rolledName} manifested.`);
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
  commit((draft) => {
    draft.resources.gold = Math.max(0, Number(nextResources.gold));
    draft.resources.food = Math.max(0, Number(nextResources.food));
    draft.resources.materials = Math.max(0, Number(nextResources.materials));
    draft.resources.salvage = Math.max(0, Number(nextResources.salvage ?? draft.resources.salvage ?? 0));
    draft.resources.mana = Math.max(0, Number(nextResources.mana));
    draft.resources.prosperity = Math.max(0, Number(nextResources.prosperity));
  });
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
  reportSuccess(`Citizen change applied to ${citizenClass}.`);
}

function moveCitizens({ mode, fromClass, toClass, amount }) {
  commit((draft) => promoteCitizens(draft, fromClass, toClass, amount, "Admin", mode === "promote" ? "promoted" : "demoted"));
  reportSuccess(`${mode === "promote" ? "Promotion" : "Demotion"} applied.`);
}

function bulkCitizens(nextBulk) {
  commit((draft) => applyCitizenBulkSet(draft, nextBulk));
  reportSuccess("Bulk citizen update applied.");
}

function spawnBuilding({ name, rarity, quality, catalogEntry }) {
  if (!name.trim()) {
    reportError("Building name is required.");
    return;
  }

  commit((draft) => {
    const nextCatalogEntry = ensureCatalogEntry(
      draft,
      catalogEntry ?? createCatalogEntryFromInput({ name, rarity, district: "", tags: [], iconKey: "", specialEffect: "" })
    );
    if (!draft.rollTables[rarity].includes(name)) {
      draft.rollTables[rarity].push(name);
    }
    const timestamps = { date: formatDate(draft.calendar.dayOffset), dayOffset: draft.calendar.dayOffset };
    const result = manifestIntoBuilding(draft, nextCatalogEntry, Math.max(0, Number(quality)), timestamps);
    setSelectedBuildingAndCell(draft, result.building.id);
  });
  reportSuccess(`${name} spawned.`);
}

function manifestUnmanifestedBuilding({ selection, quality }) {
  const [rarity, ...nameParts] = String(selection ?? "").split("::");
  const name = nameParts.join("::").trim();

  if (!rarity || !name) {
    reportError("Choose an unmanifested building first.");
    return;
  }

  commit((draft) => {
    const alreadyExists = draft.buildings.some((building) => building.name === name && building.rarity === rarity);
    if (alreadyExists) {
      throw new Error("That building is already manifested.");
    }

    const catalogEntry = draft.buildingCatalog[getCatalogKey(name, rarity)];
    if (!catalogEntry) {
      throw new Error("Building catalog entry not found.");
    }

    const timestamps = { date: formatDate(draft.calendar.dayOffset), dayOffset: draft.calendar.dayOffset };
    const result = manifestIntoBuilding(draft, catalogEntry, Math.max(1, Math.min(350, Number(quality) || 100)), timestamps);
    setSelectedBuildingAndCell(draft, result.building.id);
  });

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

function normalizeSharedStateUrl(url) {
  const normalized = String(url ?? "").trim();
  if (!normalized) {
    return "";
  }

  const driveMatch =
    normalized.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    normalized.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  return normalized;
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

async function fetchSharedStateFromUrl(url) {
  const normalizedUrl = normalizeSharedStateUrl(url);
  if (!normalizedUrl) {
    throw new Error("No shared save URL provided.");
  }

  const response = await fetch(normalizedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch shared save (${response.status}).`);
  }

  const text = await response.text();
  return importSave(text);
}

function normalizeFirebaseRealmId(realmId) {
  const normalized = String(realmId ?? "").trim();
  return normalized || FIREBASE_DEFAULT_REALM_ID;
}

function normalizeFirebaseWorkingRealmId(realmId) {
  const normalized = String(realmId ?? "").trim();
  return normalized || FIREBASE_DEFAULT_WORKING_REALM_ID;
}

function getPublishedFirebaseRealmId(state = getCurrentState()) {
  return normalizeFirebaseRealmId(state.settings.firebasePublishedRealmId ?? state.settings.firebaseRealmId);
}

function getWorkingFirebaseRealmId(state = getCurrentState()) {
  return normalizeFirebaseWorkingRealmId(
    state.settings.firebaseWorkingRealmId ?? `${getPublishedFirebaseRealmId(state)}-working`
  );
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
    sharedStateUrl: currentState.settings.sharedStateUrl,
    autoLoadSharedState: currentState.settings.autoLoadSharedState,
    firebaseRealmId: currentState.settings.firebaseRealmId,
    firebasePublishedRealmId: currentState.settings.firebasePublishedRealmId,
    firebaseWorkingRealmId: currentState.settings.firebaseWorkingRealmId,
    firebaseWorkflowVersion: currentState.settings.firebaseWorkflowVersion,
    firebaseAutoLoad: currentState.settings.firebaseAutoLoad,
    firebaseLiveSync: currentState.settings.firebaseLiveSync,
    firebaseAutoPublish: currentState.settings.firebaseAutoPublish,
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
  return preserveLocalSettingsOnSharedState(payload.state);
}

async function publishSharedStateToFirebase(realmId, state = getCurrentState()) {
  const serializable = createSerializableState(state);
  serializable.ui = {
    ...serializable.ui,
    adminUnlocked: false,
    adminOpen: false
  };
  await saveFirebaseRealmState(realmId, serializable, firebaseClientId);
}

async function loadPublishedStateFromFirebase() {
  return loadSharedStateFromFirebase(getPublishedFirebaseRealmId());
}

async function loadWorkingStateFromFirebase() {
  return loadSharedStateFromFirebase(getWorkingFirebaseRealmId());
}

async function saveWorkingStateToFirebase(state = getCurrentState()) {
  await publishSharedStateToFirebase(getWorkingFirebaseRealmId(state), state);
}

async function publishCurrentStateToPublished(state = getCurrentState()) {
  await publishSharedStateToFirebase(getPublishedFirebaseRealmId(state), state);
}

async function publishWorkingStateToPublished() {
  const payload = await loadFirebaseRealmState(getWorkingFirebaseRealmId());
  if (!payload?.state) {
    throw new Error("No Firebase working state found yet.");
  }
  const publishedState = preserveLocalSettingsOnSharedState(payload.state);
  await publishCurrentStateToPublished(publishedState);
}

async function connectFirebaseLiveSync(showSuccess = false) {
  const state = getCurrentState();
  if (!state.settings.firebaseLiveSync) {
    return;
  }
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured in this build.");
  }

  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }

  firebaseUnsubscribe = await subscribeFirebaseRealmState(
    getPublishedFirebaseRealmId(state),
    (payload) => {
      if (!payload?.state) {
        return;
      }
      if (payload.sourceClientId && payload.sourceClientId === firebaseClientId) {
        return;
      }
      applyingFirebaseState = true;
      gameState.replace(preserveLocalSettingsOnSharedState(payload.state));
      applyingFirebaseState = false;
      resetTransientUi();
    }
  );

  if (showSuccess) {
    reportSuccess(`Firebase live sync connected to published realm "${getPublishedFirebaseRealmId(state)}".`);
  }
}

function disconnectFirebaseLiveSync() {
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }
}

function scheduleFirebaseAutoPublish(state) {
  if (applyingFirebaseState || !state.settings.firebaseAutoPublish || !state.ui.adminUnlocked) {
    return;
  }
  if (firebasePublishTimer) {
    clearTimeout(firebasePublishTimer);
  }
  firebasePublishTimer = setTimeout(() => {
    firebasePublishTimer = null;
    void saveWorkingStateToFirebase().catch((error) => reportError(error.message));
  }, 500);
}

async function publishManifestIfEnabled() {
  const state = getCurrentState();
  if (!state.settings.firebaseAutoPublish) {
    return;
  }
  try {
    await saveWorkingStateToFirebase(state);
  } catch (error) {
    reportError(error.message);
  }
}

function moveBuildingOnMap({ buildingId, q, r, source = "Player" }) {
  const result = commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    const beforeBonus = building ? getBuildingPlacementBonuses(draft, building).totalPercent : 0;
    const placementResult = setBuildingPlacement(draft, buildingId, Number(q), Number(r), source);
    if (placementResult.ok) {
      draft.ui.selectedBuildingId = buildingId;
      draft.ui.selectedMapCell = { q: Number(q), r: Number(r) };
      placementResult.resonanceGain =
        getBuildingPlacementBonuses(draft, placementResult.building).totalPercent - beforeBonus;
    }
    return placementResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return result;
  }

  reportSuccess(`${result.building.displayName} placed at hex ${q}, ${r}.`);
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
    const beforeBonus = building ? getBuildingPlacementBonuses(draft, building).totalPercent : 0;
    const placementResult = forceSetBuildingPlacement(draft, buildingId, Number(q), Number(r), source);
    if (placementResult.ok) {
      draft.ui.selectedBuildingId = buildingId;
      draft.ui.selectedMapCell = { q: Number(q), r: Number(r) };
      placementResult.resonanceGain =
        getBuildingPlacementBonuses(draft, placementResult.building).totalPercent - beforeBonus;
    }
    return placementResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return result;
  }

  if (result.displacedBuilding) {
    reportSuccess(
      `${result.building.displayName} force-placed at ${q}, ${r}. ${result.displacedBuilding.displayName} was cleared.`
    );
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

  reportSuccess(`${result.building.displayName} force-placed at hex ${q}, ${r}.`);
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

  reportSuccess(`${result.building.displayName} cleared from the map.`);
  return result;
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

  const building = getCurrentState().buildings.find((entry) => entry.id === buildingId);
  reportSuccess(`${building?.displayName ?? "Building"} ${shouldActivate ? "assigned to an incubator" : "removed from active incubation"}.`);
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
    reportSuccess(`Restored snapshot "${snapshot.name}".`);
  },
  deleteSessionSnapshot(snapshotId) {
    commit((draft) => {
      draft.sessionSnapshots = (draft.sessionSnapshots ?? []).filter((entry) => entry.id !== snapshotId);
    });
    reportSuccess("Session snapshot deleted.");
  },
  adjustShard,
  setResources,
  citizenCommand,
  moveCitizens,
  resetCitizens() {
    commit((draft) => resetCitizens(draft));
    reportSuccess("Citizens reset.");
  },
  bulkCitizens,
  spawnBuilding,
  manifestUnmanifestedBuilding,
  editBuilding(payload) {
    editBuilding(payload);
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
    reportSuccess(`Triggered ${eventDefinition.name}.`);
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
    if (!navigator.clipboard?.writeText) {
      reportError("Clipboard copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(json);
      reportSuccess("Save JSON copied to clipboard.");
    } catch (error) {
      reportError(error.message);
    }
  },
  saveManualState() {
    try {
      saveManualState(getCurrentState());
      reportSuccess(`State saved to slot ${getCurrentState().settings.activeSaveSlot}.`);
    } catch (error) {
      reportError(error.message);
    }
  },
  loadManualState() {
    try {
      gameState.replace(loadManualState(getCurrentState().settings.activeSaveSlot));
      resetTransientUi();
      reportSuccess(`Save slot ${getCurrentState().settings.activeSaveSlot} loaded.`);
    } catch (error) {
      reportError(error.message);
    }
  },
  setActiveSaveSlot(slot) {
    const normalizedSlot = Math.max(1, Math.min(SAVE_SLOT_COUNT, Number(slot) || 1));
    commit((draft) => {
      draft.settings.activeSaveSlot = normalizedSlot;
    });
    reportSuccess(`Active save slot set to ${normalizedSlot}.`);
  },
  importSave(text) {
    gameState.replace(importSave(text));
    renderer.setTransientUi({ hoveredMapCell: null, inspectedBuildingId: null }, getCurrentState());
    reportSuccess("Save imported.");
  },
  async loadSharedStateUrl(url) {
    try {
      const sharedState = await fetchSharedStateFromUrl(url);
      gameState.replace(sharedState);
      resetTransientUi();
      reportSuccess("Shared state loaded.");
    } catch (error) {
      reportError(error.message);
    }
  },
  rememberSharedStateUrl(url) {
    const normalizedUrl = normalizeSharedStateUrl(url);
    commit((draft) => {
      draft.settings.sharedStateUrl = normalizedUrl;
    });
    reportSuccess(normalizedUrl ? "Shared save URL remembered." : "Shared save URL cleared.");
  },
  toggleSharedStateAutoLoad() {
    commit((draft) => {
      draft.settings.autoLoadSharedState = !draft.settings.autoLoadSharedState;
    });
    reportSuccess(`Shared auto-load ${getCurrentState().settings.autoLoadSharedState ? "enabled" : "disabled"}.`);
  },
  async loadFirebaseRealm() {
    try {
      const firebaseState = await loadPublishedStateFromFirebase();
      gameState.replace(firebaseState);
      resetTransientUi();
      reportSuccess("Published Firebase state loaded.");
    } catch (error) {
      reportError(error.message);
    }
  },
  async loadFirebaseWorkingRealm() {
    try {
      const firebaseState = await loadWorkingStateFromFirebase();
      gameState.replace(firebaseState);
      resetTransientUi();
      reportSuccess("Working Firebase state loaded.");
    } catch (error) {
      reportError(error.message);
    }
  },
  rememberFirebaseRealmIds(publishedRealmId, workingRealmId) {
    const normalizedPublishedRealmId = normalizeFirebaseRealmId(publishedRealmId);
    const normalizedWorkingRealmId = normalizeFirebaseWorkingRealmId(workingRealmId);
    commit((draft) => {
      draft.settings.firebaseRealmId = normalizedPublishedRealmId;
      draft.settings.firebasePublishedRealmId = normalizedPublishedRealmId;
      draft.settings.firebaseWorkingRealmId = normalizedWorkingRealmId;
      draft.settings.firebaseWorkflowVersion = 2;
    });
    if (getCurrentState().settings.firebaseLiveSync) {
      void connectFirebaseLiveSync().catch((error) => reportError(error.message));
    }
    reportSuccess(
      `Firebase realms set. Published: "${normalizedPublishedRealmId}" · Working: "${normalizedWorkingRealmId}".`
    );
  },
  async saveFirebaseRealm() {
    try {
      await saveWorkingStateToFirebase();
      reportSuccess("Current state saved to Firebase working.");
    } catch (error) {
      reportError(error.message);
    }
  },
  async publishFirebaseRealm() {
    try {
      await publishCurrentStateToPublished();
      reportSuccess("Current state published to testers.");
    } catch (error) {
      reportError(error.message);
    }
  },
  async publishFirebaseWorkingRealm() {
    try {
      await publishWorkingStateToPublished();
      reportSuccess("Firebase working state published to testers.");
    } catch (error) {
      reportError(error.message);
    }
  },
  async toggleFirebaseAutoLoad() {
    commit((draft) => {
      draft.settings.firebaseAutoLoad = !draft.settings.firebaseAutoLoad;
    });
    reportSuccess(`Firebase auto-load ${getCurrentState().settings.firebaseAutoLoad ? "enabled" : "disabled"}.`);
  },
  async toggleFirebaseLiveSync() {
    commit((draft) => {
      draft.settings.firebaseLiveSync = !draft.settings.firebaseLiveSync;
    });
    try {
      if (getCurrentState().settings.firebaseLiveSync) {
        await connectFirebaseLiveSync(true);
      } else {
        disconnectFirebaseLiveSync();
        reportSuccess("Firebase live sync disabled.");
      }
    } catch (error) {
      commit((draft) => {
        draft.settings.firebaseLiveSync = false;
      });
      disconnectFirebaseLiveSync();
      reportError(error.message);
    }
  },
  toggleFirebaseAutoPublish() {
    commit((draft) => {
      draft.settings.firebaseAutoPublish = !draft.settings.firebaseAutoPublish;
    });
    reportSuccess(`Firebase auto-publish ${getCurrentState().settings.firebaseAutoPublish ? "enabled" : "disabled"}.`);
  },
  resetSave() {
    gameState.replace(resetSave());
    resetTransientUi();
    reportSuccess("Save reset.");
  },
  sessionReset() {
    gameState.replace(createLiveSessionResetState());
    resetTransientUi();
    reportSuccess("Realm reset to the live session preset.");
  },
  testingReset() {
    gameState.replace(createTestingBalanceResetState());
    resetTransientUi();
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
    reportSuccess("Realm fully reset. You now begin with 1 Common crystal.");
  },
  reportError
};

const adminConsole = new AdminConsole(actions);

gameState.subscribe((state) => {
  audioEngine.setMuted(state.settings.muted);
  audioEngine.setPage(pageKey);
  document.body.dataset.theme = state.settings.theme ?? "dark";
  saveGameState(state);
  renderer.render(state);
  adminConsole.render(state);
  scheduleFirebaseAutoPublish(state);
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

root.addEventListener("click", async (event) => {
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
    case "advance-time": {
      const result = commit((draft) => advanceTime(draft, target.dataset.step));
      reportSuccess(`Advanced ${result.days} days.`);
      break;
    }
    case "advance-custom-time": {
      const panel = target.closest(".calendar-panel");
      const input = panel?.querySelector('[data-role="custom-days"]');
      const days = Math.max(1, Math.floor(Number(input?.value) || 0));
      const result = commit((draft) => advanceTimeByDays(draft, days));
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
          chronicleSelectedDayOffset: getMonthStartOffset(targetMonthOffset)
        },
        getCurrentState()
      );
      break;
    }
    case "select-chronicle-day": {
      void audioEngine.playUiAccent("soft");
      const selectedDayOffset = Number(target.dataset.dayOffset ?? getCurrentState().calendar.dayOffset);
      renderer.setTransientUi(
        {
          chronicleMonthOffset: getMonthStartOffset(selectedDayOffset),
          chronicleSelectedDayOffset: selectedDayOffset
        },
        getCurrentState()
      );
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

      const selectedBuilding = currentState.buildings.find(
        (building) => building.id === currentState.ui.selectedBuildingId
      );

      if (!selectedBuilding) {
        commit((draft) => {
          draft.ui.selectedMapCell = { q, r };
        });
        reportError("Select a building first, then choose an outer hex.");
        return;
      }

      moveBuildingOnMap({ buildingId: selectedBuilding.id, q, r, source: "Player" });
      break;
    }
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
    case "upgrade-crystal": {
      const sourceRarity = target.dataset.rarity;
      const nextRarity = getNextRarity(sourceRarity);
      if (!nextRarity) {
        reportError("Beyond crystals cannot be upgraded.");
        return;
      }
      const selectedBuilding = getCurrentState().buildings.find((building) => building.id === getCurrentState().ui.selectedBuildingId);
      if (!selectedBuilding || selectedBuilding.name !== "Crystal Upgrade" || !selectedBuilding.isComplete) {
        reportError("Select a completed Crystal Upgrade building first.");
        return;
      }
      const result = commit((draft) => {
        if (!spendCrystal(draft, sourceRarity, 1)) {
          return { ok: false };
        }
        addCrystals(draft, nextRarity, 1);
        addHistoryEntry(draft, {
          category: "Crystal Upgrade",
          title: `${sourceRarity} upgraded`,
          details: `${sourceRarity} crystal converted into ${nextRarity}.`
        });
        return { ok: true };
      });
      if (!result.ok) {
        reportError(`No ${sourceRarity} crystals available.`);
        return;
      }
      reportSuccess(`${sourceRarity} crystal upgraded to ${nextRarity}.`);
      break;
    }
    case "toggle-mute":
      commit((draft) => {
        draft.settings.muted = !draft.settings.muted;
      });
      break;
    case "open-admin":
      void audioEngine.playUiAccent("soft");
      actions.openAdmin();
      break;
    default:
      break;
  }
});

root.addEventListener("mouseover", (event) => {
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

  if (target.dataset.action === "set-save-slot") {
    actions.setActiveSaveSlot(target.value);
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

  if (!focusBuildingId && !focusEventId) {
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

  clearUrlParams();
}

async function autoLoadSharedStateIfEnabled() {
  const state = getCurrentState();
  if (state.settings.firebaseAutoLoad) {
    try {
      const firebaseState = await loadPublishedStateFromFirebase();
      gameState.replace(firebaseState);
      resetTransientUi();
      reportSuccess("Published Firebase state auto-loaded.");
    } catch (error) {
      reportError(error.message);
    }
  } else if (state.settings.autoLoadSharedState && state.settings.sharedStateUrl) {
    try {
      const sharedState = await fetchSharedStateFromUrl(state.settings.sharedStateUrl);
      sharedState.settings.sharedStateUrl = state.settings.sharedStateUrl;
      sharedState.settings.autoLoadSharedState = state.settings.autoLoadSharedState;
      gameState.replace(sharedState);
      resetTransientUi();
      reportSuccess("Shared state auto-loaded.");
    } catch (error) {
      reportError(error.message);
    }
  }

  try {
    await connectFirebaseLiveSync();
  } catch (error) {
    reportError(error.message);
  }
}

if (!localStorage.getItem("crystal-forge-save")) {
  gameState.replace(createInitialState());
} else {
  renderer.render(getCurrentState());
  adminConsole.render(getCurrentState());
}

applyUrlFocusTargets();
void autoLoadSharedStateIfEnabled();
startPageEnter();
