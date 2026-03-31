// Expeditions are the player-facing population and external resource loop.
// Mission types provide the rules backbone, while mission templates generate
// concrete board cards with names, flavor, and board-specific risk.
export const EXPEDITION_RARITIES = ["Common", "Rare", "Epic"];

export const EXPEDITION_RARITY_REWARD_MULTIPLIERS = {
  Common: 1,
  Rare: 1.5,
  Epic: 2.25
};

export const EXPEDITION_APPROACHES = {
  cautious: {
    id: "cautious",
    label: "Cautious",
    riskModifier: 0.8,
    rewardModifier: 0.92,
    summary: "Lower risk, lighter rewards."
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    riskModifier: 1,
    rewardModifier: 1,
    summary: "A steady expedition profile."
  },
  bold: {
    id: "bold",
    label: "Bold",
    riskModifier: 1.25,
    rewardModifier: 1.2,
    summary: "Higher danger, but better odds of rare results."
  }
};

export const EXPEDITION_DURATION_OPTIONS = [3, 7, 14, 28];

export const EXPEDITION_TYPES = {
  rescue: {
    id: "rescue",
    label: "Rescue Expedition",
    emoji: "🫂",
    summary: "Search for stranded survivors and bring them back into the Drift.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Medics"],
    favoredClasses: { Scouts: 1.25, Defenders: 1.05, Soldiers: 1.1, Medics: 1.2 },
    recruitWeights: { Farmers: 4, Laborers: 4, Children: 2, Elderly: 2, Medics: 1, Priests: 1 },
    rewardFocus: { citizens: 1.5, resources: 0.35, crystals: 0.1 },
    uniqueWeight: 1.1
  },
  recruit: {
    id: "recruit",
    label: "Recruitment Drive",
    emoji: "🛡️",
    summary: "Seek out trained settlers, militias, and capable workers willing to join the city.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Merchants"],
    favoredClasses: { Scouts: 1.2, Defenders: 1.1, Soldiers: 1.25, Merchants: 0.9 },
    recruitWeights: { Defenders: 3, Soldiers: 3, Scouts: 2, Laborers: 2, Merchants: 1 },
    rewardFocus: { citizens: 1.3, resources: 0.25, crystals: 0.08 },
    uniqueWeight: 1
  },
  resourceRun: {
    id: "resourceRun",
    label: "Resource Run",
    emoji: "⛏️",
    summary: "Bring back food, materials, and salvage from the lands around the Drift.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Scavengers", "Druids", "Hunters"],
    favoredClasses: { Scouts: 1.1, Defenders: 0.9, Soldiers: 1, Scavengers: 1.25, Druids: 1.1, Hunters: 1.15 },
    recruitWeights: { Hunters: 2, Scavengers: 3, Laborers: 2, Farmers: 1, Druids: 1 },
    rewardFocus: { citizens: 0.6, resources: 1.4, crystals: 0.05 },
    uniqueWeight: 0.7
  },
  crystalHunt: {
    id: "crystalHunt",
    label: "Crystal Hunt",
    emoji: "💎",
    summary: "Trace unstable crystal echoes, mana blooms, and shard deposits.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Arcanists", "Scholars"],
    favoredClasses: { Scouts: 1.15, Defenders: 0.9, Soldiers: 1, Arcanists: 1.25, Scholars: 1.1 },
    recruitWeights: { Arcanists: 2, Scholars: 2, Scavengers: 1, Druids: 1 },
    rewardFocus: { citizens: 0.45, resources: 0.35, crystals: 1.45 },
    uniqueWeight: 1.25
  },
  relicRecovery: {
    id: "relicRecovery",
    label: "Relic Recovery",
    emoji: "🏺",
    summary: "Recover dangerous relics, salvage, and elite recruits from forgotten sites.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Arcanists", "Scavengers"],
    favoredClasses: { Scouts: 1.2, Defenders: 1, Soldiers: 1.15, Arcanists: 1.1, Scavengers: 1.2 },
    recruitWeights: { Scholars: 1, Arcanists: 2, Soldiers: 1, Scavengers: 2, Techwrights: 2 },
    rewardFocus: { citizens: 0.85, resources: 0.9, crystals: 0.85 },
    uniqueWeight: 1.35
  },
  diplomatic: {
    id: "diplomatic",
    label: "Diplomatic Contact",
    emoji: "🤝",
    summary: "Open routes, make alliances, and return with wealth or prestige-minded recruits.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Merchants", "Scribes"],
    favoredClasses: { Scouts: 1, Defenders: 0.85, Soldiers: 0.9, Merchants: 1.25, Scribes: 1.2 },
    recruitWeights: { Merchants: 3, Scribes: 3, Nobles: 1, Priests: 1, Entertainers: 2 },
    rewardFocus: { citizens: 0.8, resources: 1.1, crystals: 0.15 },
    uniqueWeight: 1
  },
  monsterHunt: {
    id: "monsterHunt",
    label: "Monster Hunt",
    emoji: "🐉",
    summary: "Drive back threats, capture beasts, and return with trophies or hard-won gains.",
    allowedClasses: ["Scouts", "Defenders", "Soldiers", "Hunters"],
    favoredClasses: { Scouts: 1.1, Defenders: 1.2, Soldiers: 1.25, Hunters: 1.15 },
    recruitWeights: { Defenders: 1, Soldiers: 2, Hunters: 3, Scouts: 1 },
    rewardFocus: { citizens: 0.55, resources: 1, crystals: 0.2 },
    uniqueWeight: 1.15
  },
  pilgrimage: {
    id: "pilgrimage",
    label: "Pilgrimage",
    emoji: "✨",
    summary: "Travel sacred or arcane routes in search of guidance, converts, and miraculous finds.",
    allowedClasses: ["Scouts", "Druids", "Priests", "Arcanists", "Medics"],
    favoredClasses: { Scouts: 0.95, Druids: 1.2, Priests: 1.25, Arcanists: 1.15, Medics: 1 },
    recruitWeights: { Priests: 3, Druids: 3, Arcanists: 2, Medics: 1, Scholars: 1 },
    rewardFocus: { citizens: 0.75, resources: 0.65, crystals: 0.8 },
    uniqueWeight: 1.3
  }
};

export const EXPEDITION_ORDER = Object.keys(EXPEDITION_TYPES);

export const EXPEDITION_MISSION_TEMPLATES = [
  {
    id: "collapsedHamlet",
    typeId: "rescue",
    name: "Collapsed Hamlet to the West",
    summary: "A broken settlement still sends smoke by dusk. Survivors may be trapped within.",
    risk: "Low",
    distance: "Near",
    suggestedDurationDays: 7,
    likelyRewards: ["citizens", "food", "morale"],
    recommendedVehicleTags: ["land", "safe"],
    buildingTags: ["civic", "housing"],
    terrainTags: ["ruins", "settlement"],
    isSpecial: false
  },
  {
    id: "lostCaravan",
    typeId: "recruit",
    name: "Lost Caravan on the Salt Road",
    summary: "A caravan has stalled beyond the visible routes, with guards and workers still unclaimed.",
    risk: "Low",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["citizens", "gold", "goods"],
    recommendedVehicleTags: ["land", "cargo"],
    buildingTags: ["trade", "frontier"],
    terrainTags: ["road", "salt"],
    isSpecial: false
  },
  {
    id: "crystalEchoField",
    typeId: "crystalHunt",
    name: "Crystal Echo Field",
    summary: "Blue harmonic bursts mark a shallow field of unstable shard growth.",
    risk: "Medium",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["crystals", "shards", "mana"],
    recommendedVehicleTags: ["air", "scout"],
    buildingTags: ["arcane", "culture"],
    terrainTags: ["shards", "field"],
    isSpecial: false
  },
  {
    id: "ruinedMonastery",
    typeId: "pilgrimage",
    name: "Ruined Monastery of Veils",
    summary: "A holy site flickers with half-remembered rites and unexplained guidance.",
    risk: "Medium",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["mana", "rare recruits", "unique chance"],
    recommendedVehicleTags: ["air", "arcane"],
    buildingTags: ["religious", "arcane"],
    terrainTags: ["ruins", "sacred"],
    isSpecial: false
  },
  {
    id: "bloodthornNest",
    typeId: "monsterHunt",
    name: "Bloodthorn Nest",
    summary: "Predatory growth and captured bone suggest something territorial has settled in.",
    risk: "High",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["salvage", "security", "capture chance"],
    recommendedVehicleTags: ["land", "military"],
    buildingTags: ["military", "agriculture"],
    terrainTags: ["wild", "monster"],
    isSpecial: false
  },
  {
    id: "brokenWatchtowerRelay",
    typeId: "resourceRun",
    name: "Broken Watchtower Relay",
    summary: "Collapsed relay towers hold salvageable stock and route maps if crews can carry them back.",
    risk: "Medium",
    distance: "Near",
    suggestedDurationDays: 7,
    likelyRewards: ["materials", "salvage", "scouts"],
    recommendedVehicleTags: ["scout", "cargo"],
    buildingTags: ["security", "trade"],
    terrainTags: ["tower", "road"],
    isSpecial: false
  },
  {
    id: "floodedQuarryEncampment",
    typeId: "resourceRun",
    name: "Flooded Quarry Encampment",
    summary: "An abandoned camp near the flooded quarry still holds stone, rope, and buried supply caches.",
    risk: "Low",
    distance: "Near",
    suggestedDurationDays: 3,
    likelyRewards: ["materials", "food", "laborers"],
    recommendedVehicleTags: ["land", "cargo"],
    buildingTags: ["industry", "trade"],
    terrainTags: ["quarry", "water"],
    isSpecial: false
  },
  {
    id: "silentShrine",
    typeId: "pilgrimage",
    name: "Silent Shrine of Glass",
    summary: "Pilgrims vanished here years ago, but the shrine still hums at moonrise.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["mana", "priests", "unique chance"],
    recommendedVehicleTags: ["air", "arcane"],
    buildingTags: ["religious", "arcane"],
    terrainTags: ["glass", "sacred"],
    isSpecial: false
  },
  {
    id: "ashDuneTrail",
    typeId: "rescue",
    name: "Ash Dune Survivor Trail",
    summary: "Refugees are leaving faint campfires along the ash dunes, but raiders are nearby.",
    risk: "Medium",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["citizens", "food", "medics"],
    recommendedVehicleTags: ["land", "safe"],
    buildingTags: ["civic", "military"],
    terrainTags: ["ash", "dunes"],
    isSpecial: false
  },
  {
    id: "forsakenStorehouse",
    typeId: "relicRecovery",
    name: "Forsaken Storehouse Vault",
    summary: "A sealed vault beneath a dead trade house may still hold old salvage and rarer pieces.",
    risk: "Medium",
    distance: "Mid",
    suggestedDurationDays: 14,
    likelyRewards: ["salvage", "goods", "rare recruits"],
    recommendedVehicleTags: ["scout", "cargo"],
    buildingTags: ["trade", "culture"],
    terrainTags: ["vault", "ruins"],
    isSpecial: false
  },
  {
    id: "pilgrimRoad",
    typeId: "diplomatic",
    name: "Pilgrims on the Root Road",
    summary: "A moving camp of pilgrims and merchants is open to escort, barter, and recruitment.",
    risk: "Low",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["gold", "citizens", "prosperity"],
    recommendedVehicleTags: ["land", "cargo"],
    buildingTags: ["trade", "religious"],
    terrainTags: ["road", "pilgrims"],
    isSpecial: false
  },
  {
    id: "derelictSkyMooring",
    typeId: "relicRecovery",
    name: "Derelict Sky Mooring",
    summary: "A sky-anchored ruin drifts just beyond safe reach, rich with relic fittings and risk.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["salvage", "crystals", "epic chance"],
    recommendedVehicleTags: ["air", "cargo"],
    buildingTags: ["harbor", "arcane"],
    terrainTags: ["sky", "ruins"],
    isSpecial: false
  },
  {
    id: "sunkenReliquary",
    typeId: "relicRecovery",
    name: "Sunken Reliquary of Tides",
    summary: "Relics and sealed chambers lie beneath unstable waterlogged stone.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 28,
    likelyRewards: ["relics", "mana", "unique chance"],
    recommendedVehicleTags: ["air", "scout"],
    buildingTags: ["arcane", "religious", "harbor"],
    terrainTags: ["water", "vault"],
    isSpecial: true
  },
  {
    id: "embercourtParley",
    typeId: "diplomatic",
    name: "Embercourt Parley",
    summary: "An invitation to negotiate with a volatile but wealthy court has finally arrived.",
    risk: "Medium",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["gold", "nobles", "prestige"],
    recommendedVehicleTags: ["air", "safe"],
    buildingTags: ["trade", "civic", "culture"],
    terrainTags: ["court", "diplomacy"],
    isSpecial: true
  },
  {
    id: "stormGlassPassage",
    typeId: "crystalHunt",
    name: "Stormglass Passage",
    summary: "A temporary crystal storm has opened a dangerous passage full of shard resonance.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["crystals", "mana", "epic chance"],
    recommendedVehicleTags: ["air", "arcane"],
    buildingTags: ["arcane", "harbor"],
    terrainTags: ["storm", "shards"],
    isSpecial: true
  },
  {
    id: "hollowCrownProcession",
    typeId: "pilgrimage",
    name: "Hollow Crown Procession",
    summary: "An ancient rite is moving through the wastes, and those who meet it rarely return unchanged.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 28,
    likelyRewards: ["priests", "druids", "unique chance"],
    recommendedVehicleTags: ["air", "arcane"],
    buildingTags: ["religious", "culture"],
    terrainTags: ["procession", "ritual"],
    isSpecial: true
  },
  {
    id: "frostlineBeacon",
    typeId: "rescue",
    name: "Frostline Beacon Distress",
    summary: "A failing beacon on the cold ridge still flashes a rescue code between snow squalls.",
    risk: "Medium",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["citizens", "medics", "food"],
    recommendedVehicleTags: ["land", "safe"],
    buildingTags: ["civic", "military"],
    terrainTags: ["snow", "ridge"],
    isSpecial: false
  },
  {
    id: "greenhollowMuster",
    typeId: "recruit",
    name: "Greenhollow Muster Camp",
    summary: "A temporary muster ground holds workers, outriders, and families waiting for a city worth joining.",
    risk: "Low",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["citizens", "goods", "gold"],
    recommendedVehicleTags: ["land", "cargo"],
    buildingTags: ["frontier", "civic"],
    terrainTags: ["camp", "meadow"],
    isSpecial: false
  },
  {
    id: "embersaltStorePit",
    typeId: "resourceRun",
    name: "Embersalt Store Pit",
    summary: "Collapsed trade pits still hide sealed crates of salt, grain, and salvage under scorched earth.",
    risk: "Medium",
    distance: "Near",
    suggestedDurationDays: 7,
    likelyRewards: ["food", "materials", "salvage"],
    recommendedVehicleTags: ["land", "cargo"],
    buildingTags: ["trade", "industry"],
    terrainTags: ["salt", "ash"],
    isSpecial: false
  },
  {
    id: "prismFenBloom",
    typeId: "crystalHunt",
    name: "Prism Fen Bloom",
    summary: "The marsh is flowering with unstable prism growth, bright enough to be seen from miles away.",
    risk: "Medium",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["crystals", "mana", "shards"],
    recommendedVehicleTags: ["air", "scout"],
    buildingTags: ["arcane", "agriculture"],
    terrainTags: ["fen", "shards"],
    isSpecial: false
  },
  {
    id: "redMawRavine",
    typeId: "monsterHunt",
    name: "Red Maw Ravine",
    summary: "Tracks, bones, and split caravans suggest a territorial predator has claimed the gorge.",
    risk: "High",
    distance: "Mid",
    suggestedDurationDays: 7,
    likelyRewards: ["salvage", "security", "trophy chance"],
    recommendedVehicleTags: ["land", "military"],
    buildingTags: ["military", "frontier"],
    terrainTags: ["ravine", "monster"],
    isSpecial: false
  },
  {
    id: "stairsOfBanners",
    typeId: "diplomatic",
    name: "Stairs of Banners Envoy",
    summary: "Several minor houses are willing to meet under truce if someone reaches the old banner stairs first.",
    risk: "Medium",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["gold", "prestige", "nobles"],
    recommendedVehicleTags: ["air", "safe"],
    buildingTags: ["trade", "civic", "culture"],
    terrainTags: ["stairs", "court"],
    isSpecial: false
  },
  {
    id: "moonwellConclave",
    typeId: "pilgrimage",
    name: "Moonwell Conclave",
    summary: "A rare moonwell gathering is about to begin, promising visions, converts, and dangerous revelation.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 14,
    likelyRewards: ["mana", "priests", "unique chance"],
    recommendedVehicleTags: ["air", "arcane"],
    buildingTags: ["religious", "arcane", "culture"],
    terrainTags: ["moonwell", "ritual"],
    isSpecial: true
  },
  {
    id: "shatteredAerieVault",
    typeId: "relicRecovery",
    name: "Shattered Aerie Vault",
    summary: "A broken aerie fortress still hangs together around a sealed vault full of old skyfaring relics.",
    risk: "High",
    distance: "Far",
    suggestedDurationDays: 28,
    likelyRewards: ["relics", "salvage", "epic chance"],
    recommendedVehicleTags: ["air", "cargo"],
    buildingTags: ["harbor", "arcane", "military"],
    terrainTags: ["sky", "vault"],
    isSpecial: true
  }
];
