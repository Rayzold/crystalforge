// Scarred Lands Professions — rules engine.
// Pure functions, no DOM, no Firebase. Plan: artemis vault, state/crafting-plan.md §2.
//
// One roll per downtime week. DC by rarity. Advantage from facility + skill
// proficiency. Progress is counted in weeks and carries across downtimes.

export const RARITIES = ["common", "uncommon", "rare", "very-rare", "legendary"];

export const DC_BY_RARITY = {
  common: 13,
  uncommon: 16,
  rare: 19,
  "very-rare": 23,
  legendary: 27
};

// DMG 2024 days ÷ 7, rounded up.
export const WEEKS_BY_RARITY = {
  common: 1,
  uncommon: 2,
  rare: 8,
  "very-rare": 18,
  legendary: 36
};

// DMG 2024 crafting cost in GP.
export const COST_BY_RARITY = {
  common: 50,
  uncommon: 200,
  rare: 2000,
  "very-rare": 20000,
  legendary: 100000
};

// Max professions per character (decided 2026-11-11).
export const MAX_PROFESSIONS = 2;

// Margin (in either direction) that turns a result into a big success / complication.
export const BIG_MARGIN = 5;

function assertRarity(rarity) {
  if (!RARITIES.includes(rarity)) throw new Error(`Unknown rarity: ${rarity}`);
}

export function dcFor(rarity) {
  assertRarity(rarity);
  return DC_BY_RARITY[rarity];
}

/** Weeks of work for an item. Consumables (potions, scrolls) take half, rounded up. */
export function weeksFor(rarity, { consumable = false } = {}) {
  assertRarity(rarity);
  const weeks = WEEKS_BY_RARITY[rarity];
  return consumable ? Math.ceil(weeks / 2) : weeks;
}

/** GP cost of materials. Consumables cost half. */
export function costFor(rarity, { consumable = false } = {}) {
  assertRarity(rarity);
  const cost = COST_BY_RARITY[rarity];
  return consumable ? cost / 2 : cost;
}

/**
 * Advantage state for a crafting roll (plan option B).
 *  - item outside the crafter's professions → disadvantage, always
 *  - right facility + skill proficiency    → advantage
 *  - only one of the two                   → normal
 *  - neither                               → disadvantage
 * Returns "advantage" | "normal" | "disadvantage".
 */
export function rollMode({ inProfession, rightFacility, skillProficient }) {
  if (!inProfession) return "disadvantage";
  if (rightFacility && skillProficient) return "advantage";
  if (rightFacility || skillProficient) return "normal";
  return "disadvantage";
}

/** Ability modifier + proficiency bonus (doubled with expertise). */
export function checkModifier({ abilityMod = 0, proficiencyBonus = 0, skillProficient = false, expertise = false }) {
  if (!skillProficient) return abilityMod;
  return abilityMod + proficiencyBonus * (expertise ? 2 : 1);
}

/** Picks the kept d20 from one or two dice according to the roll mode. */
export function keptDie(mode, dice) {
  if (!Array.isArray(dice) || dice.length === 0) throw new Error("No dice given");
  for (const d of dice) {
    if (!Number.isInteger(d) || d < 1 || d > 20) throw new Error(`Invalid d20: ${d}`);
  }
  if (mode === "normal") return dice[0];
  if (dice.length < 2) throw new Error(`${mode} needs two dice`);
  return mode === "advantage" ? Math.max(dice[0], dice[1]) : Math.min(dice[0], dice[1]);
}

/**
 * Resolves one crafting week.
 * Returns { total, margin, success, weeksGained, complication }.
 *  - success          → +1 week
 *  - success by 5+    → +2 weeks
 *  - failure          → nothing
 *  - failure by 5+    → complication (DM decides: lost resources or a quirk)
 */
export function resolveWeek({ die, modifier, dc }) {
  const total = die + modifier;
  const margin = total - dc;
  const success = margin >= 0;
  const weeksGained = success ? (margin >= BIG_MARGIN ? 2 : 1) : 0;
  const complication = !success && margin <= -BIG_MARGIN;
  return { total, margin, success, weeksGained, complication };
}

/**
 * Applies a week's results to a project. Several crafters (PCs or NPCs) may
 * roll on the same project in the same week; their weeks add up.
 * Does not mutate. Returns { ...project, weeksDone, complete, complications }.
 */
export function applyWeek(project, results) {
  const gained = results.reduce((sum, r) => sum + r.weeksGained, 0);
  const complications = results.filter((r) => r.complication).length;
  const weeksDone = Math.min(project.weeksTarget, (project.weeksDone ?? 0) + gained);
  return {
    ...project,
    weeksDone,
    complete: weeksDone >= project.weeksTarget,
    complications: (project.complications ?? 0) + complications
  };
}

/** Rolls a d20 with an injectable RNG (Math.random by default). */
export function rollD20(rng = Math.random) {
  return Math.floor(rng() * 20) + 1;
}

/** Rolls the dice a mode needs: one for normal, two for advantage/disadvantage. */
export function rollDice(mode, rng = Math.random) {
  return mode === "normal" ? [rollD20(rng)] : [rollD20(rng), rollD20(rng)];
}
