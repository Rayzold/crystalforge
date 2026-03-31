import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

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

function renderChangeFacts(summary) {
  const items = [
    {
      label: "Completed Buildings",
      icon: "completed",
      count: summary.completedBuildings.length,
      detail: summary.completedBuildings.length ? summary.completedBuildings.join(", ") : "No new completions this turn."
    },
    {
      label: "New Legends",
      icon: "citizens",
      count: summary.newLegendNames?.length ?? 0,
      detail: summary.newLegendNames?.length ? summary.newLegendNames.join(", ") : "No new Legends arrived this turn."
    },
    {
      label: "Recent Events",
      icon: "event",
      count: summary.newEventTitles.length,
      detail: summary.newEventTitles.length ? summary.newEventTitles.join(", ") : "No new event records this turn."
    },
    {
      label: "Journey Debriefs",
      icon: "route",
      count: summary.expeditionJourneys?.length ?? 0,
      detail: summary.expeditionJourneys?.length ? summary.expeditionJourneys.join(", ") : "No expedition debriefs opened this turn."
    }
  ];

  return `
    <div class="turn-summary-modal__facts">
      ${items
        .map(
          (item) => `
            <article>
              <span>${renderUiIcon(item.icon, item.label)}${escapeHtml(item.label)}</span>
              <strong>${formatNumber(item.count, 0)}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRiskShiftRows(summary) {
  if (summary.riskShifts?.length) {
    return `
      <div class="turn-summary-modal__risk-list">
        ${summary.riskShifts
          .map(
            (risk) => `
              <article class="turn-summary-modal__risk turn-summary-modal__risk--${escapeHtml(risk.severity)}">
                <div class="turn-summary-modal__risk-head">
                  <span>${escapeHtml(risk.changeLabel)}</span>
                  <strong>${escapeHtml(risk.label)}</strong>
                </div>
                <p>${escapeHtml(risk.details)}</p>
                ${risk.cause ? `<small>Cause: ${escapeHtml(risk.cause)}</small>` : ""}
                ${
                  risk.fixes?.length
                    ? `<div class="turn-summary-modal__fixes">${risk.fixes.map((fix) => `<em>${escapeHtml(fix)}</em>`).join("")}</div>`
                    : ""
                }
                <div class="turn-summary-modal__risk-actions">
                  <button class="button button--ghost" type="button" data-action="go-to-problem" data-problem="${escapeHtml(risk.key)}">Go To Problem</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  return `
    <article class="turn-summary-modal__calm">
      <strong>No new risks spiked during this advance.</strong>
      <p>${escapeHtml(summary.stabilizedRisks?.length ? summary.stabilizedRisks.join(" ") : "Warnings held steady rather than worsening.")}</p>
    </article>
  `;
}

function renderNextAttention(summary) {
  if (!summary.nextAttention?.length) {
    return `
      <article class="turn-summary-modal__calm">
        <strong>No urgent mayor request</strong>
        <p>The city is relatively balanced right now, so you can review Economy, Chronicle, or Legends at your own pace.</p>
      </article>
    `;
  }

  return `
    <div class="turn-summary-modal__attention-list">
      ${summary.nextAttention
        .map(
          (entry) => `
            <a class="turn-summary-modal__attention" href="${entry.href}">
              <div>
                <span>${renderUiIcon("route", entry.title)}${escapeHtml(entry.title)}</span>
                <strong>${escapeHtml(entry.detail)}</strong>
              </div>
              <em>${escapeHtml(entry.cta)}</em>
            </a>
          `
        )
        .join("")}
    </div>
  `;
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
          <span>Turn Digest</span>
          <h3 id="turn-summary-title">${summary.days} day${summary.days === 1 ? "" : "s"} passed</h3>
          <p>${escapeHtml(summary.dateLabel)}</p>
        </div>
        <div class="turn-summary-modal__body">
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>What Changed</strong>
              <small>Completions, arrivals, and new developments from this advance.</small>
            </div>
            ${renderChangeFacts(summary)}
          </section>
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>Now Risky</strong>
              <small>Warnings that appeared or got worse, plus the clearest fixes.</small>
            </div>
            ${renderRiskShiftRows(summary)}
          </section>
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>Resource Change</strong>
              <small>Actual stock movement across the turn.</small>
            </div>
            <div class="turn-summary-modal__deltas">
              ${renderDeltaRows(summary.resourceDeltas)}
            </div>
          </section>
          <section class="turn-summary-modal__section">
            <div class="turn-summary-modal__section-head">
              <strong>Next Attention</strong>
              <small>Where the mayor would point you first from here.</small>
            </div>
            ${renderNextAttention(summary)}
          </section>
        </div>
        <div class="turn-summary-modal__actions">
          <button class="button" type="button" data-action="close-turn-summary">Close</button>
        </div>
      </section>
    </div>
  `;
}
