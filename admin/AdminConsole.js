import { MONTHS } from "../content/CalendarConfig.js";
import { createCatalogEntryFromInput } from "../content/BuildingCatalog.js";
import { SPEED_MULTIPLIERS } from "../content/Config.js";
import { EVENT_POOLS } from "../content/EventPools.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml } from "../engine/Utils.js";
import { renderModal } from "../ui/Modal.js";

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
  return Object.entries(state.citizens)
    .map(
      ([citizenClass, count]) => `
        <div class="admin-row">
          <span>${citizenClass}</span>
          <input type="number" id="citizen-${citizenClass}" value="1" min="0" />
          <button class="button button--ghost" data-admin-action="citizen-add" data-citizen-class="${citizenClass}">Add</button>
          <button class="button button--ghost" data-admin-action="citizen-remove" data-citizen-class="${citizenClass}">Remove</button>
          <button class="button button--ghost" data-admin-action="citizen-set" data-citizen-class="${citizenClass}">Set</button>
          <strong>${count}</strong>
        </div>
      `
    )
    .join("");
}

export class AdminConsole {
  constructor(actions) {
    this.actions = actions;
    this.root = document.createElement("div");
    this.root.className = "admin-root";
    this.keyBuffer = "";
    document.body.append(this.root);

    document.addEventListener("keydown", (event) => {
      if (event.key.length !== 1 || !/\d/.test(event.key)) {
        return;
      }
      this.keyBuffer = `${this.keyBuffer}${event.key}`.slice(-3);
      if (this.keyBuffer === "432") {
        this.actions.openAdmin();
        this.keyBuffer = "";
      }
    });

    this.root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-admin-action],[data-action]");
      if (!target) {
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
            mana: this.getNumberInput("resource-mana"),
            prosperity: this.getNumberInput("resource-prosperity"),
            population: this.getNumberInput("resource-population")
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
              specialEffect: this.getValue("spawn-effect")
            })
          });
          break;
        case "save-building":
          this.actions.editBuilding({
            buildingId: this.getValue("edit-building-id"),
            quality: this.getNumberInput("edit-building-quality"),
            district: this.getValue("edit-building-district"),
            iconKey: this.getValue("edit-building-icon"),
            tags: this.getValue("edit-building-tags").split(",").map((tag) => tag.trim()).filter(Boolean),
            specialEffect: this.getValue("edit-building-effect"),
            stats: this.getJson("edit-building-stats"),
            resourceRates: this.getJson("edit-building-resources")
          });
          break;
        case "remove-building":
          this.actions.removeBuilding(this.getValue("edit-building-id"));
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
              specialEffect: this.getValue("pool-effect"),
              statOverrides: this.getJson("pool-stats")
            })
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
        case "trigger-event":
          this.actions.triggerEvent(this.getValue("event-select"));
          break;
        case "clear-events":
          this.actions.clearEvents();
          break;
        case "export-save":
          this.root.querySelector("#save-json").value = this.actions.exportSave();
          break;
        case "import-save":
          this.actions.importSave(this.getValue("save-json"));
          break;
        case "reset-save":
          this.actions.resetSave();
          break;
        default:
          break;
      }
    } catch (error) {
      this.actions.reportError(error.message);
    }
  }

  render(state) {
    const selectedBuilding = state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? state.buildings[0];
    const selectedDistrict = state.districtSummary[0]?.name ?? "";
    const totalPopulation = Object.values(state.citizens).reduce((sum, value) => sum + value, 0);

    const content = `
      <div class="admin-console">
        <section class="admin-section">
          <h3>Crystals</h3>
          ${rarityControls(state, "crystal")}
        </section>

        <section class="admin-section">
          <h3>Shards</h3>
          ${rarityControls(state, "shard")}
        </section>

        <section class="admin-section">
          <h3>Resources</h3>
          <div class="admin-grid">
            <label>Gold<input id="resource-gold" type="number" value="${state.resources.gold}" /></label>
            <label>Food<input id="resource-food" type="number" value="${state.resources.food}" /></label>
            <label>Materials<input id="resource-materials" type="number" value="${state.resources.materials}" /></label>
            <label>Mana<input id="resource-mana" type="number" value="${state.resources.mana}" /></label>
            <label>Prosperity<input id="resource-prosperity" type="number" value="${state.resources.prosperity}" /></label>
            <label>Population<input id="resource-population" type="number" value="${state.resources.population}" /></label>
          </div>
          <button class="button" data-admin-action="apply-resources">Apply Resources</button>
        </section>

        <section class="admin-section">
          <h3>Citizen Management</h3>
          <p>Live total population: <strong>${totalPopulation}</strong></p>
          ${citizenControls(state)}
          <div class="admin-grid admin-grid--three">
            <label>From Class<select id="promote-from">${options(Object.keys(state.citizens), "Peasants")}</select></label>
            <label>To Class<select id="promote-to">${options(Object.keys(state.citizens), "Workers")}</select></label>
            <label>Amount<input id="promote-amount" type="number" value="1" min="0" /></label>
          </div>
          <button class="button button--ghost" data-admin-action="promote-citizens">Promote</button>
          <div class="admin-grid admin-grid--three">
            <label>From Class<select id="demote-from">${options(Object.keys(state.citizens), "Workers")}</select></label>
            <label>To Class<select id="demote-to">${options(Object.keys(state.citizens), "Peasants")}</select></label>
            <label>Amount<input id="demote-amount" type="number" value="1" min="0" /></label>
          </div>
          <button class="button button--ghost" data-admin-action="demote-citizens">Demote</button>
          <label>Bulk JSON<textarea id="bulk-citizens" rows="4" placeholder='{"Peasants":10,"Clergy":5}'></textarea></label>
          <div class="admin-actions">
            <button class="button button--ghost" data-admin-action="bulk-citizens">Apply Bulk</button>
            <button class="button button--ghost" data-admin-action="reset-citizens">Reset Citizens</button>
          </div>
        </section>

        <section class="admin-section">
          <h3>Buildings</h3>
          <div class="admin-grid">
            <label>Name<input id="spawn-name" value="Custom Tower" /></label>
            <label>Rarity<select id="spawn-rarity">${options(RARITY_ORDER, "Common")}</select></label>
            <label>Quality<input id="spawn-quality" type="number" value="100" min="0" max="350" /></label>
            <label>District<input id="spawn-district" value="Arcane District" /></label>
            <label>Tags<input id="spawn-tags" value="arcane,civic" /></label>
            <label>Icon Key<input id="spawn-icon" value="star" /></label>
          </div>
          <label>Special Effect<textarea id="spawn-effect" rows="2"></textarea></label>
          <button class="button" data-admin-action="spawn-building">Spawn Building</button>

          <div class="admin-grid">
            <label>Edit Building<select id="edit-building-id">${state.buildings.map((building) => `<option value="${building.id}" ${selectedBuilding?.id === building.id ? "selected" : ""}>${escapeHtml(building.displayName)} (${building.rarity})</option>`).join("")}</select></label>
            <label>Quality<input id="edit-building-quality" type="number" value="${selectedBuilding?.quality ?? 100}" min="0" max="350" /></label>
            <label>District<input id="edit-building-district" value="${escapeHtml(selectedBuilding?.district ?? "Residential District")}" /></label>
            <label>Icon Key<input id="edit-building-icon" value="${escapeHtml(selectedBuilding?.iconKey ?? "spire")}" /></label>
            <label>Tags<input id="edit-building-tags" value="${escapeHtml((selectedBuilding?.tags ?? []).join(","))}" /></label>
          </div>
          <label>Special Effect<textarea id="edit-building-effect" rows="2">${escapeHtml(selectedBuilding?.specialEffect ?? "")}</textarea></label>
          <label>Stats JSON<textarea id="edit-building-stats" rows="4">${escapeHtml(JSON.stringify(selectedBuilding?.stats ?? {}, null, 2))}</textarea></label>
          <label>Resource Rates JSON<textarea id="edit-building-resources" rows="4">${escapeHtml(JSON.stringify(selectedBuilding?.resourceRates ?? {}, null, 2))}</textarea></label>
          <div class="admin-actions">
            <button class="button button--ghost" data-admin-action="save-building">Save Building</button>
            <button class="button button--ghost" data-admin-action="remove-building">Remove Building</button>
          </div>
        </section>

        <section class="admin-section">
          <h3>Roll Tables</h3>
          <div class="admin-grid">
            <label>Name<input id="pool-name" value="Custom Tower" /></label>
            <label>Rarity<select id="pool-rarity">${options(RARITY_ORDER, "Common")}</select></label>
            <label>Target Rarity<select id="pool-target-rarity">${options(RARITY_ORDER, "Rare")}</select></label>
            <label>Rename To<input id="pool-next-name" value="Custom Tower Mk II" /></label>
            <label>District<input id="pool-district" value="Arcane District" /></label>
            <label>Tags<input id="pool-tags" value="arcane,civic" /></label>
            <label>Icon Key<input id="pool-icon" value="star" /></label>
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

        <section class="admin-section">
          <h3>Events</h3>
          <label>Manual Trigger<select id="event-select">${EVENT_POOLS.map((event) => `<option value="${event.id}">${escapeHtml(event.name)}</option>`).join("")}</select></label>
          <div class="admin-actions">
            <button class="button button--ghost" data-admin-action="trigger-event">Trigger Event</button>
            <button class="button button--ghost" data-admin-action="clear-events">Clear Active Events</button>
          </div>
        </section>

        <section class="admin-section">
          <h3>Save Tools</h3>
          <textarea id="save-json" rows="10"></textarea>
          <div class="admin-actions">
            <button class="button button--ghost" data-admin-action="export-save">Export Save JSON</button>
            <button class="button button--ghost" data-admin-action="import-save">Import Save JSON</button>
            <button class="button button--ghost" data-admin-action="reset-save">Reset Save</button>
          </div>
        </section>
      </div>
    `;

    this.root.innerHTML = renderModal({
      id: "admin-console-modal",
      title: "Crystal Forge Admin Console",
      content,
      open: state.ui.adminOpen,
      wide: true
    });
  }
}
