// Tracks per-effect cooldowns — building activations (The Seeker, Oracle),
// NPC special abilities, or any custom GM-tracked recharge. Three cooldown
// shapes are supported:
//
//   fixed   — exactly N days until ready
//   dice    — roll AdB once when started; stores the rolled value
//   percent — chance grows by N% per day until the GM marks it triggered
//
// All times are stored in dayOffset units (the same scale as the calendar).

import { createId } from "../engine/Utils.js?v=2.0.44-20260615090902";

export const COOLDOWN_TYPES = ["fixed", "dice", "percent"];
export const COOLDOWN_SOURCE_TYPES = ["building", "npc", "custom"];

function clampPositiveInt(value, fallback = 1) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampNonNegativeInt(value, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += 1 + Math.floor(Math.random() * sides);
  }
  return total;
}

/** Build a new cooldown record. For dice, rolls once on creation. */
export function createCooldown(input = {}) {
  const type = COOLDOWN_TYPES.includes(input.type) ? input.type : "fixed";
  const sourceType = COOLDOWN_SOURCE_TYPES.includes(input.sourceType) ? input.sourceType : "custom";
  const base = {
    id: createId("cooldown"),
    name: String(input.name ?? "Unnamed cooldown").trim().slice(0, 120) || "Unnamed cooldown",
    sourceType,
    sourceId: input.sourceId ? String(input.sourceId).slice(0, 80) : null,
    type,
    startedDayOffset: clampNonNegativeInt(input.startedDayOffset, 0),
    notes: String(input.notes ?? "").trim().slice(0, 400),
    triggeredDayOffset: null,
    // Defaults filled in per type below
    fixedDays: 1,
    diceCount: 1,
    diceSides: 4,
    rolledDays: 1,
    percentPerDay: 1
  };
  if (type === "fixed") {
    base.fixedDays = clampPositiveInt(input.fixedDays, 1);
  } else if (type === "dice") {
    base.diceCount = clampPositiveInt(input.diceCount, 1);
    base.diceSides = clampPositiveInt(input.diceSides, 4);
    base.rolledDays = clampPositiveInt(input.rolledDays, rollDice(base.diceCount, base.diceSides));
  } else if (type === "percent") {
    base.percentPerDay = Math.max(0.1, Math.min(100, Number(input.percentPerDay) || 1));
  }
  return base;
}

export function normalizeCooldowns(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const type = COOLDOWN_TYPES.includes(c?.type) ? c.type : "fixed";
    const sourceType = COOLDOWN_SOURCE_TYPES.includes(c?.sourceType) ? c.sourceType : "custom";
    return {
      id: String(c?.id ?? createId("cooldown")),
      name: String(c?.name ?? "Unnamed cooldown").slice(0, 120),
      sourceType,
      sourceId: c?.sourceId ? String(c.sourceId).slice(0, 80) : null,
      type,
      startedDayOffset: clampNonNegativeInt(c?.startedDayOffset, 0),
      notes: String(c?.notes ?? "").slice(0, 400),
      triggeredDayOffset: (c?.triggeredDayOffset === null || c?.triggeredDayOffset === undefined)
        ? null
        : (Number.isFinite(Number(c.triggeredDayOffset)) ? Number(c.triggeredDayOffset) : null),
      fixedDays: clampPositiveInt(c?.fixedDays, 1),
      diceCount: clampPositiveInt(c?.diceCount, 1),
      diceSides: clampPositiveInt(c?.diceSides, 4),
      rolledDays: clampPositiveInt(c?.rolledDays, 1),
      percentPerDay: Math.max(0.1, Math.min(100, Number(c?.percentPerDay) || 1))
    };
  });
}

/** Calendar day when a fixed/dice cooldown unlocks. Percent cooldowns don't have a hard "ready" day. */
export function getCooldownReadyDay(cooldown) {
  if (cooldown.type === "fixed") return cooldown.startedDayOffset + cooldown.fixedDays;
  if (cooldown.type === "dice")  return cooldown.startedDayOffset + cooldown.rolledDays;
  return null;
}

/** Days from `dayOffset` until ready. Negative if already past. Null for percent. */
export function getCooldownDaysRemaining(cooldown, dayOffset) {
  const ready = getCooldownReadyDay(cooldown);
  return ready === null ? null : ready - dayOffset;
}

/** Cumulative percent chance to trigger today (only meaningful for "percent" type). */
export function getCooldownTriggerChance(cooldown, dayOffset) {
  if (cooldown.type !== "percent") return null;
  const daysPassed = Math.max(0, dayOffset - cooldown.startedDayOffset);
  return Math.min(100, daysPassed * cooldown.percentPerDay);
}

export function addCooldown(state, input) {
  if (!Array.isArray(state.cooldowns)) state.cooldowns = [];
  const cooldown = createCooldown(input);
  state.cooldowns.push(cooldown);
  return cooldown;
}

export function removeCooldown(state, id) {
  if (!Array.isArray(state.cooldowns)) return;
  state.cooldowns = state.cooldowns.filter((c) => c.id !== id);
}

/** Restart a cooldown — useful when the user "uses" the building again. */
export function restartCooldown(state, id, currentDayOffset) {
  if (!Array.isArray(state.cooldowns)) return null;
  const cooldown = state.cooldowns.find((c) => c.id === id);
  if (!cooldown) return null;
  cooldown.startedDayOffset = currentDayOffset;
  cooldown.triggeredDayOffset = null;
  if (cooldown.type === "dice") {
    cooldown.rolledDays = rollDice(cooldown.diceCount, cooldown.diceSides);
  }
  return cooldown;
}

/** Mark a percent-style cooldown as triggered (effect activated today). */
export function markCooldownTriggered(state, id, dayOffset) {
  const cooldown = (state.cooldowns ?? []).find((c) => c.id === id);
  if (cooldown) cooldown.triggeredDayOffset = dayOffset;
  return cooldown ?? null;
}

/** Advance a single cooldown's age by N days (default 1) without touching
 *  the global calendar. Internally moves startedDayOffset earlier so the
 *  elapsed time increases. Will not move the start before day 0. */
export function ageCooldown(state, id, days = 1) {
  const cooldown = (state.cooldowns ?? []).find((c) => c.id === id);
  if (!cooldown) return null;
  cooldown.startedDayOffset = Math.max(0, cooldown.startedDayOffset - Math.max(1, Math.floor(days)));
  return cooldown;
}

/** True iff the cooldown is currently ready to use. For percent-style this
 *  means either the GM marked it triggered OR the cumulative chance has hit
 *  100% (Math.floor(chance) >= 100). */
export function isCooldownReady(cooldown, dayOffset) {
  if (cooldown.type === "percent") {
    if (cooldown.triggeredDayOffset !== null) return true;
    return getCooldownTriggerChance(cooldown, dayOffset) >= 100;
  }
  const remaining = getCooldownDaysRemaining(cooldown, dayOffset);
  return remaining !== null && remaining <= 0;
}

/**
 * Rolls every still-cooling percent cooldown once for the given dayOffset.
 * If a roll succeeds, marks the cooldown as triggered on that day. Returns
 * the list of cooldowns that triggered this tick (for toast/notification).
 *
 * Called by TimeSystem.runTimeAdvance once per day so a multi-day advance
 * gets one roll per day per cooldown (matching the cumulative model:
 * day 1 = 1% chance, day 2 = 2%, …, day 100 = guaranteed).
 */
export function rollPercentCooldownsForDay(state, dayOffset) {
  const triggered = [];
  for (const cooldown of state.cooldowns ?? []) {
    if (cooldown.type !== "percent") continue;
    if (cooldown.triggeredDayOffset !== null) continue;
    const chance = getCooldownTriggerChance(cooldown, dayOffset);
    if (chance <= 0) continue;
    if (Math.random() * 100 < chance) {
      cooldown.triggeredDayOffset = dayOffset;
      triggered.push(cooldown);
    }
  }
  return triggered;
}
