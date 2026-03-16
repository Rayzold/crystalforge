import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderEventChainPanel } from "./EventChainPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";

export function renderChroniclePage(state) {
  return {
    title: "The Chronicle",
    subtitle: "Advance the fantasy calendar, watch events unfold, and review the long memory of your city.",
    content: `
      ${renderCalendarPanel(state)}
      ${renderEventChainPanel(state)}
      ${renderHistoryPanel(state)}
    `,
    aside: `
      ${renderEventPanel(state)}
    `
  };
}
