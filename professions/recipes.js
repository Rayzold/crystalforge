// Scarred Lands Professions — professions and recipes catalogue.
// The repo is public: only SRD item names and our own mechanics, no text from the book.
//
// Tools are from the book. Facilities and default skills are house rules, confirmed
// by the DM on 2026-11-12. The starter recipe list is still a draft.

import { costFor, dcFor, MIN_PB_BY_RARITY, weeksFor } from "./rules.js";

// Every profession of the book. `tools`: any one of them is the prerequisite (book).
// Production: `facilities` are the Drift buildings that count as the right facility
// (house rule), `defaultSkill` is the skill a recipe uses unless it overrides it (house rule).
// Gathering: `skill` is the check, `resource` is what it yields.
// Facilities: Drift buildings from content/BuildingCatalog.js, chosen 2026-11-12.
export const PROFESSIONS = {
  // Production
  alchemy:        { kind: "production", label: "Alchemy",        tools: ["Alchemist's Supplies", "Herbalism Kit"],                      facilities: ["Alchemist", "Apothecary", "Herbal Greenhouse"],          defaultSkill: "Medicine" },
  blacksmithing:  { kind: "production", label: "Blacksmithing",  tools: ["Mason's Tools", "Smith's Tools"],                             facilities: ["Blacksmith", "Dragonforge", "Armory", "Mason's Workshop"],        defaultSkill: "Athletics" },
  cooking:        { kind: "production", label: "Cooking",        tools: ["Brewer's Supplies", "Cook's Utensils"],                       facilities: ["Community Oven", "Bakery", "Smokehouse", "Brewery"], defaultSkill: "Survival" },
  enchanting:     { kind: "production", label: "Enchanting",     tools: ["Carpenter's Tools", "Potter's Tools", "Woodcarver's Tools"],  facilities: ["Arcana Tower", "Enchanted Forest", "Leyline Spire", "Carpenter Shop"], defaultSkill: "Arcana" },
  engineering:    { kind: "production", label: "Engineering",    tools: ["Tinker's Tools"],                                             facilities: ["Techcrafter", "Engineers' Guild", "Steam Factory", "Workshop Quarter", "Clocktower"],  defaultSkill: "Investigation" },
  inscription:    { kind: "production", label: "Inscription",    tools: ["Calligrapher's Supplies", "Cartographer's Tools", "Painter's Supplies"], facilities: ["Library", "Arcana Tower", "Printing Press", "University"], defaultSkill: "Arcana" },
  jewelcrafting:  { kind: "production", label: "Jewelcrafting",  tools: ["Glassblower's Tools", "Jeweler's Tools"],                     facilities: ["Jewelry Shop", "Mint"],                                   defaultSkill: "Sleight of Hand" },
  leatherworking: { kind: "production", label: "Leatherworking", tools: ["Cobbler's Tools", "Leatherworker's Tools"],                   facilities: ["Tannery"],                                   defaultSkill: "Survival" },
  tailoring:      { kind: "production", label: "Tailoring",      tools: ["Weaver's Tools"],                                             facilities: ["Weaver's Hall", "Tailor"],                    defaultSkill: "Sleight of Hand" },
  // Gathering
  herbalism:   { kind: "gathering", label: "Herbalism",   tools: ["Herbalism Kit"],          skill: "Survival", resource: "herb" },
  mining:      { kind: "gathering", label: "Mining",      tools: ["Mason's Tools"],          skill: "Survival", resource: "ore" },
  skinning:    { kind: "gathering", label: "Skinning",    tools: ["Leatherworker's Tools"],  skill: "Survival", resource: "leather" },
  fishing:     { kind: "gathering", label: "Fishing",     tools: [],                         skill: "Survival", resource: "fish" },
  archaeology: { kind: "gathering", label: "Archaeology", tools: [], requiresSkill: "History", skill: "History", resource: null }
};

export const PRODUCTION = Object.keys(PROFESSIONS).filter((k) => PROFESSIONS[k].kind === "production");
export const GATHERING = Object.keys(PROFESSIONS).filter((k) => PROFESSIONS[k].kind === "gathering");

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
  if (!profession || profession.kind !== "production") throw new Error(`Unknown production profession: ${raw.profession}`);
  const consumable = Boolean(raw.consumable);
  return {
    ...raw,
    consumable,
    skill: raw.skill ?? profession.defaultSkill,
    dc: dcFor(raw.rarity),
    minPb: MIN_PB_BY_RARITY[raw.rarity],
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
  return (PROFESSIONS[recipe.profession].facilities ?? []).includes(facility);
}
