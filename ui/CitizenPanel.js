import { formatNumber } from "../engine/Utils.js";

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
