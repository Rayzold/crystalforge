import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { dateFromParts, formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { MONTHS, DAYS_PER_MONTH } from "../content/CalendarConfig.js";
import { getActiveCraftingUpkeep } from "../systems/CraftingSystem.js";
import { getCrafterCapacity } from "../systems/NpcSystem.js?v=1.9.4";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function craftingCompletionDay(item) {
  return item.startDayOffset + item.durationDays;
}

function craftingProgressPct(item, dayOffset) {
  if (item.status !== "active") return 0;
  const elapsed = dayOffset - item.startDayOffset;
  return Math.min(100, Math.max(0, (elapsed / item.durationDays) * 100));
}

function isReady(item, dayOffset) {
  return item.status === "active" && dayOffset >= craftingCompletionDay(item);
}

function isInProgress(item, dayOffset) {
  return item.status === "active" && dayOffset < craftingCompletionDay(item);
}

function daysLeft(item, dayOffset) {
  return Math.max(0, craftingCompletionDay(item) - dayOffset);
}

function costChips(costs) {
  const rows = [];
  if (costs.gold)      rows.push(`<span class="crafting-chip crafting-chip--gold">💰 ${formatNumber(costs.gold, 1)}</span>`);
  if (costs.mana)      rows.push(`<span class="crafting-chip crafting-chip--mana">✨ ${formatNumber(costs.mana, 1)}</span>`);
  if (costs.materials) rows.push(`<span class="crafting-chip crafting-chip--materials">🪵 ${formatNumber(costs.materials, 1)}</span>`);
  if (costs.salvage)   rows.push(`<span class="crafting-chip crafting-chip--salvage">⚙️ ${formatNumber(costs.salvage, 1)}</span>`);
  if (costs.food)      rows.push(`<span class="crafting-chip crafting-chip--food">🍖 ${formatNumber(costs.food, 1)}</span>`);
  return rows.length ? rows.join("") : `<span class="crafting-chip crafting-chip--none">No cost</span>`;
}

function totalCosts(item) {
  const d = item.durationDays;
  return {
    gold:      (item.costs.gold      ?? 0) * d,
    mana:      (item.costs.mana      ?? 0) * d,
    materials: (item.costs.materials ?? 0) * d,
    salvage:   (item.costs.salvage   ?? 0) * d,
    food:      (item.costs.food      ?? 0) * d,
  };
}

function pctClass(pct) {
  if (pct >= 100) return "crafting-bar__fill--done";
  if (pct >= 66)  return "crafting-bar__fill--high";
  if (pct >= 33)  return "crafting-bar__fill--mid";
  return "crafting-bar__fill--low";
}

// ─── Card renderers ───────────────────────────────────────────────────────────
function renderReadyCard(item) {
  const endDay = craftingCompletionDay(item);
  return `
    <article class="panel crafting-card crafting-card--ready">
      <div class="crafting-card__header">
        <div class="crafting-card__title-row">
          <strong class="crafting-card__name">${escapeHtml(item.name)}</strong>
          <span class="crafting-chip crafting-chip--ready">✅ Ready — day ${endDay}</span>
        </div>
        ${item.desc ? `<p class="crafting-card__desc">${escapeHtml(item.desc)}</p>` : ""}
        <div class="crafting-card__costs">
          ${costChips(totalCosts(item))}
          <span class="crafting-chip crafting-chip--time">⏱ ${item.durationDays}d total</span>
        </div>
      </div>
      <div class="crafting-card__actions">
        <button class="button" data-action="collect-crafting-item" data-item-id="${escapeHtml(item.id)}">📦 Collect</button>
        <button class="button button--ghost" data-action="edit-crafting-item" data-item-id="${escapeHtml(item.id)}">Edit</button>
        <button class="button button--ghost button--danger-icon" data-action="delete-crafting-item" data-item-id="${escapeHtml(item.id)}" title="Remove">Delete</button>
      </div>
    </article>
  `;
}

const CRAFTER_LEVEL_LABEL = { advanced: "Advanced", experienced: "Experienced", master: "Master" };

function renderActiveCard(item, dayOffset) {
  const paused = item.status === "paused";
  const pct   = paused
    ? Math.min(100, Math.max(0, ((item.pausedElapsedDays ?? 0) / item.durationDays) * 100))
    : craftingProgressPct(item, dayOffset);
  const left  = paused
    ? Math.max(0, item.durationDays - (item.pausedElapsedDays ?? 0))
    : daysLeft(item, dayOffset);
  const endDay = craftingCompletionDay(item);
  const urgentClass = paused ? "crafting-days--paused" : left <= 1 ? "crafting-days--urgent" : left <= 3 ? "crafting-days--soon" : "";
  const crafterBadge = item.crafterLevel
    ? `<span class="crafting-chip crafting-chip--crafter">${CRAFTER_LEVEL_LABEL[item.crafterLevel]} Crafter</span>`
    : "";
  const stationBadge = item.craftingStation
    ? `<span class="crafting-chip crafting-chip--station">🏛 ${escapeHtml(item.craftingStation)}</span>`
    : "";
  return `
    <article class="panel crafting-card crafting-card--active ${paused ? "crafting-card--paused" : ""}">
      <div class="crafting-card__header">
        <div class="crafting-card__title-row">
          <strong class="crafting-card__name">${escapeHtml(item.name)}</strong>
          ${crafterBadge}
          ${stationBadge}
          <span class="crafting-days ${urgentClass}">
            ${paused ? `⏸ Paused (${left}d remaining)` : (left === 0 ? "Due today" : left === 1 ? "1 day left" : `${left} days left`)}
          </span>
        </div>
        ${item.desc ? `<p class="crafting-card__desc">${escapeHtml(item.desc)}</p>` : ""}
      </div>
      <div class="crafting-bar">
        <div class="crafting-bar__fill ${pctClass(pct)}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="crafting-card__progress-row">
        <span>${paused ? `Paused at ${(item.pausedElapsedDays ?? 0).toFixed(1)}/${item.durationDays}d` : `Day ${item.startDayOffset} → ${endDay}`} &nbsp;(${pct.toFixed(0)}%)</span>
        ${paused ? "" : `<span>Complete: <strong>${formatDate(endDay)}</strong></span>`}
      </div>
      <div class="crafting-card__costs">
        <div class="crafting-cost-row">
          <span class="crafting-cost-label">Per day</span>
          ${costChips(item.costs)}
        </div>
        <div class="crafting-cost-row">
          <span class="crafting-cost-label">Total</span>
          ${costChips(totalCosts(item))}
          <span class="crafting-chip crafting-chip--time">⏱ ${item.durationDays}d</span>
        </div>
      </div>
      <div class="crafting-card__actions">
        ${paused
          ? `<button class="button" data-action="resume-crafting-item" data-item-id="${escapeHtml(item.id)}">▶ Resume</button>`
          : `<button class="button button--ghost" data-action="pause-crafting-item" data-item-id="${escapeHtml(item.id)}">⏸ Pause</button>`}
        <button class="button button--ghost" data-action="edit-crafting-item" data-item-id="${escapeHtml(item.id)}">Edit</button>
        <button class="button button--ghost" data-action="queue-crafting-item" data-item-id="${escapeHtml(item.id)}">Move to Queue</button>
        <button class="button button--ghost button--danger-icon" data-action="delete-crafting-item" data-item-id="${escapeHtml(item.id)}" title="Remove">Delete</button>
      </div>
    </article>
  `;
}

function renderQueueCard(item, idx, total) {
  return `
    <article class="panel crafting-card crafting-card--queued">
      <div class="crafting-card__header">
        <div class="crafting-card__title-row">
          <div class="crafting-queue-controls">
            <span class="crafting-queue-pos">#${idx + 1}</span>
            <button class="button button--ghost" style="padding:2px 6px;font-size:0.7rem;" data-action="move-crafting-queue" data-item-id="${escapeHtml(item.id)}" data-dir="-1" ${idx === 0 ? "disabled" : ""}>▲</button>
            <button class="button button--ghost" style="padding:2px 6px;font-size:0.7rem;" data-action="move-crafting-queue" data-item-id="${escapeHtml(item.id)}" data-dir="1"  ${idx === total - 1 ? "disabled" : ""}>▼</button>
          </div>
          <strong class="crafting-card__name">${escapeHtml(item.name)}</strong>
        </div>
        ${item.desc ? `<p class="crafting-card__desc">${escapeHtml(item.desc)}</p>` : ""}
        <div class="crafting-card__costs">
          ${costChips(item.costs)}
          <span class="crafting-chip crafting-chip--time">⏱ ${item.durationDays}d total</span>
        </div>
      </div>
      <div class="crafting-card__actions">
        <button class="button button--ghost" data-action="start-crafting-item" data-item-id="${escapeHtml(item.id)}">▶ Start Now</button>
        <button class="button button--ghost" data-action="edit-crafting-item" data-item-id="${escapeHtml(item.id)}">Edit</button>
        <button class="button button--ghost button--danger-icon" data-action="delete-crafting-item" data-item-id="${escapeHtml(item.id)}" title="Remove">Delete</button>
      </div>
    </article>
  `;
}

function renderCollectedCard(item) {
  return `
    <article class="panel crafting-card crafting-card--collected">
      <div class="crafting-card__header">
        <div class="crafting-card__title-row">
          <strong class="crafting-card__name" style="opacity:0.7">📦 ${escapeHtml(item.name)}</strong>
          <span class="crafting-chip crafting-chip--time">⏱ ${item.durationDays}d</span>
        </div>
        ${item.desc ? `<p class="crafting-card__desc" style="opacity:0.6">${escapeHtml(item.desc)}</p>` : ""}
      </div>
      <div class="crafting-card__actions">
        <button class="button button--ghost button--danger-icon" data-action="delete-crafting-item" data-item-id="${escapeHtml(item.id)}" title="Remove">Remove</button>
      </div>
    </article>
  `;
}

// ─── Crafting stations (player buildings that give crafting bonuses) ──────────
// `bonuses` are per-category cost+time multipliers (lower = better, 1 = no bonus).
// `timeBonus` is an optional FLAT time-only multiplier that applies to every
// category — represents general workshop/tooling support, stacks with category.
export const CRAFTING_STATIONS = {
  "Arcana Tower":     { bonuses: { scroll: 0.40, perm: 0.75, cons: 0.85 } },
  "Techcrafter":      { bonuses: { perm:   0.50, cons: 0.70 }, timeBonus: 0.95 },
  "Dragonforge":      { bonuses: { perm:   0.60, cons: 0.80 }, timeBonus: 0.95 },
  "Alchemist":        { bonuses: { potion: 0.40, cons: 0.50 } },
  "Apothecary":       { bonuses: { potion: 0.60, cons: 0.85 } },
  "Enchanted Forest": { bonuses: { perm:   0.75, scroll: 0.75, potion: 0.75 } },
  "Weaver's Hall":    { bonuses: { perm:   0.85, cons:   0.85 } },
  "Library":          { bonuses: { scroll: 0.70 } },
  "Oracle":           { bonuses: { scroll: 0.60 } },
  "Blacksmith":       { bonuses: { perm:   0.90 }, timeBonus: 0.95 },
  // Support buildings — small time-only bonus, no cost reduction.
  "Workshop Quarter": { bonuses: {}, timeBonus: 0.90 },
  "Engineers' Guild": { bonuses: {}, timeBonus: 0.90 },
  "Tool Shed":        { bonuses: {}, timeBonus: 0.95 },
  "Carpenter Shop":   { bonuses: {}, timeBonus: 0.95 },
  "Caravan Outpost":  { bonuses: {}, timeBonus: 0.95 }
};

export function craftingTemplateCategory(id) {
  if (!id) return null;
  if (id.startsWith("perm-")) return "perm";
  if (id.startsWith("cons-")) return "cons";
  if (id.startsWith("scroll-")) return "scroll";
  if (id.startsWith("pot-")) return "potion";
  return null;
}

const CATEGORY_LABEL = { perm: "Permanent", cons: "Consumable", scroll: "Scrolls", potion: "Potions" };

export function describeCraftingStationBonuses(stationKey) {
  const s = CRAFTING_STATIONS[stationKey];
  if (!s) return "";
  const parts = Object.entries(s.bonuses ?? {})
    .map(([cat, mult]) => `${CATEGORY_LABEL[cat] ?? cat} ${Math.round((1 - mult) * 100)}% off`);
  if (s.timeBonus && s.timeBonus < 1) {
    parts.push(`Time −${Math.round((1 - s.timeBonus) * 100)}% (all crafts)`);
  }
  return parts.join(" · ");
}

// Pick out the player's completed buildings that match the station registry.
function getAvailableCraftingStations(buildings = []) {
  const seen = new Set();
  const stations = [];
  for (const b of buildings) {
    if (!b?.isComplete) continue;
    const name = b.displayName ?? b.name ?? "";
    if (!CRAFTING_STATIONS[name] || seen.has(name)) continue;
    seen.add(name);
    stations.push({ key: name, label: name, bonuses: CRAFTING_STATIONS[name].bonuses });
  }
  return stations;
}

/**
 * Returns a map { stationName -> item } of stations currently occupied by an
 * active crafting item. Paused / queued / completed items free their station.
 */
function getStationOccupants(items = [], excludeItemId = "") {
  const occ = {};
  for (const it of items) {
    if (it.status !== "active") continue;
    if (!it.craftingStation) continue;
    if (it.id === excludeItemId) continue;
    occ[it.craftingStation] = it;
  }
  return occ;
}

function renderStationPicker(stations, currentStation = "", occupants = {}) {
  if (!stations.length) {
    return `<p class="crafting-form__station-empty">No crafting buildings available yet — once you finish an Alchemist, Arcana Tower, Techcrafter, etc., it'll appear here and grant cost reductions.</p>`;
  }
  const opts = stations.map((s) => {
    const bonusText = describeCraftingStationBonuses(s.key);
    const occ = occupants[s.key];
    const isSelected = currentStation === s.key;
    const isOccupied = !!occ && !isSelected;
    const suffix = isOccupied ? ` — in use by "${occ.name}"` : ` — ${bonusText}`;
    return `<option value="${escapeHtml(s.key)}" ${isSelected ? "selected" : ""} ${isOccupied ? "disabled" : ""}>${escapeHtml(s.label)}${escapeHtml(suffix)}</option>`;
  }).join("");
  return `
    <select class="crafting-form__input" data-action="apply-crafting-station" data-crafting-field="craftingStation" aria-label="Crafted At">
      <option value="" ${currentStation ? "" : "selected"}>— Anywhere (no bonus) —</option>
      ${opts}
    </select>
    <p class="crafting-form__station-hint" data-crafting-station-hint>Pick a building to discount cost and time for the matching template category. Each building can host only one active craft at a time.</p>
  `;
}

// ─── Templates (D&D 5e crafting cost / time tables) ──────────────────────────
export const CRAFTING_TEMPLATES = [
  {
    group: "Magic Item — Permanent",
    items: [
      { id: "perm-common",     label: "Common",     name: "Permanent Magic Item (Common)",     gold: 50,     days: 5   },
      { id: "perm-uncommon",   label: "Uncommon",   name: "Permanent Magic Item (Uncommon)",   gold: 200,    days: 10  },
      { id: "perm-rare",       label: "Rare",       name: "Permanent Magic Item (Rare)",       gold: 2000,   days: 50  },
      { id: "perm-very-rare",  label: "Very Rare",  name: "Permanent Magic Item (Very Rare)",  gold: 20000,  days: 125 },
      { id: "perm-legendary",  label: "Legendary",  name: "Permanent Magic Item (Legendary)",  gold: 100000, days: 250 },
      { id: "perm-artifact",   label: "Artifact",   name: "Permanent Magic Item (Artifact)",   gold: 500000, days: 500 }
    ]
  },
  {
    group: "Magic Item — Consumable",
    items: [
      { id: "cons-common",     label: "Common",     name: "Consumable Magic Item (Common)",     gold: 25,     days: 2.5  },
      { id: "cons-uncommon",   label: "Uncommon",   name: "Consumable Magic Item (Uncommon)",   gold: 100,    days: 5    },
      { id: "cons-rare",       label: "Rare",       name: "Consumable Magic Item (Rare)",       gold: 1000,   days: 25   },
      { id: "cons-very-rare",  label: "Very Rare",  name: "Consumable Magic Item (Very Rare)",  gold: 10000,  days: 62.5 },
      { id: "cons-legendary",  label: "Legendary",  name: "Consumable Magic Item (Legendary)",  gold: 50000,  days: 125  },
      { id: "cons-artifact",   label: "Artifact",   name: "Consumable Magic Item (Artifact)",   gold: 250000, days: 250  }
    ]
  },
  {
    group: "Spell Scroll",
    items: [
      { id: "scroll-cantrip", label: "Cantrip", name: "Spell Scroll (Cantrip)", gold: 15,     days: 1   },
      { id: "scroll-1",       label: "1st",     name: "Spell Scroll (1st level)", gold: 25,    days: 1   },
      { id: "scroll-2",       label: "2nd",     name: "Spell Scroll (2nd level)", gold: 250,   days: 3   },
      { id: "scroll-3",       label: "3rd",     name: "Spell Scroll (3rd level)", gold: 500,   days: 5   },
      { id: "scroll-4",       label: "4th",     name: "Spell Scroll (4th level)", gold: 2500,  days: 10  },
      { id: "scroll-5",       label: "5th",     name: "Spell Scroll (5th level)", gold: 5000,  days: 20  },
      { id: "scroll-6",       label: "6th",     name: "Spell Scroll (6th level)", gold: 15000, days: 40  },
      { id: "scroll-7",       label: "7th",     name: "Spell Scroll (7th level)", gold: 25000, days: 80  },
      { id: "scroll-8",       label: "8th",     name: "Spell Scroll (8th level)", gold: 50000, days: 160 },
      { id: "scroll-9",       label: "9th",     name: "Spell Scroll (9th level)", gold: 250000, days: 240 }
    ]
  },
  {
    group: "Potion of Healing",
    items: [
      { id: "pot-healing",          label: "Healing",          name: "Potion of Healing",          gold: 25,    days: 1    },
      { id: "pot-greater-healing",  label: "Greater Healing",  name: "Potion of Greater Healing",  gold: 100,   days: 5    },
      { id: "pot-superior-healing", label: "Superior Healing", name: "Potion of Superior Healing", gold: 1000,  days: 25   },
      { id: "pot-supreme-healing",  label: "Supreme Healing",  name: "Potion of Supreme Healing",  gold: 10000, days: 62.5 }
    ]
  }
];

export function findCraftingTemplate(id) {
  for (const g of CRAFTING_TEMPLATES) {
    const hit = g.items.find((t) => t.id === id);
    if (hit) return hit;
  }
  return null;
}

function renderTemplatePicker() {
  const groups = CRAFTING_TEMPLATES.map((g) => {
    const opts = g.items
      .map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)} — ${formatNumber(t.gold, 0)} gp / ${t.days} d</option>`)
      .join("");
    return `<optgroup label="${escapeHtml(g.group)}">${opts}</optgroup>`;
  }).join("");
  return `
    <select class="crafting-form__input" data-action="apply-crafting-template" aria-label="Template">
      <option value="">— Pick a template (optional) —</option>
      ${groups}
    </select>
  `;
}

// ─── Start-date selector (Day / Month / Year) ─────────────────────────────────
function renderStartDateSelector(startDayOffset) {
  const d = getStructuredDate(startDayOffset);
  const dayOpts = Array.from({ length: DAYS_PER_MONTH }, (_, i) => i + 1)
    .map((n) => `<option value="${n}" ${n === d.day ? "selected" : ""}>${n}</option>`).join("");
  const monthOpts = MONTHS
    .map((m) => `<option value="${escapeHtml(m)}" ${m === d.month ? "selected" : ""}>${escapeHtml(m)}</option>`).join("");
  const yearMin = Math.min(d.year - 1, d.year);
  const yearMax = d.year + 5;
  const yearOpts = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i)
    .map((y) => `<option value="${y}" ${y === d.year ? "selected" : ""}>${y}</option>`).join("");
  return `
    <div class="crafting-form__date-selector">
      <select class="crafting-form__input" data-crafting-field="startDate.day"   aria-label="Day">${dayOpts}</select>
      <select class="crafting-form__input" data-crafting-field="startDate.month" aria-label="Month">${monthOpts}</select>
      <select class="crafting-form__input" data-crafting-field="startDate.year"  aria-label="Year">${yearOpts}</select>
    </div>
  `;
}

// ─── Add / Edit form (rendered as inline panel) ───────────────────────────────
function renderCraftingForm(editItem, dayOffset, buildings = [], crafterCapacity = { advanced: 0, experienced: 0, master: 0 }, crafterCounts = { advanced: 0, experienced: 0, master: 0 }, allItems = []) {
  const isEdit  = Boolean(editItem);
  const v       = editItem ?? {};
  const startDay = v.startDayOffset ?? dayOffset;
  const stations = getAvailableCraftingStations(buildings);
  const stationOccupants = getStationOccupants(allItems, v.id);
  const currentStation = v.craftingStation ?? "";
  // For each level, the user can still PICK it if they're editing an item that
  // already uses it (since saving the same level keeps the same count).
  const crafterDisabled = (level) => {
    const cap = crafterCapacity[level] ?? 0;
    const used = crafterCounts[level] ?? 0;
    const alreadyUsingHere = v.crafterLevel === level;
    if (alreadyUsingHere) return false;
    return cap <= 0 || used >= cap;
  };
  const crafterLabel = (level, base) => {
    const cap = crafterCapacity[level] ?? 0;
    const used = crafterCounts[level] ?? 0;
    return `${base} <small style="font-weight:400;opacity:0.75;">(${used}/${cap})</small>`;
  };
  return `
    <section class="panel crafting-form" id="crafting-form" data-crafter-level="${escapeHtml(v.crafterLevel ?? "")}" data-batch-count="1">
      <div class="panel__header">
        <h3>${isEdit ? "Edit Item" : "New Crafting Item"}</h3>
        <button class="button button--ghost" data-action="close-crafting-form">Cancel</button>
      </div>
      <div class="crafting-form__grid">
        ${isEdit ? "" : `
        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Crafted At <span style="font-weight:400;color:var(--muted);font-size:0.8em;">(discounts cost and time for matching items — only one active craft per building)</span></label>
          ${renderStationPicker(stations, currentStation, stationOccupants)}
        </div>
        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Template <span style="font-weight:400;color:var(--muted);font-size:0.8em;">(fills name, duration and per-day costs)</span></label>
          ${renderTemplatePicker()}
        </div>
        <div class="crafting-form__field crafting-form__field--full" data-crafting-batch-row style="display:none;">
          <label class="crafting-form__label">Batch Size <span style="font-weight:400;color:var(--muted);font-size:0.8em;">(scrolls and potions only — produce many in less total time)</span></label>
          <div class="crafting-form__batch-buttons">
            <button type="button" class="button button--ghost is-selected" data-action="apply-crafting-batch" data-batch-count="1">×1 (single)</button>
            <button type="button" class="button button--ghost" data-action="apply-crafting-batch" data-batch-count="5">×5 — half time per unit</button>
            <button type="button" class="button button--ghost" data-action="apply-crafting-batch" data-batch-count="10">×10 — even faster</button>
          </div>
        </div>
        `}
        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Item Name</label>
          <input class="crafting-form__input" type="text" data-crafting-field="name"
            value="${escapeHtml(v.name ?? "")}" placeholder="e.g. Enchanted Longsword +2" autocomplete="off">
        </div>
        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Description (optional)</label>
          <input class="crafting-form__input" type="text" data-crafting-field="desc"
            value="${escapeHtml(v.desc ?? "")}" placeholder="Brief notes…" autocomplete="off">
        </div>
        <div class="crafting-form__field crafting-form__field--date">
          <label class="crafting-form__label">Start Date</label>
          ${renderStartDateSelector(startDay)}
        </div>
        <div class="crafting-form__field">
          <label class="crafting-form__label">Duration (days)</label>
          <input class="crafting-form__input" type="number" min="0.5" step="0.5" data-crafting-field="durationDays"
            value="${escapeHtml(String(v.durationDays ?? ""))}" placeholder="14">
        </div>
        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Crafter Bonus <span style="font-weight:400;color:var(--muted);font-size:0.8em;">(pick one — the bonus is applied when you press Add Item; the crafter is freed when the item completes)</span></label>
          <div class="crafting-form__crafter-buttons">
            <button type="button" class="button button--ghost ${v.crafterLevel === "advanced" ? "is-selected" : ""}" data-action="apply-crafter-bonus" data-crafter-level="advanced" ${crafterDisabled("advanced") ? "disabled" : ""}>${crafterLabel("advanced", "Advanced — 1.5× speed")}</button>
            <button type="button" class="button button--ghost ${v.crafterLevel === "experienced" ? "is-selected" : ""}" data-action="apply-crafter-bonus" data-crafter-level="experienced" ${crafterDisabled("experienced") ? "disabled" : ""}>${crafterLabel("experienced", "Experienced — 2× speed")}</button>
            <button type="button" class="button button--ghost ${v.crafterLevel === "master" ? "is-selected" : ""}" data-action="apply-crafter-bonus" data-crafter-level="master" ${crafterDisabled("master") ? "disabled" : ""}>${crafterLabel("master", "Master — 4× speed")}</button>
          </div>
        </div>

        <div class="crafting-form__field crafting-form__field--full">
          <label class="crafting-form__label">Daily Resource Costs <span style="font-weight:400;color:var(--muted);font-size:0.8em;">(deducted from town economy each day while active)</span></label>
          <div class="crafting-form__costs">
            <label class="crafting-form__cost-field">
              <span style="color:#fbbf24">💰 Gold/day</span>
              <input class="crafting-form__input" type="number" min="0" step="0.1" data-crafting-field="costs.gold"
                value="${escapeHtml(String(v.costs?.gold ?? ""))}" placeholder="0">
            </label>
            <label class="crafting-form__cost-field">
              <span style="color:#a78bfa">✨ Mana/day</span>
              <input class="crafting-form__input" type="number" min="0" step="0.1" data-crafting-field="costs.mana"
                value="${escapeHtml(String(v.costs?.mana ?? ""))}" placeholder="0">
            </label>
            <label class="crafting-form__cost-field">
              <span style="color:#86efac">🪵 Materials/day</span>
              <input class="crafting-form__input" type="number" min="0" step="0.1" data-crafting-field="costs.materials"
                value="${escapeHtml(String(v.costs?.materials ?? ""))}" placeholder="0">
            </label>
            <label class="crafting-form__cost-field">
              <span style="color:#94a3b8">⚙️ Salvage/day</span>
              <input class="crafting-form__input" type="number" min="0" step="0.1" data-crafting-field="costs.salvage"
                value="${escapeHtml(String(v.costs?.salvage ?? ""))}" placeholder="0">
            </label>
            <label class="crafting-form__cost-field">
              <span style="color:#fb923c">🍖 Food/day</span>
              <input class="crafting-form__input" type="number" min="0" step="0.1" data-crafting-field="costs.food"
                value="${escapeHtml(String(v.costs?.food ?? ""))}" placeholder="0">
            </label>
          </div>
        </div>

        <div class="crafting-form__field crafting-form__field--full">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" data-crafting-field="queued" ${v.status === "queued" ? "checked" : ""}
              style="accent-color:var(--accent);">
            <span class="crafting-form__label" style="margin:0;">Add to queue (don't start yet)</span>
          </label>
        </div>
      </div>
      <div class="crafting-form__footer">
        <button class="button button--ghost" data-action="close-crafting-form">Cancel</button>
        <button class="button" data-action="save-crafting-item" ${isEdit ? `data-item-id="${escapeHtml(v.id)}"` : ""}>
          ${isEdit ? "Save Changes" : "Add Item"}
        </button>
      </div>
    </section>
  `;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function renderCraftingPage(state) {
  const dayOffset = state.calendar.dayOffset;
  const items     = Array.isArray(state.craftingItems) ? state.craftingItems : [];
  const editItem  = state.transientUi?.craftingEditItem ?? null;
  const showForm  = state.transientUi?.craftingFormOpen ?? false;

  const ready     = items.filter(it => isReady(it, dayOffset));
  const active    = items.filter(it => isInProgress(it, dayOffset) || it.status === "paused");
  const queued    = items.filter(it => it.status === "queued");
  const collected = items.filter(it => it.status === "collected");

  // Daily upkeep from active items (paused items naturally excluded by status check).
  const upkeep = getActiveCraftingUpkeep(state);
  const hasUpkeep = Object.values(upkeep).some(v => v > 0);

  // Crafter accounting: count active items currently using each crafter level.
  // A crafter is released as soon as the item leaves "active" status (paused / completed / queued / collected).
  const crafterCounts = { advanced: 0, experienced: 0, master: 0 };
  for (const it of items) {
    if (it.status !== "active") continue;
    if (it.crafterLevel && crafterCounts[it.crafterLevel] !== undefined) {
      crafterCounts[it.crafterLevel]++;
    }
  }
  const crafterCapacity = getCrafterCapacity(state);

  return {
    title: "Crafting",
    subtitle: "Track item crafting progress, resource costs, and completion dates.",
    hideHero: true,
    content: `
      <header class="crafting-page-title">
        <h1>🛠 Crafting</h1>
        <p>Track item crafting progress, resource costs, and completion dates.</p>
      </header>

      <section class="panel crafting-top-bar">
        <div class="crafting-top-bar__col">
          <span class="crafting-top-bar__label">Total daily crafting costs</span>
          <div class="crafting-top-bar__chips">
            ${hasUpkeep ? costChips(upkeep) : `<span class="crafting-chip crafting-chip--none">No active items</span>`}
          </div>
        </div>
        <div class="crafting-top-bar__col">
          <span class="crafting-top-bar__label">Crafters in use</span>
          <div class="crafting-top-bar__chips">
            <span class="crafting-chip crafting-chip--crafter crafting-chip--crafter-advanced${crafterCounts.advanced >= crafterCapacity.advanced && crafterCapacity.advanced > 0 ? " is-full" : ""}">Advanced: ${crafterCounts.advanced} / ${crafterCapacity.advanced}</span>
            <span class="crafting-chip crafting-chip--crafter crafting-chip--crafter-experienced${crafterCounts.experienced >= crafterCapacity.experienced && crafterCapacity.experienced > 0 ? " is-full" : ""}">Experienced: ${crafterCounts.experienced} / ${crafterCapacity.experienced}</span>
            <span class="crafting-chip crafting-chip--crafter crafting-chip--crafter-master${crafterCounts.master >= crafterCapacity.master && crafterCapacity.master > 0 ? " is-full" : ""}">Master: ${crafterCounts.master} / ${crafterCapacity.master}</span>
          </div>
          <small class="crafting-top-bar__hint">Assign crafter roles to NPCs to unlock more crafter slots. Each crafter is released automatically when their assignment ends.</small>
        </div>
      </section>

      ${showForm ? renderCraftingForm(editItem, dayOffset, state.buildings ?? [], crafterCapacity, crafterCounts, items) : `
        <div class="crafting-header-actions">
          <button class="button" data-action="open-crafting-form">+ New Item</button>
          ${queued.length ? `<button class="button button--ghost" data-action="start-next-crafting">▶ Start Next in Queue</button>` : ""}
        </div>
      `}

      ${ready.length ? `
        <section class="crafting-section">
          <div class="crafting-section__head">
            <h3 class="crafting-section__title crafting-section__title--ready">✅ Ready to Collect</h3>
            <em class="crafting-section__count crafting-section__count--ready">${ready.length}</em>
          </div>
          <div class="crafting-section__list">
            ${ready.map(renderReadyCard).join("")}
          </div>
        </section>
      ` : ""}

      <section class="crafting-section">
        <div class="crafting-section__head">
          <h3 class="crafting-section__title">🔨 In Progress</h3>
          <em class="crafting-section__count">${active.length}</em>
        </div>
        ${active.length
          ? `<div class="crafting-section__list">${active.map(it => renderActiveCard(it, dayOffset)).join("")}</div>`
          : `<p class="crafting-empty">No items being crafted. Add one or start something from the queue.</p>`}
      </section>

      <section class="crafting-section">
        <div class="crafting-section__head">
          <h3 class="crafting-section__title">⏳ Queue</h3>
          <em class="crafting-section__count">${queued.length}</em>
        </div>
        ${queued.length
          ? `<div class="crafting-section__list">${queued.map((it, i) => renderQueueCard(it, i, queued.length)).join("")}</div>`
          : `<p class="crafting-empty">Queue is empty.</p>`}
      </section>

      ${collected.length ? `
        <section class="crafting-section">
          <div class="crafting-section__head">
            <h3 class="crafting-section__title" style="opacity:0.6">📦 Collected</h3>
            <em class="crafting-section__count">${collected.length}</em>
            <button class="button button--ghost" style="font-size:0.8rem;padding:4px 10px;" data-action="clear-collected-crafting">Clear All</button>
          </div>
          <div class="crafting-section__list">
            ${collected.map(renderCollectedCard).join("")}
          </div>
        </section>
      ` : ""}
    `
  };
}
