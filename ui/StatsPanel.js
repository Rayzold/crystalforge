import { formatNumber } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

export function renderStatsPanel(state) {
  const stats = state.cityStats;
  const entries = [
    ["Value", stats.value, "value"],
    ["Income", stats.income, "gold"],
    ["Upkeep", stats.upkeep, "upkeep"],
    ["Pop. Support", stats.populationSupport, "population"],
    ["Defense", stats.defense, "defense"],
    ["Security", stats.security, "security"],
    ["Prestige", stats.prestige, "prestige"],
    ["Morale", stats.morale, "morale"],
    ["Health", stats.health, "health"]
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
            ([label, value, icon]) => `
              <article class="stat-tile">
                <div class="stat-tile__head">
                  ${renderUiIcon(icon, label)}
                  <span>${label}</span>
                </div>
                <strong>${formatNumber(value, label === "Pop. Support" ? 0 : 2)}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
