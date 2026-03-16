import { escapeHtml } from "../engine/Utils.js";

export function renderEventPanel(state) {
  const focusedEventId = state.transientUi?.focusEventId ?? null;

  return `
    <section class="panel event-panel">
      <div class="panel__header">
        <h3>Events</h3>
        <span class="panel__subtle">${state.events.active.length} active / ${state.events.scheduled.length} queued</span>
      </div>
      <div class="event-panel__stack">
        ${
          state.events.active.length
            ? state.events.active
                .map(
                  (event) => `
                    <article class="event-card ${focusedEventId === event.id ? "is-highlighted" : ""}">
                      <h4>${escapeHtml(event.name)}</h4>
                      <p>${escapeHtml(event.description)}</p>
                      ${
                        event.sourceEventName
                          ? `<small>Chained from ${escapeHtml(event.sourceEventName)}</small>`
                          : ""
                      }
                      <span>${escapeHtml(event.type)} / ends ${escapeHtml(event.endsAt)}</span>
                    </article>
                  `
                )
                .join("")
            : `
                <div class="event-panel__empty empty-state">
                  <strong>Quiet Streets</strong>
                  <span>No active events. The city is quiet for now.</span>
                </div>
              `
        }
      </div>
      <div class="event-panel__recent">
        <h4>Recent</h4>
        <div class="event-panel__recent-list">
          ${
            state.events.recent.length
              ? state.events.recent
                  .slice(0, 6)
                  .map(
                    (event) => `
                      <div class="event-line ${focusedEventId === event.id ? "is-highlighted" : ""}">
                        <strong>${escapeHtml(event.name)}</strong>
                        <span>${escapeHtml(event.startedAt)}${event.sourceEventName ? ` / from ${escapeHtml(event.sourceEventName)}` : ""}</span>
                      </div>
                    `
                  )
                  .join("")
              : `<p class="event-panel__recent-empty empty-state">No recent disturbances have been recorded.</p>`
          }
        </div>
      </div>
    </section>
  `;
}
