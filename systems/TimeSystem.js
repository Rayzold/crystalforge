import { STEP_DURATIONS } from "../content/Config.js";
import { formatDate } from "./CalendarSystem.js";
import { recalculateCityStats } from "./CityStatsSystem.js";
import { advanceConstructionOneDay } from "./ConstructionSystem.js";
import { runCitizenPromotions } from "./CitizenSystem.js";
import { expireEvents, maybeTriggerHolidayEvents, maybeTriggerRandomEvents } from "./EventSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { applyDailyResources } from "./ResourceSystem.js";
import { applyTownFocusDailyEffects, updateTownFocusAvailability } from "./TownFocusSystem.js";

export function advanceTime(state, stepKey) {
  const days = STEP_DURATIONS[stepKey];
  const completions = [];
  const triggeredEvents = [];

  for (let index = 0; index < days; index += 1) {
    state.calendar.dayOffset += 1;
    const currentDate = formatDate(state.calendar.dayOffset);
    expireEvents(state);
    const completedToday = advanceConstructionOneDay(state, currentDate, state.calendar.dayOffset);
    completions.push(...completedToday);
    applyDailyResources(state);
    applyTownFocusDailyEffects(state);
    recalculateCityStats(state);
    runCitizenPromotions(state);
    updateTownFocusAvailability(state);
    triggeredEvents.push(...maybeTriggerHolidayEvents(state));
  }

  triggeredEvents.push(...maybeTriggerRandomEvents(state, stepKey));
  recalculateCityStats(state);

  for (const building of completions) {
    addHistoryEntry(state, {
      category: "Completion",
      title: building.displayName,
      details: `${building.displayName} completed on ${building.completedAt}.`
    });
  }

  if (days > 0) {
    addHistoryEntry(state, {
      category: "Time",
      title: "Time Advanced",
      details: `Advanced ${days} day(s) to ${formatDate(state.calendar.dayOffset)}.`
    });
  }

  return { days, completions, triggeredEvents };
}
