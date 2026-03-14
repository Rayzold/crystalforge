import { escapeHtml } from "../engine/Utils.js";

export function renderHistoryPanel(state) {
  return `
    <section class="panel history-panel">
      <div class="panel__header">
        <h3>History Log</h3>
        <span class="panel__subtle">${state.historyLog.length} entries saved</span>
      </div>
      <div class="history-panel__list">
        ${
          state.historyLog.length
            ? state.historyLog
                .slice(0, 20)
                .map(
                  (entry) => `
                    <article class="history-entry">
                      <div class="history-entry__top">
                        <strong>${escapeHtml(entry.title)}</strong>
                        <span>${escapeHtml(entry.category)}</span>
                      </div>
                      <p>${escapeHtml(entry.details)}</p>
                      <small>${escapeHtml(entry.date)}</small>
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
