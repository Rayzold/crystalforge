import { AdminConsole } from "./admin/AdminConsole.js";
import { createCatalogEntryFromInput, getCatalogKey } from "./content/BuildingCatalog.js";
import { EVENT_POOLS } from "./content/EventPools.js";
import { getNextRarity, RARITY_ORDER } from "./content/Rarities.js";
import { GameState } from "./engine/GameState.js";
import { AnimationEngine } from "./fx/AnimationEngine.js";
import { AudioEngine } from "./fx/AudioEngine.js";
import { manifestIntoBuilding, removeBuilding, setBuildingQuality } from "./systems/BuildingSystem.js";
import { dateFromParts, formatDate } from "./systems/CalendarSystem.js";
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
import { resetDistrictLevels, setDistrictDefinition, setDistrictLevelOverride, getDistrictSummary } from "./systems/DistrictSystem.js";
import { clearActiveEvents, triggerEvent } from "./systems/EventSystem.js";
import { manifestSelectedRarity } from "./systems/GachaSystem.js";
import { addHistoryEntry } from "./systems/HistoryLogSystem.js";
import { addShards, setShards } from "./systems/ShardSystem.js";
import { createInitialState, exportSave, importSave, loadGameState, resetSave, saveGameState } from "./systems/StorageSystem.js";
import { advanceTime } from "./systems/TimeSystem.js";
import { Toasts } from "./ui/Toasts.js";
import { UIRenderer } from "./ui/UIRenderer.js";

const root = document.querySelector("#app");
const renderer = new UIRenderer(root);
const toasts = new Toasts();
const animationEngine = new AnimationEngine();
const audioEngine = new AudioEngine();
const gameState = new GameState(loadGameState());

function syncDerivedState(state) {
  state.districtSummary = getDistrictSummary(state);
  state.resources.population = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
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

function ensureCatalogEntry(state, catalogEntry) {
  state.buildingCatalog[catalogEntry.key] = {
    ...(state.buildingCatalog[catalogEntry.key] ?? {}),
    ...catalogEntry
  };
  return state.buildingCatalog[catalogEntry.key];
}

function setPopulationByAdjustingClasses(state, targetPopulation) {
  let currentPopulation = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
  let delta = targetPopulation - currentPopulation;
  if (delta > 0) {
    state.citizens.Peasants += delta;
    return;
  }

  const reductionOrder = ["Peasants", "Workers", "Merchants", "Scholars", "Clergy", "Soldiers", "Nobles", "Mages"];
  for (const citizenClass of reductionOrder) {
    if (delta === 0) {
      break;
    }
    const available = state.citizens[citizenClass];
    const removeAmount = Math.min(available, Math.abs(delta));
    state.citizens[citizenClass] -= removeAmount;
    delta += removeAmount;
  }
}

function getCurrentState() {
  return gameState.getState();
}

async function handleManifest() {
  const state = getCurrentState();
  const result = commit((draft) => {
    const manifestResult = manifestSelectedRarity(draft, draft.selectedRarity);
    if (manifestResult.ok) {
      draft.ui.lastManifestResult = manifestResult;
      draft.ui.selectedBuildingId = manifestResult.building.id;
    }
    return manifestResult;
  });

  if (!result.ok) {
    reportError(result.reason);
    return;
  }

  await audioEngine.playManifest(result.rarity);
  await animationEngine.playManifestReveal(result);
  reportSuccess(`${result.rolledName} manifested at ${result.qualityRoll}% quality.`);
}

function adjustCrystal({ mode, rarity, amount }) {
  commit((draft) => {
    if (mode === "add") addCrystals(draft, rarity, amount);
    if (mode === "remove") addCrystals(draft, rarity, -amount);
    if (mode === "set") setCrystals(draft, rarity, amount);
  });
  reportSuccess(`Updated ${rarity} crystals.`);
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
    draft.resources.mana = Math.max(0, Number(nextResources.mana));
    draft.resources.prosperity = Math.max(0, Number(nextResources.prosperity));
    setPopulationByAdjustingClasses(draft, Math.max(0, Number(nextResources.population)));
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
    manifestIntoBuilding(draft, nextCatalogEntry, Math.max(0, Number(quality)), timestamps);
  });
  reportSuccess(`${name} spawned.`);
}

function editBuilding({ buildingId, quality, district, iconKey, tags, specialEffect, stats, resourceRates }) {
  commit((draft) => {
    const building = draft.buildings.find((entry) => entry.id === buildingId);
    if (!building) {
      throw new Error("Building not found.");
    }
    setBuildingQuality(building, quality);
    building.district = district;
    building.iconKey = iconKey;
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
      tags,
      specialEffect,
      statOverrides: stats ?? draft.buildingCatalog[catalogKey]?.statOverrides ?? null
    };
  });
  reportSuccess("Building updated.");
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
    });
  },
  closeAdmin() {
    commit((draft) => {
      draft.ui.adminOpen = false;
    });
  },
  selectBuilding(buildingId) {
    commit((draft) => {
      draft.ui.selectedBuildingId = buildingId;
    });
  },
  adjustCrystal,
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
  editBuilding,
  removeBuilding(buildingId) {
    commit((draft) => removeBuilding(draft, buildingId));
    reportSuccess("Building removed.");
  },
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
  importSave(text) {
    gameState.replace(importSave(text));
    reportSuccess("Save imported.");
  },
  resetSave() {
    gameState.replace(resetSave());
    reportSuccess("Save reset.");
  },
  reportError
};

const adminConsole = new AdminConsole(actions);

gameState.subscribe((state) => {
  audioEngine.setMuted(state.settings.muted);
  saveGameState(state);
  renderer.render(state);
  adminConsole.render(state);
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
    case "select-building":
      commit((draft) => {
        draft.ui.selectedBuildingId = target.dataset.buildingId;
      });
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
      actions.openAdmin();
      break;
    default:
      break;
  }
});

root.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  if (target.dataset.action === "set-building-filter") {
    commit((draft) => {
      draft.buildingFilter = target.value;
    });
  }

  if (target.dataset.action === "set-speed-multiplier") {
    commit((draft) => {
      draft.constructionSpeedMultiplier = Number(target.value);
    });
  }
});

audioEngine.setMuted(getCurrentState().settings.muted);

if (!localStorage.getItem("crystal-forge-save")) {
  gameState.replace(createInitialState());
} else {
  renderer.render(getCurrentState());
  adminConsole.render(getCurrentState());
}
