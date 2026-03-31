import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getEmergencyStatus } from "../systems/ResourceSystem.js";
import { renderUiIcon } from "./UiIcons.js";

export function renderResourcePanel(state) {
  const emergencyState = getEmergencyStatus(state);
  const topEmergency = emergencyState.emergencies[0] ?? null;
  const warningLabel = topEmergency
    ? `${topEmergency.label}: ${topEmergency.cause ?? topEmergency.details}${emergencyState.emergencies.length > 1 ? ` (+${emergencyState.emergencies.length - 1} more)` : ""}`
    : "Stable reserves";

  const entries = [
    ["Gold", state.resources.gold, "gold"],
    ["Food", state.resources.food, "food"],
    ["Materials", state.resources.materials, "materials"],
    ["Salvage", state.resources.salvage ?? 0, "salvage"],
    ["Mana", state.resources.mana, "mana"],
    ["Population", state.resources.population, "population"],
    ["Prosperity", state.resources.prosperity, "prosperity"]
  ];

  return `
    <section class="panel resource-panel">
      <div class="panel__header">
        <h3>City Stores</h3>
        <span class="panel__subtle">${escapeHtml(warningLabel)}</span>
      </div>
      <div class="resource-panel__grid">
        ${entries
          .map(
            ([label, value, icon]) => `
              <button class="resource-chip resource-chip--button" type="button" data-action="open-resource-breakdown" data-resource-key="${icon}">
                <div class="resource-chip__head">
                  ${renderUiIcon(icon, label)}
                  <span class="resource-chip__label">${label}</span>
                </div>
                <strong class="resource-chip__value">${formatNumber(value, 2)}</strong>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
