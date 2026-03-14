import { formatNumber } from "../engine/Utils.js";

export function renderCitizenPanel(state) {
  return `
    <section class="panel citizen-panel">
      <div class="panel__header">
        <h3>Citizens</h3>
        <span class="panel__subtle">Population ${formatNumber(state.resources.population)}</span>
      </div>
      <div class="citizen-panel__grid">
        ${Object.entries(state.citizens)
          .map(
            ([citizenClass, count]) => `
              <article class="citizen-tile">
                <span>${citizenClass}</span>
                <strong>${formatNumber(count)}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
