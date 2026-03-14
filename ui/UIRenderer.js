import { APP_NAME } from "../content/Config.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderCitizenPanel } from "./CitizenPanel.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";
import { renderManifestPanel } from "./ManifestPanel.js";
import { renderOverflowList } from "./OverflowList.js";
import { renderResourcePanel } from "./ResourcePanel.js";
import { renderStatsPanel } from "./StatsPanel.js";
import { renderBuildingGrid } from "./BuildingGrid.js";

export class UIRenderer {
  constructor(root) {
    this.root = root;
  }

  render(state) {
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="hero">
          <div>
            <p class="hero__eyebrow">Fantasy City Builder / Gacha Simulator</p>
            <h1>${APP_NAME}</h1>
            <p class="hero__subhead">Manifest structures, stabilize districts, guide citizens, and shape Drift through crystal chance.</p>
          </div>
        </header>

        ${renderResourcePanel(state)}

        <section class="app-grid">
          <div class="app-grid__primary">
            ${renderCrystalSelector(state)}
            ${renderManifestPanel(state)}
            ${renderCalendarPanel(state)}
            ${renderBuildingGrid(state)}
            ${renderOverflowList(state)}
            ${renderHistoryPanel(state)}
          </div>

          <aside class="app-grid__sidebar">
            ${renderStatsPanel(state)}
            ${renderDistrictPanel(state)}
            ${renderCitizenPanel(state)}
            ${renderEventPanel(state)}
          </aside>
        </section>
      </div>
    `;
  }
}
