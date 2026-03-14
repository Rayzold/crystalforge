import { formatNumber } from "../engine/Utils.js";

export function renderStatsPanel(state) {
  const stats = state.cityStats;
  const entries = [
    ["Value", stats.value],
    ["Income", stats.income],
    ["Upkeep", stats.upkeep],
    ["Defense", stats.defense],
    ["Security", stats.security],
    ["Prestige", stats.prestige],
    ["Morale", stats.morale],
    ["Health", stats.health]
  ];

  return `
    <section class="panel stats-panel">
      <div class="panel__header">
        <h3>City Statistics</h3>
        <span class="panel__subtle">Derived from active buildings, districts, citizens, and events</span>
      </div>
      <div class="stats-panel__grid">
        ${entries
          .map(
            ([label, value]) => `
              <article class="stat-tile">
                <span>${label}</span>
                <strong>${formatNumber(value, 2)}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
