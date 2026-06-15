// Chronicle calendar and day detail view.
// This page renders the in-world calendar, yearly events, weather, moon phases,
// notes, and stored city snapshots for each recorded date.
import { DAYS_PER_MONTH, YEARLY_EVENTS } from "../content/CalendarConfig.js?v=v1.7.20-20260615124155";
import { escapeHtml } from "../engine/Utils.js?v=v1.7.20-20260615124155";
import {
  addMonthsToOffset,
  dateFromParts,
  formatDate,
  getNextHoliday,
  getMonthDayOffsets,
  getMonthStartOffset,
  getStructuredDate,
  getWeatherForDay,
  WEATHER_BY_SEASON,
  DRAMATIC_WEATHER
} from "../systems/CalendarSystem.js?v=v1.7.20-20260615124155";
import { getDailyCitySnapshot } from "../systems/CitySnapshotSystem.js?v=v1.7.20-20260615124155";
import { getExpeditionCalendarEntries } from "../systems/ExpeditionSystem.js?v=v1.7.20-20260615124155";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js?v=v1.7.20-20260615124155";
import { renderUiIcon } from "./UiIcons.js?v=v1.7.20-20260615124155";

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
  // Override the deterministic weather with any persisted user roll. Reassigning
  // on the structured-date object keeps every downstream reader (tone, icon,
  // name, .chronicle-calendar__day-weather--tone modifier) working unchanged.
  date.weather = getWeatherForDay(state, dayOffset);
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
      ${/* The weekday (MOD / TID / GLI / …) is already shown as the column
            header above the grid, so repeating it on every card is just
            redundant noise. Dropped. */ ""}
      ${date.holiday ? `<span class="chronicle-calendar__day-holiday">${escapeHtml(date.holiday.name)}</span>` : ""}
      <span class="chronicle-calendar__day-weather chronicle-calendar__day-weather--${escapeHtml(date.weather.tone)}">${date.weather.icon} ${escapeHtml(date.weather.name)}</span>
      ${/* Meta strip only renders when there's something worth showing —
            either scheduled events or a saved note. Dropping the "Quiet"
            filler that used to fire on every empty day so the grid stays
            clean on a campaign that hasn't booked anything yet. */ ""}
      ${(eventCount > 0 || noteText)
        ? `<span class="chronicle-calendar__day-meta">
            ${eventCount ? `<em>${eventCount} event${eventCount === 1 ? "" : "s"}</em>` : ""}
            ${noteText ? `<strong>Note</strong>` : ""}
          </span>`
        : ""}
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

// Renders every non-empty player note chronologically as a single scrollable
// list. The calendar grid above only shows one day at a time, so once a
// campaign accumulates dozens of sessions the GM has no way to see them all
// in one place. This block fills that gap — each row is a date header + the
// note body, click the header to jump the calendar selection to that day.
export function renderChronicleNotesList(state) {
  const notes = state.chronicleNotes ?? {};
  const today = state.calendar?.dayOffset ?? 0;

  // Pull only entries with real content (ignore whitespace-only). Sort by
  // day offset descending so the most recent session is on top, matching
  // the way most journals are read.
  const entries = Object.entries(notes)
    .map(([rawOffset, text]) => ({
      dayOffset: Number(rawOffset),
      text: String(text ?? "")
    }))
    .filter((entry) => Number.isFinite(entry.dayOffset) && entry.text.trim().length > 0)
    .sort((left, right) => right.dayOffset - left.dayOffset);

  return `
    <section class="panel chronicle-notes-list">
      <div class="panel__header">
        <div>
          <h3>Player Notes — All Entries</h3>
          <span class="panel__subtle">Every saved note, newest first. Click a date to jump the calendar to that day.</span>
        </div>
        <div class="chronicle-notes-list__tools">
          <span class="chronicle-notes-list__count">
            ${entries.length} ${entries.length === 1 ? "entry" : "entries"}
          </span>
          <button
            class="button button--ghost chronicle-notes-list__export"
            type="button"
            data-action="export-chronicle-notes"
            ${entries.length === 0 ? "disabled" : ""}
            title="Copy every saved note to the clipboard as plain text"
          >📋 Export</button>
        </div>
      </div>

      ${
        entries.length === 0
          ? `<p class="chronicle-notes-list__empty">No saved notes yet. Pick a day on the calendar above, write something in the Player Notes panel, and press Save Note to start the journal.</p>`
          : `
            <ol class="chronicle-notes-list__items">
              ${entries.map((entry) => {
                const date = getStructuredDate(entry.dayOffset);
                const isToday = entry.dayOffset === today;
                const isFuture = entry.dayOffset > today;
                const flag = isToday ? "Today" : isFuture ? "Upcoming" : "Past";
                const flagClass = isToday ? "is-today" : isFuture ? "is-future" : "is-past";
                // Short numeric form, e.g. "5/4/1218" — day/monthIndex+1/year.
                // monthIndex is 0-based in state, so add 1 to get the human
                // month number (1-12) that matches the printed calendar order.
                const shortDate = `${date.day}/${date.monthIndex + 1}/${date.year}`;
                return `
                  <li class="chronicle-notes-list__item">
                    <button
                      type="button"
                      class="chronicle-notes-list__date"
                      data-action="select-chronicle-day"
                      data-day-offset="${entry.dayOffset}"
                      data-highlight-jump="1"
                      title="Jump the calendar to this day"
                    >
                      <span class="chronicle-notes-list__date-day">
                        ${escapeHtml(date.weekday)}, ${escapeHtml(date.month)} ${escapeHtml(String(date.day))}
                      </span>
                      <span class="chronicle-notes-list__date-short">${escapeHtml(shortDate)}</span>
                      <span class="chronicle-notes-list__date-year">
                        Year ${escapeHtml(String(date.year))} AC
                      </span>
                      <span class="chronicle-notes-list__date-flag ${flagClass}">${flag}</span>
                    </button>
                    <div class="chronicle-notes-list__body">${escapeHtml(entry.text)}</div>
                  </li>
                `;
              }).join("")}
            </ol>
          `
      }
    </section>
  `;
}

export function renderChronicleCalendar(state) {
  const displayMonthOffset = getDisplayMonthOffset(state);
  const monthOffsets = getMonthDayOffsets(displayMonthOffset);
  const displayDate = getStructuredDate(displayMonthOffset);
  // Make sure the day-detail panel below the grid also reflects any user
  // override of the selected day's weather.
  displayDate.weather = getWeatherForDay(state, displayMonthOffset);
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const selectedDayOffset = getSelectedDayOffset(state, displayMonthOffset);
  const selectedDate = getStructuredDate(selectedDayOffset);
  selectedDate.weather = getWeatherForDay(state, selectedDayOffset);
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
          <button
            class="button button--ghost chronicle-calendar__roll"
            type="button"
            data-action="randomize-month-weather"
            data-month-offset="${displayMonthOffset}"
            title="Roll a season-appropriate weather streak for every day of this month — 70% calm, 30% dramatic, with persistence so conditions linger for a few days."
          >🎲 Randomize Weather</button>
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

// Information panel for weather. Two parts:
//   1. Calm conditions — per-season grid, the everyday weather that fills
//      ~70% of days.
//   2. Dramatic phenomena — the global 20-entry catalogue from the Scarred
//      Lands sourcebook. Each entry has the full GM dossier: nav level
//      badge, monster range, description, signs, gear, drifter quote.
// The randomizer draws from both pools using the streak rules.
export function renderWeatherInfoPanel() {
  const seasons = Object.entries(WEATHER_BY_SEASON);
  const dramaticTotal = DRAMATIC_WEATHER.length;
  return `
    <section class="panel weather-info">
      <div class="panel__header">
        <div>
          <h3>Weather Conditions</h3>
          <span class="panel__subtle">Calm seasonal weather fills the ~70% of days that aren't dramatic. The 20 dramatic phenomena are global Scarred Lands events — storms, time rifts, and worse.</span>
        </div>
        <div class="weather-info__legend">
          <span class="weather-info__legend-tag weather-info__legend-tag--calm">Calm · ~70%</span>
          <span class="weather-info__legend-tag weather-info__legend-tag--dramatic">Dramatic · ~30%</span>
        </div>
      </div>

      <h4 class="weather-info__section-title">Calm Conditions <small>by season</small></h4>
      <div class="weather-info__seasons">
        ${seasons.map(([season, conditions]) => `
          <article class="weather-info__season">
            <header class="weather-info__season-head">
              <h4>${escapeHtml(season)}</h4>
              <span>${conditions.length} calm condition${conditions.length === 1 ? "" : "s"}</span>
            </header>
            <ul class="weather-info__list">
              ${conditions.map((entry) => `
                <li class="weather-info__row weather-info__row--calm">
                  <span class="weather-info__icon" aria-hidden="true">${entry.icon}</span>
                  <div class="weather-info__body">
                    <strong>${escapeHtml(entry.name)}</strong>
                    <small>Tone: ${escapeHtml(entry.tone)}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          </article>
        `).join("")}
      </div>

      <h4 class="weather-info__section-title">Dramatic Phenomena <small>${dramaticTotal} global events</small></h4>
      <div class="weather-info__dramatic-grid">
        ${DRAMATIC_WEATHER.map((entry) => `
          <article class="weather-info__phenomenon weather-info__phenomenon--nav-${escapeHtml(entry.navLevel.toLowerCase())}">
            <header class="weather-info__phenomenon-head">
              <span class="weather-info__phenomenon-icon" aria-hidden="true">${entry.icon}</span>
              <div class="weather-info__phenomenon-titles">
                <strong>${escapeHtml(entry.name)}</strong>
                <span>Nav ${escapeHtml(entry.navLevel)} · Monsters ${escapeHtml(entry.monsterRange)}</span>
              </div>
              <span class="weather-info__nav-badge weather-info__nav-badge--${escapeHtml(entry.navLevel.toLowerCase())}">${escapeHtml(entry.navLevel)}</span>
            </header>
            <p class="weather-info__phenomenon-desc">${escapeHtml(entry.description)}</p>
            <dl class="weather-info__phenomenon-meta">
              <div><dt>Signs</dt><dd>${escapeHtml(entry.signs)}</dd></div>
              <div><dt>Gear</dt><dd>${escapeHtml(entry.gear)}</dd></div>
            </dl>
            <blockquote class="weather-info__phenomenon-quote">${escapeHtml(entry.quote)}</blockquote>
          </article>
        `).join("")}
      </div>

      <p class="weather-info__footnote">
        Streak rules: a calm day repeats 65%, swaps to another calm 25%, or breaks dramatic 10%. A dramatic day repeats 55%, swaps to another dramatic 20%, or breaks back to calm 25%. When the city crosses into the last week of a month, the next month's weather is rolled in automatically. Nav letters mark sourcebook navigation difficulty (D Drizzle → C Cyclone → B Blizzard → A Avalanche → S Scarring).
      </p>
    </section>
  `;
}
