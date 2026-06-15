// Awakened roster page.
// The superhumans of the Scarred Lands who may join the city. Reuses the
// editable creature-sheet styling (.behemoth-card.*) plus an Awakened-specific
// grade badge. All fields commit on blur to preserve cursor across re-renders.
import {
  AWAKENED_GRADES,
  AWAKENED_STATUSES,
  AWAKENED_GENDERS,
  AWAKENED_ORIGIN_CITIES,
  AWAKENED_ABILITY_TYPES,
  AWAKENED_ATTRIBUTE_KEYS,
  getAwakenedAbilityType,
  getAwakenedAbilityTypeLabel,
  getAwakenedStatusDetail,
  getAwakenedStatusLabel
} from "../content/AwakenedConfig.js?v=v1.7.20-20260615130257";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260615130257";
import { formatDate } from "../systems/CalendarSystem.js?v=v1.7.20-20260615130257";

function getAwakenedImageSrc(entry) {
  if (entry.imageData && entry.imageData.startsWith("data:image/")) {
    return entry.imageData;
  }
  if (entry.imagePath && entry.imagePath.trim()) {
    return entry.imagePath.trim();
  }
  return "";
}

function renderGradeBadge(grade) {
  const gradeId = AWAKENED_GRADES.some((entry) => entry.id === grade) ? grade : "F";
  return `<span class="awakened-grade awakened-grade--${escapeHtml(gradeId)}" title="Power grade ${escapeHtml(gradeId)}">${escapeHtml(gradeId)}</span>`;
}

function renderAwakenedImage(entry) {
  const src = getAwakenedImageSrc(entry);
  if (src) {
    return `
      <img
        class="behemoth-card__image"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(entry.name)} portrait"
        loading="lazy"
        onerror="this.parentElement?.classList.add('behemoth-card__media--missing'); this.remove();"
      />
    `;
  }
  return `
    <div class="behemoth-card__image-placeholder" aria-hidden="true">
      <span>⚡</span>
      <small>No image attached</small>
    </div>
  `;
}

function renderAwakenedThumb(entry) {
  const src = getAwakenedImageSrc(entry);
  if (src) {
    return `<img class="roster-row__thumb" src="${escapeHtml(src)}" alt="" loading="lazy" />`;
  }
  return `<div class="roster-row__thumb roster-row__thumb--placeholder" aria-hidden="true">⚡</div>`;
}

function renderAwakenedCollapsedRow(entry) {
  return `
    <article class="panel behemoth-card behemoth-card--collapsed roster-row" data-awakened-id="${escapeHtml(entry.id)}">
      <button
        class="roster-row__expand"
        type="button"
        data-action="toggle-awakened-expanded"
        data-awakened-id="${escapeHtml(entry.id)}"
        aria-expanded="false"
        title="Expand sheet"
      >
        ${renderGradeBadge(entry.grade)}
        ${renderAwakenedThumb(entry)}
        <div class="roster-row__meta">
          <strong>${escapeHtml(entry.name || "Unnamed Awakened")}</strong>
          <span>${escapeHtml(getAwakenedAbilityTypeLabel(entry.abilityTypeId))} · ${escapeHtml(getAwakenedStatusLabel(entry.status))}</span>
        </div>
        <span class="roster-row__chevron" aria-hidden="true">▼</span>
      </button>
    </article>
  `;
}

function renderSelectField({ awakenedId, field, value, options, label }) {
  return `
    <label class="behemoth-card__field behemoth-card__field--select">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <select
        data-action="set-awakened-field"
        data-awakened-id="${escapeHtml(awakenedId)}"
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

function renderTextField({ awakenedId, field, value, label, placeholder = "", list = "" }) {
  return `
    <label class="behemoth-card__field">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <input
        type="text"
        data-action="set-awakened-field"
        data-awakened-id="${escapeHtml(awakenedId)}"
        data-field="${escapeHtml(field)}"
        value="${escapeHtml(value ?? "")}"
        placeholder="${escapeHtml(placeholder)}"
        ${list ? `list="${escapeHtml(list)}"` : ""}
      />
    </label>
  `;
}

function renderAttributesBlock(entry) {
  const primary = entry.primaryAttr;
  const secondary = entry.secondaryAttr;
  return `
    <div class="awakened-attrs">
      ${AWAKENED_ATTRIBUTE_KEYS.map((attr) => {
        const value = Number(entry.attributes?.[attr.id] ?? 0) || 0;
        const role = attr.id === primary ? "primary" : attr.id === secondary ? "secondary" : "";
        return `
          <label class="awakened-attr ${role ? `awakened-attr--${role}` : ""}" title="${escapeHtml(attr.name)}${role ? ` · ${role}` : ""}">
            <span class="awakened-attr__label">${escapeHtml(attr.label)}${role === "primary" ? " ★" : role === "secondary" ? " ☆" : ""}</span>
            <input
              type="number"
              min="0"
              step="1"
              data-action="set-awakened-attr"
              data-awakened-id="${escapeHtml(entry.id)}"
              data-attr-id="${escapeHtml(attr.id)}"
              value="${formatNumber(value)}"
            />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderMetLine(entry) {
  if (!Number.isFinite(entry.metDayOffset)) {
    return "First sighted date not set";
  }
  return `First sighted ${formatDate(entry.metDayOffset)}`;
}

function renderAwakenedCard(entry) {
  const statusDetail = getAwakenedStatusDetail(entry.status);
  const abilityType = getAwakenedAbilityType(entry.abilityTypeId);
  return `
    <article class="panel behemoth-card" data-awakened-id="${escapeHtml(entry.id)}">
      <div class="behemoth-card__media">
        ${renderAwakenedImage(entry)}
        <div class="behemoth-card__media-tools">
          <label class="button button--ghost button--small behemoth-card__upload-label">
            <span>${getAwakenedImageSrc(entry) ? "Replace Image" : "Upload Image"}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              data-action="upload-awakened-image"
              data-awakened-id="${escapeHtml(entry.id)}"
            />
          </label>
          ${
            getAwakenedImageSrc(entry)
              ? `<button
                  class="button button--ghost button--small"
                  type="button"
                  data-action="clear-awakened-image"
                  data-awakened-id="${escapeHtml(entry.id)}"
                >Clear Image</button>`
              : ""
          }
        </div>
      </div>

      <div class="behemoth-card__body">
        <header class="behemoth-card__header awakened-card__header">
          ${renderGradeBadge(entry.grade)}
          <input
            class="behemoth-card__name"
            type="text"
            data-action="set-awakened-field"
            data-awakened-id="${escapeHtml(entry.id)}"
            data-field="name"
            value="${escapeHtml(entry.name ?? "")}"
            placeholder="Name this Awakened"
          />
          <button
            class="button button--ghost button--small"
            type="button"
            data-action="toggle-awakened-expanded"
            data-awakened-id="${escapeHtml(entry.id)}"
            aria-expanded="true"
            title="Collapse sheet"
          >Collapse</button>
          <button
            class="button button--ghost button--small behemoth-card__delete"
            type="button"
            data-action="delete-awakened"
            data-awakened-id="${escapeHtml(entry.id)}"
            title="Delete Awakened"
          >Delete</button>
        </header>

        <p class="behemoth-card__caption">${escapeHtml(renderMetLine(entry))}</p>

        <div class="behemoth-card__grid">
          ${renderSelectField({
            awakenedId: entry.id,
            field: "grade",
            value: entry.grade,
            options: AWAKENED_GRADES,
            label: "Power Grade"
          })}
          ${renderSelectField({
            awakenedId: entry.id,
            field: "status",
            value: entry.status,
            options: AWAKENED_STATUSES,
            label: "Status"
          })}
          ${renderSelectField({
            awakenedId: entry.id,
            field: "gender",
            value: entry.gender,
            options: AWAKENED_GENDERS,
            label: "Gender"
          })}
          ${renderTextField({
            awakenedId: entry.id,
            field: "originCity",
            value: entry.originCity,
            label: "Origin City",
            placeholder: "e.g. Wyldermoor",
            list: "awakened-origin-cities"
          })}
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Age</span>
            <input
              type="number"
              min="0"
              step="1"
              data-action="set-awakened-field"
              data-awakened-id="${escapeHtml(entry.id)}"
              data-field="age"
              value="${entry.age ?? ""}"
              placeholder="—"
            />
          </label>
        </div>

        ${statusDetail ? `<p class="behemoth-card__status-detail">${escapeHtml(statusDetail)}</p>` : ""}

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Power</h4>
          </div>
          <div class="behemoth-card__grid">
            ${renderSelectField({
              awakenedId: entry.id,
              field: "abilityTypeId",
              value: entry.abilityTypeId,
              options: AWAKENED_ABILITY_TYPES,
              label: "Ability Type"
            })}
            ${renderSelectField({
              awakenedId: entry.id,
              field: "primaryAttr",
              value: entry.primaryAttr,
              options: AWAKENED_ATTRIBUTE_KEYS,
              label: "Primary Attr"
            })}
            ${renderSelectField({
              awakenedId: entry.id,
              field: "secondaryAttr",
              value: entry.secondaryAttr,
              options: AWAKENED_ATTRIBUTE_KEYS,
              label: "Secondary Attr"
            })}
          </div>
          ${
            abilityType && abilityType.id !== "other"
              ? `<p class="awakened-type-hint">${escapeHtml(abilityType.core)} — suggested ${escapeHtml(abilityType.primary)} / ${escapeHtml(abilityType.secondary)}. ${escapeHtml(abilityType.notes)}</p>`
              : ""
          }
          ${renderTextField({
            awakenedId: entry.id,
            field: "powerName",
            value: entry.powerName,
            label: "Power Name",
            placeholder: "Optional codename for the power"
          })}
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Power Description</span>
            <textarea
              data-action="set-awakened-field"
              data-awakened-id="${escapeHtml(entry.id)}"
              data-field="powerDescription"
              rows="3"
              placeholder="What the power does, its range, and how it manifests..."
            >${escapeHtml(entry.powerDescription ?? "")}</textarea>
          </label>
          <div class="behemoth-card__grid">
            ${renderTextField({
              awakenedId: entry.id,
              field: "powerTheme",
              value: entry.powerTheme,
              label: "Power Theme",
              placeholder: "e.g. Atmospheric manifestation"
            })}
            ${renderTextField({
              awakenedId: entry.id,
              field: "similarHero",
              value: entry.similarHero,
              label: "Similar Hero (ref)",
              placeholder: "e.g. Storm"
            })}
          </div>
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Attributes</h4>
            <small>★ primary · ☆ secondary. Loose values — use whatever scale fits.</small>
          </div>
          ${renderAttributesBlock(entry)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Lore &amp; Notes</h4>
          </div>
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Background</span>
            <textarea
              data-action="set-awakened-field"
              data-awakened-id="${escapeHtml(entry.id)}"
              data-field="lore"
              rows="4"
              placeholder="Backstory, allegiances, what they want, how they might be recruited..."
            >${escapeHtml(entry.lore ?? "")}</textarea>
          </label>
        </section>
      </div>
    </article>
  `;
}

function summarizeRoster(roster) {
  const counts = { joined: 0, recruiting: 0, contacted: 0, hostile: 0 };
  for (const entry of roster) {
    if (Object.prototype.hasOwnProperty.call(counts, entry.status)) {
      counts[entry.status] += 1;
    }
  }
  return counts;
}

function renderFilterRow(state, roster) {
  const filter = state.transientUi?.awakenedFilter ?? { query: "", grades: [], statuses: [] };
  const activeGrades = new Set(filter.grades ?? []);
  const activeStatuses = new Set(filter.statuses ?? []);
  const query = filter.query ?? "";
  if (!roster.length) {
    return "";
  }
  return `
    <div class="roster-filter roster-filter--awakened">
      <label class="roster-filter__search">
        <span class="behemoth-card__field-label">Search</span>
        <input
          type="search"
          data-action="set-awakened-filter-query"
          value="${escapeHtml(query)}"
          placeholder="Search by name, power, or origin"
        />
      </label>
      <div class="roster-filter__chip-groups">
        <div class="roster-filter__chips" role="group" aria-label="Filter by grade">
          ${AWAKENED_GRADES.map(
            (grade) => `
              <button
                class="button button--ghost button--small roster-filter__chip awakened-grade-chip awakened-grade-chip--${escapeHtml(grade.id)} ${activeGrades.has(grade.id) ? "is-active" : ""}"
                type="button"
                data-action="toggle-awakened-filter-grade"
                data-grade-id="${escapeHtml(grade.id)}"
                aria-pressed="${activeGrades.has(grade.id) ? "true" : "false"}"
              >${escapeHtml(grade.label)}</button>
            `
          ).join("")}
        </div>
        <div class="roster-filter__chips" role="group" aria-label="Filter by status">
          ${AWAKENED_STATUSES.map(
            (status) => `
              <button
                class="button button--ghost button--small roster-filter__chip ${activeStatuses.has(status.id) ? "is-active" : ""}"
                type="button"
                data-action="toggle-awakened-filter-status"
                data-status-id="${escapeHtml(status.id)}"
                aria-pressed="${activeStatuses.has(status.id) ? "true" : "false"}"
              >${escapeHtml(status.label)}</button>
            `
          ).join("")}
          ${
            activeGrades.size || activeStatuses.size || query
              ? `<button class="button button--ghost button--small" type="button" data-action="clear-awakened-filter">Clear</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function filterRoster(state, roster) {
  const filter = state.transientUi?.awakenedFilter ?? { query: "", grades: [], statuses: [] };
  const query = (filter.query ?? "").trim().toLowerCase();
  const grades = new Set(filter.grades ?? []);
  const statuses = new Set(filter.statuses ?? []);
  return roster.filter((entry) => {
    if (grades.size && !grades.has(entry.grade)) {
      return false;
    }
    if (statuses.size && !statuses.has(entry.status)) {
      return false;
    }
    if (query) {
      const haystack = `${entry.name ?? ""} ${getAwakenedAbilityTypeLabel(entry.abilityTypeId)} ${entry.powerName ?? ""} ${entry.powerTheme ?? ""} ${entry.originCity ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function renderAwakenedPage(state) {
  const roster = Array.isArray(state.awakened) ? state.awakened : [];
  const counts = summarizeRoster(roster);
  const expanded = new Set(state.transientUi?.awakenedExpandedIds ?? []);
  const visible = filterRoster(state, roster);

  const datalist = `<datalist id="awakened-origin-cities">${AWAKENED_ORIGIN_CITIES.map((city) => `<option value="${escapeHtml(city)}"></option>`).join("")}</datalist>`;

  const content = `
    ${datalist}
    <section class="panel behemoth-intro-panel">
      <div class="panel__header">
        <div>
          <h3>Awakened Roster</h3>
          <span class="panel__subtle">The superhumans of the Scarred Lands. Track their power grade, archetype, and whether they might join the city. Fields auto-save on blur.</span>
        </div>
        <button class="button" type="button" data-action="add-awakened">+ Add Awakened</button>
      </div>
      <div class="behemoth-summary">
        <article><span>Total</span><strong>${formatNumber(roster.length)}</strong></article>
        <article><span>Joined</span><strong>${formatNumber(counts.joined)}</strong></article>
        <article><span>Recruiting</span><strong>${formatNumber(counts.recruiting)}</strong></article>
        <article><span>Contacted</span><strong>${formatNumber(counts.contacted)}</strong></article>
        <article><span>Hostile</span><strong>${formatNumber(counts.hostile)}</strong></article>
      </div>
      ${renderFilterRow(state, roster)}
    </section>

    ${
      roster.length
        ? visible.length
          ? `<div class="behemoth-grid">${visible
              .map((entry) => (expanded.has(entry.id) ? renderAwakenedCard(entry) : renderAwakenedCollapsedRow(entry)))
              .join("")}</div>`
          : `
              <section class="panel behemoth-empty">
                <h3>No matches</h3>
                <p>Nothing matches the current search, grade, or status filter. Adjust the filter row above to see more.</p>
              </section>
            `
        : `
            <section class="panel behemoth-empty">
              <h3>No Awakened recorded yet</h3>
              <p>Use <strong>Add Awakened</strong> to open a fresh sheet. Each entry has a power grade (F to S), an ability archetype, six attributes, and lore you can shape during play.</p>
            </section>
          `
    }
  `;

  return {
    title: "Awakened",
    subtitle: "The superhumans of the Scarred Lands — and which of them might join the city.",
    content
  };
}
