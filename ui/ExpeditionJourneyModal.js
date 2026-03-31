import { escapeHtml, formatNumber } from "../engine/Utils.js";
import {
  formatExpeditionDisplayName,
  getCurrentPendingExpeditionJourney,
  getExpeditionJourneyOptionPreview,
  getExpeditionJourneyProjection
} from "../systems/ExpeditionSystem.js";
import { renderUiIcon } from "./UiIcons.js";

function formatSignedDelta(value, decimals = 0) {
  const numericValue = Number(value ?? 0) || 0;
  return `${numericValue >= 0 ? "+" : ""}${formatNumber(numericValue, decimals)}`;
}

function getProjectionShiftRows(currentProjection, optionProjection) {
  if (!optionProjection) {
    return ["Keeps the route near its current outlook."];
  }

  const rewardShift = (Number(optionProjection.rewardMultiplier ?? 1) - Number(currentProjection.rewardMultiplier ?? 1)) * 100;
  const successShift = Number(optionProjection.successScore ?? 0) - Number(currentProjection.successScore ?? 0);
  const recruitShift = (Number(optionProjection.recruitMultiplier ?? 1) - Number(currentProjection.recruitMultiplier ?? 1)) * 100;
  const legendShift = Number(optionProjection.uniquePercent ?? 0) - Number(currentProjection.uniquePercent ?? 0);
  const shifts = [];

  if (Math.abs(successShift) >= 0.015) {
    shifts.push(`${successShift >= 0 ? "Safer" : "Riskier"} ${formatSignedDelta(successShift, 2)}`);
  }
  if (Math.abs(rewardShift) >= 1) {
    shifts.push(`Haul ${formatSignedDelta(rewardShift, 0)}%`);
  }
  if (Math.abs(recruitShift) >= 1) {
    shifts.push(`Recruit ${formatSignedDelta(recruitShift, 0)}%`);
  }
  if (Math.abs(legendShift) >= 0.5) {
    shifts.push(`Legend ${formatSignedDelta(legendShift, 0)}%`);
  }

  return shifts.length ? shifts.slice(0, 4) : ["Keeps the route near its current outlook."];
}

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
              <span>${escapeHtml(stage.cue ?? "Route Decision")} / Day ${formatNumber(stage.dayMarker, 0)}</span>
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
            <h3 id="expedition-journey-title">${escapeHtml(formatExpeditionDisplayName(journey.expedition))}</h3>
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
          <article><span>Legend Chance</span><strong>${formatNumber(projection.uniquePercent, 0)}%</strong></article>
          <article><span>Vehicle</span><strong>${escapeHtml(journey.expedition.vehicleName)}</strong></article>
        </div>

        <div class="expedition-journey-modal__stage">
          <div class="expedition-journey-modal__stage-frame">
            <div class="expedition-journey-modal__stage-emblem expedition-journey-modal__stage-emblem--${escapeHtml(currentStage.tone ?? "balanced")}">
              ${renderUiIcon(currentStage.iconKey ?? "route", currentStage.title)}
            </div>
            <div class="expedition-journey-modal__stage-copy">
              <span>${escapeHtml(currentStage.cue ?? "Route Decision")} / Day ${formatNumber(currentStage.dayMarker, 0)}</span>
              <h4>${escapeHtml(currentStage.title)}</h4>
              <p>${escapeHtml(currentStage.prompt)}</p>
            </div>
          </div>
          <div class="expedition-journey-modal__choices">
            ${(currentStage.options ?? [])
              .map((option) => {
                const optionProjection = getExpeditionJourneyOptionPreview(journey, option.id);
                const shiftRows = getProjectionShiftRows(projection, optionProjection);
                return `
                  <button
                    class="expedition-journey-choice expedition-journey-choice--${escapeHtml(option.tone ?? "balanced")}"
                    type="button"
                    data-action="choose-expedition-journey-option"
                    data-journey-id="${journey.id}"
                    data-option-id="${option.id}"
                  >
                    <div class="expedition-journey-choice__head">
                      <strong>${escapeHtml(option.label)}</strong>
                      <em>${escapeHtml(optionProjection?.outcomeLabel ?? projection.outcomeLabel)}</em>
                    </div>
                    <span>${escapeHtml(option.summary)}</span>
                    ${
                      option.tags?.length
                        ? `
                            <div class="expedition-journey-choice__tags">
                              ${option.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}
                            </div>
                          `
                        : ""
                    }
                    <div class="expedition-journey-choice__preview">
                      ${shiftRows.map((row) => `<small>${escapeHtml(row)}</small>`).join("")}
                    </div>
                  </button>
                `;
              })
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
