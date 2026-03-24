import { formatNumber } from "../engine/Utils.js";
import { getEmergencyStatus } from "../systems/ResourceSystem.js";
import { getSuggestedFocusForAlert } from "../systems/TownFocusSystem.js";

function renderRunway(label, days, dailyDelta) {
  if (days === null) {
    return `
      <article class="emergency-panel__metric">
        <span>${label}</span>
        <strong>Stable</strong>
        <small>${dailyDelta >= 0 ? `+${formatNumber(dailyDelta, 2)}` : formatNumber(dailyDelta, 2)} / day</small>
      </article>
    `;
  }

  return `
    <article class="emergency-panel__metric ${days <= 5 ? "is-critical" : "is-warning"}">
      <span>${label}</span>
      <strong>${formatNumber(days, 1)} days</strong>
      <small>${formatNumber(dailyDelta, 2)} / day</small>
    </article>
  `;
}

export function renderEmergencyPanel(state) {
  const emergencyState = getEmergencyStatus(state);

  return `
    <section class="panel emergency-panel">
      <div class="panel__header">
        <h3>Emergency Watch</h3>
        <span class="panel__subtle">${emergencyState.emergencies.length ? "Instability detected" : "No immediate crises"}</span>
      </div>
      <div class="emergency-panel__metrics">
        ${renderRunway("Food runway", emergencyState.runway.foodDays, emergencyState.deltas.food)}
        ${renderRunway("Gold runway", emergencyState.runway.goldDays, emergencyState.deltas.gold)}
        ${renderRunway("Mana runway", emergencyState.runway.manaDays, emergencyState.deltas.mana)}
        <article class="emergency-panel__metric ${(emergencyState.workforce?.staffingRatio ?? 1) < 0.8 ? ((emergencyState.workforce?.staffingRatio ?? 1) < 0.55 ? "is-critical" : "is-warning") : ""}">
          <span>Workforce</span>
          <strong>${formatNumber((emergencyState.workforce?.staffingRatio ?? 1) * 100, 0)}%</strong>
          <small>${(emergencyState.workforce?.staffingRatio ?? 1) < 0.8 ? "Staffing is suppressing output" : "Staffing is healthy"}</small>
        </article>
        <article class="emergency-panel__metric ${state.cityStats.morale <= 18 ? "is-warning" : ""}">
          <span>Morale</span>
          <strong>${formatNumber(state.cityStats.morale, 1)}</strong>
          <small>${state.cityStats.morale <= 18 ? "Watch for unrest" : "Holding steady"}</small>
        </article>
      </div>
      <div class="emergency-panel__list">
        ${
          emergencyState.emergencies.length
            ? emergencyState.emergencies
                .map(
                  (emergency) => `
                    <article class="emergency-card is-${emergency.severity}">
                      <strong>${emergency.label}</strong>
                      <p>${emergency.details}</p>
                      ${
                        getSuggestedFocusForAlert(state, emergency.key)
                          ? `<small>Recommended response: ${getSuggestedFocusForAlert(state, emergency.key).name}</small>`
                          : ""
                      }
                      <div class="emergency-card__actions">
                        <button class="button button--ghost" type="button" data-action="go-to-problem" data-problem="${emergency.key}">Go To Problem</button>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">Granaries, treasury, mana channels, and morale are all within safe operating range.</p>`
        }
      </div>
    </section>
  `;
}
