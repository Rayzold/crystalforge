import { STEP_DURATIONS } from "../content/Config.js";
import { formatDate, getStructuredDate } from "./CalendarSystem.js";
import { recalculateCityStats } from "./CityStatsSystem.js";
import { advanceConstructionOneDay } from "./ConstructionSystem.js";
import { runCitizenPromotions } from "./CitizenSystem.js";
import { expireEvents, maybeTriggerHolidayEvents, maybeTriggerRandomEvents, processScheduledEvents } from "./EventSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { addMonthlyChronicleIfNeeded } from "./MonthlyChronicleSystem.js";
import { applyDailyResources } from "./ResourceSystem.js";
import { applyTownFocusDailyEffects, updateTownFocusAvailability } from "./TownFocusSystem.js";

export function advanceTime(state, stepKey) {
  const days = STEP_DURATIONS[stepKey];
  const completions = [];
  const triggeredEvents = [];

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
    const completedToday = advanceConstructionOneDay(state, currentDate, state.calendar.dayOffset);
    completions.push(...completedToday);
    for (const building of completedToday) {
      addHistoryEntry(state, {
        category: "Completion",
        title: building.displayName,
        details: `${building.displayName} completed on ${building.completedAt}.`
      });
    }
    applyDailyResources(state);
    applyTownFocusDailyEffects(state);
    recalculateCityStats(state);
    runCitizenPromotions(state);
    updateTownFocusAvailability(state);
    triggeredEvents.push(...processScheduledEvents(state));
    triggeredEvents.push(...maybeTriggerHolidayEvents(state));
  }

  triggeredEvents.push(...maybeTriggerRandomEvents(state, stepKey));
  recalculateCityStats(state);

  if (days > 0) {
    addHistoryEntry(state, {
      category: "Time",
      title: "Time Advanced",
      details: `Advanced ${days} day(s) to ${formatDate(state.calendar.dayOffset)}.`
    });
  }

  return { days, completions, triggeredEvents };
}
