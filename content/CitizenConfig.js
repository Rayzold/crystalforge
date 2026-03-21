export const CITIZEN_CLASSES = [
  "Farmers",
  "Hunters",
  "Fishermen",
  "Scavengers",
  "Druids",
  "Laborers",
  "Crafters",
  "Techwrights",
  "Merchants",
  "Skycrew",
  "Scouts",
  "Defenders",
  "Soldiers",
  "Arcanists",
  "Medics",
  "Scribes",
  "Scholars",
  "Nobles",
  "Priests",
  "Entertainers",
  "Children",
  "Elderly"
];

export const CITIZEN_GROUP_ORDER = [
  "Provision",
  "Labor & Industry",
  "Trade & Movement",
  "Security",
  "Knowledge & Specialists",
  "Civic Life"
];

export const CITIZEN_DEFINITIONS = {
  Farmers: {
    group: "Provision",
    emoji: "🌾",
    production: { food: 0.78 },
    consumption: { food: 0.18, gold: 0.01 },
    stats: { health: 0.015 },
    flavor: "Field workers, growers, and granary keepers who anchor the settlement's daily food supply."
  },
  Hunters: {
    group: "Provision",
    emoji: "🏹",
    production: { food: 0.46, materials: 0.05 },
    consumption: { food: 0.18, gold: 0.02 },
    stats: { security: 0.02 },
    flavor: "Trackers and foragers who turn nearby wilderness into meat, hides, and warning."
  },
  Fishermen: {
    group: "Provision",
    emoji: "🎣",
    production: { food: 0.62 },
    consumption: { food: 0.16, gold: 0.02 },
    stats: { health: 0.01 },
    flavor: "Netcasters and river workers who provide a steady food stream where water routes exist."
  },
  Scavengers: {
    group: "Provision",
    emoji: "🧰",
    production: { materials: 0.18, salvage: 0.2 },
    consumption: { food: 0.15, gold: 0.02 },
    stats: { security: 0.01 },
    flavor: "Scrap-pullers and ruin walkers recovering usable parts, metal, and forgotten tech."
  },
  Druids: {
    group: "Provision",
    emoji: "🌿",
    production: { food: 0.12, mana: 0.14 },
    consumption: { food: 0.14, gold: 0.03 },
    stats: { health: 0.08, morale: 0.03 },
    flavor: "Nature-binders and grove-tenders who draw healing, growth, and steady mana from living systems."
  },
  Laborers: {
    group: "Labor & Industry",
    emoji: "🪓",
    production: { materials: 0.28 },
    consumption: { food: 0.2, gold: 0.02 },
    stats: { prosperity: 0.01 },
    flavor: "The general workforce carrying, repairing, hauling, and doing whatever the city needs next."
  },
  Crafters: {
    group: "Labor & Industry",
    emoji: "🛠️",
    production: { gold: 0.12, materials: 0.12 },
    consumption: { food: 0.18, gold: 0.03 },
    stats: { goods: 0.05, prosperity: 0.02 },
    flavor: "Artisans and makers who turn raw goods into tools, furnishings, and practical wealth."
  },
  Techwrights: {
    group: "Labor & Industry",
    emoji: "⚙️",
    production: { salvage: 0.16, mana: 0.03 },
    consumption: { food: 0.18, gold: 0.05, materials: 0.03 },
    stats: { goods: 0.06, prestige: 0.03 },
    flavor: "Rare engineers and system-tenders who maintain advanced mechanisms, relics, and salvage systems."
  },
  Merchants: {
    group: "Trade & Movement",
    emoji: "💰",
    production: { gold: 0.34, prosperity: 0.05 },
    consumption: { food: 0.16, gold: 0.03 },
    stats: { prosperity: 0.12 },
    flavor: "Dealers and brokers whose routes and bargaining turn movement into visible prosperity."
  },
  Skycrew: {
    group: "Trade & Movement",
    emoji: "☁️",
    production: { gold: 0.16, salvage: 0.06 },
    consumption: { food: 0.18, gold: 0.06, mana: 0.01 },
    stats: { prestige: 0.05, security: 0.03 },
    flavor: "Airship hands and riggers who keep future sky routes, cargo lifts, and aerial travel alive."
  },
  Scouts: {
    group: "Trade & Movement",
    emoji: "🧭",
    production: {},
    consumption: { food: 0.16, gold: 0.03 },
    stats: { security: 0.08, prestige: 0.01 },
    flavor: "Pathfinders and outriders mapping threats, resources, and safe movement beyond the settlement."
  },
  Defenders: {
    group: "Security",
    emoji: "🛡️",
    production: {},
    consumption: { food: 0.2, gold: 0.05 },
    stats: { security: 0.12, defense: 0.06 },
    flavor: "Wall crews, watch patrols, and local protectors holding the line against constant pressure."
  },
  Soldiers: {
    group: "Security",
    emoji: "⚔️",
    production: {},
    consumption: { food: 0.24, gold: 0.12, materials: 0.02 },
    stats: { defense: 0.18, security: 0.08 },
    flavor: "Trained fighters who provide disciplined military force when simple defense is not enough."
  },
  Arcanists: {
    group: "Knowledge & Specialists",
    emoji: "🔮",
    production: { mana: 0.46 },
    consumption: { food: 0.14, gold: 0.09, mana: 0.05 },
    stats: { prestige: 0.08, defense: 0.03 },
    flavor: "Arcane specialists who stabilize magical systems and convert knowledge into raw mana output."
  },
  Medics: {
    group: "Knowledge & Specialists",
    emoji: "🩺",
    production: {},
    consumption: { food: 0.16, gold: 0.05, materials: 0.01 },
    stats: { health: 0.18, morale: 0.02 },
    flavor: "Healers and care workers keeping bodies whole enough for the settlement to function."
  },
  Scribes: {
    group: "Knowledge & Specialists",
    emoji: "📝",
    production: { prosperity: 0.03 },
    consumption: { food: 0.15, gold: 0.04 },
    stats: { goods: 0.03, prestige: 0.04 },
    flavor: "Record keepers, surveyors, and clerks who turn memory and planning into usable order."
  },
  Scholars: {
    group: "Knowledge & Specialists",
    emoji: "📚",
    production: { mana: 0.08 },
    consumption: { food: 0.15, gold: 0.05 },
    stats: { goods: 0.04, prestige: 0.06 },
    flavor: "Researchers and learned minds who turn libraries, schools, and observatories into usable insight."
  },
  Nobles: {
    group: "Civic Life",
    emoji: "👑",
    production: { gold: 0.08, prosperity: 0.04 },
    consumption: { food: 0.22, gold: 0.16, mana: 0.02 },
    stats: { prestige: 0.16 },
    flavor: "Influential patrons whose rank shapes policy, reputation, and access to elite networks."
  },
  Priests: {
    group: "Civic Life",
    emoji: "⛪",
    production: {},
    consumption: { food: 0.14, gold: 0.04 },
    stats: { morale: 0.12, health: 0.02 },
    flavor: "Spiritual guides and ritual keepers who steady fear, grief, and public resolve."
  },
  Entertainers: {
    group: "Civic Life",
    emoji: "🎭",
    production: { gold: 0.06 },
    consumption: { food: 0.14, gold: 0.04 },
    stats: { morale: 0.14, prosperity: 0.03 },
    flavor: "Performers and hosts transforming stability into joy, ceremony, and shared identity."
  },
  Children: {
    group: "Civic Life",
    emoji: "🧒",
    production: {},
    consumption: { food: 0.12 },
    stats: { morale: 0.01 },
    flavor: "Young dependents whose care is a burden today and a promise tomorrow."
  },
  Elderly: {
    group: "Civic Life",
    emoji: "🧓",
    production: {},
    consumption: { food: 0.12, gold: 0.01 },
    stats: { morale: 0.02, health: 0.01 },
    flavor: "Older residents who carry memory, caution, and long-view perspective through hard years."
  }
};

export const CITIZEN_PROMOTION_PATHS = [];

const CITIZEN_EFFECT_LABELS = {
  food: "food",
  materials: "materials",
  salvage: "salvage",
  mana: "mana",
  gold: "gold",
  prosperity: "prosperity",
  goods: "goods",
  health: "health",
  morale: "morale",
  security: "security",
  defense: "defense",
  prestige: "prestige"
};

function joinLabels(labels) {
  if (!labels.length) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function getCitizenHelpText(citizenClass) {
  const definition = CITIZEN_DEFINITIONS[citizenClass];
  if (!definition) {
    return "Citizen role.";
  }

  const productionKeys = Object.keys(definition.production ?? {}).map((key) => CITIZEN_EFFECT_LABELS[key] ?? key.toLowerCase());
  const statKeys = Object.keys(definition.stats ?? {}).map((key) => CITIZEN_EFFECT_LABELS[key] ?? key.toLowerCase());
  const parts = [definition.flavor];

  if (productionKeys.length) {
    parts.push(`Produces ${joinLabels(productionKeys)}.`);
  }

  if (statKeys.length) {
    parts.push(`Supports ${joinLabels(statKeys)}.`);
  }

  return parts.join(" ");
}
