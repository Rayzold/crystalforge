// Scarred Lands Professions — page controller (player + DM).
// No framework: renders HTML strings into #view and delegates clicks/submits.

import { rollDice } from "./rules.js";
import { PROFESSIONS, RECIPES, findRecipe } from "./recipes.js";
import { canRoll, generateClaimCode, RESOURCE_TYPES, rollContext, SKILL_ABILITY, weeksUsed } from "./model.js";
import * as store from "./store.js";

const IS_GM_VIEW = new URLSearchParams(location.search).has("gm");
const CODE_KEY = "professions-claim-code";
const TAB_KEY = "professions-tab";
const THEME_KEY = "professions-theme";

const ui = {
  tab: safeGet(TAB_KEY) || "player",
  data: { realm: null, characters: [], projects: [], log: [] },
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
  const check = character ? canRoll({ downtime: downtime(), log: ui.data.log, charId: character.id, project: p }) : { ok: false };
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
        <span>PB ${sign(character.proficiencyBonus)}</span>
        ${character.professions.map((p) => `<span class="chip">${PROFESSIONS[p].label}</span>`).join("") || `<span class="muted">Καμία profession</span>`}
      </div>
      <div class="chips" style="margin-top:.4rem">${skills || `<span class="muted">Κανένα skill proficiency</span>`}</div>
      <div class="row muted" style="margin-top:.4rem">${RESOURCE_TYPES.map((t) => `${t} ${character.resources[t]} GP`).join(" · ")}</div>
      ${dt.open ? `<div style="margin-top:.4rem">Downtime: <strong>${used}/${dt.weeks}</strong> εβδομάδες</div>` : ""}
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
            ${[...new Set(Object.values(PROFESSIONS).flatMap((p) => p.facilities))].map((f) => `<option>${esc(f)}</option>`).join("")}
          </select>
        </label>
        <button class="act" type="submit">Πρόταση στον DM</button>
      </form>` : `<p class="muted">Δεν ξέρεις ακόμα κανένα recipe. Τα δίνει ο DM.</p>`}`;
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
  if (!ui.data.log.length) return `<h2>Rolls</h2><p class="muted">Κανένα roll ακόμα.</p>`;
  return `<h2>Rolls</h2>${rollTable(ui.data.log, IS_GM_VIEW)}`;
}

function viewRecipes() {
  return `
    <h2>Recipes</h2>
    <p class="muted">Ο κατάλογος. Κάθε χαρακτήρας βλέπει στο δικό του tab μόνο όσα του έχει δώσει ο DM.</p>
    ${Object.entries(PROFESSIONS).map(([key, prof]) => `
      <div class="card">
        <h3>${prof.label}</h3>
        <div class="muted">Tool: ${esc(prof.tool)} · Facilities: ${prof.facilities.map(esc).join(", ")} · Default skill: ${esc(prof.defaultSkill)}</div>
        <ul>${RECIPES.filter((r) => r.profession === key).map((r) => `<li>${recipeLine(r)}</li>`).join("")}</ul>
      </div>`).join("")}`;
}

function viewCharacterForm(c, id) {
  const v = c ?? { name: "", isNpc: false, proficiencyBonus: 2, abilityMods: {}, skills: {}, professions: [], resources: {}, recipes: [] };
  const profSelect = (i) => `
    <select name="profession${i}">
      <option value="">—</option>
      ${Object.entries(PROFESSIONS).map(([k, p]) => `<option value="${k}" ${v.professions[i] === k ? "selected" : ""}>${p.label}</option>`).join("")}
    </select>`;
  return `
    <form class="card" data-form="character" data-id="${esc(id)}">
      <h3>${id === "new" ? "Νέος χαρακτήρας" : `Επεξεργασία: ${esc(v.name)}`}</h3>
      <div class="row">
        <label>Όνομα <input name="name" value="${esc(v.name)}" required></label>
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
  const check = canRoll({ downtime: downtime(), log: ui.data.log, charId, project });
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
    if (act === "activate") await store.setProjectStatus(project, "active");
    if (act === "cancel-project") await store.setProjectStatus(project, "cancelled");
    if (act === "close-downtime") await store.closeDowntime();
    if (act === "new-character") { ui.editing = "new"; render(); }
    if (act === "edit-character") { ui.editing = char; render(); }
    if (act === "cancel-edit") { ui.editing = null; render(); }
    if (act === "new-code") {
      const code = generateClaimCode(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
      await store.createClaim(code, char);
      try { await navigator.clipboard.writeText(code); } catch { /* no clipboard permission */ }
      toast(`Κωδικός για ${charById(char)?.name}: ${code} (αντιγράφηκε)`);
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

// ─── Boot ────────────────────────────────────────────────────────────────────

async function boot() {
  if (safeGet(THEME_KEY) === "night") { document.body.classList.add("night"); $("#theme-toggle").textContent = "Μέρα"; }
  if (IS_GM_VIEW) document.querySelector('[data-tab="gm"]').hidden = false;
  ui.uid = await store.currentUid();
  const membership = await store.loadMyMembership();
  ui.myCharId = membership?.charId ?? null;
  // Fallback: the session was lost (cleared storage, new device) but the code was remembered.
  const savedCode = safeGet(CODE_KEY);
  if (!ui.myCharId && savedCode) {
    try { ui.myCharId = await store.claimCharacter(savedCode); } catch { /* code revoked */ }
  }
  await store.subscribeAll((data) => {
    ui.data = { ...data, realm: data.realm ?? ui.data.realm };
    render();
  });
  render();
}

boot().catch((err) => {
  console.error(err);
  $("#view").innerHTML = `<p class="bad">Δεν φόρτωσε: ${esc(err?.message ?? err)}</p>`;
});
