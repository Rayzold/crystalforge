import { renderEventChainPanel } from "./EventChainPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";
import { renderUiIcon } from "./UiIcons.js";

function renderChronicleIntro(state) {
  const latestChronicle =
    state.historyLog.find((entry) => entry.category === "Chronicle") ??
    state.historyLog[0] ??
    null;

  return `
    <section class="scene-panel scene-panel--chronicle-intro">
      <div class="chronicle-intro">
        <div class="chronicle-intro__copy">
          <p class="world-summary__eyebrow">Codex Chamber</p>
          <h2>The realm remembers in chapters.</h2>
          <p>Monthly stories, active disturbances, and the city's long memory are gathered here like illuminated pages instead of loose logs.</p>
        </div>
        <div class="chronicle-intro__feature">
          <div class="chronicle-intro__seal">${renderUiIcon("history", "Chronicle")}</div>
          <span>Latest Chronicle</span>
          <strong>${latestChronicle ? latestChronicle.title : "No monthly chapter yet"}</strong>
          <p>${latestChronicle ? latestChronicle.details : "Advance time into a new month to record the first chapter."}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderChroniclePage(state) {
  return {
    title: "The Chronicle",
    subtitle: "Events, chapters, and the realm's memory.",
    content: `
      ${renderChronicleIntro(state)}
      ${renderEventChainPanel(state)}
      ${renderHistoryPanel(state)}
    `,
    aside: `
      ${renderEventPanel(state)}
    `
  };
}
