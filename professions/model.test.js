// Run: node --test professions/model.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  approveEntry, canRoll, createProject, createRollEntry, generateClaimCode,
  normalizeCharacter, rejectEntry, rollContext, weeksUsed
} from "./model.js";
import { findRecipe } from "./recipes.js";

const alchemist = normalizeCharacter({
  name: "Vessa",
  proficiencyBonus: 3,
  abilityMods: { wis: 2, int: 4 },
  skills: { Medicine: "proficient", Arcana: "expertise" },
  professions: ["alchemy", "inscription"]
});

test("normalizeCharacter: defaults and validation", () => {
  assert.equal(alchemist.abilityMods.str, 0);
  assert.equal(alchemist.resources.herb, 0);
  assert.equal(alchemist.isNpc, false);
  assert.throws(() => normalizeCharacter({ name: "X", professions: ["alchemy", "tailoring", "inscription"] }), /At most 2/);
  assert.throws(() => normalizeCharacter({ name: "X", professions: ["cooking"] }), /Unknown profession/);
  assert.throws(() => normalizeCharacter({ name: "X", skills: { Cooking: "proficient" } }), /Unknown skill/);
  assert.throws(() => normalizeCharacter({ name: "X", proficiencyBonus: 9 }), /Proficiency/);
  assert.throws(() => normalizeCharacter({ professions: [] }), /name/);
  const c = normalizeCharacter({ name: "Y", recipes: ["potion-of-healing", "nope", "potion-of-healing"] });
  assert.deepEqual(c.recipes, ["potion-of-healing"]);
});

test("rollContext: facility + skill → advantage, modifier from skill's ability", () => {
  const healing = findRecipe("potion-of-healing"); // Medicine (wis)
  const atAlchemist = rollContext(alchemist, healing, "Alchemist");
  assert.equal(atAlchemist.mode, "advantage");
  assert.equal(atAlchemist.modifier, 2 + 3);
  assert.equal(atAlchemist.dc, 13);

  assert.equal(rollContext(alchemist, healing, null).mode, "normal");

  const fire = findRecipe("potion-of-fire-breath"); // Arcana (int), expertise
  assert.equal(rollContext(alchemist, fire, "Apothecary").modifier, 4 + 6);

  const boots = findRecipe("boots-of-elvenkind"); // tailoring: not her profession
  assert.equal(rollContext(alchemist, boots, "Weaver's Hall").mode, "disadvantage");
});

test("createProject: weeks from the recipe, owner is a crafter, starts proposed", () => {
  const p = createProject({ charId: "c1", recipeId: "armor-plus-1", facility: "Blacksmith", crafters: ["npc1", "c1"] });
  assert.equal(p.weeksTarget, 8);
  assert.deepEqual(p.crafters, ["c1", "npc1"]);
  assert.equal(p.status, "proposed");
  assert.throws(() => createProject({ charId: "c1", recipeId: "nope" }));
});

test("canRoll and weeksUsed", () => {
  const project = { ...createProject({ charId: "c1", recipeId: "potion-of-healing" }), status: "active" };
  const downtime = { id: "dt1", open: true, weeks: 2 };
  const log = [
    { charId: "c1", downtimeId: "dt1", status: "approved" },
    { charId: "c1", downtimeId: "dt1", status: "rejected" },
    { charId: "c1", downtimeId: "dt0", status: "approved" },
    { charId: "c2", downtimeId: "dt1", status: "pending" }
  ];
  assert.equal(weeksUsed(log, "c1", "dt1"), 1);
  assert.equal(canRoll({ downtime, log, charId: "c1", project }).ok, true);

  const full = [...log, { charId: "c1", downtimeId: "dt1", status: "pending" }];
  assert.equal(canRoll({ downtime, log: full, charId: "c1", project }).ok, false);
  assert.equal(canRoll({ downtime: { ...downtime, open: false }, log, charId: "c1", project }).ok, false);
  assert.equal(canRoll({ downtime, log, charId: "c9", project }).ok, false);
  assert.equal(canRoll({ downtime, log, charId: "c1", project: { ...project, status: "proposed" } }).ok, false);
});

test("createRollEntry: app roll uses mode, table roll takes the kept die", () => {
  const project = { id: "p1", ...createProject({ charId: "c1", recipeId: "potion-of-healing", facility: "Alchemist" }), status: "active" };
  const app = createRollEntry({ character: alchemist, charId: "c1", project, downtimeId: "dt1", source: "app", dice: [4, 11], uid: "u1" });
  assert.equal(app.mode, "advantage");
  assert.equal(app.die, 11);
  assert.equal(app.total, 16);
  assert.equal(app.weeksGained, 1);
  assert.equal(app.status, "pending");
  assert.equal(app.projectId, "p1");

  const table = createRollEntry({ character: alchemist, charId: "c1", project, downtimeId: "dt1", source: "table", dice: [3], uid: "u1" });
  assert.equal(table.die, 3);
  assert.deepEqual(table.dice, [3]);
  assert.equal(table.margin, -5);
  assert.equal(table.complication, true);

  assert.throws(() => createRollEntry({ character: alchemist, charId: "c1", project, downtimeId: "dt1", source: "app", dice: [4], uid: "u1" }), /two dice/);
  assert.throws(() => createRollEntry({ character: alchemist, charId: "c1", project, downtimeId: "dt1", source: "phone", dice: [4], uid: "u1" }));
});

test("approve / reject", () => {
  const project = { weeksTarget: 1, weeksDone: 0, complications: 0, status: "active" };
  const entry = { weeksGained: 2, complication: false, status: "pending" };
  const { project: p, entry: e } = approveEntry(project, entry);
  assert.equal(p.weeksDone, 1);
  assert.equal(p.status, "complete");
  assert.equal(e.status, "approved");
  assert.throws(() => approveEntry(project, e));
  assert.equal(rejectEntry(entry).status, "rejected");
  assert.throws(() => rejectEntry(e));
});

test("claim codes: format and no ambiguous characters", () => {
  const code = generateClaimCode();
  assert.match(code, /^DRIFT-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
});
