// Special NPC roster page.
// Reuses the editable creature-sheet styling (.behemoth-card.*) for the
// layout; data-action attributes are NPC-specific (set-npc-field etc.).
// All fields commit on blur to preserve cursor position across re-renders.
import {
  NPC_ROLES,
  NPC_STATUSES,
  NPC_STAT_KEYS,
  NPC_DISPOSITIONS,
  getNpcStatusDetail
} from "../content/NpcConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";

function getNpcImageSrc(npc) {
  if (npc.imageData && npc.imageData.startsWith("data:image/")) {
    return npc.imageData;
  }
  if (npc.imagePath && npc.imagePath.trim()) {
    return npc.imagePath.trim();
  }
  return "";
}

function renderNpcImage(npc) {
  const src = getNpcImageSrc(npc);
  if (src) {
    return `
      <img
        class="behemoth-card__image"
        src="${escapeHtml(src)}"
        alt="${escapeHtml(npc.name)} portrait"
        loading="lazy"
        onerror="this.parentElement?.classList.add('behemoth-card__media--missing'); this.remove();"
      />
    `;
  }
  return `
    <div class="behemoth-card__image-placeholder" aria-hidden="true">
      <span>\u{1F3AD}</span>
      <small>No image attached</small>
    </div>
  `;
}

function renderSelectField({ npcId, field, value, options, label }) {
  return `
    <label class="behemoth-card__field behemoth-card__field--select">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <select
        data-action="set-npc-field"
        data-npc-id="${escapeHtml(npcId)}"
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

function renderTextField({ npcId, field, value, label, placeholder = "" }) {
  return `
    <label class="behemoth-card__field">
      <span class="behemoth-card__field-label">${escapeHtml(label)}</span>
      <input
        type="text"
        data-action="set-npc-field"
        data-npc-id="${escapeHtml(npcId)}"
        data-field="${escapeHtml(field)}"
        value="${escapeHtml(value ?? "")}"
        placeholder="${escapeHtml(placeholder)}"
      />
    </label>
  `;
}

function renderStatsBlock(npc) {
  return `
    <div class="behemoth-card__stats">
      ${NPC_STAT_KEYS.map((stat) => {
        const value = Number(npc.stats?.[stat.id] ?? 0) || 0;
        return `
          <label class="behemoth-card__stat" title="${escapeHtml(stat.hint)}">
            <span class="behemoth-card__stat-label">${escapeHtml(stat.label)}</span>
            <input
              type="number"
              min="0"
              step="1"
              data-action="set-npc-stat"
              data-npc-id="${escapeHtml(npc.id)}"
              data-stat-id="${escapeHtml(stat.id)}"
              value="${formatNumber(value)}"
            />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderAbilities(npc) {
  if (!npc.abilities.length) {
    return `
      <div class="behemoth-card__abilities-empty">
        <p>No abilities recorded yet. Use <em>Add Ability</em> to capture a quirk, skill, or signature move.</p>
      </div>
    `;
  }
  return `
    <div class="behemoth-card__ability-list">
      ${npc.abilities
        .map(
          (ability) => `
            <article class="behemoth-card__ability">
              <div class="behemoth-card__ability-head">
                <input
                  class="behemoth-card__ability-name"
                  type="text"
                  data-action="set-npc-ability-field"
                  data-npc-id="${escapeHtml(npc.id)}"
                  data-ability-id="${escapeHtml(ability.id)}"
                  data-field="name"
                  value="${escapeHtml(ability.name ?? "")}"
                  placeholder="Ability or skill name"
                />
                <button
                  class="button button--ghost button--small"
                  type="button"
                  data-action="remove-npc-ability"
                  data-npc-id="${escapeHtml(npc.id)}"
                  data-ability-id="${escapeHtml(ability.id)}"
                  title="Remove ability"
                  aria-label="Remove ability"
                >Remove</button>
              </div>
              <textarea
                class="behemoth-card__ability-description"
                data-action="set-npc-ability-field"
                data-npc-id="${escapeHtml(npc.id)}"
                data-ability-id="${escapeHtml(ability.id)}"
                data-field="description"
                rows="3"
                placeholder="Effect, range, leverage, conditions — write what your table needs."
              >${escapeHtml(ability.description ?? "")}</textarea>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMetLine(npc) {
  if (!Number.isFinite(npc.metDayOffset)) {
    return "Met date not set";
  }
  return `Met ${formatDate(npc.metDayOffset)}`;
}

function renderNpcCard(npc) {
  const statusDetail = getNpcStatusDetail(npc.status);
  return `
    <article class="panel behemoth-card" data-npc-id="${escapeHtml(npc.id)}">
      <div class="behemoth-card__media">
        ${renderNpcImage(npc)}
        <div class="behemoth-card__media-tools">
          <label class="button button--ghost button--small behemoth-card__upload-label">
            <span>${getNpcImageSrc(npc) ? "Replace Image" : "Upload Image"}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              data-action="upload-npc-image"
              data-npc-id="${escapeHtml(npc.id)}"
            />
          </label>
          ${
            getNpcImageSrc(npc)
              ? `<button
                  class="button button--ghost button--small"
                  type="button"
                  data-action="clear-npc-image"
                  data-npc-id="${escapeHtml(npc.id)}"
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
            data-action="set-npc-field"
            data-npc-id="${escapeHtml(npc.id)}"
            data-field="name"
            value="${escapeHtml(npc.name ?? "")}"
            placeholder="Name this NPC"
          />
          <button
            class="button button--ghost button--small behemoth-card__delete"
            type="button"
            data-action="delete-npc"
            data-npc-id="${escapeHtml(npc.id)}"
            title="Delete NPC"
          >Delete</button>
        </header>

        <p class="behemoth-card__caption">${escapeHtml(renderMetLine(npc))}</p>

        <div class="behemoth-card__grid">
          ${renderTextField({
            npcId: npc.id,
            field: "kind",
            value: npc.kind,
            label: "Kind / Title",
            placeholder: "e.g. Caravan Master, Court Mage"
          })}
          ${renderSelectField({
            npcId: npc.id,
            field: "role",
            value: npc.role,
            options: NPC_ROLES,
            label: "Role"
          })}
          ${renderSelectField({
            npcId: npc.id,
            field: "status",
            value: npc.status,
            options: NPC_STATUSES,
            label: "Status"
          })}
          ${renderSelectField({
            npcId: npc.id,
            field: "disposition",
            value: npc.disposition,
            options: NPC_DISPOSITIONS,
            label: "Disposition"
          })}
        </div>

        ${statusDetail ? `<p class="behemoth-card__status-detail">${escapeHtml(statusDetail)}</p>` : ""}

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Core Stats</h4>
            <small>Loose values. Use whatever scale fits your table.</small>
          </div>
          ${renderStatsBlock(npc)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Abilities</h4>
            <button
              class="button button--ghost button--small"
              type="button"
              data-action="add-npc-ability"
              data-npc-id="${escapeHtml(npc.id)}"
            >+ Add Ability</button>
          </div>
          ${renderAbilities(npc)}
        </section>

        <section class="behemoth-card__section">
          <div class="behemoth-card__section-head">
            <h4>Origin &amp; Lore</h4>
          </div>
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Origin</span>
            <input
              type="text"
              data-action="set-npc-field"
              data-npc-id="${escapeHtml(npc.id)}"
              data-field="origin"
              value="${escapeHtml(npc.origin ?? "")}"
              placeholder="Where are they from, and who introduced them?"
            />
          </label>
          <label class="behemoth-card__field">
            <span class="behemoth-card__field-label">Lore &amp; Notes</span>
            <textarea
              data-action="set-npc-field"
              data-npc-id="${escapeHtml(npc.id)}"
              data-field="lore"
              rows="4"
              placeholder="Backstory, relationships, motivations, secrets, what they want..."
            >${escapeHtml(npc.lore ?? "")}</textarea>
          </label>
        </section>
      </div>
    </article>
  `;
}

function summarizeRoster(npcs) {
  const counts = { active: 0, friendly: 0, neutral: 0, hostile: 0, departed: 0 };
  for (const entry of npcs) {
    if (Object.prototype.hasOwnProperty.call(counts, entry.status)) {
      counts[entry.status] += 1;
    }
  }
  return counts;
}

export function renderNpcsPage(state) {
  const npcs = Array.isArray(state.npcs) ? state.npcs : [];
  const counts = summarizeRoster(npcs);

  const content = `
    <section class="panel behemoth-intro-panel">
      <div class="panel__header">
        <div>
          <h3>Special NPC Roster</h3>
          <span class="panel__subtle">Notable people you want to track — allies, contacts, rivals, faction figures. Edit anything — fields auto-save on blur.</span>
        </div>
        <button class="button" type="button" data-action="add-npc">+ Add NPC</button>
      </div>
      <div class="behemoth-summary">
        <article><span>Total</span><strong>${formatNumber(npcs.length)}</strong></article>
        <article><span>Active</span><strong>${formatNumber(counts.active)}</strong></article>
        <article><span>Friendly</span><strong>${formatNumber(counts.friendly)}</strong></article>
        <article><span>Neutral</span><strong>${formatNumber(counts.neutral)}</strong></article>
        <article><span>Hostile</span><strong>${formatNumber(counts.hostile)}</strong></article>
        <article><span>Departed</span><strong>${formatNumber(counts.departed)}</strong></article>
      </div>
    </section>

    ${
      npcs.length
        ? `<div class="behemoth-grid">${npcs.map(renderNpcCard).join("")}</div>`
        : `
            <section class="panel behemoth-empty">
              <h3>No NPCs recorded yet</h3>
              <p>Use <strong>Add NPC</strong> to open a fresh sheet. Each entry has core stats, status, lore, and a flexible abilities list you can shape during play.</p>
            </section>
          `
    }
  `;

  return {
    title: "Special NPCs",
    subtitle: "Notable people in the world. The GM authors their character sheets here.",
    content
  };
}
