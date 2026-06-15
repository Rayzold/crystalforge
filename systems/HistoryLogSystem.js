import { MAX_HISTORY_ENTRIES } from "../content/Config.js?v=2.0.44-20260615090902";
import { formatDate } from "./CalendarSystem.js?v=2.0.44-20260615090902";

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
