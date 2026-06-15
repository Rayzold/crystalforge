// Building Codex — a "pokédex" for the city's building catalog.
// Shows every (building name, rarity) entry in the canonical pools with
// discovered / undiscovered state, manifest count, and per-rarity progress.
// Filterable by rarity, building role (tag), and discovery state.

import { BUILDING_POOLS } from "../content/BuildingPools.js?v=v1.7.20-20260615180000";
import {
  BUILDING_ROLE_LEGEND,
  createBaseBuildingCatalog,
  getCatalogKey
} from "../content/BuildingCatalog.js?v=v1.7.20-20260615180000";
import { RARITY_ORDER } from "../content/Rarities.js?v=v1.7.20-20260615130257";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260615130257";
import { renderBuildingArt } from "./BuildingArt.js?v=v1.7.20-20260615130257";

const DEFAULT_FILTERS = { rarity: "All", role: "All", discovery: "All" };

function getCodexFilters(state) {
  const f = state.transientUi?.codexFilters ?? {};
  return {
    rarity: typeof f.rarity === "string" ? f.rarity : DEFAULT_FILTERS.rarity,
    role: typeof f.role === "string" ? f.role : DEFAULT_FILTERS.role,
    discovery: typeof f.discovery === "string" ? f.discovery : DEFAULT_FILTERS.discovery
  };
}

// Every (name, rarity) pair worth tracking. We strip "Crystal Upgrade" because
// it's a slot placeholder for the rarity-upgrade mechanic, not a real building.
function getCodexEntries() {
  const catalog = createBaseBuildingCatalog();
  const entries = [];
  for (const rarity of RARITY_ORDER) {
    for (const name of BUILDING_POOLS[rarity]) {
      if (name === "Crystal Upgrade") continue;
      const key = getCatalogKey(name, rarity);
      const entry = catalog[key];
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

// Map of catalog key -> array of the player's manifested instances. We use the
// raw name|rarity composite so we never collide with the Crystal Upgrade key.
function buildDiscoveryIndex(state) {
  const index = new Map();
  for (const b of state.buildings ?? []) {
    if (!b?.name || !b?.rarity) continue;
    const key = `${b.name}|${b.rarity}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(b);
  }
  return index;
}

function indexKeyFor(entry) {
  return `${entry.name}|${entry.rarity}`;
}

function renderRarityProgress(entries, discoveryIndex) {
  const blocks = RARITY_ORDER.map((rarity) => {
    const slice = entries.filter((e) => e.rarity === rarity);
    if (!slice.length) return "";
    const discovered = slice.filter((e) => discoveryIndex.has(indexKeyFor(e))).length;
    const total = slice.length;
    const pct = total === 0 ? 0 : Math.round((discovered / total) * 100);
    return `
      <article class="codex-progress__rarity rarity-${rarity.toLowerCase()}" style="--rarity-color: var(--rarity-${rarity.toLowerCase()}, var(--accent));">
        <header>
          <span>${escapeHtml(rarity)}</span>
          <strong>${discovered} / ${total}</strong>
        </header>
        <div class="codex-progress__bar"><span style="width: ${pct}%;"></span></div>
        <small>${pct}%</small>
      </article>
    `;
  }).filter(Boolean).join("");
  return blocks;
}

function renderCodexHeader(state, entries, discoveryIndex) {
  const total = entries.length;
  const discovered = entries.filter((e) => discoveryIndex.has(indexKeyFor(e))).length;
  const pct = total === 0 ? 0 : Math.round((discovered / total) * 100);
  return `
    <section class="panel codex-header">
      <div class="codex-header__overall">
        <div>
          <p class="panel__subtle">Building Codex</p>
          <h3>${discovered} / ${total} discovered</h3>
          <small>${pct}% of the canonical roll pools have been manifested at least once. Discovered entries show their art, district, and 350% apex bonus; undiscovered slots stay as silhouettes until rolled.</small>
        </div>
        <div class="codex-header__ring" style="--pct: ${pct};" role="img" aria-label="${pct}% discovered">
          <span>${pct}%</span>
        </div>
      </div>
      <div class="codex-header__rarities">
        ${renderRarityProgress(entries, discoveryIndex)}
      </div>
    </section>
  `;
}

function renderRoleOption(role, currentRole) {
  return `<option value="${role.key}" ${role.key === currentRole ? "selected" : ""}>${role.emoji} ${escapeHtml(role.label)}</option>`;
}

function renderCodexFilters(filters) {
  const rarityOptions = ["All", ...RARITY_ORDER]
    .map((r) => `<option value="${r}" ${r === filters.rarity ? "selected" : ""}>${escapeHtml(r)}</option>`)
    .join("");
  return `
    <section class="panel codex-filters">
      <label class="codex-filters__field">
        <span>Rarity</span>
        <select data-action="set-codex-filter" data-filter-key="rarity">${rarityOptions}</select>
      </label>
      <label class="codex-filters__field">
        <span>Type</span>
        <select data-action="set-codex-filter" data-filter-key="role">
          <option value="All" ${filters.role === "All" ? "selected" : ""}>All types</option>
          ${BUILDING_ROLE_LEGEND.map((role) => renderRoleOption(role, filters.role)).join("")}
        </select>
      </label>
      <label class="codex-filters__field">
        <span>Discovery</span>
        <select data-action="set-codex-filter" data-filter-key="discovery">
          <option value="All" ${filters.discovery === "All" ? "selected" : ""}>All</option>
          <option value="Discovered" ${filters.discovery === "Discovered" ? "selected" : ""}>Discovered</option>
          <option value="Undiscovered" ${filters.discovery === "Undiscovered" ? "selected" : ""}>Undiscovered</option>
        </select>
      </label>
      <button class="button button--ghost" type="button" data-action="reset-codex-filter">Reset</button>
    </section>
  `;
}

function applyFilters(entries, filters, discoveryIndex) {
  return entries.filter((entry) => {
    if (filters.rarity !== "All" && entry.rarity !== filters.rarity) return false;
    if (filters.role !== "All") {
      const tags = entry.tags ?? [];
      if (!tags.includes(filters.role)) return false;
    }
    if (filters.discovery !== "All") {
      const isDiscovered = discoveryIndex.has(indexKeyFor(entry));
      if (filters.discovery === "Discovered" && !isDiscovered) return false;
      if (filters.discovery === "Undiscovered" && isDiscovered) return false;
    }
    return true;
  });
}

function bestInstanceQuality(instances = []) {
  let best = 0;
  for (const inst of instances) {
    const q = Number(inst?.quality ?? 0);
    if (Number.isFinite(q) && q > best) best = q;
  }
  return best;
}

function getRoleForEntry(entry) {
  const primary = entry?.tags?.[0];
  return BUILDING_ROLE_LEGEND.find((r) => r.key === primary) ?? {
    key: "structure",
    emoji: "🏗️",
    label: "Structure"
  };
}

function renderDiscoveredCard(entry, instances) {
  const count = instances.length;
  const role = getRoleForEntry(entry);
  const bestQuality = bestInstanceQuality(instances);
  const isApex = bestQuality >= 350;
  return `
    <article class="codex-card codex-card--discovered rarity-${entry.rarity.toLowerCase()}" data-rarity="${escapeHtml(entry.rarity)}">
      <div class="codex-card__art">
        ${renderBuildingArt(
          entry.imagePath,
          `${entry.displayName} artwork`,
          `<div class="codex-card__art-fallback"><span>${escapeHtml(entry.displayName.slice(0, 1))}</span></div>`
        )}
        ${count > 1 ? `<span class="codex-card__owned">×${count}</span>` : `<span class="codex-card__owned codex-card__owned--single">Owned</span>`}
      </div>
      <div class="codex-card__body">
        <header>
          <span class="codex-card__role">${role.emoji} ${escapeHtml(role.label)}</span>
          <span class="codex-card__rarity">${escapeHtml(entry.rarity)}</span>
        </header>
        <h4>${escapeHtml(entry.displayName)}</h4>
        <p class="codex-card__district">${escapeHtml(entry.district)}</p>
        <p class="codex-card__flavor">${escapeHtml(entry.flavorText ?? "")}</p>
        <footer class="codex-card__footer">
          <span>Best quality</span>
          <strong>${formatNumber(bestQuality, bestQuality >= 100 ? 0 : 1)}%</strong>
          ${isApex ? `<em class="codex-card__apex-flag">350% Apex</em>` : ""}
        </footer>
        ${
          isApex && entry.apexNote
            ? `<p class="codex-card__apex"><span>Apex bonus</span>${escapeHtml(entry.apexNote)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderUndiscoveredCard(entry) {
  const role = getRoleForEntry(entry);
  return `
    <article class="codex-card codex-card--undiscovered rarity-${entry.rarity.toLowerCase()}" data-rarity="${escapeHtml(entry.rarity)}">
      <div class="codex-card__art codex-card__art--silhouette" aria-hidden="true">
        <span class="codex-card__silhouette">?</span>
      </div>
      <div class="codex-card__body">
        <header>
          <span class="codex-card__role">${role.emoji} ${escapeHtml(role.label)}</span>
          <span class="codex-card__rarity">${escapeHtml(entry.rarity)}</span>
        </header>
        <h4>???</h4>
        <p class="codex-card__district">Manifest a ${escapeHtml(entry.rarity)} crystal to reveal.</p>
      </div>
    </article>
  `;
}

function renderCard(entry, discoveryIndex) {
  const instances = discoveryIndex.get(indexKeyFor(entry));
  if (instances && instances.length) {
    return renderDiscoveredCard(entry, instances);
  }
  return renderUndiscoveredCard(entry);
}

function renderCodexGrid(filteredEntries, discoveryIndex) {
  if (!filteredEntries.length) {
    return `
      <section class="panel codex-grid-panel">
        <p class="empty-state">No buildings match the active filters.</p>
      </section>
    `;
  }
  return `
    <section class="panel codex-grid-panel">
      <div class="codex-grid">
        ${filteredEntries.map((entry) => renderCard(entry, discoveryIndex)).join("")}
      </div>
    </section>
  `;
}

export function renderCodexPage(state) {
  const entries = getCodexEntries();
  const discoveryIndex = buildDiscoveryIndex(state);
  const filters = getCodexFilters(state);
  const filtered = applyFilters(entries, filters, discoveryIndex);

  return {
    title: "Building Codex",
    subtitle: `Track every building in the realm — currently ${entries.filter((e) => discoveryIndex.has(indexKeyFor(e))).length} of ${entries.length} discovered.`,
    content: `
      ${renderCodexHeader(state, entries, discoveryIndex)}
      ${renderCodexFilters(filters)}
      ${renderCodexGrid(filtered, discoveryIndex)}
    `
  };
}
