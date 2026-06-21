import { escapeHtml } from "../engine/Utils.js?v=v1.7.20-20260621141413";

const ENTITY_TYPES = [
  { key: "building", label: "Building", glyph: "\u{1F3D9}️" },
  { key: "npc",      label: "NPC",      glyph: "\u{1F3AD}" },
  { key: "awakened", label: "Awakened", glyph: "⚡" },
  { key: "behemoth", label: "Behemoth", glyph: "\u{1F409}" },
  { key: "legend",   label: "Legend",   glyph: "✨" },
  { key: "player",   label: "Player",   glyph: "\u{1F464}" }
];

const TYPE_BY_KEY = Object.fromEntries(ENTITY_TYPES.map((entry) => [entry.key, entry]));

export const SEARCHABLE_TYPES = ENTITY_TYPES;

export function buildSearchIndex(state) {
  const entries = [];

  for (const building of state?.buildings ?? []) {
    if (!building?.id) continue;
    entries.push({
      id: building.id,
      type: "building",
      name: building.displayName || building.name || "Unnamed Building",
      detail: [building.rarity, building.district].filter(Boolean).join(" / "),
      href: `./city.html?focus=${encodeURIComponent(building.id)}`
    });
  }

  for (const npc of state?.npcs ?? []) {
    if (!npc?.id) continue;
    entries.push({
      id: npc.id,
      type: "npc",
      name: npc.name || "Unnamed NPC",
      detail: npc.role || "",
      href: `./npcs.html?focus=${encodeURIComponent(npc.id)}`
    });
  }

  for (const entry of state?.awakened ?? []) {
    if (!entry?.id) continue;
    entries.push({
      id: entry.id,
      type: "awakened",
      name: entry.name || "Unnamed Awakened",
      detail: [entry.grade ? `Grade ${entry.grade}` : "", entry.abilityTypeId].filter(Boolean).join(" / "),
      href: `./awakened.html?focus=${encodeURIComponent(entry.id)}`
    });
  }

  for (const behemoth of state?.behemoths ?? []) {
    if (!behemoth?.id) continue;
    entries.push({
      id: behemoth.id,
      type: "behemoth",
      name: behemoth.name || "Unnamed Behemoth",
      detail: behemoth.status || "",
      href: `./behemoths.html?focus=${encodeURIComponent(behemoth.id)}`
    });
  }

  for (const legend of state?.uniqueCitizens ?? []) {
    if (!legend?.id) continue;
    entries.push({
      id: legend.id,
      type: "legend",
      name: legend.fullName || "Unnamed Legend",
      detail: [legend.title, legend.className].filter(Boolean).join(" / "),
      href: `./uniques.html?focus=${encodeURIComponent(legend.id)}`
    });
  }

  for (const pc of state?.playerCharacters ?? []) {
    if (!pc?.id) continue;
    entries.push({
      id: pc.id,
      type: "player",
      name: pc.name || "Unnamed Character",
      detail: [pc.class, pc.title].filter(Boolean).join(" / "),
      href: `./equipment.html?focus=${encodeURIComponent(pc.id)}`
    });
  }

  return entries;
}

export function filterSearchIndex(index, rawQuery, { limit = 20 } = {}) {
  const query = String(rawQuery ?? "").trim().toLowerCase();
  if (!query) {
    return [];
  }
  const results = [];
  for (const entry of index) {
    const haystack = `${entry.name} ${entry.detail} ${entry.type}`.toLowerCase();
    if (haystack.includes(query)) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function renderSearchResults(results, rawQuery = "") {
  const query = String(rawQuery ?? "").trim();
  if (!query) {
    return `<p class="global-search__empty">Type to search across buildings, NPCs, awakened, behemoths, legends, and characters.</p>`;
  }
  if (!results.length) {
    return `<p class="global-search__empty">No matches for "${escapeHtml(query)}".</p>`;
  }
  return `
    <ul class="global-search__results">
      ${results
        .map((entry) => {
          const type = TYPE_BY_KEY[entry.type];
          return `
            <li>
              <a class="global-search__result" href="${entry.href}">
                <span class="global-search__result-glyph" aria-hidden="true">${type?.glyph ?? "•"}</span>
                <span class="global-search__result-body">
                  <strong>${escapeHtml(entry.name)}</strong>
                  ${entry.detail ? `<small>${escapeHtml(entry.detail)}</small>` : ""}
                </span>
                <em class="global-search__result-type">${escapeHtml(type?.label ?? entry.type)}</em>
              </a>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

export function renderGlobalSearchWidget() {
  return `
    <div class="global-search" data-global-search>
      <button
        class="top-nav__icon-button global-search__toggle"
        type="button"
        data-action="toggle-global-search"
        aria-label="Search (press /)"
        title="Search (press /)"
      >\u{1F50D}</button>
      <div class="global-search__panel" data-global-search-panel hidden>
        <input
          type="search"
          class="global-search__input"
          placeholder="Search buildings, NPCs, awakened, legends…"
          data-global-search-input
          autocomplete="off"
          spellcheck="false"
        />
        <div class="global-search__output" data-global-search-output>
          ${renderSearchResults([], "")}
        </div>
      </div>
    </div>
  `;
}
