import { getBuildingEconomySummary, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { MAP_CONFIG, MAP_TERRAIN_THEMES } from "../content/MapConfig.js";
import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getConstructionEtaDetails } from "../systems/ConstructionSystem.js";
import { getBuildingMultiplier } from "../systems/BuildingSystem.js";
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

function renderBuildingThumb(building, cx, cy, size) {
  if (!building) {
    return "";
  }
  const emoji = getBuildingEmoji(building);
  return `
    <g class="hex-map__building-token" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${size * 0.43}"></circle>
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" class="hex-map__label">
        ${escapeHtml(emoji)}
      </text>
    </g>
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
    <g class="hex-map__crest" aria-hidden="true" transform="translate(${crestX} ${crestY})">
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

function renderBastionLinks(cells, size) {
  const bastionCells = new Map(
    cells
      .filter((cell) => cell.isFortificationRing)
      .map((cell) => [getCellKey(cell.q, cell.r), cell])
  );
  const renderedPairs = new Set();

  return [...bastionCells.values()]
    .flatMap((cell) => {
      const from = axialToPixel(cell.q, cell.r, size);
      return HEX_NEIGHBORS.map(([dq, dr]) => {
        const neighbor = bastionCells.get(getCellKey(cell.q + dq, cell.r + dr));
        if (!neighbor) {
          return "";
        }
        const pairKey = [cell.key, neighbor.key].sort().join(":");
        if (renderedPairs.has(pairKey)) {
          return "";
        }
        renderedPairs.add(pairKey);
        const to = axialToPixel(neighbor.q, neighbor.r, size);
        return `
          <line class="hex-map__bastion-link hex-map__bastion-link--glow" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>
          <line class="hex-map__bastion-link hex-map__bastion-link--main" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>
        `;
      });
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
          stroke="${influence.color}"
          stroke-opacity="${Math.min(0.34, opacity + 0.08)}"
          stroke-width="1.1"
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
        ${escapeHtml(getBuildingEmoji(selectedBuilding))}
      </text>
    </g>
  `;
}

function renderCellInspector(state, cell, selectedBuilding) {
  if (!cell) {
    return `<p class="empty-state">Select a hex to scout its terrain, district pull, and resonance before you claim it.</p>`;
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
  const isPinned = occupant ? Boolean(state.settings?.pinnedBuildingIds?.includes(occupant.id)) : false;

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
      ${
        occupant
          ? `
              <article class="hex-map-tooltip__actions-card">
                <span>Quick Actions</span>
                <div class="hex-map-tooltip__actions">
                  <button class="button button--ghost" data-action="inspect-building" data-building-id="${occupant.id}">Open Dossier</button>
                  <button class="button button--ghost" data-action="move-map-building" data-building-id="${occupant.id}">Move</button>
                  <button class="button button--ghost" data-action="clear-map-building-placement" data-building-id="${occupant.id}">Unplace</button>
                  <button class="button button--ghost" data-action="toggle-building-pin" data-building-id="${occupant.id}">${isPinned ? "Unpin" : "Pin"}</button>
                </div>
              </article>
            `
          : ""
      }
    </div>
  `;
}

function formatTerrainLabel(terrain) {
  const value = String(terrain ?? "neutral");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDistrictDisplayName(district) {
  return String(district ?? "District").replace(/\s+District$/i, "");
}

function getPlacementCandidates(state, cell) {
  if (!cell || cell.isReserved || getBuildingAtCell(state, cell.q, cell.r)) {
    return [];
  }

  return state.buildings
    .filter((building) => !building.mapPosition)
    .filter((building) => canPlaceBuildingAt(state, building.id, cell.q, cell.r).ok)
    .sort((left, right) => {
      const leftSelected = left.id === state.ui.selectedBuildingId ? -1 : 0;
      const rightSelected = right.id === state.ui.selectedBuildingId ? -1 : 0;
      if (leftSelected !== rightSelected) {
        return leftSelected - rightSelected;
      }
      const leftPinned = state.settings?.pinnedBuildingIds?.includes(left.id) ? -1 : 0;
      const rightPinned = state.settings?.pinnedBuildingIds?.includes(right.id) ? -1 : 0;
      if (leftPinned !== rightPinned) {
        return leftPinned - rightPinned;
      }
      if (left.rarity !== right.rarity) {
        return RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity);
      }
      return left.displayName.localeCompare(right.displayName);
    });
}

function getPlacementRecommendation(state, building, cell) {
  const validation = canPlaceBuildingAt(state, building.id, cell.q, cell.r);
  if (!validation.ok) {
    return {
      score: -1,
      label: "Blocked",
      className: "is-blocked",
      detail: validation.reason
    };
  }

  const previewTarget = { ...building, mapPosition: { q: cell.q, r: cell.r } };
  const bonus = getBuildingPlacementBonuses(state, previewTarget);
  const districtInfluence = getDistrictInfluence(state, cell);
  let score = bonus.totalPercent;
  if (districtInfluence?.district === building.district) {
    score += 0.08;
  }
  if (bonus.sameDistrictNeighbors > 0) {
    score += 0.03;
  }
  if (bonus.relatedTagNeighbors > 0) {
    score += 0.02;
  }
  if (cell.isFortificationRing && isFortificationBuilding(building)) {
    score += 0.12;
  }

  if (score >= 0.2) {
    return {
      score,
      label: "Perfect",
      className: "is-best",
      detail: cell.isFortificationRing
        ? `Rampart-ready at +${formatNumber(bonus.totalPercent * 100, 1)}% resonance`
        : `Sings at +${formatNumber(bonus.totalPercent * 100, 1)}% resonance`
    };
  }
  if (score >= 0.08) {
    return {
      score,
      label: "Strong",
      className: "is-good",
      detail: `Solid fit at +${formatNumber(bonus.totalPercent * 100, 1)}% resonance`
    };
  }
  return {
    score,
    label: "Wild",
    className: "is-poor",
    detail:
      bonus.totalPercent > 0
        ? `A scrappy +${formatNumber(bonus.totalPercent * 100, 1)}% resonance`
        : "Playable, but the hex is quiet"
  };
}

function sortPlacementCandidates(candidates, state, cell) {
  return [...candidates].sort((left, right) => {
    const leftSelected = left.id === state.ui.selectedBuildingId ? -1 : 0;
    const rightSelected = right.id === state.ui.selectedBuildingId ? -1 : 0;
    if (leftSelected !== rightSelected) {
      return leftSelected - rightSelected;
    }
    const leftPinned = state.settings?.pinnedBuildingIds?.includes(left.id) ? -1 : 0;
    const rightPinned = state.settings?.pinnedBuildingIds?.includes(right.id) ? -1 : 0;
    if (leftPinned !== rightPinned) {
      return leftPinned - rightPinned;
    }
    const recommendationDiff =
      getPlacementRecommendation(state, right, cell).score - getPlacementRecommendation(state, left, cell).score;
    if (recommendationDiff !== 0) {
      return recommendationDiff;
    }
    if (left.rarity !== right.rarity) {
      return RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity);
    }
    return left.displayName.localeCompare(right.displayName);
  });
}

function filterPlacementCandidates(candidates, state, filterKey) {
  switch (filterKey) {
    case "Defense":
      return candidates.filter((building) => isFortificationBuilding(building));
    case "Trade":
      return candidates.filter((building) => (building.tags ?? []).includes("trade"));
    case "Housing":
      return candidates.filter((building) => (building.tags ?? []).includes("housing"));
    case "Pinned":
      return candidates.filter((building) => state.settings?.pinnedBuildingIds?.includes(building.id));
    case "All":
    default:
      return candidates;
  }
}

function getOverlayCellClass(state, mapOverlay, cell, building, selectedBuilding) {
  switch (mapOverlay) {
    case "Defense":
      return cell.isFortificationRing || (building && isFortificationBuilding(building)) ? "is-overlay-focus" : "is-overlay-dim";
    case "Trade":
      return cell.terrain === "river" ||
        cell.terrain === "sea" ||
        (building && ((building.tags ?? []).includes("trade") || building.district === "Trade District" || building.district === "Harbor District"))
        ? "is-overlay-focus"
        : "is-overlay-dim";
    case "Water":
      return cell.terrain === "river" || cell.terrain === "sea" ? "is-overlay-focus" : "is-overlay-dim";
    case "Bastion":
      return cell.isFortificationRing || (building && isFortificationBuilding(building)) ? "is-overlay-focus" : "is-overlay-dim";
    case "Resonance":
      if (!selectedBuilding) {
        return building ? "is-overlay-focus" : "is-overlay-dim";
      }
      return !cell.isReserved && canPlaceBuildingAt(state, selectedBuilding.id, cell.q, cell.r).ok ? "is-overlay-focus" : "is-overlay-dim";
    case "District":
    default:
      return getDistrictInfluence(state, cell) ? "is-overlay-focus" : "is-overlay-dim";
  }
}

function getMapBuildingWarnings(building, state) {
  const warnings = [];
  if (!building) {
    return warnings;
  }

  if (!building.isComplete) {
    const etaDetails = getConstructionEtaDetails(building, state);
    if (etaDetails?.isStalled) {
      warnings.push("stalled");
    }
  }

  const economySummary = getBuildingEconomySummary(building);
  for (const entry of economySummary.consumes) {
    if (entry.key === "upkeep") {
      continue;
    }
    const stock = Number(state.resources?.[entry.key] ?? 0);
    const lowThreshold = Math.max(5, Number(entry.value ?? 0) * 2);
    if (stock <= 0 || stock <= lowThreshold) {
      warnings.push(entry.key);
      break;
    }
  }

  return warnings;
}

function renderBuildingMapBadges(building, state, cx, cy, size) {
  if (!building) {
    return "";
  }

  const badges = [];
  const multiplier = getBuildingMultiplier(building.quality);
  if (multiplier > 1) {
    badges.push({ label: `${multiplier}x`, className: "is-stage" });
  }
  if (getMapBuildingWarnings(building, state).length) {
    badges.push({ label: "!", className: "is-warning" });
  }
  if (state.transientUi?.recentBuildingChanges?.[building.id]) {
    badges.push({ label: "+", className: "is-recent" });
  }

  if (!badges.length) {
    return "";
  }

  return badges
    .slice(0, 3)
    .map((badge, index) => {
      const width = Math.max(18, 10 + badge.label.length * 7);
      const x = cx - size * 0.68;
      const y = cy - size * 0.78 + index * 15;
      return `
        <g class="hex-map__building-badge ${badge.className}">
          <rect x="${x}" y="${y}" width="${width}" height="13" rx="6.5"></rect>
          <text x="${x + width / 2}" y="${y + 9}" text-anchor="middle">${escapeHtml(badge.label)}</text>
        </g>
      `;
    })
    .join("");
}

function renderPlacementCelebration(pulseCell, center, size) {
  if (!pulseCell) {
    return "";
  }
  const emoji = pulseCell.emoji ?? "✨";
  return `
    <g class="hex-map__placement-burst" aria-hidden="true">
      <circle class="hex-map__placement-ring hex-map__placement-ring--outer" cx="${center.x}" cy="${center.y}" r="${size * 0.5}"></circle>
      <circle class="hex-map__placement-ring hex-map__placement-ring--inner" cx="${center.x}" cy="${center.y}" r="${size * 0.24}"></circle>
      <text x="${center.x}" y="${center.y - size * 0.94}" text-anchor="middle" class="hex-map__placement-emoji">${escapeHtml(emoji)}</text>
      ${[0, 1, 2, 3, 4, 5]
        .map((index) => {
          const angle = (-90 + index * 60) * (Math.PI / 180);
          const x1 = center.x + Math.cos(angle) * size * 0.18;
          const y1 = center.y + Math.sin(angle) * size * 0.18;
          const x2 = center.x + Math.cos(angle) * size * 0.68;
          const y2 = center.y + Math.sin(angle) * size * 0.68;
          return `<line class="hex-map__placement-ray hex-map__placement-ray--${index}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
        })
        .join("")}
    </g>
  `;
}

function renderPlacementCelebrationBurst(pulseCell, center, size) {
  if (!pulseCell) {
    return "";
  }
  const celebrationEmoji = pulseCell.emoji ?? "*";
  return `
    <g class="hex-map__placement-burst" aria-hidden="true">
      <circle class="hex-map__placement-ring hex-map__placement-ring--outer" cx="${center.x}" cy="${center.y}" r="${size * 0.5}"></circle>
      <circle class="hex-map__placement-ring hex-map__placement-ring--inner" cx="${center.x}" cy="${center.y}" r="${size * 0.24}"></circle>
      <text x="${center.x}" y="${center.y - size * 0.94}" text-anchor="middle" class="hex-map__placement-emoji">${escapeHtml(celebrationEmoji)}</text>
      ${[0, 1, 2, 3, 4, 5]
        .map((index) => {
          const angle = (-90 + index * 60) * (Math.PI / 180);
          const x1 = center.x + Math.cos(angle) * size * 0.18;
          const y1 = center.y + Math.sin(angle) * size * 0.18;
          const x2 = center.x + Math.cos(angle) * size * 0.68;
          const y2 = center.y + Math.sin(angle) * size * 0.68;
          return `<line class="hex-map__placement-ray hex-map__placement-ray--${index}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
        })
        .join("")}
    </g>
  `;
}

function renderDistrictLabels(state, size) {
  const districtMap = new Map();
  for (const building of state.buildings) {
    if (!building.mapPosition) {
      continue;
    }
    const center = axialToPixel(building.mapPosition.q, building.mapPosition.r, size);
    const entry = districtMap.get(building.district) ?? {
      district: building.district,
      color: state.districts.definitions?.[building.district]?.color ?? "#aac6ff",
      x: 0,
      y: 0,
      count: 0
    };
    entry.x += center.x;
    entry.y += center.y;
    entry.count += 1;
    districtMap.set(building.district, entry);
  }

  return [...districtMap.values()]
    .filter((entry) => entry.count > 0)
    .map((entry) => {
      const centerX = entry.x / entry.count;
      const centerY = entry.y / entry.count;
      const label = getDistrictDisplayName(entry.district);
      const width = Math.max(56, label.length * 7 + 20);
      return `
        <g class="hex-map__district-label" transform="translate(${centerX - width / 2} ${centerY - 12})">
          <rect width="${width}" height="18" rx="9" style="--district-label-color:${entry.color}"></rect>
          <text x="${width / 2}" y="12" text-anchor="middle">${escapeHtml(label)}</text>
        </g>
      `;
    })
    .join("");
}

function renderResonanceOverlay(state, cells, size, selectedBuilding, mapOverlay) {
  if (mapOverlay !== "Resonance" || !selectedBuilding) {
    return "";
  }

  return cells
    .filter((cell) => !cell.isReserved && !getBuildingAtCell(state, cell.q, cell.r))
    .map((cell) => {
      const validation = canPlaceBuildingAt(state, selectedBuilding.id, cell.q, cell.r);
      if (!validation.ok) {
        return "";
      }
      const previewTarget = { ...selectedBuilding, mapPosition: { q: cell.q, r: cell.r } };
      const bonus = getBuildingPlacementBonuses(state, previewTarget);
      const center = axialToPixel(cell.q, cell.r, size);
      return `
        <g class="hex-map__resonance-tag">
          <rect x="${center.x - 16}" y="${center.y - 28}" width="32" height="12" rx="6"></rect>
          <text x="${center.x}" y="${center.y - 19}" text-anchor="middle">+${formatNumber(bonus.totalPercent * 100, 0)}%</text>
        </g>
      `;
    })
    .join("");
}

// District summary cards (Part 2 of redesign-townmap.md). One card per
// district the city actually has buildings in, plus a Frontier / Bastion
// summary so the GM can read map composition at a glance.
function renderDistrictSummaryCards(state, cells) {
  const definitions = state.districts?.definitions ?? {};
  const counts = {};
  const placedCounts = {};
  for (const cell of cells) {
    if (cell.isReserved) continue;
    const isBastion = cell.isFortificationRing;
    const zoneKey = isBastion ? "__bastion" : "__frontier";
    counts[zoneKey] = (counts[zoneKey] ?? 0) + 1;
  }
  for (const b of state.buildings ?? []) {
    if (!b.mapPosition) continue;
    const cell = cells.find((c) => c.q === b.mapPosition.q && c.r === b.mapPosition.r);
    const zoneKey = cell?.isFortificationRing ? "__bastion" : "__frontier";
    placedCounts[zoneKey] = (placedCounts[zoneKey] ?? 0) + 1;
    if (b.district) {
      counts[b.district] = (counts[b.district] ?? 0) + 1;
      placedCounts[b.district] = (placedCounts[b.district] ?? 0) + 1;
    }
  }
  const awaitingByDistrict = {};
  for (const b of state.buildings ?? []) {
    if (b.mapPosition) continue;
    const key = b.district || "__unassigned";
    awaitingByDistrict[key] = (awaitingByDistrict[key] ?? 0) + 1;
  }

  const cards = [];
  // Frontier / Bastion zone cards always appear so the GM sees ring usage.
  const frontierTotal = counts.__frontier ?? 0;
  const frontierPlaced = placedCounts.__frontier ?? 0;
  const bastionTotal = counts.__bastion ?? 0;
  const bastionPlaced = placedCounts.__bastion ?? 0;
  const frontierPct = frontierTotal > 0 ? Math.round((frontierPlaced / frontierTotal) * 100) : 0;
  const bastionPct = bastionTotal > 0 ? Math.round((bastionPlaced / bastionTotal) * 100) : 0;
  cards.push({
    key: "__frontier",
    name: "Frontier District",
    color: "#94a3b8",
    placed: frontierPlaced,
    total: frontierTotal,
    pct: frontierPct,
    awaiting: Object.values(awaitingByDistrict).reduce((a, b) => a + b, 0),
    sub: "Inner ring · city plots"
  });
  cards.push({
    key: "__bastion",
    name: "Bastion Ring",
    color: "#e58cff",
    placed: bastionPlaced,
    total: bastionTotal,
    pct: bastionPct,
    awaiting: 0,
    sub: `${bastionTotal - bastionPlaced} gaps remaining`
  });
  // Per-district cards (only those that have either a definition or any building).
  const districtKeys = new Set([
    ...Object.keys(definitions),
    ...Object.keys(placedCounts).filter((k) => !k.startsWith("__"))
  ]);
  for (const dKey of districtKeys) {
    const def = definitions[dKey] ?? {};
    const placed = placedCounts[dKey] ?? 0;
    if (!placed && !def.name) continue;
    cards.push({
      key: dKey,
      name: def.name || dKey,
      color: def.color || "var(--accent)",
      placed,
      total: placed, // district has no fixed cap; show as 100%
      pct: 100,
      awaiting: awaitingByDistrict[dKey] ?? 0,
      sub: def.summary || ""
    });
  }

  return `
    <section class="district-cards" aria-label="District summary">
      ${cards.map((c) => `
        <article class="district-card" data-district="${escapeHtml(c.key)}">
          <header class="district-card__header">
            <span class="district-card__swatch" style="background:${escapeHtml(c.color)}"></span>
            <span class="district-card__name">${escapeHtml(c.name)}</span>
            <span class="district-card__count">${formatNumber(c.placed, 0)}${c.total !== c.placed ? ` / ${formatNumber(c.total, 0)}` : ""}</span>
          </header>
          ${c.total > 0 && c.key.startsWith("__") ? `
            <div class="district-card__bar"><div class="district-card__fill" style="width:${c.pct}%; background:${escapeHtml(c.color)}"></div></div>
          ` : ""}
          <div class="district-card__meta">
            ${c.awaiting > 0 ? `<span class="district-card__awaiting">${formatNumber(c.awaiting, 0)} building${c.awaiting === 1 ? "" : "s"} awaiting placement</span>` : ""}
            ${c.sub ? `<span class="district-card__sub">${escapeHtml(c.sub)}</span>` : ""}
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderMapPresets(state) {
  const presets = state.settings?.mapPresets ?? [];
  return `
    <section class="hex-map-panel__presets panel panel--subtle">
      <div class="hex-map-panel__presets-head">
        <div>
          <h4>Map Presets</h4>
          <span class="panel__subtle">Save a layout, test a different one, then restore it.</span>
        </div>
        <button class="button button--ghost" data-action="save-map-preset">Save Current Layout</button>
      </div>
      ${
        presets.length
          ? `
              <div class="hex-map-panel__preset-list">
                ${presets
                  .map(
                    (preset) => `
                      <article class="hex-map-panel__preset-item">
                        <div class="hex-map-panel__preset-copy">
                          <strong>${escapeHtml(preset.name)}</strong>
                          <span>${escapeHtml(new Date(preset.savedAt ?? Date.now()).toLocaleString())}</span>
                        </div>
                        <div class="hex-map-panel__preset-actions">
                          <button class="button button--ghost" data-action="restore-map-preset" data-preset-id="${preset.id}">Restore</button>
                          <button class="button button--ghost" data-action="delete-map-preset" data-preset-id="${preset.id}">Delete</button>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            `
          : `<div class="empty-state">No saved Town Map layouts yet.</div>`
      }
    </section>
  `;
}

function getBastionDefenseSummary(state, cells) {
  const bastionBuildings = state.buildings.filter((building) => {
    if (!building.mapPosition) {
      return false;
    }
    const cell = cells.find((entry) => entry.q === building.mapPosition.q && entry.r === building.mapPosition.r);
    return Boolean(cell?.isFortificationRing);
  });
  const wallStrength = bastionBuildings.reduce((sum, building) => sum + Number(building.stats?.defense ?? 0), 0);

  const edgeCityCells = cells.filter((cell) => {
    if (cell.isReserved || cell.isFortificationRing) {
      return false;
    }
    return getNeighborCoords(cell.q, cell.r).some((neighbor) => findCellInList(cells, neighbor.q, neighbor.r)?.isFortificationRing);
  });

  const coveredEdgeCells = edgeCityCells.filter((cell) =>
    getNeighborCoords(cell.q, cell.r).some((neighbor) => {
      const ringCell = findCellInList(cells, neighbor.q, neighbor.r);
      return ringCell?.isFortificationRing && getBuildingAtCell(state, neighbor.q, neighbor.r);
    })
  ).length;

  return {
    wallStrength,
    edgeCells: edgeCityCells.length,
    coveredEdgeCells,
    siegeCoveragePercent: edgeCityCells.length ? (coveredEdgeCells / edgeCityCells.length) * 100 : 0
  };
}

function findCellInList(cells, q, r) {
  return cells.find((cell) => cell.q === q && cell.r === r) ?? null;
}

function renderPlacementPicker(state, cell) {
  if (!cell || cell.isReserved) {
    return "";
  }

  const occupant = getBuildingAtCell(state, cell.q, cell.r);
  if (occupant) {
    return "";
  }

  const filterKey = state.transientUi?.mapPlacementFilter ?? "All";
  const candidates = sortPlacementCandidates(filterPlacementCandidates(getPlacementCandidates(state, cell), state, filterKey), state, cell);
  const zoneLabel = cell.isFortificationRing ? "Bastion Ring" : "City Plot";
  const zoneEmoji = cell.isFortificationRing ? "🛡️" : "✨";
  const zoneDetail = cell.isFortificationRing
    ? "Only walls, towers, and defensive structures can be placed here."
    : "Any unplaced city structure that passes placement rules can be assigned here.";
  const pickerTitle = cell.isFortificationRing ? `Hold This ${zoneLabel}` : `Claim This ${zoneLabel}`;
  const plannerBuilding =
    state.buildings.find((building) => building.id === state.transientUi?.mapPlannerBuildingId) ?? null;

  return `
    <section class="panel hex-map-panel__picker" role="dialog" aria-label="Map placement drawer">
      <div class="panel__header hex-map-panel__picker-head">
        <div>
          <h4>${escapeHtml(pickerTitle)}</h4>
          <span class="panel__subtle">${escapeHtml(zoneDetail)}</span>
        </div>
        <button class="button button--ghost hex-map-panel__picker-close" data-action="clear-map-cell-selection" aria-label="Close placement drawer">Close</button>
      </div>
      <div class="hex-map-panel__picker-filters">
        ${["All", "Defense", "Trade", "Housing", "Pinned"]
          .map(
            (filter) => `
              <button
                class="button button--ghost city-filter ${filterKey === filter ? "is-active" : ""}"
                data-action="set-map-placement-filter"
                data-filter="${filter}"
              >
                ${escapeHtml(filter)}
              </button>
            `
          )
          .join("")}
      </div>
      ${
        plannerBuilding
          ? `
              <div class="hex-map-panel__planner-banner">
                <strong>${escapeHtml(`${getBuildingEmoji(plannerBuilding)} ${plannerBuilding.displayName}`)}</strong>
                <span>${state.transientUi?.mapPlannerMode === "move" ? "Move mode armed. Pick a new home." : "Planning queue armed. Keep the momentum going."}</span>
              </div>
            `
          : ""
      }
      ${
        candidates.length
          ? `
              <div class="hex-map-panel__picker-list">
                ${candidates
                  .map((building) => {
                    const isSelected = building.id === state.ui.selectedBuildingId;
                    const recommendation = getPlacementRecommendation(state, building, cell);
                    const isPlannerArmed = building.id === state.transientUi?.mapPlannerBuildingId;
                    return `
                      <article class="hex-map-panel__picker-item ${isSelected ? "is-selected" : ""}">
                        <div class="hex-map-panel__picker-copy">
                          <div class="hex-map-panel__picker-line">
                            <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                            <span class="hex-map-panel__fit ${recommendation.className}">${escapeHtml(recommendation.label)}</span>
                          </div>
                          <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district)}</span>
                          <small>${escapeHtml(recommendation.detail)}</small>
                        </div>
                        <div class="hex-map-panel__picker-actions">
                          ${isPlannerArmed ? `<span class="hex-map-panel__picker-flag">Armed</span>` : isSelected ? `<span class="hex-map-panel__picker-flag">Selected</span>` : ""}
                          <button
                            class="button button--ghost"
                            data-action="arm-map-building"
                            data-building-id="${building.id}"
                          >
                            Queue
                          </button>
                          <button
                            class="button button--ghost hex-map-panel__place-now"
                            data-action="place-building-on-cell"
                            data-building-id="${building.id}"
                            data-q="${cell.q}"
                            data-r="${cell.r}"
                          >
                            Place Now
                          </button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            `
          : `<div class="empty-state">No unplaced buildings feel right for this hex just yet.</div>`
      }
    </section>
  `;
}

export function renderHexMap(state) {
  const cells = state.map.cells;
  const size = MAP_CONFIG.hexSize;
  const bounds = getMapBounds(cells, size);
  const cellByKey = new Map(cells.map((cell) => [getCellKey(cell.q, cell.r), cell]));
  const mapOverlay = state.transientUi?.mapOverlay ?? "District";
  const mapLegendOpen = state.transientUi?.mapLegendOpen ?? true;
  const mapZoom = Number(state.transientUi?.mapZoom ?? 1);
  const mapPanX = Number(state.transientUi?.mapPanX ?? 0);
  const mapPanY = Number(state.transientUi?.mapPanY ?? 0);
  const selectedBuilding =
    state.buildings.find((building) => building.id === state.ui.selectedBuildingId) ?? null;
  const plannerBuilding =
    state.buildings.find((building) => building.id === state.transientUi?.mapPlannerBuildingId) ?? null;
  const selectedPosition = selectedBuilding?.mapPosition ?? null;
  const isPlacementPlannerActive = Boolean(plannerBuilding);
  const renderMapDecor = !isPlacementPlannerActive;
  let unplacedCount = 0;
  let placedCityPlotCount = 0;
  let occupiedBastionCount = 0;
  let defensiveBacklogCount = 0;
  for (const building of state.buildings) {
    if (!building.mapPosition) {
      unplacedCount += 1;
      if (isFortificationBuilding(building)) {
        defensiveBacklogCount += 1;
      }
      continue;
    }
    const cell = cellByKey.get(getCellKey(building.mapPosition.q, building.mapPosition.r));
    if (cell?.isFortificationRing) {
      occupiedBastionCount += 1;
    } else if (cell && !cell.isReserved) {
      placedCityPlotCount += 1;
    }
  }
  const selectedDistrictColor =
    selectedBuilding && state.districts.definitions[selectedBuilding.district]
      ? state.districts.definitions[selectedBuilding.district].color
      : null;
  const selectedBuildingCanUseBastion = selectedBuilding ? isFortificationBuilding(selectedBuilding) : false;
  const focalCell = state.ui.selectedMapCell ?? selectedPosition ?? null;
  const focalMapCell = focalCell ? cellByKey.get(getCellKey(focalCell.q, focalCell.r)) ?? null : null;
  const selectedMapCell = state.ui.selectedMapCell
    ? cellByKey.get(getCellKey(state.ui.selectedMapCell.q, state.ui.selectedMapCell.r)) ?? null
    : null;
  const selectedMapBuilding = selectedMapCell ? getBuildingAtCell(state, selectedMapCell.q, selectedMapCell.r) : null;
  const selectedPreviewValidation =
    selectedMapCell && selectedBuilding && !selectedMapBuilding
      ? canPlaceBuildingAt(state, selectedBuilding.id, selectedMapCell.q, selectedMapCell.r)
      : null;
  const adjacencyPulse = state.transientUi?.adjacencyPulse ?? null;
  const bastionPlotCount = cells.filter((cell) => cell.isFortificationRing).length;
  const cityPlotCount = cells.filter((cell) => !cell.isReserved && !cell.isFortificationRing).length;
  const defenseSummary = getBastionDefenseSummary(state, cells);
  const adjacentKeys = new Set(
    focalCell ? getNeighborCoords(focalCell.q, focalCell.r).map((cell) => getCellKey(cell.q, cell.r)) : []
  );
  const placementModeActive = Boolean(selectedBuilding && state.transientUi?.validPlacementMode);
  const previewMessage = selectedMapCell
    ? selectedMapBuilding
      ? `${selectedMapBuilding.displayName} occupies this plot.`
      : selectedBuilding
        ? selectedPreviewValidation?.ok
          ? `${selectedBuilding.displayName} can be placed here.`
          : selectedPreviewValidation?.reason ?? `Selected plot`
        : `Empty plot selected.`
    : selectedBuilding
      ? selectedBuildingCanUseBastion
        ? "Select a city plot or bastion hex to preview placement."
        : "Select a city plot to preview placement. The bastion ring is defense-only."
      : "Select a building from the stream or click an occupied hex to inspect it.";
  const selectionStrength = selectedBuilding
    ? selectedBuildingCanUseBastion
      ? "Can be placed in the city ring or on the bastion."
      : "Can be placed only in the city ring."
    : "Pick a building to see where it belongs.";
  const overlaySlug = mapOverlay.toLowerCase();

  return `
    <section class="panel hex-map-panel">
      <div class="panel__header">
        <h3>City Ring Map</h3>
        <span class="panel__subtle">Forge core at the center, civic plots through the middle, and a fortified outer bastion reserved for walls, towers, and war engines.</span>
      </div>
      <div class="hex-map-panel__toolbar">
        <div class="hex-map-panel__toolbar-group">
          <span class="hex-map-panel__toolbar-label">Overlay</span>
          ${["District", "Defense", "Trade", "Resonance", "Water", "Bastion"]
            .map(
              (overlay) => `
                <button class="button button--ghost city-filter ${mapOverlay === overlay ? "is-active" : ""}" data-action="set-map-overlay" data-overlay="${overlay}">
                  ${escapeHtml(overlay)}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="hex-map-panel__toolbar-group">
          <span class="hex-map-panel__toolbar-label">View</span>
          <button class="button button--ghost" data-action="adjust-map-zoom" data-delta="-0.1">-</button>
          <span class="hex-map-panel__zoom-readout">${formatNumber(mapZoom * 100, 0)}%</span>
          <button class="button button--ghost" data-action="adjust-map-zoom" data-delta="0.1">+</button>
          <button class="button button--ghost" data-action="reset-map-view">Reset View</button>
          <button class="button button--ghost" data-action="toggle-map-legend">${mapLegendOpen ? "Hide Legend" : "Show Legend"}</button>
        </div>
        <div class="hex-map-panel__toolbar-group hex-map-panel__toolbar-group--planner">
          <span class="hex-map-panel__toolbar-label">Planner</span>
          <strong>${plannerBuilding ? escapeHtml(`${getBuildingEmoji(plannerBuilding)} ${plannerBuilding.displayName}`) : "Idle"}</strong>
          <small>${
            plannerBuilding
              ? state.transientUi?.mapPlannerMode === "move"
                ? "Move mode: click a new hex"
                : "Queue mode: place several without reopening the drawer"
              : "Arm a building from the drawer to chain placements"
          }</small>
          ${
            plannerBuilding
              ? `<button class="button button--ghost" data-action="clear-map-planner">Clear Planner</button>`
              : ""
          }
        </div>
      </div>
      <div class="hex-map-panel__status">
        <div class="hex-map-panel__status-card hex-map-panel__status-card--selected">
          <strong>${selectedBuilding ? escapeHtml(selectedBuilding.displayName) : "No building selected"}</strong>
          <span>${
            selectedPosition
              ? `Currently placed on the map`
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
        <div class="hex-map-panel__status-card hex-map-panel__status-card--defense">
          <strong>${formatNumber(defenseSummary.wallStrength, 0)} wall strength</strong>
          <span>${occupiedBastionCount} / ${bastionPlotCount} bastion hexes filled</span>
          <span>${formatNumber(defenseSummary.siegeCoveragePercent, 0)}% siege coverage of the inner edge</span>
        </div>
      </div>
      <div class="hex-map-wrap hex-map-wrap--canvas">
        <div class="town-map-canvas-mount" data-town-map-mount role="img" aria-label="City hex map"></div>
        ${renderPlacementPicker(state, selectedMapCell)}
      </div>
      ${
        mapLegendOpen
          ? `
              <div class="hex-map-panel__legend">
                <span><i class="legend-swatch legend-swatch--core"></i> Reserved forge core</span>
                <span><i class="legend-swatch legend-swatch--open"></i> City plot</span>
                <span><i class="legend-swatch legend-swatch--bastion"></i> Bastion ring (defense-only)</span>
                <span><i class="legend-swatch legend-swatch--occupied"></i> Occupied building hex</span>
                <span><i class="legend-swatch legend-swatch--adjacent"></i> Adjacency preview</span>
                <span><i class="legend-swatch legend-swatch--district"></i> District influence field</span>
              </div>
            `
          : ""
      }
      <div class="hex-map-panel__tooltip">
        ${renderCellInspector(state, focalMapCell, selectedBuilding)}
      </div>
      ${renderDistrictSummaryCards(state, cells)}
      ${/* Map Presets removed per redesign-townmap.md Part 2. */ ""}
      <div class="hex-map-panel__actions">
        <button class="button" data-action="auto-place-buildings">Auto Place Unplaced</button>
        <button class="button button--ghost" data-action="clear-building-placement">Clear Selected Placement</button>
        <button class="button button--ghost" data-action="undo-last-placement">Undo Last Placement</button>
        ${
          selectedBuilding
            ? `<button class="button button--ghost" data-action="toggle-valid-placement-mode">${placementModeActive ? "Show Full Map" : "Show Valid Hexes"}</button>`
            : ""
        }
      </div>
    </section>
  `;
}
