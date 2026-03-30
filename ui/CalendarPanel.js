import { SPEED_MULTIPLIERS } from "../content/Config.js";
import { formatDate, getNextHoliday, getStructuredDate } from "../systems/CalendarSystem.js";
import { getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js";
import { renderConstructionQueuePanel } from "./ConstructionQueuePanel.js";

export function renderCalendarPanel(state, options = {}) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayGlyph = nextHoliday ? getHolidayGlyph(nextHoliday) : "✦";
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const townFocusAvailability = getTownFocusAvailability(state);
  const { showQueue = true, compact = false, hideControls = false, hideSpeedSelector = false } = options;

  return `
    <section class="panel calendar-panel ${compact ? "calendar-panel--compact" : ""}">
      <div class="panel__header">
        <h3>Session Clock</h3>
        <span class="panel__subtle">${date.season}</span>
      </div>
      <div class="calendar-panel__date">
        <strong>${formatDate(state.calendar.dayOffset)}</strong>
        <span>${date.holiday ? date.holiday.name : "No holiday today"}</span>
      </div>
      <a
        class="calendar-panel__focus calendar-panel__focus--holiday calendar-panel__focus--link ${nextHolidayAccentClass}"
        href="${nextHoliday ? `./chronicle.html?focusChronicleDay=${nextHoliday.dayOffset}` : "./chronicle.html"}"
        title="${nextHoliday ? `Open Chronicle on ${nextHoliday.name}` : "Open Chronicle"}"
      >
        <strong class="calendar-panel__focus-title"><span class="holiday-glyph" aria-hidden="true">${nextHolidayGlyph}</span>Next Holiday</strong>
        <span>
          ${
            nextHoliday
              ? `${nextHoliday.name} arrives in ${nextHoliday.daysUntil} day(s) on ${nextHoliday.date.weekday}, ${nextHoliday.date.month} ${nextHoliday.date.day}. ${nextHoliday.description}`
              : "No upcoming holidays found."
          }
        </span>
      </a>
      <div class="calendar-panel__focus ${townFocusAvailability.isSelectionPending ? "is-due" : ""}">
        <strong>Policy Council</strong>
        <span>
          ${
            townFocusAvailability.isSelectionPending
              ? "A new focus can be selected right now."
              : `${townFocusAvailability.daysUntilCouncil} day(s) until the next focus choice.`
          }
        </span>
      </div>
      ${
        hideControls
          ? ""
          : `
              <div class="time-controls">
                <button class="button button--ghost" data-action="advance-time" data-step="day">+1 Day</button>
                <button class="button button--ghost" data-action="advance-time" data-step="3days">+3 Days</button>
                <button class="button button--ghost" data-action="advance-time" data-step="week">+1 Week</button>
                <button class="button button--ghost" data-action="advance-time" data-step="month">+1 Month</button>
                <button class="button button--ghost" data-action="advance-time" data-step="year">+1 Year</button>
              </div>
              <div class="calendar-panel__custom">
                <label class="calendar-panel__custom-days">
                  Advance by Days
                  <input type="number" min="1" step="1" value="14" data-role="custom-days" />
                </label>
                <button class="button" data-action="advance-custom-time">Advance Custom Span</button>
              </div>
            `
      }
      ${
        hideSpeedSelector
          ? ""
          : `
              <label class="speed-selector">
                Raising Speed
                <select data-action="set-speed-multiplier">
                  ${SPEED_MULTIPLIERS.map(
                    (value) => `<option value="${value}" ${state.constructionSpeedMultiplier === value ? "selected" : ""}>${value}x</option>`
                  ).join("")}
                </select>
              </label>
            `
      }
      ${showQueue ? renderConstructionQueuePanel(state) : ""}
    </section>
  `;
}
