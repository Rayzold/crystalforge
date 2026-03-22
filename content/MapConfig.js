export const MAP_CONFIG = {
  radius: 7,
  cityRadius: 6,
  fortificationRingRadius: 7,
  hexSize: 26,
  coreRingRadius: 1,
  blockedTerrainColor: "#151515",
  selectableTerrainColor: "#f7eb98",
  reservedTerrainColor: "#0b0d12",
  occupiedOutlineColor: "#ecf4ff"
};

export const MAP_ADJACENCY_CONFIG = {
  sameDistrictPercentPerNeighbor: 0.06,
  relatedTagPercentPerNeighbor: 0.05,
  maxNeighborBonusPercent: 0.24,
  terrainAffinities: {
    agriculture: { forest: 0.1, neutral: 0.03, river: 0.05 },
    trade: { river: 0.1, sea: 0.08, neutral: 0.04 },
    housing: { neutral: 0.05, forest: 0.03 },
    military: { frontier: 0.12, mountain: 0.08, bastion: 0.14 },
    industry: { mountain: 0.12, scar: 0.08, river: 0.04 },
    arcane: { scar: 0.12, frontier: 0.08, sea: 0.05 },
    religious: { forest: 0.08, scar: 0.04, neutral: 0.03 },
    harbor: { sea: 0.14, river: 0.1 },
    culture: { neutral: 0.05, river: 0.04 },
    frontier: { frontier: 0.14, scar: 0.08, mountain: 0.05 },
    civic: { neutral: 0.04, river: 0.03 },
    security: { frontier: 0.08, mountain: 0.05, bastion: 0.1 }
  }
};

export const MAP_TERRAIN_THEMES = {
  neutral: { fill: "#f7eb98", stroke: "#2d2d2d" },
  forest: { fill: "#98c549", stroke: "#416226" },
  mountain: { fill: "#9a8620", stroke: "#4f4510" },
  river: { fill: "#8cb8e9", stroke: "#3f658e" },
  dunes: { fill: "#fff18b", stroke: "#8a7c32" },
  sea: { fill: "#003e58", stroke: "#0b2333" },
  frontier: { fill: "#a19b5a", stroke: "#5f5a2d" },
  scar: { fill: "#ff774b", stroke: "#7a301e" },
  bastion: { fill: "#78849f", stroke: "#334057" },
  reserve: { fill: "#0b0d12", stroke: "#2b2f3c" }
};
