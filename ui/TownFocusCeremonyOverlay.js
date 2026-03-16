import { TOWN_FOCUS_DEFINITIONS } from "../content/TownFocusConfig.js";
import { escapeHtml } from "../engine/Utils.js";
import { renderTownFocusBadge } from "./TownFocusShared.js";

export function renderTownFocusCeremonyOverlay(state) {
  const ceremony = state.transientUi?.focusCeremony;
  if (!ceremony?.focusId) {
    return "";
  }

  const focus = TOWN_FOCUS_DEFINITIONS[ceremony.focusId];
  if (!focus) {
    return "";
  }

  return `
    <div class="focus-ceremony is-open">
      <div class="focus-ceremony__veil"></div>
      <div class="focus-ceremony__card focus-ceremony__card--${focus.id}">
        <p class="focus-ceremony__eyebrow">Council Decree Enacted</p>
        ${renderTownFocusBadge(focus)}
        <h2>${escapeHtml(focus.name)}</h2>
        <p>${escapeHtml(focus.mayorLine)}</p>
      </div>
    </div>
  `;
}
