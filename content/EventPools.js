export const EVENT_POOLS = [
  {
    id: "trade-boom",
    name: "Trade Boom",
    type: "economic",
    rarity: "Common",
    description: "Merchant routes align and prices favor the city.",
    triggerSource: "random chance",
    durationDays: 7,
    effects: { goldMultiplier: 0.18, prosperityFlat: 4 }
  },
  {
    id: "merchant-caravan-arrival",
    name: "Merchant Caravan Arrival",
    type: "economic",
    rarity: "Uncommon",
    description: "A major caravan brings coin, gossip, and supplies.",
    triggerSource: "trade district",
    durationDays: 5,
    effects: { goldFlat: 40, materialsFlat: 18, prosperityFlat: 3 },
    requirements: { districtLevel: { district: "Trade District", level: 1 } }
  },
  {
    id: "market-crash",
    name: "Market Crash",
    type: "economic",
    rarity: "Rare",
    description: "Speculation breaks and confidence slips for a short while.",
    triggerSource: "random chance",
    durationDays: 6,
    effects: { goldMultiplier: -0.2, prosperityFlat: -5 }
  },
  {
    id: "guild-dispute",
    name: "Guild Dispute",
    type: "social",
    rarity: "Common",
    description: "A feud between guild factions slows work and morale.",
    triggerSource: "owned buildings",
    durationDays: 4,
    effects: { materialsMultiplier: -0.14, moraleFlat: -4 },
    requirements: { buildingsAny: ["Guildhall", "Merchant Guild", "Adventurers Guildhall"] }
  },
  {
    id: "festival",
    name: "Festival",
    type: "social",
    rarity: "Common",
    description: "The streets glow with revelry and shared celebration.",
    triggerSource: "holiday",
    durationDays: 3,
    effects: { moraleFlat: 8, prosperityFlat: 5 }
  },
  {
    id: "religious-pilgrimage",
    name: "Religious Pilgrimage",
    type: "social",
    rarity: "Uncommon",
    description: "Pilgrims arrive in waves, filling shrines and inns.",
    triggerSource: "owned buildings",
    durationDays: 5,
    effects: { goldFlat: 14, moraleFlat: 6, prestigeFlat: 4 },
    requirements: { buildingsAny: ["Temple", "Grand Shrine", "Relic Sanctum"] }
  },
  {
    id: "arcane-storm",
    name: "Arcane Storm",
    type: "magical",
    rarity: "Rare",
    description: "Wild mana lashes the skyline and disrupts precision.",
    triggerSource: "random chance",
    durationDays: 4,
    effects: { manaMultiplier: -0.18, securityFlat: -3, prestigeFlat: 2 }
  },
  {
    id: "leyline-stabilization",
    name: "Leyline Stabilization",
    type: "magical",
    rarity: "Epic",
    description: "The local ley weave settles into a rare harmonic pattern.",
    triggerSource: "owned buildings",
    durationDays: 8,
    effects: { manaMultiplier: 0.26, prosperityFlat: 6 },
    requirements: { buildingsAny: ["Arcana Tower", "Planar Anchor", "Chronomancy Lab"] }
  },
  {
    id: "dimensional-rift",
    name: "Dimensional Rift",
    type: "world",
    rarity: "Legendary",
    description: "Reality tears open on the city edge before collapsing again.",
    triggerSource: "owned buildings",
    durationDays: 5,
    effects: { securityFlat: -8, defenseFlat: -5, prestigeFlat: 8, manaFlat: 16 },
    requirements: { buildingsAny: ["Dimensional Gate", "Universal Portal", "Planar Anchor"] }
  },
  {
    id: "bandit-raid",
    name: "Bandit Raid",
    type: "military",
    rarity: "Common",
    description: "Outlying roads are harried by organized raiders.",
    triggerSource: "low gold",
    durationDays: 3,
    effects: { goldFlat: -18, securityFlat: -5 },
    requirements: { resourcesBelow: { gold: 25 } }
  },
  {
    id: "monster-attack",
    name: "Monster Attack",
    type: "military",
    rarity: "Rare",
    description: "A roaming threat pushes in from the frontier.",
    triggerSource: "frontier district",
    durationDays: 4,
    effects: { foodFlat: -10, defenseFlat: -6, prestigeFlat: 3 },
    requirements: { districtLevel: { district: "Frontier District", level: 1 } }
  },
  {
    id: "mercenary-arrival",
    name: "Mercenary Arrival",
    type: "military",
    rarity: "Uncommon",
    description: "A disciplined company offers temporary service for coin.",
    triggerSource: "military district",
    durationDays: 6,
    effects: { defenseFlat: 10, securityFlat: 6, goldFlat: -12 },
    requirements: { districtLevel: { district: "Military District", level: 1 } }
  },
  {
    id: "harvest-festival",
    name: "Harvest Festival",
    type: "social",
    rarity: "Uncommon",
    description: "Granaries open, tables fill, and the city breathes easier.",
    triggerSource: "calendar dates / holidays",
    durationDays: 4,
    effects: { foodFlat: 18, moraleFlat: 8, prosperityFlat: 5 },
    requirements: { holidaysAny: ["Harvest Moon Festival"] }
  },
  {
    id: "planar-surge",
    name: "Planar Surge",
    type: "magical",
    rarity: "Epic",
    description: "Thin boundaries flood the city with impossible energy.",
    triggerSource: "owned buildings",
    durationDays: 5,
    effects: { manaMultiplier: 0.3, prestigeFlat: 6, securityFlat: -4 },
    requirements: { buildingsAny: ["Planar Anchor", "Planar Beach", "Planar Tentacles"] }
  },
  {
    id: "prophecy-of-gold",
    name: "Prophecy of Gold",
    type: "world",
    rarity: "Epic",
    description: "A widely shared omen drives faith in tomorrow's wealth.",
    triggerSource: "owned buildings",
    durationDays: 6,
    effects: { goldMultiplier: 0.2, prosperityFlat: 8, prestigeFlat: 4 },
    requirements: { buildingsAny: ["Oracle Chamber", "Observatory"] }
  },
  {
    id: "dragon-awakening",
    name: "Dragon Awakening",
    type: "world",
    rarity: "Legendary",
    description: "An ancient force stirs, thrilling and terrifying the populace.",
    triggerSource: "owned buildings",
    durationDays: 5,
    effects: { prestigeFlat: 12, defenseFlat: -5, moraleFlat: -3 },
    requirements: { buildingsAny: ["Dragonforge"] }
  },
  {
    id: "dungeon-breach",
    name: "Dungeon Breach",
    type: "world",
    rarity: "Legendary",
    description: "Creatures slip through a broken containment seam.",
    triggerSource: "owned buildings",
    durationDays: 5,
    effects: { defenseFlat: -10, securityFlat: -9, prestigeFlat: 5 },
    requirements: { buildingsAny: ["Dungeon of the Endless"] }
  },
  {
    id: "doublemoon-observance",
    name: "Doublemoon Observance",
    type: "world",
    rarity: "Rare",
    description: "The aligned moons cast a brilliant omen over the city.",
    triggerSource: "calendar dates / holidays",
    durationDays: 2,
    effects: { manaFlat: 18, prestigeFlat: 7, prosperityFlat: 4 },
    requirements: { holidaysAny: ["Doublemoon Alignment"] }
  },
  {
    id: "datasphere-whisper",
    name: "Datasphere Whisper",
    type: "magical",
    rarity: "Epic",
    description: "Signals from beyond carry fractured insight and formulas.",
    triggerSource: "calendar dates / holidays",
    durationDays: 3,
    effects: { manaFlat: 12, prosperityFlat: 5, prestigeFlat: 5 },
    requirements: { holidaysAny: ["Datasphere's Reach"] }
  }
];
