import { escapeHtml, formatNumber } from "../engine/Utils.js";
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
  Skycrew: "route",
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

const CITIZEN_GROUPS = [
  {
    title: "Demographic",
    note: "Dependents and age groups that shape long-term support pressure, continuity, and resilience.",
    classes: ["Children", "Elderly"]
  },
  {
    title: "Labor",
    note: "Hands-on workers who feed the Drift, extract resources, build goods, and recover value from the frontier.",
    classes: ["Farmers", "Hunters", "Miners", "Laborers", "Craftsmen", "Scavengers"]
  },
  {
    title: "Civic",
    note: "Operational specialists who move trade, guard routes, run institutions, heal the people, and maintain culture.",
    classes: ["Merchants", "Skycrew", "Guards", "Soldiers", "Administrators", "Scholars", "Clergy", "Healers", "Entertainers"]
  },
  {
    title: "Elite",
    note: "High-impact figures whose influence shapes prestige, magical capability, and exceptional leadership.",
    classes: ["Nobles", "Mages", "Heroes"]
  }
];

function renderGroupHelp(note) {
  return `
    <div class="help-bubble-wrap">
      <button class="help-bubble" type="button" aria-label="${escapeHtml(note)}" title="${escapeHtml(note)}">?</button>
      <div class="help-bubble__tooltip">${escapeHtml(note)}</div>
    </div>
  `;
}

function renderCitizenTile(citizenClass, count, definition) {
  const keyEffect = Object.entries(definition?.stats ?? {})[0] ?? Object.entries(definition?.production ?? {})[0] ?? null;
  const summary = keyEffect ? `${keyEffect[0]} +${formatNumber(keyEffect[1], 2)} each` : "Support role";

  return `
    <article class="citizen-tile">
      <div class="citizen-tile__head">
        <div class="citizen-tile__title">
          ${renderUiIcon(CITIZEN_ICONS[citizenClass] ?? "citizens", citizenClass)}
          <span>${escapeHtml(citizenClass)}</span>
        </div>
        ${renderGroupHelp(definition?.flavor ?? "Citizen role")}
      </div>
      <strong>${formatNumber(count)}</strong>
      <small>${escapeHtml(summary)}</small>
    </article>
  `;
}

export function renderCitizenPanel(state) {
  const support = state.cityStats.populationSupport ?? 0;
  const supportUsage = support > 0 ? (state.resources.population / support) * 100 : 0;

  return `
    <section class="panel citizen-panel">
      <div class="panel__header">
        <h3>Citizens</h3>
        <span class="panel__subtle">Population ${formatNumber(state.resources.population)} / Support ${formatNumber(support)} (${formatNumber(supportUsage, 1)}% used)</span>
      </div>
      <div class="citizen-panel__groups">
        ${CITIZEN_GROUPS.map((group) => {
          const total = group.classes.reduce((sum, citizenClass) => sum + (state.citizens[citizenClass] ?? 0), 0);
          return `
            <section class="citizen-group">
              <div class="citizen-group__header">
                <div>
                  <h4>${group.title}</h4>
                  <p>${formatNumber(total)} citizens</p>
                </div>
                ${renderGroupHelp(group.note)}
              </div>
              <div class="citizen-panel__grid citizen-panel__grid--grouped">
                ${group.classes
                  .map((citizenClass) => renderCitizenTile(citizenClass, state.citizens[citizenClass] ?? 0, state.citizenDefinitions[citizenClass]))
                  .join("")}
              </div>
            </section>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
