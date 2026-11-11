// Scarred Lands Professions — professions and recipes catalogue.
// The repo is public: only SRD item names and our own mechanics, no text from the book.
//
// DRAFT: default skills per profession and the starter recipe list are proposals
// until the DM confirms them (state/crafting-plan.md §6, question 5).

import { costFor, dcFor, weeksFor } from "./rules.js";

// Profession → which Drift facilities count as the "right facility",
// and the default skill a recipe uses unless it overrides it.
export const PROFESSIONS = {
  alchemy:       { label: "Alchemy",       tool: "Alchemist's Supplies",   facilities: ["Alchemist", "Apothecary"],   defaultSkill: "Medicine" },
  blacksmithing: { label: "Blacksmithing", tool: "Smith's Tools",          facilities: ["Blacksmith", "Dragonforge"], defaultSkill: "Athletics" },
  inscription:   { label: "Inscription",   tool: "Calligrapher's Supplies", facilities: ["Library", "Arcana Tower"],   defaultSkill: "Arcana" },
  tailoring:     { label: "Tailoring",     tool: "Weaver's Tools",         facilities: ["Weaver's Hall"],              defaultSkill: "Sleight of Hand" },
  engineering:   { label: "Engineering",   tool: "Tinker's Tools",         facilities: ["Techcrafter", "Engineers' Guild"], defaultSkill: "Investigation" }
};

// id, name, profession, rarity, consumable, optional skill override.
const RAW_RECIPES = [
  { id: "potion-of-healing",         name: "Potion of Healing",         profession: "alchemy",       rarity: "common",    consumable: true },
  { id: "potion-of-greater-healing", name: "Potion of Greater Healing", profession: "alchemy",       rarity: "uncommon",  consumable: true },
  { id: "potion-of-fire-breath",     name: "Potion of Fire Breath",     profession: "alchemy",       rarity: "uncommon",  consumable: true, skill: "Arcana" },
  { id: "weapon-plus-1",             name: "+1 Weapon",                 profession: "blacksmithing", rarity: "uncommon" },
  { id: "armor-plus-1",              name: "+1 Armor",                  profession: "blacksmithing", rarity: "rare" },
  { id: "shield-plus-1",             name: "+1 Shield",                 profession: "blacksmithing", rarity: "uncommon" },
  { id: "spell-scroll-1",            name: "Spell Scroll (1st level)",  profession: "inscription",   rarity: "common",    consumable: true },
  { id: "spell-scroll-2",            name: "Spell Scroll (2nd level)",  profession: "inscription",   rarity: "uncommon",  consumable: true },
  { id: "boots-of-elvenkind",        name: "Boots of Elvenkind",        profession: "tailoring",     rarity: "uncommon",  skill: "Stealth" },
  { id: "cloak-of-elvenkind",        name: "Cloak of Elvenkind",        profession: "tailoring",     rarity: "uncommon",  skill: "Stealth" },
  { id: "bag-of-holding",            name: "Bag of Holding",            profession: "tailoring",     rarity: "uncommon",  skill: "Arcana" },
  { id: "immovable-rod",             name: "Immovable Rod",             profession: "engineering",   rarity: "uncommon" },
  { id: "decanter-of-endless-water", name: "Decanter of Endless Water", profession: "engineering",   rarity: "uncommon",  skill: "Arcana" }
];

/** Fills in skill, DC, weeks and cost from the profession and the rules. */
export function buildRecipe(raw) {
  const profession = PROFESSIONS[raw.profession];
  if (!profession) throw new Error(`Unknown profession: ${raw.profession}`);
  const consumable = Boolean(raw.consumable);
  return {
    ...raw,
    consumable,
    skill: raw.skill ?? profession.defaultSkill,
    dc: dcFor(raw.rarity),
    weeks: weeksFor(raw.rarity, { consumable }),
    cost: costFor(raw.rarity, { consumable })
  };
}

export const RECIPES = RAW_RECIPES.map(buildRecipe);

export function findRecipe(id) {
  return RECIPES.find((r) => r.id === id) ?? null;
}

/** True when the facility counts as the right one for the recipe's profession. */
export function isRightFacility(recipe, facility) {
  if (!facility) return false;
  return PROFESSIONS[recipe.profession].facilities.includes(facility);
}
