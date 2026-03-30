import { UNIQUE_CITIZEN_FULL_NAMES } from "./UniqueCitizenNamePools.js";

export const UNIQUE_CITIZEN_ARCHETYPES = [
  {
    id: "wallMarshal",
    className: "Defenders",
    title: "Bastion Marshal",
    effectText: "Defenders and Soldiers reinforce the Drift with greater discipline.",
    bonuses: { stats: { defense: 14, security: 10 }, expeditionPowerPercent: 6 },
    expeditionTags: ["rescue", "recruit", "monsterHunt"]
  },
  {
    id: "horizonSeer",
    className: "Scouts",
    title: "Horizon Seer",
    effectText: "Scouting parties read the land faster and return with clearer signals.",
    bonuses: { resources: { prosperity: 1.5 }, expeditionPowerPercent: 10 },
    expeditionTags: ["resourceRun", "relicRecovery", "crystalHunt"]
  },
  {
    id: "rootkeeper",
    className: "Druids",
    title: "Keeper of Rootglass",
    effectText: "Living systems steady the Drift, enriching food, morale, and health.",
    bonuses: { resources: { food: 4 }, stats: { morale: 6, health: 10 } },
    expeditionTags: ["pilgrimage", "rescue"]
  },
  {
    id: "quartermaster",
    className: "Laborers",
    title: "Quartermaster Prime",
    effectText: "Stock, logistics, and salvage recovery become markedly more efficient.",
    bonuses: { resources: { materials: 5, salvage: 3 }, stats: { prosperity: 6 } },
    expeditionTags: ["resourceRun", "recruit"]
  },
  {
    id: "manasavant",
    className: "Arcanists",
    title: "Mana Savant",
    effectText: "Arcane systems pulse more cleanly, and crystal expeditions gain confidence.",
    bonuses: { resources: { mana: 4 }, stats: { prestige: 8 }, expeditionPowerPercent: 8 },
    expeditionTags: ["crystalHunt", "pilgrimage", "relicRecovery"]
  },
  {
    id: "skybroker",
    className: "Merchants",
    title: "Sky Broker",
    effectText: "Trade routes sharpen and diplomatic missions return heavier with gold.",
    bonuses: { resources: { gold: 8 }, stats: { prosperity: 10 } },
    expeditionTags: ["diplomatic", "resourceRun"]
  },
  {
    id: "mercysaint",
    className: "Medics",
    title: "Mercy Saint",
    effectText: "Care and recovery deepen, helping the city endure long campaigns.",
    bonuses: { stats: { health: 18, morale: 8 } },
    expeditionTags: ["rescue", "pilgrimage"]
  },
  {
    id: "archivistRegent",
    className: "Scholars",
    title: "Archivist Regent",
    effectText: "Records, learning, and prestige all sharpen around this singular mind.",
    bonuses: { stats: { prestige: 14, prosperity: 5 }, resources: { mana: 2 } },
    expeditionTags: ["relicRecovery", "crystalHunt", "diplomatic"]
  }
];

export function drawUniqueCitizenFullName(seed = Math.random()) {
  const index = Math.floor(Math.abs(seed * 9973)) % UNIQUE_CITIZEN_FULL_NAMES.length;
  return UNIQUE_CITIZEN_FULL_NAMES[index];
}
