import { escapeHtml } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

function getHistoryIcon(category) {
  const icons = {
    Manifest: "forge",
    Event: "event",
    Chronicle: "history",
    Evolution: "route",
    "Crystal Upgrade": "mana",
    Citizens: "citizens"
  };
  return icons[category] ?? "history";
}

export function renderHistoryPanel(state) {
  const chronicles = state.historyLog.filter((entry) => entry.category === "Chronicle").slice(0, 4);
  const recent = state.historyLog.filter((entry) => entry.category !== "Chronicle").slice(0, 12);

  return `
    <section class="panel history-panel history-panel--codex">
      <div class="panel__header">
        <h3>Archive Ledger</h3>
        <span class="panel__subtle">${state.historyLog.length} entries saved</span>
      </div>
      ${
        chronicles.length
          ? `
            <div class="history-panel__chapter-strip">
              ${chronicles
                .map(
                  (entry) => `
                    <article class="history-entry history-entry--chapter">
                      <div class="history-entry__title-wrap">
                        ${renderUiIcon("history", entry.category)}
                        <div>
                          <strong>${escapeHtml(entry.title)}</strong>
                          <span>${escapeHtml(entry.date)}</span>
                        </div>
                      </div>
                      <p>${escapeHtml(entry.details)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
      <div class="history-panel__list">
        ${
          recent.length
            ? recent
                .map(
                  (entry) => `
                    <article class="history-entry history-entry--codex">
                      <div class="history-entry__top">
                        <div class="history-entry__title-wrap">
                          ${renderUiIcon(getHistoryIcon(entry.category), entry.category)}
                          <div>
                            <strong>${escapeHtml(entry.title)}</strong>
                            <span>${escapeHtml(entry.category)}</span>
                          </div>
                        </div>
                        <small>${escapeHtml(entry.date)}</small>
                      </div>
                      <p>${escapeHtml(entry.details)}</p>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">The forge remembers nothing yet.</p>`
        }
      </div>
    </section>
  `;
}
