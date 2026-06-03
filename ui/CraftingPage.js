import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getActiveCraftingUpkeep } from "../systems/CraftingSystem.js";

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

function renderActiveCard(item, dayOffset) {
  const pct   = craftingProgressPct(item, dayOffset);
  const left  = daysLeft(item, dayOffset);
  const endDay = craftingCompletionDay(item);
  const urgentClass = left <= 1 ? "crafting-days--urgent" : left <= 3 ? "crafting-days--soon" : "";
  return `
    <article class="panel crafting-card crafting-card--active">
      <div class="crafting-card__header">
        <div class="crafting-card__title-row">
          <strong class="crafting-card__name">${escapeHtml(item.name)}</strong>
          <span class="crafting-days ${urgentClass}">
            ${left === 0 ? "Due today" : left === 1 ? "1 day left" : `${left} days left`}
          </span>
        </div>
        ${item.desc ? `<p class="crafting-card__desc">${escapeHtml(item.desc)}</p>` : ""}
      </div>
      <div class="crafting-bar">
        <div class="crafting-bar__fill ${pctClass(pct)}" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="crafting-card__progress-row">
        <span>Day ${item.startDayOffset} → ${endDay} &nbsp;(${pct.toFixed(0)}%)</span>
        <span>Complete: <strong>${formatDate(endDay)}</strong></span>
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

// ─── Add / Edit form (rendered as inline panel) ───────────────────────────────
function renderCraftingForm(editItem, dayOffset) {
  const isEdit  = Boolean(editItem);
  const v       = editItem ?? {};
  const startDay = v.startDayOffset ?? dayOffset;
  return `
    <section class="panel crafting-form" id="crafting-form">
      <div class="panel__header">
        <h3>${isEdit ? "Edit Item" : "New Crafting Item"}</h3>
        <button class="button button--ghost" data-action="close-crafting-form">Cancel</button>
      </div>
      <div class="crafting-form__grid">
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
        <div class="crafting-form__field">
          <label class="crafting-form__label">Start Day</label>
          <input class="crafting-form__input" type="number" min="0" data-crafting-field="startDayOffset"
            value="${escapeHtml(String(startDay))}" placeholder="${dayOffset}">
        </div>
        <div class="crafting-form__field">
          <label class="crafting-form__label">Duration (days)</label>
          <input class="crafting-form__input" type="number" min="1" data-crafting-field="durationDays"
            value="${escapeHtml(String(v.durationDays ?? ""))}" placeholder="14">
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
  const active    = items.filter(it => isInProgress(it, dayOffset));
  const queued    = items.filter(it => it.status === "queued");
  const collected = items.filter(it => it.status === "collected");

  // Daily upkeep from active items
  const upkeep = getActiveCraftingUpkeep(state);
  const hasUpkeep = Object.values(upkeep).some(v => v > 0);

  return {
    title: "Crafting",
    subtitle: "Track item crafting progress, resource costs, and completion dates.",
    content: `
      ${showForm ? renderCraftingForm(editItem, dayOffset) : `
        <div class="crafting-header-actions">
          <button class="button" data-action="open-crafting-form">+ New Item</button>
          ${queued.length ? `<button class="button button--ghost" data-action="start-next-crafting">▶ Start Next in Queue</button>` : ""}
        </div>
      `}

      ${hasUpkeep ? `
        <section class="panel crafting-upkeep-banner">
          <span class="panel__subtle">Active daily crafting cost — deducted from town economy each day:</span>
          <div class="crafting-upkeep-chips">
            ${costChips(upkeep)}
          </div>
        </section>
      ` : ""}

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
