import { MONTHS } from "../content/CalendarConfig.js";
import { createCatalogEntryFromInput, getBuildingEmoji, getCatalogKey } from "../content/BuildingCatalog.js";
import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js";
import { GM_QUICK_CRYSTAL_PACKS, GM_QUICK_EVENT_IDS, SAVE_SLOT_COUNT, SPEED_MULTIPLIERS } from "../content/Config.js";
import { EVENT_POOLS } from "../content/EventPools.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { attachHelpBubbles, createHelpBubble } from "../ui/HelpBubbles.js";
import { renderModal } from "../ui/Modal.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { formatBuildingQualityDisplay } from "../systems/BuildingSystem.js";
import { getDriftEvolutionStages } from "../systems/DriftEvolutionSystem.js";
import { getAllManualSaveMeta, getManualSaveMeta } from "../systems/StorageSystem.js";

function options(values, selectedValue) {
  return values
    .map((value) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

function rarityControls(state, kind) {
  return RARITY_ORDER.map(
    (rarity) => `
      <div class="admin-row">
        <span>${rarity}</span>
        <input type="number" id="${kind}-${rarity}" value="1" min="0" />
        <button class="button button--ghost" data-admin-action="${kind}-add" data-rarity="${rarity}">Add</button>
        <button class="button button--ghost" data-admin-action="${kind}-remove" data-rarity="${rarity}">Remove</button>
        <button class="button button--ghost" data-admin-action="${kind}-set" data-rarity="${rarity}">Set</button>
        <strong>${kind === "crystal" ? state.crystals[rarity] : state.shards[rarity]}</strong>
      </div>
    `
  ).join("");
}

function citizenControls(state) {
  return CITIZEN_GROUP_ORDER.map((groupTitle) => {
    const classes = CITIZEN_CLASSES.filter((citizenClass) => CITIZEN_DEFINITIONS[citizenClass]?.group === groupTitle);
    if (!classes.length) {
      return "";
    }
    const total = classes.reduce((sum, citizenClass) => sum + Number(state.citizens?.[citizenClass] ?? 0), 0);

    return `
      <section class="admin-citizen-group">
        <div class="admin-citizen-group__header">
          <div>
            <h4>${escapeHtml(groupTitle)}</h4>
            <p>${formatNumber(total, 0)} citizens</p>
          </div>
        </div>
        <div class="admin-citizen-group__rows">
          ${classes
            .map((citizenClass) => {
              const count = Number(state.citizens?.[citizenClass] ?? 0);
              const definition = CITIZEN_DEFINITIONS[citizenClass] ?? {};
              const emoji = definition.emoji ?? "*";
              return `
                <div class="admin-row admin-row--citizen">
                  <span class="admin-citizen-label">
                    <span class="admin-citizen-label__emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
                    <span>${escapeHtml(citizenClass)}</span>
                  </span>
                  ${createHelpBubble(getCitizenHelpText(citizenClass))}
                  <input type="number" id="citizen-${citizenClass}" value="1" min="0" />
                  <button class="button button--ghost" data-admin-action="citizen-add" data-citizen-class="${citizenClass}">Add</button>
                  <button class="button button--ghost" data-admin-action="citizen-remove" data-citizen-class="${citizenClass}">Remove</button>
                  <button class="button button--ghost" data-admin-action="citizen-set" data-citizen-class="${citizenClass}">Set</button>
                  <strong>${formatNumber(count, 0)}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }).join("");
}

function citizenOptions(selectedValue) {
  return CITIZEN_GROUP_ORDER.map((groupTitle) => {
    const classes = CITIZEN_CLASSES.filter((citizenClass) => CITIZEN_DEFINITIONS[citizenClass]?.group === groupTitle);
    if (!classes.length) {
      return "";
    }
    return `
      <optgroup label="${escapeHtml(groupTitle)}">
        ${classes
          .map((citizenClass) => {
            const emoji = CITIZEN_DEFINITIONS[citizenClass]?.emoji ?? "*";
            return `<option value="${escapeHtml(citizenClass)}" ${citizenClass === selectedValue ? "selected" : ""}>${escapeHtml(`${emoji} ${citizenClass}`)}</option>`;
          })
          .join("")}
      </optgroup>
    `;
  }).join("");
}

function townFocusOptions(selectedValue) {
  return Object.values(TOWN_FOCUS_DEFINITIONS)
    .map(
      (focus) =>
        `<option value="${escapeHtml(focus.id)}" ${focus.id === selectedValue ? "selected" : ""}>${escapeHtml(focus.name)}</option>`
    )
    .join("");
}

function renderRollTableListEditor(state) {
  return RARITY_ORDER.map(
    (rarity) => `
      <article class="rolltable-editor">
        <div class="rolltable-editor__header">
          <strong>${escapeHtml(rarity)}</strong>
          <span>${state.rollTables[rarity]?.length ?? 0} rollable building${(state.rollTables[rarity]?.length ?? 0) === 1 ? "" : "s"}</span>
        </div>
        <label>
          <span>${escapeHtml(rarity)} Pool</span>
          <textarea id="rolltable-list-${rarity}" rows="8">${escapeHtml((state.rollTables[rarity] ?? []).join("\n"))}</textarea>
        </label>
        <button class="button button--ghost" data-admin-action="set-rolltable-list" data-rarity="${rarity}">
          Apply ${escapeHtml(rarity)} List
        </button>
      </article>
    `
  ).join("");
}

function renderQuickCrystalPacks() {
  return `
    <div class="admin-quick-grid">
      ${GM_QUICK_CRYSTAL_PACKS.map(
        (pack) => `
          <button class="button button--ghost admin-quick-card" data-admin-action="grant-crystal-pack" data-pack-id="${pack.id}">
            <strong>${escapeHtml(pack.label)}</strong>
            <span>${escapeHtml(pack.summary)}</span>
          </button>
        `
      ).join("")}
    </div>
  `;
}

function renderQuickEvents() {
  const quickEvents = EVENT_POOLS.filter((event) => GM_QUICK_EVENT_IDS.includes(event.id));
  return `
    <div class="admin-quick-grid">
      ${quickEvents.map(
        (event) => `
          <button class="button button--ghost admin-quick-card" data-admin-action="trigger-quick-event" data-event-id="${event.id}">
            <strong>${escapeHtml(event.name)}</strong>
            <span>${escapeHtml(`${event.type} · ${event.rarity}`)}</span>
          </button>
        `
      ).join("")}
    </div>
  `;
}

function renderHelpActionButton(action, label, helpText) {
  return `
    <div class="admin-help-action">
      <button class="button button--ghost" data-admin-action="${escapeHtml(action)}">${escapeHtml(label)}</button>
      ${createHelpBubble(helpText)}
    </div>
  `;
}

function renderUnmanifestedBuildingOptions(state) {
  const optionsList = RARITY_ORDER.flatMap((rarity) =>
    (state.rollTables[rarity] ?? [])
      .filter((name) => !state.buildings.some((building) => building.name === name && building.rarity === rarity))
      .map((name) => {
        const catalogEntry = state.buildingCatalog[getCatalogKey(name, rarity)] ?? { name, rarity, iconKey: "spire", tags: [] };
        return {
          value: `${rarity}::${name}`,
          label: `${getBuildingEmoji(catalogEntry)} ${name} (${rarity})`
        };
      })
  );

  if (!optionsList.length) {
    return `<option value="">All rollable buildings are already manifested</option>`;
  }

  return optionsList
    .map(
      (entry, index) =>
        `<option value="${escapeHtml(entry.value)}" ${index === 0 ? "selected" : ""}>${escapeHtml(entry.label)}</option>`
    )
    .join("");
}

function renderManifestedBuildingAdminList(state) {
  const manifestedBuildings = [...state.buildings]
    .filter((building) => building.isComplete)
    .sort((left, right) => right.quality - left.quality);

  if (!manifestedBuildings.length) {
    return `<p class="empty-state">No manifested buildings are active right now.</p>`;
  }

  return `
    <div class="admin-active-building-list">
      ${manifestedBuildings
        .map(
          (building) => `
            <article class="admin-active-building-card">
              <div class="admin-active-building-card__meta">
                <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                <small>${building.mapPosition ? escapeHtml(`Placed at ${building.mapPosition.q}, ${building.mapPosition.r}`) : "Unplaced"} · ${escapeHtml(`${formatBuildingQualityDisplay(building)} quality`)}</small>
              </div>
              <button class="button button--ghost" data-admin-action="remove-active-building" data-building-id="${building.id}">
                Unmanifest
              </button>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

export class AdminConsole {
  constructor(actions) {
    this.actions = actions;
    this.root = document.createElement("div");
    this.root.className = "admin-root";
    this.keyBuffer = "";
    this.activeTab = "economy";
    this.searchQuery = "";
    this.selectedDriftStageId = "";
    this.lastState = null;
    document.body.append(this.root);

    document.addEventListener("keydown", (event) => {
      if (event.key.length !== 1 || !/[0-9!]/.test(event.key)) {
        return;
      }
      this.keyBuffer = `${this.keyBuffer}${event.key}`.slice(-4);
      if (this.keyBuffer === "432!") {
        this.actions.openAdmin();
        this.keyBuffer = "";
      }
    });

    this.root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-admin-action],[data-action],[data-admin-ui]");
      if (!target) {
        return;
      }

      if (target.dataset.adminUi === "tab") {
        this.activeTab = target.dataset.tab;
        if (this.lastState) {
          this.render(this.lastState);
        }
        return;
      }

      if (target.dataset.action === "close-modal") {
        this.actions.closeAdmin();
        return;
      }

      const action = target.dataset.adminAction;
      if (!action) {
        return;
      }

      this.handleAdminAction(action, target);
    });

    this.root.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.id === "edit-building-id") {
        this.actions.selectBuilding(target.value);
      } else if (target instanceof HTMLSelectElement && target.id === "drift-stage-id") {
        this.selectedDriftStageId = target.value;
        if (this.lastState) {
          this.render(this.lastState);
        }
      }
    });

    this.root.addEventListener("input", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.id === "admin-search") {
        this.searchQuery = target.value;
        if (this.lastState) {
          this.render(this.lastState);
        }
      }
    });
  }

  getNumberInput(id, fallback = 0) {
    const input = this.root.querySelector(`#${CSS.escape(id)}`);
    return input ? Number(input.value) : fallback;
  }

  getValue(id, fallback = "") {
    const input = this.root.querySelector(`#${CSS.escape(id)}`);
    return input ? input.value : fallback;
  }

  getJson(id) {
    const value = this.getValue(id, "");
    if (!value.trim()) {
      return null;
    }
    return JSON.parse(value);
  }

  handleAdminAction(action, target) {
    try {
      switch (action) {
        case "crystal-add":
        case "crystal-remove":
        case "crystal-set":
          this.actions.adjustCrystal({
            mode: action.split("-")[1],
            rarity: target.dataset.rarity,
            amount: this.getNumberInput(`crystal-${target.dataset.rarity}`, 0)
          });
          break;
        case "shard-add":
        case "shard-remove":
        case "shard-set":
          this.actions.adjustShard({
            mode: action.split("-")[1],
            rarity: target.dataset.rarity,
            amount: this.getNumberInput(`shard-${target.dataset.rarity}`, 0)
          });
          break;
        case "apply-resources":
          this.actions.setResources({
            gold: this.getNumberInput("resource-gold"),
            food: this.getNumberInput("resource-food"),
            materials: this.getNumberInput("resource-materials"),
            salvage: this.getNumberInput("resource-salvage"),
            mana: this.getNumberInput("resource-mana"),
            prosperity: this.getNumberInput("resource-prosperity")
          });
          break;
        case "citizen-add":
        case "citizen-remove":
        case "citizen-set":
          this.actions.citizenCommand({
            mode: action.split("-")[1],
            citizenClass: target.dataset.citizenClass,
            amount: this.getNumberInput(`citizen-${target.dataset.citizenClass}`, 0)
          });
          break;
        case "promote-citizens":
          this.actions.moveCitizens({
            mode: "promote",
            fromClass: this.getValue("promote-from"),
            toClass: this.getValue("promote-to"),
            amount: this.getNumberInput("promote-amount", 0)
          });
          break;
        case "demote-citizens":
          this.actions.moveCitizens({
            mode: "demote",
            fromClass: this.getValue("demote-from"),
            toClass: this.getValue("demote-to"),
            amount: this.getNumberInput("demote-amount", 0)
          });
          break;
        case "reset-citizens":
          this.actions.resetCitizens();
          break;
        case "bulk-citizens":
          this.actions.bulkCitizens(this.getJson("bulk-citizens"));
          break;
        case "spawn-building":
          this.actions.spawnBuilding({
            name: this.getValue("spawn-name"),
            rarity: this.getValue("spawn-rarity"),
            quality: this.getNumberInput("spawn-quality", 100),
            catalogEntry: createCatalogEntryFromInput({
              name: this.getValue("spawn-name"),
              rarity: this.getValue("spawn-rarity"),
              district: this.getValue("spawn-district"),
              tags: this.getValue("spawn-tags").split(","),
              iconKey: this.getValue("spawn-icon"),
              imagePath: this.getValue("spawn-image"),
              specialEffect: this.getValue("spawn-effect")
            })
          });
          break;
        case "manifest-unmanifested-building":
          this.actions.manifestUnmanifestedBuilding({
            selection: this.getValue("manifest-building-select"),
            quality: this.getNumberInput("manifest-building-quality", 100)
          });
          break;
        case "apply-bulk-building-images":
          this.actions.applyBulkBuildingImages(this.getValue("bulk-building-images"));
          break;
        case "save-building":
          this.actions.editBuilding({
            buildingId: this.getValue("edit-building-id"),
            quality: this.getNumberInput("edit-building-quality"),
            district: this.getValue("edit-building-district"),
            iconKey: this.getValue("edit-building-icon"),
            imagePath: this.getValue("edit-building-image"),
            tags: this.getValue("edit-building-tags").split(",").map((tag) => tag.trim()).filter(Boolean),
            specialEffect: this.getValue("edit-building-effect"),
            stats: this.getJson("edit-building-stats"),
            resourceRates: this.getJson("edit-building-resources")
          });
          break;
        case "remove-building":
          this.actions.removeBuilding(this.getValue("edit-building-id"));
          break;
        case "remove-active-building":
          this.actions.removeBuilding(target.dataset.buildingId);
          break;
        case "ruin-building":
          this.actions.setBuildingRuinState(this.getValue("edit-building-id"), true);
          break;
        case "repair-building":
          this.actions.setBuildingRuinState(this.getValue("edit-building-id"), false);
          break;
        case "set-building-placement":
          this.actions.setBuildingPlacement({
            buildingId: this.getValue("edit-building-id"),
            q: this.getNumberInput("edit-building-q"),
            r: this.getNumberInput("edit-building-r")
          });
          break;
        case "clear-building-placement":
          this.actions.clearBuildingPlacement(this.getValue("edit-building-id"));
          break;
        case "force-building-placement":
          this.actions.forceSetBuildingPlacement({
            buildingId: this.getValue("edit-building-id"),
            q: this.getNumberInput("edit-building-q"),
            r: this.getNumberInput("edit-building-r")
          });
          break;
        case "rolltable-add":
        case "rolltable-remove":
        case "rolltable-move":
        case "rolltable-rename":
          this.actions.manageRollTable({
            mode: action.split("-")[1],
            name: this.getValue("pool-name"),
            rarity: this.getValue("pool-rarity"),
            targetRarity: this.getValue("pool-target-rarity"),
            nextName: this.getValue("pool-next-name"),
            catalogEntry: createCatalogEntryFromInput({
              name: this.getValue("pool-name"),
              rarity: this.getValue("pool-rarity"),
              district: this.getValue("pool-district"),
              tags: this.getValue("pool-tags").split(","),
              iconKey: this.getValue("pool-icon"),
              imagePath: this.getValue("pool-image"),
              specialEffect: this.getValue("pool-effect"),
              statOverrides: this.getJson("pool-stats")
            })
          });
          break;
        case "set-rolltable-list":
          this.actions.setRollTableList({
            rarity: target.dataset.rarity,
            names: this.getValue(`rolltable-list-${target.dataset.rarity}`)
          });
          break;
        case "save-district":
          this.actions.saveDistrict({
            districtName: this.getValue("district-name"),
            definition: this.getJson("district-definition")
          });
          break;
        case "set-district-level":
          this.actions.setDistrictLevel({
            districtName: this.getValue("district-name"),
            level: this.getNumberInput("district-level")
          });
          break;
        case "reset-district-levels":
          this.actions.resetDistrictLevels();
          break;
        case "set-date":
          this.actions.setDate({
            year: this.getNumberInput("date-year"),
            month: this.getValue("date-month"),
            day: this.getNumberInput("date-day")
          });
          break;
        case "set-speed":
          this.actions.setSpeedMultiplier(this.getNumberInput("admin-speed"));
          break;
        case "set-town-focus":
          this.actions.setTownFocus(this.getValue("town-focus-id"));
          break;
        case "reopen-town-focus":
          this.actions.reopenTownFocus();
          break;
        case "trigger-event":
          this.actions.triggerEvent(this.getValue("event-select"));
          break;
        case "grant-crystal-pack":
          this.actions.grantCrystalPack(target.dataset.packId);
          break;
        case "trigger-quick-event":
          this.actions.triggerEvent(target.dataset.eventId);
          break;
        case "clear-events":
          this.actions.clearEvents();
          break;
        case "export-save":
          this.root.querySelector("#save-json").value = this.actions.exportSave();
          break;
        case "copy-save-json":
          this.actions.copySaveJson();
          break;
        case "import-save":
          this.actions.importSave(this.getValue("save-json"));
          break;
        case "load-shared-state-url":
          this.actions.loadSharedStateUrl(this.getValue("shared-save-url"));
          break;
        case "remember-shared-state-url":
          this.actions.rememberSharedStateUrl(this.getValue("shared-save-url"));
          break;
        case "toggle-shared-autoload":
          this.actions.toggleSharedStateAutoLoad();
          break;
        case "load-firebase-realm":
          this.actions.loadFirebaseRealm();
          break;
        case "load-firebase-working-realm":
          this.actions.loadFirebaseWorkingRealm();
          break;
        case "remember-firebase-realm":
          this.actions.rememberFirebaseRealmIds(
            this.getValue("firebase-published-realm-id"),
            this.getValue("firebase-working-realm-id")
          );
          break;
        case "set-firebase-publisher-uid":
          this.actions.setFirebasePublisherUidToCurrentBrowser();
          break;
        case "clear-firebase-publisher-uid":
          this.actions.clearFirebasePublisherUid();
          break;
        case "save-firebase-realm":
          this.actions.saveFirebaseRealm();
          break;
        case "publish-firebase-realm":
          this.actions.publishFirebaseRealm();
          break;
        case "publish-firebase-working-realm":
          this.actions.publishFirebaseWorkingRealm();
          break;
        case "toggle-firebase-autoload":
          this.actions.toggleFirebaseAutoLoad();
          break;
        case "toggle-firebase-live-sync":
          this.actions.toggleFirebaseLiveSync();
          break;
        case "toggle-firebase-auto-publish":
          this.actions.toggleFirebaseAutoPublish();
          break;
        case "reset-save":
          this.actions.resetSave();
          break;
        case "clear-buildings":
          this.actions.clearBuildings();
          break;
        case "full-reset":
          this.actions.fullReset();
          break;
        case "session-reset":
          this.actions.sessionReset();
          break;
        case "testing-reset":
          this.actions.testingReset();
          break;
        case "toggle-session-view":
          this.actions.toggleLiveSessionView();
          break;
        case "save-drift-stage":
          this.actions.saveDriftEvolutionStage({
            stageId: this.getValue("drift-stage-id"),
            patch: {
              name: this.getValue("drift-stage-name"),
              threshold: this.getNumberInput("drift-stage-threshold"),
              constructionSlots: this.getNumberInput("drift-stage-slots"),
              constructionSpeedPercent: this.getNumberInput("drift-stage-speed"),
              mobility: this.getValue("drift-stage-mobility"),
              summary: this.getValue("drift-stage-summary"),
              abilities: this
                .getValue("drift-stage-abilities")
                .split(/\r?\n/)
                .map((entry) => entry.trim())
                .filter(Boolean)
            }
          });
          break;
        case "save-manual-state":
          this.actions.saveManualState();
          break;
        case "load-manual-state":
          this.actions.loadManualState();
          break;
        case "set-active-save-slot":
          this.actions.setActiveSaveSlot(this.getValue("active-save-slot"));
          break;
        case "save-session-snapshot":
          this.actions.createSessionSnapshot(this.getValue("snapshot-name", "Session Snapshot"));
          break;
        case "restore-session-snapshot":
          this.actions.restoreSessionSnapshot(target.dataset.snapshotId);
          break;
        case "delete-session-snapshot":
          this.actions.deleteSessionSnapshot(target.dataset.snapshotId);
          break;
        default:
          break;
      }
    } catch (error) {
      this.actions.reportError(error.message);
    }
  }

  render(state) {
    this.lastState = state;
    const activeSaveSlot = Math.max(1, Math.min(SAVE_SLOT_COUNT, Number(state.settings.activeSaveSlot ?? 1) || 1));
    const manualSaveMeta = getManualSaveMeta(activeSaveSlot);
    const allSaveSlotMeta = getAllManualSaveMeta();
    const searchFilter = this.searchQuery.trim().toLowerCase();
    const matchingBuildings = state.buildings.filter((building) =>
      `${building.displayName} ${building.rarity} ${building.district} ${(building.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(searchFilter)
    );
    const filteredBuildings = matchingBuildings.length || !searchFilter ? matchingBuildings : state.buildings;
    const selectedBuilding =
      state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ??
      filteredBuildings[0] ??
      state.buildings[0];
    const selectedDistrict = state.districtSummary[0]?.name ?? "";
    const totalPopulation = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);
    const buildingOptions = [...new Map([selectedBuilding, ...filteredBuildings].filter(Boolean).map((building) => [building.id, building])).values()];
    const filteredEvents = EVENT_POOLS.filter((event) =>
      `${event.name} ${event.type} ${event.rarity}`.toLowerCase().includes(searchFilter)
    );
    const driftStages = getDriftEvolutionStages(state);
    const selectedDriftStage =
      driftStages.find((stage) => stage.id === (this.selectedDriftStageId || state.driftEvolution?.currentStageId)) ??
      driftStages[0];
    this.selectedDriftStageId = selectedDriftStage?.id ?? "";

    const sections = [
      {
        tab: "economy",
        title: "GM Quick Grants",
        keywords: "gm game master quick grant crystals session",
        content: `
          <section class="admin-section">
            <h3>GM Quick Grants</h3>
            <p>Fast companion-mode controls for live sessions.</p>
            ${renderQuickCrystalPacks()}
          </section>
        `
      },
      {
        tab: "economy",
        title: "Crystals",
        keywords: "crystals shards rarity economy",
        content: `
          <section class="admin-section">
            <h3>Crystals</h3>
            ${rarityControls(state, "crystal")}
          </section>
        `
      },
      {
        tab: "economy",
        title: "Shards",
        keywords: "shards crystals rarity economy",
        content: `
          <section class="admin-section">
            <h3>Shards</h3>
            ${rarityControls(state, "shard")}
          </section>
        `
      },
      {
        tab: "economy",
        title: "Resources",
        keywords: "resources gold food materials salvage mana prosperity",
        content: `
          <section class="admin-section">
            <h3>Resources</h3>
            <div class="admin-grid">
              <label>Gold<input id="resource-gold" type="number" value="${state.resources.gold}" /></label>
              <label>Food<input id="resource-food" type="number" value="${state.resources.food}" /></label>
              <label>Materials<input id="resource-materials" type="number" value="${state.resources.materials}" /></label>
              <label>Salvage<input id="resource-salvage" type="number" value="${state.resources.salvage ?? 0}" /></label>
              <label>Mana<input id="resource-mana" type="number" value="${state.resources.mana}" /></label>
              <label>Prosperity<input id="resource-prosperity" type="number" value="${state.resources.prosperity}" /></label>
              <label>Population<input id="resource-population" type="number" value="${state.resources.population}" disabled /></label>
            </div>
            <button class="button" data-admin-action="apply-resources">Apply Resources</button>
          </section>
        `
      },
      {
        tab: "population",
        title: "Citizen Management",
        keywords: "citizens farmers hunters fishermen scavengers laborers crafters techwrights merchants skycrew scouts defenders soldiers arcanists medics scribes nobles priests entertainers children elderly population",
        content: `
          <section class="admin-section">
            <h3>Citizen Management</h3>
            <p>Live total population: <strong>${totalPopulation}</strong></p>
            ${citizenControls(state)}
            <div class="admin-grid admin-grid--three">
              <label>From Class<select id="promote-from">${citizenOptions("Laborers")}</select></label>
              <label>To Class<select id="promote-to">${citizenOptions("Crafters")}</select></label>
              <label>Amount<input id="promote-amount" type="number" value="1" min="0" /></label>
            </div>
            <button class="button button--ghost" data-admin-action="promote-citizens">Promote</button>
            <div class="admin-grid admin-grid--three">
              <label>From Class<select id="demote-from">${citizenOptions("Farmers")}</select></label>
              <label>To Class<select id="demote-to">${citizenOptions("Laborers")}</select></label>
              <label>Amount<input id="demote-amount" type="number" value="1" min="0" /></label>
            </div>
            <button class="button button--ghost" data-admin-action="demote-citizens">Demote</button>
            <label>Bulk JSON<textarea id="bulk-citizens" rows="4" placeholder='{"Farmers":52,"Soldiers":12,"Children":28}'></textarea></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="bulk-citizens">Apply Bulk</button>
              <button class="button button--ghost" data-admin-action="reset-citizens">Reset Citizens</button>
            </div>
          </section>
        `
      },
      {
        tab: "population",
        title: "Districts",
        keywords: "districts levels bonuses map",
        content: `
          <section class="admin-section">
            <h3>Districts</h3>
            <div class="admin-grid">
              <label>District Name<input id="district-name" value="${escapeHtml(selectedDistrict)}" /></label>
              <label>Level Override<input id="district-level" type="number" value="0" min="0" /></label>
            </div>
            <label>Definition JSON<textarea id="district-definition" rows="5">${escapeHtml(
              JSON.stringify(state.districts.definitions[selectedDistrict] ?? {}, null, 2)
            )}</textarea></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="save-district">Save District</button>
              <button class="button button--ghost" data-admin-action="set-district-level">Set Level</button>
              <button class="button button--ghost" data-admin-action="reset-district-levels">Reset Levels</button>
            </div>
          </section>
        `
      },
      {
        tab: "world",
        title: "Buildings",
        keywords: "buildings manifest unmanifested spawn edit remove placement map art image",
        content: `
          <section class="admin-section">
            <h3>Buildings</h3>
            <p>Optional artwork folder: <code>assets/images/buildings/</code></p>
            <p>Active manifested buildings can be unmanifested directly from this list.</p>
            ${renderManifestedBuildingAdminList(state)}
            <label>
              Bulk Image Paths
              <textarea id="bulk-building-images" rows="8" placeholder="Paste lines like: Blacksmith -> ./assets/images/buildings/Blacksmith.png&#10;or CSV rows like: Blacksmith,./assets/images/buildings/Blacksmith.png"></textarea>
            </label>
            <p>
              You can paste directly from <code>BUILDING_IMAGE_PATHS_FOR_ADMIN.txt</code> or <code>BUILDING_IMAGE_PATHS.csv</code>.
              Both formats are supported here.
            </p>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="apply-bulk-building-images">Apply Bulk Image Paths</button>
            </div>
            <div class="admin-grid">
              <label>Unmanifested Rollable Building<select id="manifest-building-select">${renderUnmanifestedBuildingOptions(state)}</select></label>
              <label>Chosen Quality<input id="manifest-building-quality" type="number" value="100" min="1" max="350" /></label>
            </div>
            <div class="admin-actions">
              <button class="button" data-admin-action="manifest-unmanifested-building">Manifest Selected Unmanifested Building</button>
            </div>

            <div class="admin-grid">
              <label>Name<input id="spawn-name" value="Custom Tower" /></label>
              <label>Rarity<select id="spawn-rarity">${options(RARITY_ORDER, "Common")}</select></label>
              <label>Quality<input id="spawn-quality" type="number" value="100" min="0" max="350" /></label>
              <label>District<input id="spawn-district" value="Arcane District" /></label>
              <label>Tags<input id="spawn-tags" value="arcane,civic" /></label>
              <label>Icon Key<input id="spawn-icon" value="star" /></label>
              <label>Image Path<input id="spawn-image" value="./assets/images/buildings/Custom Tower.png" /></label>
            </div>
            <label>Special Effect<textarea id="spawn-effect" rows="2"></textarea></label>
            <button class="button" data-admin-action="spawn-building">Spawn Building</button>

            <div class="admin-grid">
              <label>Edit Building<select id="edit-building-id">${buildingOptions.map((building) => `<option value="${building.id}" ${selectedBuilding?.id === building.id ? "selected" : ""}>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName} (${building.rarity})`)}</option>`).join("")}</select></label>
              <label>Quality<input id="edit-building-quality" type="number" value="${selectedBuilding?.quality ?? 100}" min="0" max="350" /></label>
              <label>District<input id="edit-building-district" value="${escapeHtml(selectedBuilding?.district ?? "Residential District")}" /></label>
              <label>Icon Key<input id="edit-building-icon" value="${escapeHtml(selectedBuilding?.iconKey ?? "spire")}" /></label>
              <label>Image Path<input id="edit-building-image" value="${escapeHtml(selectedBuilding?.imagePath ?? "")}" /></label>
              <label>Tags<input id="edit-building-tags" value="${escapeHtml((selectedBuilding?.tags ?? []).join(","))}" /></label>
            </div>
            <label>Special Effect<textarea id="edit-building-effect" rows="2">${escapeHtml(selectedBuilding?.specialEffect ?? "")}</textarea></label>
            <label>Stats JSON<textarea id="edit-building-stats" rows="4">${escapeHtml(JSON.stringify(selectedBuilding?.stats ?? {}, null, 2))}</textarea></label>
            <label>Resource Rates JSON<textarea id="edit-building-resources" rows="4">${escapeHtml(JSON.stringify(selectedBuilding?.resourceRates ?? {}, null, 2))}</textarea></label>
            <div class="admin-grid admin-grid--three">
              <label>Hex Q<input id="edit-building-q" type="number" value="${selectedBuilding?.mapPosition?.q ?? 0}" /></label>
              <label>Hex R<input id="edit-building-r" type="number" value="${selectedBuilding?.mapPosition?.r ?? 0}" /></label>
              <label>Current Hex<input value="${escapeHtml(selectedBuilding?.mapPosition ? `${selectedBuilding.mapPosition.q}, ${selectedBuilding.mapPosition.r}` : "Unplaced")}" readonly /></label>
            </div>
            <p><code>Set Placement</code> respects map rules. <code>Force Place</code> can override the forge core and occupied hexes.</p>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="save-building">Save Building</button>
              <button class="button button--ghost" data-admin-action="ruin-building">Ruin Building</button>
              <button class="button button--ghost" data-admin-action="repair-building">Repair Building</button>
              <button class="button button--ghost" data-admin-action="set-building-placement">Set Placement</button>
              <button class="button button--ghost" data-admin-action="force-building-placement">Force Place</button>
              <button class="button button--ghost" data-admin-action="clear-building-placement">Clear Placement</button>
              <button class="button button--ghost" data-admin-action="remove-building">Remove Building</button>
            </div>
          </section>
        `
      },
      {
        tab: "world",
        title: "Roll Tables",
        keywords: "roll tables rarity pools catalog",
        content: `
          <section class="admin-section">
            <h3>Roll Tables</h3>
            <p>Edit each rarity pool directly. Use one building name per line, then apply the list for that rarity.</p>
            <div class="rolltable-editor-grid">
              ${renderRollTableListEditor(state)}
            </div>
          </section>
          <section class="admin-section">
            <h3>Single Entry Tools</h3>
            <div class="admin-grid">
              <label>Name<input id="pool-name" value="Custom Tower" /></label>
              <label>Rarity<select id="pool-rarity">${options(RARITY_ORDER, "Common")}</select></label>
              <label>Target Rarity<select id="pool-target-rarity">${options(RARITY_ORDER, "Rare")}</select></label>
              <label>Rename To<input id="pool-next-name" value="Custom Tower Mk II" /></label>
              <label>District<input id="pool-district" value="Arcane District" /></label>
              <label>Tags<input id="pool-tags" value="arcane,civic" /></label>
              <label>Icon Key<input id="pool-icon" value="star" /></label>
              <label>Image Path<input id="pool-image" value="./assets/images/buildings/Custom Tower.png" /></label>
            </div>
            <label>Special Effect<textarea id="pool-effect" rows="2"></textarea></label>
            <label>Stat Overrides JSON<textarea id="pool-stats" rows="4"></textarea></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="rolltable-add">Add to Pool</button>
              <button class="button button--ghost" data-admin-action="rolltable-remove">Remove from Pool</button>
              <button class="button button--ghost" data-admin-action="rolltable-move">Move Between Rarities</button>
              <button class="button button--ghost" data-admin-action="rolltable-rename">Rename Building</button>
            </div>
          </section>
        `
      },
      {
        tab: "world",
        title: "GM Quick Events",
        keywords: "events quick gm trigger session",
        content: `
          <section class="admin-section">
            <h3>GM Quick Events</h3>
            <p>Trigger a few common table-side moments without opening the full event list.</p>
            ${renderQuickEvents()}
          </section>
        `
      },
      {
        tab: "world",
        title: "Events",
        keywords: "events trigger chains clear",
        content: `
          <section class="admin-section">
            <h3>Events</h3>
            <label>Manual Trigger<select id="event-select">${(filteredEvents.length ? filteredEvents : EVENT_POOLS).map((event) => `<option value="${event.id}">${escapeHtml(event.name)}</option>`).join("")}</select></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="trigger-event">Trigger Event</button>
              <button class="button button--ghost" data-admin-action="clear-events">Clear Active Events</button>
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Session Mode",
        keywords: "session live gm mode compact companion",
        content: `
          <section class="admin-section">
            <h3>Session Mode</h3>
            <p>Use the cleaner session-facing layout during live play, then switch back for deeper review.</p>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="toggle-session-view">
                ${state.settings.liveSessionView ? "Disable Live Session View" : "Enable Live Session View"}
              </button>
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Drift Evolution",
        keywords: "drift evolution stages abilities thresholds mobility",
        content: `
          <section class="admin-section">
            <h3>Drift Evolution</h3>
            <p>Edit stage definitions for this save if you need to tune the Drift live.</p>
            <div class="admin-grid">
              <label>Stage<select id="drift-stage-id">${driftStages
                .map(
                  (stage) =>
                    `<option value="${stage.id}" ${stage.id === selectedDriftStage?.id ? "selected" : ""}>${escapeHtml(stage.name)}</option>`
                )
                .join("")}</select></label>
              <label>Name<input id="drift-stage-name" value="${escapeHtml(selectedDriftStage?.name ?? "")}" /></label>
              <label>Threshold<input id="drift-stage-threshold" type="number" value="${selectedDriftStage?.threshold ?? 0}" min="0" /></label>
              <label>Build Slots<input id="drift-stage-slots" type="number" value="${selectedDriftStage?.constructionSlots ?? 0}" min="1" /></label>
              <label>Speed %<input id="drift-stage-speed" type="number" value="${selectedDriftStage?.constructionSpeedPercent ?? 0}" min="0" /></label>
              <label>Mobility<input id="drift-stage-mobility" value="${escapeHtml(selectedDriftStage?.mobility ?? "")}" /></label>
            </div>
            <label>Summary<textarea id="drift-stage-summary" rows="3">${escapeHtml(selectedDriftStage?.summary ?? "")}</textarea></label>
            <label>Abilities<textarea id="drift-stage-abilities" rows="5">${escapeHtml((selectedDriftStage?.abilities ?? []).join("\n"))}</textarea></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="save-drift-stage">Save Drift Stage</button>
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Time and Construction",
        keywords: "time construction speed calendar",
        content: `
          <section class="admin-section">
            <h3>Time and Construction</h3>
            <div class="admin-grid admin-grid--three">
              <label>Year<input id="date-year" type="number" value="1218" /></label>
              <label>Month<select id="date-month">${options(MONTHS, "Firethorn")}</select></label>
              <label>Day<input id="date-day" type="number" value="17" min="1" max="28" /></label>
            </div>
            <button class="button button--ghost" data-admin-action="set-date">Set Current Date</button>
            <label>Construction Speed<select id="admin-speed">${options(SPEED_MULTIPLIERS.map(String), String(state.constructionSpeedMultiplier))}</select></label>
            <button class="button button--ghost" data-admin-action="set-speed">Set Speed</button>
          </section>
        `
      },
      {
        tab: "system",
        title: "Town Focus",
        keywords: "town focus council mayor",
        content: `
          <section class="admin-section">
            <h3>Town Focus</h3>
            <p>Current focus: <strong>${escapeHtml(TOWN_FOCUS_DEFINITIONS[state.townFocus.currentFocusId]?.name ?? "None")}</strong></p>
            <p>Next council date: <strong>${formatDate(state.townFocus.nextSelectionDayOffset)}</strong></p>
            <p>Selection pending: <strong>${state.townFocus.isSelectionPending ? "Yes" : "No"}</strong></p>
            <label>Focus<select id="town-focus-id">${townFocusOptions(state.townFocus.currentFocusId ?? "food-production")}</select></label>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="set-town-focus">Force Focus</button>
              <button class="button button--ghost" data-admin-action="reopen-town-focus">Reopen Council</button>
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Session Snapshots",
        keywords: "session snapshots save restore gm checkpoints",
        content: `
          <section class="admin-section">
            <h3>Session Snapshots</h3>
            <div class="admin-grid">
              <label>Snapshot Name<input id="snapshot-name" value="Session Snapshot" /></label>
            </div>
            <div class="admin-actions">
              <button class="button button--ghost" data-admin-action="save-session-snapshot">Save Snapshot</button>
            </div>
            <div class="admin-quick-grid">
              ${
                (state.sessionSnapshots ?? []).length
                  ? state.sessionSnapshots
                      .map(
                        (snapshot) => `
                          <article class="admin-snapshot-card">
                            <strong>${escapeHtml(snapshot.name)}</strong>
                            <span>${escapeHtml(snapshot.dateLabel ?? "Unknown date")}</span>
                            <small>${snapshot.buildingCount ?? 0} building${snapshot.buildingCount === 1 ? "" : "s"}</small>
                            <div class="admin-actions">
                              <button class="button button--ghost" data-admin-action="restore-session-snapshot" data-snapshot-id="${snapshot.id}">Restore</button>
                              <button class="button button--ghost" data-admin-action="delete-session-snapshot" data-snapshot-id="${snapshot.id}">Delete</button>
                            </div>
                          </article>
                        `
                      )
                      .join("")
                  : `<p class="empty-state">No session snapshots saved yet.</p>`
              }
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Save Tools",
        keywords: "save import export reset audio",
        content: `
          <section class="admin-section">
            <h3>Save Tools</h3>
            <p>Optional sound folder: <code>assets/audio/</code>. Matching rarity and ambient files will override synthesized audio automatically.</p>
            <label>Active Save Slot<select id="active-save-slot">${Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => {
              const slot = index + 1;
              return `<option value="${slot}" ${slot === activeSaveSlot ? "selected" : ""}>Slot ${slot}</option>`;
            }).join("")}</select></label>
            ${
              manualSaveMeta?.manualSavedAt
                ? `
                  <p>
                    Active slot ${activeSaveSlot}:
                    <strong>${escapeHtml(new Date(manualSaveMeta.manualSavedAt).toLocaleString())}</strong>
                    · ${manualSaveMeta.buildingCount} building${manualSaveMeta.buildingCount === 1 ? "" : "s"}
                    · population ${manualSaveMeta.population}
                  </p>
                `
                : `<p>No save recorded yet in slot ${activeSaveSlot}.</p>`
            }
            <div class="admin-slot-summary">
              ${allSaveSlotMeta
                .map(
                  (slotMeta) => `
                    <article class="admin-slot-summary__item ${slotMeta.slot === activeSaveSlot ? "is-active" : ""}">
                      <strong>Slot ${slotMeta.slot}</strong>
                      <span>${slotMeta.manualSavedAt ? escapeHtml(new Date(slotMeta.manualSavedAt).toLocaleString()) : "Empty"}</span>
                      <em>${slotMeta.buildingCount} building${slotMeta.buildingCount === 1 ? "" : "s"} · population ${slotMeta.population}</em>
                    </article>
                  `
                )
                .join("")}
            </div>
            <textarea id="save-json" rows="10"></textarea>
            <label>Shared Save URL<input id="shared-save-url" value="${escapeHtml(state.settings.sharedStateUrl ?? "")}" placeholder="https://.../save.json" /></label>
            <p>Best for public raw JSON links. A public direct-download Google Drive link may work if it allows browser fetch access.</p>
            <p>
              Shared source:
              <strong>${escapeHtml(state.settings.sharedStateUrl || "None set")}</strong>
              · Auto-load:
              <strong>${state.settings.autoLoadSharedState ? "Enabled" : "Disabled"}</strong>
            </p>
            <div class="admin-actions admin-actions--with-help">
              ${renderHelpActionButton("set-active-save-slot", "Use Slot", "Switches the active manual save slot. Future local saves and loads use this slot until you change it again.")}
              ${renderHelpActionButton("save-manual-state", "Save Local State", "Stores the full current campaign in the selected local slot on this browser only.")}
              ${renderHelpActionButton("load-manual-state", "Load Local State", "Loads the selected local slot from this browser and replaces the current session state.")}
              ${renderHelpActionButton("export-save", "Export Save JSON", "Writes the current campaign state into the JSON box so you can copy or download it manually.")}
              ${renderHelpActionButton("copy-save-json", "Copy Save JSON", "Copies the current campaign state as raw JSON to your clipboard.")}
              ${renderHelpActionButton("import-save", "Import Save JSON", "Loads the JSON currently pasted into the big save box and replaces the current session.")}
              ${renderHelpActionButton("load-shared-state-url", "Load Shared URL", "Fetches a public JSON save from the shared URL field and loads it immediately.")}
              ${renderHelpActionButton("remember-shared-state-url", "Remember Shared URL", "Stores the shared URL in this browser so it can be reused later.")}
              ${renderHelpActionButton("toggle-shared-autoload", state.settings.autoLoadSharedState ? "Disable Shared Auto-Load" : "Enable Shared Auto-Load", "When enabled, this browser tries to load the remembered shared URL automatically on startup.")}
              ${renderHelpActionButton("clear-buildings", "Delete All Buildings", "Removes all buildings from the realm without resetting the rest of the save.")}
              ${renderHelpActionButton("reset-save", "Reset Save", "Returns the campaign to the standard reset state for this build.")}
              ${renderHelpActionButton("session-reset", "Reset to Live Session", "Resets the campaign to the lighter table-ready live session preset.")}
              ${renderHelpActionButton("testing-reset", "Reset to Testing State", "Resets the campaign to the richer testing preset with extra crystals and stockpiles.")}
              ${renderHelpActionButton("full-reset", "Full Reset (1 Common Crystal)", "Wipes the realm to a bare-minimum start with only one Common crystal.")}
            </div>
          </section>
        `
      },
      {
        tab: "system",
        title: "Firebase Realm",
        keywords: "firebase realm shared sync autosave load save published working",
        content: `
          <section class="admin-section">
            <h3>Firebase Realm</h3>
            <p>Use a stable published save for testers and a separate working save for GM edits. Testers only change when you explicitly publish.</p>
            <label>Published Realm ID<input id="firebase-published-realm-id" value="${escapeHtml(state.settings.firebasePublishedRealmId ?? state.settings.firebaseRealmId ?? "main")}" placeholder="main" /></label>
            <label>Working Realm ID<input id="firebase-working-realm-id" value="${escapeHtml(state.settings.firebaseWorkingRealmId ?? "main-working")}" placeholder="main-working" /></label>
            <p>
              GM publisher UID:
              <strong>${escapeHtml(state.settings.firebasePublisherUid || "Not set")}</strong>
            </p>
            <p>
              Published:
              <strong>${escapeHtml(state.settings.firebasePublishedRealmId ?? state.settings.firebaseRealmId ?? "main")}</strong>
              Â· Working:
              <strong>${escapeHtml(state.settings.firebaseWorkingRealmId ?? "main-working")}</strong>
              · Auto-load:
              <strong>${state.settings.firebaseAutoLoad ? "Enabled" : "Disabled"}</strong>
              · Live sync:
              <strong>${state.settings.firebaseLiveSync ? "Enabled" : "Disabled"}</strong>
              · Auto-publish:
              <strong>${state.settings.firebaseAutoPublish ? "Enabled" : "Disabled"}</strong>
            </p>
              <div class="admin-actions admin-actions--with-help">
                ${renderHelpActionButton("set-firebase-publisher-uid", "Use Current Browser As GM Publisher", "Marks this browser's Firebase identity as the allowed GM publisher for protected write actions.")}
                ${renderHelpActionButton("clear-firebase-publisher-uid", "Clear GM Publisher", "Removes the stored GM publisher UID so no browser is currently trusted to publish.")}
                ${renderHelpActionButton("load-firebase-realm", "Load Published", "Loads the stable published realm that players should currently be seeing.")}
                ${renderHelpActionButton("load-firebase-working-realm", "Load Working", "Loads the GM working draft realm without changing the published player state.")}
                ${renderHelpActionButton("remember-firebase-realm", "Remember Realm IDs", "Stores the published and working Firebase realm IDs in this browser for future sessions.")}
                ${renderHelpActionButton("save-firebase-realm", "Save Current to Working", "Saves the current GM state into the working Firebase realm without publishing it to players.")}
                ${renderHelpActionButton("publish-firebase-realm", "Publish Current to Testers", "Immediately overwrites the published player realm with the state currently loaded in this browser.")}
                ${renderHelpActionButton("publish-firebase-working-realm", "Publish Working to Testers", "Publishes the saved working Firebase realm to players without first loading it locally.")}
                ${renderHelpActionButton("toggle-firebase-autoload", state.settings.firebaseAutoLoad ? "Disable Published Auto-Load" : "Enable Published Auto-Load", "When enabled, this browser automatically loads the published Firebase realm on startup.")}
                ${renderHelpActionButton("toggle-firebase-live-sync", state.settings.firebaseLiveSync ? "Disable Published Live Sync" : "Enable Published Live Sync", "When enabled, this browser listens for published Firebase changes in real time.")}
                ${renderHelpActionButton("toggle-firebase-auto-publish", state.settings.firebaseAutoPublish ? "Disable Working Auto-Save" : "Enable Working Auto-Save", "When enabled, GM save actions keep the working Firebase realm updated automatically.")}
            </div>
          </section>
        `
      }
    ];

    const visibleSections = sections.filter((section) => {
      if (section.tab !== this.activeTab) {
        return false;
      }
      if (!searchFilter) {
        return true;
      }
      return `${section.title} ${section.keywords}`.toLowerCase().includes(searchFilter);
    });

    const content = `
      <div class="admin-console">
        <div class="admin-toolbar">
          <div class="admin-tabs">
            <button class="button button--ghost ${this.activeTab === "economy" ? "is-active" : ""}" data-admin-ui="tab" data-tab="economy">Economy</button>
            <button class="button button--ghost ${this.activeTab === "population" ? "is-active" : ""}" data-admin-ui="tab" data-tab="population">Population</button>
            <button class="button button--ghost ${this.activeTab === "world" ? "is-active" : ""}" data-admin-ui="tab" data-tab="world">World</button>
            <button class="button button--ghost ${this.activeTab === "system" ? "is-active" : ""}" data-admin-ui="tab" data-tab="system">System</button>
          </div>
          <label class="admin-search">
            <span>Search</span>
            <input id="admin-search" value="${escapeHtml(this.searchQuery)}" placeholder="Filter this tab" />
          </label>
        </div>
        ${
          visibleSections.length
            ? visibleSections.map((section) => section.content).join("")
            : `<section class="admin-section"><p class="empty-state">No admin panels match "${escapeHtml(this.searchQuery)}" in this tab.</p></section>`
        }
      </div>
    `;

    this.root.innerHTML = renderModal({
      id: "admin-console-modal",
      title: "Crystal Forge Admin Console",
      content,
      open: state.ui.adminOpen,
      wide: true
    });
    attachHelpBubbles(this.root);
  }
}
