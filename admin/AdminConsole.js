// GM/admin console renderer and input handler.
// This file builds the hidden administration UI, unlock flow, and the direct
// controls that modify crystals, buildings, citizens, events, and save tools.
import { MONTHS } from "../content/CalendarConfig.js";
import { createCatalogEntryFromInput, getBuildingEmoji, getCatalogKey } from "../content/BuildingCatalog.js";
import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js";
import { GM_QUICK_CRYSTAL_PACKS, GM_QUICK_EVENT_IDS, SPEED_MULTIPLIERS } from "../content/Config.js";
import { EVENT_POOLS } from "../content/EventPools.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { attachHelpBubbles, createHelpBubble } from "../ui/HelpBubbles.js";
import { renderModal } from "../ui/Modal.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { formatBuildingQualityDisplay } from "../systems/BuildingSystem.js";
import { getDriftEvolutionStages } from "../systems/DriftEvolutionSystem.js";
import { getEconomyDebugSummary, getEconomyTopContributorsSummary } from "../systems/ResourceSystem.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";

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
    (rarity) => {
      const visibleEntries = (state.rollTables[rarity] ?? []).filter((name) => name !== "Crystal Upgrade");
      return `
      <article class="rolltable-editor">
        <div class="rolltable-editor__header">
          <strong>${escapeHtml(rarity)}</strong>
          <span>${visibleEntries.length} rollable building${visibleEntries.length === 1 ? "" : "s"}</span>
        </div>
        <label>
          <span>${escapeHtml(rarity)} Pool</span>
          <textarea id="rolltable-list-${rarity}" rows="8">${escapeHtml((state.rollTables[rarity] ?? []).join("\n"))}</textarea>
        </label>
        <button class="button button--ghost" data-admin-action="set-rolltable-list" data-rarity="${rarity}">
          Apply ${escapeHtml(rarity)} List
        </button>
      </article>
    `;
    }
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
      .filter((name) => name !== "Crystal Upgrade")
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
    return `<p class="empty-state">No active buildings exist right now.</p>`;
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
                <small>${building.mapPosition ? escapeHtml(`Placed at ${building.mapPosition.q}, ${building.mapPosition.r}`) : "Unplaced"} · ${escapeHtml(`Stage ${formatBuildingQualityDisplay(building)}`)}</small>
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

function renderEconomyDebugTable(state) {
  const debug = getEconomyDebugSummary(state);
  const topContributors = getEconomyTopContributorsSummary(state);
  const goodsTotal = Number(state.cityStats?.goods ?? 0);
  const goodsOverride = Number(state.adminOverrides?.goods ?? 0);
  const renderContributorPills = (entries) => {
    if (!entries.length) {
      return '<span class="admin-contributor-pill admin-contributor-pill--neutral">none</span>';
    }
    return entries
      .map((entry) => {
        const toneClass = entry.amount > 0.005
          ? "admin-contributor-pill--positive"
          : entry.amount < -0.005
            ? "admin-contributor-pill--negative"
            : "admin-contributor-pill--neutral";
        return `<span class="admin-contributor-pill ${toneClass}"><strong>${escapeHtml(entry.label)}</strong><em>${escapeHtml(entry.channel)}</em><span>${entry.amount >= 0 ? "+" : ""}${formatNumber(entry.amount, 2)}</span></span>`;
      })
      .join("");
  };
  const renderContributorSection = (label, entries) => {
    const resourceGlyph = {
      "Top Gold": "$",
      "Top Food": "◒",
      "Top Materials": "▦",
      "Top Salvage": "⛭",
      "Top Mana": "✦"
    }[label] ?? "•";
    const positiveEntries = entries.filter((entry) => entry.amount > 0.005);
    const negativeEntries = entries.filter((entry) => entry.amount < -0.005);

    return `
      <div class="admin-contributor-row">
        <div class="admin-contributor-row__label"><span class="admin-contributor-row__glyph" aria-hidden="true">${escapeHtml(resourceGlyph)}</span><strong>${escapeHtml(label)}:</strong></div>
        <div class="admin-contributor-row__groups">
          <div class="admin-contributor-group">
            <span class="admin-contributor-group__label admin-contributor-group__label--positive"><span class="admin-contributor-group__icon" aria-hidden="true">↗</span> Gains</span>
            <div class="admin-contributor-group__pills">${renderContributorPills(positiveEntries)}</div>
          </div>
          <div class="admin-contributor-group">
            <span class="admin-contributor-group__label admin-contributor-group__label--negative"><span class="admin-contributor-group__icon" aria-hidden="true">↘</span> Drains</span>
            <div class="admin-contributor-group__pills">${renderContributorPills(negativeEntries)}</div>
          </div>
        </div>
      </div>
    `;
  };
  return `
    <section class="admin-section">
      <h3>Economy Debug</h3>
      <p>Use this to compare current stock against base building output, district bonuses, citizen flow, and event or focus modifiers.</p>
      <div class="admin-debug-meta">
        <span>Goods: ${formatNumber(goodsTotal, 2)}</span>
        <span>GM goods: ${goodsOverride >= 0 ? "+" : ""}${formatNumber(goodsOverride, 2)}</span>
        <span>Trade from goods: x${debug.modifiers.tradeGoodsGoldMultiplier.toFixed(2)}</span>
        <span>Gold output: x${debug.modifiers.goldOutputMultiplier.toFixed(2)}</span>
        <span>Food output: x${debug.modifiers.foodOutputMultiplier.toFixed(2)}</span>
      </div>
      <div class="admin-debug-table-wrap">
        <table class="admin-debug-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Stock</th>
              <th>Buildings</th>
              <th>District</th>
              <th>Citizens +</th>
              <th>Citizens -</th>
              <th>Events</th>
              <th>Focus</th>
              <th>Net / Day</th>
            </tr>
          </thead>
          <tbody>
            ${debug.rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.resource)}</td>
                    <td>${formatNumber(row.stock, 2)}</td>
                    <td>${formatNumber(row.buildingBaseProduction, 2)}</td>
                    <td>${formatNumber(row.districtBonus, 2)}</td>
                    <td>${formatNumber(row.citizenProduction, 2)}</td>
                    <td>${formatNumber(row.citizenConsumption, 2)}</td>
                    <td>${formatNumber(row.eventProduction, 2)}</td>
                    <td>${formatNumber(row.focusProduction, 2)}</td>
                    <td class="${row.net > 0.005 ? "is-positive" : row.net < -0.005 ? "is-negative" : "is-neutral"}">${formatNumber(row.net, 2)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="admin-contributor-stack">
        ${renderContributorSection("Top Gold", topContributors.gold)}
        ${renderContributorSection("Top Food", topContributors.food)}
        ${renderContributorSection("Top Materials", topContributors.materials)}
        ${renderContributorSection("Top Salvage", topContributors.salvage)}
        ${renderContributorSection("Top Mana", topContributors.mana)}
      </div>
      ${
        debug.districtModifiers.length
          ? `<p class="admin-debug-note">District modifiers: ${escapeHtml(debug.districtModifiers.join(" | "))}</p>`
          : `<p class="admin-debug-note">District modifiers: none active.</p>`
      }
    </section>
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
            prosperity: this.getNumberInput("resource-prosperity"),
            goods: this.getNumberInput("resource-goods")
          });
          break;
        case "reset-goods-override":
          this.actions.resetGoodsOverride();
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
        case "save-active-building-quality":
          this.actions.setBuildingQuality({
            buildingId: target.dataset.buildingId,
            quality: this.getNumberInput(`active-building-quality-${target.dataset.buildingId}`),
            source: "GM Console"
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
        case "load-firebase-realm":
          this.actions.loadFirebaseRealm();
          break;
        case "save-firebase-realm":
          this.actions.saveFirebaseRealm();
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
        default:
          break;
      }
    } catch (error) {
      this.actions.reportError(error.message);
    }
  }

  render(state) {
    this.lastState = state;
    const manualSaveMeta = getManualSaveMeta();
    const firebaseMeta = state.transientUi?.firebasePublishedMeta ?? null;
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
              <label>Goods<input id="resource-goods" type="number" value="${formatNumber(state.cityStats?.goods ?? 0, 2)}" step="0.1" /></label>
              <label>Population<input id="resource-population" type="number" value="${state.resources.population}" disabled /></label>
            </div>
            <p class="admin-debug-note">Saving Goods applies a GM override on top of normal goods production.</p>
            <div class="admin-actions">
              <button class="button" data-admin-action="apply-resources">Apply Resources</button>
              <button class="button button--ghost" data-admin-action="reset-goods-override">Reset GM Goods Override</button>
            </div>
          </section>
          ${renderEconomyDebugTable(state)}
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
            <p>Active buildings can be removed directly from this list.</p>
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
              <label>Manifest Unmanifested Building<select id="manifest-building-select">${renderUnmanifestedBuildingOptions(state)}</select></label>
              <label>Manifest Quality %<input id="manifest-building-quality" type="number" value="100" min="0" max="350" step="0.1" /></label>
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
        title: "Save Tools",
        keywords: "save load firebase local reset",
        content: `
          <section class="admin-section">
            <h3>Save Tools</h3>
            <p>Only four manual save actions remain. Nothing auto-loads, auto-saves, or syncs in the background anymore.</p>
            ${
              firebaseMeta?.updatedAtMs
                ? `<p>Latest Firebase save: <strong>${escapeHtml(new Date(firebaseMeta.updatedAtMs).toLocaleString())}</strong>${firebaseMeta.appVersion ? ` | build <strong>${escapeHtml(firebaseMeta.appVersion)}</strong>` : ""}</p>`
                : `<p>No Firebase save has been loaded in this browser yet.</p>`
            }
            ${
              manualSaveMeta?.manualSavedAt
                ? `<p>Latest local save: <strong>${escapeHtml(new Date(manualSaveMeta.manualSavedAt).toLocaleString())}</strong> | ${manualSaveMeta.buildingCount} building${manualSaveMeta.buildingCount === 1 ? "" : "s"} | population ${manualSaveMeta.population}</p>`
                : `<p>No local save recorded yet in this browser.</p>`
            }
            <div class="admin-actions admin-actions--with-help">
              ${renderHelpActionButton("save-firebase-realm", "Save", "Manually overwrites the single Firebase save with the current session, but only if this app build is not older than the latest Firebase save.")}
              ${renderHelpActionButton("load-firebase-realm", "Load", "Loads the single latest Firebase save into the current session.")}
              ${renderHelpActionButton("save-manual-state", "Local Save", "Stores the current session in this browser only as one local backup.")}
              ${renderHelpActionButton("load-manual-state", "Local Load", "Loads the one local browser save and replaces the current session.")}
              ${renderHelpActionButton("clear-buildings", "Delete All Buildings", "Removes all buildings from the realm without resetting the rest of the save.")}
              ${renderHelpActionButton("reset-save", "Reset Save", "Returns the campaign to the standard reset state for this build.")}
              ${renderHelpActionButton("session-reset", "Reset to Live Session", "Resets the campaign to the lighter table-ready live session preset.")}
              ${renderHelpActionButton("testing-reset", "Reset to Testing State", "Resets the campaign to the richer testing preset with extra crystals and stockpiles.")}
              ${renderHelpActionButton("full-reset", "Full Reset (1 Common Crystal)", "Wipes the realm to a bare-minimum start with only one Common crystal.")}
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

