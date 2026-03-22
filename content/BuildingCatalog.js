import { BUILDING_POOLS } from "./BuildingPools.js";
import { RARITY_ORDER } from "./Rarities.js";

const KEYWORD_CLASSIFIERS = [
  { match: ["farm", "apiary", "pond", "garden", "grove", "fish", "mill", "grain", "barn", "butcher", "smokehouse", "herbal", "beast", "cider", "water trough"], district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf" },
  { match: ["vendor", "tailor", "market", "trade", "bank", "merchant", "post", "jewelry", "general store", "mint", "brewery", "distillery", "red light"], district: "Trade District", tags: ["trade"], iconKey: "coins" },
  { match: ["housing", "inn", "tavern", "well", "bathhouse", "hospital", "immigration", "community", "commoner", "comfortable", "wealthy", "royal"], district: "Residential District", tags: ["housing"], iconKey: "home" },
  { match: ["guard", "barracks", "armory", "training", "wall", "fortification", "ballista", "trebuchet", "cannon", "prison", "torture", "war academy", "planar escape"], district: "Military District", tags: ["military"], iconKey: "shield" },
  { match: ["blacksmith", "forge", "lumber", "mine", "quarry", "bakery", "tool", "stone", "carpenter", "warehouse", "factory", "engineer", "mason", "ropeworks", "weaver", "tannery", "woodcutter", "steam", "techcrafter"], district: "Industrial District", tags: ["industry"], iconKey: "hammer" },
  { match: ["alchemist", "oracle", "observatory", "illusion", "planar", "fey", "artifact", "arcana", "arcane", "relic", "chronomancy", "reality", "universal portal", "heart of kosmos", "maker", "shield generator", "communications core"], district: "Arcane District", tags: ["arcane"], iconKey: "star" },
  { match: ["shrine", "temple", "graveyard", "deathless", "dreamweaver", "sanctum", "oracle"], district: "Religious District", tags: ["religious"], iconKey: "spire" },
  { match: ["dock", "lighthouse", "harbor", "airship", "skyharbor", "captain", "shipmaker"], district: "Harbor District", tags: ["harbor"], iconKey: "anchor" },
  { match: ["library", "school", "university", "amphitheater", "printing", "clocktower", "raestorum"], district: "Cultural District", tags: ["culture"], iconKey: "scroll" },
  { match: ["caravan", "adventurers", "monster", "dungeon", "ark", "new drift", "dragonforge", "seeker", "enchanted forest"], district: "Frontier District", tags: ["frontier"], iconKey: "gate" }
];

const ZERO_STATS = { goods: 0, income: 0, upkeep: 0, prosperity: 0, defense: 0, security: 0, prestige: 0, morale: 0, health: 0 };
const ZERO_RESOURCES = { gold: 0, food: 0, materials: 0, salvage: 0, mana: 0 };
const ZERO_CITIZENS = { populationSupport: 0, prosperityAffinity: 0, moraleAffinity: 0 };

function gameplay({ goods = 0, income = 0, upkeep = 0, prosperity = 0, defense = 0, security = 0, prestige = 0, morale = 0, health = 0, gold = 0, food = 0, materials = 0, salvage = 0, mana = 0, populationSupport = 0, prosperityAffinity = 0, moraleAffinity = 0 } = {}) {
  return {
    statOverrides: { ...ZERO_STATS, goods, income, upkeep, prosperity, defense, security, prestige, morale, health },
    resourceOverrides: { ...ZERO_RESOURCES, gold, food, materials, salvage, mana },
    citizenOverrides: { ...ZERO_CITIZENS, populationSupport, prosperityAffinity, moraleAffinity }
  };
}

function defineBuilding({ district, tags, iconKey, imagePath = null, flavorText = null, specialEffect = null, profile = null }) {
  return { district, tags, iconKey, imagePath, flavorText, specialEffect, ...(profile ?? {}) };
}

const BUILDING_DEFINITIONS = {
  "Apiary": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", profile: gameplay({ gold: 4, upkeep: 1, food: 5, morale: 2 }) }),
  "Bakery": defineBuilding({ district: "Industrial District", tags: ["industry", "agriculture"], iconKey: "hammer", profile: gameplay({ gold: 3, upkeep: 2, food: 8, morale: 2 }) }),
  "Ballistas": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 4, defense: 6, security: 3 }) }),
  "Barn": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", profile: gameplay({ upkeep: 1, food: 12 }) }),
  "Basic Shrine": defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", profile: gameplay({ upkeep: 1, morale: 4, health: 2 }) }),
  "Beast Pens": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "military"], iconKey: "leaf", profile: gameplay({ upkeep: 3, food: 6, security: 3 }) }),
  "Blacksmith": defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", profile: gameplay({ gold: 8, upkeep: 3, prosperity: 3 }) }),
  "Butcher": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "trade"], iconKey: "leaf", profile: gameplay({ gold: 5, upkeep: 2, food: 10 }) }),
  "Cider Press": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "trade"], iconKey: "leaf", profile: gameplay({ gold: 4, upkeep: 1, food: 6, morale: 2 }) }),
  "Crystal Upgrade": defineBuilding({ district: "Arcane District", tags: ["arcane", "civic"], iconKey: "crystal" }),
  "Farmlands": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", profile: gameplay({ upkeep: 2, food: 20 }) }),
  "Fishery": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "harbor"], iconKey: "anchor", profile: gameplay({ gold: 4, upkeep: 2, food: 12 }) }),
  "Gardens": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "culture"], iconKey: "leaf", profile: gameplay({ upkeep: 1, morale: 4, health: 2, prestige: 1 }) }),
  "General Store": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 8, upkeep: 2, prosperity: 2 }) }),
  "Grain Silo": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", profile: gameplay({ upkeep: 1, food: 22 }) }),
  "Graveyard": defineBuilding({ district: "Religious District", tags: ["religious", "security"], iconKey: "spire", profile: gameplay({ upkeep: 1, health: 2, security: 2 }) }),
  "Housing: Commoner": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 3, populationSupport: 500 }) }),
  "Inn": defineBuilding({ district: "Residential District", tags: ["housing", "trade"], iconKey: "home", profile: gameplay({ gold: 10, upkeep: 4, morale: 3, populationSupport: 50 }) }),
  "Lumber Mill": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 6, upkeep: 3, prosperity: 2, materials: 6 }) }),
  Mill: defineBuilding({ district: "Agricultural District", tags: ["agriculture", "industry"], iconKey: "hammer", profile: gameplay({ gold: 6, upkeep: 2, food: 15 }) }),
  Mine: defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 14, upkeep: 5, prosperity: 3, materials: 10 }) }),
  Quarry: defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 12, upkeep: 4, prosperity: 3, materials: 8 }) }),
  "Smokehouse": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "industry"], iconKey: "hammer", profile: gameplay({ gold: 5, upkeep: 2, food: 8 }) }),
  Stables: defineBuilding({ district: "Military District", tags: ["military", "housing"], iconKey: "shield", profile: gameplay({ gold: 5, upkeep: 4, security: 4, populationSupport: 20 }) }),
  Tailor: defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 5, upkeep: 2, morale: 2 }) }),
  Tavern: defineBuilding({ district: "Residential District", tags: ["housing", "trade"], iconKey: "home", profile: gameplay({ gold: 12, upkeep: 4, morale: 5, populationSupport: 30 }) }),
  "Tool Shed": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ upkeep: 1, prosperity: 3, materials: 3 }) }),
  "Town Guard Post": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", profile: gameplay({ upkeep: 4, defense: 3, security: 5 }) }),
  Vendor: defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 8, upkeep: 2, prosperity: 2 }) }),
  "Water Trough": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "housing"], iconKey: "leaf", profile: gameplay({ upkeep: 1, health: 2, food: 3 }) }),
  Well: defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 1, health: 4, food: 2 }) }),
  "Wooden Wall": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 2, defense: 8 }) }),
  "Woodcutter's Hut": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 4, upkeep: 1, prosperity: 2, materials: 4 }) }),

  Alchemist: defineBuilding({ district: "Arcane District", tags: ["arcane", "industry"], iconKey: "star", profile: gameplay({ gold: 15, upkeep: 6, health: 5, prosperity: 3, mana: 8 }) }),
  Barracks: defineBuilding({ district: "Military District", tags: ["military", "housing"], iconKey: "shield", profile: gameplay({ upkeep: 10, defense: 8, security: 15, populationSupport: 100 }) }),
  Brewery: defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 14, upkeep: 5, morale: 6 }) }),
  "Carpenter Shop": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 10, upkeep: 4, prosperity: 5, materials: 8 }) }),
  Clocktower: defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "clock", profile: gameplay({ upkeep: 2, prosperity: 5, morale: 4 }) }),
  "Community Oven": defineBuilding({ district: "Residential District", tags: ["housing", "agriculture"], iconKey: "home", profile: gameplay({ upkeep: 2, food: 15, morale: 4 }) }),
  Distillery: defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 18, upkeep: 5, morale: 5 }) }),
  Dock: defineBuilding({ district: "Harbor District", tags: ["harbor", "trade"], iconKey: "anchor", profile: gameplay({ gold: 20, upkeep: 6, food: 8, populationSupport: 100, materials: 6 }) }),
  Grove: defineBuilding({ district: "Agricultural District", tags: ["agriculture", "religious"], iconKey: "leaf", profile: gameplay({ food: 8, health: 4, morale: 2 }) }),
  "Guard Tower": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", profile: gameplay({ upkeep: 8, defense: 12, security: 8 }) }),
  "Hardwood Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 4, defense: 18 }) }),
  "Housing: Comfortable": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 6, populationSupport: 1000 }) }),
  "Immigration Center": defineBuilding({ district: "Residential District", tags: ["housing", "civic"], iconKey: "home", profile: gameplay({ upkeep: 5, populationSupport: 600, prosperity: 4 }) }),
  "Jewelry Shop": defineBuilding({ district: "Trade District", tags: ["trade", "culture"], iconKey: "coins", profile: gameplay({ gold: 20, upkeep: 5, prestige: 6 }) }),
  Library: defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", profile: gameplay({ upkeep: 3, morale: 5, prosperity: 6, populationSupport: 50 }) }),
  "Market Square": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "coins", profile: gameplay({ gold: 25, upkeep: 5, prosperity: 6, populationSupport: 100 }) }),
  "Mason's Workshop": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 8, upkeep: 3, prosperity: 5, materials: 10 }) }),
  Pond: defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", profile: gameplay({ food: 6, health: 4 }) }),
  "Post Office": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", profile: gameplay({ gold: 8, upkeep: 3, prosperity: 5, security: 3 }) }),
  Ropeworks: defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 6, upkeep: 2, prosperity: 4, materials: 6 }) }),
  School: defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", profile: gameplay({ upkeep: 4, morale: 5, prosperity: 7, populationSupport: 100 }) }),
  Tannery: defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", profile: gameplay({ gold: 10, upkeep: 3, prosperity: 4, materials: 6 }) }),
  "Town Hall": defineBuilding({ district: "Residential District", tags: ["civic", "housing"], iconKey: "crown", profile: gameplay({ upkeep: 5, security: 6, prosperity: 6, populationSupport: 200 }) }),
  "Trade Post": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "banner", profile: gameplay({ gold: 22, upkeep: 6, prosperity: 7 }) }),
  Trebuchets: defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 8, defense: 18, security: 10 }) }),
  Warehouse: defineBuilding({ district: "Industrial District", tags: ["industry", "security"], iconKey: "hammer", profile: gameplay({ gold: 10, upkeep: 3, security: 4, prosperity: 5, materials: 12 }) }),
  "Weaver's Hall": defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", profile: gameplay({ gold: 8, upkeep: 3, prosperity: 4, morale: 2, materials: 6 }) }),

  Amphitheater: defineBuilding({ district: "Cultural District", tags: ["culture"], iconKey: "scroll", profile: gameplay({ upkeep: 8, morale: 16, prestige: 12, populationSupport: 200 }) }),
  Apothecary: defineBuilding({ district: "Residential District", tags: ["housing", "arcane"], iconKey: "star", profile: gameplay({ gold: 10, upkeep: 6, health: 16, mana: 4 }) }),
  "Aqueduct System": defineBuilding({ district: "Residential District", tags: ["housing", "industry"], iconKey: "columns", profile: gameplay({ upkeep: 8, health: 20, food: 10, populationSupport: 300 }) }),
  Armory: defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 10, defense: 16, security: 12 }) }),
  Bank: defineBuilding({ district: "Trade District", tags: ["trade", "security"], iconKey: "coins", profile: gameplay({ gold: 30, upkeep: 10, prosperity: 15, security: 8 }) }),
  Bathhouse: defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 7, health: 20, morale: 12 }) }),
  Courthouse: defineBuilding({ district: "Residential District", tags: ["civic", "security"], iconKey: "columns", profile: gameplay({ upkeep: 8, security: 16, prosperity: 12 }) }),
  "Workshop Quarter": defineBuilding({ district: "Industrial District", tags: ["industry", "trade", "culture"], iconKey: "guild", profile: gameplay({ upkeep: 8, prosperity: 10, goods: 4, morale: 4 }) }),
  "Embassy Annex": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", profile: gameplay({ gold: 15, upkeep: 8, prestige: 16, prosperity: 6 }) }),
  "Engineers' Guild": defineBuilding({ district: "Industrial District", tags: ["industry", "military"], iconKey: "guild", profile: gameplay({ upkeep: 10, defense: 20, prosperity: 15, materials: 16 }) }),
  "Explosive Ballistas": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 12, defense: 22, security: 16 }) }),
  Guildhall: defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "guild", profile: gameplay({ gold: 20, upkeep: 8, prosperity: 18 }) }),
  "Herbal Greenhouse": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "arcane"], iconKey: "leaf", profile: gameplay({ upkeep: 5, health: 16, food: 12, mana: 4 }) }),
  Hospital: defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 10, health: 30, morale: 6, populationSupport: 100 }) }),
  "Housing: Wealthy": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 8, populationSupport: 2500 }) }),
  Lighthouse: defineBuilding({ district: "Harbor District", tags: ["harbor", "security"], iconKey: "anchor", profile: gameplay({ gold: 15, upkeep: 6, security: 10, prosperity: 10 }) }),
  Mint: defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", profile: gameplay({ gold: 40, upkeep: 12, prosperity: 10 }) }),
  Observatory: defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", profile: gameplay({ upkeep: 8, prestige: 20, prosperity: 12, mana: 10 }) }),
  Oracle: defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", profile: gameplay({ upkeep: 7, prestige: 16, morale: 12, mana: 8 }) }),
  "Printing Press": defineBuilding({ district: "Cultural District", tags: ["culture", "industry"], iconKey: "scroll", profile: gameplay({ upkeep: 7, prosperity: 20, morale: 10, populationSupport: 100 }) }),
  Prison: defineBuilding({ district: "Military District", tags: ["security"], iconKey: "shield", profile: gameplay({ upkeep: 8, security: 20, defense: 8 }) }),
  "Red Light District": defineBuilding({ district: "Trade District", tags: ["trade", "housing"], iconKey: "coins", profile: gameplay({ gold: 25, upkeep: 8, morale: 12, populationSupport: 200 }) }),
  "Stone Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 8, defense: 28 }) }),
  "Training Grounds": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 12, defense: 12, security: 25 }) }),
  University: defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", profile: gameplay({ upkeep: 12, prosperity: 25, morale: 12, populationSupport: 600 }) }),

  "Adventurers' Guildhall": defineBuilding({ district: "Frontier District", tags: ["frontier", "trade"], iconKey: "guild", profile: gameplay({ gold: 30, upkeep: 15, security: 30, prestige: 22 }) }),
  "Airship Dockyard": defineBuilding({ district: "Harbor District", tags: ["harbor", "military"], iconKey: "anchor", profile: gameplay({ gold: 40, upkeep: 18, security: 22, prestige: 18 }) }),
  "Artifact Vault": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", profile: gameplay({ gold: 20, upkeep: 15, prestige: 40, security: 22, mana: 20 }) }),
  Cannons: defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 16, defense: 40, security: 25 }) }),
  "Caravan Outpost": defineBuilding({ district: "Frontier District", tags: ["frontier", "trade"], iconKey: "gate", profile: gameplay({ gold: 35, upkeep: 12, food: 15, prosperity: 18 }) }),
  Castle: defineBuilding({ district: "Military District", tags: ["military", "housing", "civic"], iconKey: "castle", profile: gameplay({ upkeep: 25, defense: 50, security: 30, prestige: 30, populationSupport: 500 }) }),
  "Communications Core": defineBuilding({ district: "Arcane District", tags: ["arcane", "civic"], iconKey: "signal", profile: gameplay({ gold: 50, upkeep: 25, prosperity: 60, security: 30, mana: 18 }) }),
  "Fey Crossing": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", profile: gameplay({ upkeep: 12, morale: 30, prestige: 25, populationSupport: 200, mana: 16 }) }),
  "Foreign Affairs Ministry": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", profile: gameplay({ gold: 25, upkeep: 15, prestige: 35, prosperity: 22 }) }),
  "Grand Shrine": defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", profile: gameplay({ upkeep: 15, morale: 40, health: 22, prestige: 22, populationSupport: 300, mana: 12 }) }),
  "Housing: Noble": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", profile: gameplay({ upkeep: 10, populationSupport: 3500, prestige: 15 }) }),
  "Illusion Field Generator": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", profile: gameplay({ upkeep: 15, security: 30, defense: 22, morale: 16, mana: 18 }) }),
  "Mirage Citadel": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "castle", profile: gameplay({ upkeep: 20, defense: 40, prestige: 32, mana: 16 }) }),
  "Monster Arena": defineBuilding({ district: "Frontier District", tags: ["frontier", "culture"], iconKey: "gate", profile: gameplay({ gold: 45, upkeep: 18, security: 25, morale: 22 }) }),
  "Monster Capture Field": defineBuilding({ district: "Frontier District", tags: ["frontier", "military"], iconKey: "gate", profile: gameplay({ upkeep: 15, security: 35, food: 22 }) }),
  "Planar Beach": defineBuilding({ district: "Frontier District", tags: ["frontier", "arcane"], iconKey: "wave", profile: gameplay({ gold: 30, upkeep: 12, morale: 35, populationSupport: 200, prestige: 12 }) }),
  "Reinforced Stone Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", profile: gameplay({ upkeep: 16, defense: 55 }) }),
  "Relic Sanctum": defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", profile: gameplay({ upkeep: 15, prestige: 45, health: 18, mana: 14 }) }),
  Skyharbor: defineBuilding({ district: "Harbor District", tags: ["harbor", "arcane"], iconKey: "anchor", profile: gameplay({ gold: 50, upkeep: 20, prestige: 28, populationSupport: 200, mana: 14 }) }),
  "Steam Factory": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", profile: gameplay({ gold: 80, upkeep: 30, prosperity: 50, populationSupport: 200, materials: 30 }) }),
  Temple: defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", profile: gameplay({ upkeep: 15, morale: 32, health: 26, prestige: 22, populationSupport: 300, mana: 10 }) }),
  "Torture Chambers": defineBuilding({ district: "Military District", tags: ["security", "military"], iconKey: "shield", profile: gameplay({ upkeep: 12, security: 40, defense: 22 }) }),
  "Wall/Fortifications": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", profile: gameplay({ upkeep: 20, defense: 60, security: 26 }) }),

  "Arcana Tower": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", profile: gameplay({ gold: 50, upkeep: 30, prestige: 80, prosperity: 40, mana: 35 }) }),
  "Arcane Walls": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", profile: gameplay({ upkeep: 30, defense: 100, security: 40, mana: 20 }) }),
  "Captain's Quarters": defineBuilding({ district: "Harbor District", tags: ["harbor", "housing"], iconKey: "anchor", profile: gameplay({ gold: 60, upkeep: 30, security: 60, populationSupport: 500 }) }),
  "Deathless Grounds": defineBuilding({ district: "Religious District", tags: ["religious", "military"], iconKey: "spire", profile: gameplay({ upkeep: 25, health: 100, security: 40 }) }),
  "Doomsday Cannon": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", profile: gameplay({ upkeep: 40, defense: 120, security: 50, prestige: 30 }) }),
  Dragonforge: defineBuilding({ district: "Frontier District", tags: ["frontier", "military"], iconKey: "gate", profile: gameplay({ gold: 40, upkeep: 35, defense: 60, security: 80 }) }),
  Dreamweaver: defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", profile: gameplay({ upkeep: 30, morale: 100, prestige: 60, populationSupport: 300, mana: 24 }) }),
  "Elemental Cannons": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", profile: gameplay({ upkeep: 35, defense: 90, security: 70, mana: 18 }) }),
  "Elemental Shipmaker": defineBuilding({ district: "Harbor District", tags: ["harbor", "arcane"], iconKey: "anchor", profile: gameplay({ gold: 60, upkeep: 35, security: 70, prestige: 40, mana: 16 }) }),
  "Enchanted Forest": defineBuilding({ district: "Frontier District", tags: ["frontier", "agriculture", "arcane"], iconKey: "leaf", profile: gameplay({ upkeep: 20, food: 60, health: 60, morale: 50, populationSupport: 300, mana: 22 }) }),
  "Housing: Royal": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "crown", profile: gameplay({ upkeep: 20, populationSupport: 6000, prestige: 30 }) }),
  "Mortality Limiter Remover": defineBuilding({ district: "Arcane District", tags: ["arcane", "housing"], iconKey: "star", profile: gameplay({ upkeep: 30, health: 150, populationSupport: 500, mana: 28 }) }),
  "Planar Anchor": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", profile: gameplay({ upkeep: 30, defense: 80, security: 60, prestige: 40, mana: 20 }) }),
  "Planar Escape Pods": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", profile: gameplay({ upkeep: 25, security: 70, defense: 50, mana: 12 }) }),
  "Planar Tentacles": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "star", profile: gameplay({ upkeep: 35, security: 90, defense: 60, mana: 18 }) }),
  "Raestorum Center": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "spire", profile: gameplay({ gold: 80, upkeep: 40, prosperity: 100, populationSupport: 1500 }) }),
  "School of Driftum": defineBuilding({ district: "Cultural District", tags: ["culture", "arcane"], iconKey: "scroll", profile: gameplay({ upkeep: 30, prosperity: 80, morale: 60, populationSupport: 500, mana: 20 }) }),
  "Shield Generator": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "signal", profile: gameplay({ upkeep: 40, defense: 120, security: 60, mana: 26 }) }),
  Techcrafter: defineBuilding({ district: "Industrial District", tags: ["industry", "arcane"], iconKey: "hammer", profile: gameplay({ gold: 70, upkeep: 35, prosperity: 90, mana: 16, materials: 20 }) }),
  "The Seeker": defineBuilding({ district: "Frontier District", tags: ["frontier", "arcane"], iconKey: "gate", profile: gameplay({ upkeep: 30, prestige: 100, prosperity: 80, mana: 24 }) }),
  "War Academy Supreme": defineBuilding({ district: "Military District", tags: ["military", "culture"], iconKey: "shield", profile: gameplay({ upkeep: 40, defense: 80, security: 120, prestige: 30 }) }),

  "Heart of Kosmos": defineBuilding({ district: "Arcane District", tags: ["arcane", "religious"], iconKey: "star", profile: gameplay({ upkeep: 100, morale: 300, health: 300, prestige: 300, populationSupport: 1500, mana: 60 }) }),
  "Universal Portal": defineBuilding({ district: "Arcane District", tags: ["arcane", "harbor"], iconKey: "gate", profile: gameplay({ gold: 500, upkeep: 150, prosperity: 400, populationSupport: 500, mana: 120 }) }),
  "Lylandra's Residence": defineBuilding({ district: "Residential District", tags: ["housing", "arcane"], iconKey: "crown", profile: gameplay({ upkeep: 100, prestige: 500, morale: 200, populationSupport: 6000, mana: 40 }) }),
  "New Drift Seed": defineBuilding({ district: "Frontier District", tags: ["frontier", "agriculture"], iconKey: "gate", profile: gameplay({ upkeep: 80, food: 200, prosperity: 200, populationSupport: 3000, materials: 40 }) }),
  "Dungeon of the Endless": defineBuilding({ district: "Frontier District", tags: ["frontier", "military", "arcane"], iconKey: "gate" }),
  "The Ark": defineBuilding({ district: "Harbor District", tags: ["harbor", "housing", "frontier"], iconKey: "anchor" }),
  "The Maker's Creatorium": defineBuilding({ district: "Arcane District", tags: ["arcane", "industry"], iconKey: "star" }),
  "The First Last Tower of Chronomancy": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "spire" })
};

const RARITY_TONES = { Common: "humble", Uncommon: "well-kept", Rare: "renowned", Epic: "wondrous", Legendary: "myth-wreathed", Beyond: "reality-bending" };

const DISTRICT_FLAVOR_FRAGMENTS = {
  "Agricultural District": "It smells of soil, weather, and daily labor that keeps the city fed.",
  "Trade District": "Coin-song, haggling, and quick ambition pulse through the stones around it.",
  "Residential District": "Routine, shelter, and human closeness make it feel lived-in even at rest.",
  "Military District": "The shape of discipline is everywhere in it, from watch-lines to reinforced seams.",
  "Industrial District": "Tools, soot, and relentless production leave their mark on every beam and wall.",
  "Arcane District": "Mana pressure hangs around it like heat over stone, subtle until it suddenly is not.",
  "Religious District": "Prayer, offerings, and old fear give the structure a sense of ceremonial gravity.",
  "Harbor District": "Movement, exchange, and the promise of distance gather at its edges.",
  "Cultural District": "Memory, learning, and performance seem to settle in the air around it.",
  "Frontier District": "It feels like a structure built at the edge of certainty and pushed beyond it."
};

export const BUILDING_CONSTRUCTION_SUPPORT_BPD = {
  "Carpenter Shop": 2,
  "Tool Shed": 3,
  Clocktower: 1,
  "Mason's Workshop": 2,
  Ropeworks: 1,
  "Weaver's Hall": 1,
  "Steam Factory": 5,
  Dragonforge: 8,
  Techcrafter: 12,
  "The Maker's Creatorium": 30
};

const BUILDING_EMOJI_BY_ICON_KEY = {
  leaf: "🌿",
  coins: "💰",
  home: "🏠",
  shield: "🛡️",
  hammer: "🛠️",
  star: "✨",
  spire: "⛪",
  anchor: "⚓",
  scroll: "📜",
  gate: "🚪",
  crown: "👑",
  clock: "🕰️",
  columns: "🏛️",
  guild: "🤝",
  castle: "🏰",
  signal: "📡",
  crystal: "💎",
  banner: "🚩",
  wave: "🌊"
};

function titleCaseTag(tag) {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function buildSpecialEffect({ district, tags }) {
  const primaryTag = tags[0] ?? "civic";
  const secondaryTag = tags[1] ?? "stability";
  return `${titleCaseTag(primaryTag)} routines strengthen ${district.toLowerCase()} output while reinforcing ${secondaryTag} pressure.`;
}

export function buildFlavorText({ name, district, tags, rarity }) {
  const primaryTag = tags[0] ?? "civic";
  const tone = RARITY_TONES[rarity] ?? "storied";
  const districtFragment = DISTRICT_FLAVOR_FRAGMENTS[district] ?? "The place carries the mood of a city learning what it wants to become.";
  return `${name} is a ${tone} ${primaryTag} landmark within the ${district.toLowerCase()}. ${districtFragment}`;
}

function classifyBuilding(name) {
  const lowerName = name.toLowerCase();
  const matched = KEYWORD_CLASSIFIERS.find((rule) => rule.match.some((word) => lowerName.includes(word)));
  return matched ?? { district: "Residential District", tags: ["civic"], iconKey: "spire" };
}

function createCatalogEntry(name, rarity) {
  const base = classifyBuilding(name);
  const override = BUILDING_DEFINITIONS[name] ?? {};
  const tags = [...new Set([...(override.tags ?? []), ...base.tags])];

  return {
    key: getCatalogKey(name, rarity),
    name,
    displayName: name,
    rarity,
    district: override.district ?? base.district,
    tags,
    iconKey: override.iconKey ?? base.iconKey,
    imagePath: override.imagePath ?? null,
    flavorText: override.flavorText ?? buildFlavorText({ name, district: override.district ?? base.district, tags, rarity }),
    specialEffect: override.specialEffect ?? buildSpecialEffect({ district: override.district ?? base.district, tags }),
    statOverrides: override.statOverrides ?? null,
    resourceOverrides: override.resourceOverrides ?? null,
    citizenOverrides: override.citizenOverrides ?? null
  };
}

export function createBaseBuildingCatalog() {
  const catalog = {};
  for (const rarity of RARITY_ORDER) {
    for (const name of BUILDING_POOLS[rarity]) {
      const entry = createCatalogEntry(name, rarity);
      catalog[entry.key] = entry;
    }
  }
  return catalog;
}

export function getCatalogKey(name, rarity) {
  return name === "Crystal Upgrade" ? `${name}__${rarity}` : name;
}

export function createCatalogEntryFromInput({ name, rarity, district, tags, iconKey, imagePath, flavorText, specialEffect, statOverrides = null, resourceOverrides = null, citizenOverrides = null }) {
  const base = classifyBuilding(name);
  const nextTags = Array.isArray(tags) && tags.length ? [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] : base.tags;
  return {
    key: getCatalogKey(name, rarity),
    name,
    displayName: name,
    rarity,
    district: district || base.district,
    tags: nextTags,
    iconKey: iconKey || base.iconKey,
    imagePath: imagePath || null,
    flavorText: flavorText || buildFlavorText({ name, district: district || base.district, tags: nextTags, rarity }),
    specialEffect: specialEffect || buildSpecialEffect({ district: district || base.district, tags: nextTags }),
    statOverrides,
    resourceOverrides,
    citizenOverrides
  };
}

export const BUILDING_ROLE_LEGEND = [
  { key: "agriculture", emoji: "🌿", label: "Harvest", detail: "Food, herbs, and living growth." },
  { key: "trade", emoji: "💰", label: "Trade", detail: "Gold flow, markets, and exchange." },
  { key: "industry", emoji: "🛠️", label: "Industry", detail: "Materials, salvage, and crafted output." },
  { key: "military", emoji: "🛡️", label: "Military", detail: "Defense, readiness, and force." },
  { key: "arcane", emoji: "✨", label: "Arcane", detail: "Mana, study, and mystical systems." },
  { key: "religious", emoji: "⛪", label: "Sacred", detail: "Faith, rites, healing, and reverence." },
  { key: "housing", emoji: "🏠", label: "Housing", detail: "Population support and settlement space." },
  { key: "civic", emoji: "🏛️", label: "Civic", detail: "Order, law, records, and governance." },
  { key: "harbor", emoji: "⚓", label: "Harbor", detail: "Routes, docks, and travel access." },
  { key: "culture", emoji: "📜", label: "Culture", detail: "Prestige, memory, and city identity." },
  { key: "frontier", emoji: "🧭", label: "Frontier", detail: "Exploration, scouting, and outer reach." }
];

export function getBuildingEmoji(building) {
  if (!building) {
    return "🏗️";
  }

  if (building.iconKey && BUILDING_EMOJI_BY_ICON_KEY[building.iconKey]) {
    return BUILDING_EMOJI_BY_ICON_KEY[building.iconKey];
  }

  const primaryTag = building.tags?.[0] ?? "";
  if (primaryTag === "agriculture") return "🌿";
  if (primaryTag === "trade") return "💰";
  if (primaryTag === "industry") return "🛠️";
  if (primaryTag === "military") return "🛡️";
  if (primaryTag === "arcane") return "✨";
  if (primaryTag === "religious") return "⛪";
  if (primaryTag === "housing") return "🏠";
  if (primaryTag === "harbor") return "⚓";
  if (primaryTag === "culture") return "📜";
  if (primaryTag === "frontier") return "🧭";
  return "🏗️";
}

export function getBuildingConstructionSupportBpd(building) {
  const buildingName = building?.displayName ?? building?.name ?? "";
  return BUILDING_CONSTRUCTION_SUPPORT_BPD[buildingName] ?? 0;
}

export const BASE_BUILDING_CATALOG = createBaseBuildingCatalog();
