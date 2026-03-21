export const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Beyond"];

export const CRYSTAL_LEVEL_LABELS = {
  Common: "Level 1",
  Uncommon: "Level 2",
  Rare: "Level 3",
  Epic: "Level 4",
  Legendary: "Level 5",
  Beyond: "Level 6"
};

export const RARITY_COLORS = {
  Common: "#b4bcc8",
  Uncommon: "#e2b35a",
  Rare: "#4fdcff",
  Epic: "#f15b79",
  Legendary: "#9f65ff",
  Beyond: "#4d79ff"
};

export const RARITY_GLOWS = {
  Common: "rgba(180, 188, 200, 0.45)",
  Uncommon: "rgba(226, 179, 90, 0.5)",
  Rare: "rgba(79, 220, 255, 0.55)",
  Epic: "rgba(241, 91, 121, 0.55)",
  Legendary: "rgba(159, 101, 255, 0.6)",
  Beyond: "rgba(77, 121, 255, 0.7)"
};

export const AUTO_CONSTRUCTION_RATES = {
  Common: 1,
  Uncommon: 0.5,
  Rare: 1 / 3,
  Epic: 1 / 7,
  Legendary: 1 / 14,
  Beyond: 1 / 28
};

export const CRYSTAL_UPGRADE_CHAIN = {
  Common: "Uncommon",
  Uncommon: "Rare",
  Rare: "Epic",
  Epic: "Legendary",
  Legendary: "Beyond",
  Beyond: null
};

export const RARITY_POWER = {
  Common: 12,
  Uncommon: 28,
  Rare: 65,
  Epic: 160,
  Legendary: 420,
  Beyond: 1200
};

export function getRarityWeight(rarity) {
  return RARITY_ORDER.indexOf(rarity);
}

export function getNextRarity(rarity) {
  return CRYSTAL_UPGRADE_CHAIN[rarity] ?? null;
}
