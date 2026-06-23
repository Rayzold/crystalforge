// Behemoth bestiary page.
// Renders the GM-editable roster of huge monsters captured at the Drift,
// each one shown as a simple character sheet with image, stats, abilities,
// and lore. All fields commit on blur to preserve cursor position across
// the app's full re-render cycle.
import {
  BEHEMOTH_SIZES,
  BEHEMOTH_STATUSES,
  BEHEMOTH_STAT_KEYS,
  BEHEMOTH_TEMPERAMENTS,
  BEHEMOTH_UPKEEP_RESOURCES,
  getBehemothSizeLabel,
  getBehemothStatusDetail,
  getBehemothStatusLabel
} from "../content/BehemothConfig.js?v=v1.7.20-20260623073844";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260623073844";
import { formatDate } from "../systems/CalendarSystem.js?v=v1.7.20-20260623073844";

function renderBehemothSummaryThumb(behemoth) {
  const src = getBehemothImageSrc(behemoth);
  if (src) {
    return `<img class="roster-row__thumb" src="${escapeHtml(src)}" alt="" loading="lazy" />`;
  }
  return `<div class="roster-row__thumb roster-row__thumb--placeholder" aria-hidden="true">\u{1F409}</div>`;
}

function renderBehemothCollapsedRow(behemoth) {
  return `
    <article class="panel behemoth-card behemoth-card--collapsed roster-row" data-behemoth-id="${escapeHtml(behemoth.id)}">
      <button
        class="roster-row__expand"
        type="button"
        data-action="toggle-behemoth-expanded"
        data-behemoth-id="${escapeHtml(behemoth.id)}"
        aria-expanded="false"
        title="Expand sheet"
      >
        ${renderBehemothSummaryThumb(behemoth)}
        <div class="roster-row__meta">
          <strong>${escapeHtml(behemoth.name || "Unnamed Behemoth")}</strong>
          <span>${escapeHtml(behemoth.kind || getBehemothSizeLabel(behemoth.size))} · ${escapeHtml(getBehemothStatusLabel(behemoth.status))}</span>
        </div>
        <span class="roster-row__chevron" aria-hidden="true">▼</span>
      </button>
    </article>
  `;
}

function getBehemothImageSrc(behemoth) {
  if (behemoth.imageData && behemoth.imageData.startsWith("data:image/")) {
    return behemoth.imageData;
  }
  if (behemoth.imagePath && behemoth.imagePath.trim()) {
    return behemoth.imagePath.trim();
  }
  return "";
}

function renderBehemothImage(behemoth) {
  const src = getBehemothImageSrc(behemoth);
  if (src) {
    return `
      <img
        class="behemoth-card__image"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(behemoth.name)} portrait"
        loading="lazy"
        onerror="this.parentElement?.classList.add('behemoth-card__media--missing'); this.remove();"
      />
    `;
  }
  return `
    <div class="behemoth-card__image-placeholder" aria-hidden="true">
      <span>\u{1F409}</span>
      <small>No image attached</small>
    </div>
  `;
}

function renderSelectField({ behemothId, field, value, options, label }) {
  return `
    <label class="behemoth-card__field behemoth-card__field--select">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <select
        data-action="set-behemoth-field"
        data-behemoth-id="${escapeHtml(behemothId)}"
        data-field="${escapeHtml(field)}"
      >
        ${options
          .map(
            (option) => `
              <option value="${escapeHtml(option.id)}" ${option.id === value ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderTextField({ behemothId, field, value, label, placeholder = "" }) {
  return `
    <label class="behemoth-card__field">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <input
        type="text"
        data-action="set-behemoth-field"
        data-behemoth-id="${escapeHtml(behemothId)}"
        data-field="${escapeHtml(field)}"
        value="${escapeHtml(value ?? "")}"
        placeholder="${escapeHtml(placeholder)}"
      />
    </label>
  `;
}

function renderStatsBlock(behemoth) {
  return `
    <div class="behemoth-card__stats">
      ${BEHEMOTH_STAT_KEYS.map((stat) => {
        const value = Number(behemoth.stats?.[stat.id] ?? 0) || 0;
        return `
          <label class="behemoth-card__stat" title="${escapeHtml(stat.hint)}">
            <span class="behemoth-card__stat-label">${escapeHtml(stat.label)}</span>
            <input
              type="number"
              min="0"
              step="1"
              data-action="set-behemoth-stat"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
              data-stat-id="${escapeHtml(stat.id)}"
              value="${formatNumber(value)}"
            />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderAbilities(behemoth) {
  if (!behemoth.abilities.length) {
    return `
      <div class="behemoth-card__abilities-empty">
        <p>No abilities recorded yet. Use <em>Add Ability</em> to start the bestiary entry.</p>
      </div>
    `;
  }
  return `
    <div class="behemoth-card__ability-list">
      ${behemoth.abilities
        .map(
          (ability) => `
            <article class="behemoth-card__ability">
              <div class="behemoth-card__ability-head">
                <input
                  class="behemoth-card__ability-name"
                  type="text"
                  data-action="set-behemoth-ability-field"
                  data-behemoth-id="${escapeHtml(behemoth.id)}"
                  data-ability-id="${escapeHtml(ability.id)}"
                  data-field="name"
                  value="${escapeHtml(ability.name ?? "")}"
                  placeholder="Ability name"
                />
                <button
                  class="button button--ghost button--small"
                  type="button"
                  data-action="remove-behemoth-ability"
                  data-behemoth-id="${escapeHtml(behemoth.id)}"
                  data-ability-id="${escapeHtml(ability.id)}"
                  title="Remove ability"
                  aria-label="Remove ability"
                >Remove</button>
              </div>
              <textarea
                class="behemoth-card__ability-description"
                data-action="set-behemoth-ability-field"
                data-behemoth-id="${escapeHtml(behemoth.id)}"
                data-ability-id="${escapeHtml(ability.id)}"
                data-field="description"
                rows="3"
                placeholder="Effect, range, triggers, save DC, recharge — write what your table needs."
              >${escapeHtml(ability.description ?? "")}</textarea>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderUpkeep(behemoth) {
  const upkeep = Array.isArray(behemoth.upkeep) ? behemoth.upkeep : [];
  if (!upkeep.length) {
    return `
      <div class="behemoth-card__abilities-empty">
        <p>No upkeep set. Use <em>Add Upkeep</em> if this behemoth needs daily resources to stay fed and kept.</p>
      </div>
    `;
  }
  return `
    <div class="behemoth-card__upkeep-list">
      ${upkeep
        .map(
          (entry) => `
            <div class="behemoth-card__upkeep-row">
              <label class="behemoth-card__field">
                <span class="behemoth-card__field-label">Resource</span>
                <select
                  data-action="set-behemoth-upkeep-field"
                  data-behemoth-id="${escapeHtml(behemoth.id)}"
                  data-entry-id="${escapeHtml(entry.id)}"
                  data-field="resource"
                >
                  ${BEHEMOTH_UPKEEP_RESOURCES.map(
                    (option) => `
                      <option value="${escapeHtml(option.id)}" ${option.id === entry.resource ? "selected" : ""}>
                        ${escapeHtml(option.label)}
                      </option>
                    `
                  ).join("")}
                </select>
              </label>
              <label class="behemoth-card__field">
                <span class="behemoth-card__field-label">Per Day</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  data-action="set-behemoth-upkeep-field"
                  data-behemoth-id="${escapeHtml(behemoth.id)}"
                  data-entry-id="${escapeHtml(entry.id)}"
                  data-field="amount"
                  value="${formatNumber(Number(entry.amount ?? 0) || 0, 2)}"
                />
              </label>
              <button
                class="button button--ghost button--small behemoth-card__upkeep-remove"
                type="button"
                data-action="remove-behemoth-upkeep"
                data-behemoth-id="${escapeHtml(behemoth.id)}"
                data-entry-id="${escapeHtml(entry.id)}"
                title="Remove upkeep entry"
                aria-label="Remove upkeep entry"
              >Remove</button>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCapturedLine(behemoth) {
  if (!Number.isFinite(behemoth.capturedDayOffset)) {
    return "Captured date not set";
  }
  return `Captured ${formatDate(behemoth.capturedDayOffset)}`;
}

function renderBehemothCard(behemoth) {
  const statusDetail = getBehemothStatusDetail(behemoth.status);
  return `
    <article class="panel behemoth-card" data-behemoth-id="${escapeHtml(behemoth.id)}">
      <div class="behemoth-card__media">
        ${renderBehemothImage(behemoth)}
        <div class="behemoth-card__media-tools">
          <label class="button button--ghost button--small behemoth-card__upload-label">
            <span>${getBehemothImageSrc(behemoth) ? "Replace Image" : "Upload Image"}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              data-action="upload-behemoth-image"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
            />
          </label>
          ${
            getBehemothImageSrc(behemoth)
              ? `<button
                  class="button button--ghost button--small"
                  type="button"
                  data-action="clear-behemoth-image"
                  data-behemoth-id="${escapeHtml(behemoth.id)}"
                >Clear Image</button>`
              : ""
          }
        </div>
      </div>

      <div class="behemoth-card__body">
        <header class="behemoth-card__header">
          <input
            class="behemoth-card__name"
            type="text"
            data-action="set-behemoth-field"
            data-behemoth-id="${escapeHtml(behemoth.id)}"
            data-field="name"
            value="${escapeHtml(behemoth.name ?? "")}"
            placeholder="Name this behemoth"
          />
          <button
            class="button button--ghost button--small"
            type="button"
            data-action="toggle-behemoth-expanded"
            data-behemoth-id="${escapeHtml(behemoth.id)}"
            aria-expanded="true"
            title="Collapse sheet"
          >Collapse</button>
          <button
            class="button button--ghost button--small behemoth-card__delete"
            type="button"
            data-action="delete-behemoth"
            data-behemoth-id="${escapeHtml(behemoth.id)}"
            title="Delete behemoth"
          >Delete</button>
        </header>

        <p class="behemoth-card__caption">${escapeHtml(renderCapturedLine(behemoth))}</p>

        <div class="behemoth-card__grid">
          ${renderTextField({
            behemothId: behemoth.id,
            field: "kind",
            value: behemoth.kind,
            label: "Kind / Type",
            placeholder: "e.g. Sky Leviathan, Stone Wyrm"
          })}
          ${renderSelectField({
            behemothId: behemoth.id,
            field: "size",
            value: behemoth.size,
            options: BEHEMOTH_SIZES,
            label: "Size"
          })}
          ${renderSelectField({
            behemothId: behemoth.id,
            field: "status",
            value: behemoth.status,
            options: BEHEMOTH_STATUSES,
            label: "Status"
          })}
          ${renderSelectField({
            behemothId: behemoth.id,
            field: "temperament",
            value: behemoth.temperament,
            options: BEHEMOTH_TEMPERAMENTS,
            label: "Temperament"
          })}
        </div>

        ${statusDetail ? `<p class="behemoth-card__status-detail">${escapeHtml(statusDetail)}</p>` : ""}

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Core Stats</h4>
            <small>Loose values. Use whatever scale fits your table.</small>
          </div>
          ${renderStatsBlock(behemoth)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Abilities</h4>
            <button
              class="button button--ghost button--small"
              type="button"
              data-action="add-behemoth-ability"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
            >+ Add Ability</button>
          </div>
          ${renderAbilities(behemoth)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Daily Upkeep</h4>
            <button
              class="button button--ghost button--small"
              type="button"
              data-action="add-behemoth-upkeep"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
            >+ Add Upkeep</button>
          </div>
          ${renderUpkeep(behemoth)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Origin &amp; Lore</h4>
          </div>
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Origin</span>
            <input
              type="text"
              data-action="set-behemoth-field"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
              data-field="origin"
              value="${escapeHtml(behemoth.origin ?? "")}"
              placeholder="Where was it found, and by whom?"
            />
          </label>
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Lore &amp; Notes</span>
            <textarea
              data-action="set-behemoth-field"
              data-behemoth-id="${escapeHtml(behemoth.id)}"
              data-field="lore"
              rows="4"
              placeholder="Backstory, quirks, weaknesses, what it eats, what calms it..."
            >${escapeHtml(behemoth.lore ?? "")}</textarea>
          </label>
        </section>
      </div>
    </article>
  `;
}

function summarizeRoster(behemoths) {
  const counts = { wild: 0, captured: 0, bonded: 0, released: 0 };
  for (const entry of behemoths) {
    if (Object.prototype.hasOwnProperty.call(counts, entry.status)) {
      counts[entry.status] += 1;
    }
  }
  return counts;
}

function renderBehemothFilterRow(state, behemoths) {
  const filter = state.transientUi?.behemothFilter ?? { query: "", statuses: [] };
  const activeStatuses = new Set(filter.statuses ?? []);
  const query = filter.query ?? "";
  if (!behemoths.length) {
    return "";
  }
  return `
    <div class="roster-filter">
      <label class="roster-filter__search">
        <span class="behemoth-card__field-label">Search</span>
        <input
          type="search"
          data-action="set-behemoth-filter-query"
          value="${escapeHtml(query)}"
          placeholder="Search by name or kind"
        />
      </label>
      <div class="roster-filter__chips" role="group" aria-label="Filter by status">
        ${BEHEMOTH_STATUSES.map(
          (status) => `
            <button
              class="button button--ghost button--small roster-filter__chip ${activeStatuses.has(status.id) ? "is-active" : ""}"
              type="button"
              data-action="toggle-behemoth-filter-status"
              data-status-id="${escapeHtml(status.id)}"
              aria-pressed="${activeStatuses.has(status.id) ? "true" : "false"}"
            >${escapeHtml(status.label)}</button>
          `
        ).join("")}
        ${
          activeStatuses.size || query
            ? `<button class="button button--ghost button--small" type="button" data-action="clear-behemoth-filter">Clear</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function filterBehemoths(state, behemoths) {
  const filter = state.transientUi?.behemothFilter ?? { query: "", statuses: [] };
  const query = (filter.query ?? "").trim().toLowerCase();
  const statuses = new Set(filter.statuses ?? []);
  return behemoths.filter((entry) => {
    if (statuses.size && !statuses.has(entry.status)) {
      return false;
    }
    if (query) {
      const haystack = `${entry.name ?? ""} ${entry.kind ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function renderBehemothsPage(state) {
  const behemoths = Array.isArray(state.behemoths) ? state.behemoths : [];
  const counts = summarizeRoster(behemoths);
  const expanded = new Set(state.transientUi?.behemothExpandedIds ?? []);
  const visible = filterBehemoths(state, behemoths);

  const content = `
    <section class="panel behemoth-intro-panel">
      <div class="panel__header">
        <div>
          <h3>Behemoth Bestiary</h3>
          <span class="panel__subtle">A simple sheet for the huge monsters held at the Drift. Edit anything — fields auto-save on blur.</span>
        </div>
        <button class="button" type="button" data-action="add-behemoth">+ Add Behemoth</button>
      </div>
      <div class="behemoth-summary">
        <article><span>Total</span><strong>${formatNumber(behemoths.length)}</strong></article>
        <article><span>Wild</span><strong>${formatNumber(counts.wild)}</strong></article>
        <article><span>Captured</span><strong>${formatNumber(counts.captured)}</strong></article>
        <article><span>Bonded</span><strong>${formatNumber(counts.bonded)}</strong></article>
        <article><span>Released</span><strong>${formatNumber(counts.released)}</strong></article>
      </div>
      ${renderBehemothFilterRow(state, behemoths)}
    </section>

    ${
      behemoths.length
        ? visible.length
          ? `<div class="behemoth-grid">${visible
              .map((entry) => (expanded.has(entry.id) ? renderBehemothCard(entry) : renderBehemothCollapsedRow(entry)))
              .join("")}</div>`
          : `
              <section class="panel behemoth-empty">
                <h3>No matches</h3>
                <p>Nothing matches the current search or status filter. Adjust the filter row above to see more.</p>
              </section>
            `
        : `
            <section class="panel behemoth-empty">
              <h3>No behemoths recorded yet</h3>
              <p>Use <strong>Add Behemoth</strong> to open a fresh sheet. Each entry has core stats, status, lore, and a flexible abilities list you can shape during play.</p>
            </section>
          `
    }
  `;

  return {
    title: "Behemoths",
    subtitle: "Huge monsters captured and held at the Drift. The GM authors their character sheets here.",
    content
  };
}
