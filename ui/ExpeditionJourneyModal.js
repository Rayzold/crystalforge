import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getCurrentPendingExpeditionJourney, getExpeditionJourneyProjection } from "../systems/ExpeditionSystem.js";

function renderResolvedStages(journey) {
  const resolved = (journey.stages ?? []).filter((stage) => stage.chosenOptionId);
  if (!resolved.length) {
    return `<p class="panel__empty">No route decisions locked in yet.</p>`;
  }

  return `
    <div class="expedition-journey-modal__history">
      ${resolved
        .map(
          (stage) => `
            <article class="expedition-journey-modal__history-item">
              <span>Day ${formatNumber(stage.dayMarker, 0)}</span>
              <strong>${escapeHtml(stage.chosenLabel ?? stage.title)}</strong>
              <small>${escapeHtml(stage.chosenSummary ?? stage.prompt)}</small>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderExpeditionJourneyModal(state) {
  const open = Boolean(state.transientUi?.expeditionJourneyOpen);
  const journey = getCurrentPendingExpeditionJourney(state);
  if (!open || !journey) {
    return "";
  }

  const currentStage = journey.stages?.[journey.currentStageIndex] ?? null;
  if (!currentStage) {
    return "";
  }

  const projection = getExpeditionJourneyProjection(journey);
  const queueCount = state.expeditions?.pending?.length ?? 0;

  return `
    <div class="modal-overlay expedition-journey-modal">
      <button class="modal-overlay__dismiss" type="button" data-action="close-expedition-journey" aria-label="Close expedition journey"></button>
      <section class="modal-card expedition-journey-modal__card" role="dialog" aria-modal="true" aria-labelledby="expedition-journey-title">
        <button class="modal-card__close" type="button" data-action="close-expedition-journey" aria-label="Close expedition journey">x</button>
        <div class="expedition-journey-modal__header">
          <div>
            <span>Journey Debrief${queueCount > 1 ? ` / ${queueCount} waiting` : ""}</span>
            <h3 id="expedition-journey-title">${escapeHtml(journey.expedition.missionName ?? journey.expedition.typeLabel)}</h3>
            <p>${escapeHtml(journey.expedition.missionSummary ?? journey.expedition.notes ?? "Returned expedition awaiting route decisions.")}</p>
          </div>
          <div class="expedition-journey-modal__pillbox">
            <span>Returned ${escapeHtml(journey.returnDateLabel)}</span>
            <strong>Stage ${formatNumber(journey.currentStageIndex + 1, 0)} / ${formatNumber(journey.stages.length, 0)}</strong>
          </div>
        </div>

        <div class="expedition-journey-modal__metrics expedition-preview-grid">
          <article><span>Projected Outcome</span><strong>${escapeHtml(projection.outcomeLabel)}</strong></article>
          <article><span>Reward Bias</span><strong>x${formatNumber(projection.rewardMultiplier, 2)}</strong></article>
          <article><span>Recruit Bias</span><strong>x${formatNumber(projection.recruitMultiplier, 2)}</strong></article>
          <article><span>Vehicle</span><strong>${escapeHtml(journey.expedition.vehicleName)}</strong></article>
        </div>

        <div class="expedition-journey-modal__stage">
          <div class="expedition-journey-modal__stage-copy">
            <span>Day ${formatNumber(currentStage.dayMarker, 0)}</span>
            <h4>${escapeHtml(currentStage.title)}</h4>
            <p>${escapeHtml(currentStage.prompt)}</p>
          </div>
          <div class="expedition-journey-modal__choices">
            ${(currentStage.options ?? [])
              .map(
                (option) => `
                  <button
                    class="expedition-journey-choice"
                    type="button"
                    data-action="choose-expedition-journey-option"
                    data-journey-id="${journey.id}"
                    data-option-id="${option.id}"
                  >
                    <strong>${escapeHtml(option.label)}</strong>
                    <span>${escapeHtml(option.summary)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="expedition-journey-modal__footer">
          <div>
            <strong>Route Decisions So Far</strong>
            <small>Each stage shifts the eventual haul before rewards are finalized.</small>
          </div>
          ${renderResolvedStages(journey)}
        </div>
      </section>
    </div>
  `;
}
