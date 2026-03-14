import { escapeHtml } from "../engine/Utils.js";

export function renderEventPanel(state) {
  return `
    <section class="panel event-panel">
      <div class="panel__header">
        <h3>Events</h3>
        <span class="panel__subtle">${state.events.active.length} active</span>
      </div>
      <div class="event-panel__stack">
        ${
          state.events.active.length
            ? state.events.active
                .map(
                  (event) => `
                    <article class="event-card">
                      <h4>${escapeHtml(event.name)}</h4>
                      <p>${escapeHtml(event.description)}</p>
                      <span>${escapeHtml(event.type)} / ends ${escapeHtml(event.endsAt)}</span>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">No active events. The city is quiet for now.</p>`
        }
      </div>
      <div class="event-panel__recent">
        <h4>Recent</h4>
        <div class="event-panel__recent-list">
          ${state.events.recent
            .slice(0, 6)
            .map(
              (event) => `
                <div class="event-line">
                  <strong>${escapeHtml(event.name)}</strong>
                  <span>${escapeHtml(event.startedAt)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}
