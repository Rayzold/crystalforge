import { MAP_CONFIG, MAP_TERRAIN_THEMES } from "../content/MapConfig.js";
import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml } from "../engine/Utils.js";
import { getBuildingAtCell } from "../systems/MapSystem.js";

function axialToPixel(q, r, size) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r
  };
}

function hexPoints(cx, cy, size) {
  const points = [];
  for (let side = 0; side < 6; side += 1) {
    const angle = (Math.PI / 180) * (60 * side - 30);
    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return points.join(" ");
}

function getMapBounds(cells, size) {
  const centers = cells.map((cell) => axialToPixel(cell.q, cell.r, size));
  const minX = Math.min(...centers.map((center) => center.x)) - size * 1.4;
  const maxX = Math.max(...centers.map((center) => center.x)) + size * 1.4;
  const minY = Math.min(...centers.map((center) => center.y)) - size * 1.4;
  const maxY = Math.max(...centers.map((center) => center.y)) + size * 1.4;
  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function renderCellLabel(building, cx, cy) {
  if (!building) {
    return "";
  }
  return `
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" class="hex-map__label">
      ${escapeHtml(building.displayName.slice(0, 2).toUpperCase())}
    </text>
  `;
}

export function renderHexMap(state) {
  const cells = state.map.cells;
  const size = MAP_CONFIG.hexSize;
  const bounds = getMapBounds(cells, size);
  const selectedBuilding =
    state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const selectedPosition = selectedBuilding?.mapPosition ?? null;
  const unplacedCount = state.buildings.filter((building) => !building.mapPosition).length;

  return `
    <section class="panel hex-map-panel">
      <div class="panel__header">
        <h3>Hex District Map</h3>
        <span class="panel__subtle">Core 7 hexes are reserved for the forge and starting works</span>
      </div>
      <div class="hex-map-panel__status">
        <div>
          <strong>${selectedBuilding ? escapeHtml(selectedBuilding.displayName) : "No building selected"}</strong>
          <span>${
            selectedPosition
              ? `Currently at hex ${selectedPosition.q}, ${selectedPosition.r}`
              : selectedBuilding
                ? "Click an outer hex to place it"
                : "Select a building card or occupied hex"
          }</span>
        </div>
        <div>
          <strong>${unplacedCount}</strong>
          <span>Buildings still unplaced</span>
        </div>
      </div>
      <div class="hex-map-wrap">
        <svg
          class="hex-map"
          viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
          role="img"
          aria-label="City hex map"
        >
          ${cells
            .map((cell) => {
              const center = axialToPixel(cell.q, cell.r, size);
              const theme = MAP_TERRAIN_THEMES[cell.terrain] ?? MAP_TERRAIN_THEMES.neutral;
              const building = getBuildingAtCell(state, cell.q, cell.r);
              const isSelected =
                selectedPosition && selectedPosition.q === cell.q && selectedPosition.r === cell.r;
              const isFocusedCell =
                state.ui.selectedMapCell &&
                state.ui.selectedMapCell.q === cell.q &&
                state.ui.selectedMapCell.r === cell.r;
              const fill = building ? RARITY_COLORS[building.rarity] : theme.fill;
              const title = cell.isReserved
                ? "Forge core"
                : building
                  ? `${building.displayName} (${building.rarity})`
                  : `Open hex ${cell.q}, ${cell.r}`;

              return `
                <g
                  class="hex-map__cell ${cell.isReserved ? "is-reserved" : ""} ${building ? "is-occupied" : ""} ${isSelected ? "is-selected" : ""} ${isFocusedCell ? "is-focused" : ""}"
                  data-action="select-map-cell"
                  data-q="${cell.q}"
                  data-r="${cell.r}"
                >
                  <title>${escapeHtml(title)}</title>
                  <polygon
                    points="${hexPoints(center.x, center.y, size)}"
                    fill="${fill}"
                    stroke="${building ? MAP_CONFIG.occupiedOutlineColor : theme.stroke}"
                    stroke-width="${isSelected || isFocusedCell ? 3 : 1.5}"
                  ></polygon>
                  ${
                    cell.isReserved
                      ? `<text x="${center.x}" y="${center.y + 5}" text-anchor="middle" class="hex-map__core-text">${cell.q === 0 && cell.r === 0 ? "FORGE" : ""}</text>`
                      : renderCellLabel(building, center.x, center.y)
                  }
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="hex-map-panel__legend">
        <span><i class="legend-swatch legend-swatch--core"></i> Reserved forge core</span>
        <span><i class="legend-swatch legend-swatch--open"></i> Selectable outer hex</span>
        <span><i class="legend-swatch legend-swatch--occupied"></i> Occupied building hex</span>
      </div>
      <div class="hex-map-panel__actions">
        <button class="button button--ghost" data-action="clear-building-placement">Clear Selected Placement</button>
      </div>
    </section>
  `;
}
