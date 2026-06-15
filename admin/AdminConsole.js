// GM/admin console renderer and input handler.
// This file builds the hidden administration UI, unlock flow, and the direct
// controls that modify crystals, buildings, citizens, events, and save tools.
import { MONTHS } from "../content/CalendarConfig.js?v=v1.7.20-20260615130257";
import { createCatalogEntryFromInput, getBuildingEmoji, getCatalogKey } from "../content/BuildingCatalog.js?v=v1.7.20-20260615180000";
import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js?v=v1.7.20-20260615130257";
import { GM_QUICK_CRYSTAL_PACKS, GM_QUICK_EVENT_IDS, SPEED_MULTIPLIERS } from "../content/Config.js?v=v1.7.20-20260615130257";
import { EVENT_POOLS } from "../content/EventPools.js?v=v1.7.20-20260615130257";
import { EXPEDITION_ORDER, EXPEDITION_TYPES } from "../content/ExpeditionConfig.js?v=v1.7.20-20260615130257";
import { RARITY_ORDER } from "../content/Rarities.js?v=v1.7.20-20260615130257";
import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js?v=v1.7.20-20260615130257";
import { UNIQUE_CITIZEN_ARCHETYPES } from "../content/UniqueCitizenConfig.js?v=v1.7.20-20260615130257";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260615130257";
import { attachHelpBubbles, createHelpBubble } from "../ui/HelpBubbles.js?v=v1.7.20-20260615130257";
import { renderModal } from "../ui/Modal.js?v=v1.7.20-20260615130257";
import { formatDate } from "../systems/CalendarSystem.js?v=v1.7.20-20260615130257";
import { formatBuildingQualityDisplay, getBuildingOutputTypes, BUILDING_OUTPUT_RESOURCE_KEYS } from "../systems/BuildingSystem.js?v=v1.7.20-20260615130257";
import { getDriftEvolutionStages } from "../systems/DriftEvolutionSystem.js?v=v1.7.20-20260615130257";
import { getEconomyDebugSummary, getEconomyTopContributorsSummary } from "../systems/ResourceSystem.js?v=v1.7.20-20260615130257";
import { getManualSaveMeta } from "../systems/StorageSystem.js?v=v1.7.20-20260615130257";

function options(values, selectedValue) {
  return values
    .map((value) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

// Rarity color map for spinner-row accent (Issue 7's left bar applied here too).
const RARITY_COLOR_MAP = {
  Common:    "#94a3b8",
  Uncommon:  "#4ade80",
  Rare:      "#60a5fa",
  Epic:      "#c084fc",
  Legendary: "#f0c482",
  Beyond:    "#ff7c9d"
};

function rarityControls(state, kind) {
  // Compact spinner: [label] [current count] [âˆ’] [input] [+]. The static
  // count gives at-a-glance state; the input is the editable value (commits
  // on blur/Enter via data-admin-direct-set).
  return RARITY_ORDER.map((rarity) => {
    const current = Math.round((kind === "crystal" ? state.crystals[rarity] : state.shards[rarity]) ?? 0);
    return `
      <div class="admin-spin-row admin-spin-row--no-apply" style="--rarity-color:${RARITY_COLOR_MAP[rarity] ?? "var(--accent)"};">
        <div class="admin-spin-row__label">
          <strong>${escapeHtml(rarity)}</strong>
        </div>
        <span class="admin-spin-row__value">${formatNumber(current, 0)}</span>
        <button class="button button--ghost admin-spin-row__step" type="button" data-admin-action="${kind}-step" data-rarity="${rarity}" data-amount="-1" title="âˆ’1">âˆ’</button>
        <input type="number" data-admin-direct-set="${kind}" id="${kind}-${rarity}" data-rarity="${rarity}" value="${current}" min="0" />
        <button class="button button--ghost admin-spin-row__step" type="button" data-admin-action="${kind}-step" data-rarity="${rarity}" data-amount="1" title="+1">+</button>
      </div>
    `;
  }).join("");
}

function citizenControls(state) {
  // Round 2 Fix 2: each citizen class is now a spinner row matching the
  // Currencies layout. Â± steps by 1; typed value commits on blur.
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
              const isUnmanned = count === 0;
              return `
                <div class="admin-spin-row admin-spin-row--no-apply admin-spin-row--citizen ${isUnmanned ? "is-unmanned" : ""}">
                  <div class="admin-spin-row__label">
                    <strong><span aria-hidden="true">${escapeHtml(emoji)}</span> ${escapeHtml(citizenClass)}</strong>
                  </div>
                  ${createHelpBubble(getCitizenHelpText(citizenClass))}
                  <span class="admin-spin-row__value">${formatNumber(Math.round(count), 0)}</span>
                  <button class="button button--ghost admin-spin-row__step" type="button" data-admin-action="citizen-step" data-citizen-class="${citizenClass}" data-amount="-1" title="âˆ’1">âˆ’</button>
                  <input type="number" data-admin-direct-set="citizen" id="citizen-${citizenClass}" data-citizen-class="${citizenClass}" value="${Math.round(count)}" min="0" />
                  <button class="button button--ghost admin-spin-row__step" type="button" data-admin-action="citizen-step" data-citizen-class="${citizenClass}" data-amount="1" title="+1">+</button>
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

function legendArchetypeOptions(selectedValue = UNIQUE_CITIZEN_ARCHETYPES[0]?.id ?? "") {
  return UNIQUE_CITIZEN_ARCHETYPES.map(
    (archetype) =>
      `<option value="${escapeHtml(archetype.id)}" ${archetype.id === selectedValue ? "selected" : ""}>${escapeHtml(`${archetype.title} (${archetype.className})`)}</option>`
  ).join("");
}

function expeditionTypeOptions(selectedValue = EXPEDITION_ORDER[0] ?? "") {
  return EXPEDITION_ORDER.map((typeId) => {
    const definition = EXPEDITION_TYPES[typeId];
    if (!definition) {
      return "";
    }
    return `<option value="${escapeHtml(typeId)}" ${typeId === selectedValue ? "selected" : ""}>${escapeHtml(definition.label)}</option>`;
  }).join("");
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
  // Issue 7: lowercase labels, replace redundant subtitle with an effect line,
  // add a rarity-colored left accent based on the pack's headline rarity.
  const dominantRarity = (pack) => {
    const entries = Object.entries(pack.crystals ?? {});
    if (!entries.length) return "Common";
    // Highest-rarity key wins for the accent color.
    return entries
      .map(([rarity]) => rarity)
      .sort((a, b) => RARITY_ORDER.indexOf(b) - RARITY_ORDER.indexOf(a))[0] ?? "Common";
  };
  const formatEffect = (pack) => {
    const parts = Object.entries(pack.crystals ?? {}).map(([rarity, count]) => `${count} ${rarity}`);
    if (parts.length === 1) return `${parts[0]} crystal Â· tap to apply`;
    if (parts.length > 1) return `${parts.join(", ")} Â· tap to apply`;
    return "Tap to apply";
  };
  return `
    <div class="admin-quick-grid">
      ${GM_QUICK_CRYSTAL_PACKS.map((pack) => {
        const rarity = dominantRarity(pack);
        return `
          <button class="button button--ghost admin-quick-card" data-admin-action="grant-crystal-pack" data-pack-id="${pack.id}" style="--rarity-color:${RARITY_COLOR_MAP[rarity] ?? "var(--accent)"};">
            <strong>${escapeHtml(pack.label)}</strong>
            <span>${escapeHtml(formatEffect(pack))}</span>
          </button>
        `;
      }).join("")}
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
            <span>${escapeHtml(`${event.type} Â· ${event.rarity}`)}</span>
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
                <small>${building.mapPosition ? escapeHtml(`Placed at ${building.mapPosition.q}, ${building.mapPosition.r}`) : "Unplaced"} Â· ${escapeHtml(`Stage ${formatBuildingQualityDisplay(building)}`)}</small>
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

const OUTPUT_RESOURCE_LABELS = {
  gold: "Gold",
  food: "Food",
  materials: "Materials",
  salvage: "Salvage",
  mana: "Mana"
};

function getEffectiveTierRates(type, tier) {
  const override = type.tierOverrides?.[tier];
  const rates = {};
  for (const key of BUILDING_OUTPUT_RESOURCE_KEYS) {
    const overrideValue = override?.[key];
    rates[key] =
      overrideValue !== undefined && overrideValue !== null && Number.isFinite(Number(overrideValue))
        ? Number(overrideValue)
        : Number(type.rates[key] ?? 0) * tier;
  }
  return rates;
}

function renderOutputRateRow(label, tierKey, rates, { custom = null } = {}) {
  const toggle =
    custom === null
      ? ""
      : `
        <label class="admin-output-row__toggle">
          <input type="checkbox" data-tier-toggle="${tierKey}" ${custom ? "checked" : ""} />
          <span>Custom</span>
        </label>
      `;
  return `
    <div class="admin-output-row">
      <div class="admin-output-row__label">
        <strong>${escapeHtml(label)}</strong>
        ${toggle}
      </div>
      <div class="admin-output-card__rates">
        ${BUILDING_OUTPUT_RESOURCE_KEYS.map(
          (key) => `
            <label class="admin-output-rate">
              <span>${escapeHtml(OUTPUT_RESOURCE_LABELS[key])}</span>
              <input type="number" step="0.05" data-tier="${tierKey}" data-resource="${key}" value="${formatNumber(Number(rates[key] ?? 0), 2)}" />
            </label>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function renderBuildingOutputEditor(state) {
  const types = getBuildingOutputTypes(state);
  if (!types.length) {
    return `<p class="empty-state">No buildings are in play yet. Manifest a building first, then tune its output here.</p>`;
  }
  return `
    <div class="admin-output-editor">
      ${types
        .map(
          (type) => `
            <article class="admin-output-card" data-output-key="${escapeHtml(type.key)}">
              <div class="admin-output-card__head">
                <strong>${escapeHtml(type.name)}</strong>
                <span>${escapeHtml(type.rarity)}</span>
              </div>
              ${renderOutputRateRow("Base (x1) / day", "base", type.rates)}
              ${renderOutputRateRow("Tier x2", "2", getEffectiveTierRates(type, 2), { custom: Boolean(type.tierOverrides?.[2]) })}
              ${renderOutputRateRow("Tier x3", "3", getEffectiveTierRates(type, 3), { custom: Boolean(type.tierOverrides?.[3]) })}
              <p class="admin-output-card__hint">x2 and x3 default to the base doubled and tripled. Tick <em>Custom</em> on a tier to hijack its exact values.</p>
              <div class="admin-actions">
                <button class="button button--ghost" data-admin-action="save-building-output" data-building-key="${escapeHtml(type.key)}">Save Output</button>
              </div>
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
      "Top Food": "â—’",
      "Top Materials": "â–¦",
      "Top Salvage": "â›­",
      "Top Mana": "âœ¦"
    }[label] ?? "â€¢";
    const positiveEntries = entries.filter((entry) => entry.amount > 0.005);
    const negativeEntries = entries.filter((entry) => entry.amount < -0.005);

    return `
      <div class="admin-contributor-row">
        <div class="admin-contributor-row__label"><span class="admin-contributor-row__glyph" aria-hidden="true">${escapeHtml(resourceGlyph)}</span><strong>${escapeHtml(label)}:</strong></div>
        <div class="admin-contributor-row__groups">
          <div class="admin-contributor-group">
            <span class="admin-contributor-group__label admin-contributor-group__label--positive"><span class="admin-contributor-group__icon" aria-hidden="true">â†—</span> Gains</span>
            <div class="admin-contributor-group__pills">${renderContributorPills(positiveEntries)}</div>
          </div>
          <div class="admin-contributor-group">
            <span class="admin-contributor-group__label admin-contributor-group__label--negative"><span class="admin-contributor-group__icon" aria-hidden="true">â†˜</span> Drains</span>
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
              <th>Behemoths</th>
              <th>Events</th>
              <th>Focus</th>
              <th class="admin-debug-table__net">Net / Day</th>
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
                    <td>${formatNumber(row.behemothUpkeep, 2)}</td>
                    <td>${formatNumber(row.eventProduction, 2)}</td>
                    <td>${formatNumber(row.focusProduction, 2)}</td>
                    <td class="admin-debug-table__net ${row.net > 0.005 ? "is-positive" : row.net < -0.005 ? "is-negative" : "is-neutral"}">${formatNumber(row.net, 2)}</td>
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
    this.currencyMode = "crystal"; // Issue 3: Crystals / Shards toggle
    this.armedConfirms = new Set(); // Issue 8: two-step confirms by id
    this.lastState = null;
    document.body.append(this.root);

    document.addEventListener("keydown", (event) => {
      // Shortcuts that only fire while the console is open.
      if (this.lastState?.ui?.adminOpen) {
        if (event.key === "Escape") {
          this.actions.closeAdmin();
          return;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          this.root.querySelector("#admin-search")?.focus();
          return;
        }
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type === "number") {
          // Issue 2: Enter on a spinner row applies that row.
          const row = event.target.closest(".admin-spin-row, .admin-resource-row");
          const applyBtn = row?.querySelector("[data-admin-action]");
          if (applyBtn) {
            event.preventDefault();
            applyBtn.click();
          }
          return;
        }
      }
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
        this.armedConfirms.clear();
        if (this.lastState) {
          this.render(this.lastState);
        }
        return;
      }

      if (target.dataset.adminUi === "currency-mode") {
        this.currencyMode = target.dataset.mode === "shard" ? "shard" : "crystal";
        if (this.lastState) this.render(this.lastState);
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

      // Issue 8: two-step confirm. Buttons with [data-admin-confirm] require
      // a second click within 3s; first click "arms" the button visually.
      // Sets BOTH `is-armed` class and the spec's [data-confirming="1"] attr.
      if (target.dataset.adminConfirm) {
        const id = target.dataset.adminConfirm;
        if (!this.armedConfirms.has(id)) {
          this.armedConfirms.add(id);
          target.classList.add("is-armed");
          target.setAttribute("data-confirming", "1");
          const originalLabel = target.dataset.adminConfirmOriginal ?? target.textContent;
          target.dataset.adminConfirmOriginal = originalLabel;
          target.textContent = "Confirm âœ“";
          setTimeout(() => {
            if (this.armedConfirms.has(id)) {
              this.armedConfirms.delete(id);
              target.classList.remove("is-armed");
              target.removeAttribute("data-confirming");
              if (target.dataset.adminConfirmOriginal) {
                target.textContent = target.dataset.adminConfirmOriginal;
              }
            }
          }, 3000);
          return;
        }
        this.armedConfirms.delete(id);
        target.classList.remove("is-armed");
        target.removeAttribute("data-confirming");
        if (target.dataset.adminConfirmOriginal) {
          target.textContent = target.dataset.adminConfirmOriginal;
        }
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
      } else if (target instanceof HTMLInputElement && target.dataset.adminDirectSet) {
        // Round 2 Fix 1: typed values in spinner / citizen rows commit on blur.
        const kind = target.dataset.adminDirectSet;
        const value = Math.max(0, Number(target.value) || 0);
        if (kind === "crystal" || kind === "shard") {
          (kind === "crystal" ? this.actions.adjustCrystal : this.actions.adjustShard)({
            mode: "set",
            rarity: target.dataset.rarity,
            amount: value
          });
        } else if (kind === "citizen") {
          this.actions.citizenCommand({
            mode: "set",
            citizenClass: target.dataset.citizenClass,
            amount: value
          });
          this.showCitizenToast(`Set ${target.dataset.citizenClass} to ${formatNumber(value, 0)}`);
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

  showCitizenToast(message, { undo = null, durationMs = 5000 } = {}) {
    // Round 2 Fix 4: floating toast at the bottom of the admin drawer with an
    // optional Undo button. Replaces any in-flight toast.
    if (this._toastTimer) clearTimeout(this._toastTimer);
    const dialog = this.root.querySelector(".modal__dialog");
    if (!dialog) return;
    let toast = dialog.querySelector(".admin-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "admin-toast";
      dialog.append(toast);
    }
    toast.innerHTML = `
      <span class="admin-toast__icon" aria-hidden="true">âœ“</span>
      <span class="admin-toast__msg">${message}</span>
      ${undo ? `<button class="admin-toast__undo" type="button">Undo</button>` : ""}
    `;
    toast.classList.add("is-visible");
    if (undo) {
      toast.querySelector(".admin-toast__undo").addEventListener("click", () => {
        undo();
        toast.classList.remove("is-visible");
        if (this._toastTimer) clearTimeout(this._toastTimer);
      }, { once: true });
    }
    this._toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, durationMs);
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
        case "crystal-step":
        case "shard-step": {
          // Issue 2: Â± stepper. Adjusts by data-amount (Â±1 by default).
          const adjust = action === "crystal-step" ? this.actions.adjustCrystal : this.actions.adjustShard;
          const amount = Math.abs(Number(target.dataset.amount) || 1);
          adjust({
            mode: Number(target.dataset.amount) < 0 ? "remove" : "add",
            rarity: target.dataset.rarity,
            amount
          });
          break;
        }
        case "apply-resource": {
          // Issue 4: per-resource Apply. Reads the matching input and applies
          // only that key â€” never overwrites neighbouring fields.
          const key = target.dataset.resourceKey;
          if (!key) break;
          const value = this.getNumberInput(`resource-${key}`, 0);
          const patch = { [key]: value };
          this.actions.setResources(patch);
          break;
        }
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
        case "apply-daily-modifiers":
          this.actions.setDailyResourceModifiers({
            gold: this.getNumberInput("daily-mod-gold", 0),
            food: this.getNumberInput("daily-mod-food", 0),
            materials: this.getNumberInput("daily-mod-materials", 0),
            salvage: this.getNumberInput("daily-mod-salvage", 0),
            mana: this.getNumberInput("daily-mod-mana", 0),
            prosperity: this.getNumberInput("daily-mod-prosperity", 0)
          });
          break;
        case "clear-daily-modifiers":
          this.actions.setDailyResourceModifiers({ gold: 0, food: 0, materials: 0, salvage: 0, mana: 0, prosperity: 0 });
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
        case "citizen-step": {
          // Round 2 Fix 2: Â± stepper for citizen rows. Â±1 by data-amount.
          const klass = target.dataset.citizenClass;
          const amount = Math.abs(Number(target.dataset.amount) || 1);
          const mode = Number(target.dataset.amount) < 0 ? "remove" : "add";
          this.actions.citizenCommand({ mode, citizenClass: klass, amount });
          this.showCitizenToast(`${mode === "add" ? "Added" : "Removed"} ${amount} ${klass}`, {
            undo: () => this.actions.citizenCommand({ mode: mode === "add" ? "remove" : "add", citizenClass: klass, amount })
          });
          break;
        }
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
        case "generate-random-citizens": {
          const amount = this.getNumberInput("random-citizen-amount", 0);
          const excludedClasses = [
            ...this.root.querySelectorAll('input[data-random-citizen-class]')
          ]
            .filter((input) => !input.checked)
            .map((input) => input.dataset.randomCitizenClass)
            .filter(Boolean);
          this.actions.generateRandomCitizens({ amount, excludedClasses });
          break;
        }
        case "random-citizens-all":
        case "random-citizens-none": {
          const checked = action === "random-citizens-all";
          this.root.querySelectorAll('input[data-random-citizen-class]').forEach((input) => {
            input.checked = checked;
          });
          break;
        }
        case "bulk-citizens":
          this.actions.bulkCitizens(this.getJson("bulk-citizens"));
          break;
        case "add-manual-legend":
          this.actions.addManualLegend({
            fullName: this.getValue("legend-name"),
            archetypeId: this.getValue("legend-archetype"),
            sourceTypeId: this.getValue("legend-source-type"),
            originLabel: this.getValue("legend-origin-label"),
            title: this.getValue("legend-title"),
            effectText: this.getValue("legend-effect"),
            originMemory: this.getValue("legend-origin-memory"),
            arrivalLine: this.getValue("legend-arrival-line")
          });
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
        case "save-building-output": {
          const card = target.closest("[data-output-key]");
          if (!card) {
            break;
          }
          const key = card.dataset.outputKey;
          const readRow = (tierKey) => {
            const rates = {};
            card.querySelectorAll(`input[data-tier="${tierKey}"][data-resource]`).forEach((input) => {
              rates[input.dataset.resource] = Number(input.value) || 0;
            });
            return rates;
          };
          const base = readRow("base");
          const tierOverrides = {};
          card.querySelectorAll("input[data-tier-toggle]").forEach((toggle) => {
            if (toggle.checked) {
              tierOverrides[toggle.dataset.tierToggle] = readRow(toggle.dataset.tierToggle);
            }
          });
          this.actions.setBuildingOutput({ key, base, tierOverrides });
          break;
        }
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
        title: "Currencies",
        keywords: "currencies crystals shards rarity economy",
        content: `
          <section class="admin-section">
            <div class="panel__header" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <h3 style="margin:0;">Currencies</h3>
              <div class="admin-currency-toggle" role="tablist" aria-label="Currency type">
                <button type="button" class="${this.currencyMode === "crystal" ? "is-active" : ""}" data-admin-ui="currency-mode" data-mode="crystal" role="tab" aria-selected="${this.currencyMode === "crystal"}">Crystals</button>
                <button type="button" class="${this.currencyMode === "shard" ? "is-active" : ""}" data-admin-ui="currency-mode" data-mode="shard" role="tab" aria-selected="${this.currencyMode === "shard"}">Shards</button>
              </div>
            </div>
            ${rarityControls(state, this.currencyMode)}
          </section>
        `
      },
      {
        tab: "economy",
        title: "Resources",
        keywords: "resources gold food materials salvage mana prosperity goods population",
        content: `
          <section class="admin-section">
            <h3>Resources</h3>
            ${[
              { key: "gold", label: "Gold", icon: "ðŸ’°", value: state.resources?.gold },
              { key: "food", label: "Food", icon: "ðŸŒ¾", value: state.resources?.food },
              { key: "materials", label: "Materials", icon: "ðŸªµ", value: state.resources?.materials },
              { key: "salvage", label: "Salvage", icon: "âš™", value: state.resources?.salvage },
              { key: "mana", label: "Mana", icon: "âœ¨", value: state.resources?.mana },
              { key: "prosperity", label: "Prosperity", icon: "ðŸŒŸ", value: state.resources?.prosperity },
              { key: "goods", label: "Goods", icon: "ðŸ“¦", value: state.cityStats?.goods },
              { key: "population", label: "Population", icon: "ðŸ‘¥", value: state.resources?.population, disabled: true }
            ].map((r) => `
              <div class="admin-resource-row">
                <div class="admin-spin-row__label">
                  <strong>${r.icon} ${escapeHtml(r.label)}</strong>
                  <span class="admin-resource-row__current">current: ${formatNumber(Math.round(r.value ?? 0), 0)}</span>
                </div>
                <input id="resource-${r.key}" type="number" value="${Math.round(r.value ?? 0)}" ${r.disabled ? "disabled" : ""} />
                <button class="button admin-resource-row__apply" type="button" data-admin-action="apply-resource" data-resource-key="${r.key}" data-admin-confirm="apply-resource-${r.key}" ${r.disabled ? "disabled" : ""}>Apply</button>
              </div>
            `).join("")}
            <p class="admin-debug-note">Goods writes apply a GM override on top of normal production. Population is read-only.</p>
            <div class="admin-actions">
              <button class="button button--ghost" type="button" data-admin-action="reset-goods-override" data-admin-confirm="reset-goods">Reset GM Goods Override</button>
            </div>
          </section>
          <details class="admin-debug-collapsible">
            <summary>â–¶ Economy Debug</summary>
            ${renderEconomyDebugTable(state)}
          </details>
        `
      },
      {
        tab: "economy",
        title: "Daily Resource Adjustments",
        keywords: "daily resource adjustment modifier harvest trade bonus penalty per day flat gold food materials salvage mana prosperity",
        content: `
          <section class="admin-section">
            <h3>Daily Resource Adjustments</h3>
            <p>Add or remove a flat amount of each resource every day. Use positive numbers for bonuses (a good harvest, strong trade season) and negative numbers for ongoing drains. These stack on top of buildings, citizens, and other production.</p>
            <div class="admin-grid">
              <label>Gold / day<input id="daily-mod-gold" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.gold ?? 0), 2)}" /></label>
              <label>Food / day<input id="daily-mod-food" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.food ?? 0), 2)}" /></label>
              <label>Materials / day<input id="daily-mod-materials" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.materials ?? 0), 2)}" /></label>
              <label>Salvage / day<input id="daily-mod-salvage" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.salvage ?? 0), 2)}" /></label>
              <label>Mana / day<input id="daily-mod-mana" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.mana ?? 0), 2)}" /></label>
              <label>Prosperity / day<input id="daily-mod-prosperity" type="number" step="0.5" value="${formatNumber(Number(state.dailyResourceModifiers?.prosperity ?? 0), 2)}" /></label>
            </div>
            <div class="admin-actions">
              <button class="button" data-admin-action="apply-daily-modifiers">Apply Daily Adjustments</button>
              <button class="button button--ghost" data-admin-action="clear-daily-modifiers">Clear All</button>
            </div>
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
            ${(() => {
              // Round 3 Fix 3: derive Assigned/Unassigned from actual citizen
              // counts, not a separate "provision" field that is always 0.
              // "Population" is the realm's headcount; the sum of typed citizens
              // is what's actively assigned to a role. Anything beyond that is
              // un-roled population.
              const totalAssigned = Object.values(state.citizens ?? {})
                .reduce((sum, value) => sum + (Number(value) || 0), 0);
              const realmTotal = Math.max(totalAssigned, Number(state.resources?.population ?? 0));
              const unassigned = Math.max(0, realmTotal - totalAssigned);
              const pct = realmTotal > 0
                ? Math.min(100, Math.round((totalAssigned / realmTotal) * 100))
                : 0;
              return `
                <div class="admin-pop-summary">
                  <div class="admin-pop-summary__totals">
                    <span>Total: <strong>${formatNumber(realmTotal, 0)}</strong></span>
                    <span>Assigned: <strong>${formatNumber(totalAssigned, 0)}</strong></span>
                    <span>Unassigned: <strong>${formatNumber(unassigned, 0)}</strong></span>
                    <span>${pct}% assigned</span>
                  </div>
                  <div class="admin-pop-summary__bar"><span style="width:${pct}%"></span></div>
                </div>
              `;
            })()}
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
              <button class="button button--ghost" data-admin-action="bulk-citizens" data-admin-confirm="bulk-citizens">Apply Bulk</button>
              <button class="button button--ghost" data-admin-action="reset-citizens" data-admin-confirm="reset-citizens">Reset Citizens</button>
            </div>
          </section>
        `
      },
      {
        tab: "population",
        title: "Random Citizen Generator",
        keywords: "random citizens generate roll bulk population spawn farmers druids exclude",
        content: `
          <section class="admin-section admin-random-citizens">
            <h3>Random Citizen Generator</h3>
            <p>Choose a count and uncheck any classes that should not appear in this batch. Citizens are picked one at a time from the eligible pool.</p>
            <div class="admin-grid admin-grid--three">
              <label>Amount<input id="random-citizen-amount" type="number" value="10" min="1" /></label>
              <label class="admin-random-citizens__toggle-cell">
                <span>Eligible Classes</span>
                <div class="admin-random-citizens__toggle-row">
                  <button class="button button--ghost button--small" type="button" data-admin-action="random-citizens-all">Enable All</button>
                  <button class="button button--ghost button--small" type="button" data-admin-action="random-citizens-none">Disable All</button>
                </div>
              </label>
              <div class="admin-actions admin-random-citizens__generate">
                <button class="button" data-admin-action="generate-random-citizens">Generate Citizens</button>
              </div>
            </div>
            ${CITIZEN_GROUP_ORDER.map((groupTitle) => {
              const classes = CITIZEN_CLASSES.filter((citizenClass) => CITIZEN_DEFINITIONS[citizenClass]?.group === groupTitle);
              if (!classes.length) {
                return "";
              }
              return `
                <section class="admin-random-citizens__group">
                  <h4>${escapeHtml(groupTitle)}</h4>
                  <div class="admin-random-citizens__class-grid">
                    ${classes
                      .map((citizenClass) => {
                        const emoji = CITIZEN_DEFINITIONS[citizenClass]?.emoji ?? "*";
                        return `
                          <label class="admin-random-citizens__class">
                            <input
                              type="checkbox"
                              data-random-citizen-class="${escapeHtml(citizenClass)}"
                              checked
                            />
                            <span><span aria-hidden="true">${escapeHtml(emoji)}</span> ${escapeHtml(citizenClass)}</span>
                          </label>
                        `;
                      })
                      .join("")}
                  </div>
                </section>
              `;
            }).join("")}
          </section>
        `
      },
      {
        tab: "population",
        title: "Manual Legend",
        keywords: "legend unique citizen manual notable named hero admin",
        content: `
          <section class="admin-section">
            <h3>Manual Legend</h3>
            <p>Current Legends: <strong>${formatNumber(state.uniqueCitizens?.length ?? 0, 0)}</strong></p>
            <div class="admin-grid">
              <label>Name<input id="legend-name" placeholder="Draw a name if blank" /></label>
              <label>Archetype<select id="legend-archetype">${legendArchetypeOptions("wallMarshal")}</select></label>
              <label>Route Source<select id="legend-source-type">${expeditionTypeOptions("rescue")}</select></label>
              <label>Origin Label<input id="legend-origin-label" placeholder="Use route source if blank" /></label>
              <label>Custom Title<input id="legend-title" placeholder="Use archetype title if blank" /></label>
              <label>Custom Effect<input id="legend-effect" placeholder="Use archetype effect if blank" /></label>
            </div>
            <label>Origin Memory<textarea id="legend-origin-memory" rows="3" placeholder="Use generated route memory if blank"></textarea></label>
            <label>Arrival Line<textarea id="legend-arrival-line" rows="2" placeholder="Use generated arrival line if blank"></textarea></label>
            <div class="admin-actions">
              <button class="button" data-admin-action="add-manual-legend">Add Manual Legend</button>
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
        title: "Building Output Rates",
        keywords: "building output resources gold food materials salvage mana tier x2 x3 production economy adjust per day",
        content: `
          <section class="admin-section">
            <h3>Building Output Rates</h3>
            <p>Set the base per-day resources each building type produces (negative values consume). The x2 and x3 tiers are these values doubled and tripled â€” buildings reach x2 at 220% quality and x3 at the 350% cap. Saving updates every building of that type and all future copies.</p>
            ${renderBuildingOutputEditor(state)}
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
      // Session Mode toggle moved to the admin drawer header (Issue 6).
      {
        tab: "system",
        title: "Drift Evolution",
        keywords: "drift evolution stages abilities thresholds mobility",
        content: `
          <section class="admin-section">
            <h3>Drift Evolution</h3>
            <div class="admin-drift-warning"><span aria-hidden="true">âš </span><span>Advanced â€” changes affect core game progression. Press Save Drift Stage to commit; nothing auto-saves.</span></div>
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
        <header class="admin-drawer-header">
          <h2 class="admin-drawer-header__title">Admin Console</h2>
          <label class="admin-drawer-search">
            <span class="visually-hidden">Search</span>
            <input id="admin-search" value="${escapeHtml(this.searchQuery)}" placeholder="Search panelsâ€¦ (Ctrl+K)" autocomplete="off" />
          </label>
          <button type="button" class="admin-drawer-session-toggle ${state.settings?.liveSessionView ? "is-active" : ""}" data-admin-action="toggle-session-view" title="Toggle Live Session view">
            ${state.settings?.liveSessionView ? "â— Session" : "Session"}
          </button>
          <button type="button" class="modal__close" data-action="close-modal" aria-label="Close console" title="Close (Esc)">âœ•</button>
        </header>
        <div class="admin-tabs">
          <button class="button button--ghost ${this.activeTab === "economy" ? "is-active" : ""}" data-admin-ui="tab" data-tab="economy">Economy</button>
          <button class="button button--ghost ${this.activeTab === "population" ? "is-active" : ""}" data-admin-ui="tab" data-tab="population">Population</button>
          <button class="button button--ghost ${this.activeTab === "world" ? "is-active" : ""}" data-admin-ui="tab" data-tab="world">World</button>
          <button class="button button--ghost ${this.activeTab === "system" ? "is-active" : ""}" data-admin-ui="tab" data-tab="system">System</button>
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

