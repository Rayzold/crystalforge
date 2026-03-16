import { MAP_CONFIG } from "../content/MapConfig.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";

function getDistanceFromCenter(q, r) {
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

function createTerrainForCell(q, r, distance) {
  if (distance <= MAP_CONFIG.coreRingRadius) {
    return "reserve";
  }
  if (q <= -3 && r >= -1 && r <= 3) {
    return "forest";
  }
  if (q <= -4 && r >= -2 && r <= 2) {
    return "mountain";
  }
  if (q >= 1 && r >= 1 && r <= 3) {
    return "dunes";
  }
  if (q >= 2 && r >= 0 && r <= 2) {
    return "river";
  }
  if (q >= 3 && r >= 2) {
    return "sea";
  }
  if (q >= 3 && r <= -1) {
    return "frontier";
  }
  if (q >= 2 && r >= 4) {
    return "scar";
  }
  return "neutral";
}

export function getCellKey(q, r) {
  return `${q},${r}`;
}

export function getNeighborCoords(q, r) {
  return [
    { q: q + 1, r },
    { q: q + 1, r: r - 1 },
    { q, r: r - 1 },
    { q: q - 1, r },
    { q: q - 1, r: r + 1 },
    { q, r: r + 1 }
  ];
}

export function createMapCells(radius = MAP_CONFIG.radius) {
  const cells = [];
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r += 1) {
      const distance = getDistanceFromCenter(q, r);
      cells.push({
        key: getCellKey(q, r),
        q,
        r,
        distance,
        isReserved: distance <= MAP_CONFIG.coreRingRadius,
        terrain: createTerrainForCell(q, r, distance)
      });
    }
  }
  return cells;
}

export function getMapCells(state) {
  return state.map.cells;
}

export function findMapCell(state, q, r) {
  return state.map.cells.find((cell) => cell.q === q && cell.r === r) ?? null;
}

export function getBuildingAtCell(state, q, r) {
  return (
    state.buildings.find(
      (building) => building.mapPosition && building.mapPosition.q === q && building.mapPosition.r === r
    ) ?? null
  );
}

export function canPlaceBuildingAt(state, buildingId, q, r) {
  const cell = findMapCell(state, q, r);
  if (!cell) {
    return { ok: false, reason: "That hex is outside the playable map." };
  }
  if (cell.isReserved) {
    return { ok: false, reason: "That hex belongs to the forge core." };
  }

  const occupant = getBuildingAtCell(state, q, r);
  if (occupant && occupant.id !== buildingId) {
    return { ok: false, reason: `${occupant.displayName} already occupies that hex.` };
  }

  return { ok: true, cell };
}

export function setBuildingPlacement(state, buildingId, q, r, source = "Player") {
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return { ok: false, reason: "Building not found." };
  }

  const validation = canPlaceBuildingAt(state, buildingId, q, r);
  if (!validation.ok) {
    return validation;
  }

  const previousPosition = building.mapPosition
    ? `${building.mapPosition.q},${building.mapPosition.r}`
    : "unplaced";
  building.mapPosition = { q, r };

  addHistoryEntry(state, {
    category: "Placement",
    title: `${building.displayName} positioned`,
    details: `${source} placed ${building.displayName} at hex ${q}, ${r} from ${previousPosition}.`
  });

  return { ok: true, building, cell: validation.cell };
}

export function clearBuildingPlacement(state, buildingId, source = "Player") {
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return { ok: false, reason: "Building not found." };
  }
  if (!building.mapPosition) {
    return { ok: false, reason: "That building is already unplaced." };
  }

  const previousPosition = `${building.mapPosition.q},${building.mapPosition.r}`;
  building.mapPosition = null;

  addHistoryEntry(state, {
    category: "Placement",
    title: `${building.displayName} removed from map`,
    details: `${source} cleared ${building.displayName} from hex ${previousPosition}.`
  });

  return { ok: true, building };
}

export function forceSetBuildingPlacement(state, buildingId, q, r, source = "Admin") {
  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return { ok: false, reason: "Building not found." };
  }

  const cell = findMapCell(state, q, r);
  if (!cell) {
    return { ok: false, reason: "That hex is outside the playable map." };
  }

  const displacedBuilding = getBuildingAtCell(state, q, r);
  if (displacedBuilding && displacedBuilding.id !== buildingId) {
    displacedBuilding.mapPosition = null;
  }

  const previousPosition = building.mapPosition
    ? `${building.mapPosition.q},${building.mapPosition.r}`
    : "unplaced";

  building.mapPosition = { q, r };

  addHistoryEntry(state, {
    category: "Placement",
    title: `${building.displayName} force-positioned`,
    details: `${source} force-placed ${building.displayName} at hex ${q}, ${r} from ${previousPosition}.`
  });

  return { ok: true, building, cell, displacedBuilding };
}
