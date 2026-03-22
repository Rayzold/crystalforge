import { MAP_CONFIG, MAP_TERRAIN_THEMES } from "../content/MapConfig.js";
import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import {
  canPlaceBuildingAt,
  getBuildingAtCell,
  getBuildingPlacementBonuses,
  getBuildingTerrain,
  getCellKey,
  getNeighborCoords,
  isFortificationBuilding
} from "../systems/MapSystem.js";

const HEX_NEIGHBORS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1]
];

const DISTRICT_CRESTS = {
  "Agricultural District": `<path d="M32 10c-10 2-17 11-17 21 0 10 7 18 17 18s17-8 17-18C49 21 42 12 32 10Zm0 8c4 7 2 16-6 22" />`,
  "Trade District": `<circle cx="25" cy="29" r="8" /><circle cx="39" cy="35" r="8" />`,
  "Residential District": `<path d="M14 32 32 17l18 15v16H14Z" /><path d="M26 48V36h12v12" />`,
  "Military District": `<path d="M32 10 49 17v12c0 10-7 17-17 21-10-4-17-11-17-21V17Z" />`,
  "Industrial District": `<path d="M18 18h14v9H18zM31 20l11-7 5 5-7 11ZM27 27l5 5-13 13-5-5Z" />`,
  "Arcane District": `<path d="m32 9 5 14 15 2-11 9 4 15-13-8-13 8 4-15-11-9 15-2Z" />`,
  "Religious District": `<path d="M32 10 45 24 39 24 46 51 18 51 25 24 19 24Z" />`,
  "Harbor District": `<path d="M32 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 10v18m-11-6c2 8 6 11 11 11s9-3 11-11m-14 0h-7m28 0h-7" />`,
  "Cultural District": `<path d="M18 15h24a7 7 0 1 1 0 14H20a7 7 0 1 0 0 14h24" />`,
  "Frontier District": `<path d="M14 48V18h14v7h8v-7h14v30H14Zm18 0V30" />`
};

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

function safeSvgId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderBuildingThumb(building, cx, cy, size) {
  if (!building.imagePath) {
    return "";
  }
  const clipId = `hex-clip-${safeSvgId(building.id)}`;
  return `
    <defs>
      <clipPath id="${clipId}">
        <polygon points="${hexPoints(cx, cy, size * 0.72)}"></polygon>
      </clipPath>
    </defs>
    <image
      href="${escapeHtml(building.imagePath)}"
      x="${cx - size * 0.72}"
      y="${cy - size * 0.62}"
      width="${size * 1.44}"
      height="${size * 1.24}"
      preserveAspectRatio="xMidYMid slice"
      clip-path="url(#${clipId})"
      opacity="0.9"
    ></image>
  `;
}

function renderDistrictCrest(building, districtColor, cx, cy, size) {
  if (!building || !districtColor) {
    return "";
  }

  const crestX = cx + size * 0.36;
  const crestY = cy - size * 0.42;
  const crestPath = DISTRICT_CRESTS[building.district] ?? DISTRICT_CRESTS["Residential District"];

  return `
    <g class="hex-map__crest" transform="translate(${crestX} ${crestY})">
      <circle class="hex-map__crest-badge" r="${size * 0.18}" fill="${districtColor}" style="--crest-color:${districtColor}"></circle>
      <g class="hex-map__crest-icon" transform="translate(-5.7 -5.7) scale(0.18)">
        ${crestPath}
      </g>
    </g>
  `;
}

function renderTerrainGlyph(cell, cx, cy) {
  switch (cell.terrain) {
    case "bastion":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 12} ${cy + 8}v-10h6v4h6v-4h6v4h6v-4h6v10"></path>
          <path d="M${cx - 12} ${cy + 8}h24"></path>
        </g>
      `;
    case "forest":
      return `
        <g class="hex-map__glyph">
          <circle cx="${cx - 8}" cy="${cy - 1}" r="4"></circle>
          <circle cx="${cx}" cy="${cy - 4}" r="4.2"></circle>
          <circle cx="${cx + 8}" cy="${cy - 1}" r="4"></circle>
          <path d="M${cx - 8} ${cy + 2}v6 M${cx} ${cy}v7 M${cx + 8} ${cy + 2}v6"></path>
        </g>
      `;
    case "mountain":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 12} ${cy + 8}l7-13 7 13Z M${cx - 1} ${cy + 8}l8-16 8 16Z"></path>
        </g>
      `;
    case "river":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 12} ${cy - 4}c4-3 8-3 12 0s8 3 12 0"></path>
          <path d="M${cx - 12} ${cy + 4}c4-3 8-3 12 0s8 3 12 0"></path>
        </g>
      `;
    case "dunes":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 12} ${cy + 4}c4-5 8-5 12 0 4-5 8-5 12 0"></path>
          <path d="M${cx - 8} ${cy - 2}c3-4 6-4 9 0 3-4 6-4 9 0"></path>
        </g>
      `;
    case "sea":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 12} ${cy}c4-3 8-3 12 0s8 3 12 0"></path>
          <path d="M${cx - 12} ${cy + 6}c4-3 8-3 12 0s8 3 12 0"></path>
        </g>
      `;
    case "frontier":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx} ${cy - 10}v20 M${cx - 7} ${cy - 2}c0-3 2-4 4-4h3 M${cx + 7} ${cy + 3}c0-3-2-4-4-4h-3"></path>
        </g>
      `;
    case "scar":
      return `
        <g class="hex-map__glyph">
          <path d="M${cx - 9} ${cy - 8}l6 6-3 5 7 5"></path>
        </g>
      `;
    default:
      return "";
  }
}

function renderWaterOverlay(cell, cx, cy) {
  if (cell.terrain === "river") {
    return `
      <g class="hex-map__water hex-map__water--river">
        <path class="hex-map__water-line hex-map__water-line--a" d="M${cx - 17} ${cy - 7}c5-4 10-4 15 0s10 4 15 0"></path>
        <path class="hex-map__water-line hex-map__water-line--b" d="M${cx - 17} ${cy + 1}c5-4 10-4 15 0s10 4 15 0"></path>
        <path class="hex-map__water-line hex-map__water-line--c" d="M${cx - 12} ${cy + 9}c4-3 8-3 12 0s8 3 12 0"></path>
      </g>
    `;
  }

  if (cell.terrain === "sea") {
    return `
      <g class="hex-map__water hex-map__water--sea">
        <ellipse class="hex-map__water-shimmer hex-map__water-shimmer--a" cx="${cx - 6}" cy="${cy - 4}" rx="10" ry="4"></ellipse>
        <ellipse class="hex-map__water-shimmer hex-map__water-shimmer--b" cx="${cx + 8}" cy="${cy + 6}" rx="13" ry="5"></ellipse>
        <ellipse class="hex-map__water-shimmer hex-map__water-shimmer--c" cx="${cx}" cy="${cy + 1}" rx="18" ry="6"></ellipse>
      </g>
    `;
  }

  return "";
}

function renderZoneField(cells, size, className, predicate, scale = 1.02) {
  return cells
    .filter(predicate)
    .map((cell) => {
      const center = axialToPixel(cell.q, cell.r, size);
      return `<polygon class="${className}" points="${hexPoints(center.x, center.y, size * scale)}"></polygon>`;
    })
    .join("");
}

function renderRoads(state, size) {
  const renderedPairs = new Set();
  const roads = [];
  const connectionCounts = new Map();

  for (const building of state.buildings) {
    if (!building.mapPosition) {
      continue;
    }

    for (const [dq, dr] of HEX_NEIGHBORS) {
      const neighbor = getBuildingAtCell(
        state,
        building.mapPosition.q + dq,
        building.mapPosition.r + dr
      );
      if (!neighbor || !neighbor.mapPosition) {
        continue;
      }
      const pairKey = [building.id, neighbor.id].sort().join(":");
      if (renderedPairs.has(pairKey)) {
        continue;
      }
      renderedPairs.add(pairKey);
      connectionCounts.set(building.id, (connectionCounts.get(building.id) ?? 0) + 1);
      connectionCounts.set(neighbor.id, (connectionCounts.get(neighbor.id) ?? 0) + 1);

      const from = axialToPixel(building.mapPosition.q, building.mapPosition.r, size);
      const to = axialToPixel(neighbor.mapPosition.q, neighbor.mapPosition.r, size);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const normalX = -dy / length;
      const normalY = dx / length;
      const curveDirection =
        building.mapPosition.q + building.mapPosition.r <= neighbor.mapPosition.q + neighbor.mapPosition.r ? 1 : -1;
      const curveAmount = size * 0.18 * curveDirection;
      const controlX = (from.x + to.x) / 2 + normalX * curveAmount;
      const controlY = (from.y + to.y) / 2 + normalY * curveAmount;
      roads.push(`
        <path
          d="M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}"
          class="hex-map__road hex-map__road--glow"
        ></path>
        <path
          d="M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}"
          class="hex-map__road hex-map__road--main"
        ></path>
      `);
    }
  }

  const junctions = state.buildings
    .filter((building) => building.mapPosition && (connectionCounts.get(building.id) ?? 0) >= 2)
    .map((building) => {
      const center = axialToPixel(building.mapPosition.q, building.mapPosition.r, size);
      return `
        <g class="hex-map__junction">
          <circle class="hex-map__junction-glow" cx="${center.x}" cy="${center.y}" r="${size * 0.24}"></circle>
          <circle class="hex-map__junction-core" cx="${center.x}" cy="${center.y}" r="${size * 0.11}"></circle>
        </g>
      `;
    });

  return `${roads.join("")}${junctions.join("")}`;
}

function hexDistance(aq, ar, bq, br) {
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs((-aq - ar) - (-bq - br)));
}

function getDistrictInfluence(state, cell) {
  if (cell.isReserved) {
    return null;
  }

  const weights = new Map();
  for (const building of state.buildings) {
    if (!building.mapPosition) {
      continue;
    }

    const distance = hexDistance(cell.q, cell.r, building.mapPosition.q, building.mapPosition.r);
    if (distance > 2) {
      continue;
    }

    const district = state.districts.definitions[building.district];
    if (!district) {
      continue;
    }

    const nextWeight = (weights.get(building.district)?.weight ?? 0) + (distance === 0 ? 4 : distance === 1 ? 2 : 1);
    weights.set(building.district, {
      color: district.color,
      weight: nextWeight
    });
  }

  const strongest = [...weights.entries()].sort((left, right) => right[1].weight - left[1].weight)[0];
  if (!strongest) {
    return null;
  }

  return {
    district: strongest[0],
    color: strongest[1].color,
    weight: strongest[1].weight
  };
}

function renderDistrictInfluenceField(state, cells, size) {
  return cells
    .map((cell) => {
      const influence = getDistrictInfluence(state, cell);
      if (!influence) {
        return "";
      }

      const center = axialToPixel(cell.q, cell.r, size);
      const opacity = Math.min(0.26, 0.07 + influence.weight * 0.035);
      return `
        <polygon
          class="hex-map__district-field"
          points="${hexPoints(center.x, center.y, size * 0.94)}"
          fill="${influence.color}"
          opacity="${opacity}"
        ></polygon>
      `;
    })
    .join("");
}

function renderPlacementPreview(selectedBuilding, cell, center, size, previewValid) {
  if (!selectedBuilding || !cell || cell.isReserved) {
    return "";
  }

  return `
    <g class="hex-map__preview ${previewValid ? "is-valid" : "is-invalid"}">
      <polygon
        points="${hexPoints(center.x, center.y, size * 0.72)}"
        fill="${RARITY_COLORS[selectedBuilding.rarity]}"
        opacity="${previewValid ? "0.32" : "0.18"}"
      ></polygon>
      <text x="${center.x}" y="${center.y + 5}" text-anchor="middle" class="hex-map__preview-label">
        ${escapeHtml(selectedBuilding.displayName.slice(0, 2).toUpperCase())}
      </text>
    </g>
  `;
}

function renderCellInspector(state, cell, selectedBuilding) {
  if (!cell) {
    return `<p class="empty-state">Hover a hex to inspect its terrain, district influence, and placement resonance.</p>`;
  }

  const occupant = getBuildingAtCell(state, cell.q, cell.r);
  const influence = getDistrictInfluence(state, cell);
  const zoneLabel = cell.isReserved ? "Forge Core" : cell.isFortificationRing ? "Bastion Ring" : "City Plot";
  const zoneDetail = cell.isReserved
    ? "The central forge remains reserved for the core."
    : cell.isFortificationRing
      ? "Defense-only rampart hex for walls, towers, and war engines."
      : "Standard city placement hex for civic, trade, housing, and utility structures.";
  const placementValidation =
    selectedBuilding && !occupant ? canPlaceBuildingAt(state, selectedBuilding.id, cell.q, cell.r) : null;
  const previewTarget =
    occupant ??
    (selectedBuilding && !cell.isReserved
      ? { ...selectedBuilding, mapPosition: { q: cell.q, r: cell.r } }
      : selectedBuilding);
  const placementBonus = previewTarget ? getBuildingPlacementBonuses(state, previewTarget) : null;
  const terrain = occupant ? getBuildingTerrain(state, occupant) : cell.terrain;

  return `
    <div class="hex-map-tooltip">
      <article>
        <span>Zone</span>
        <strong>${escapeHtml(zoneLabel)}</strong>
        <small>${escapeHtml(zoneDetail)}</small>
      </article>
      <article>
        <span>Hex</span>
        <strong>${cell.q}, ${cell.r}</strong>
        <small>${escapeHtml(terrain ?? "neutral")} terrain</small>
      </article>
      <article>
        <span>District Influence</span>
        <strong>${escapeHtml(influence?.district ?? "Unclaimed")}</strong>
        <small>${influence ? `Weight ${formatNumber(influence.weight, 0)}` : "No strong district pull yet."}</small>
      </article>
      <article>
        <span>Occupant</span>
        <strong>${escapeHtml(occupant?.displayName ?? "Empty hex")}</strong>
        <small>${
          occupant
            ? `${escapeHtml(occupant.rarity)} / ${escapeHtml(occupant.district)}`
            : selectedBuilding
              ? `Selected: ${escapeHtml(selectedBuilding.displayName)}`
              : "Select a building to preview placement resonance."
        }</small>
      </article>
      <article>
        <span>Placement Bonus</span>
        <strong>${placementBonus ? `${formatNumber(placementBonus.totalPercent * 100, 1)}%` : "0%"}</strong>
        <small>${
          placementValidation && !placementValidation.ok
            ? escapeHtml(placementValidation.reason)
            : placementBonus?.reasons.length
            ? escapeHtml(placementBonus.reasons.join(" / "))
            : "No adjacency or terrain bonus from this view."
        }</small>
      </article>
    </div>
  `;
}

export function renderHexMap(state) {
  const cells = state.map.cells;
  const size = MAP_CONFIG.hexSize;
  const bounds = getMapBounds(cells, size);
  const selectedBuilding =
    state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const selectedPosition = selectedBuilding?.mapPosition ?? null;
  const hoveredMapCell = state.transientUi?.hoveredMapCell ?? null;
  const unplacedCount = state.buildings.filter((building) => !building.mapPosition).length;
  const selectedDistrictColor =
    selectedBuilding && state.districts.definitions[selectedBuilding.district]
      ? state.districts.definitions[selectedBuilding.district].color
      : null;
  const selectedBuildingCanUseBastion = selectedBuilding ? isFortificationBuilding(selectedBuilding) : false;
  const focalCell = hoveredMapCell ?? state.ui.selectedMapCell ?? selectedPosition ?? null;
  const focalMapCell = focalCell ? state.map.cells.find((cell) => cell.q === focalCell.q && cell.r === focalCell.r) ?? null : null;
  const adjacencyPulse = state.transientUi?.adjacencyPulse ?? null;
  const bastionPlotCount = cells.filter((cell) => cell.isFortificationRing).length;
  const cityPlotCount = cells.filter((cell) => !cell.isReserved && !cell.isFortificationRing).length;
  const placedCityPlotCount = state.buildings.filter((building) => {
    if (!building.mapPosition) {
      return false;
    }
    const cell = state.map.cells.find((entry) => entry.q === building.mapPosition.q && entry.r === building.mapPosition.r);
    return Boolean(cell && !cell.isReserved && !cell.isFortificationRing);
  }).length;
  const occupiedBastionCount = state.buildings.filter((building) => {
    if (!building.mapPosition) {
      return false;
    }
    const cell = state.map.cells.find((entry) => entry.q === building.mapPosition.q && entry.r === building.mapPosition.r);
    return Boolean(cell?.isFortificationRing);
  }).length;
  const defensiveBacklogCount = state.buildings.filter(
    (building) => !building.mapPosition && isFortificationBuilding(building)
  ).length;
  const adjacentKeys = new Set(
    focalCell ? getNeighborCoords(focalCell.q, focalCell.r).map((cell) => getCellKey(cell.q, cell.r)) : []
  );
  const previewValidation =
    hoveredMapCell && selectedBuilding ? canPlaceBuildingAt(state, selectedBuilding.id, hoveredMapCell.q, hoveredMapCell.r) : null;
  const previewMessage = hoveredMapCell
    ? previewValidation?.ok
      ? `Previewing ${selectedBuilding?.displayName ?? "placement"} at hex ${hoveredMapCell.q}, ${hoveredMapCell.r}`
      : previewValidation?.reason ?? `Hex ${hoveredMapCell.q}, ${hoveredMapCell.r}`
    : selectedBuilding
      ? selectedBuildingCanUseBastion
        ? "Hover a city plot or bastion hex to preview placement."
        : "Hover a city plot to preview placement. The bastion ring is defense-only."
      : "Select a building from the stream or click an occupied hex to inspect it.";
  const selectionStrength = selectedBuilding
    ? selectedBuildingCanUseBastion
      ? "Can be placed in the city ring or on the bastion."
      : "Can be placed only in the city ring."
    : "Pick a building to see where it belongs.";

  return `
    <section class="panel hex-map-panel">
      <div class="panel__header">
        <h3>City Ring Map</h3>
        <span class="panel__subtle">Forge core at the center, civic plots through the middle, and a fortified outer bastion reserved for walls, towers, and war engines.</span>
      </div>
      <div class="hex-map-panel__status">
        <div class="hex-map-panel__status-card hex-map-panel__status-card--selected">
          <strong>${selectedBuilding ? escapeHtml(selectedBuilding.displayName) : "No building selected"}</strong>
          <span>${
            selectedPosition
              ? `Currently at hex ${selectedPosition.q}, ${selectedPosition.r}`
              : selectedBuilding
                ? selectedBuildingCanUseBastion
                  ? "Click a city plot or bastion hex to place it"
                  : "Click a city plot to place it"
                : "Select a building card or occupied hex"
          }</span>
          <span>${escapeHtml(previewMessage)}</span>
          <span>${escapeHtml(selectionStrength)}</span>
          ${
            selectedBuilding
              ? `<span class="hex-map-panel__district"><i class="legend-swatch" style="background:${selectedDistrictColor}; border-color:${selectedDistrictColor};"></i>${escapeHtml(selectedBuilding.district)}</span>`
              : ""
          }
        </div>
        <div class="hex-map-panel__status-card hex-map-panel__status-card--city">
          <strong>${placedCityPlotCount} / ${cityPlotCount}</strong>
          <span>Inner city plots occupied</span>
          <span>${unplacedCount} buildings still waiting for placement</span>
        </div>
        <div class="hex-map-panel__status-card hex-map-panel__status-card--bastion">
          <strong>${occupiedBastionCount} / ${bastionPlotCount}</strong>
          <span>Bastion ring occupied</span>
          <span>Walls, towers, and war engines only</span>
        </div>
        <div class="hex-map-panel__status-card hex-map-panel__status-card--ready">
          <strong>${defensiveBacklogCount}</strong>
          <span>Unplaced defensive structures</span>
          <span>${defensiveBacklogCount ? "Ready to claim bastion hexes." : "No defenses are waiting for the ring."}</span>
        </div>
      </div>
      <div class="hex-map-wrap">
        <svg
          class="hex-map"
          viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
          role="img"
          aria-label="City hex map"
        >
          <g class="hex-map__zone-fields">
            ${renderZoneField(cells, size, "hex-map__zone-field hex-map__zone-field--city", (cell) => !cell.isReserved && !cell.isFortificationRing)}
            ${renderZoneField(cells, size, "hex-map__zone-field hex-map__zone-field--bastion", (cell) => cell.isFortificationRing, 1.06)}
          </g>
          <g class="hex-map__district-fields">
            ${renderDistrictInfluenceField(state, cells, size)}
          </g>
          <g class="hex-map__roads">
            ${renderRoads(state, size)}
          </g>
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
                  ? `${building.displayName} (${building.rarity} / ${building.district})`
                  : cell.isFortificationRing
                    ? `Bastion hex ${cell.q}, ${cell.r}`
                    : `City plot ${cell.q}, ${cell.r}`;
              const districtColor =
                building && state.districts.definitions[building.district]
                  ? state.districts.definitions[building.district].color
                  : null;
              const isPulseCell =
                adjacencyPulse &&
                adjacencyPulse.q === cell.q &&
                adjacencyPulse.r === cell.r &&
                adjacencyPulse.buildingId === building?.id;

              return `
                <g
                  class="hex-map__cell ${cell.isReserved ? "is-reserved" : ""} ${cell.isFortificationRing ? "is-fortification-ring" : "is-city-plot"} ${building ? "is-occupied" : ""} ${isSelected ? "is-selected" : ""} ${isFocusedCell ? "is-focused" : ""} ${hoveredMapCell && hoveredMapCell.q === cell.q && hoveredMapCell.r === cell.r ? "is-hovered" : ""} ${adjacentKeys.has(cell.key) ? "is-adjacent" : ""} ${isPulseCell ? "is-resonance-pulse" : ""} ${selectedBuilding && hoveredMapCell && hoveredMapCell.q === cell.q && hoveredMapCell.r === cell.r && !building && !cell.isReserved ? (previewValidation?.ok ? "is-preview-valid" : "is-preview-invalid") : ""}"
                  data-action="select-map-cell"
                  data-q="${cell.q}"
                  data-r="${cell.r}"
                >
                  <title>${escapeHtml(title)}</title>
                  <polygon
                    class="hex-map__cell-face"
                    points="${hexPoints(center.x, center.y, size)}"
                    fill="${fill}"
                    stroke="${building ? MAP_CONFIG.occupiedOutlineColor : theme.stroke}"
                    stroke-width="${isSelected || isFocusedCell ? 3 : 1.5}"
                    aria-label="${escapeHtml(title)}"
                  ></polygon>
                  <polygon
                    class="hex-map__cell-bevel"
                    points="${hexPoints(center.x, center.y, size * 0.86)}"
                    fill="none"
                  ></polygon>
                  ${renderWaterOverlay(cell, center.x, center.y)}
                  ${
                    hoveredMapCell &&
                    hoveredMapCell.q === cell.q &&
                    hoveredMapCell.r === cell.r &&
                    !building
                      ? renderPlacementPreview(selectedBuilding, cell, center, size, Boolean(previewValidation?.ok))
                      : ""
                  }
                  ${building ? renderBuildingThumb(building, center.x, center.y, size) : ""}
                  ${building ? renderDistrictCrest(building, districtColor, center.x, center.y, size) : ""}
                  ${
                    building && districtColor
                      ? `
                        <polygon
                          class="hex-map__district-aura"
                          points="${hexPoints(center.x, center.y, size * 0.92)}"
                          fill="none"
                          stroke="${districtColor}"
                          stroke-width="5"
                          style="--district-color:${districtColor}"
                        ></polygon>
                        <polygon
                          points="${hexPoints(center.x, center.y, size * 0.8)}"
                          fill="none"
                          stroke="${districtColor}"
                          stroke-width="3"
                        ></polygon>
                      `
                      : renderTerrainGlyph(cell, center.x, center.y)
                  }
                  ${
                    cell.isReserved
                      ? `<text x="${center.x}" y="${center.y + 5}" text-anchor="middle" class="hex-map__core-text">${cell.q === 0 && cell.r === 0 ? "FORGE" : ""}</text>`
                      : renderCellLabel(building, center.x, center.y)
                  }
                  ${
                    isPulseCell
                      ? `<g class="hex-map__pulse-tag">
                          <circle cx="${center.x}" cy="${center.y - size * 0.48}" r="${size * 0.3}"></circle>
                          <text x="${center.x}" y="${center.y - size * 0.42}" text-anchor="middle">+${formatNumber((adjacencyPulse.gain ?? 0) * 100, 1)}%</text>
                        </g>`
                      : ""
                  }
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="hex-map-panel__legend">
        <span><i class="legend-swatch legend-swatch--core"></i> Reserved forge core</span>
        <span><i class="legend-swatch legend-swatch--open"></i> City plot</span>
        <span><i class="legend-swatch legend-swatch--bastion"></i> Bastion ring (defense-only)</span>
        <span><i class="legend-swatch legend-swatch--occupied"></i> Occupied building hex</span>
        <span><i class="legend-swatch legend-swatch--adjacent"></i> Adjacency preview</span>
        <span><i class="legend-swatch legend-swatch--district"></i> District influence field</span>
      </div>
      <div class="hex-map-panel__tooltip">
        ${renderCellInspector(state, focalMapCell, selectedBuilding)}
      </div>
      <div class="hex-map-panel__actions">
        <button class="button button--ghost" data-action="clear-building-placement">Clear Selected Placement</button>
      </div>
    </section>
  `;
}
