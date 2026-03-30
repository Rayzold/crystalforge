// Chronicle calendar and day detail view.
// This page renders the in-world calendar, yearly events, weather, moon phases,
// notes, and stored city snapshots for each recorded date.
import { DAYS_PER_MONTH, YEARLY_EVENTS } from "../content/CalendarConfig.js";
import { escapeHtml } from "../engine/Utils.js";
import {
  addMonthsToOffset,
  dateFromParts,
  formatDate,
  getNextHoliday,
  getMonthDayOffsets,
  getMonthStartOffset,
  getStructuredDate
} from "../systems/CalendarSystem.js";
import { getDailyCitySnapshot } from "../systems/CitySnapshotSystem.js";
import { getExpeditionCalendarEntries } from "../systems/ExpeditionSystem.js";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js";
import { renderUiIcon } from "./UiIcons.js";

const WEEKDAY_ORDER = ["Moonday", "Tidesday", "Glimmerday", "Dreamday", "Soothingday", "Dazzleday", "Sunburstday"];

function getDisplayMonthOffset(state) {
  const fallback = getMonthStartOffset(state.calendar.dayOffset);
  const requested = Number(state.transientUi?.chronicleMonthOffset);
  return Number.isFinite(requested) ? getMonthStartOffset(requested) : fallback;
}

function getSelectedDayOffset(state, displayMonthOffset) {
  const requested = Number(state.transientUi?.chronicleSelectedDayOffset);
  if (Number.isFinite(requested)) {
    return requested;
  }
  const today = state.calendar.dayOffset;
  const monthStart = getMonthStartOffset(today);
  return monthStart === displayMonthOffset ? today : displayMonthOffset;
}

function collectEventsForMonth(state, monthOffsets) {
  const monthStart = monthOffsets[0];
  const monthEnd = monthOffsets[monthOffsets.length - 1];
  const grouped = Object.fromEntries(monthOffsets.map((offset) => [offset, []]));
  const seenKeys = new Set();
  const sourceGroups = [
    state.events.active ?? [],
    state.events.scheduled ?? [],
    state.events.recent ?? []
  ];

  for (const group of sourceGroups) {
    for (const event of group) {
      const start = Number(event.startedDayOffset);
      const end = Number(event.endsDayOffset);
      const resolvedStart = Number.isFinite(start) ? start : null;
      const resolvedEnd = Number.isFinite(end) ? end : resolvedStart;
      if (resolvedStart === null) {
        continue;
      }

      const keyBase = event.id ?? `${event.name}-${resolvedStart}-${resolvedEnd ?? resolvedStart}`;
      const rangeStart = Math.max(monthStart, resolvedStart);
      const rangeEnd = Math.min(monthEnd, resolvedEnd ?? resolvedStart);

      for (let dayOffset = rangeStart; dayOffset <= rangeEnd; dayOffset += 1) {
        const dayKey = `${keyBase}-${dayOffset}`;
        if (seenKeys.has(dayKey) || !grouped[dayOffset]) {
          continue;
        }
        seenKeys.add(dayKey);
        grouped[dayOffset].push(event);
      }
    }
  }

  const historyEntries = (state.historyLog ?? []).filter((entry) => ["Expedition", "Unique Citizen"].includes(entry.category));
  for (const entry of historyEntries) {
    const dayOffset = Number(entry.dayOffset);
    if (!Number.isFinite(dayOffset) || !grouped[dayOffset]) {
      continue;
    }
    grouped[dayOffset].push({
      id: entry.id,
      name: entry.title,
      type: entry.category,
      description: entry.details
    });
  }

  for (const entry of getExpeditionCalendarEntries(state)) {
    const dayOffset = Number(entry.dayOffset);
    if (!Number.isFinite(dayOffset) || !grouped[dayOffset]) {
      continue;
    }
    grouped[dayOffset].push(entry);
  }

  return grouped;
}

function getDaysUntilYearlyEvent(state, displayYear, event) {
  let targetDayOffset = dateFromParts(displayYear, event.month, event.day);
  if (targetDayOffset === null) {
    return null;
  }

  if (targetDayOffset < state.calendar.dayOffset) {
    targetDayOffset = dateFromParts(displayYear + 1, event.month, event.day);
  }

  if (targetDayOffset === null) {
    return null;
  }

  return Math.max(0, targetDayOffset - state.calendar.dayOffset);
}

function renderDayCell(state, dayOffset, selectedDayOffset, eventsByDay) {
  const date = getStructuredDate(dayOffset);
  const eventCount = eventsByDay[dayOffset]?.length ?? 0;
  const noteText = state.chronicleNotes?.[String(dayOffset)] ?? "";
  const isToday = dayOffset === state.calendar.dayOffset;
  const isSelected = dayOffset === selectedDayOffset;
  const isJumpHighlighted = dayOffset === state.transientUi?.chronicleJumpHighlightDay;

  return `
    <button
      class="chronicle-calendar__day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${isJumpHighlighted ? "is-jump-highlight" : ""} ${date.holiday ? `is-holiday ${getHolidayTypeClass(date.holiday, "chronicle-calendar__day--")}` : ""}"
      type="button"
      data-action="select-chronicle-day"
      data-day-offset="${dayOffset}"
      aria-pressed="${isSelected ? "true" : "false"}"
    >
      <div class="chronicle-calendar__day-topline">
        <span class="chronicle-calendar__day-number">${date.day}</span>
        <span class="chronicle-calendar__day-moon" title="${escapeHtml(date.moonPhase.name)}">${date.moonPhase.icon}</span>
      </div>
      <span class="chronicle-calendar__day-weekday">${escapeHtml(date.weekday.slice(0, 3))}</span>
      ${date.holiday ? `<span class="chronicle-calendar__day-holiday">${escapeHtml(date.holiday.name)}</span>` : ""}
      <span class="chronicle-calendar__day-weather chronicle-calendar__day-weather--${escapeHtml(date.weather.tone)}">${date.weather.icon} ${escapeHtml(date.weather.name)}</span>
      <span class="chronicle-calendar__day-meta">
        ${eventCount ? `<em>${eventCount} event${eventCount === 1 ? "" : "s"}</em>` : `<em>Quiet</em>`}
        ${noteText ? `<strong>Note</strong>` : ""}
      </span>
    </button>
  `;
}

function renderYearlyEventsStrip(state, displayDate) {
  const monthEvents = YEARLY_EVENTS.filter((event) => event.month === displayDate.month);
  if (!monthEvents.length) {
    return "";
  }

  return `
    <section class="chronicle-calendar__yearly-events">
      <div class="chronicle-calendar__section-title">
        ${renderUiIcon("calendar", "Yearly Events")}
        <span>Yearly Events In ${escapeHtml(displayDate.month)}</span>
      </div>
      <div class="chronicle-calendar__yearly-events-list">
        ${monthEvents
          .map(
            (event) => {
              const eventDayOffset = dateFromParts(displayDate.year, event.month, event.day);
              const daysUntil = getDaysUntilYearlyEvent(state, displayDate.year, event);
              return `
              <button
                class="chronicle-calendar__yearly-event ${getHolidayTypeClass(event, "chronicle-calendar__day--")}" 
                type="button"
                data-action="select-chronicle-day"
                data-day-offset="${eventDayOffset ?? ""}"
                data-highlight-jump="1"
                title="Open ${escapeHtml(event.name)} in the calendar"
              >
                <div class="chronicle-calendar__yearly-event-head">
                  <span class="holiday-glyph" aria-hidden="true">${getHolidayGlyph(event)}</span>
                  <strong>${escapeHtml(event.name)}</strong>
                  ${daysUntil === null ? "" : `<em class="chronicle-calendar__yearly-event-badge">${daysUntil === 0 ? "Today" : `${daysUntil}d`}</em>`}
                </div>
                <span>${escapeHtml(`${event.month} ${event.day}`)}</span>
                <small>${escapeHtml(event.description ?? "A fixed date in the Drift calendar.")}</small>
              </button>
            `;
            }
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderChronicleCalendar(state) {
  const displayMonthOffset = getDisplayMonthOffset(state);
  const monthOffsets = getMonthDayOffsets(displayMonthOffset);
  const displayDate = getStructuredDate(displayMonthOffset);
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const selectedDayOffset = getSelectedDayOffset(state, displayMonthOffset);
  const selectedDate = getStructuredDate(selectedDayOffset);
  const selectedSnapshot = getDailyCitySnapshot(state, selectedDayOffset);
  const eventsByDay = collectEventsForMonth(state, monthOffsets);
  const selectedEvents = eventsByDay[selectedDayOffset] ?? [];
  const selectedNote = state.chronicleNotes?.[String(selectedDayOffset)] ?? "";
  const prevMonthOffset = addMonthsToOffset(displayMonthOffset, -1);
  const nextMonthOffset = addMonthsToOffset(displayMonthOffset, 1);

  return `
    <section class="panel chronicle-calendar">
      <div class="panel__header chronicle-calendar__header">
        <div>
          <h3>Calendar Ledger</h3>
          <span class="panel__subtle">Track events and player notes by day.</span>
        </div>
        <div class="chronicle-calendar__month-nav">
          ${
            nextHoliday
              ? `<button class="button button--ghost chronicle-calendar__jump-link ${nextHolidayAccentClass}" type="button" data-action="select-chronicle-day" data-day-offset="${nextHoliday.dayOffset}" data-highlight-jump="1">${escapeHtml(`Next Holiday · ${nextHoliday.daysUntil === 0 ? "Today" : `${nextHoliday.daysUntil}d`} · ${nextHoliday.name}`)}</button>`
              : ""
          }
          <button class="button button--ghost" type="button" data-action="chronicle-prev-month" data-month-offset="${prevMonthOffset}">Previous</button>
          <strong>${escapeHtml(displayDate.month)} / Year ${displayDate.year} AC</strong>
          <button class="button button--ghost" type="button" data-action="chronicle-next-month" data-month-offset="${nextMonthOffset}">Next</button>
        </div>
      </div>

      <div class="chronicle-calendar__frame">
        ${renderYearlyEventsStrip(state, displayDate)}
        <div class="chronicle-calendar__weekdays">
          ${WEEKDAY_ORDER.map((weekday) => `<span>${escapeHtml(weekday.slice(0, 3))}</span>`).join("")}
        </div>

        <div class="chronicle-calendar__grid">
          ${monthOffsets.map((dayOffset) => renderDayCell(state, dayOffset, selectedDayOffset, eventsByDay)).join("")}
        </div>
      </div>

      <div class="chronicle-calendar__detail">
        <div class="chronicle-calendar__detail-head">
          <div>
            <span class="chronicle-calendar__detail-label">Selected Day</span>
            <h4>${escapeHtml(formatDate(selectedDayOffset))}</h4>
          </div>
          <div class="chronicle-calendar__detail-badges">
            <button class="button button--ghost" type="button" data-action="copy-chronicle-day-summary" data-day-offset="${selectedDayOffset}">Copy Day Summary</button>
            <span>${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}</span>
            ${
              selectedDate.holiday
                ? `<span class="is-holiday">${escapeHtml(selectedDate.holiday.name)}</span>`
                : `<span>${escapeHtml(selectedDate.season)}</span>`
            }
          </div>
        </div>

        <div class="chronicle-calendar__detail-conditions">
          <article class="chronicle-calendar__detail-condition">
            <span>Moon Phase</span>
            <strong>${selectedDate.moonPhase.icon} ${escapeHtml(selectedDate.moonPhase.name)}</strong>
          </article>
          <article class="chronicle-calendar__detail-condition chronicle-calendar__detail-condition--${escapeHtml(selectedDate.weather.tone)}">
            <span>Weather</span>
            <strong>${selectedDate.weather.icon} ${escapeHtml(selectedDate.weather.name)}</strong>
          </article>
          <article class="chronicle-calendar__detail-condition">
            <span>City Condition</span>
            <strong>${escapeHtml(selectedSnapshot?.conditions?.join(" / ") ?? "No snapshot recorded")}</strong>
          </article>
          <article class="chronicle-calendar__detail-condition">
            <span>Resource Trend</span>
            <strong>${
              selectedSnapshot
                ? escapeHtml(`G ${selectedSnapshot.deltas.gold >= 0 ? "+" : ""}${selectedSnapshot.deltas.gold.toFixed(1)} / F ${selectedSnapshot.deltas.food >= 0 ? "+" : ""}${selectedSnapshot.deltas.food.toFixed(1)}`)
                : "Unavailable"
            }</strong>
          </article>
        </div>

        ${
          selectedSnapshot
            ? `
              <div class="chronicle-calendar__city-snapshot">
                <div class="chronicle-calendar__section-title">
                  ${renderUiIcon("route", "City Snapshot")}
                  <span>City Snapshot</span>
                </div>
                <div class="chronicle-calendar__city-snapshot-grid">
                  <article><span>Morale</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.cityStats.morale)))}</strong></article>
                  <article><span>Health</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.cityStats.health)))}</strong></article>
                  <article><span>Defense</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.cityStats.defense)))}</strong></article>
                  <article><span>Security</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.cityStats.security)))}</strong></article>
                  <article><span>Population</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.resources.population)))}</strong></article>
                  <article><span>Support</span><strong>${escapeHtml(String(Math.round(selectedSnapshot.cityStats.populationSupport)))}</strong></article>
                </div>
                ${
                  selectedSnapshot.emergencies?.length
                    ? `<p class="chronicle-calendar__snapshot-alerts">Warnings: ${escapeHtml(selectedSnapshot.emergencies.join(", "))}</p>`
                    : `<p class="chronicle-calendar__snapshot-alerts">No emergency warnings were recorded for this day.</p>`
                }
              </div>
            `
            : ""
        }

        <div class="chronicle-calendar__detail-grid">
          <div class="chronicle-calendar__events">
            <div class="chronicle-calendar__section-title">
              ${renderUiIcon("event", "Events")}
              <span>Recorded Events</span>
            </div>
            ${
              selectedEvents.length
                ? selectedEvents
                    .map(
                      (event) => `
                        <article class="chronicle-calendar__event">
                          <strong>${escapeHtml(event.name)}</strong>
                          <span>${escapeHtml(event.type)}${event.endsAt ? ` / until ${escapeHtml(event.endsAt)}` : ""}</span>
                          <p>${escapeHtml(event.description)}</p>
                        </article>
                      `
                    )
                    .join("")
                : `<p class="chronicle-calendar__empty">No events are recorded for this day.</p>`
            }
          </div>

          <div class="chronicle-calendar__notes">
            <div class="chronicle-calendar__section-title">
              ${renderUiIcon("history", "Notes")}
              <span>Player Notes</span>
            </div>
            <textarea
              class="chronicle-calendar__note-input"
              data-role="chronicle-note"
              data-day-offset="${selectedDayOffset}"
              rows="7"
              placeholder="Add player notes, session beats, or GM reminders for this day..."
            >${escapeHtml(selectedNote)}</textarea>
            <div class="chronicle-calendar__note-actions">
              <button class="button" type="button" data-action="save-chronicle-note" data-day-offset="${selectedDayOffset}">Save Note</button>
              <small>${selectedNote.trim() ? "Saved note will overwrite the current entry for this day." : `Notes for ${DAYS_PER_MONTH}-day months are stored permanently in the save.`}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
