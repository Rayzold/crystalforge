import { formatNumber } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

const CITIZEN_ICONS = {
  Children: "citizens",
  Elderly: "history",
  Farmers: "food",
  Hunters: "defense",
  Miners: "materials",
  Laborers: "building",
  Craftsmen: "materials",
  Merchants: "gold",
  Scavengers: "materials",
  Guards: "security",
  Soldiers: "defense",
  Administrators: "prosperity",
  Scholars: "history",
  Clergy: "health",
  Healers: "health",
  Entertainers: "morale",
  Nobles: "prestige",
  Mages: "mana",
  Heroes: "prestige"
};

export function renderCitizenPanel(state) {
  const support = state.cityStats.populationSupport ?? 0;
  const supportUsage = support > 0 ? (state.resources.population / support) * 100 : 0;
  return `
    <section class="panel citizen-panel">
      <div class="panel__header">
        <h3>Citizens</h3>
        <span class="panel__subtle">Population ${formatNumber(state.resources.population)} / Support ${formatNumber(support)} (${formatNumber(supportUsage, 1)}% used)</span>
      </div>
      <div class="citizen-panel__grid">
        ${Object.entries(state.citizens)
          .map(
            ([citizenClass, count]) => `
              <article class="citizen-tile">
                <div class="citizen-tile__head">
                  ${renderUiIcon(CITIZEN_ICONS[citizenClass] ?? "citizens", citizenClass)}
                  <span>${citizenClass}</span>
                </div>
                <strong>${formatNumber(count)}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
