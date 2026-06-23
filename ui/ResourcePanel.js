import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260623075447";
import { getEmergencyStatus } from "../systems/ResourceSystem.js?v=v1.7.20-20260623075447";
import { renderUiIcon } from "./UiIcons.js?v=v1.7.20-20260623075447";

export function renderResourcePanel(state) {
  const emergencyState = getEmergencyStatus(state);
  const topEmergency = emergencyState.emergencies[0] ?? null;
  const warningLabel = topEmergency
    ? `${topEmergency.label}: ${topEmergency.cause ?? topEmergency.details}${emergencyState.emergencies.length > 1 ? ` (+${emergencyState.emergencies.length - 1} more)` : ""}`
    : "Stable reserves";

  const safeNumber = (raw) => {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const entries = [
    ["Gold", safeNumber(state.resources.gold), "gold"],
    ["Food", safeNumber(state.resources.food), "food"],
    ["Materials", safeNumber(state.resources.materials), "materials"],
    ["Salvage", safeNumber(state.resources.salvage), "salvage"],
    ["Mana", safeNumber(state.resources.mana), "mana"],
    ["Population", safeNumber(state.resources.population), "population"],
    ["Prosperity", safeNumber(state.resources.prosperity), "prosperity"]
  ];

  const isEditing = Boolean(state.transientUi?.resourceQuickEdit);

  return `
    <section class="panel resource-panel ${isEditing ? "is-quick-editing" : ""}">
      <div class="panel__header">
        <h3>City Stores</h3>
        <span class="panel__subtle">${escapeHtml(warningLabel)}</span>
        <button class="button button--ghost button--small" type="button" data-action="toggle-resource-quick-edit">${isEditing ? "Done" : "✏ Quick Edit"}</button>
      </div>
      <div class="resource-panel__grid">
        ${entries
          .map(
            ([label, value, icon]) => `
              ${
                isEditing
                  ? `
                    <div class="resource-chip resource-chip--editing">
                      <div class="resource-chip__head">
                        ${renderUiIcon(icon, label)}
                        <span class="resource-chip__label">${label}</span>
                      </div>
                      <input
                        class="resource-chip__edit-input"
                        type="number"
                        step="any"
                        min="0"
                        value="${Number(value).toFixed(2)}"
                        data-action="set-resource-value"
                        data-resource-key="${icon}"
                        aria-label="${escapeHtml(label)} value"
                      />
                    </div>
                  `
                  : `
                    <button class="resource-chip resource-chip--button" type="button" data-action="open-resource-breakdown" data-resource-key="${icon}">
                      <div class="resource-chip__head">
                        ${renderUiIcon(icon, label)}
                        <span class="resource-chip__label">${label}</span>
                      </div>
                      <strong class="resource-chip__value">${formatNumber(value, 2)}</strong>
                    </button>
                  `
              }
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
