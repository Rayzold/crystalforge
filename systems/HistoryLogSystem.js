import { MAX_HISTORY_ENTRIES } from "../content/Config.js?v=v1.7.20-20260623073844";
import { formatDate } from "./CalendarSystem.js?v=v1.7.20-20260623073844";

export function addHistoryEntry(state, entry) {
  state.historyLog.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: entry.date ?? formatDate(state.calendar.dayOffset),
    dayOffset: entry.dayOffset ?? state.calendar.dayOffset,
    category: entry.category,
    title: entry.title,
    details: entry.details
  });
  state.historyLog = state.historyLog.slice(0, MAX_HISTORY_ENTRIES);
}
