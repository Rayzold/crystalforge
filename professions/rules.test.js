// Run: node --test professions/rules.test.js professions/model.test.js professions/gathering.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyWeek, checkModifier, costFor, dcFor, keptDie, resolveWeek, rollDice, rollMode, weeksFor
} from "./rules.js";
import { RECIPES, findRecipe, isRightFacility, PROFESSIONS } from "./recipes.js";

test("DC by rarity", () => {
  assert.deepEqual(
    ["common", "uncommon", "rare", "very-rare", "legendary"].map(dcFor),
    [13, 16, 19, 23, 27]
  );
  assert.throws(() => dcFor("artifact"));
});

test("weeks by rarity, consumables at half rounded up", () => {
  assert.deepEqual(
    ["common", "uncommon", "rare", "very-rare", "legendary"].map((r) => weeksFor(r)),
    [1, 2, 8, 18, 36]
  );
  assert.deepEqual(
    ["common", "uncommon", "rare", "very-rare", "legendary"].map((r) => weeksFor(r, { consumable: true })),
    [1, 1, 4, 9, 18]
  );
});

test("cost, consumables at half", () => {
  assert.equal(costFor("rare"), 2000);
  assert.equal(costFor("uncommon", { consumable: true }), 100);
});

test("roll mode, option B", () => {
  assert.equal(rollMode({ inProfession: true, rightFacility: true, skillProficient: true }), "advantage");
  assert.equal(rollMode({ inProfession: true, rightFacility: true, skillProficient: false }), "normal");
  assert.equal(rollMode({ inProfession: true, rightFacility: false, skillProficient: true }), "normal");
  assert.equal(rollMode({ inProfession: true, rightFacility: false, skillProficient: false }), "disadvantage");
  // Outside the profession: disadvantage even with facility and skill.
  assert.equal(rollMode({ inProfession: false, rightFacility: true, skillProficient: true }), "disadvantage");
});

test("check modifier", () => {
  assert.equal(checkModifier({ abilityMod: 3, proficiencyBonus: 4, skillProficient: false }), 3);
  assert.equal(checkModifier({ abilityMod: 3, proficiencyBonus: 4, skillProficient: true }), 7);
  assert.equal(checkModifier({ abilityMod: 3, proficiencyBonus: 4, skillProficient: true, expertise: true }), 11);
});

test("kept die", () => {
  assert.equal(keptDie("normal", [7]), 7);
  assert.equal(keptDie("advantage", [7, 15]), 15);
  assert.equal(keptDie("disadvantage", [7, 15]), 7);
  assert.throws(() => keptDie("advantage", [7]));
  assert.throws(() => keptDie("normal", [21]));
});

test("resolve week: boundaries at DC and ±5", () => {
  const dc = 16;
  assert.deepEqual(resolveWeek({ die: 10, modifier: 6, dc }), { total: 16, margin: 0, success: true, weeksGained: 1, complication: false });
  assert.equal(resolveWeek({ die: 14, modifier: 6, dc }).weeksGained, 1);  // +4
  assert.equal(resolveWeek({ die: 15, modifier: 6, dc }).weeksGained, 2);  // +5
  assert.deepEqual(resolveWeek({ die: 9, modifier: 6, dc }), { total: 15, margin: -1, success: false, weeksGained: 0, complication: false });
  assert.equal(resolveWeek({ die: 6, modifier: 6, dc }).complication, false); // −4
  assert.equal(resolveWeek({ die: 5, modifier: 6, dc }).complication, true);  // −5
});

test("apply week: helpers add up, progress caps at target, carries over", () => {
  const project = { recipeId: "armor-plus-1", weeksTarget: 8, weeksDone: 6 };
  const pc = resolveWeek({ die: 18, modifier: 6, dc: 19 });   // +5 → 2 weeks
  const npc = resolveWeek({ die: 3, modifier: 2, dc: 19 });   // −14 → complication
  const after = applyWeek(project, [pc, npc]);
  assert.equal(after.weeksDone, 8);
  assert.equal(after.complete, true);
  assert.equal(after.complications, 1);
  assert.equal(project.weeksDone, 6, "input not mutated");

  const next = applyWeek({ weeksTarget: 8, weeksDone: 7 }, [pc, pc]);
  assert.equal(next.weeksDone, 8);
});

test("rollDice uses the injected RNG", () => {
  const seq = [0, 0.999];
  const rng = () => seq.shift();
  assert.deepEqual(rollDice("advantage", rng), [1, 20]);
});

test("recipes: every recipe resolves and matches the rules", () => {
  assert.ok(RECIPES.length > 0);
  for (const r of RECIPES) {
    assert.ok(PROFESSIONS[r.profession], r.id);
    assert.equal(r.dc, dcFor(r.rarity), r.id);
    assert.ok(r.skill, r.id);
  }
  const ids = RECIPES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "unique ids");
});

test("recipes: skill override and facility match", () => {
  const boots = findRecipe("boots-of-elvenkind");
  assert.equal(boots.skill, "Stealth");
  assert.equal(findRecipe("potion-of-healing").skill, "Medicine");
  assert.equal(findRecipe("spell-scroll-1").weeks, 1);
  assert.equal(isRightFacility(findRecipe("potion-of-healing"), "Alchemist"), true);
  assert.equal(isRightFacility(findRecipe("potion-of-healing"), "Blacksmith"), false);
  assert.equal(isRightFacility(findRecipe("potion-of-healing"), null), false);
});
