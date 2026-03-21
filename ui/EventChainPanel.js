import { EVENT_POOLS } from "../content/EventPools.js";
import { escapeHtml } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";

function getEventName(eventId) {
  return EVENT_POOLS.find((event) => event.id === eventId)?.name ?? eventId;
}

export function renderEventChainPanel(state) {
  const scheduled = [...state.events.scheduled].sort((left, right) => left.triggerDayOffset - right.triggerDayOffset).slice(0, 6);
  const resolved = state.events.recent.filter((event) => event.sourceEventName).slice(0, 4);

  return `
    <section class="panel event-chain-panel">
      <div class="panel__header">
        <h3>Chain Threads</h3>
        <span class="panel__subtle">${scheduled.length} pending / ${resolved.length} resolved</span>
      </div>

      <div class="event-chain-panel__group">
        <h4>Upcoming Echoes</h4>
        ${
          scheduled.length
            ? scheduled
                .map(
                  (entry) => `
                    <article class="event-chain-card">
                      <span>${escapeHtml(formatDate(entry.triggerDayOffset))}</span>
                      <strong>${escapeHtml(entry.sourceEventName)} -> ${escapeHtml(getEventName(entry.eventId))}</strong>
                      <p>Chain chance ${Math.round((entry.chance ?? 1) * 100)}%</p>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">No chained events are waiting in the near future.</p>`
        }
      </div>

      <div class="event-chain-panel__group">
        <h4>Recent Echoes</h4>
        ${
          resolved.length
            ? resolved
                .map(
                  (event) => `
                    <article class="event-chain-card event-chain-card--resolved">
                      <span>${escapeHtml(event.startedAt)}</span>
                      <strong>${escapeHtml(event.sourceEventName)} -> ${escapeHtml(event.name)}</strong>
                      <p>${escapeHtml(event.description)}</p>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">No recent event chain links have resolved yet.</p>`
        }
      </div>
    </section>
  `;
}
