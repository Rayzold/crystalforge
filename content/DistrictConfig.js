export const DISTRICT_LEVEL_THRESHOLDS = [3, 6, 10, 15];

export const BASE_DISTRICT_CONFIG = {
  "Agricultural District": {
    name: "Agricultural District",
    color: "#8bc34a",
    description: "Feeds the city with organized harvest and grazing networks.",
    bonusText: "+10% food production per level",
    bonuses: { foodProductionPercent: 10, prosperityFlat: 2 }
  },
  "Trade District": {
    name: "Trade District",
    color: "#f1c453",
    description: "Concentrated commerce, ledgers, and mercantile routes.",
    bonusText: "+10% gold generation per level",
    bonuses: { goldProductionPercent: 10, prestigeFlat: 2 }
  },
  "Residential District": {
    name: "Residential District",
    color: "#8dc5ff",
    description: "Stable homes and daily life that support civic endurance.",
    bonusText: "+6 population support and +4 morale per level",
    bonuses: { populationSupportFlat: 6, moraleFlat: 4, prosperityFlat: 2 }
  },
  "Military District": {
    name: "Military District",
    color: "#ef6b5f",
    description: "Training, fortifications, and disciplined readiness.",
    bonusText: "+20% defense and +10% security per level",
    bonuses: { defensePercent: 20, securityPercent: 10 }
  },
  "Industrial District": {
    name: "Industrial District",
    color: "#bd9854",
    description: "Workshops and extraction sites that harden the city.",
    bonusText: "+15% materials generation per level",
    bonuses: { materialsProductionPercent: 15, valueFlat: 4 }
  },
  "Arcane District": {
    name: "Arcane District",
    color: "#9f65ff",
    description: "Mana channels and experimental spellwork.",
    bonusText: "+20% mana generation per level",
    bonuses: { manaProductionPercent: 20, prestigeFlat: 3 }
  },
  "Religious District": {
    name: "Religious District",
    color: "#d7f0b0",
    description: "Shrines and sacred grounds stabilizing spirit and ritual.",
    bonusText: "+5 morale and +5 prosperity per level",
    bonuses: { moraleFlat: 5, prosperityFlat: 5 }
  },
  "Harbor District": {
    name: "Harbor District",
    color: "#3ca7c7",
    description: "Sea and sky logistics improve exchange and movement.",
    bonusText: "+6% gold and +10% materials per level",
    bonuses: { goldProductionPercent: 6, materialsProductionPercent: 10, securityFlat: 2 }
  },
  "Cultural District": {
    name: "Cultural District",
    color: "#ff8b64",
    description: "Learning, celebration, and memory that elevate identity.",
    bonusText: "+6 prestige and +4 morale per level",
    bonuses: { prestigeFlat: 6, moraleFlat: 4 }
  },
  "Frontier District": {
    name: "Frontier District",
    color: "#d3d04b",
    description: "Edges of the city where opportunity and danger meet.",
    bonusText: "+8 defense and improved unusual events per level",
    bonuses: { defenseFlat: 8, securityFlat: 4, eventLuckFlat: 2 }
  }
};
