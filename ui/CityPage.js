import { renderBuildingGrid } from "./BuildingGrid.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderHexMap } from "./HexMap.js";
import { renderOverflowList } from "./OverflowList.js";
import { renderResourcePanel } from "./ResourcePanel.js";
import { renderStatsPanel } from "./StatsPanel.js";

export function renderCityPage(state) {
  return {
    title: "The City",
    subtitle: "Walk the districts, place each structure onto a shared hex map, and shape the city beyond the forge core.",
    content: `
      ${renderHexMap(state)}
      ${renderBuildingGrid(state)}
      ${renderOverflowList(state)}
    `,
    aside: `
      ${renderResourcePanel(state)}
      ${renderStatsPanel(state)}
      ${renderDistrictPanel(state)}
    `
  };
}
