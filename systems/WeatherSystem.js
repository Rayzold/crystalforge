// Weather randomization with intensity bias and streak persistence.
//
// Two ideas drive this module:
//
//   1. 70 / 30 calm-vs-dramatic split when nothing else applies. The base
//      calendar should feel mostly stable, with the occasional storm or
//      cold snap. We achieve this by partitioning each season's pool by
//      `intensity` and picking the partition before picking the entry.
//
//   2. Streak persistence — once a condition is active it tends to hold
//      for a few days. When yesterday was X, today has a high chance of
//      staying X, a moderate chance of switching to another condition in
//      the same intensity category, and a small chance of breaking out
//      to the other category. That gives the calendar visible "weeks of
//      rain" instead of strobe-light churn day to day.
//
// Public surface:
//   - rollWeatherForDay(state, dayOffset)       : returns a weather entry
//   - generateMonthWeather(state, monthStart)   : fills 28 days, in-place
//   - ensureNextMonthWeatherGenerated(state)    : called after time advances
//   - clearMonthWeatherOverrides(state, monthStart) : reset just that month
//
// All mutations write into state.weatherOverrides — a dictionary keyed by
// String(dayOffset). Days with no override fall back to the deterministic
// season pick (see CalendarSystem.getWeatherForDay).

import { DAYS_PER_MONTH } from "../content/CalendarConfig.js?v=v1.7.21-20260629112345";
import {
  getSeasonForOffset,
  getCalmPoolForSeason,
  getDramaticPool,
  getStructuredDate
} from "./CalendarSystem.js?v=v1.7.21-20260629112345";

const CALM_BIAS = 0.70;   // First-day bias when no previous day is available.

// When yesterday was a calm condition, today's odds:
//   - 65% repeat the exact same condition
//   - 25% pick a different calm condition from this season's pool
//   - 10% break out into a dramatic condition
const CALM_FOLLOW = { repeat: 0.65, sameCategory: 0.25 /* implicit other = 0.10 */ };

// When yesterday was dramatic, today's odds:
//   - 55% repeat (storms tend to last 1-3 days)
//   - 20% another dramatic condition
//   - 25% break back to calm
const DRAMATIC_FOLLOW = { repeat: 0.55, sameCategory: 0.20 /* implicit other = 0.25 */ };

function pickOne(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Calm picks come from the season's per-season pool; dramatic picks come from
// the single global DRAMATIC_WEATHER list. The streak logic decides intensity,
// these helpers just return a concrete entry.
function pickCalmFor(season) {
  return pickOne(getCalmPoolForSeason(season));
}

function pickDramaticFor() {
  return pickOne(getDramaticPool());
}

function pickByIntensity(season, intensity) {
  return intensity === "calm" ? pickCalmFor(season) : pickDramaticFor();
}

function pickFirstDay(season) {
  return Math.random() < CALM_BIAS ? pickCalmFor(season) : pickDramaticFor();
}

function pickOtherInCategory(season, currentName, intensity) {
  const pool = intensity === "calm" ? getCalmPoolForSeason(season) : getDramaticPool();
  const others = pool.filter((entry) => entry.name !== currentName);
  if (others.length === 0) {
    return pool[0] ?? null;
  }
  return pickOne(others);
}

function pickFollowing(season, previous) {
  if (!previous) {
    return pickFirstDay(season);
  }
  const rules = previous.intensity === "calm" ? CALM_FOLLOW : DRAMATIC_FOLLOW;
  const roll = Math.random();
  if (roll < rules.repeat) {
    return previous;
  }
  if (roll < rules.repeat + rules.sameCategory) {
    return pickOtherInCategory(season, previous.name, previous.intensity);
  }
  const otherCategory = previous.intensity === "calm" ? "dramatic" : "calm";
  return pickByIntensity(season, otherCategory);
}

function ensureOverridesBag(state) {
  if (!state.weatherOverrides || typeof state.weatherOverrides !== "object") {
    state.weatherOverrides = {};
  }
  return state.weatherOverrides;
}

// Returns the override-or-deterministic weather entry already stored for the
// previous day, so the streak rules know what they're following.
function getPrevDayEntry(state, dayOffset) {
  const overrides = state.weatherOverrides ?? {};
  if (overrides[String(dayOffset - 1)]) return overrides[String(dayOffset - 1)];
  // No persisted prior. Fall back to the deterministic pick so a brand-new
  // sequence doesn't snap to an unrelated condition mid-month.
  return getStructuredDate(dayOffset - 1).weather;
}

export function rollWeatherForDay(state, dayOffset) {
  const season = getSeasonForOffset(dayOffset);
  const previous = getPrevDayEntry(state, dayOffset);
  return pickFollowing(season, previous);
}

// Writes a fresh weather pick for every day in [monthStartOffset, +28). Uses
// streak rules across day boundaries so the produced month feels continuous
// instead of pure noise. Overwrites existing overrides for those days.
export function generateMonthWeather(state, monthStartOffset) {
  const overrides = ensureOverridesBag(state);
  // Seed the first day from the season + the previous day's entry (which may
  // be from the prior month) so transitions across month boundaries are smooth.
  for (let i = 0; i < DAYS_PER_MONTH; i += 1) {
    const dayOffset = monthStartOffset + i;
    overrides[String(dayOffset)] = rollWeatherForDay(state, dayOffset);
  }
  return overrides;
}

// True if the dictionary already has at least one entry for any day in the
// given month — used by the auto-generator so it doesn't trample on a month
// the user already randomized or is mid-editing.
export function hasMonthWeather(state, monthStartOffset) {
  const overrides = state.weatherOverrides ?? {};
  for (let i = 0; i < DAYS_PER_MONTH; i += 1) {
    if (overrides[String(monthStartOffset + i)]) return true;
  }
  return false;
}

export function clearMonthWeatherOverrides(state, monthStartOffset) {
  const overrides = ensureOverridesBag(state);
  for (let i = 0; i < DAYS_PER_MONTH; i += 1) {
    delete overrides[String(monthStartOffset + i)];
  }
  return overrides;
}

// Called from TimeSystem after each day advance. If the current day falls in
// the last 7 days of the month AND the next month has no overrides yet, fill
// it in. This gives the calendar a smooth one-month-ahead horizon.
export function ensureNextMonthWeatherGenerated(state) {
  const today = state?.calendar?.dayOffset ?? 0;
  const date = getStructuredDate(today);
  const dayOfMonth = date.day; // 1-based
  const isInLastWeek = dayOfMonth >= DAYS_PER_MONTH - 6;
  if (!isInLastWeek) return false;

  const daysUntilMonthEnd = DAYS_PER_MONTH - dayOfMonth; // 0..6
  const nextMonthStart = today + daysUntilMonthEnd + 1;
  if (hasMonthWeather(state, nextMonthStart)) return false;

  generateMonthWeather(state, nextMonthStart);
  return true;
}
