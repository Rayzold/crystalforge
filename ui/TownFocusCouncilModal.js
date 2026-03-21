import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getMayorSuggestions, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { renderModal } from "./Modal.js";
import {
  calculateTownFocusPreview,
  getDefaultTownFocusPreviewId,
  renderTownFocusBadge,
  renderTownFocusEffectSummary
} from "./TownFocusShared.js";

function renderMetricCard(label, projected, change, decimals = 2) {
  return `
    <article class="town-focus-modal__metric ${change > 0 ? "is-positive" : change < 0 ? "is-negative" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${formatSigned(projected, decimals)}</strong>
      <small>${change === 0 ? "No change" : `${formatSigned(change, decimals)} from current policy`}</small>
    </article>
  `;
}

function renderRunwayCard(label, days) {
  return `
    <article class="town-focus-modal__runway ${days !== null && days <= 5 ? "is-warning" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${days === null ? "Stable" : `${formatNumber(days, 1)} days`}</strong>
    </article>
  `;
}

export function renderTownFocusCouncilModal(state) {
  const open = Boolean(state.transientUi?.councilModalOpen);
  const availability = getTownFocusAvailability(state);
  const selectedFocusId = state.transientUi?.previewTownFocusId ?? getDefaultTownFocusPreviewId(state);
  const preview = calculateTownFocusPreview(state, selectedFocusId);
  const suggestedReasons = Object.fromEntries(getMayorSuggestions(state).map((entry) => [entry.focusId, entry.reason]));

  return renderModal({
    id: "town-focus-council-modal",
    title: availability.isSelectionPending ? "Council Chamber" : "Town Focus Ledger",
    wide: true,
    open,
    content: `
      <section class="town-focus-modal">
        <div class="town-focus-modal__intro">
          <div>
            <p class="panel__subtle">
              ${
                availability.isSelectionPending
                  ? "The mayor is ready for a fresh directive."
                  : `The next focus vote opens on ${formatDate(availability.nextSelectionDayOffset)}.`
              }
            </p>
            <h3>${escapeHtml(preview.focus.name)}</h3>
            ${renderTownFocusBadge(preview.focus)}
            <p>${escapeHtml(preview.focus.summary)}</p>
            <p class="town-focus-modal__line">${escapeHtml(preview.focus.mayorLine)}</p>
            <p class="town-focus-modal__effects">${escapeHtml(renderTownFocusEffectSummary(preview.focus))}</p>
            ${
              suggestedReasons[preview.focus.id]
                ? `<p class="town-focus-modal__reason">${escapeHtml(suggestedReasons[preview.focus.id])}</p>`
                : ""
            }
          </div>
          <div class="town-focus-modal__actions">
            <button
              class="button"
              data-action="choose-town-focus"
              data-focus-id="${preview.focus.id}"
              ${availability.isSelectionPending ? "" : "disabled"}
            >
              ${availability.isSelectionPending ? "Confirm This Focus" : "Council Locked"}
            </button>
            <button class="button button--ghost" data-action="close-modal" data-modal="town-focus-council-modal">
              Decide Later
            </button>
          </div>
        </div>

        <div class="town-focus-modal__layout">
          <div class="town-focus-modal__list">
            ${Object.values(TOWN_FOCUS_DEFINITIONS)
              .map(
                (focus) => `
                  <button
                    class="town-focus-modal__choice ${focus.id === preview.focus.id ? "is-selected" : ""} town-focus-modal__choice--${focus.id}"
                    data-action="preview-town-focus"
                    data-focus-id="${focus.id}"
                  >
                    ${renderTownFocusBadge(focus, { compact: true })}
                    <strong>${escapeHtml(focus.name)}</strong>
                    <small>${escapeHtml(focus.badgeLabel ?? focus.summary)}</small>
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="town-focus-modal__preview">
            <div class="town-focus-modal__section">
              <div class="panel__header">
                <h3>Projected Daily Economy</h3>
                <span class="panel__subtle">If chosen now</span>
              </div>
              <div class="town-focus-modal__metrics">
                ${renderMetricCard("Gold/day", preview.projectedDelta.gold, preview.deltaShift.gold)}
                ${renderMetricCard("Food/day", preview.projectedDelta.food, preview.deltaShift.food)}
                ${renderMetricCard("Materials/day", preview.projectedDelta.materials, preview.deltaShift.materials)}
                ${renderMetricCard("Mana/day", preview.projectedDelta.mana, preview.deltaShift.mana)}
                ${renderMetricCard("Prosperity/day", preview.projectedDelta.prosperity, preview.deltaShift.prosperity)}
              </div>
            </div>

            <div class="town-focus-modal__section">
              <div class="panel__header">
                <h3>Projected Civic Pressure</h3>
                <span class="panel__subtle">Resulting city posture</span>
              </div>
              <div class="town-focus-modal__metrics">
                ${renderMetricCard("Defense", preview.projectedStats.defense, preview.statShift.defense)}
                ${renderMetricCard("Security", preview.projectedStats.security, preview.statShift.security)}
                ${renderMetricCard("Morale", preview.projectedStats.morale, preview.statShift.morale)}
                ${renderMetricCard("Health", preview.projectedStats.health, preview.statShift.health)}
                ${renderMetricCard("Prestige", preview.projectedStats.prestige, preview.statShift.prestige)}
                ${renderMetricCard("Prosperity", preview.projectedStats.prosperity, preview.statShift.prosperity)}
              </div>
            </div>

            <div class="town-focus-modal__section">
              <div class="panel__header">
                <h3>Runway After Adoption</h3>
                <span class="panel__subtle">How long reserves hold</span>
              </div>
              <div class="town-focus-modal__runway-grid">
                ${renderRunwayCard("Food", preview.runway.foodDays)}
                ${renderRunwayCard("Gold", preview.runway.goldDays)}
                ${renderRunwayCard("Mana", preview.runway.manaDays)}
              </div>
            </div>

            ${
              preview.shardHighlights.length
                ? `
                    <div class="town-focus-modal__section">
                      <div class="panel__header">
                        <h3>Expedition Yield</h3>
                        <span class="panel__subtle">Daily shard movement</span>
                      </div>
                      <div class="town-focus-modal__metrics">
                        ${preview.shardHighlights
                          .map((entry) => renderMetricCard(entry.label, entry.projected, entry.change))
                          .join("")}
                      </div>
                    </div>
                  `
                : ""
            }
          </div>
        </div>
      </section>
    `
  });
}
