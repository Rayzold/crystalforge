import { BUILDING_POOLS } from "./BuildingPools.js";
import { RARITY_ORDER } from "./Rarities.js";

const KEYWORD_CLASSIFIERS = [
  { match: ["farm", "apiary", "pond", "garden", "grove", "fish", "mill", "grain", "barn", "butcher", "smokehouse", "herbal", "beast", "cider", "water trough"], district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf" },
  { match: ["vendor", "tailor", "market", "trade", "bank", "merchant", "post", "jewelry", "trade center", "mint", "brewery", "distillery", "red light"], district: "Trade District", tags: ["trade"], iconKey: "coins" },
  { match: ["housing", "inn", "tavern", "well", "bathhouse", "hospital", "immigration", "community", "commoner", "comfortable", "wealthy", "royal"], district: "Residential District", tags: ["housing"], iconKey: "home" },
  { match: ["guard", "barracks", "armory", "training", "wall", "fortification", "ballista", "trebuchet", "cannon", "prison", "torture", "war academy", "planar escape"], district: "Military District", tags: ["military"], iconKey: "shield" },
  { match: ["blacksmith", "forge", "lumber", "mine", "quarry", "bakery", "tool", "stone", "carpenter", "warehouse", "factory", "engineer", "mason", "ropeworks", "weaver", "tannery", "woodcutter", "steam", "techcrafter", "workshop quarter"], district: "Industrial District", tags: ["industry"], iconKey: "hammer" },
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
  "Heart of Kosmos": defineBuilding({ district: "Arcane District", tags: ["arcane", "religious"], iconKey: "star", flavorText: "Bound to Kosmos herself, this core magnifies the robotic sovereign's reach and lets her govern the Drift with far greater force.", profile: gameplay({ mana: 90, defense: 240, morale: 300, populationSupport: 1500 }) }),
  "Lylandra's Residence": defineBuilding({ district: "Residential District", tags: ["housing", "arcane"], iconKey: "crown", flavorText: "A residence fit for a literal goddess, it carries the weight of divine presence into the daily life of the Drift.", profile: gameplay({ prosperity: 100, prestige: 300, morale: 300, populationSupport: 1 }) }),
  "New Drift Seed": defineBuilding({ district: "Frontier District", tags: ["frontier", "agriculture"], iconKey: "gate", flavorText: "This living seed carries the power to give birth to an entirely new Drift when planted into the world.", profile: gameplay({ food: 160, materials: 24, goods: 8, upkeep: 80, prosperity: 200, populationSupport: 3000 }) }),
  "Universal Portal": defineBuilding({ district: "Arcane District", tags: ["arcane", "harbor"], iconKey: "gate", flavorText: "Passage, trade, and contact collapse into one threshold here, making distance feel almost politically optional.", profile: gameplay({ gold: 180, salvage: 20, mana: 120, goods: 12, upkeep: 150, prosperity: 400, populationSupport: 500 }) }),
  "Apiary": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", flavorText: "Hives, smoke, and careful hands make this a small but steady source of sweetness, wax, and patient abundance.", profile: gameplay({ food: 3, goods: 1, upkeep: 1, prosperity: 1, morale: 2, health: 1, populationSupport: 10 }) }),
  "Bakery": defineBuilding({ district: "Industrial District", tags: ["industry", "agriculture"], iconKey: "hammer", flavorText: "Warm ovens and disciplined hands turn grain into the smell of daily comfort.", profile: gameplay({ food: 4, goods: 2, upkeep: 2, morale: 2, populationSupport: 10 }) }),
  "Ballistas": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Rope, timber, and drilled aim make this one of the city's first serious answers to a distant threat.", profile: gameplay({ upkeep: 3, defense: 6, security: 3, populationSupport: 12 }) }),
  "Barn": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", flavorText: "A plain but vital shelter where harvest, tools, and hard seasons are held at bay.", profile: gameplay({ food: 20, upkeep: 1, populationSupport: 20 }) }),
  "Basic Shrine": defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", flavorText: "Small offerings and quiet ritual give this humble shrine more steadiness than its size suggests.", profile: gameplay({ upkeep: 1, morale: 4, health: 2, populationSupport: 10 }) }),
  "Beast Pens": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "military"], iconKey: "leaf", flavorText: "Heavy posts, chained gates, and reinforced cages make this a holding ground for captured monsters too dangerous to leave roaming.", profile: gameplay({ food: -5, upkeep: 3, defense: 9, security: 5, populationSupport: 20 }) }),
  "Blacksmith": defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", flavorText: "Heat, sparks, and hammer-rhythm make this place feel stronger than the metal it shapes.", profile: gameplay({ materials: -1, goods: 3, upkeep: 3, prosperity: 2, populationSupport: 10 }) }),
  "Butcher": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "trade"], iconKey: "leaf", flavorText: "Messy, necessary work turns livestock and game into the city's more dependable meals.", profile: gameplay({ food: 5, goods: 2, upkeep: 2, populationSupport: 10 }) }),
  "Cider Press": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "trade"], iconKey: "leaf", flavorText: "Fruit, pressure, and patience turn a quick harvest into a slower, more valuable comfort.", profile: gameplay({ food: 2, goods: 2, upkeep: 1, morale: 2, populationSupport: 10 }) }),
  "Farmlands": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", flavorText: "Ordered rows and muddy labor spread outward here, feeding the city one patient season at a time.", profile: gameplay({ food: 40, upkeep: 2, populationSupport: 50 }) }),
  "Fishery": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "harbor"], iconKey: "anchor", flavorText: "Nets, hooks, and cold water discipline give this place a steady, practical abundance.", profile: gameplay({ food: 20, upkeep: 2, populationSupport: 30 }) }),
  "Gardens": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "culture"], iconKey: "leaf", flavorText: "Trim paths and living color soften the city without ever quite letting it forget the work beneath them.", profile: gameplay({ upkeep: 1, prosperity: 2, prestige: 1, morale: 4, health: 2 }) }),
  "Grain Silo": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "security"], iconKey: "leaf", flavorText: "A guarded reserve against lean days, built to keep hunger outside the city gates.", profile: gameplay({ food: 1, upkeep: 1, prosperity: 1, health: 1, populationSupport: 5 }) }),
  "Graveyard": defineBuilding({ district: "Religious District", tags: ["religious", "security"], iconKey: "spire", flavorText: "Quiet stones and older names make this a place where memory still enforces order on the living.", profile: gameplay({ upkeep: 1, morale: 3, health: 2, populationSupport: 5 }) }),
  "Housing: Commoner": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Simple walls, shared routines, and dependable shelter make this the real shape of the city's ordinary life.", profile: gameplay({ upkeep: 3, populationSupport: 1000 }) }),
  "Inn": defineBuilding({ district: "Residential District", tags: ["housing", "trade"], iconKey: "home", flavorText: "Travelers, rumor, and lamp-lit meals make it feel larger inside than its walls suggest.", profile: gameplay({ gold: 8, upkeep: 4, morale: 3, populationSupport: 100 }) }),
  "Lumber Mill": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "The sound of saws and the smell of fresh-cut timber make this place feel like tomorrow's city in pieces.", profile: gameplay({ materials: 5, goods: 1, upkeep: 3, prosperity: 2, populationSupport: 10 }) }),
  "Mill": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "industry"], iconKey: "hammer", flavorText: "Grain enters heavy and leaves useful here, ground down into the city's quieter form of strength.", profile: gameplay({ food: 6, goods: 2, upkeep: 2, populationSupport: 10 }) }),
  "Mine": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Stone dust, echo, and danger cling to it like a second structure beneath the first.", profile: gameplay({ materials: 6, upkeep: 5, prosperity: 2, populationSupport: 20 }) }),
  "Quarry": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Cut faces of stone and measured labor make this one of the city's bluntest, most necessary worksites.", profile: gameplay({ materials: 5, upkeep: 4, prosperity: 2, populationSupport: 20 }) }),
  "Smokehouse": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "industry"], iconKey: "hammer", flavorText: "Salt, smoke, and slow preservation stretch good harvests into survivable winters.", profile: gameplay({ food: 4, goods: 2, upkeep: 2, populationSupport: 10 }) }),
  "Stables": defineBuilding({ district: "Military District", tags: ["military", "housing"], iconKey: "shield", flavorText: "Leather, hay, and restless hooves make this a place where movement is prepared before it is needed.", profile: gameplay({ goods: 1, upkeep: 4, prosperity: 2, security: 4, populationSupport: 20 }) }),
  "Tailor": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "Cloth, needles, and practiced taste turn plain material into visible dignity.", profile: gameplay({ materials: -1, goods: 3, upkeep: 2, morale: 2, populationSupport: 20 }) }),
  "Tavern": defineBuilding({ district: "Residential District", tags: ["housing", "trade"], iconKey: "home", flavorText: "Noise, relief, and temporary loyalties gather here faster than the drinks are poured.", profile: gameplay({ gold: 8, upkeep: 4, morale: 5, populationSupport: 50 }) }),
  "Tool Shed": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Unimpressive at a glance, it keeps the city's smaller jobs from turning into larger failures.", profile: gameplay({ materials: 2, goods: 1, upkeep: 1, prosperity: 2, populationSupport: 20 }) }),
  "Town Guard Post": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", flavorText: "A disciplined little knot of watchfulness where alarms, patrols, and local force begin.", profile: gameplay({ upkeep: 4, defense: 3, security: 30, populationSupport: 30 }) }),
  "Trade Center": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "Ledgers, stalls, and steady exchange make this the common city's clearest engine of coin.", profile: gameplay({ gold: 8, upkeep: 2, prosperity: 2, populationSupport: 20 }) }),
  "Vendor": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "A small, mobile edge of commerce where quick needs are answered before bigger shops ever open.", profile: gameplay({ gold: 5, upkeep: 2, prosperity: 1, populationSupport: 10 }) }),
  "Water Trough": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "housing"], iconKey: "leaf", flavorText: "A plain basin of shared necessity that keeps labor, animals, and long days from breaking early.", profile: gameplay({ food: 3, upkeep: 1, health: 2 }) }),
  "Well": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Simple, central, and never ignored, it turns water into trust.", profile: gameplay({ food: 2, upkeep: 1, health: 4 }) }),
  "Woodcutter's Hut": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Axes, sap, and bundled timber make this humble hut smell like tomorrow's walls.", profile: gameplay({ materials: 4, upkeep: 1, prosperity: 1, populationSupport: 20 }) }),
  "Wooden Wall": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Rough palisades and sharpened timber give the city its first honest sense of a defended edge.", profile: gameplay({ upkeep: 2, defense: 8 }) }),
  "Adventurers' Guildhall": defineBuilding({ district: "Frontier District", tags: ["frontier", "trade"], iconKey: "guild", flavorText: "Quest boards, hazard pay, and loud ambition make this the place where danger gets organized into opportunity.", profile: gameplay({ gold: 26, goods: 2, upkeep: 15, security: 10, prestige: 22, populationSupport: 10 }) }),
  "Airship Dockyard": defineBuilding({ district: "Harbor District", tags: ["harbor", "military"], iconKey: "anchor", flavorText: "Rigging towers, dry platforms, and costly engineering make the sky feel as workable as the sea.", profile: gameplay({ gold: 18, materials: 6, salvage: 5, goods: 3, upkeep: 18, security: 5, prestige: 18, populationSupport: 30 }) }),
  "Artifact Vault": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", flavorText: "Locked relics and layered wards give this place the tense stillness of power being deliberately contained.", profile: gameplay({ mana: 3, goods: 1, upkeep: 15, security: 22, prestige: 40, populationSupport: 10 }) }),
  "Cannons": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "These engines speak in thunder and recoil, making the city's borders feel much louder than before.", profile: gameplay({ upkeep: 16, defense: 40, security: 15, populationSupport: 18 }) }),
  "Caravan Outpost": defineBuilding({ district: "Frontier District", tags: ["frontier", "trade"], iconKey: "gate", flavorText: "Supply yards and road-hardened traffic make this a frontier knot where distance gets turned into commerce.", profile: gameplay({ gold: 30, food: 10, goods: 2, upkeep: 12, prosperity: 18, populationSupport: 10 }) }),
  "Castle": defineBuilding({ district: "Military District", tags: ["military", "housing", "civic"], iconKey: "castle", flavorText: "Seat of command, shelter of rank, and symbol of force, it makes power feel architectural.", profile: gameplay({ upkeep: 25, defense: 50, security: 30, prestige: 30, populationSupport: 2000 }) }),
  "Communications Core": defineBuilding({ district: "Arcane District", tags: ["arcane", "civic"], iconKey: "signal", flavorText: "Signals, relays, and disciplined coordination make this the city's nervous system given visible form.", profile: gameplay({ salvage: 3, goods: 4, upkeep: 25, prosperity: 60, security: 30, populationSupport: 10 }) }),
  "Fey Crossing": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", flavorText: "Beauty and danger overlap here until passage itself starts to feel like a negotiated privilege.", profile: gameplay({ mana: 4, upkeep: 12, prestige: 25, morale: 30, populationSupport: 200 }) }),
  "Foreign Affairs Ministry": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", flavorText: "Protocol, bargaining, and long memory make this where the city learns to matter abroad.", profile: gameplay({ gold: 28, upkeep: 15, prosperity: 22, prestige: 35, populationSupport: 10 }) }),
  "Grand Shrine": defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", flavorText: "Larger rites and deeper devotion make this shrine feel less local and more like a spiritual landmark.", profile: gameplay({ mana: 4, upkeep: 15, prestige: 22, morale: 40, health: 22, populationSupport: 300 }) }),
  "Housing: Noble": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Private space, visible luxury, and careful design make this housing as much a statement as a residence.", profile: gameplay({ upkeep: 10, prestige: 15, populationSupport: 1000 }) }),
  "Illusion Field Generator": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", flavorText: "False sight and controlled uncertainty turn this device into a defense built from doubt itself.", profile: gameplay({ mana: -1, upkeep: 15, defense: 22, security: 30, morale: 16, populationSupport: 10 }) }),
  "Mirage Citadel": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "castle", flavorText: "Half fortress and half deception, it makes approaching enemies uncertain of what is even real.", profile: gameplay({ upkeep: 20, defense: 40, prestige: 32, populationSupport: 5000 }) }),
  "Monster Arena": defineBuilding({ district: "Frontier District", tags: ["frontier", "culture"], iconKey: "gate", flavorText: "Spectacle, fear, and profit meet here where captured horrors are made public entertainment.", profile: gameplay({ gold: 32, goods: 3, upkeep: 18, security: 25, morale: 22, populationSupport: 30 }) }),
  "Monster Capture Field": defineBuilding({ district: "Frontier District", tags: ["frontier", "military"], iconKey: "gate", flavorText: "Traps, barriers, and brutal expertise make this where roaming threats are turned into contained assets.", profile: gameplay({ food: 22, upkeep: 15, security: 35, populationSupport: 10 }) }),
  "Planar Beach": defineBuilding({ district: "Frontier District", tags: ["frontier", "arcane"], iconKey: "wave", flavorText: "A shoreline that should not exist here, it feels like leisure borrowed from another reality.", profile: gameplay({ gold: 30, upkeep: 12, prestige: 12, morale: 35 }) }),
  "Reinforced Stone Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Layered masonry and deliberate reinforcement make these walls a promise of stubborn survival.", profile: gameplay({ upkeep: 16, defense: 55 }) }),
  "Relic Sanctum": defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", flavorText: "Guarded relics and reverent silence make this sanctum feel like faith preserved under pressure.", profile: gameplay({ mana: 2, upkeep: 15, prestige: 45, health: 4, populationSupport: 10 }) }),
  "Skyharbor": defineBuilding({ district: "Harbor District", tags: ["harbor", "arcane"], iconKey: "anchor", flavorText: "Aerial berths and impossible logistics turn this into a harbor for vessels that answer to higher routes.", profile: gameplay({ gold: 24, salvage: 4, goods: 4, upkeep: 20, prestige: 28, populationSupport: 80 }) }),
  "Steam Factory": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Pressure, heat, and relentless output make this building feel like progress with its voice raised.", profile: gameplay({ materials: 14, salvage: 5, goods: 8, upkeep: 30, prosperity: 50, populationSupport: 40 }) }),
  "Temple": defineBuilding({ district: "Religious District", tags: ["religious"], iconKey: "spire", flavorText: "Ritual scale and communal presence make this a place where devotion becomes public order.", profile: gameplay({ mana: 1, upkeep: 15, prestige: 22, morale: 32, health: 26, populationSupport: 100 }) }),
  "Torture Chambers": defineBuilding({ district: "Military District", tags: ["security", "military"], iconKey: "shield", flavorText: "Built for fear more than battle, these chambers turn cruelty into an instrument of control.", profile: gameplay({ upkeep: 12, defense: 4, security: 30, populationSupport: 5 }) }),
  "Wall/Fortifications": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", flavorText: "This broader belt of defenses makes the city feel planned around survival rather than luck.", profile: gameplay({ upkeep: 20, defense: 60, security: 26 }) }),
  "Arcana Tower": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", flavorText: "A landmark of disciplined sorcery, it makes knowledge feel vertical and power feel publicly undeniable.", profile: gameplay({ mana: 8, goods: 2, upkeep: 30, prosperity: 40, prestige: 80, populationSupport: 40 }) }),
  "Arcane Walls": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", flavorText: "Runes sunk into the fortification itself make these walls feel defended before the first soldier arrives.", profile: gameplay({ mana: -1, upkeep: 30, defense: 100, security: 40 }) }),
  "Captain's Quarters": defineBuilding({ district: "Harbor District", tags: ["harbor", "housing"], iconKey: "anchor", flavorText: "Built high and set apart, this singular residence belongs to the Captain alone and makes rulership visibly personal.", profile: gameplay({ upkeep: 30, security: 60, populationSupport: 100 }) }),
  "Deathless Grounds": defineBuilding({ district: "Religious District", tags: ["religious", "military"], iconKey: "spire", flavorText: "Quiet, dreadful, and unnaturally persistent, this place suggests mortality has been negotiated rather than accepted.", profile: gameplay({ upkeep: 25, security: 40, health: 100 }) }),
  "Doomsday Cannon": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", flavorText: "Built less to be used than to be feared, it gives the city the posture of a threat with a horizon.", profile: gameplay({ upkeep: 40, defense: 120, security: 30, prestige: 30, populationSupport: 10 }) }),
  "Dragonforge": defineBuilding({ district: "Frontier District", tags: ["frontier", "military"], iconKey: "gate", flavorText: "Heat, scale, and legendary workmanship make this forge feel equal parts industry and conquest.", profile: gameplay({ materials: 8, salvage: 4, goods: 8, upkeep: 35, defense: 20, security: 10, populationSupport: 60 }) }),
  "Dreamweaver": defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", flavorText: "Sleep, omen, and shaped longing turn this place into a sanctuary for realities that have not happened yet.", profile: gameplay({ mana: -1, upkeep: 30, prestige: 60, morale: 100, populationSupport: 120 }) }),
  "Elemental Cannons": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", flavorText: "These weapons bind raw forces into artillery, making each shot feel more like a contained disaster than a projectile.", profile: gameplay({ mana: -1, upkeep: 35, defense: 90, security: 30, populationSupport: 30 }) }),
  "Elemental Shipmaker": defineBuilding({ district: "Harbor District", tags: ["harbor", "arcane"], iconKey: "anchor", flavorText: "Arcane fittings and impossible craft let this yard build vessels that belong to stranger routes than water alone.", profile: gameplay({ salvage: 6, mana: -1, goods: 8, upkeep: 35, security: 10, prestige: 40, populationSupport: 50 }) }),
  "Enchanted Forest": defineBuilding({ district: "Frontier District", tags: ["frontier", "agriculture", "arcane"], iconKey: "leaf", flavorText: "Too fertile, too watchful, and too alive to be ordinary woodland, it feeds the city like a pact with nature.", profile: gameplay({ food: 60, mana: 5, upkeep: 20, morale: 50, health: 60, populationSupport: 300 }) }),
  "Housing: Royal": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "crown", flavorText: "Ceremony, privacy, and impossible standards make this residence feel designed for rule rather than rest.", profile: gameplay({ upkeep: 20, prestige: 30, populationSupport: 1000 }) }),
  "Mortality Limiter Remover": defineBuilding({ district: "Arcane District", tags: ["arcane", "housing"], iconKey: "star", flavorText: "A deeply unnatural triumph, it treats lifespan as an engineering problem instead of a sacred boundary.", profile: gameplay({ mana: -2, upkeep: 30, health: 150, populationSupport: 10 }) }),
  "Planar Anchor": defineBuilding({ district: "Arcane District", tags: ["arcane", "security"], iconKey: "star", flavorText: "Stability radiates from it with effort, holding hostile realities at bay through sheer anchored insistence.", profile: gameplay({ mana: -1, upkeep: 30, defense: 30, security: 20, prestige: 40 }) }),
  "Planar Escape Pods": defineBuilding({ district: "Military District", tags: ["military", "arcane"], iconKey: "shield", flavorText: "Built for the day even victory fails, these pods make survival feel like a contingency with engineering behind it.", profile: gameplay({ upkeep: 25 }) }),
  "Planar Tentacles": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "star", flavorText: "Reaching into the surrounding world with predatory certainty, it drags wealth and substance back toward the city.", profile: gameplay({ gold: 40, food: 16, materials: 12, salvage: 8, mana: -3, upkeep: 35, defense: 60, security: 12, populationSupport: 30 }) }),
  "Raestorum Center": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "spire", flavorText: "A vast seat of healing power, it gathers mastery, medicine, and near-miraculous care into one of the city's greatest protections against suffering.", profile: gameplay({ gold: 50, mana: -1, goods: 8, upkeep: 40, prosperity: 100, health: 300, populationSupport: 50 }) }),
  "School of Driftum": defineBuilding({ district: "Cultural District", tags: ["culture", "arcane"], iconKey: "scroll", flavorText: "Part academy and part magical institution, it gives formal learning the confidence of a public miracle.", profile: gameplay({ mana: -1, goods: 6, upkeep: 30, prosperity: 80, morale: 60, populationSupport: 250 }) }),
  "Shield Generator": defineBuilding({ district: "Arcane District", tags: ["arcane", "military"], iconKey: "signal", flavorText: "Invisible protection hums from this machine until the whole city feels held inside a deliberate refusal.", profile: gameplay({ mana: -6, upkeep: 40, defense: 120, security: 20, populationSupport: 50 }) }),
  "Techcrafter": defineBuilding({ district: "Industrial District", tags: ["industry", "arcane"], iconKey: "hammer", flavorText: "Precision, invention, and advanced fabrication make this workshop feel like tomorrow arriving before permission.", profile: gameplay({ materials: 8, salvage: 12, goods: 10, upkeep: 35, prosperity: 90, populationSupport: 80 }) }),
  "The Seeker": defineBuilding({ district: "Frontier District", tags: ["frontier", "arcane"], iconKey: "gate", flavorText: "Its reach extends far beyond the horizon, locating resources, people, and hidden targets with an unnerving certainty.", profile: gameplay({ mana: -3, upkeep: 30, prosperity: 80, prestige: 100, populationSupport: 50 }) }),
  "War Academy Supreme": defineBuilding({ district: "Military District", tags: ["military", "culture"], iconKey: "shield", flavorText: "Doctrine, elite training, and institutional pride make this where warfare becomes a taught philosophy.", profile: gameplay({ upkeep: 40, defense: 40, security: 70, prestige: 30, populationSupport: 400 }) }),
  "Amphitheater": defineBuilding({ district: "Cultural District", tags: ["culture"], iconKey: "scroll", flavorText: "A place built for voices to carry farther than ordinary rumor, and to return louder than they left.", profile: gameplay({ upkeep: 8, prestige: 12, morale: 16, populationSupport: 100 }) }),
  "Apothecary": defineBuilding({ district: "Residential District", tags: ["housing", "arcane"], iconKey: "star", flavorText: "Shelves of tinctures and precise remedies make this one of the city's more trustworthy forms of mystery.", profile: gameplay({ goods: 2, upkeep: 6, health: 16, populationSupport: 20 }) }),
  "Aqueduct System": defineBuilding({ district: "Residential District", tags: ["housing", "industry"], iconKey: "columns", flavorText: "Stone channels and hidden flow turn distant water into a daily fact of urban life.", profile: gameplay({ food: 10, upkeep: 8, health: 20, populationSupport: 40 }) }),
  "Armory": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Weapons, fittings, and disciplined storage make this the city at its most practical about violence.", profile: gameplay({ upkeep: 10, defense: 16, security: 12, populationSupport: 10 }) }),
  "Bank": defineBuilding({ district: "Trade District", tags: ["trade", "security"], iconKey: "coins", flavorText: "Locks, ledgers, and controlled confidence make this where wealth begins to feel institutional.", profile: gameplay({ gold: 30, upkeep: 10, prosperity: 15, security: 8, populationSupport: 20 }) }),
  "Bathhouse": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Steam, stone, and public ease turn simple cleanliness into visible civic confidence.", profile: gameplay({ upkeep: 7, morale: 12, health: 20, populationSupport: 10 }) }),
  "Courthouse": defineBuilding({ district: "Residential District", tags: ["civic", "security"], iconKey: "columns", flavorText: "Judgment, paperwork, and consequence gather here until law feels heavier than argument.", profile: gameplay({ upkeep: 8, prosperity: 12, security: 16, populationSupport: 10 }) }),
  "Embassy Annex": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", flavorText: "Polite words and guarded intentions make this an outpost of diplomacy more than friendship.", profile: gameplay({ gold: 12, upkeep: 8, prosperity: 6, prestige: 16, populationSupport: 20 }) }),
  "Engineers' Guild": defineBuilding({ district: "Industrial District", tags: ["industry", "military"], iconKey: "guild", flavorText: "Drafting tables, prototypes, and practical obsession make this the city thinking with tools.", profile: gameplay({ materials: 6, salvage: 3, goods: 3, upkeep: 10, prosperity: 15, populationSupport: 120 }) }),
  "Explosive Ballistas": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Heavier shot and more dangerous payloads turn an old defense into something far less forgiving.", profile: gameplay({ upkeep: 12, defense: 22, security: 8, populationSupport: 30 }) }),
  "Guildhall": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "guild", flavorText: "Contracts, posted work, and organized influence make this where commerce hires adventurers as readily as merchants.", profile: gameplay({ gold: 18, upkeep: 8, prosperity: 18, populationSupport: 40 }) }),
  "Herbal Greenhouse": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "arcane"], iconKey: "leaf", flavorText: "Warm glass and cultivated remedy make this feel halfway between garden, clinic, and experiment.", profile: gameplay({ food: 10, upkeep: 5, health: 20, populationSupport: 30 }) }),
  "Hospital": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Orderly beds, urgent footsteps, and stubborn care make this building one of the city's deeper mercies.", profile: gameplay({ upkeep: 10, morale: 6, health: 50, populationSupport: 100 }) }),
  "Housing: Wealthy": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Spacious rooms and better appointments make comfort here feel chosen rather than merely earned.", profile: gameplay({ upkeep: 8, populationSupport: 1000 }) }),
  "Lighthouse": defineBuilding({ district: "Harbor District", tags: ["harbor", "security"], iconKey: "anchor", flavorText: "A disciplined beam and a trustworthy height turn distance into something navigable.", profile: gameplay({ gold: 12, upkeep: 6, prosperity: 10, security: 10, populationSupport: 5 }) }),
  "Mint": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "Stamped value and guarded metal make this one of the city's most concentrated expressions of trust.", profile: gameplay({ gold: 40, upkeep: 12, prosperity: 10, populationSupport: 10 }) }),
  "Observatory": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "star", flavorText: "Its lenses and measured silences make the sky feel less distant and more accountable.", profile: gameplay({ mana: 1, upkeep: 8, prosperity: 12, prestige: 20, populationSupport: 20 }) }),
  "Oracle": defineBuilding({ district: "Religious District", tags: ["religious", "arcane"], iconKey: "spire", flavorText: "Ritual, omen, and difficult certainty give this place a gravity that outlasts conversation.", profile: gameplay({ mana: 2, upkeep: 7, prestige: 16, morale: 12, populationSupport: 60 }) }),
  "Printing Press": defineBuilding({ district: "Cultural District", tags: ["culture", "industry"], iconKey: "scroll", flavorText: "Ink, repetition, and multiplied words make this one of the city's most efficient weapons against forgetting.", profile: gameplay({ materials: -1, goods: 5, upkeep: 7, prosperity: 20, morale: 10, populationSupport: 50 }) }),
  "Prison": defineBuilding({ district: "Military District", tags: ["security"], iconKey: "shield", flavorText: "Stone, locks, and the promise of consequence give this place a cold kind of order.", profile: gameplay({ upkeep: 8, defense: 8, security: 20, populationSupport: 5 }) }),
  "Red Light District": defineBuilding({ district: "Trade District", tags: ["trade", "housing"], iconKey: "coins", flavorText: "Pleasure, danger, and fast money make this district useful long before anyone calls it respectable.", profile: gameplay({ gold: 22, upkeep: 8, morale: 12, populationSupport: 120 }) }),
  "Stone Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Cold, deliberate, and much harder to ignore, these walls declare the city intends to last.", profile: gameplay({ upkeep: 8, defense: 28 }) }),
  "Training Grounds": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Mud, repetition, and bruised discipline make this where fear gets turned into readiness.", profile: gameplay({ upkeep: 12, defense: 12, security: 15, populationSupport: 40 }) }),
  "University": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", flavorText: "Serious study and institutional ambition make this one of the city's clearest wagers on the future.", profile: gameplay({ goods: 4, upkeep: 12, prosperity: 25, morale: 12, populationSupport: 600 }) }),
  "Workshop Quarter": defineBuilding({ district: "Industrial District", tags: ["industry", "trade", "culture"], iconKey: "guild", flavorText: "Many trades under one disciplined roof make this place feel like a neighborhood condensed into output.", profile: gameplay({ materials: -2, goods: 5, upkeep: 8, prosperity: 10, morale: 4, populationSupport: 100 }) }),
  "Alchemist": defineBuilding({ district: "Arcane District", tags: ["arcane", "industry"], iconKey: "star", flavorText: "Glassware, fumes, and measured risk make this place feel one mistake away from brilliance.", profile: gameplay({ mana: 2, goods: 3, upkeep: 6, prosperity: 3, health: 5, populationSupport: 30 }) }),
  "Barracks": defineBuilding({ district: "Military District", tags: ["military", "housing"], iconKey: "shield", flavorText: "Order lives here in bunks, drills, and the hard rhythm of people being made dependable.", profile: gameplay({ upkeep: 10, defense: 8, security: 25, populationSupport: 300 }) }),
  "Brewery": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "Steam, grain, and patience turn common harvest into something worth gathering around.", profile: gameplay({ gold: 16, upkeep: 5, morale: 6, populationSupport: 20 }) }),
  "Carpenter Shop": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Measured cuts and fitted joints make this shop feel like the city's skeleton under construction.", profile: gameplay({ materials: -2, goods: 4, upkeep: 4, prosperity: 5, populationSupport: 10 }) }),
  "Clocktower": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "clock", flavorText: "Its bells and turning hands give the district a shared sense of order even when the rest of the city strains.", profile: gameplay({ upkeep: 2, prosperity: 5, morale: 4, populationSupport: 5 }) }),
  "Community Oven": defineBuilding({ district: "Residential District", tags: ["housing", "agriculture"], iconKey: "home", flavorText: "Heat shared at this scale feels less like industry and more like a neighborhood refusing hunger.", profile: gameplay({ food: 8, goods: 3, upkeep: 2, morale: 4, populationSupport: 50 }) }),
  "Distillery": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "coins", flavorText: "Sharp spirits and sharper craft give this place a reputation that travels faster than carts.", profile: gameplay({ gold: 20, upkeep: 5, morale: 5, populationSupport: 20 }) }),
  "Dock": defineBuilding({ district: "Harbor District", tags: ["harbor", "trade"], iconKey: "anchor", flavorText: "Cargo, rope, and tide-timing make this one of the city's first real conversations with distance.", profile: gameplay({ gold: 14, food: 4, materials: 4, upkeep: 6, populationSupport: 100 }) }),
  "Grove": defineBuilding({ district: "Agricultural District", tags: ["agriculture", "religious"], iconKey: "leaf", flavorText: "Older growth and quieter power make this a cultivated edge between garden and wilderness.", profile: gameplay({ food: 6, morale: 2, health: 4, populationSupport: 20 }) }),
  "Guard Tower": defineBuilding({ district: "Military District", tags: ["military", "security"], iconKey: "shield", flavorText: "Height, sightlines, and a ready watch make this one of the city's more honest promises.", profile: gameplay({ upkeep: 8, defense: 12, security: 12, populationSupport: 60 }) }),
  "Hardwood Walls": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Denser timber and better joinery turn a rough barrier into something built to endure.", profile: gameplay({ upkeep: 4, defense: 18 }) }),
  "Housing: Comfortable": defineBuilding({ district: "Residential District", tags: ["housing"], iconKey: "home", flavorText: "Better light, more room, and a little privacy make this feel like stability instead of mere shelter.", profile: gameplay({ upkeep: 6, populationSupport: 1000 }) }),
  "Immigration Center": defineBuilding({ district: "Residential District", tags: ["housing", "civic"], iconKey: "home", flavorText: "Ledgers, waiting benches, and uncertain hope make this the city's formal threshold.", profile: gameplay({ upkeep: 5, prosperity: 4, populationSupport: 500 }) }),
  "Jewelry Shop": defineBuilding({ district: "Trade District", tags: ["trade", "culture"], iconKey: "coins", flavorText: "Small luxuries and careful display turn wealth here into something visible and portable.", profile: gameplay({ gold: 18, goods: 2, upkeep: 5, prestige: 6, populationSupport: 10 }) }),
  "Library": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", flavorText: "Shelves, silence, and accumulated thought make this building feel larger inside than it has any right to.", profile: gameplay({ goods: 2, upkeep: 3, prosperity: 6, morale: 5, populationSupport: 30 }) }),
  "Market Square": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "coins", flavorText: "Open exchange gives the city a center of motion, noise, and everyday negotiation.", profile: gameplay({ gold: 24, upkeep: 5, prosperity: 6, populationSupport: 100 }) }),
  "Mason's Workshop": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Dusty plans and cut stone make this the place where weight becomes intention.", profile: gameplay({ materials: 6, goods: 3, upkeep: 3, prosperity: 5, populationSupport: 20 }) }),
  "Pond": defineBuilding({ district: "Agricultural District", tags: ["agriculture"], iconKey: "leaf", flavorText: "Still water and managed edges give the district a reserve of calm, utility, and life.", profile: gameplay({ food: 6, health: 4, populationSupport: 5 }) }),
  "Post Office": defineBuilding({ district: "Trade District", tags: ["trade", "civic"], iconKey: "banner", flavorText: "Messages, routes, and quiet administration make this place matter more than it looks.", profile: gameplay({ gold: 10, upkeep: 3, prosperity: 5, security: 3, populationSupport: 20 }) }),
  "Ropeworks": defineBuilding({ district: "Industrial District", tags: ["industry"], iconKey: "hammer", flavorText: "Fiber, tension, and repetition turn humble material into one of the city's hidden necessities.", profile: gameplay({ materials: 3, goods: 2, upkeep: 2, prosperity: 4, populationSupport: 10 }) }),
  "School": defineBuilding({ district: "Cultural District", tags: ["culture", "civic"], iconKey: "scroll", flavorText: "Lessons, discipline, and ordinary ambition make this one of the city's quieter engines of change.", profile: gameplay({ goods: 2, upkeep: 4, prosperity: 7, morale: 5, populationSupport: 80 }) }),
  "Tannery": defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", flavorText: "Harsh smells and stubborn craft turn raw hide into something the whole city ends up using.", profile: gameplay({ materials: 2, goods: 3, upkeep: 3, prosperity: 4, populationSupport: 10 }) }),
  "Town Hall": defineBuilding({ district: "Residential District", tags: ["civic", "housing"], iconKey: "crown", flavorText: "Petitions, decrees, and civic ritual make this building feel like the city speaking in one voice.", profile: gameplay({ upkeep: 5, prosperity: 6, security: 6, populationSupport: 120 }) }),
  "Trade Post": defineBuilding({ district: "Trade District", tags: ["trade"], iconKey: "banner", flavorText: "Goods change hands here with less ceremony and more urgency than they do in the square.", profile: gameplay({ gold: 22, goods: 3, upkeep: 6, prosperity: 7, populationSupport: 40 }) }),
  "Trebuchets": defineBuilding({ district: "Military District", tags: ["military"], iconKey: "shield", flavorText: "Built less for comfort than consequence, these engines make distance feel much less safe.", profile: gameplay({ upkeep: 8, defense: 18, security: 4, populationSupport: 24 }) }),
  "Warehouse": defineBuilding({ district: "Industrial District", tags: ["industry", "security"], iconKey: "hammer", flavorText: "Orderly stacks and locked stores turn surplus into real security.", profile: gameplay({ materials: 1, goods: 1, upkeep: 3, prosperity: 5, security: 3, populationSupport: 30 }) }),
  "Weaver's Hall": defineBuilding({ district: "Industrial District", tags: ["industry", "trade"], iconKey: "hammer", flavorText: "Thread, pattern, and long practice make this place feel precise even at a glance.", profile: gameplay({ materials: -1, goods: 4, upkeep: 3, prosperity: 4, morale: 2, populationSupport: 30 }) }),
  "Crystal Upgrade": defineBuilding({ district: "Arcane District", tags: ["arcane", "civic"], iconKey: "crystal", flavorText: "A focused lattice of crystal craft meant to deepen the forge itself rather than stand as a normal structure." }),
  "Dungeon of the Endless": defineBuilding({ district: "Frontier District", tags: ["frontier", "military", "arcane"], iconKey: "gate", flavorText: "Descending beyond reason, it promises danger, wealth, and unanswered depth in equal measure.", profile: gameplay({ gold: 120, salvage: 24, mana: 30, upkeep: 120, defense: 80, security: 100, prestige: 120, populationSupport: 200 }) }),
  "The Ark": defineBuilding({ district: "Harbor District", tags: ["harbor", "housing", "frontier"], iconKey: "anchor", flavorText: "Part refuge and part last answer, it feels built for the moment the world asks too much of everyone else.", profile: gameplay({ food: 80, materials: 20, goods: 6, upkeep: 90, defense: 60, morale: 80, health: 120, populationSupport: 4000 }) }),
  "The Maker's Creatorium": defineBuilding({ district: "Arcane District", tags: ["arcane", "industry"], iconKey: "star", flavorText: "Creation itself feels industrialized here, as though invention has been granted a sovereign workshop.", profile: gameplay({ salvage: 30, mana: 18, goods: 20, upkeep: 80, prosperity: 220, prestige: 140, populationSupport: 120 }) }),
  "The First Last Tower of Chronomancy": defineBuilding({ district: "Arcane District", tags: ["arcane", "culture"], iconKey: "spire", flavorText: "Ancient, impossible, and disturbingly precise, it gives time the posture of something engineered rather than endured.", profile: gameplay({ mana: 40, goods: 8, upkeep: 90, prosperity: 160, prestige: 220, morale: 80, populationSupport: 150 }) })
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

export function getBuildingRole(building) {
  const primaryTag = building?.tags?.[0] ?? "";
  return BUILDING_ROLE_LEGEND.find((role) => role.key === primaryTag) ?? {
    key: "structure",
    emoji: "ðŸ—ï¸",
    label: "Structure",
    detail: "A city structure with mixed purpose."
  };
}

function toSignedResourceEntries(record = {}) {
  return Object.entries(record)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => ({ key, value: Number(value) }));
}

export function getBuildingProduces(building) {
  return toSignedResourceEntries(building?.resourceRates).filter((entry) => entry.value > 0);
}

export function getBuildingConsumes(building) {
  const resourceConsumes = toSignedResourceEntries(building?.resourceRates)
    .filter((entry) => entry.value < 0)
    .map((entry) => ({ ...entry, value: Math.abs(entry.value) }));
  const upkeep = Number(building?.stats?.upkeep ?? 0);
  if (upkeep > 0) {
    resourceConsumes.push({ key: "upkeep", value: upkeep });
  }
  return resourceConsumes;
}

export function getBuildingEconomySummary(building) {
  return {
    role: getBuildingRole(building),
    produces: getBuildingProduces(building),
    consumes: getBuildingConsumes(building),
    supportBpd: getBuildingConstructionSupportBpd(building)
  };
}

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




