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

// ─── Profession levels (book, chapter 3) ─────────────────────────────────────

// Minimum Proficiency Bonus to use a recipe of each rarity.
export const MIN_PB_BY_RARITY = {
  common: 2,
  uncommon: 3,
  rare: 4,
  "very-rare": 5,
  legendary: 6
};

export const PROFICIENCY_LEVELS = { 2: "Apprentice", 3: "Journeyman", 4: "Expert", 5: "Artisan", 6: "Master" };

export function proficiencyLevel(pb) {
  return PROFICIENCY_LEVELS[Math.max(2, Math.min(6, pb))];
}

export function canCraftRarity(pb, rarity) {
  assertRarity(rarity);
  return pb >= MIN_PB_BY_RARITY[rarity];
}

// ─── Gathering ───────────────────────────────────────────────────────────────

// Region level → gathering DC and resource values in GP.
export const GATHERING_TIERS = [
  { key: "1-4",     maxLevel: 4,        dc: 10, common: 10,   rare: 25 },
  { key: "5-10",    maxLevel: 10,       dc: 12, common: 50,   rare: 100 },
  { key: "11-16",   maxLevel: 16,       dc: 15, common: 250,  rare: 500 },
  { key: "17-20",   maxLevel: 20,       dc: 17, common: 1000, rare: 2500 },
  { key: "endgame", maxLevel: Infinity, dc: 20, common: 5000, rare: 7500 }
];

/** Tier for a region level (1–20, or "endgame"). Also used for CR (skinning) and character level (relics). */
export function gatheringTier(level) {
  if (level === "endgame") return GATHERING_TIERS[4];
  const n = Number(level);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Bad level: ${level}`);
  return GATHERING_TIERS.find((t) => n <= t.maxLevel);
}

/**
 * One gathering check for a journey stage (herbalism, mining, fishing for a recipe).
 * Success: one resource per day. Beat the DC by 5+: one of them is rare.
 */
export function resolveGathering({ die, modifier, regionLevel, days = 1 }) {
  if (!Number.isInteger(days) || days < 1) throw new Error("Days must be a whole number ≥ 1");
  const tier = gatheringTier(regionLevel);
  const total = die + modifier;
  const margin = total - tier.dc;
  const success = margin >= 0;
  const rare = success && margin >= BIG_MARGIN ? 1 : 0;
  const common = success ? days - rare : 0;
  return { total, margin, dc: tier.dc, success, common, rare, value: common * tier.common + rare * tier.rare };
}

// Creature kinds that can be skinned and the minimum PB they need.
export const SKINNABLE = {
  beast: { minPb: 2, alwaysRare: false },
  monstrosity: { minPb: 2, alwaysRare: false }, // animal-like only
  fiend: { minPb: 3, alwaysRare: true },         // animal-like only, e.g. a felhound
  dragon: { minPb: 5, alwaysRare: true }
};

/**
 * Skinning one corpse (10 minutes). DC from the CR on the gathering table.
 * Success: leather (common value). Beat by 5+: hide (rare value).
 * Fiends and Dragons need a higher PB and always yield hide.
 */
export function resolveSkinning({ die, modifier, cr, creatureType, proficiencyBonus }) {
  const kind = SKINNABLE[creatureType];
  if (!kind) throw new Error(`Cannot skin a ${creatureType}`);
  if (proficiencyBonus < kind.minPb) {
    throw new Error(`Skinning a ${creatureType} needs PB +${kind.minPb}`);
  }
  const tier = gatheringTier(Number(cr) > 20 ? "endgame" : cr);
  const total = die + modifier;
  const margin = total - tier.dc;
  const success = margin >= 0;
  const rare = success && (kind.alwaysRare || margin >= BIG_MARGIN);
  return { total, margin, dc: tier.dc, success, hide: rare, value: success ? (rare ? tier.rare : tier.common) : 0 };
}

/**
 * Archaeology at a dig site (1 hour, Intelligence (History)).
 * Success: fragments (the 1d6 roll is passed in). Beat by 5+: a complete relic
 * worth a rare resource of the region. Natural 20: one magic fragment instead.
 */
export function resolveArchaeology({ die, modifier, regionLevel, fragmentRoll }) {
  const tier = gatheringTier(regionLevel);
  const total = die + modifier;
  const margin = total - tier.dc;
  const success = margin >= 0 || die === 20;
  if (die === 20) return { total, margin, dc: tier.dc, success, fragments: 0, magicFragments: 1, relicValue: 0 };
  if (!success) return { total, margin, dc: tier.dc, success, fragments: 0, magicFragments: 0, relicValue: 0 };
  if (margin >= BIG_MARGIN) return { total, margin, dc: tier.dc, success, fragments: 0, magicFragments: 0, relicValue: tier.rare };
  if (!Number.isInteger(fragmentRoll) || fragmentRoll < 1 || fragmentRoll > 6) throw new Error("Fragments need a d6");
  return { total, margin, dc: tier.dc, success, fragments: fragmentRoll, magicFragments: 0, relicValue: 0 };
}

export const RELIC_ASSEMBLY_DC = 15;
export const FRAGMENTS_PER_RELIC = 6;

/** Assembling six same-origin fragments. Value is a common resource for the character's level. */
export function resolveRelicAssembly({ die, modifier, characterLevel }) {
  const total = die + modifier;
  const success = total >= RELIC_ASSEMBLY_DC;
  return { total, dc: RELIC_ASSEMBLY_DC, success, value: success ? gatheringTier(characterLevel).common : 0 };
}

// Disenchanting: item rarity → minimum PB and residue value. Legendary can't be disenchanted.
export const DISENCHANT = {
  common: { minPb: 3, value: 25 },
  uncommon: { minPb: 4, value: 100 },
  rare: { minPb: 5, value: 1000 },
  "very-rare": { minPb: 6, value: 10000 }
};

export function disenchantValue(rarity, proficiencyBonus) {
  const row = DISENCHANT[rarity];
  if (!row) throw new Error(`${rarity} items can't be disenchanted`);
  if (proficiencyBonus < row.minPb) throw new Error(`Disenchanting a ${rarity} item needs PB +${row.minPb}`);
  return row.value;
}
