import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { escapeHtml } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getCurrentTownFocus, getMayorSuggestions, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import {
  calculateTownFocusPreview,
  renderTownFocusBadge,
  renderTownFocusEffectSummary,
  renderTownFocusProjectionStrip
} from "./TownFocusShared.js";

export function renderTownFocusPanel(state) {
  const currentFocus = getCurrentTownFocus(state);
  const availability = getTownFocusAvailability(state);
  const suggestions = getMayorSuggestions(state);
  const suggestedReasons = Object.fromEntries(suggestions.map((entry) => [entry.focusId, entry.reason]));

  return `
    <section class="scene-panel town-focus-panel" id="town-focus-council">
      <div class="panel__header">
        <h3>Town Focus Council</h3>
        <div class="town-focus-panel__header-actions">
          <span class="panel__subtle">
            ${
              availability.isSelectionPending
                ? "The mayor awaits your decision."
                : `Next council on ${formatDate(availability.nextSelectionDayOffset)}`
            }
          </span>
          <button class="button button--ghost" data-action="open-town-focus-modal">
            ${availability.isSelectionPending ? "Open Council Chamber" : "Review Focuses"}
          </button>
        </div>
      </div>
      <div class="town-focus-panel__status">
        <article class="${currentFocus ? `town-focus-card town-focus-card--${currentFocus.id} is-current` : ""}">
          <span>Current Focus</span>
          <strong>${escapeHtml(currentFocus?.name ?? "No focus chosen")}</strong>
          ${currentFocus ? renderTownFocusBadge(currentFocus, { compact: true }) : ""}
          <p>${escapeHtml(currentFocus?.summary ?? "The council has not committed to a city-wide policy yet.")}</p>
        </article>
        <article>
          <span>Mayor's Position</span>
          <strong>${escapeHtml(currentFocus?.mayorLine ?? "A new agenda is needed.")}</strong>
          <p>${
            availability.isSelectionPending
              ? "A fresh focus may be selected right now."
              : `${availability.daysUntilCouncil} day(s) remain until the council may change policy again.`
          }</p>
        </article>
      </div>
      <div class="town-focus-grid">
        ${Object.values(TOWN_FOCUS_DEFINITIONS)
          .map((focus) => {
            const isSuggested = Boolean(suggestedReasons[focus.id]);
            const isCurrent = currentFocus?.id === focus.id;
            const preview = calculateTownFocusPreview(state, focus.id);
            return `
              <article class="town-focus-card town-focus-card--${focus.id} ${isSuggested ? "is-suggested" : ""} ${isCurrent ? "is-current" : ""}">
                <div class="town-focus-card__top">
                  <span>${isSuggested ? "Mayor suggests" : "Available focus"}</span>
                  <strong>${escapeHtml(focus.name)}</strong>
                </div>
                ${renderTownFocusBadge(focus, { compact: true })}
                <p class="town-focus-card__line">${escapeHtml(focus.mayorLine)}</p>
                <p>${escapeHtml(focus.summary)}</p>
                <p class="town-focus-card__effects">${escapeHtml(renderTownFocusEffectSummary(focus))}</p>
                ${renderTownFocusProjectionStrip(preview)}
                ${
                  isSuggested
                    ? `<p class="town-focus-card__reason">${escapeHtml(suggestedReasons[focus.id])}</p>`
                    : ""
                }
                <div class="town-focus-card__actions">
                  <button class="button button--ghost" data-action="preview-town-focus" data-focus-id="${focus.id}" ${isCurrent ? "disabled" : ""}>
                    ${isCurrent ? "Current Focus" : availability.isSelectionPending ? "Preview Focus" : "Review Preview"}
                  </button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}
