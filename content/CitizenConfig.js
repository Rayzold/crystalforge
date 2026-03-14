export const CITIZEN_CLASSES = [
  "Peasants",
  "Workers",
  "Merchants",
  "Scholars",
  "Clergy",
  "Soldiers",
  "Nobles",
  "Mages"
];

export const CITIZEN_DEFINITIONS = {
  Peasants: {
    production: { food: 0.55 },
    consumption: { food: 0.22, gold: 0.02 },
    stats: { morale: 0.02, health: 0.02 },
    flavor: "Field labor and basic support."
  },
  Workers: {
    production: { materials: 0.48 },
    consumption: { food: 0.24, gold: 0.05 },
    stats: { value: 0.06, prosperity: 0.02 },
    flavor: "Craft, extraction, and heavy labor."
  },
  Merchants: {
    production: { gold: 0.6 },
    consumption: { food: 0.18, gold: 0.04 },
    stats: { prestige: 0.03, prosperity: 0.05 },
    flavor: "Trade routes and market activity."
  },
  Scholars: {
    production: { prosperity: 0.16 },
    consumption: { food: 0.16, gold: 0.12, mana: 0.04 },
    stats: { health: 0.02, prestige: 0.05, prosperity: 0.08 },
    flavor: "Knowledge and research."
  },
  Clergy: {
    production: { prosperity: 0.12 },
    consumption: { food: 0.15, gold: 0.08 },
    stats: { morale: 0.12, security: 0.02 },
    flavor: "Ritual, solace, and order."
  },
  Soldiers: {
    production: {},
    consumption: { food: 0.3, gold: 0.18, materials: 0.04 },
    stats: { defense: 0.16, security: 0.12, morale: 0.02 },
    flavor: "Defense and patrol."
  },
  Nobles: {
    production: { gold: 0.18, prosperity: 0.1 },
    consumption: { food: 0.22, gold: 0.25, mana: 0.04 },
    stats: { prestige: 0.18, prosperity: 0.12, morale: 0.03 },
    flavor: "Patronage and status."
  },
  Mages: {
    production: { mana: 0.62 },
    consumption: { food: 0.12, gold: 0.18, mana: 0.08 },
    stats: { prestige: 0.15, defense: 0.05, prosperity: 0.08 },
    flavor: "Arcane labor and spellcraft."
  }
};

export const CITIZEN_PROMOTION_PATHS = [
  {
    from: "Peasants",
    to: "Workers",
    requirements: {
      buildingsAny: ["Blacksmith Forge", "Lumber Yard", "Mine", "Quarry", "Mill", "Carpenter Workshop"],
      prosperityAtLeast: 18
    }
  },
  {
    from: "Workers",
    to: "Merchants",
    requirements: {
      buildingsAny: ["Market Square", "Trade Post", "Merchant Guild", "Bank", "Trade Exchange"],
      districtLevel: { district: "Trade District", level: 1 },
      prosperityAtLeast: 35
    }
  },
  {
    from: "Merchants",
    to: "Nobles",
    requirements: {
      buildingsAny: ["Town Hall", "Castle", "Housing: Noble Estate", "Foreign Affairs Ministry"],
      prosperityAtLeast: 90
    }
  },
  {
    from: "Workers",
    to: "Scholars",
    requirements: {
      buildingsAny: ["Library", "School", "University", "School of Driftum"],
      prosperityAtLeast: 28
    }
  },
  {
    from: "Scholars",
    to: "Mages",
    requirements: {
      buildingsAny: ["Arcana Tower", "Chronomancy Lab", "Alchemist Lab", "Oracle Chamber"],
      districtLevel: { district: "Arcane District", level: 1 },
      prosperityAtLeast: 65,
      resourceAtLeast: { mana: 20 }
    }
  },
  {
    from: "Workers",
    to: "Soldiers",
    requirements: {
      buildingsAny: ["Barracks", "Guard Tower", "Military Academy", "Town Guard Post"],
      districtLevel: { district: "Military District", level: 1 },
      prosperityAtLeast: 20
    }
  }
];
