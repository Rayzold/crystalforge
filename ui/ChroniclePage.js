import { getNextHoliday } from "../systems/CalendarSystem.js?v=v1.7.20-20260627203042";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js?v=v1.7.20-20260627203042";
import { renderChronicleCalendar, renderChronicleNotesList, renderWeatherInfoPanel } from "./ChronicleCalendar.js?v=v1.7.20-20260627203042";
import { renderEventChainPanel } from "./EventChainPanel.js?v=v1.7.20-20260627203042";
import { renderEventPanel } from "./EventPanel.js?v=v1.7.20-20260627203042";
import { renderHistoryPanel } from "./HistoryPanel.js?v=v1.7.20-20260627203042";
import { renderUiIcon } from "./UiIcons.js?v=v1.7.20-20260627203042";

function renderChronicleIntro(state) {
  const latestChronicle =
    state.historyLog.find((entry) => entry.category === "Chronicle") ??
    state.historyLog[0] ??
    null;
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayGlyph = nextHoliday ? getHolidayGlyph(nextHoliday) : "✦";
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";

  return `
    <section class="scene-panel scene-panel--chronicle-intro">
      <div class="chronicle-intro">
        <div class="chronicle-intro__copy">
          <p class="world-summary__eyebrow">Codex Chamber</p>
          <h2>Chronicle</h2>
          <p>Events, history, and notes.</p>
        </div>
        <div class="chronicle-intro__rail">
          <div class="chronicle-intro__feature">
            <div class="chronicle-intro__seal">${renderUiIcon("history", "Chronicle")}</div>
            <span>Latest Chronicle</span>
            <strong>${latestChronicle ? latestChronicle.title : "No monthly chapter yet"}</strong>
            <p>${latestChronicle ? latestChronicle.date : "No chapter yet."}</p>
          </div>
          <button
            class="chronicle-intro__feature chronicle-intro__feature--holiday chronicle-intro__feature--interactive ${nextHolidayAccentClass}"
            type="button"
            data-action="select-chronicle-day"
            data-day-offset="${nextHoliday?.dayOffset ?? state.calendar.dayOffset}"
            data-highlight-jump="1"
            title="${nextHoliday ? `Jump to ${nextHoliday.name}` : "Open selected day in Chronicle"}"
          >
            <div class="chronicle-intro__seal chronicle-intro__seal--holiday"><span class="holiday-glyph" aria-hidden="true">${nextHolidayGlyph}</span></div>
            <span>Upcoming Holiday</span>
            <strong class="chronicle-intro__feature-title">${nextHoliday ? nextHoliday.name : "No holiday queued"}</strong>
            <p>
              ${
                nextHoliday
                  ? `${nextHoliday.daysUntil} day(s) · ${nextHoliday.date.weekday}, ${nextHoliday.date.month} ${nextHoliday.date.day}`
                  : "No upcoming holidays."
              }
            </p>
          </button>
        </div>
      </div>
    </section>
  `;
}

export function renderChroniclePage(state) {
  return {
    title: "The Chronicle",
    subtitle: "Calendar.",
    content: `
      ${renderChronicleIntro(state)}
      ${renderChronicleCalendar(state)}
      ${renderChronicleNotesList(state)}
      ${renderWeatherInfoPanel()}
      ${renderEventChainPanel(state)}
      ${renderHistoryPanel(state)}
    `,
    aside: `
      ${renderEventPanel(state)}
    `
  };
}
