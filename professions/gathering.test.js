// Run: node --test professions/gathering.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canCraftRarity, disenchantValue, gatheringTier, proficiencyLevel, resolveArchaeology,
  resolveGathering, resolveRelicAssembly, resolveSkinning
} from "./rules.js";
import { canRoll, createProject, normalizeCharacter } from "./model.js";
import { applyGatherEntry, createGatherEntry, describeGatherEntry, practices } from "./gathering.js";
import { GATHERING, PRODUCTION, PROFESSIONS } from "./recipes.js";

test("profession levels: min PB per rarity", () => {
  assert.equal(proficiencyLevel(2), "Apprentice");
  assert.equal(proficiencyLevel(6), "Master");
  assert.equal(canCraftRarity(4, "rare"), true);
  assert.equal(canCraftRarity(4, "very-rare"), false);
  assert.equal(canCraftRarity(2, "uncommon"), false);
});

test("all 14 professions of the book, split by kind", () => {
  assert.equal(PRODUCTION.length, 9);
  assert.equal(GATHERING.length, 5);
  assert.deepEqual(PROFESSIONS.alchemy.tools, ["Alchemist's Supplies", "Herbalism Kit"]);
  assert.deepEqual(PROFESSIONS.mining.tools, ["Mason's Tools"]);
});

test("gathering tiers by region level, CR and endgame", () => {
  assert.equal(gatheringTier(1).dc, 10);
  assert.equal(gatheringTier(4).dc, 10);
  assert.equal(gatheringTier(5).dc, 12);
  assert.equal(gatheringTier(11).dc, 15);
  assert.equal(gatheringTier(20).dc, 17);
  assert.equal(gatheringTier("endgame").dc, 20);
  assert.equal(gatheringTier(0.5).dc, 10); // CR 1/2
  assert.throws(() => gatheringTier("x"));
});

test("resolveGathering: one resource per day, one rare on +5", () => {
  const ok = resolveGathering({ die: 12, modifier: 4, regionLevel: 11, days: 3 }); // 16 vs 15
  assert.deepEqual([ok.success, ok.common, ok.rare, ok.value], [true, 3, 0, 750]);
  const big = resolveGathering({ die: 16, modifier: 4, regionLevel: 11, days: 3 }); // 20 vs 15
  assert.deepEqual([big.common, big.rare, big.value], [2, 1, 1000]);
  const fail = resolveGathering({ die: 2, modifier: 4, regionLevel: 11, days: 3 });
  assert.deepEqual([fail.success, fail.value], [false, 0]);
  assert.throws(() => resolveGathering({ die: 10, modifier: 0, regionLevel: 1, days: 0 }));
});

test("resolveSkinning: leather, hide, fiend and dragon gates", () => {
  assert.equal(resolveSkinning({ die: 10, modifier: 2, cr: 6, creatureType: "beast", proficiencyBonus: 2 }).value, 50);
  assert.equal(resolveSkinning({ die: 15, modifier: 2, cr: 6, creatureType: "beast", proficiencyBonus: 2 }).hide, true);
  assert.equal(resolveSkinning({ die: 10, modifier: 2, cr: 6, creatureType: "fiend", proficiencyBonus: 3 }).hide, true);
  assert.throws(() => resolveSkinning({ die: 10, modifier: 2, cr: 6, creatureType: "fiend", proficiencyBonus: 2 }), /PB \+3/);
  assert.throws(() => resolveSkinning({ die: 10, modifier: 2, cr: 17, creatureType: "dragon", proficiencyBonus: 4 }), /PB \+5/);
  assert.equal(resolveSkinning({ die: 20, modifier: 5, cr: 24, creatureType: "dragon", proficiencyBonus: 6 }).value, 7500);
  assert.throws(() => resolveSkinning({ die: 10, modifier: 0, cr: 1, creatureType: "humanoid", proficiencyBonus: 6 }));
});

test("resolveArchaeology: fragments, relic, natural 20", () => {
  assert.equal(resolveArchaeology({ die: 10, modifier: 3, regionLevel: 8, fragmentRoll: 4 }).fragments, 4);
  assert.equal(resolveArchaeology({ die: 15, modifier: 3, regionLevel: 8 }).relicValue, 100);
  const nat = resolveArchaeology({ die: 20, modifier: -5, regionLevel: "endgame" });
  assert.deepEqual([nat.magicFragments, nat.fragments, nat.success], [1, 0, true]);
  assert.equal(resolveArchaeology({ die: 2, modifier: 3, regionLevel: 8 }).success, false);
  assert.throws(() => resolveArchaeology({ die: 12, modifier: 0, regionLevel: 8 }), /d6/);
});

test("relic assembly and disenchanting", () => {
  assert.equal(resolveRelicAssembly({ die: 10, modifier: 5, characterLevel: 11 }).value, 250);
  assert.equal(resolveRelicAssembly({ die: 9, modifier: 5, characterLevel: 11 }).success, false);
  assert.equal(disenchantValue("uncommon", 4), 100);
  assert.throws(() => disenchantValue("uncommon", 3), /PB \+4/);
  assert.throws(() => disenchantValue("legendary", 6));
});

const ranger = normalizeCharacter({
  name: "Ilsa", level: 11, proficiencyBonus: 4,
  abilityMods: { wis: 3, int: 1 },
  skills: { Survival: "proficient", History: "proficient" },
  professions: ["herbalism", "archaeology"]
});
const levels = { "Wyldermoore": 11, "The Drift": 8 };

test("practices: listed profession, fishing for all, archaeology needs History", () => {
  assert.equal(practices(ranger, "herbalism"), true);
  assert.equal(practices(ranger, "mining"), false);
  assert.equal(practices(ranger, "fishing"), true);
  const noHistory = normalizeCharacter({ name: "N", professions: ["archaeology"] });
  assert.equal(practices(noHistory, "archaeology"), false);
});

test("gather entry → approve → resources", () => {
  const e = createGatherEntry({ character: ranger, charId: "c1", kind: "gather", params: { profession: "herbalism", region: "Wyldermoore", days: 2 }, regionLevels: levels, die: 9, uid: "u" });
  assert.equal(e.modifier, 7);
  assert.equal(e.total, 16);
  assert.equal(e.value, 500);
  assert.equal(e.status, "pending");
  assert.equal(applyGatherEntry(ranger, e).resources.herb, 500);
  assert.match(describeGatherEntry(e), /2 common herb, 500 GP/);
  assert.throws(() => createGatherEntry({ character: ranger, charId: "c1", kind: "gather", params: { profession: "mining", region: "Wyldermoore" }, regionLevels: levels, die: 9, uid: "u" }), /δεν ασκεί/);
  assert.throws(() => createGatherEntry({ character: ranger, charId: "c1", kind: "gather", params: { profession: "herbalism", region: "Fur Wehn" }, regionLevels: levels, die: 9, uid: "u" }), /level/);
});

test("dig → fragments → relic assembly with retry lock", () => {
  const dig = createGatherEntry({ character: ranger, charId: "c1", kind: "dig", params: { region: "The Drift", origin: "Slarecian", fragmentRoll: 6 }, regionLevels: levels, die: 10, uid: "u" });
  assert.equal(dig.fragments, 6);
  let c = { ...ranger, ...applyGatherEntry(ranger, dig) };
  assert.equal(c.fragments.Slarecian, 6);

  const fail = createGatherEntry({ character: c, charId: "c1", kind: "relic", params: { origin: "Slarecian" }, die: 2, uid: "u" });
  assert.equal(fail.success, false);
  c = { ...c, ...applyGatherEntry(c, fail) };
  assert.equal(c.assemblyBlockedAt.Slarecian, 6);
  assert.throws(() => createGatherEntry({ character: c, charId: "c1", kind: "relic", params: { origin: "Slarecian" }, die: 15, uid: "u" }), /fragment ακόμα/);

  c = { ...c, fragments: { Slarecian: 7 } };
  const ok = createGatherEntry({ character: c, charId: "c1", kind: "relic", params: { origin: "Slarecian" }, die: 15, uid: "u" });
  c = { ...c, ...applyGatherEntry(c, ok) };
  assert.equal(c.fragments.Slarecian, 1);
  assert.deepEqual(c.relics, [{ origin: "Slarecian", value: 250 }]);
  assert.equal(c.assemblyBlockedAt.Slarecian, undefined);
});

test("disenchant entry needs enchanting", () => {
  assert.throws(() => createGatherEntry({ character: ranger, charId: "c1", kind: "disenchant", params: { rarity: "common" }, uid: "u" }), /Enchanting/);
  const ench = normalizeCharacter({ name: "E", proficiencyBonus: 4, professions: ["enchanting"] });
  const e = createGatherEntry({ character: ench, charId: "c2", kind: "disenchant", params: { rarity: "uncommon", itemName: "Cloak" }, uid: "u" });
  assert.equal(applyGatherEntry(ench, e).resources.residue, 100);
});

test("canRoll refuses a recipe above the crafter's PB", () => {
  const smith = normalizeCharacter({ name: "S", proficiencyBonus: 3, professions: ["blacksmithing"] });
  const project = { ...createProject({ charId: "s", recipeId: "armor-plus-1" }), status: "active" };
  const r = canRoll({ downtime: { id: "d", open: true, weeks: 2 }, log: [], charId: "s", project, character: smith });
  assert.equal(r.ok, false);
  assert.match(r.reason, /\+4/);
});

test("normalizeCharacter keeps level and archaeology fields", () => {
  const c = normalizeCharacter({ name: "A", level: 7, fragments: { " Titanswar ": 3, "": 2 }, relics: [{ origin: "X", value: 0 }] });
  assert.equal(c.level, 7);
  assert.deepEqual(c.fragments, { Titanswar: 3 });
  assert.deepEqual(c.relics, []);
  assert.throws(() => normalizeCharacter({ name: "A", level: 25 }));
});
