// Scarred Lands Professions — data model.
// Pure functions that build and validate the Firestore documents. No I/O here;
// store.js does the reads and writes. Plan: artemis vault, state/crafting-plan.md §5.
//
// Firestore layout (realm = "main" unless the GM runs several):
//   crafting/{realm}                    { downtime: { id, open, weeks }, regionLevels }
//   crafting/{realm}/characters/{id}    character sheet for crafting (PC or NPC)
//   crafting/{realm}/claims/{code}      { charId }  — GM hands the code to a player
//   crafting/{realm}/members/{uid}      { charId, code } — anonymous user → character
//   crafting/{realm}/projects/{id}      one item being crafted
//   crafting/{realm}/log/{id}           one roll = one downtime week of one crafter

import {
  applyWeek, canCraftRarity, checkModifier, keptDie, MAX_PROFESSIONS, resolveWeek, rollMode
} from "./rules.js";
import { findRecipe, isRightFacility, PROFESSIONS } from "./recipes.js";

export const SKILL_ABILITY = {
  "Acrobatics": "dex", "Animal Handling": "wis", "Arcana": "int", "Athletics": "str",
  "Deception": "cha", "History": "int", "Insight": "wis", "Intimidation": "cha",
  "Investigation": "int", "Medicine": "wis", "Nature": "int", "Perception": "wis",
  "Performance": "cha", "Persuasion": "cha", "Religion": "int", "Sleight of Hand": "dex",
  "Stealth": "dex", "Survival": "wis"
};

export const PROJECT_STATUSES = ["proposed", "active", "complete", "cancelled"];
export const ENTRY_STATUSES = ["pending", "approved", "rejected"];
export const ROLL_SOURCES = ["app", "table"];

// Abstract gathering resources, valued in GP (plan §4).
export const RESOURCE_TYPES = ["herb", "ore", "leather", "cloth", "fish", "residue"];

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/** Validates and fills defaults on a character document. Throws on bad data. */
export function normalizeCharacter(raw) {
  if (!raw?.name || typeof raw.name !== "string") throw new Error("Character needs a name");
  const professions = [...new Set(raw.professions ?? [])];
  if (professions.length > MAX_PROFESSIONS) {
    throw new Error(`At most ${MAX_PROFESSIONS} professions (${raw.name} has ${professions.length})`);
  }
  for (const p of professions) {
    if (!PROFESSIONS[p]) throw new Error(`Unknown profession: ${p}`);
  }
  const abilityMods = {};
  for (const a of ABILITIES) {
    const v = raw.abilityMods?.[a] ?? 0;
    if (!Number.isInteger(v)) throw new Error(`Ability modifier ${a} must be an integer`);
    abilityMods[a] = v;
  }
  const skills = {};
  for (const [skill, level] of Object.entries(raw.skills ?? {})) {
    if (!SKILL_ABILITY[skill]) throw new Error(`Unknown skill: ${skill}`);
    if (level !== "proficient" && level !== "expertise") throw new Error(`Bad skill level for ${skill}: ${level}`);
    skills[skill] = level;
  }
  const resources = {};
  for (const t of RESOURCE_TYPES) resources[t] = Math.max(0, Number(raw.resources?.[t] ?? 0));
  const pb = raw.proficiencyBonus ?? 2;
  if (!Number.isInteger(pb) || pb < 2 || pb > 6) throw new Error("Proficiency bonus must be 2–6");
  const level = raw.level ?? 1;
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error("Level must be 1–20");
  const counts = (obj) => Object.fromEntries(
    Object.entries(obj ?? {})
      .map(([k, v]) => [String(k).trim(), Math.max(0, Math.floor(Number(v) || 0))])
      .filter(([k]) => k)
  );
  return {
    name: raw.name.trim(),
    isNpc: Boolean(raw.isNpc),
    proficiencyBonus: pb,
    level,
    // Archaeology: fragments per origin, magic fragments per origin, relics found.
    fragments: counts(raw.fragments),
    magicFragments: counts(raw.magicFragments),
    assemblyBlockedAt: counts(raw.assemblyBlockedAt),
    relics: (raw.relics ?? [])
      .filter((r) => r && r.origin && Number(r.value) > 0)
      .map((r) => ({ origin: String(r.origin), value: Number(r.value) })),
    abilityMods,
    skills,
    professions,
    resources,
    recipes: [...new Set(raw.recipes ?? [])].filter((id) => findRecipe(id))
  };
}

/** Everything needed to roll one week on a recipe, for one character, at one facility. */
export function rollContext(character, recipe, facility) {
  const level = character.skills?.[recipe.skill];
  const skillProficient = level === "proficient" || level === "expertise";
  const inProfession = (character.professions ?? []).includes(recipe.profession);
  const rightFacility = isRightFacility(recipe, facility);
  const ability = SKILL_ABILITY[recipe.skill];
  return {
    pbOk: canCraftRarity(character.proficiencyBonus ?? 2, recipe.rarity),
    inProfession,
    rightFacility,
    skillProficient,
    mode: rollMode({ inProfession, rightFacility, skillProficient }),
    modifier: checkModifier({
      abilityMod: character.abilityMods?.[ability] ?? 0,
      proficiencyBonus: character.proficiencyBonus ?? 2,
      skillProficient,
      expertise: level === "expertise"
    }),
    dc: recipe.dc
  };
}

/** A new project, proposed by a player or created by the GM. */
export function createProject({ charId, recipeId, facility = null, crafters = [] }) {
  const recipe = findRecipe(recipeId);
  if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);
  if (!charId) throw new Error("Project needs an owner");
  return {
    charId,
    recipeId,
    facility,
    crafters: [...new Set([charId, ...crafters])],
    weeksTarget: recipe.weeks,
    weeksDone: 0,
    complications: 0,
    status: "proposed"
  };
}

/** Counts the weeks a character has used in this downtime (rejected rolls give the week back). */
export function weeksUsed(log, charId, downtimeId) {
  return log.filter((e) => e.charId === charId && e.downtimeId === downtimeId && e.status !== "rejected").length;
}

/** Can this character roll another week on this project right now? Returns { ok, reason }. */
export function canRoll({ downtime, log, charId, project, character = null }) {
  if (!downtime?.open) return { ok: false, reason: "Δεν υπάρχει ανοιχτό downtime." };
  const recipe = findRecipe(project.recipeId);
  if (character && recipe && !canCraftRarity(character.proficiencyBonus ?? 2, recipe.rarity)) {
    return { ok: false, reason: `Ένα ${recipe.rarity} item θέλει proficiency bonus +${recipe.minPb}.` };
  }
  if (project.status !== "active") return { ok: false, reason: "Το project δεν είναι ενεργό." };
  if (!project.crafters.includes(charId)) return { ok: false, reason: "Ο χαρακτήρας δεν δουλεύει σε αυτό το project." };
  if (weeksUsed(log, charId, downtime.id) >= downtime.weeks) {
    return { ok: false, reason: "Οι εβδομάδες αυτού του downtime τελείωσαν." };
  }
  return { ok: true, reason: "" };
}

/**
 * Builds a log entry for one week.
 *  source "app":   dice are rolled in the app (one die, or two for adv/dis).
 *  source "table": the player types the kept d20 from the physical roll.
 */
export function createRollEntry({ character, charId, project, downtimeId, source, dice, uid }) {
  if (!ROLL_SOURCES.includes(source)) throw new Error(`Bad roll source: ${source}`);
  const recipe = findRecipe(project.recipeId);
  const ctx = rollContext(character, recipe, project.facility);
  const die = source === "table" ? keptDie("normal", dice) : keptDie(ctx.mode, dice);
  const result = resolveWeek({ die, modifier: ctx.modifier, dc: ctx.dc });
  return {
    charId,
    projectId: project.id,
    recipeId: project.recipeId,
    downtimeId,
    source,
    mode: ctx.mode,
    dice: source === "table" ? [die] : dice.slice(0, ctx.mode === "normal" ? 1 : 2),
    die,
    modifier: ctx.modifier,
    dc: ctx.dc,
    ...result,
    status: "pending",
    createdBy: uid
  };
}

/** GM approves a roll: the entry is marked approved and the project advances. */
export function approveEntry(project, entry) {
  if (entry.status !== "pending") throw new Error("Only pending rolls can be approved");
  const next = applyWeek(project, [entry]);
  return {
    project: { ...next, status: next.complete ? "complete" : project.status },
    entry: { ...entry, status: "approved" }
  };
}

export function rejectEntry(entry) {
  if (entry.status !== "pending") throw new Error("Only pending rolls can be rejected");
  return { ...entry, status: "rejected" };
}

/** Readable, hard-to-guess claim code, e.g. "DRIFT-7KQ2-M9XA". No 0/O/1/I. */
export function generateClaimCode(rng = Math.random) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const block = () => Array.from({ length: 4 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
  return `DRIFT-${block()}-${block()}`;
}
