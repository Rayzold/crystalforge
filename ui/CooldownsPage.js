// Cooldowns page — tracks per-effect cooldowns (Seeker, Oracle, NPC abilities,
// custom GM-tracked recharges) and shows when they next become available.

import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { MONTHS, DAYS_PER_MONTH } from "../content/CalendarConfig.js";
import {
  getCooldownReadyDay,
  getCooldownDaysRemaining,
  getCooldownTriggerChance,
  isCooldownReady
} from "../systems/CooldownSystem.js?v=2.0.25";

function renderStartDateSelector(startDayOffset) {
  const d = getStructuredDate(startDayOffset);
  const dayOpts = Array.from({ length: DAYS_PER_MONTH }, (_, i) => i + 1)
    .map((n) => `<option value="${n}" ${n === d.day ? "selected" : ""}>${n}</option>`).join("");
  const monthOpts = MONTHS
    .map((m) => `<option value="${escapeHtml(m)}" ${m === d.month ? "selected" : ""}>${escapeHtml(m)}</option>`).join("");
  const yearMin = d.year - 1;
  const yearMax = d.year + 5;
  const yearOpts = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i)
    .map((y) => `<option value="${y}" ${y === d.year ? "selected" : ""}>${y}</option>`).join("");
  return `
    <div class="cooldown-form__date-selector">
      <select data-cooldown-field="startDate.day"   aria-label="Day">${dayOpts}</select>
      <select data-cooldown-field="startDate.month" aria-label="Month">${monthOpts}</select>
      <select data-cooldown-field="startDate.year"  aria-label="Year">${yearOpts}</select>
    </div>
  `;
}

function pickBuildingOptions(state) {
  // Only completed buildings (the cooldown is for activating their special effect).
  const items = (state.buildings ?? [])
    .filter((b) => b.isComplete)
    .map((b) => ({ id: b.id, label: b.displayName ?? b.name ?? b.key }))
    .sort((a, b) => a.label.localeCompare(b.label));
  // De-dupe by displayName (same building may appear multiple times in the catalog).
  const seen = new Set();
  return items.filter((entry) => (seen.has(entry.label) ? false : (seen.add(entry.label), true)));
}

function pickNpcOptions(state) {
  return (state.npcs ?? [])
    .filter((n) => n?.status !== "deceased")
    .map((n) => ({ id: n.id, label: n.name || "Unnamed NPC" }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function renderTypeFieldsForForm(state) {
  // Default field set rendered initially. The user can switch type with the
  // dropdown; JS in app.js swaps which sub-fieldset is visible.
  return `
    <div class="cooldown-form__type-fields" data-cooldown-type-fields="fixed">
      <label class="cooldown-form__field">
        <span>Days until ready</span>
        <input type="number" min="1" value="7" data-cooldown-field="fixedDays" />
      </label>
    </div>
    <div class="cooldown-form__type-fields" data-cooldown-type-fields="dice" hidden>
      <label class="cooldown-form__field">
        <span>Dice count</span>
        <input type="number" min="1" value="1" data-cooldown-field="diceCount" />
      </label>
      <label class="cooldown-form__field">
        <span>Dice sides</span>
        <input type="number" min="2" value="4" data-cooldown-field="diceSides" />
      </label>
      <p class="cooldown-form__hint">Rolled once on save. e.g. 1d4 picks a random 1–4 day cooldown.</p>
    </div>
    <div class="cooldown-form__type-fields" data-cooldown-type-fields="percent" hidden>
      <label class="cooldown-form__field">
        <span>Percent per day</span>
        <input type="number" min="0.1" max="100" step="0.1" value="1" data-cooldown-field="percentPerDay" />
      </label>
      <p class="cooldown-form__hint">Chance to trigger today = days × percent. e.g. 1%/day means day 1 = 1%, day 50 = 50%, day 100 = ready.</p>
    </div>
  `;
}

function renderAddForm(state) {
  const buildings = pickBuildingOptions(state);
  const npcs = pickNpcOptions(state);
  return `
    <section class="panel cooldown-add-form" data-cooldown-form>
      <header class="panel__header">
        <div>
          <h3>Add Cooldown</h3>
          <span class="panel__subtle">Track a Seeker / Oracle activation, an NPC ability, or any custom recharge.</span>
        </div>
      </header>
      <div class="cooldown-form__grid">
        <label class="cooldown-form__field cooldown-form__field--full">
          <span>Source</span>
          <select data-cooldown-source-picker>
            <optgroup label="Building">
              <option value="" disabled selected>— Pick a building —</option>
              ${buildings.map((b) => `<option value="building::${escapeHtml(b.id)}" data-name="${escapeHtml(b.label)}">${escapeHtml(b.label)}</option>`).join("")}
            </optgroup>
            ${npcs.length ? `
            <optgroup label="NPC">
              ${npcs.map((n) => `<option value="npc::${escapeHtml(n.id)}" data-name="${escapeHtml(n.label)} (ability)">${escapeHtml(n.label)}</option>`).join("")}
            </optgroup>` : ""}
            <optgroup label="Custom">
              <option value="custom::" data-name="">Custom effect…</option>
            </optgroup>
          </select>
        </label>
        <label class="cooldown-form__field cooldown-form__field--full">
          <span>Name</span>
          <input type="text" data-cooldown-field="name" placeholder="e.g. The Seeker — Find Lost City" />
        </label>
        <label class="cooldown-form__field">
          <span>Cooldown type</span>
          <select data-cooldown-type-select>
            <option value="fixed">Fixed days</option>
            <option value="dice">Dice roll (XdY)</option>
            <option value="percent">% per day (cumulative)</option>
          </select>
        </label>
        <div class="cooldown-form__field">
          <span>Start date</span>
          ${renderStartDateSelector(state.calendar?.dayOffset ?? 0)}
        </div>
        ${renderTypeFieldsForForm(state)}
        <label class="cooldown-form__field cooldown-form__field--full">
          <span>Notes (optional)</span>
          <input type="text" data-cooldown-field="notes" placeholder="e.g. activated to scout the eastern ruins" />
        </label>
      </div>
      <footer class="cooldown-form__footer">
        <button class="button" type="button" data-action="add-cooldown">+ Add Cooldown</button>
      </footer>
    </section>
  `;
}

function renderCooldownCard(cooldown, dayOffset) {
  const ready = getCooldownReadyDay(cooldown);
  const daysLeft = getCooldownDaysRemaining(cooldown, dayOffset);
  const triggerChance = getCooldownTriggerChance(cooldown, dayOffset);
  const isAvailable = isCooldownReady(cooldown, dayOffset);
  const statusClass = isAvailable
    ? "is-ready"
    : daysLeft !== null && daysLeft <= 2
      ? "is-soon"
      : "";

  let summaryParts = [];
  if (cooldown.type === "fixed") {
    summaryParts.push(`Fixed ${cooldown.fixedDays} d`);
  } else if (cooldown.type === "dice") {
    summaryParts.push(`${cooldown.diceCount}d${cooldown.diceSides} → rolled ${cooldown.rolledDays} d`);
  } else if (cooldown.type === "percent") {
    summaryParts.push(`${formatNumber(cooldown.percentPerDay, 2)}% per day`);
  }
  if (cooldown.sourceType !== "custom") {
    summaryParts.push(cooldown.sourceType === "building" ? "Building" : "NPC");
  }

  let primaryInfo = "";
  if (cooldown.type === "percent") {
    if (cooldown.triggeredDayOffset !== null) {
      primaryInfo = `<span class="cooldown-card__big cooldown-card__big--ready">✓ Triggered on ${formatDate(cooldown.triggeredDayOffset)}</span>`;
    } else {
      const daysPassed = Math.max(0, dayOffset - cooldown.startedDayOffset);
      const daysToCertain = Math.ceil(100 / (cooldown.percentPerDay || 1));
      const certainDay = cooldown.startedDayOffset + daysToCertain;
      const certainIn = certainDay - dayOffset;
      primaryInfo = `
        <span class="cooldown-card__big">${formatNumber(triggerChance, 1)}% chance today</span>
        <small>${formatNumber(daysPassed, 0)} d elapsed — rolled every Advance Day</small>
        <small>Certain by ${formatDate(certainDay)} (${certainIn <= 0 ? "now" : `in ${certainIn} d`})</small>
      `;
    }
  } else if (ready !== null) {
    if (daysLeft <= 0) {
      const overdue = Math.abs(daysLeft);
      primaryInfo = `<span class="cooldown-card__big cooldown-card__big--ready">✓ Ready to use${overdue > 0 ? ` (${overdue} d ago)` : ""}</span>`;
    } else {
      primaryInfo = `
        <span class="cooldown-card__big">${formatNumber(daysLeft, 0)} d remaining</span>
        <small>Ready on ${formatDate(ready)}</small>
      `;
    }
  }

  // Percent cooldowns are rolled automatically each day during the global
  // Advance Day tick — no manual "Mark triggered today" needed in normal play.
  // For fixed/dice cooldowns the user explicitly "uses" the effect, which
  // restarts the cooldown.
  const restartButton = isAvailable || cooldown.triggeredDayOffset !== null
    ? `<button class="button" type="button" data-action="restart-cooldown" data-cooldown-id="${escapeHtml(cooldown.id)}">${cooldown.type === "dice" ? "Use & reroll" : "Use again"}</button>`
    : `<button class="button button--ghost" type="button" data-action="restart-cooldown" data-cooldown-id="${escapeHtml(cooldown.id)}">Restart now</button>`;

  return `
    <article class="cooldown-card ${statusClass}">
      <header class="cooldown-card__head">
        <div>
          <strong>${escapeHtml(cooldown.name)}</strong>
          <small>${summaryParts.map(escapeHtml).join(" · ")}</small>
        </div>
        <button class="button button--ghost button--small" type="button" data-action="remove-cooldown" data-cooldown-id="${escapeHtml(cooldown.id)}" title="Remove">✕</button>
      </header>
      <div class="cooldown-card__body">
        ${primaryInfo}
        ${cooldown.notes ? `<p class="cooldown-card__notes">${escapeHtml(cooldown.notes)}</p>` : ""}
      </div>
      <footer class="cooldown-card__footer">
        ${restartButton}
      </footer>
    </article>
  `;
}

export function renderCooldownsPage(state) {
  const dayOffset = state.calendar?.dayOffset ?? 0;
  const cooldowns = Array.isArray(state.cooldowns) ? state.cooldowns : [];

  const ready = [];
  const active = [];
  for (const c of cooldowns) {
    (isCooldownReady(c, dayOffset) ? ready : active).push(c);
  }
  // Active sorted by ready-day (or by start day for percent).
  active.sort((a, b) => {
    const ra = getCooldownReadyDay(a) ?? Number.POSITIVE_INFINITY;
    const rb = getCooldownReadyDay(b) ?? Number.POSITIVE_INFINITY;
    return ra - rb;
  });

  return {
    title: "Cooldowns",
    subtitle: "Building activations, NPC abilities, and custom recharges.",
    hideHero: true,
    content: `
      <header class="crafting-page-title">
        <h1>⏱ Cooldowns</h1>
        <p>Track effects that need to recharge — Seeker scouts, Oracle visions, NPC powers, or anything else with a per-day cost.</p>
      </header>

      ${renderAddForm(state)}

      <section class="cooldown-section">
        <header class="cooldown-section__head">
          <h3>Active</h3>
          <span>${active.length} cooling</span>
        </header>
        ${active.length
          ? `<div class="cooldown-grid">${active.map((c) => renderCooldownCard(c, dayOffset)).join("")}</div>`
          : `<p class="cooldown-empty">No effects are on cooldown. Add one above to start tracking.</p>`}
      </section>

      ${ready.length ? `
        <section class="cooldown-section">
          <header class="cooldown-section__head">
            <h3>Ready</h3>
            <span>${ready.length} available</span>
          </header>
          <div class="cooldown-grid">${ready.map((c) => renderCooldownCard(c, dayOffset)).join("")}</div>
        </section>
      ` : ""}
    `
  };
}
