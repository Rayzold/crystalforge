import { STEP_DURATIONS } from "../content/Config.js?v=v1.7.20-20260615092907";
import { formatDate, getStructuredDate } from "./CalendarSystem.js?v=v1.7.20-20260615092907";
import { recalculateCityStats } from "./CityStatsSystem.js?v=v1.7.20-20260615092907";
import { advanceConstructionOneDay } from "./ConstructionSystem.js?v=v1.7.20-20260615092907";
import { expireEvents, maybeTriggerHolidayEvents, maybeTriggerRandomEvents, processScheduledEvents } from "./EventSystem.js?v=v1.7.20-20260615092907";
import { advanceExpeditionsOneDay } from "./ExpeditionSystem.js?v=v1.7.20-20260615092907";
import { addHistoryEntry } from "./HistoryLogSystem.js?v=v1.7.20-20260615092907";
import { addMonthlyChronicleIfNeeded } from "./MonthlyChronicleSystem.js?v=v1.7.20-20260615092907";
import { applyDailyResources } from "./ResourceSystem.js?v=v1.7.20-20260615092907";
import { captureDailyCitySnapshot } from "./CitySnapshotSystem.js?v=v1.7.20-20260615092907";
import { applyTownFocusDailyEffects, updateTownFocusAvailability } from "./TownFocusSystem.js?v=v1.7.20-20260615092907";
import { getNewlyCompletedCraftingItems } from "./CraftingSystem.js?v=v1.7.20-20260615092907";
import { rollPercentCooldownsForDay } from "./CooldownSystem.js?v=v1.7.20-20260615092907";
import { ensureNextMonthWeatherGenerated } from "./WeatherSystem.js?v=v1.7.20-20260615092907";

function runTimeAdvance(state, days, stepKey = null) {
  const completions = [];
  const triggeredEvents = [];
  const expeditionJourneys = [];

  for (let index = 0; index < days; index += 1) {
    const previousDayOffset = state.calendar.dayOffset;
    state.calendar.dayOffset += 1;
    const previousDate = getStructuredDate(previousDayOffset);
    const currentDate = formatDate(state.calendar.dayOffset);
    const currentStructuredDate = getStructuredDate(state.calendar.dayOffset);

    if (
      previousDate.monthIndex !== currentStructuredDate.monthIndex ||
      previousDate.year !== currentStructuredDate.year
    ) {
      addMonthlyChronicleIfNeeded(state, previousDayOffset);
    }

    expireEvents(state);
    expeditionJourneys.push(...advanceExpeditionsOneDay(state));
    const completedToday = advanceConstructionOneDay(state, currentDate, state.calendar.dayOffset);
    completions.push(...completedToday);
    for (const building of completedToday) {
      addHistoryEntry(state, {
        category: "Completion",
        title: building.displayName,
        details: `${building.displayName} completed on ${building.completedAt}.`
      });
    }
    // Check crafting completions before applying resources (so costs stop on completion day)
    const craftingCompletedToday = getNewlyCompletedCraftingItems(state, state.calendar.dayOffset);
    for (const item of craftingCompletedToday) {
      addHistoryEntry(state, {
        category: "Crafting",
        title: item.name,
        details: `${item.name} finished crafting on ${currentDate}.`
      });
    }
    applyDailyResources(state);
    applyTownFocusDailyEffects(state);
    recalculateCityStats(state);
    updateTownFocusAvailability(state);
    captureDailyCitySnapshot(state);
    // Roll each still-cooling percent cooldown ONCE for today. The
    // UIRenderer's readiness watcher detects the resulting "ready" transition
    // and fires the splash toast — no separate notification path needed.
    rollPercentCooldownsForDay(state, state.calendar.dayOffset);
    // Once the city has crossed into the last week of the current month, pre-fill
    // the next month's weather (idempotent — skips if it's already filled).
    // Doing this per advanced day means a +Month step generates each new month
    // exactly once as it crosses the threshold, with no duplicate work.
    ensureNextMonthWeatherGenerated(state);
    triggeredEvents.push(...processScheduledEvents(state));
    triggeredEvents.push(...maybeTriggerHolidayEvents(state));
  }

  triggeredEvents.push(...maybeTriggerRandomEvents(state, stepKey ?? (days >= 28 ? "month" : days >= 7 ? "week" : days >= 3 ? "3days" : "day")));
  recalculateCityStats(state);

  if (days > 0) {
    addHistoryEntry(state, {
      category: "Time",
      title: "Time Advanced",
      details: `Advanced ${days} day(s) to ${formatDate(state.calendar.dayOffset)}.`
    });
  }

  return { days, completions, triggeredEvents, expeditionJourneys };
}

export function advanceTime(state, stepKey) {
  return runTimeAdvance(state, STEP_DURATIONS[stepKey], stepKey);
}

export function advanceTimeByDays(state, days) {
  const normalizedDays = Math.max(1, Math.floor(Number(days) || 0));
  return runTimeAdvance(state, normalizedDays, null);
}
