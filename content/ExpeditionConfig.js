// Expeditions are the player-facing population and external resource loop.
// Each mission type defines favored roles, recruit pools, and reward emphasis.
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
