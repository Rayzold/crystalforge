// Equipment Sheet page.
// Each player character gets a 13-slot loadout sheet (paper-doll layout) plus a
// freeform player notes block. Backed by `state.playerCharacters[]`. If the
// slice is empty the page renders a single starter character so the screen is
// never blank — actual persistence requires hooking the data-action handlers
// listed in the integration block at the bottom of this file.
import { escapeHtml } from "../engine/Utils.js";

// 13 slots, distributed into a 3-column paper-doll layout (left | center | right).
// Column + order pins each slot to a CSS grid cell.
const EQUIPMENT_SLOTS = [
  { key: "helm",     label: "Helm",      icon: "\u{1F451}", column: "center", order: 1 },
  { key: "neck",     label: "Neck",      icon: "\u{1F4FF}", column: "right",  order: 1 },
  { key: "cloak",    label: "Cloak",     icon: "\u{1F9E5}", column: "left",   order: 1 },
  { key: "mainhand", label: "Main Hand", icon: "⚔️",  column: "left",   order: 2 },
  { key: "chest",    label: "Chest",     icon: "\u{1F6E1}️", column: "center", order: 2 },
  { key: "offhand",  label: "Off Hand",  icon: "\u{1F6E1}", column: "right",  order: 2 },
  { key: "gloves",   label: "Gloves",    icon: "\u{1F9E4}", column: "left",   order: 3 },
  { key: "belt",     label: "Belt",      icon: "\u{1F45C}", column: "right",  order: 3 },
  { key: "legs",     label: "Legs",      icon: "\u{1F456}", column: "center", order: 3 },
  { key: "trinket",  label: "Trinket",   icon: "\u{1F52E}", column: "right",  order: 4 },
  { key: "boots",    label: "Boots",     icon: "\u{1F462}", column: "center", order: 4 },
  { key: "ring1",    label: "Ring I",    icon: "\u{1F48D}", column: "left",   order: 5 },
  { key: "ring2",    label: "Ring II",   icon: "\u{1F48D}", column: "right",  order: 5 }
];

const RARITIES = [
  { key: "common",    label: "Common",    color: "#94a3b8" },
  { key: "uncommon",  label: "Uncommon",  color: "#34d399" },
  { key: "rare",      label: "Rare",      color: "#38bdf8" },
  { key: "epic",      label: "Epic",      color: "#a78bfa" },
  { key: "legendary", label: "Legendary", color: "#fbbf24" },
  { key: "mythic",    label: "Mythic",    color: "#f472b6" }
];

const RARITY_LOOKUP = Object.fromEntries(RARITIES.map((r) => [r.key, r]));

function rarityColor(key) {
  return RARITY_LOOKUP[key]?.color ?? RARITY_LOOKUP.common.color;
}

function emptySlot() {
  return { name: "", rarity: "common", notes: "" };
}

export function createBlankPlayerCharacter(seed = "New Wanderer") {
  return blankCharacter(seed);
}

function blankCharacter(seed = "New Wanderer") {
  return {
    id: `pc-${Math.random().toString(36).slice(2, 8)}`,
    name: seed,
    class: "",
    title: "",
    level: 1,
    attunements: 0,
    equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((s) => [s.key, emptySlot()])),
    notes: "",
    wealth: { gp: 0, items: [] }
  };
}

function blankWealthItem() {
  return {
    id: `wi-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    qty: 1,
    notes: ""
  };
}

export function createBlankWealthItem() {
  return blankWealthItem();
}

function getRoster(state) {
  const roster = state.playerCharacters ?? [];
  if (roster.length === 0) {
    return [blankCharacter("Aelara Stormveil")];
  }
  return roster;
}

function getActiveCharacter(state, roster) {
  const activeId = state.transientUi?.activePlayerCharacterId;
  return roster.find((c) => c.id === activeId) ?? roster[0];
}

const EQUIPMENT_THEMES = ["aether", "parchment"];
const EQUIPMENT_THEME_LABELS = { aether: "Aether", parchment: "Parchment" };

function getEquipmentTheme(state) {
  const requested = state.transientUi?.equipmentSheetTheme;
  return EQUIPMENT_THEMES.includes(requested) ? requested : "aether";
}

function renderThemeSwitcher(theme) {
  return `
    <div class="eq-theme-switch" role="group" aria-label="Sheet theme">
      ${EQUIPMENT_THEMES.map((key) => `
        <button
          type="button"
          class="eq-theme-switch__btn ${theme === key ? "is-active" : ""}"
          data-action="set-equipment-theme"
          data-theme="${key}"
          aria-pressed="${theme === key ? "true" : "false"}"
          title="Switch to ${EQUIPMENT_THEME_LABELS[key]} mode"
        >
          <span class="eq-theme-switch__dot eq-theme-switch__dot--${key}" aria-hidden="true"></span>
          ${EQUIPMENT_THEME_LABELS[key]}
        </button>
      `).join("")}
    </div>
  `;
}

function hashSeed(value = "") {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash);
}

function renderCharacterSigil(character) {
  const seed = hashSeed(character.id || character.name || "wanderer");
  const hueA = seed % 360;
  const hueB = (hueA + 60 + (seed % 70)) % 360;
  const initials = String(character.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "PC";
  return `
    <div class="eq-sigil" style="--eq-hue-a:${hueA};--eq-hue-b:${hueB};" aria-hidden="true">
      <span class="eq-sigil__ring"></span>
      <span class="eq-sigil__ring eq-sigil__ring--inner"></span>
      <strong>${escapeHtml(initials)}</strong>
    </div>
  `;
}

function renderRosterStrip(state, roster, active) {
  return `
    <nav class="eq-roster" aria-label="Player character roster">
      ${roster
        .map(
          (c) => `
            <button
              class="eq-roster__chip ${active && c.id === active.id ? "is-active" : ""}"
              type="button"
              data-action="set-active-player-character"
              data-character-id="${escapeHtml(c.id)}"
            >
              <strong>${escapeHtml(c.name || "Unnamed")}</strong>
              <span>${escapeHtml(c.class || "—")}${Number(c.level) ? ` · Lv ${escapeHtml(String(c.level))}` : ""}</span>
            </button>
          `
        )
        .join("")}
      <button class="eq-roster__add" type="button" data-action="add-player-character">+ New Character</button>
    </nav>
  `;
}

function renderIdentityBlock(character) {
  return `
    <header class="eq-identity">
      ${renderCharacterSigil(character)}
      <div class="eq-identity__fields">
        <label class="eq-identity__row">
          <span>Character Name</span>
          <input
            type="text"
            class="eq-identity__name"
            value="${escapeHtml(character.name ?? "")}"
            placeholder="Name your hero…"
            data-action="set-player-character-field"
            data-character-id="${escapeHtml(character.id)}"
            data-field="name"
          />
        </label>
        <div class="eq-identity__grid">
          <label>
            <span>Class</span>
            <input
              type="text"
              value="${escapeHtml(character.class ?? "")}"
              placeholder="Stormcaller, Pact-Bearer…"
              data-action="set-player-character-field"
              data-character-id="${escapeHtml(character.id)}"
              data-field="class"
            />
          </label>
          <label>
            <span>Title</span>
            <input
              type="text"
              value="${escapeHtml(character.title ?? "")}"
              placeholder="The Sundered, Voice of the Drift…"
              data-action="set-player-character-field"
              data-character-id="${escapeHtml(character.id)}"
              data-field="title"
            />
          </label>
          <label>
            <span>Level</span>
            <input
              type="number"
              min="1"
              max="99"
              value="${escapeHtml(String(character.level ?? 1))}"
              data-action="set-player-character-field"
              data-character-id="${escapeHtml(character.id)}"
              data-field="level"
            />
          </label>
          <label>
            <span>Attunements</span>
            <input
              type="number"
              min="0"
              max="9"
              value="${escapeHtml(String(character.attunements ?? 0))}"
              data-action="set-player-character-field"
              data-character-id="${escapeHtml(character.id)}"
              data-field="attunements"
            />
          </label>
        </div>
      </div>
      <button
        class="eq-identity__remove"
        type="button"
        data-action="remove-player-character"
        data-character-id="${escapeHtml(character.id)}"
        title="Remove this character"
      >Remove</button>
    </header>
  `;
}

function renderSlot(character, slot) {
  const value = character.equipment?.[slot.key] ?? emptySlot();
  const color = rarityColor(value.rarity);
  const filled = Boolean(value.name);
  return `
    <article
      class="eq-slot eq-slot--col-${slot.column} ${filled ? "is-filled" : ""}"
      style="--eq-rarity:${color}; grid-column: ${slot.column}; grid-row: ${slot.order};"
      data-slot="${slot.key}"
    >
      <header class="eq-slot__head">
        <span class="eq-slot__icon" aria-hidden="true">${slot.icon}</span>
        <span class="eq-slot__label">${escapeHtml(slot.label)}</span>
      </header>
      <input
        class="eq-slot__name"
        type="text"
        placeholder="— empty —"
        value="${escapeHtml(value.name ?? "")}"
        data-action="set-equipment-slot"
        data-character-id="${escapeHtml(character.id)}"
        data-slot-key="${slot.key}"
        data-field="name"
      />
      <div class="eq-slot__rarities" role="radiogroup" aria-label="Rarity for ${escapeHtml(slot.label)}">
        ${RARITIES.map(
          (r) => `
            <button
              type="button"
              class="eq-slot__rarity ${value.rarity === r.key ? "is-active" : ""}"
              style="--rarity:${r.color}"
              title="${r.label}"
              aria-label="${r.label}"
              aria-pressed="${value.rarity === r.key ? "true" : "false"}"
              data-action="set-equipment-slot"
              data-character-id="${escapeHtml(character.id)}"
              data-slot-key="${slot.key}"
              data-field="rarity"
              data-value="${r.key}"
            ></button>
          `
        ).join("")}
      </div>
      <textarea
        class="eq-slot__notes"
        rows="2"
        placeholder="Charges, attunement, sigils, who gave it…"
        data-action="set-equipment-slot"
        data-character-id="${escapeHtml(character.id)}"
        data-slot-key="${slot.key}"
        data-field="notes"
      >${escapeHtml(value.notes ?? "")}</textarea>
    </article>
  `;
}

function renderPaperDoll(character) {
  return `
    <section class="eq-doll" aria-label="Equipment slots">
      <div class="eq-doll__silhouette" aria-hidden="true">
        ${SILHOUETTE_SVG}
      </div>
      ${EQUIPMENT_SLOTS.map((slot) => renderSlot(character, slot)).join("")}
    </section>
  `;
}

function renderNotesPanel(character) {
  return `
    <section class="eq-notes panel">
      <header class="eq-notes__head">
        <h3>Player Notes</h3>
        <span>Free-form journal — backstory hooks, oaths, debts, anything.</span>
      </header>
      <textarea
        class="eq-notes__body"
        rows="10"
        placeholder="Write whatever your character would scrawl in the margins of their journal…"
        data-action="set-player-notes"
        data-character-id="${escapeHtml(character.id)}"
      >${escapeHtml(character.notes ?? "")}</textarea>
    </section>
  `;
}

function renderWealthPanel(character) {
  const wealth = character.wealth ?? { gp: 0, items: [] };
  const items = Array.isArray(wealth.items) ? wealth.items : [];
  return `
    <section class="eq-wealth panel">
      <header class="eq-wealth__head">
        <div>
          <h3>Wealth & Inventory</h3>
          <span>Gold and the odd things you carry that don't fill a slot.</span>
        </div>
        <label class="eq-wealth__gp">
          <span>GP</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${escapeHtml(String(Number(wealth.gp ?? 0)))}"
            placeholder="0"
            data-action="set-player-gp"
            data-character-id="${escapeHtml(character.id)}"
            aria-label="Gold pieces"
          />
        </label>
      </header>
      <div class="eq-wealth__items">
        ${items.length === 0
          ? `<p class="eq-wealth__empty">No items yet. Add a torch, a map, a strange coin…</p>`
          : items.map((item) => `
              <article class="eq-wealth__row" data-wealth-item="${escapeHtml(item.id)}">
                <input
                  class="eq-wealth__name"
                  type="text"
                  placeholder="Item name"
                  value="${escapeHtml(item.name ?? "")}"
                  data-action="set-wealth-item-field"
                  data-character-id="${escapeHtml(character.id)}"
                  data-item-id="${escapeHtml(item.id)}"
                  data-field="name"
                />
                <label class="eq-wealth__qty" aria-label="Quantity">
                  <span>×</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value="${escapeHtml(String(Number(item.qty ?? 1)))}"
                    data-action="set-wealth-item-field"
                    data-character-id="${escapeHtml(character.id)}"
                    data-item-id="${escapeHtml(item.id)}"
                    data-field="qty"
                  />
                </label>
                <input
                  class="eq-wealth__notes"
                  type="text"
                  placeholder="Notes (charges, weight, who gave it…)"
                  value="${escapeHtml(item.notes ?? "")}"
                  data-action="set-wealth-item-field"
                  data-character-id="${escapeHtml(character.id)}"
                  data-item-id="${escapeHtml(item.id)}"
                  data-field="notes"
                />
                <button
                  type="button"
                  class="eq-wealth__remove"
                  title="Remove item"
                  aria-label="Remove item"
                  data-action="remove-wealth-item"
                  data-character-id="${escapeHtml(character.id)}"
                  data-item-id="${escapeHtml(item.id)}"
                >×</button>
              </article>
            `).join("")
        }
      </div>
      <button
        type="button"
        class="eq-wealth__add"
        data-action="add-wealth-item"
        data-character-id="${escapeHtml(character.id)}"
      >+ Add item</button>
    </section>
  `;
}

const SILHOUETTE_SVG = `
  <svg viewBox="0 0 200 360" xmlns="http://www.w3.org/2000/svg" focusable="false">
    <defs>
      <radialGradient id="eqHalo" cx="50%" cy="20%" r="60%">
        <stop offset="0%" stop-color="rgba(120,200,255,0.55)" />
        <stop offset="60%" stop-color="rgba(80,120,220,0.18)" />
        <stop offset="100%" stop-color="rgba(10,15,40,0)" />
      </radialGradient>
      <linearGradient id="eqRobe" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(160,200,255,0.42)" />
        <stop offset="100%" stop-color="rgba(60,80,170,0.18)" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="60" r="120" fill="url(#eqHalo)" />
    <path
      d="M100 40 C 116 40 128 54 128 70 C 128 86 116 100 100 100 C 84 100 72 86 72 70 C 72 54 84 40 100 40 Z
         M70 110 Q 100 90 130 110 L 150 200 L 140 320 L 110 320 L 105 220 L 95 220 L 90 320 L 60 320 L 50 200 Z"
      fill="url(#eqRobe)"
      stroke="rgba(180,220,255,0.55)"
      stroke-width="1.4"
    />
    <path d="M100 110 L 100 270" stroke="rgba(200,230,255,0.35)" stroke-width="1" stroke-dasharray="3 5" />
  </svg>
`;

export function renderEquipmentSheetPage(state) {
  const roster = getRoster(state);
  const active = getActiveCharacter(state, roster);
  const theme = getEquipmentTheme(state);

  return {
    title: "Equipment Sheet",
    subtitle: "Personal loadout for each player character.",
    content: `
      <style>${PAGE_STYLES}</style>
      <section class="eq-stage" data-theme="${theme}">
        <div class="eq-stage__aether" aria-hidden="true"></div>
        <div class="eq-topbar">
          ${renderRosterStrip(state, roster, active)}
          ${renderThemeSwitcher(theme)}
        </div>
        ${active ? `
          <article class="eq-sheet">
            ${renderIdentityBlock(active)}
            <div class="eq-sheet__body">
              ${renderPaperDoll(active)}
              <div class="eq-sheet__side">
                ${renderNotesPanel(active)}
                ${renderWealthPanel(active)}
              </div>
            </div>
          </article>
        ` : `<p class="empty-state">No characters yet. Use "+ New Character" to begin.</p>`}
      </section>
    `
  };
}

// All styling lives inline so the page slots in without touching the global
// stylesheet. Token names mirror the Crystal Forge HUD palette.
const PAGE_STYLES = `
  .eq-stage {
    position: relative;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 24px 28px 64px;
    color: #e5ecff;
    font-family: inherit;
  }
  .eq-stage__aether {
    position: absolute; inset: -20px 0 0 0;
    background:
      radial-gradient(circle at 18% 12%, rgba(120,200,255,0.22), transparent 55%),
      radial-gradient(circle at 82% 18%, rgba(190,140,255,0.18), transparent 55%),
      radial-gradient(circle at 50% 100%, rgba(255,180,120,0.12), transparent 60%),
      linear-gradient(180deg, #0b1024 0%, #131a35 60%, #0a0e22 100%);
    z-index: 0;
    border-radius: 24px;
    box-shadow: inset 0 0 80px rgba(0,0,0,0.55);
  }
  .eq-stage > *:not(.eq-stage__aether) { position: relative; z-index: 1; }

  .eq-roster {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-bottom: 18px;
  }
  .eq-roster__chip, .eq-roster__add {
    appearance: none; border: 1px solid rgba(140,170,230,0.25);
    background: rgba(20,28,60,0.55); color: #e5ecff;
    padding: 10px 14px; border-radius: 12px; cursor: pointer;
    text-align: left; display: flex; flex-direction: column; gap: 2px;
    transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
    backdrop-filter: blur(6px);
  }
  .eq-roster__chip strong { font-size: 14px; }
  .eq-roster__chip span { font-size: 11px; color: #9aa7d4; }
  .eq-roster__chip.is-active {
    border-color: rgba(120,220,255,0.85);
    box-shadow: 0 0 0 1px rgba(120,220,255,0.4), 0 8px 24px rgba(60,120,220,0.25);
  }
  .eq-roster__chip:hover { transform: translateY(-1px); }
  .eq-roster__add { color: #80e7ff; font-weight: 600; }

  .eq-sheet {
    border: 1px solid rgba(140,170,230,0.22);
    background: linear-gradient(180deg, rgba(20,28,60,0.7), rgba(12,18,40,0.7));
    border-radius: 20px; padding: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(8px);
  }

  .eq-identity {
    display: grid;
    grid-template-columns: 88px 1fr auto;
    gap: 20px;
    align-items: start;
    padding-bottom: 18px;
    border-bottom: 1px dashed rgba(140,170,230,0.2);
    margin-bottom: 22px;
  }
  .eq-sigil {
    position: relative; width: 88px; height: 88px; border-radius: 50%;
    background:
      radial-gradient(circle at 30% 30%, hsl(var(--eq-hue-a), 80%, 65%), hsl(var(--eq-hue-b), 65%, 35%) 70%);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; letter-spacing: 1px;
    box-shadow: 0 0 24px hsla(var(--eq-hue-a), 80%, 60%, 0.45);
  }
  .eq-sigil__ring {
    position: absolute; inset: -6px; border: 1px solid rgba(255,255,255,0.4);
    border-radius: 50%;
  }
  .eq-sigil__ring--inner { inset: 8px; border-color: rgba(255,255,255,0.2); }
  .eq-identity__fields { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .eq-identity__row { display: flex; flex-direction: column; gap: 4px; }
  .eq-identity__row span { font-size: 11px; letter-spacing: 0.08em; color: #9aa7d4; text-transform: uppercase; }
  .eq-identity__name {
    font-size: 26px; font-weight: 700;
    background: transparent; color: #f2f6ff;
    border: none; border-bottom: 1px solid rgba(140,170,230,0.3);
    padding: 4px 0; outline: none;
  }
  .eq-identity__name:focus { border-color: rgba(120,220,255,0.85); }
  .eq-identity__grid {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;
  }
  .eq-identity__grid label { display: flex; flex-direction: column; gap: 4px; }
  .eq-identity__grid span { font-size: 11px; letter-spacing: 0.08em; color: #9aa7d4; text-transform: uppercase; }
  .eq-identity__grid input {
    background: rgba(10,15,32,0.6); color: #e5ecff;
    border: 1px solid rgba(140,170,230,0.2); border-radius: 8px;
    padding: 8px 10px; font-size: 13px; outline: none;
  }
  .eq-identity__grid input:focus { border-color: rgba(120,220,255,0.85); }
  .eq-identity__remove {
    appearance: none; background: rgba(244,114,182,0.12);
    border: 1px solid rgba(244,114,182,0.4); color: #fbcfe8;
    padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;
  }

  .eq-sheet__body {
    display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr); gap: 24px;
    align-items: start;
  }

  .eq-doll {
    position: relative;
    display: grid;
    grid-template-columns: [left] minmax(0,1fr) [center] minmax(0,1fr) [right] minmax(0,1fr);
    grid-auto-rows: minmax(140px, auto);
    gap: 14px;
    padding: 24px;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(120,200,255,0.10), transparent 60%),
      rgba(8,12,28,0.55);
    border: 1px solid rgba(140,170,230,0.18);
    min-height: 740px;
  }
  .eq-doll__silhouette {
    /* Big presence behind the slot cards. The figure was width:30% / 92%
       before — barely visible on a desktop doll panel. Bumping it to
       ~70% width with a higher cap makes it read as a real character
       backdrop. Slots stay on top because they're flow children with
       their own opaque backgrounds + z-index in the grid. */
    position: absolute; inset: 0; display: grid; place-items: center;
    pointer-events: none; opacity: 0.92;
    z-index: 0;
  }
  .eq-doll__silhouette svg {
    width: 72%;
    max-width: 560px;
    height: 96%;
    filter: drop-shadow(0 0 22px rgba(120, 200, 255, 0.20));
  }
  .eq-doll > .eq-slot { z-index: 1; }

  .eq-slot {
    position: relative;
    display: flex; flex-direction: column; gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(16,22,46,0.78);
    border: 1px solid color-mix(in srgb, var(--eq-rarity) 35%, rgba(140,170,230,0.25));
    box-shadow: 0 0 0 1px rgba(0,0,0,0.25), 0 8px 22px rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    transition: transform .12s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .eq-slot.is-filled {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--eq-rarity) 70%, transparent),
      0 0 24px color-mix(in srgb, var(--eq-rarity) 35%, transparent),
      0 10px 28px rgba(0,0,0,0.4);
  }
  .eq-slot:hover { transform: translateY(-1px); }

  .eq-slot__head { display: flex; align-items: center; gap: 8px; }
  .eq-slot__icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: color-mix(in srgb, var(--eq-rarity) 20%, rgba(20,28,60,0.85));
    display: grid; place-items: center; font-size: 16px;
  }
  .eq-slot__label {
    font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
    color: color-mix(in srgb, var(--eq-rarity) 80%, #e5ecff);
    font-weight: 700;
  }
  .eq-slot__name {
    background: rgba(6,10,24,0.7); color: #f2f6ff;
    border: 1px solid rgba(140,170,230,0.18); border-radius: 8px;
    padding: 8px 10px; font-size: 13px; font-weight: 600; outline: none;
  }
  .eq-slot__name::placeholder { color: rgba(160,180,220,0.4); font-style: italic; font-weight: 400; }
  .eq-slot__name:focus { border-color: var(--eq-rarity); }
  .eq-slot__rarities { display: flex; gap: 6px; }
  .eq-slot__rarity {
    appearance: none; border: 1px solid rgba(255,255,255,0.15);
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--rarity); cursor: pointer; padding: 0;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .eq-slot__rarity:hover { transform: scale(1.15); }
  .eq-slot__rarity.is-active {
    box-shadow: 0 0 0 2px rgba(255,255,255,0.85), 0 0 12px var(--rarity);
    transform: scale(1.15);
  }
  .eq-slot__notes {
    background: rgba(6,10,24,0.55); color: #d8e1ff;
    border: 1px dashed rgba(140,170,230,0.22); border-radius: 8px;
    padding: 8px 10px; font-size: 12px; resize: vertical; outline: none;
    min-height: 44px; font-family: inherit;
  }
  .eq-slot__notes::placeholder { color: rgba(160,180,220,0.4); }
  .eq-slot__notes:focus { border-style: solid; border-color: var(--eq-rarity); }

  .eq-notes {
    border-radius: 16px;
    background:
      radial-gradient(circle at 100% 0%, rgba(190,140,255,0.10), transparent 60%),
      rgba(8,12,28,0.55);
    border: 1px solid rgba(140,170,230,0.18);
    padding: 18px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .eq-notes__head h3 { margin: 0; font-size: 16px; letter-spacing: 0.04em; }
  .eq-notes__head span { font-size: 12px; color: #9aa7d4; }
  .eq-notes__body {
    flex: 1; min-height: 240px;
    background: rgba(6,10,24,0.7); color: #e5ecff;
    border: 1px solid rgba(140,170,230,0.22); border-radius: 10px;
    padding: 12px; font-size: 13px; line-height: 1.55;
    resize: vertical; outline: none; font-family: inherit;
  }
  .eq-notes__body:focus { border-color: rgba(120,220,255,0.85); }

  /* The right column now stacks Notes and Wealth one above the other. */
  .eq-sheet__side {
    display: flex; flex-direction: column; gap: 18px; min-width: 0;
  }

  /* ── Wealth & Inventory ─────────────────────────────────────────── */
  .eq-wealth {
    border-radius: 16px;
    background:
      radial-gradient(circle at 0% 0%, rgba(240,188,96,0.10), transparent 60%),
      rgba(8,12,28,0.55);
    border: 1px solid rgba(140,170,230,0.18);
    padding: 18px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .eq-wealth__head {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  }
  .eq-wealth__head h3 { margin: 0; font-size: 16px; letter-spacing: 0.04em; }
  .eq-wealth__head span { font-size: 12px; color: #9aa7d4; }
  .eq-wealth__gp {
    display: flex; flex-direction: column; gap: 4px; min-width: 0;
    align-items: flex-end;
  }
  .eq-wealth__gp > span {
    font-size: 11px; letter-spacing: 0.16em; color: #f0c482;
    text-transform: uppercase; font-weight: 700;
  }
  .eq-wealth__gp input {
    width: 110px; text-align: right;
    background: rgba(6,10,24,0.7); color: #ffe9be;
    border: 1px solid rgba(240,188,96,0.32); border-radius: 8px;
    padding: 6px 10px; font-size: 14px; font-weight: 700;
    font-family: var(--display-font, inherit);
    outline: none;
  }
  .eq-wealth__gp input:focus { border-color: rgba(240,188,96,0.85); }

  .eq-wealth__items {
    display: flex; flex-direction: column; gap: 6px;
  }
  .eq-wealth__empty {
    margin: 0; padding: 10px 12px;
    color: #9aa7d4; font-size: 12px; font-style: italic;
    border: 1px dashed rgba(140,170,230,0.22); border-radius: 8px;
    background: rgba(6,10,24,0.4);
  }
  .eq-wealth__row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) 78px minmax(0, 1.6fr) 28px;
    gap: 6px; align-items: center;
  }
  .eq-wealth__row input {
    background: rgba(6,10,24,0.7); color: #e5ecff;
    border: 1px solid rgba(140,170,230,0.22); border-radius: 8px;
    padding: 7px 9px; font-size: 12px; outline: none; min-width: 0;
  }
  .eq-wealth__row input:focus { border-color: rgba(120,220,255,0.85); }
  .eq-wealth__qty {
    display: flex; align-items: center; gap: 4px;
    background: rgba(6,10,24,0.7);
    border: 1px solid rgba(140,170,230,0.22); border-radius: 8px;
    padding: 0 6px 0 8px;
  }
  .eq-wealth__qty > span {
    color: #9aa7d4; font-size: 12px; font-weight: 700;
  }
  .eq-wealth__qty input {
    background: transparent; border: 0; padding: 7px 0;
    width: 44px; text-align: center; color: #e5ecff;
  }
  .eq-wealth__remove {
    appearance: none; cursor: pointer;
    background: rgba(244,114,182,0.10);
    border: 1px solid rgba(244,114,182,0.35); border-radius: 8px;
    color: #fbcfe8; font-size: 14px; line-height: 1;
    width: 28px; height: 28px;
    display: grid; place-items: center;
  }
  .eq-wealth__remove:hover { background: rgba(244,114,182,0.22); }
  .eq-wealth__add {
    align-self: flex-start;
    appearance: none; cursor: pointer;
    background: rgba(120,200,255,0.10);
    border: 1px dashed rgba(120,200,255,0.40); border-radius: 8px;
    color: #cfe6ff; padding: 7px 14px; font-size: 12px; font-weight: 600;
    letter-spacing: 0.04em;
  }
  .eq-wealth__add:hover { background: rgba(120,200,255,0.18); border-style: solid; }

  @media (max-width: 900px) {
    .eq-identity { grid-template-columns: 64px 1fr; }
    .eq-identity__remove { grid-column: 1 / -1; justify-self: end; }
    .eq-identity__grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .eq-sheet__body { grid-template-columns: 1fr; }
    .eq-doll {
      grid-template-columns: 1fr 1fr;
      grid-auto-rows: auto;
      min-height: 0;
    }
    .eq-slot { grid-column: auto !important; grid-row: auto !important; }
    .eq-doll__silhouette { display: none; }

    /* Wealth row needs to stack at narrow widths or the inputs get crushed. */
    .eq-wealth__row {
      grid-template-columns: 1fr 78px 28px;
      grid-template-areas:
        "name qty remove"
        "notes notes notes";
      gap: 6px;
    }
    .eq-wealth__name  { grid-area: name; }
    .eq-wealth__qty   { grid-area: qty; }
    .eq-wealth__remove { grid-area: remove; }
    .eq-wealth__notes { grid-area: notes; }
  }

  /* ── Top bar holds the roster + theme switcher on one row ─────────── */
  .eq-topbar {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
  }
  .eq-topbar .eq-roster { margin-bottom: 0; flex: 1 1 auto; }

  .eq-theme-switch {
    display: inline-flex; align-items: stretch; gap: 4px;
    padding: 4px; border-radius: 999px;
    background: rgba(8,12,28,0.55);
    border: 1px solid rgba(140,170,230,0.22);
    backdrop-filter: blur(6px);
    flex: 0 0 auto;
  }
  .eq-theme-switch__btn {
    appearance: none; cursor: pointer; font: inherit;
    display: inline-flex; align-items: center; gap: 6px;
    border: 0; background: transparent;
    color: #9aa7d4; padding: 6px 14px; border-radius: 999px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
    transition: background .15s ease, color .15s ease;
  }
  .eq-theme-switch__btn:hover { color: #e5ecff; }
  .eq-theme-switch__btn.is-active {
    background: rgba(120,200,255,0.18); color: #f2f6ff;
    box-shadow: inset 0 0 0 1px rgba(120,220,255,0.45);
  }
  .eq-theme-switch__dot {
    width: 12px; height: 12px; border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.25);
  }
  .eq-theme-switch__dot--aether {
    background: radial-gradient(circle at 30% 30%, #8dd6ff, #2c4dd1 70%);
  }
  .eq-theme-switch__dot--parchment {
    background: radial-gradient(circle at 30% 30%, #fff3c8, #b07a2c 70%);
  }

  /* ════════════════════════════════════════════════════════════════════
     PARCHMENT THEME OVERRIDE
     Applies when .eq-stage[data-theme="parchment"]. Re-skins the dark
     Aether HUD into an aged-paper look without touching the base rules.
     ═══════════════════════════════════════════════════════════════════ */
  .eq-stage[data-theme="parchment"] {
    color: #3a2412;
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  }
  .eq-stage[data-theme="parchment"] .eq-stage__aether {
    background:
      radial-gradient(circle at 18% 12%, rgba(196,128,42,0.18), transparent 55%),
      radial-gradient(circle at 82% 18%, rgba(140,80,20,0.14), transparent 55%),
      radial-gradient(circle at 50% 100%, rgba(120,70,20,0.12), transparent 60%),
      linear-gradient(180deg, #f6ecc8 0%, #ebd9a0 60%, #d9c184 100%);
    box-shadow:
      inset 0 0 90px rgba(120, 80, 30, 0.35),
      inset 0 0 12px rgba(80, 50, 20, 0.25);
  }
  /* Subtle paper fibre noise on top of the parchment background. */
  .eq-stage[data-theme="parchment"]::before {
    content: ""; position: absolute; inset: -20px 0 0 0; z-index: 0;
    border-radius: 24px; pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.30  0 0 0 0 0.18  0 0 0 0 0.05  0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>");
    mix-blend-mode: multiply;
    opacity: 0.45;
  }

  .eq-stage[data-theme="parchment"] .eq-theme-switch {
    background: rgba(255, 247, 220, 0.7);
    border-color: rgba(120, 80, 30, 0.32);
  }
  .eq-stage[data-theme="parchment"] .eq-theme-switch__btn { color: #7a5530; }
  .eq-stage[data-theme="parchment"] .eq-theme-switch__btn:hover { color: #3a2412; }
  .eq-stage[data-theme="parchment"] .eq-theme-switch__btn.is-active {
    background: rgba(196, 128, 42, 0.22); color: #3a2412;
    box-shadow: inset 0 0 0 1px rgba(120, 80, 30, 0.55);
  }

  .eq-stage[data-theme="parchment"] .eq-roster__chip,
  .eq-stage[data-theme="parchment"] .eq-roster__add {
    background: rgba(255, 247, 220, 0.85);
    border: 1px solid rgba(120, 80, 30, 0.35);
    color: #3a2412;
    backdrop-filter: none;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 2px 6px rgba(120, 80, 30, 0.15);
  }
  .eq-stage[data-theme="parchment"] .eq-roster__chip span { color: #7a5530; }
  .eq-stage[data-theme="parchment"] .eq-roster__chip.is-active {
    border-color: #8b3a1b;
    box-shadow: 0 0 0 1px #8b3a1b, 0 6px 18px rgba(120, 60, 20, 0.25);
  }
  .eq-stage[data-theme="parchment"] .eq-roster__add { color: #8b3a1b; }

  .eq-stage[data-theme="parchment"] .eq-sheet {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(255, 247, 220, 0.95), rgba(245, 232, 195, 0.95)),
      #f5e8c3;
    border: 1px solid rgba(120, 80, 30, 0.35);
    border-radius: 8px;
    box-shadow:
      0 30px 60px rgba(80, 50, 20, 0.35),
      inset 0 0 0 2px rgba(255, 255, 255, 0.45),
      inset 0 0 0 3px rgba(120, 80, 30, 0.25);
    backdrop-filter: none;
  }

  .eq-stage[data-theme="parchment"] .eq-identity {
    border-bottom: 1px solid rgba(120, 80, 30, 0.35);
    border-image: linear-gradient(90deg, transparent, rgba(120, 80, 30, 0.55), transparent) 1;
  }
  .eq-stage[data-theme="parchment"] .eq-identity__row span,
  .eq-stage[data-theme="parchment"] .eq-identity__grid span {
    color: #7a5530;
  }
  .eq-stage[data-theme="parchment"] .eq-identity__name {
    color: #2a1a08; border-bottom-color: rgba(120, 80, 30, 0.45);
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
    font-style: italic;
  }
  .eq-stage[data-theme="parchment"] .eq-identity__name:focus { border-color: #8b3a1b; }
  .eq-stage[data-theme="parchment"] .eq-identity__grid input {
    background: rgba(255, 252, 235, 0.9); color: #3a2412;
    border-color: rgba(120, 80, 30, 0.32);
  }
  .eq-stage[data-theme="parchment"] .eq-identity__grid input:focus { border-color: #8b3a1b; }
  .eq-stage[data-theme="parchment"] .eq-identity__remove {
    background: rgba(139, 58, 27, 0.10);
    border-color: rgba(139, 58, 27, 0.45);
    color: #8b3a1b;
  }

  .eq-stage[data-theme="parchment"] .eq-doll {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(196, 128, 42, 0.10), transparent 60%),
      rgba(255, 247, 220, 0.55);
    border: 1px dashed rgba(120, 80, 30, 0.4);
  }
  /* Recolor the silhouette so it reads on paper instead of dark. */
  .eq-stage[data-theme="parchment"] .eq-doll__silhouette {
    opacity: 0.55;
    filter:
      sepia(0.7) hue-rotate(-15deg) saturate(1.4) brightness(0.65) contrast(1.1);
  }
  .eq-stage[data-theme="parchment"] .eq-doll__silhouette svg {
    filter: drop-shadow(0 0 18px rgba(120, 80, 30, 0.25));
  }

  .eq-stage[data-theme="parchment"] .eq-slot {
    background: rgba(255, 252, 235, 0.92);
    border: 1px solid color-mix(in srgb, var(--eq-rarity) 50%, rgba(120, 80, 30, 0.4));
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.7) inset,
      0 6px 14px rgba(120, 80, 30, 0.18);
    backdrop-filter: none;
  }
  .eq-stage[data-theme="parchment"] .eq-slot.is-filled {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--eq-rarity) 70%, transparent),
      0 0 18px color-mix(in srgb, var(--eq-rarity) 28%, transparent),
      0 8px 18px rgba(120, 80, 30, 0.22);
  }
  .eq-stage[data-theme="parchment"] .eq-slot__icon {
    background: color-mix(in srgb, var(--eq-rarity) 22%, rgba(255, 247, 220, 0.95));
  }
  .eq-stage[data-theme="parchment"] .eq-slot__label {
    color: color-mix(in srgb, var(--eq-rarity) 55%, #5a3a18);
  }
  .eq-stage[data-theme="parchment"] .eq-slot__name {
    background: rgba(255, 252, 235, 0.85); color: #2a1a08;
    border-color: rgba(120, 80, 30, 0.28);
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  }
  .eq-stage[data-theme="parchment"] .eq-slot__name::placeholder { color: rgba(120, 80, 30, 0.45); }
  .eq-stage[data-theme="parchment"] .eq-slot__notes {
    background: rgba(255, 252, 235, 0.72); color: #4a3220;
    border-color: rgba(120, 80, 30, 0.28);
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  }
  .eq-stage[data-theme="parchment"] .eq-slot__notes::placeholder { color: rgba(120, 80, 30, 0.45); }
  .eq-stage[data-theme="parchment"] .eq-slot__rarity {
    border-color: rgba(120, 80, 30, 0.5);
  }
  .eq-stage[data-theme="parchment"] .eq-slot__rarity.is-active {
    box-shadow: 0 0 0 2px #fff8e1, 0 0 0 3px rgba(120, 80, 30, 0.55), 0 0 10px var(--rarity);
  }

  .eq-stage[data-theme="parchment"] .eq-notes,
  .eq-stage[data-theme="parchment"] .eq-wealth {
    background:
      radial-gradient(circle at 100% 0%, rgba(196, 128, 42, 0.12), transparent 60%),
      rgba(255, 247, 220, 0.82);
    border: 1px dashed rgba(120, 80, 30, 0.4);
  }
  .eq-stage[data-theme="parchment"] .eq-notes__head span,
  .eq-stage[data-theme="parchment"] .eq-wealth__head span {
    color: #7a5530;
  }
  .eq-stage[data-theme="parchment"] .eq-notes__head h3,
  .eq-stage[data-theme="parchment"] .eq-wealth__head h3 {
    color: #2a1a08;
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
    font-variant: small-caps; letter-spacing: 0.08em;
  }
  .eq-stage[data-theme="parchment"] .eq-notes__body {
    background:
      repeating-linear-gradient(180deg, transparent 0, transparent 23px, rgba(120, 80, 30, 0.12) 23px, rgba(120, 80, 30, 0.12) 24px),
      rgba(255, 252, 235, 0.85);
    color: #2a1a08;
    border-color: rgba(120, 80, 30, 0.28);
    font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
    line-height: 24px;
  }
  .eq-stage[data-theme="parchment"] .eq-notes__body:focus { border-color: #8b3a1b; }

  .eq-stage[data-theme="parchment"] .eq-wealth__gp > span { color: #8b3a1b; }
  .eq-stage[data-theme="parchment"] .eq-wealth__gp input {
    background: rgba(255, 252, 235, 0.92); color: #6a3a08;
    border-color: rgba(139, 58, 27, 0.45);
  }
  .eq-stage[data-theme="parchment"] .eq-wealth__row input,
  .eq-stage[data-theme="parchment"] .eq-wealth__qty {
    background: rgba(255, 252, 235, 0.88); color: #3a2412;
    border-color: rgba(120, 80, 30, 0.28);
  }
  .eq-stage[data-theme="parchment"] .eq-wealth__qty input { background: transparent; color: #3a2412; }
  .eq-stage[data-theme="parchment"] .eq-wealth__qty > span { color: #7a5530; }
  .eq-stage[data-theme="parchment"] .eq-wealth__empty {
    color: #7a5530; border-color: rgba(120, 80, 30, 0.32);
    background: rgba(255, 252, 235, 0.55);
  }
  .eq-stage[data-theme="parchment"] .eq-wealth__add {
    background: rgba(139, 58, 27, 0.10); color: #8b3a1b;
    border-color: rgba(139, 58, 27, 0.45);
  }
  .eq-stage[data-theme="parchment"] .eq-wealth__add:hover { background: rgba(139, 58, 27, 0.18); }
  .eq-stage[data-theme="parchment"] .eq-wealth__remove {
    background: rgba(139, 58, 27, 0.08); color: #8b3a1b;
    border-color: rgba(139, 58, 27, 0.4);
  }
`;

// ------------------------------------------------------------
// INTEGRATION NOTES (read me)
// ------------------------------------------------------------
// 1. Register the route in `content/Config.js`:
//      PAGE_ROUTES.push({ key: "equipment", label: "Equipment", path: "./equipment.html" });
//
// 2. Add a case to your router/UIRenderer switch:
//      import { renderEquipmentSheetPage } from "./ui/EquipmentSheetPage.js";
//      case "equipment": return renderEquipmentSheetPage(state);
//
// 3. Initialize state slice (idempotent, in your state bootstrap):
//      state.playerCharacters ??= [];
//      state.transientUi ??= {};
//
// 4. Wire data-actions in your existing event delegator:
//      - set-active-player-character  -> state.transientUi.activePlayerCharacterId = data.characterId
//      - add-player-character         -> push blankCharacter() into state.playerCharacters; set active
//      - remove-player-character      -> filter out by characterId
//      - set-player-character-field   -> state.playerCharacters[i][data.field] = event.target.value
//      - set-equipment-slot           -> state.playerCharacters[i].equipment[data.slotKey][data.field] = value
//      - set-player-notes             -> state.playerCharacters[i].notes = event.target.value
//      - set-equipment-theme          -> state.transientUi.equipmentSheetTheme = data.theme
//        (allowed values: "aether" | "parchment"; default "aether")
//
// 5. Mobile: the @media (max-width: 900px) breakpoint stacks slots into a 2-col
//    grid and hides the silhouette. For a true 820px-pinned variant, drop the
//    media query and let the parent shell scroll horizontally.
