import { BUILDING_POOLS } from "./BuildingPools.js";
import { RARITY_ORDER } from "./Rarities.js";

const KEYWORD_CLASSIFIERS = [
  {
    match: ["farm", "pond", "garden", "grove", "fish", "mill", "grain", "barn", "butcher", "smokehouse", "herbal", "beast"],
    district: "Agricultural District",
    tags: ["agriculture"],
    iconKey: "leaf"
  },
  {
    match: ["vendor", "tailor", "market", "trade", "bank", "merchant", "post", "jewelry", "exchange", "general store"],
    district: "Trade District",
    tags: ["trade"],
    iconKey: "coins"
  },
  {
    match: ["housing", "inn", "tavern", "well", "bathhouse", "hospital", "immigration", "community"],
    district: "Residential District",
    tags: ["housing"],
    iconKey: "home"
  },
  {
    match: ["guard", "barracks", "armory", "training", "walls", "watch", "war council", "interrogation", "doomsday cannon"],
    district: "Military District",
    tags: ["military"],
    iconKey: "shield"
  },
  {
    match: ["forge", "lumber", "mine", "quarry", "bakery", "tool", "stone", "clay", "carpenter", "roadworks", "warehouse", "factory", "engineering", "steam", "techcrafter"],
    district: "Industrial District",
    tags: ["industry"],
    iconKey: "hammer"
  },
  {
    match: ["alchemist", "oracle", "observatory", "illusion", "planar", "fey", "artifact", "arcane", "relic", "chronomancy", "reality", "universal portal", "cosmic", "heart of kosmos", "maker", "shield generator"],
    district: "Arcane District",
    tags: ["arcane"],
    iconKey: "star"
  },
  {
    match: ["temple", "shrine", "graveyard", "deathless", "dreamweaver", "sanctum"],
    district: "Religious District",
    tags: ["religious"],
    iconKey: "spire"
  },
  {
    match: ["dock", "lighthouse", "harbor", "airship", "skyharbor", "captain", "shipmaker"],
    district: "Harbor District",
    tags: ["harbor"],
    iconKey: "anchor"
  },
  {
    match: ["library", "school", "university", "amphitheater", "entertainment", "printing", "world archive", "clocktower"],
    district: "Cultural District",
    tags: ["culture"],
    iconKey: "scroll"
  },
  {
    match: ["caravan", "adventurers", "monster", "dimensional", "dungeon", "ark", "new drift", "eternal", "dragonforge", "seeker"],
    district: "Frontier District",
    tags: ["frontier"],
    iconKey: "gate"
  }
];

const BUILDING_OVERRIDES = {
  "Town Hall": { district: "Residential District", tags: ["civic", "housing"], iconKey: "crown" },
  "Clocktower": { district: "Cultural District", tags: ["civic", "culture"], iconKey: "clock" },
  "Courthouse": { district: "Residential District", tags: ["civic", "security"], iconKey: "columns" },
  "Guildhall": { district: "Trade District", tags: ["trade", "civic"], iconKey: "guild" },
  "Town Guard Post": { district: "Military District", tags: ["military", "civic"], iconKey: "shield" },
  Castle: { district: "Military District", tags: ["military", "housing", "civic"], iconKey: "castle" },
  "Communications Core": { district: "Arcane District", tags: ["arcane", "civic"], iconKey: "signal" },
  "Raestorum Center": { district: "Cultural District", tags: ["culture", "civic"], iconKey: "spire" },
  "Crystal Upgrade": { district: "Arcane District", tags: ["arcane", "civic"], iconKey: "crystal" },
  "Foreign Affairs Ministry": { district: "Trade District", tags: ["civic", "trade"], iconKey: "banner" },
  "Embassy Annex": { district: "Trade District", tags: ["civic", "trade"], iconKey: "banner" },
  "School of Driftum": { district: "Cultural District", tags: ["culture", "arcane"], iconKey: "scroll" },
  "Planar Beach": { district: "Frontier District", tags: ["arcane", "frontier"], iconKey: "wave" },
  "Mirage Citadel": { district: "Arcane District", tags: ["arcane", "military"], iconKey: "castle" },
  "Lylandra's Residence": { district: "Residential District", tags: ["housing", "arcane"], iconKey: "crown" },
  "Eternal Garden": { district: "Religious District", tags: ["religious", "agriculture"], iconKey: "leaf" }
};

const RARITY_TONES = {
  Common: "humble",
  Uncommon: "well-kept",
  Rare: "renowned",
  Epic: "wondrous",
  Legendary: "myth-wreathed",
  Beyond: "reality-bending"
};

const DISTRICT_FLAVOR_FRAGMENTS = {
  "Agricultural District": "It smells of turned soil, rainwater, and patient labor.",
  "Trade District": "Coin-song and negotiation linger in the air around it.",
  "Residential District": "Warm light and routine make the structure feel inhabited even at rest.",
  "Military District": "Every angle suggests drills, watchfulness, and hard discipline.",
  "Industrial District": "Soot, sparks, and rhythmic work leave their mark on every surface.",
  "Arcane District": "The air around it carries a faint static hum and a taste of mana.",
  "Religious District": "Incense, prayer, and reverent silence gather around its threshold.",
  "Harbor District": "Salt, distance, and motion cling to it like a second skin.",
  "Cultural District": "Stories, songs, and practiced memory seem to settle in its walls.",
  "Frontier District": "It feels half-civilized and half-wild, like a promise made at the city's edge."
};

function titleCaseTag(tag) {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function buildSpecialEffect({ district, tags }) {
  const primaryTag = tags[0] ?? "civic";
  const secondaryTag = tags[1] ?? "stability";
  return `${titleCaseTag(primaryTag)} lattice strengthens ${district.toLowerCase()} output while reinforcing ${secondaryTag} routines.`;
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
  const override = BUILDING_OVERRIDES[name] ?? {};
  const tags = [...new Set([...(override.tags ?? []), ...base.tags])];

  return {
    key: name === "Crystal Upgrade" ? `${name}__${rarity}` : name,
    name,
    displayName: name,
    rarity,
    district: override.district ?? base.district,
    tags,
    iconKey: override.iconKey ?? base.iconKey,
    imagePath: override.imagePath ?? null,
    flavorText:
      override.flavorText ??
      buildFlavorText({
        name,
        district: override.district ?? base.district,
        tags,
        rarity
      }),
    specialEffect: override.specialEffect ?? buildSpecialEffect({
      district: override.district ?? base.district,
      tags
    }),
    statOverrides: override.statOverrides ?? null
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

export function createCatalogEntryFromInput({
  name,
  rarity,
  district,
  tags,
  iconKey,
  imagePath,
  flavorText,
  specialEffect,
  statOverrides = null
}) {
  const base = classifyBuilding(name);
  const nextTags =
    Array.isArray(tags) && tags.length ? [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] : base.tags;

  return {
    key: getCatalogKey(name, rarity),
    name,
    displayName: name,
    rarity,
    district: district || base.district,
    tags: nextTags,
    iconKey: iconKey || base.iconKey,
    imagePath: imagePath || null,
    flavorText:
      flavorText ||
      buildFlavorText({
        name,
        district: district || base.district,
        tags: nextTags,
        rarity
      }),
    specialEffect:
      specialEffect ||
      buildSpecialEffect({
        district: district || base.district,
        tags: nextTags
      }),
    statOverrides
  };
}

export const BASE_BUILDING_CATALOG = createBaseBuildingCatalog();
