import { renderCitizenPanel } from "./CitizenPanel.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderStatsPanel } from "./StatsPanel.js";

function renderCitizenLore(state) {
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Social Fabric</h3>
        <span class="panel__subtle">Class balance drives city output</span>
      </div>
      <div class="lore-grid">
        ${Object.entries(state.citizenDefinitions)
          .map(
            ([citizenClass, definition]) => `
              <article class="lore-card">
                <h4>${citizenClass}</h4>
                <p>${definition.flavor}</p>
              </article>
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
    subtitle: "A page focused on classes, social texture, and the city systems driven by your people instead of raw tables.",
    content: `
      ${renderCitizenPanel(state)}
      ${renderCitizenLore(state)}
    `,
    aside: `
      ${renderStatsPanel(state)}
      ${renderDistrictPanel(state)}
    `
  };
}
