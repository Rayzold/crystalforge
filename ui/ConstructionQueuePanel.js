import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import {
  getActiveConstructionQueue,
  getBuildingDailyRate,
  getConstructionQueue,
  getDriftConstructionSlots
} from "../systems/ConstructionSystem.js";

function renderQueueItem(state, building, index, activeCount) {
  const isActive = index < activeCount;
  const rate = isActive ? getBuildingDailyRate(building, state) : 0;
  const remaining = Math.max(0, 100 - building.quality);
  const daysRemaining = isActive && rate > 0 ? Math.ceil(remaining / rate) : null;
  const eta = isActive && daysRemaining !== null ? formatDate(state.calendar.dayOffset + daysRemaining) : "Waiting";

  return `
    <article class="construction-queue__item ${isActive ? "is-active" : "is-queued"}">
      <div class="construction-queue__meta">
        <div class="construction-queue__heading">
          <span class="construction-queue__slot">${isActive ? `Raising now / slot ${index + 1}` : `Queued / #${index + 1}`}</span>
          <strong>${escapeHtml(building.displayName)}</strong>
        </div>
        <small>${escapeHtml(building.rarity)} / ${formatNumber(building.quality, 2)}%</small>
        <small>${isActive ? `${formatNumber(rate, 2)}% per day / ETA ${escapeHtml(eta)}` : "Will begin when a Drift slot opens."}</small>
      </div>
      <div class="construction-queue__actions">
        <button class="button button--ghost" data-action="prioritize-construction" data-direction="top" data-building-id="${building.id}">Raise Now</button>
        <button class="button button--ghost" data-action="prioritize-construction" data-direction="up" data-building-id="${building.id}" ${index === 0 ? "disabled" : ""}>Up</button>
        <button class="button button--ghost" data-action="prioritize-construction" data-direction="down" data-building-id="${building.id}" ${index === activeCount - 1 && isActive ? "" : ""} ${index === getConstructionQueue(state).length - 1 ? "disabled" : ""}>Down</button>
      </div>
    </article>
  `;
}

export function renderConstructionQueuePanel(state) {
  const queue = getConstructionQueue(state);
  const activeQueue = getActiveConstructionQueue(state);
  const slots = getDriftConstructionSlots(state);

  return `
    <section class="panel construction-queue-panel">
      <div class="panel__header">
        <h3>Drift Raising Queue</h3>
        <span class="panel__subtle">${activeQueue.length} active / ${slots} slots</span>
      </div>
      ${
        queue.length
          ? `
              <div class="construction-queue">
                ${queue.map((building, index) => renderQueueItem(state, building, index, activeQueue.length)).join("")}
              </div>
            `
          : `<p class="empty-state">All manifested buildings at or above 100%. The Drift is not raising any new structures right now.</p>`
      }
    </section>
  `;
}
