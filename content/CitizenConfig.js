export const CITIZEN_CLASSES = [
  "Children",
  "Elderly",
  "Farmers",
  "Hunters",
  "Miners",
  "Laborers",
  "Craftsmen",
  "Merchants",
  "Scavengers",
  "Guards",
  "Soldiers",
  "Administrators",
  "Scholars",
  "Clergy",
  "Healers",
  "Entertainers",
  "Nobles",
  "Mages",
  "Heroes"
];

export const CITIZEN_DEFINITIONS = {
  Children: {
    production: {},
    consumption: { food: 0.14 },
    stats: { morale: 0.01 },
    flavor: "Young dependents who shape the future burden and hope of the Drift."
  },
  Elderly: {
    production: {},
    consumption: { food: 0.16, gold: 0.02 },
    stats: { morale: 0.02, health: 0.01 },
    flavor: "Memory-keepers, retirees, and elders whose presence steadies the social fabric."
  },
  Farmers: {
    production: { food: 0.72 },
    consumption: { food: 0.2, gold: 0.02 },
    stats: { health: 0.02 },
    flavor: "Field hands, growers, and granary tenders who keep the city fed."
  },
  Hunters: {
    production: { food: 0.42, materials: 0.06 },
    consumption: { food: 0.18, gold: 0.03 },
    stats: { security: 0.02 },
    flavor: "Trackers and foragers who bring in meat, hides, and frontier awareness."
  },
  Miners: {
    production: { materials: 0.62, gold: 0.08 },
    consumption: { food: 0.24, gold: 0.04 },
    stats: { value: 0.04 },
    flavor: "Extraction crews pulling stone, ore, and crystal-bearing seams from the earth."
  },
  Laborers: {
    production: { materials: 0.34 },
    consumption: { food: 0.22, gold: 0.03 },
    stats: { prosperity: 0.01 },
    flavor: "General workers handling hauling, repairs, and all-purpose civic effort."
  },
  Craftsmen: {
    production: { materials: 0.28, gold: 0.18 },
    consumption: { food: 0.22, gold: 0.04 },
    stats: { value: 0.08, prosperity: 0.02 },
    flavor: "Smiths, masons, tailors, and artisans who turn raw output into useful goods."
  },
  Merchants: {
    production: { gold: 0.44, prosperity: 0.08 },
    consumption: { food: 0.18, gold: 0.04 },
    stats: { prosperity: 0.12, prestige: 0.03 },
    flavor: "Market brokers and caravan dealers who turn movement into wealth and prosperity."
  },
  Scavengers: {
    production: { materials: 0.18, gold: 0.06 },
    consumption: { food: 0.16, gold: 0.02 },
    stats: { security: 0.01 },
    flavor: "Salvagers and reclaimers who recover value from ruins, scrap, and battlefield remains."
  },
  Guards: {
    production: {},
    consumption: { food: 0.24, gold: 0.08 },
    stats: { security: 0.14, defense: 0.06 },
    flavor: "Gatekeepers and watch patrols who keep order within the settlement."
  },
  Soldiers: {
    production: {},
    consumption: { food: 0.3, gold: 0.16, materials: 0.03 },
    stats: { defense: 0.18, security: 0.08, morale: 0.01 },
    flavor: "Trained military forces who hold lines, walls, and organized defense."
  },
  Administrators: {
    production: { prosperity: 0.05 },
    consumption: { food: 0.18, gold: 0.08 },
    stats: { security: 0.04, prosperity: 0.08 },
    flavor: "Clerks, officials, and planners who convert chaos into civic stability."
  },
  Scholars: {
    production: { prosperity: 0.08 },
    consumption: { food: 0.16, gold: 0.12, mana: 0.03 },
    stats: { prestige: 0.06, prosperity: 0.08 },
    flavor: "Researchers and teachers expanding what the city can understand and organize."
  },
  Clergy: {
    production: {},
    consumption: { food: 0.16, gold: 0.06 },
    stats: { morale: 0.14, security: 0.02 },
    flavor: "Priests and ritual keepers who calm fear and maintain spiritual order."
  },
  Healers: {
    production: {},
    consumption: { food: 0.18, gold: 0.08, materials: 0.01 },
    stats: { health: 0.18, morale: 0.03 },
    flavor: "Physicians, herbalists, and caretakers who keep bodies and minds functioning."
  },
  Entertainers: {
    production: { gold: 0.08 },
    consumption: { food: 0.16, gold: 0.06 },
    stats: { morale: 0.16, prestige: 0.04, prosperity: 0.03 },
    flavor: "Performers and hosts who turn prosperity into joy, ritual, and civic pride."
  },
  Nobles: {
    production: { gold: 0.1, prosperity: 0.06 },
    consumption: { food: 0.22, gold: 0.24, mana: 0.03 },
    stats: { prestige: 0.2, prosperity: 0.08 },
    flavor: "Patrons and high houses whose influence shapes status, favor, and state direction."
  },
  Mages: {
    production: { mana: 0.58 },
    consumption: { food: 0.14, gold: 0.14, mana: 0.08 },
    stats: { prestige: 0.14, defense: 0.04, prosperity: 0.05 },
    flavor: "Arcane specialists channeling magical output into the Drift's working systems."
  },
  Heroes: {
    production: {},
    consumption: { food: 0.28, gold: 0.24, mana: 0.06 },
    stats: { defense: 0.16, security: 0.08, prestige: 0.2, morale: 0.1 },
    flavor: "Exceptional figures whose presence inspires the city and hardens it against danger."
  }
};

export const CITIZEN_PROMOTION_PATHS = [
  {
    from: "Laborers",
    to: "Farmers",
    requirements: {
      buildingsAny: ["Farmlands", "Barn", "Mill", "Grain Silo"],
      prosperityAtLeast: 12
    }
  },
  {
    from: "Laborers",
    to: "Miners",
    requirements: {
      buildingsAny: ["Mine", "Quarry"],
      prosperityAtLeast: 14
    }
  },
  {
    from: "Laborers",
    to: "Craftsmen",
    requirements: {
      buildingsAny: ["Blacksmith", "Tailor", "Carpenter Shop", "Mason's Workshop"],
      prosperityAtLeast: 16
    }
  },
  {
    from: "Craftsmen",
    to: "Merchants",
    requirements: {
      buildingsAny: ["Market Square", "Trade Post", "Bank", "Guildhall"],
      districtLevel: { district: "Trade District", level: 1 },
      prosperityAtLeast: 30
    }
  },
  {
    from: "Laborers",
    to: "Guards",
    requirements: {
      buildingsAny: ["Town Guard Post", "Guard Tower", "Barracks"],
      districtLevel: { district: "Military District", level: 1 },
      prosperityAtLeast: 18
    }
  },
  {
    from: "Guards",
    to: "Soldiers",
    requirements: {
      buildingsAny: ["Barracks", "Training Grounds", "War Academy Supreme"],
      districtLevel: { district: "Military District", level: 2 },
      prosperityAtLeast: 32
    }
  },
  {
    from: "Laborers",
    to: "Administrators",
    requirements: {
      buildingsAny: ["Town Hall", "Post Office", "Courthouse"],
      prosperityAtLeast: 24
    }
  },
  {
    from: "Administrators",
    to: "Scholars",
    requirements: {
      buildingsAny: ["Library", "School", "University"],
      prosperityAtLeast: 34
    }
  },
  {
    from: "Scholars",
    to: "Mages",
    requirements: {
      buildingsAny: ["Arcana Tower", "Oracle", "Observatory"],
      districtLevel: { district: "Arcane District", level: 1 },
      prosperityAtLeast: 60,
      resourceAtLeast: { mana: 20 }
    }
  },
  {
    from: "Clergy",
    to: "Healers",
    requirements: {
      buildingsAny: ["Hospital", "Apothecary", "Bathhouse"],
      prosperityAtLeast: 28
    }
  },
  {
    from: "Merchants",
    to: "Nobles",
    requirements: {
      buildingsAny: ["Town Hall", "Castle", "Housing: Noble", "Housing: Royal"],
      prosperityAtLeast: 90
    }
  },
  {
    from: "Soldiers",
    to: "Heroes",
    requirements: {
      buildingsAny: ["Adventurers' Guildhall", "Castle", "Dragonforge"],
      prosperityAtLeast: 110
    }
  }
];
