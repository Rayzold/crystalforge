import { CITIZEN_DEFINITIONS } from "../content/CitizenConfig.js";
import { renderCitizenPanel } from "./CitizenPanel.js";
import { renderUiIcon } from "./UiIcons.js";
import { escapeHtml } from "../engine/Utils.js";

function renderCitizenCommand(state) {
  const sorted = Object.entries(state.citizens).sort((left, right) => right[1] - left[1]);
  const topClasses = sorted.slice(0, 3);
  const workforce = (state.citizens.Farmers ?? 0) + (state.citizens.Hunters ?? 0) + (state.citizens.Fishermen ?? 0) + (state.citizens.Laborers ?? 0);
  const specialists = (state.citizens.Techwrights ?? 0) + (state.citizens.Arcanists ?? 0) + (state.citizens.Medics ?? 0) + (state.citizens.Scribes ?? 0);

  return `
    <section class="panel citizen-command-panel">
      <div class="panel__header">
        <h3>Population Command</h3>
        <span class="panel__subtle">Read the current roster, not the rest of the city</span>
      </div>
      <div class="citizen-command-panel__metrics">
        <article>
          <span>Total Population</span>
          <strong>${state.resources.population}</strong>
          <small>${workforce} in core provision and labor</small>
        </article>
        <article>
          <span>Specialists</span>
          <strong>${specialists}</strong>
          <small>Arcane, medical, record, and tech roles</small>
        </article>
        <article>
          <span>Largest Class</span>
          <strong>${topClasses[0]?.[0] ?? "None"}</strong>
          <small>${topClasses[0] ? `${topClasses[0][1]} citizens` : "No active population"}</small>
        </article>
      </div>
      <div class="citizen-command-panel__leaders">
        ${topClasses
          .map(
            ([citizenClass, count]) => `
              <div class="citizen-command-panel__leader">
                ${renderUiIcon("citizens", citizenClass)}
                <span>${escapeHtml(`${CITIZEN_DEFINITIONS[citizenClass]?.emoji ?? "•"} ${citizenClass}`)}</span>
                <strong>${count}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderCitizensPage(state) {
  return {
    title: "Citizens",
    subtitle: "Population roles, workforce balance, and the living social order.",
    content: `
      ${renderCitizenPanel(state)}
    `,
    aside: `
      ${renderCitizenCommand(state)}
    `
  };
}
