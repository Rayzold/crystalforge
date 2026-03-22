import { escapeHtml, formatNumber } from "../engine/Utils.js";

function renderDeltaRows(deltas = []) {
  return deltas
    .map(
      (entry) => `
        <article class="turn-summary__delta turn-summary__delta--${entry.delta > 0 ? "positive" : entry.delta < 0 ? "negative" : "neutral"}">
          <span>${escapeHtml(entry.label)}</span>
          <strong>${entry.delta >= 0 ? "+" : ""}${formatNumber(entry.delta, 1)}</strong>
          <small>${formatNumber(entry.before, 0)} -> ${formatNumber(entry.after, 0)}</small>
        </article>
      `
    )
    .join("");
}

export function renderTurnSummaryModal(state) {
  const summary = state.transientUi?.turnSummaryModal ?? null;
  if (!summary) {
    return "";
  }

  return `
    <div class="modal-overlay">
      <button class="modal-overlay__dismiss" type="button" data-action="close-turn-summary" aria-label="Close turn summary"></button>
      <section class="modal-card turn-summary-modal" role="dialog" aria-modal="true" aria-labelledby="turn-summary-title">
        <button class="modal-card__close" type="button" data-action="close-turn-summary" aria-label="Close turn summary">x</button>
        <div class="turn-summary-modal__header">
          <span>Time Advanced</span>
          <h3 id="turn-summary-title">${summary.days} day${summary.days === 1 ? "" : "s"} passed</h3>
          <p>${escapeHtml(summary.dateLabel)}</p>
        </div>
        <div class="turn-summary-modal__body">
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>Resource Change</strong>
              <small>Actual stock movement over the turn</small>
            </div>
            <div class="turn-summary-modal__deltas">
              ${renderDeltaRows(summary.resourceDeltas)}
            </div>
          </section>
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>What Changed</strong>
              <small>New completions and pressure shifts</small>
            </div>
            <div class="turn-summary-modal__facts">
              <article>
                <span>Completed Buildings</span>
                <strong>${formatNumber(summary.completedBuildings.length, 0)}</strong>
                <small>${escapeHtml(summary.completedBuildings.length ? summary.completedBuildings.join(", ") : "No new completions this turn.")}</small>
              </article>
              <article>
                <span>Warnings</span>
                <strong>${formatNumber(summary.emergencyCount.after, 0)}</strong>
                <small>${escapeHtml(`Was ${summary.emergencyCount.before}, now ${summary.emergencyCount.after}`)}</small>
              </article>
              <article>
                <span>Recent Events</span>
                <strong>${formatNumber(summary.newEventTitles.length, 0)}</strong>
                <small>${escapeHtml(summary.newEventTitles.length ? summary.newEventTitles.join(", ") : "No new event records this turn.")}</small>
              </article>
            </div>
          </section>
        </div>
        <div class="turn-summary-modal__actions">
          <button class="button" type="button" data-action="close-turn-summary">Close</button>
        </div>
      </section>
    </div>
  `;
}
