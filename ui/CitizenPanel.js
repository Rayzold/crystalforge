import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { createHelpBubble } from "./HelpBubbles.js";
import { renderUiIcon } from "./UiIcons.js";

const CITIZEN_ICON_KEYS = {
  Farmers: "food",
  Hunters: "defense",
  Fishermen: "food",
  Scavengers: "salvage",
  Druids: "mana",
  Laborers: "building",
  Crafters: "materials",
  Techwrights: "salvage",
  Merchants: "gold",
  Skycrew: "route",
  Scouts: "security",
  Defenders: "security",
  Soldiers: "defense",
  Arcanists: "mana",
  Medics: "health",
  Scribes: "history",
  Scholars: "history",
  Nobles: "prestige",
  Priests: "health",
  Entertainers: "morale",
  Children: "citizens",
  Elderly: "history"
};

const CITIZEN_GROUP_NOTES = {
  Provision: "The food, foraging, and land-keeping backbone of the Drift, keeping the settlement supplied from field, water, ruin, and living systems.",
  "Labor & Industry": "Core workers and specialist makers who build, repair, craft, and maintain the settlement's material base.",
  "Trade & Movement": "Route, exchange, and travel specialists connecting the Drift to local trade and its future sky lanes.",
  Security: "The people who watch, defend, and fight when the settlement is threatened.",
  "Knowledge & Specialists": "Rare expertise that keeps medicine, records, scholarship, and arcane systems functioning.",
  "Civic Life": "Social, spiritual, and generational classes shaping morale, continuity, and influence."
};

const CITIZEN_GROUPS = CITIZEN_GROUP_ORDER.map((groupTitle) => ({
  title: groupTitle,
  note: CITIZEN_GROUP_NOTES[groupTitle] ?? "A core social bloc within the Drift.",
  classes: CITIZEN_CLASSES.filter((citizenClass) => CITIZEN_DEFINITIONS[citizenClass]?.group === groupTitle)
}));

function renderCitizenTile(citizenClass, count, definition) {
  const keyEffect = Object.entries(definition?.stats ?? {})[0] ?? Object.entries(definition?.production ?? {})[0] ?? null;
  const summary = keyEffect ? `${keyEffect[0]} +${formatNumber(keyEffect[1], 2)} each` : "Support role";
  const emoji = definition?.emoji ?? "*";

  return `
    <article class="citizen-tile">
      <div class="citizen-tile__head">
        <div class="citizen-tile__title">
          <span class="citizen-tile__emoji" aria-hidden="true">${escapeHtml(emoji)}</span>
          ${renderUiIcon(CITIZEN_ICON_KEYS[citizenClass] ?? "citizens", citizenClass)}
          <span>${escapeHtml(citizenClass)}</span>
        </div>
        ${createHelpBubble(getCitizenHelpText(citizenClass))}
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
        <span class="panel__subtle">Population ${formatNumber(state.resources.population)} / settlement support ${formatNumber(support)} / ${formatNumber(supportUsage, 1)}% used</span>
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
                ${createHelpBubble(group.note)}
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
