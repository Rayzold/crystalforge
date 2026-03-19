import { renderCitizenPanel } from "./CitizenPanel.js";
import { renderUiIcon } from "./UiIcons.js";
import { escapeHtml } from "../engine/Utils.js";

function renderCitizenCommand(state) {
  const sorted = Object.entries(state.citizens).sort((left, right) => right[1] - left[1]);
  const topClasses = sorted.slice(0, 3);
  const support = state.cityStats.populationSupport ?? 0;
  const usage = support > 0 ? (state.resources.population / support) * 100 : 0;

  return `
    <section class="panel citizen-command-panel">
      <div class="panel__header">
        <h3>Population Command</h3>
        <span class="panel__subtle">Read the population itself, not the rest of the city</span>
      </div>
      <div class="citizen-command-panel__metrics">
        <article>
          <span>Population Support</span>
          <strong>${Math.round(support)}</strong>
          <small>${Math.round(usage)}% capacity used</small>
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
                <span>${escapeHtml(citizenClass)}</span>
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
    subtitle: "Population roles, support, and the living social order.",
    content: `
      ${renderCitizenPanel(state)}
    `,
    aside: `
      ${renderCitizenCommand(state)}
    `
  };
}
