// Scarred Lands Professions — gathering entries (herbalism, mining, fishing,
// skinning, archaeology, relic assembly, disenchanting). Pure functions.
// Numbers come from rules.js; this file turns a character + a roll into a
// pending document, and an approved document into changes on the character.
//
//   crafting/{realm}/gathering/{id}   one result, pending until the DM approves

import {
  checkModifier, disenchantValue, FRAGMENTS_PER_RELIC, keptDie,
  resolveArchaeology, resolveGathering, resolveRelicAssembly, resolveSkinning
} from "./rules.js";
import { PROFESSIONS } from "./recipes.js";
import { ROLL_SOURCES, SKILL_ABILITY } from "./model.js";

export const GATHER_KINDS = ["gather", "skin", "dig", "relic", "disenchant"];
export const TRAVEL_PROFESSIONS = ["herbalism", "mining", "fishing"];

/** Scarred Lands regions; the DM sets their level in the realm doc (`regionLevels`). */
export const REGIONS = [
  "The Drift", "Frozen Edge", "Fur Wehn", "New Grandia",
  "Thundermount", "Wyldermoore", "Dataspheres Reach", "The Otherside"
];

/** Does the character practice this gathering profession? Fishing needs no proficiency (book). */
export function practices(character, profession) {
  if (profession === "fishing") return true;
  if (!(character.professions ?? []).includes(profession)) return false;
  const req = PROFESSIONS[profession]?.requiresSkill;
  return !req || Boolean(character.skills?.[req]);
}

/** Modifier for a gathering check: Wisdom (Survival), or Intelligence (History) for archaeology. */
export function gatheringModifier(character, profession) {
  const skill = PROFESSIONS[profession].skill;
  const level = character.skills?.[skill];
  return checkModifier({
    abilityMod: character.abilityMods?.[SKILL_ABILITY[skill]] ?? 0,
    proficiencyBonus: character.proficiencyBonus ?? 2,
    skillProficient: level === "proficient" || level === "expertise",
    expertise: level === "expertise"
  });
}

export function regionLevelOf(regionLevels, region) {
  const level = regionLevels?.[region];
  if (level === undefined || level === null || level === "") {
    throw new Error(`Ο DM δεν έχει ορίσει level για ${region || "την περιοχή"}.`);
  }
  return level;
}

/**
 * Builds a gathering entry (pending until the DM approves).
 *  gather:     { profession: herbalism|mining|fishing, region, days }
 *  skin:       { cr, creatureType: beast|monstrosity|fiend|dragon }
 *  dig:        { region, origin, fragmentRoll (1d6) }      — archaeology
 *  relic:      { origin }                                  — six fragments, DC 15
 *  disenchant: { rarity, itemName }                        — enchanting, no roll
 */
export function createGatherEntry({ character, charId, kind, params = {}, regionLevels = {}, die = null, source = "app", uid }) {
  if (!GATHER_KINDS.includes(kind)) throw new Error(`Bad gathering kind: ${kind}`);
  if (!ROLL_SOURCES.includes(source)) throw new Error(`Bad roll source: ${source}`);
  const pb = character.proficiencyBonus ?? 2;
  const base = { charId, kind, source, status: "pending", createdBy: uid };
  const kept = () => keptDie("normal", [die]);

  if (kind === "gather") {
    const { profession, region } = params;
    const days = Number(params.days ?? 1);
    if (!TRAVEL_PROFESSIONS.includes(profession)) throw new Error(`Not a travel gathering profession: ${profession}`);
    if (!practices(character, profession)) throw new Error(`${character.name} δεν ασκεί ${PROFESSIONS[profession].label}.`);
    const regionLevel = regionLevelOf(regionLevels, region);
    const modifier = gatheringModifier(character, profession);
    const r = resolveGathering({ die: kept(), modifier, regionLevel, days });
    return { ...base, profession, region, regionLevel, days, die, modifier, ...r, resource: PROFESSIONS[profession].resource };
  }

  if (kind === "skin") {
    if (!practices(character, "skinning")) throw new Error(`${character.name} δεν ασκεί Skinning.`);
    const modifier = gatheringModifier(character, "skinning");
    const cr = Number(params.cr);
    const r = resolveSkinning({ die: kept(), modifier, cr, creatureType: params.creatureType, proficiencyBonus: pb });
    return { ...base, profession: "skinning", cr, creatureType: params.creatureType, die, modifier, ...r, resource: "leather" };
  }

  if (kind === "dig") {
    if (!practices(character, "archaeology")) throw new Error(`${character.name} δεν ασκεί Archaeology (θέλει και proficiency στο History).`);
    const origin = String(params.origin ?? "").trim();
    if (!origin) throw new Error("Χρειάζεται origin για το dig site.");
    const regionLevel = regionLevelOf(regionLevels, params.region);
    const modifier = gatheringModifier(character, "archaeology");
    const r = resolveArchaeology({ die: kept(), modifier, regionLevel, fragmentRoll: params.fragmentRoll });
    return { ...base, profession: "archaeology", region: params.region, regionLevel, origin, die, modifier, ...r };
  }

  if (kind === "relic") {
    if (!practices(character, "archaeology")) throw new Error(`${character.name} δεν ασκεί Archaeology.`);
    const origin = String(params.origin ?? "").trim();
    const have = character.fragments?.[origin] ?? 0;
    if (have < FRAGMENTS_PER_RELIC) throw new Error(`Χρειάζονται ${FRAGMENTS_PER_RELIC} fragments ${origin} (υπάρχουν ${have}).`);
    const blockedAt = character.assemblyBlockedAt?.[origin];
    if (blockedAt !== undefined && have <= blockedAt) throw new Error("Μετά από αποτυχία θέλει τουλάχιστον ένα fragment ακόμα.");
    const modifier = gatheringModifier(character, "archaeology");
    const r = resolveRelicAssembly({ die: kept(), modifier, characterLevel: character.level ?? 1 });
    return { ...base, profession: "archaeology", origin, fragmentsAtRoll: have, die, modifier, ...r };
  }

  // disenchant
  if (!(character.professions ?? []).includes("enchanting")) throw new Error(`${character.name} δεν ασκεί Enchanting.`);
  const value = disenchantValue(params.rarity, pb);
  return {
    ...base, profession: "enchanting", rarity: params.rarity,
    itemName: String(params.itemName ?? "").trim(), value, success: true, resource: "residue"
  };
}

/** What an approved entry changes on the character. Pure; returns only the changed fields. */
export function applyGatherEntry(character, entry) {
  const resources = { ...(character.resources ?? {}) };
  const fragments = { ...(character.fragments ?? {}) };
  const magicFragments = { ...(character.magicFragments ?? {}) };
  const assemblyBlockedAt = { ...(character.assemblyBlockedAt ?? {}) };
  const relics = [...(character.relics ?? [])];

  if (["gather", "skin", "disenchant"].includes(entry.kind) && entry.value > 0) {
    resources[entry.resource] = (resources[entry.resource] ?? 0) + entry.value;
  }
  if (entry.kind === "dig") {
    if (entry.fragments) fragments[entry.origin] = (fragments[entry.origin] ?? 0) + entry.fragments;
    if (entry.magicFragments) magicFragments[entry.origin] = (magicFragments[entry.origin] ?? 0) + entry.magicFragments;
    if (entry.relicValue) relics.push({ origin: entry.origin, value: entry.relicValue });
  }
  if (entry.kind === "relic") {
    if (entry.success) {
      fragments[entry.origin] = Math.max(0, (fragments[entry.origin] ?? 0) - FRAGMENTS_PER_RELIC);
      relics.push({ origin: entry.origin, value: entry.value });
      delete assemblyBlockedAt[entry.origin];
    } else {
      assemblyBlockedAt[entry.origin] = fragments[entry.origin] ?? 0;
    }
  }
  return { resources, fragments, magicFragments, assemblyBlockedAt, relics };
}

/** One line for the log and toasts. */
export function describeGatherEntry(entry) {
  const roll = entry.die != null
    ? `${entry.die} ${entry.modifier >= 0 ? "+" : ""}${entry.modifier} = ${entry.total} vs DC ${entry.dc}. `
    : "";
  switch (entry.kind) {
    case "gather":
      return roll + (entry.success ? `${entry.common} common${entry.rare ? " + 1 rare" : ""} ${entry.resource}, ${entry.value} GP.` : "Τίποτα.");
    case "skin":
      return roll + (entry.success ? `${entry.hide ? "Hide" : "Leather"}, ${entry.value} GP.` : "Τίποτα.");
    case "dig":
      if (entry.magicFragments) return roll + `Natural 20: magic fragment (${entry.origin}).`;
      if (entry.relicValue) return roll + `Ολόκληρο relic (${entry.origin}), ${entry.relicValue} GP.`;
      return roll + (entry.success ? `${entry.fragments} fragments (${entry.origin}).` : "Τίποτα.");
    case "relic":
      return roll + (entry.success ? `Relic (${entry.origin}), ${entry.value} GP.` : "Αποτυχία· θέλει ένα fragment ακόμα πριν την επόμενη προσπάθεια.");
    case "disenchant":
      return `Disenchant ${entry.itemName || entry.rarity}: residue ${entry.value} GP.`;
    default:
      return roll;
  }
}
