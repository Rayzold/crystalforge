// Scarred Lands Professions — page controller (player + DM).
// No framework: renders HTML strings into #view and delegates clicks/submits.

import { DISENCHANT, FRAGMENTS_PER_RELIC, gatheringTier, proficiencyLevel, rollD20, rollDice, SKINNABLE } from "./rules.js";
import { PROFESSIONS, RECIPES, findRecipe } from "./recipes.js";
import { canRoll, generateClaimCode, RESOURCE_TYPES, rollContext, SKILL_ABILITY, weeksUsed } from "./model.js";
import { describeGatherEntry, practices, REGIONS, TRAVEL_PROFESSIONS } from "./gathering.js";
import * as store from "./store.js";

const IS_GM_VIEW = new URLSearchParams(location.search).has("gm");
const CODE_KEY = "professions-claim-code";
const TAB_KEY = "professions-tab";
const THEME_KEY = "professions-theme";

const ui = {
  tab: safeGet(TAB_KEY) || "player",
  data: { realm: null, characters: [], projects: [], log: [], gathering: [], gatheringError: null },
  pendingRender: false,
  myCharId: null,
  uid: null,
  editing: null // GM: character id being edited, "new", or null
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
const $ = (sel) => document.querySelector(sel);

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

async function guarded(fn) {
  try { await fn(); } catch (err) { console.error(err); toast(err?.message ?? String(err)); }
}

const charById = (id) => ui.data.characters.find((c) => c.id === id) ?? null;
const projectById = (id) => ui.data.projects.find((p) => p.id === id) ?? null;
const downtime = () => ui.data.realm?.downtime ?? { id: null, open: false, weeks: 0 };

function modeChip(mode) {
  const cls = mode === "advantage" ? "adv" : mode === "disadvantage" ? "dis" : "";
  const label = mode === "advantage" ? "Advantage" : mode === "disadvantage" ? "Disadvantage" : "Normal";
  return `<span class="chip ${cls}">${label}</span>`;
}

function progressBar(p) {
  const pct = Math.round((100 * (p.weeksDone ?? 0)) / Math.max(1, p.weeksTarget));
  return `<div class="bar" title="${p.weeksDone}/${p.weeksTarget} εβδομάδες"><span style="width:${pct}%"></span></div>`;
}

function recipeLine(recipe) {
  return `${esc(recipe.name)} <span class="muted">· ${PROFESSIONS[recipe.profession].label} · ${recipe.rarity} · DC ${recipe.dc} · ${recipe.weeks} εβδ. · ${recipe.cost} GP · ${esc(recipe.skill)}</span>`;
}

// ─── Views ───────────────────────────────────────────────────────────────────

function viewClaim() {
  return `
    <h2>Σύνδεση χαρακτήρα</h2>
    <form class="card row" data-form="claim">
      <label>Κωδικός από τον DM <input name="code" placeholder="DRIFT-XXXX-XXXX" autocomplete="off" required></label>
      <button class="act" type="submit">Σύνδεση</button>
    </form>`;
}

function viewProjectCard(p, character) {
  const recipe = findRecipe(p.recipeId);
  const owner = charById(p.charId);
  const check = character ? canRoll({ downtime: downtime(), log: ui.data.log, charId: character.id, project: p, character }) : { ok: false };
  const ctx = character && recipe ? rollContext(character, recipe, p.facility) : null;
  const helpers = p.crafters.filter((id) => id !== p.charId).map((id) => esc(charById(id)?.name ?? id));
  return `
    <div class="card">
      <h3>${esc(recipe?.name ?? p.recipeId)}</h3>
      <div class="row muted">
        <span>${esc(owner?.name ?? "—")}</span>
        <span>${esc(p.facility ?? "χωρίς facility")}</span>
        <span class="chip ${p.status === "proposed" ? "pending" : p.status === "complete" ? "approved" : ""}">${p.status}</span>
        ${p.complications ? `<span class="chip dis">${p.complications} complication${p.complications > 1 ? "s" : ""}</span>` : ""}
      </div>
      ${helpers.length ? `<div class="muted">Βοηθοί: ${helpers.join(", ")}</div>` : ""}
      ${progressBar(p)}
      <div class="muted">${p.weeksDone}/${p.weeksTarget} εβδομάδες</div>
      ${ctx && p.status === "active" ? `
        <div class="row" style="margin-top:.5rem">
          ${modeChip(ctx.mode)} <span>d20 ${sign(ctx.modifier)} vs DC ${ctx.dc}</span>
        </div>
        <div class="row" style="margin-top:.5rem">
          <button class="act" data-act="roll-app" data-project="${p.id}" ${check.ok ? "" : "disabled"}>Ρίξε εδώ</button>
          <form class="row" data-form="roll-table" data-project="${p.id}">
            <input name="die" type="number" min="1" max="20" placeholder="d20 από το τραπέζι" style="width:11rem" ${check.ok ? "" : "disabled"} required>
            <button class="act ghost" type="submit" ${check.ok ? "" : "disabled"}>Καταγραφή</button>
          </form>
        </div>
        ${check.ok ? "" : `<div class="muted">${esc(check.reason)}</div>`}` : ""}
    </div>`;
}

function viewPlayer() {
  const character = charById(ui.myCharId);
  if (!character) return viewClaim();
  const dt = downtime();
  const used = dt.id ? weeksUsed(ui.data.log, character.id, dt.id) : 0;
  const myProjects = ui.data.projects.filter((p) => p.crafters.includes(character.id) && p.status !== "cancelled");
  const known = character.recipes.map(findRecipe).filter(Boolean);
  const skills = Object.entries(character.skills).map(([s, l]) => `<span class="chip">${esc(s)}${l === "expertise" ? " ★" : ""}</span>`).join("");
  return `
    <h2>${esc(character.name)}</h2>
    <div class="card">
      <div class="row">
        <span>Level ${character.level ?? 1} · PB ${sign(character.proficiencyBonus)} (${proficiencyLevel(character.proficiencyBonus)})</span>
        ${character.professions.map((p) => `<span class="chip">${PROFESSIONS[p].label}</span>`).join("") || `<span class="muted">Καμία profession</span>`}
      </div>
      <div class="chips" style="margin-top:.4rem">${skills || `<span class="muted">Κανένα skill proficiency</span>`}</div>
      <div class="row muted" style="margin-top:.4rem">${RESOURCE_TYPES.map((t) => `${t} ${character.resources[t]} GP`).join(" · ")}</div>
      ${dt.open ? `<div style="margin-top:.4rem">Downtime: <strong>${used}/${dt.weeks}</strong> εβδομάδες</div>` : ""}
      ${viewArchaeologyLine(character)}
    </div>

    <h2>Projects</h2>
    ${myProjects.length ? `<div class="grid">${myProjects.map((p) => viewProjectCard(p, character)).join("")}</div>` : `<p class="muted">Κανένα project ακόμα.</p>`}

    <h2>Νέο project</h2>
    ${known.length ? `
      <form class="card row" data-form="propose">
        <label>Recipe
          <select name="recipeId" required>${known.map((r) => `<option value="${r.id}">${esc(r.name)} (${r.rarity})</option>`).join("")}</select>
        </label>
        <label>Facility
          <select name="facility">
            <option value="">Χωρίς facility</option>
            ${[...new Set(Object.values(PROFESSIONS).flatMap((p) => p.facilities ?? []))].map((f) => `<option>${esc(f)}</option>`).join("")}
          </select>
        </label>
        <button class="act" type="submit">Πρόταση στον DM</button>
      </form>` : `<p class="muted">Δεν ξέρεις ακόμα κανένα recipe. Τα δίνει ο DM.</p>`}

    ${viewGatheringForms(character)}`;
}

// ─── Gathering views ─────────────────────────────────────────────────────────

const regionLevels = () => ui.data.realm?.regionLevels ?? {};

function regionOptions() {
  const levels = regionLevels();
  return REGIONS.map((r) => {
    const lv = levels[r];
    const set = lv !== undefined && lv !== null && lv !== "";
    return `<option value="${esc(r)}" ${set ? "" : "disabled"}>${esc(r)}${set ? ` (level ${esc(lv)}, DC ${gatheringTier(lv).dc})` : " (χωρίς level)"}</option>`;
  }).join("");
}

const dieInput = `<input name="die" type="number" min="1" max="20" placeholder="d20 τραπεζιού (κενό = εδώ)" style="width:13rem">`;

function viewArchaeologyLine(c) {
  const frags = Object.entries(c.fragments ?? {}).filter(([, n]) => n > 0);
  const magic = Object.entries(c.magicFragments ?? {}).filter(([, n]) => n > 0);
  const relics = c.relics ?? [];
  if (!frags.length && !magic.length && !relics.length) return "";
  return `<div class="muted" style="margin-top:.4rem">
    ${frags.length ? `Fragments: ${frags.map(([o, n]) => `${esc(o)} ${n}/${FRAGMENTS_PER_RELIC}`).join(", ")}. ` : ""}
    ${magic.length ? `Magic fragments: ${magic.map(([o, n]) => `${esc(o)} ${n}/6`).join(", ")}. ` : ""}
    ${relics.length ? `Relics: ${relics.map((r) => `${esc(r.origin)} ${r.value} GP`).join(", ")}.` : ""}
  </div>`;
}

function viewGatheringForms(c) {
  const travel = TRAVEL_PROFESSIONS.filter((p) => practices(c, p));
  const forms = [`
    <form class="card" data-form="gather">
      <h3>Ταξίδι: ${travel.map((p) => PROFESSIONS[p].label).join(", ")}</h3>
      <div class="row">
        <label>Profession <select name="profession">${travel.map((p) => `<option value="${p}">${PROFESSIONS[p].label}</option>`).join("")}</select></label>
        <label>Περιοχή <select name="region" required>${regionOptions()}</select></label>
        <label>Μέρες του stage <input name="days" type="number" min="1" max="30" value="1" style="width:4.5rem"></label>
        ${dieInput}
        <button class="act" type="submit">Survival check</button>
      </div>
      <div class="muted">Επιτυχία: ένα resource ανά μέρα. Κατά 5+: ένα από αυτά rare.</div>
    </form>`];
  if (practices(c, "skinning")) {
    forms.push(`
      <form class="card" data-form="skin">
        <h3>Skinning</h3>
        <div class="row">
          <label>Πλάσμα <select name="creatureType">${Object.entries(SKINNABLE).map(([k, v]) => `<option value="${k}" ${c.proficiencyBonus < v.minPb ? "disabled" : ""}>${k}${v.minPb > 2 ? ` (PB +${v.minPb})` : ""}</option>`).join("")}</select></label>
          <label>CR <input name="cr" type="number" min="0" max="30" step="0.125" value="1" style="width:5rem"></label>
          ${dieInput}
          <button class="act" type="submit">Skin</button>
        </div>
      </form>`);
  }
  if (practices(c, "archaeology")) {
    const ready = Object.entries(c.fragments ?? {}).filter(([o, n]) =>
      n >= FRAGMENTS_PER_RELIC && !(c.assemblyBlockedAt?.[o] !== undefined && n <= c.assemblyBlockedAt[o]));
    forms.push(`
      <form class="card" data-form="dig">
        <h3>Archaeology</h3>
        <div class="row">
          <label>Περιοχή <select name="region" required>${regionOptions()}</select></label>
          <label>Origin <input name="origin" list="origins" placeholder="π.χ. Slarecian" required></label>
          ${dieInput}
          <input name="d6" type="number" min="1" max="6" placeholder="d6 (κενό = εδώ)" style="width:9rem">
          <button class="act" type="submit">Dig (1 ώρα)</button>
        </div>
        <datalist id="origins"><option>Slarecian</option><option>Titanswar</option></datalist>
      </form>
      ${ready.map(([o]) => `
        <form class="card row" data-form="relic" data-origin="${esc(o)}">
          <span>${FRAGMENTS_PER_RELIC} fragments ${esc(o)}: συναρμολόγηση (History, DC 15)</span>
          ${dieInput}
          <button class="act" type="submit">Assemble</button>
        </form>`).join("")}`);
  }
  if ((c.professions ?? []).includes("enchanting")) {
    forms.push(`
      <form class="card" data-form="disenchant">
        <h3>Disenchanting</h3>
        <div class="row">
          <label>Item <input name="itemName" placeholder="όνομα item"></label>
          <label>Rarity <select name="rarity">${Object.entries(DISENCHANT).map(([k, v]) => `<option value="${k}" ${c.proficiencyBonus < v.minPb ? "disabled" : ""}>${k} → ${v.value} GP (PB +${v.minPb})</option>`).join("")}</select></label>
          <button class="act" type="submit">Disenchant (1 ώρα)</button>
        </div>
      </form>`);
  }
  return `<h2>Gathering</h2>${forms.join("")}`;
}

function gatherTable(entries, withActions) {
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Ποιος</th><th>Τι</th><th>Αποτέλεσμα</th><th>Πού</th><th>Κατάσταση</th>${withActions ? "<th></th>" : ""}</tr></thead>
      <tbody>${entries.map((e) => `
        <tr>
          <td>${esc(charById(e.charId)?.name ?? e.charId)}</td>
          <td>${esc(PROFESSIONS[e.profession]?.label ?? e.profession)}${e.region ? ` · ${esc(e.region)}` : ""}${e.kind === "skin" ? ` · ${esc(e.creatureType)} CR ${esc(e.cr)}` : ""}</td>
          <td class="${e.success ? "ok" : "warn"}">${esc(describeGatherEntry(e))}</td>
          <td>${e.source === "app" ? "εφαρμογή" : "τραπέζι"}</td>
          <td><span class="chip ${e.status}">${e.status}</span></td>
          ${withActions ? `<td>${e.status === "pending" ? `
            <button class="act" data-act="approve-gather" data-entry="${e.id}" aria-label="Έγκριση">✓</button>
            <button class="act ghost" data-act="reject-gather" data-entry="${e.id}" aria-label="Απόρριψη">✗</button>` : ""}</td>` : ""}
        </tr>`).join("")}</tbody>
    </table></div>`;
}

function rollTable(entries, withActions) {
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Ποιος</th><th>Item</th><th>Roll</th><th>Αποτέλεσμα</th><th>Πού</th><th>Κατάσταση</th>${withActions ? "<th></th>" : ""}</tr></thead>
      <tbody>${entries.map((e) => {
        const p = projectById(e.projectId);
        return `
        <tr>
          <td>${esc(charById(e.charId)?.name ?? e.charId)}</td>
          <td>${esc(findRecipe(e.recipeId)?.name ?? e.recipeId)}${withActions && p ? ` <span class="muted">${p.weeksDone}/${p.weeksTarget}</span>` : ""}</td>
          <td>${modeChip(e.mode)} [${e.dice.join(", ")}] ${sign(e.modifier)} = <strong>${e.total}</strong> vs ${e.dc}</td>
          <td class="${e.success ? "ok" : e.complication ? "bad" : "warn"}">${e.success ? `+${e.weeksGained} εβδ.` : e.complication ? "Complication" : "Αποτυχία"}</td>
          <td>${e.source === "app" ? "εφαρμογή" : "τραπέζι"}</td>
          <td><span class="chip ${e.status}">${e.status}</span></td>
          ${withActions ? `<td>${e.status === "pending" ? `
            <button class="act" data-act="approve" data-entry="${e.id}" aria-label="Έγκριση">✓</button>
            <button class="act ghost" data-act="reject" data-entry="${e.id}" aria-label="Απόρριψη">✗</button>` : ""}</td>` : ""}
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

function viewLog() {
  const crafting = ui.data.log.length ? rollTable(ui.data.log, IS_GM_VIEW) : `<p class="muted">Κανένα roll ακόμα.</p>`;
  const gathering = ui.data.gathering.length ? gatherTable(ui.data.gathering, IS_GM_VIEW) : `<p class="muted">Τίποτα ακόμα.</p>`;
  return `<h2>Crafting</h2>${crafting}<h2>Gathering</h2>${gathering}`;
}

function viewRecipes() {
  return `
    <h2>Recipes</h2>
    <p class="muted">Ο κατάλογος. Κάθε χαρακτήρας βλέπει στο δικό του tab μόνο όσα του έχει δώσει ο DM.</p>
    ${Object.entries(PROFESSIONS).filter(([, prof]) => prof.kind === "production").map(([key, prof]) => `
      <div class="card">
        <h3>${prof.label}</h3>
        <div class="muted">Tools: ${prof.tools.map(esc).join(" ή ")} · Facilities: ${prof.facilities.map(esc).join(", ") || "καμία ακόμα"} · Default skill: ${esc(prof.defaultSkill)}</div>
        <ul>${RECIPES.filter((r) => r.profession === key).map((r) => `<li>${recipeLine(r)}</li>`).join("")}</ul>
      </div>`).join("")}`;
}

function viewCharacterForm(c, id) {
  const v = c ?? { name: "", isNpc: false, level: 1, proficiencyBonus: 2, abilityMods: {}, skills: {}, professions: [], resources: {}, recipes: [] };
  const profSelect = (i) => `
    <select name="profession${i}">
      <option value="">—</option>
      ${["production", "gathering"].map((kind) => `
        <optgroup label="${kind === "production" ? "Production" : "Gathering"}">
          ${Object.entries(PROFESSIONS).filter(([, p]) => p.kind === kind).map(([k, p]) => `<option value="${k}" ${v.professions[i] === k ? "selected" : ""}>${p.label}</option>`).join("")}
        </optgroup>`).join("")}
    </select>`;
  return `
    <form class="card" data-form="character" data-id="${esc(id)}">
      <h3>${id === "new" ? "Νέος χαρακτήρας" : `Επεξεργασία: ${esc(v.name)}`}</h3>
      <div class="row">
        <label>Όνομα <input name="name" value="${esc(v.name)}" required></label>
        <label>Level <input name="level" type="number" min="1" max="20" value="${v.level ?? 1}" style="width:4.5rem"></label>
        <label>PB <input name="proficiencyBonus" type="number" min="2" max="6" value="${v.proficiencyBonus}" style="width:4.5rem"></label>
        <label class="row" style="flex-direction:row"><input type="checkbox" name="isNpc" ${v.isNpc ? "checked" : ""}> NPC crafter</label>
      </div>
      <div class="row" style="margin-top:.5rem">
        ${["str", "dex", "con", "int", "wis", "cha"].map((a) => `
          <label>${a.toUpperCase()} mod <input name="mod-${a}" type="number" min="-5" max="10" value="${v.abilityMods[a] ?? 0}" style="width:4.5rem"></label>`).join("")}
      </div>
      <div class="row" style="margin-top:.5rem">
        <label>Profession 1 ${profSelect(0)}</label>
        <label>Profession 2 ${profSelect(1)}</label>
      </div>
      <label style="margin-top:.5rem">Skills (π.χ. <code>Medicine, Arcana*</code> — το * σημαίνει expertise)
        <input name="skills" value="${esc(Object.entries(v.skills).map(([s, l]) => (l === "expertise" ? `${s}*` : s)).join(", "))}">
      </label>
      <div class="row" style="margin-top:.5rem">
        ${RESOURCE_TYPES.map((t) => `<label>${t} GP <input name="res-${t}" type="number" min="0" value="${v.resources[t] ?? 0}" style="width:5.5rem"></label>`).join("")}
      </div>
      <fieldset style="margin-top:.5rem;border:1px solid var(--line)">
        <legend>Recipes που ξέρει</legend>
        <div class="chips">
          ${RECIPES.map((r) => `<label class="chip" style="flex-direction:row;gap:.3rem"><input type="checkbox" name="recipe" value="${r.id}" ${v.recipes.includes(r.id) ? "checked" : ""}>${esc(r.name)}</label>`).join("")}
        </div>
      </fieldset>
      <div class="row" style="margin-top:.6rem">
        <button class="act" type="submit">Αποθήκευση</button>
        <button class="act ghost" type="button" data-act="cancel-edit">Άκυρο</button>
      </div>
    </form>`;
}

function viewGM() {
  const dt = downtime();
  const proposed = ui.data.projects.filter((p) => p.status === "proposed");
  const active = ui.data.projects.filter((p) => p.status === "active");
  const pending = ui.data.log.filter((e) => e.status === "pending");
  const npcs = ui.data.characters.filter((c) => c.isNpc);
  const pendingGather = ui.data.gathering.filter((e) => e.status === "pending");
  const levels = regionLevels();
  return `
    <h2>Downtime</h2>
    <div class="card row">
      ${dt.open
        ? `<span>Ανοιχτό: <strong>${dt.weeks}</strong> εβδομάδες</span><button class="act" data-act="close-downtime">Κλείσιμο</button>`
        : `<form class="row" data-form="open-downtime">
             <label>Εβδομάδες <input name="weeks" type="number" min="1" max="8" value="2" style="width:4.5rem"></label>
             <button class="act" type="submit">Άνοιγμα downtime</button>
           </form>`}
    </div>

    <h2>Εκκρεμή rolls (${pending.length})</h2>
    ${pending.length ? rollTable(pending, true) : `<p class="muted">Τίποτα εκκρεμές.</p>`}

    <h2>Εκκρεμή gathering (${pendingGather.length})</h2>
    ${ui.data.gatheringError ? `<p class="bad">Τα rules του gathering δεν έχουν δημοσιευτεί στο Firebase (${esc(ui.data.gatheringError)}).</p>` : ""}
    ${pendingGather.length ? gatherTable(pendingGather, true) : `<p class="muted">Τίποτα εκκρεμές.</p>`}

    <h2>Region levels</h2>
    <form class="card" data-form="regions">
      <div class="row">
        ${REGIONS.map((r) => `<label>${esc(r)} <input name="region:${esc(r)}" value="${esc(levels[r] ?? "")}" placeholder="1–20 ή endgame" style="width:8rem"></label>`).join("")}
      </div>
      <div class="row" style="margin-top:.5rem">
        <button class="act" type="submit">Αποθήκευση</button>
        <span class="muted">DC 10 / 12 / 15 / 17 / 20 για 1–4, 5–10, 11–16, 17–20, endgame.</span>
      </div>
    </form>

    <h2>Προτεινόμενα projects (${proposed.length})</h2>
    ${proposed.length ? proposed.map((p) => `
      <div class="card row">
        <span><strong>${esc(charById(p.charId)?.name ?? p.charId)}</strong>: ${recipeLine(findRecipe(p.recipeId))} · ${esc(p.facility ?? "χωρίς facility")}</span>
        <button class="act" data-act="activate" data-project="${p.id}">Έγκριση</button>
        <button class="act ghost" data-act="cancel-project" data-project="${p.id}">Απόρριψη</button>
      </div>`).join("") : `<p class="muted">Κανένα.</p>`}

    <h2>NPC crafters</h2>
    ${npcs.length && active.length ? `
      <form class="card row" data-form="npc-roll">
        <label>NPC <select name="charId">${npcs.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
        <label>Project <select name="projectId">${active.map((p) => `<option value="${p.id}">${esc(findRecipe(p.recipeId)?.name)} (${esc(charById(p.charId)?.name ?? "")})</option>`).join("")}</select></label>
        <button class="act" type="submit">Ρίξε για τον NPC</button>
      </form>` : `<p class="muted">Χρειάζεται τουλάχιστον ένας NPC και ένα ενεργό project.</p>`}

    <h2>Χαρακτήρες</h2>
    ${ui.editing ? viewCharacterForm(ui.editing === "new" ? null : charById(ui.editing), ui.editing) : `<button class="act" data-act="new-character">Νέος χαρακτήρας</button>`}
    <div class="grid">
      ${ui.data.characters.map((c) => `
        <div class="card">
          <h3>${esc(c.name)} ${c.isNpc ? `<span class="chip">NPC</span>` : ""}</h3>
          <div class="muted">${c.professions.map((p) => PROFESSIONS[p]?.label ?? p).join(", ") || "Καμία profession"} · ${c.recipes.length} recipes</div>
          <div class="row" style="margin-top:.4rem">
            <button class="act ghost" data-act="edit-character" data-char="${c.id}">Επεξεργασία</button>
            ${c.isNpc ? "" : `<button class="act ghost" data-act="new-code" data-char="${c.id}">Κωδικός παίκτη</button>`}
          </div>
          ${ui.lastCode?.charId === c.id ? `<div style="margin-top:.4rem">Κωδικός: <strong style="user-select:all">${esc(ui.lastCode.code)}</strong></div>` : ""}
        </div>`).join("")}
    </div>`;
}

function render() {
  if (ui.tab === "gm" && !IS_GM_VIEW) ui.tab = "player";
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("cur", b.dataset.tab === ui.tab));
  const views = { player: viewPlayer, log: viewLog, recipes: viewRecipes, gm: viewGM };
  $("#view").innerHTML = views[ui.tab]();
  const dt = downtime();
  $("#downtime-badge").textContent = dt.open ? `Downtime ανοιχτό · ${dt.weeks} εβδομάδες` : "Χωρίς ανοιχτό downtime";
  $("#uid-line").textContent = IS_GM_VIEW && ui.uid ? `uid: ${ui.uid}` : "";
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function parseCharacterForm(form) {
  const f = new FormData(form);
  const skills = {};
  for (const part of String(f.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const expert = part.endsWith("*");
    const name = expert ? part.slice(0, -1).trim() : part;
    const match = Object.keys(SKILL_ABILITY).find((s) => s.toLowerCase() === name.toLowerCase());
    if (!match) throw new Error(`Άγνωστο skill: ${name}`);
    skills[match] = expert ? "expertise" : "proficient";
  }
  return {
    name: String(f.get("name") ?? ""),
    isNpc: f.get("isNpc") === "on",
    proficiencyBonus: Number(f.get("proficiencyBonus")),
    level: Number(f.get("level") || 1),
    abilityMods: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((a) => [a, Number(f.get(`mod-${a}`) ?? 0)])),
    professions: [f.get("profession0"), f.get("profession1")].filter(Boolean),
    skills,
    resources: Object.fromEntries(RESOURCE_TYPES.map((t) => [t, Number(f.get(`res-${t}`) ?? 0)])),
    recipes: f.getAll("recipe")
  };
}

async function rollFor(charId, projectId, source, die = null) {
  const character = charById(charId);
  const project = projectById(projectId);
  const check = canRoll({ downtime: downtime(), log: ui.data.log, charId, project, character });
  if (!check.ok) throw new Error(check.reason);
  const recipe = findRecipe(project.recipeId);
  const ctx = rollContext(character, recipe, project.facility);
  const dice = source === "table" ? [die] : rollDice(ctx.mode);
  const entry = await store.submitRoll({ character, charId, project, downtimeId: downtime().id, source, dice });
  toast(`${character.name}: [${entry.dice.join(", ")}] ${sign(entry.modifier)} = ${entry.total} vs DC ${entry.dc}. ${entry.success ? `+${entry.weeksGained} ${entry.weeksGained > 1 ? "εβδομάδες" : "εβδομάδα"}.` : entry.complication ? "Complication." : "Αποτυχία."} Περιμένει έγκριση.`);
  return entry;
}

document.addEventListener("click", (ev) => {
  const tabBtn = ev.target.closest(".tabs button");
  if (tabBtn) { ui.tab = tabBtn.dataset.tab; safeSet(TAB_KEY, ui.tab); render(); return; }
  if (ev.target.id === "theme-toggle") {
    const night = document.body.classList.toggle("night");
    safeSet(THEME_KEY, night ? "night" : "day");
    ev.target.textContent = night ? "Μέρα" : "Νύχτα";
    return;
  }
  const btn = ev.target.closest("[data-act]");
  if (!btn) return;
  const { act, project, entry, char } = btn.dataset;
  guarded(async () => {
    if (act === "roll-app") await rollFor(ui.myCharId, project, "app");
    if (act === "approve") await store.approveRoll(entry);
    if (act === "reject") await store.rejectRoll(entry);
    if (act === "approve-gather") await store.approveGather(entry);
    if (act === "reject-gather") await store.rejectGather(entry);
    if (act === "activate") await store.setProjectStatus(project, "active");
    if (act === "cancel-project") await store.setProjectStatus(project, "cancelled");
    if (act === "close-downtime") await store.closeDowntime();
    if (act === "new-character") { ui.editing = "new"; render(); }
    if (act === "edit-character") { ui.editing = char; render(); }
    if (act === "cancel-edit") { ui.editing = null; render(); }
    if (act === "new-code") {
      const code = generateClaimCode(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
      await store.createClaim(code, char);
      // The clipboard promise can hang without focus/permission, so never await it before showing the code.
      navigator.clipboard?.writeText(code).catch(() => {});
      ui.lastCode = { charId: char, code };
      render();
    }
  });
});

document.addEventListener("submit", (ev) => {
  const form = ev.target.closest("[data-form]");
  if (!form) return;
  ev.preventDefault();
  const f = new FormData(form);
  guarded(async () => {
    switch (form.dataset.form) {
      case "claim": {
        const code = String(f.get("code") ?? "").trim().toUpperCase();
        ui.myCharId = await store.claimCharacter(code);
        safeSet(CODE_KEY, code);
        render();
        break;
      }
      case "propose":
        await store.proposeProject({ charId: ui.myCharId, recipeId: f.get("recipeId"), facility: f.get("facility") || null });
        toast("Το project στάλθηκε στον DM.");
        break;
      case "roll-table":
        await rollFor(ui.myCharId, form.dataset.project, "table", Number(f.get("die")));
        break;
      case "open-downtime":
        await store.openDowntime(Number(f.get("weeks")));
        break;
      case "npc-roll": {
        const project = projectById(f.get("projectId"));
        if (!project.crafters.includes(f.get("charId"))) {
          await store.addCrafter(project.id, f.get("charId"));
          project.crafters = [...project.crafters, f.get("charId")];
        }
        await rollFor(f.get("charId"), project.id, "app");
        break;
      }
      case "gather":
      case "skin":
      case "dig":
      case "relic":
      case "disenchant":
        await submitGatherForm(form.dataset.form, f, form);
        break;
      case "regions": {
        const levels = {};
        for (const r of REGIONS) {
          const raw = String(f.get(`region:${r}`) ?? "").trim().toLowerCase();
          if (!raw) continue;
          if (raw === "endgame") { levels[r] = "endgame"; continue; }
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`${r}: level 1–20 ή endgame`);
          levels[r] = n;
        }
        await store.saveRegionLevels(levels);
        toast("Τα region levels αποθηκεύτηκαν.");
        break;
      }
      case "character": {
        const data = parseCharacterForm(form);
        await store.saveCharacter(form.dataset.id === "new" ? null : form.dataset.id, data);
        ui.editing = null;
        toast(`Αποθηκεύτηκε: ${data.name}`);
        break;
      }
    }
  });
});

async function submitGatherForm(kind, f, form) {
  const character = charById(ui.myCharId);
  if (!character) throw new Error("Δεν έχεις συνδέσει χαρακτήρα.");
  const typed = String(f.get("die") ?? "").trim();
  const source = typed ? "table" : "app";
  const die = kind === "disenchant" ? null : (typed ? Number(typed) : rollD20());
  const params = {
    gather: () => ({ profession: f.get("profession"), region: f.get("region"), days: Number(f.get("days") || 1) }),
    skin: () => ({ creatureType: f.get("creatureType"), cr: Number(f.get("cr")) }),
    dig: () => ({ region: f.get("region"), origin: f.get("origin"), fragmentRoll: Number(f.get("d6")) || (Math.floor(Math.random() * 6) + 1) }),
    relic: () => ({ origin: form.dataset.origin }),
    disenchant: () => ({ rarity: f.get("rarity"), itemName: f.get("itemName") })
  }[kind]();
  const entry = await store.submitGather({
    character, charId: ui.myCharId, kind, params, regionLevels: regionLevels(), die, source
  });
  toast(`${describeGatherEntry(entry)} Περιμένει έγκριση.`);
}

// Live snapshots must not wipe a form the user is typing in: defer the render
// until focus leaves the form.
function isTyping() {
  const el = document.activeElement;
  return Boolean(el && el.closest?.("#view form") && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
}

function renderSoon() {
  if (isTyping()) { ui.pendingRender = true; return; }
  render();
}

document.addEventListener("focusout", () => {
  setTimeout(() => { if (ui.pendingRender && !isTyping()) { ui.pendingRender = false; render(); } }, 0);
});

// ─── Boot ────────────────────────────────────────────────────────────────────

async function boot() {
  if (safeGet(THEME_KEY) === "night") { document.body.classList.add("night"); $("#theme-toggle").textContent = "Μέρα"; }
  if (IS_GM_VIEW) document.querySelector('[data-tab="gm"]').hidden = false;
  ui.uid = await store.currentUid();
  // Shown before any Firestore read, so the DM can copy it even when the rules still deny.
  if (IS_GM_VIEW) $("#uid-line").textContent = `uid: ${ui.uid}`;
  const membership = await store.loadMyMembership();
  ui.myCharId = membership?.charId ?? null;
  // Fallback: the session was lost (cleared storage, new device) but the code was remembered.
  const savedCode = safeGet(CODE_KEY);
  if (!ui.myCharId && savedCode) {
    try { ui.myCharId = await store.claimCharacter(savedCode); } catch { /* code revoked */ }
  }
  await store.subscribeAll((data) => {
    ui.data = { ...data, realm: data.realm ?? ui.data.realm };
    renderSoon();
  });
  render();
}

boot().catch((err) => {
  console.error(err);
  $("#view").innerHTML = `<p class="bad">Δεν φόρτωσε: ${esc(err?.message ?? err)}</p>`;
});
