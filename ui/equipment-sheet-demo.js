const EQUIPMENT_SLOTS = [
  { key: "helm",     label: "Helm",      icon: "\u{1F451}", column: "center", order: 1 },
  { key: "neck",     label: "Neck",      icon: "\u{1F4FF}", column: "right",  order: 1 },
  { key: "cloak",    label: "Cloak",     icon: "\u{1F9E5}", column: "left",   order: 1 },
  { key: "mainhand", label: "Main Hand", icon: "⚔️", column: "left",   order: 2 },
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
const RARITY_LOOKUP = Object.fromEntries(RARITIES.map(r => [r.key, r]));
const rarityColor = k => (RARITY_LOOKUP[k] || RARITY_LOOKUP.common).color;
const emptySlot = () => ({ name: "", rarity: "common", notes: "" });
const blankCharacter = (seed = "New Wanderer") => ({
  id: "pc-" + Math.random().toString(36).slice(2, 8),
  name: seed, class: "", title: "", level: 1, attunements: 0,
  equipment: Object.fromEntries(EQUIPMENT_SLOTS.map(s => [s.key, emptySlot()])),
  notes: ""
});
const escapeHtml = (s) => String(s == null ? "" : s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const seedAelara = blankCharacter("Aelara Stormveil");
seedAelara.class = "Stormcaller"; seedAelara.title = "Voice of the Drift"; seedAelara.level = 7; seedAelara.attunements = 3;
seedAelara.equipment.helm   = { name: "Crown of Spark-Crested Hours", rarity: "legendary", notes: "Hums softly at dawn." };
seedAelara.equipment.chest  = { name: "Aegis of the Sundered Pact",   rarity: "epic",      notes: "+2 ward vs. mana storms" };
seedAelara.equipment.mainhand = { name: "Stormcaller's Edge",         rarity: "rare",      notes: "Lightning rider." };
seedAelara.equipment.offhand  = { name: "Ward of the Hollow Moon",    rarity: "uncommon",  notes: "Reflect once per dusk." };
seedAelara.equipment.cloak  = { name: "Veil of Drifting Rain",        rarity: "rare",      notes: "" };
seedAelara.equipment.boots  = { name: "Stridewalkers",                rarity: "uncommon",  notes: "" };
seedAelara.equipment.ring1  = { name: "Pact-Bearer's Ring",           rarity: "mythic",    notes: "Sealed oath." };
seedAelara.equipment.trinket = { name: "Resonant Shard",              rarity: "epic",      notes: "Tracks behemoths." };
seedAelara.notes = "Owes the Forge-Mother three favors.\nKeeps a journal in cipher.\nNever sleeps east of running water.";

const seedKerev = blankCharacter("Kerev Ashbound");
seedKerev.class = "Reaver"; seedKerev.title = "The Ember Pact"; seedKerev.level = 4;

const state = {
  playerCharacters: [seedAelara, seedKerev],
  transientUi: { activePlayerCharacterId: seedAelara.id, equipmentSheetTheme: "aether" }
};
const THEMES = ["aether", "parchment"];
const THEME_LABELS = { aether: "Aether", parchment: "Parchment" };
const getTheme = () => THEMES.includes(state.transientUi.equipmentSheetTheme) ? state.transientUi.equipmentSheetTheme : "aether";
const getRoster = () => state.playerCharacters;
const getActive = () => getRoster().find(c => c.id === state.transientUi.activePlayerCharacterId) || getRoster()[0];

function hashSeed(value) { let h = 0; const s = String(value == null ? "" : value); for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; return Math.abs(h); }
function renderSigil(c) {
  const s = hashSeed(c.id || c.name); const a = s % 360, b = (a + 60 + s % 70) % 360;
  const initials = String(c.name || "").split(/\s+/).filter(Boolean).slice(0,2).map(p => (p[0] || "").toUpperCase()).join("") || "PC";
  return '<div class="eq-sigil" style="--eq-hue-a:' + a + ';--eq-hue-b:' + b + ';"><span class="eq-sigil__ring"></span><span class="eq-sigil__ring eq-sigil__ring--inner"></span><strong>' + escapeHtml(initials) + '</strong></div>';
}
function renderRoster() {
  const active = getActive();
  return '<nav class="eq-roster">' +
    getRoster().map(c =>
      '<button class="eq-roster__chip ' + (active && c.id === active.id ? "is-active" : "") + '" data-action="set-active" data-id="' + c.id + '">' +
        '<strong>' + escapeHtml(c.name || "Unnamed") + '</strong>' +
        '<span>' + escapeHtml(c.class || "—") + (c.level ? " · Lv " + c.level : "") + '</span>' +
      '</button>'
    ).join("") +
    '<button class="eq-roster__add" data-action="add">+ New Character</button>' +
  '</nav>';
}
function renderThemeSwitch() {
  const t = getTheme();
  return '<div class="eq-theme-switch" role="group" aria-label="Sheet theme">' +
    THEMES.map(k =>
      '<button class="eq-theme-switch__btn ' + (t === k ? "is-active" : "") + '" data-action="set-theme" data-theme="' + k + '" aria-pressed="' + (t === k ? "true" : "false") + '" title="Switch to ' + THEME_LABELS[k] + ' mode">' +
        '<span class="eq-theme-switch__dot eq-theme-switch__dot--' + k + '"></span>' + THEME_LABELS[k] +
      '</button>'
    ).join("") +
  '</div>';
}
function renderIdentity(c) {
  return '<header class="eq-identity">' +
    renderSigil(c) +
    '<div class="eq-identity__fields">' +
      '<label class="eq-identity__row"><span>Character Name</span>' +
        '<input class="eq-identity__name" type="text" value="' + escapeHtml(c.name) + '" placeholder="Name your hero…" data-action="field" data-field="name"/></label>' +
      '<div class="eq-identity__grid">' +
        '<label><span>Class</span><input type="text" value="' + escapeHtml(c.class) + '" placeholder="Stormcaller…" data-action="field" data-field="class"/></label>' +
        '<label><span>Title</span><input type="text" value="' + escapeHtml(c.title) + '" placeholder="The Sundered…" data-action="field" data-field="title"/></label>' +
        '<label><span>Level</span><input type="number" min="1" max="99" value="' + c.level + '" data-action="field" data-field="level"/></label>' +
        '<label><span>Attunements</span><input type="number" min="0" max="9" value="' + c.attunements + '" data-action="field" data-field="attunements"/></label>' +
      '</div>' +
    '</div>' +
    '<button class="eq-identity__remove" data-action="remove" data-id="' + c.id + '">Remove</button>' +
  '</header>';
}
function renderSlot(c, slot) {
  const v = c.equipment[slot.key] || emptySlot();
  const color = rarityColor(v.rarity);
  const filled = Boolean(v.name);
  return '<article class="eq-slot ' + (filled ? "is-filled" : "") + '" style="--eq-rarity:' + color + '; grid-column: ' + slot.column + '; grid-row: ' + slot.order + ';" data-slot="' + slot.key + '">' +
    '<header class="eq-slot__head"><span class="eq-slot__icon">' + slot.icon + '</span><span class="eq-slot__label">' + escapeHtml(slot.label) + '</span></header>' +
    '<input class="eq-slot__name" type="text" value="' + escapeHtml(v.name) + '" placeholder="— empty —" data-action="slot" data-slot-key="' + slot.key + '" data-field="name"/>' +
    '<div class="eq-slot__rarities">' +
      RARITIES.map(r =>
        '<button class="eq-slot__rarity ' + (v.rarity === r.key ? "is-active" : "") + '" style="--rarity:' + r.color + '" title="' + r.label + '" data-action="slot" data-slot-key="' + slot.key + '" data-field="rarity" data-value="' + r.key + '"></button>'
      ).join("") +
    '</div>' +
    '<textarea class="eq-slot__notes" rows="2" placeholder="Charges, attunement, sigils, who gave it…" data-action="slot" data-slot-key="' + slot.key + '" data-field="notes">' + escapeHtml(v.notes) + '</textarea>' +
  '</article>';
}
function renderDoll(c) {
  const svg = '<svg viewBox="0 0 200 360" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><radialGradient id="eqHalo" cx="50%" cy="20%" r="60%">' +
    '<stop offset="0%" stop-color="rgba(120,200,255,0.55)"/><stop offset="60%" stop-color="rgba(80,120,220,0.18)"/><stop offset="100%" stop-color="rgba(10,15,40,0)"/></radialGradient>' +
    '<linearGradient id="eqRobe" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(160,200,255,0.42)"/><stop offset="100%" stop-color="rgba(60,80,170,0.18)"/></linearGradient></defs>' +
    '<circle cx="100" cy="60" r="120" fill="url(#eqHalo)"/>' +
    '<path d="M100 40 C 116 40 128 54 128 70 C 128 86 116 100 100 100 C 84 100 72 86 72 70 C 72 54 84 40 100 40 Z M70 110 Q 100 90 130 110 L 150 200 L 140 320 L 110 320 L 105 220 L 95 220 L 90 320 L 60 320 L 50 200 Z" fill="url(#eqRobe)" stroke="rgba(180,220,255,0.55)" stroke-width="1.4"/>' +
    '<path d="M100 110 L 100 270" stroke="rgba(200,230,255,0.35)" stroke-width="1" stroke-dasharray="3 5"/></svg>';
  return '<section class="eq-doll"><div class="eq-doll__silhouette">' + svg + '</div>' +
    EQUIPMENT_SLOTS.map(s => renderSlot(c, s)).join("") +
  '</section>';
}
function renderNotes(c) {
  return '<section class="eq-notes">' +
    '<header class="eq-notes__head"><h3>Player Notes</h3><span>Free-form journal — backstory hooks, oaths, debts, anything.</span></header>' +
    '<textarea class="eq-notes__body" rows="10" placeholder="Write whatever your character would scrawl in the margins of their journal…" data-action="notes">' + escapeHtml(c.notes) + '</textarea>' +
  '</section>';
}
function render() {
  const c = getActive();
  const app = document.getElementById("app");
  app.innerHTML = '<section class="eq-stage" data-theme="' + getTheme() + '">' +
    '<div class="eq-stage__aether"></div>' +
    '<div class="eq-topbar">' + renderRoster() + renderThemeSwitch() + '</div>' +
    (c ? '<article class="eq-sheet">' + renderIdentity(c) + '<div class="eq-sheet__body">' + renderDoll(c) + renderNotes(c) + '</div></article>' : '<p>No characters yet.</p>') +
  '</section>';
}

document.addEventListener("click", function (e) {
  const t = e.target.closest("[data-action]"); if (!t) return;
  const a = t.dataset.action; const c = getActive();
  if (a === "set-active") { state.transientUi.activePlayerCharacterId = t.dataset.id; render(); }
  else if (a === "set-theme") { state.transientUi.equipmentSheetTheme = t.dataset.theme; render(); }
  else if (a === "add") { const n = blankCharacter("New Wanderer"); state.playerCharacters.push(n); state.transientUi.activePlayerCharacterId = n.id; render(); }
  else if (a === "remove") {
    state.playerCharacters = state.playerCharacters.filter(x => x.id !== t.dataset.id);
    if (state.playerCharacters.length === 0) state.playerCharacters.push(blankCharacter());
    state.transientUi.activePlayerCharacterId = state.playerCharacters[0].id;
    render();
  } else if (a === "slot" && t.dataset.field === "rarity") {
    c.equipment[t.dataset.slotKey].rarity = t.dataset.value; render();
  }
});
document.addEventListener("input", function (e) {
  const t = e.target.closest("[data-action]"); if (!t) return;
  const a = t.dataset.action; const c = getActive();
  if (a === "field") {
    const f = t.dataset.field;
    c[f] = (f === "level" || f === "attunements") ? Number(t.value) : t.value;
    if (f === "name" || f === "class" || f === "level") {
      const rosterEl = document.querySelector(".eq-roster");
      if (rosterEl) rosterEl.outerHTML = renderRoster();
    }
  } else if (a === "slot") {
    c.equipment[t.dataset.slotKey][t.dataset.field] = t.value;
  } else if (a === "notes") {
    c.notes = t.value;
  }
});

render();
