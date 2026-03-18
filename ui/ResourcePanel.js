import { formatNumber } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

export function renderResourcePanel(state) {
  const warnings = [];
  if (state.resources.food <= 20) warnings.push("Low food");
  if (state.resources.gold <= 20) warnings.push("Low gold");
  if (state.resources.mana <= 12) warnings.push("Low mana");

  const entries = [
    ["Gold", state.resources.gold, "gold"],
    ["Food", state.resources.food, "food"],
    ["Materials", state.resources.materials, "materials"],
    ["Mana", state.resources.mana, "mana"],
    ["Population", state.resources.population, "population"],
    ["Prosperity", state.resources.prosperity, "prosperity"]
  ];

  return `
    <section class="panel resource-panel">
      <div class="panel__header">
        <h3>City Stores</h3>
        <span class="panel__subtle">${warnings.length ? warnings.join(" / ") : "Stable reserves"}</span>
      </div>
      <div class="resource-panel__grid">
        ${entries
          .map(
            ([label, value, icon]) => `
              <article class="resource-chip">
                <div class="resource-chip__head">
                  ${renderUiIcon(icon, label)}
                  <span class="resource-chip__label">${label}</span>
                </div>
                <strong class="resource-chip__value">${formatNumber(value, 2)}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
