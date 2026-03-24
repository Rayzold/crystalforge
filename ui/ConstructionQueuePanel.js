import { getBuildingEmoji } from "../content/BuildingCatalog.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import {
  getActiveConstructionQueue,
  getAvailableConstructionQueue,
  getConstructionEtaDetails,
  getConstructionQueue,
  getDriftConstructionSlots
} from "../systems/ConstructionSystem.js";

function renderQueueItem(state, building, index, activeCount) {
  const isActive = index < activeCount;
  const etaDetails = getConstructionEtaDetails(building, state);
  const eta = etaDetails?.readyDayOffset !== null ? formatDate(etaDetails.readyDayOffset) : "Stalled";
  const workforceSupportReadout = Number(etaDetails?.workforceSupportBpd ?? 0) > 0 ? ` / Staff +${formatNumber(etaDetails.workforceSupportBpd, 1)} BPD` : "";

  return `
    <article class="construction-queue__item ${isActive ? "is-active" : "is-queued"}" title="${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}">
      <div class="construction-queue__meta">
        <div class="construction-queue__heading">
          <span class="construction-queue__slot">${isActive ? `Raising now / slot ${index + 1}` : `Queued / #${index + 1}`}</span>
          <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
        </div>
        <small>${escapeHtml(building.rarity)} / ${formatNumber(building.quality, 2)}% quality</small>
        <small>${
          isActive
            ? etaDetails.isStalled
              ? `Stalled / ${escapeHtml(etaDetails.stallReasons.join(", ") || "incubation is offline")}`
              : `${formatNumber(etaDetails.totalBpd, 1)} build points/day${workforceSupportReadout} / ${formatNumber(etaDetails.dailyPercent, 2)}% quality per day / ${formatNumber(etaDetails.daysRemaining, 1)} day${etaDetails.daysRemaining === 1 ? "" : "s"} / Ready ${escapeHtml(eta)}`
            : etaDetails.isStalled
              ? `If activated: stalled / ${escapeHtml(etaDetails.stallReasons.join(", ") || "incubation is offline")}`
              : `If activated: ${formatNumber(etaDetails.totalBpd, 1)} build points/day${workforceSupportReadout} / ${formatNumber(etaDetails.daysRemaining, 1)} day${etaDetails.daysRemaining === 1 ? "" : "s"} / Ready ${escapeHtml(eta)}`
        }</small>
      </div>
      <div class="construction-queue__actions">
        <button class="button button--ghost" data-action="${isActive ? "pause-construction" : "activate-construction"}" data-building-id="${building.id}">${isActive ? "Cancel" : "Activate"}</button>
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
  const availableQueue = getAvailableConstructionQueue(state);
  const slots = getDriftConstructionSlots(state);

  return `
    <section class="panel construction-queue-panel">
      <div class="panel__header">
        <h3>Drift Raising Queue</h3>
        <span class="panel__subtle">${activeQueue.length} active / ${slots} slots / ${availableQueue.length} waiting</span>
      </div>
      ${
        queue.length
          ? `
              <div class="construction-queue">
                ${queue.map((building, index) => renderQueueItem(state, building, index, activeQueue.length)).join("")}
              </div>
            `
          : `<div class="empty-state empty-state--action"><p>All buildings are already active at 100%+ quality. The Drift is not raising any new structures right now.</p><a class="button button--ghost" href="./forge.html">Open Forge</a></div>`
      }
    </section>
  `;
}
