export const TOWN_FOCUS_INTERVAL_DAYS = 14;

export const TOWN_FOCUS_DEFINITIONS = {
  "food-production": {
    id: "food-production",
    name: "Food Production",
    badgeLabel: "Harvest Mandate",
    badgeShort: "Harvest",
    mayorLine: "We should focus on producing food.",
    summary: "Fields, ovens, and storehouses take priority over all softer ambitions.",
    resourceDaily: { food: 8, gold: -2 },
    statFlat: { morale: 2 }
  },
  "defense-readiness": {
    id: "defense-readiness",
    name: "Defense Readiness",
    badgeLabel: "Bulwark Protocol",
    badgeShort: "Bulwark",
    mayorLine: "We should strengthen our defences.",
    summary: "Drills intensify, walls are checked, and every watch fire burns brighter.",
    resourceDaily: { materials: -2, gold: -3 },
    statFlat: { defense: 14, security: 10 }
  },
  "crystal-expedition": {
    id: "crystal-expedition",
    name: "Crystal Expedition",
    badgeLabel: "Expedition Charter",
    badgeShort: "Expedition",
    mayorLine: "We should send people to find more crystals.",
    summary: "Surveyors, scavengers, and hopeful fools comb the outskirts for shards and veins.",
    resourceDaily: { gold: -4, mana: -2 },
    shardDaily: { Common: 3, Uncommon: 1 },
    statFlat: { prestige: 2 }
  },
  "trade-drive": {
    id: "trade-drive",
    name: "Trade Drive",
    badgeLabel: "Mercantile Push",
    badgeShort: "Trade",
    mayorLine: "We should push commerce before the season turns against us.",
    summary: "Roads, stalls, and caravans take precedence as the council chases wealth.",
    resourceDaily: { gold: 6, food: -1 },
    statFlat: { prosperity: 4, prestige: 2 }
  },
  "civic-restoration": {
    id: "civic-restoration",
    name: "Civic Restoration",
    badgeLabel: "Lantern Accord",
    badgeShort: "Restoration",
    mayorLine: "We should steady the people before the city frays.",
    summary: "Festive squares, public order, and daily comforts take precedence over raw expansion.",
    resourceDaily: { gold: -3, food: -2 },
    statFlat: { morale: 10, health: 4, prosperity: 3 }
  }
};
