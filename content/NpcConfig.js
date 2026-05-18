// Special NPC roster — DM-editable character sheets for notable
// non-citizen people in the world: shopkeepers, allies, contacts, rivals,
// faction representatives. Mirrors the behemoth sheet pattern, without
// the daily resource upkeep.

export const NPC_ROLES = [
  { id: "civilian", label: "Civilian" },
  { id: "merchant", label: "Merchant" },
  { id: "crafter", label: "Crafter" },
  { id: "soldier", label: "Soldier" },
  { id: "mage", label: "Mage" },
  { id: "noble", label: "Noble" },
  { id: "scholar", label: "Scholar" },
  { id: "wanderer", label: "Wanderer" },
  { id: "outsider", label: "Outsider" }
];

export const NPC_STATUSES = [
  { id: "active", label: "Active", detail: "Currently in play and reachable." },
  { id: "friendly", label: "Friendly", detail: "Allied or sympathetic to the party." },
  { id: "neutral", label: "Neutral", detail: "Indifferent until pushed one way or the other." },
  { id: "hostile", label: "Hostile", detail: "Antagonistic to the party or the Drift." },
  { id: "departed", label: "Departed", detail: "No longer present — kept on the roster as a record." }
];

export const NPC_DISPOSITIONS = [
  { id: "cordial", label: "Cordial" },
  { id: "cautious", label: "Cautious" },
  { id: "loyal", label: "Loyal" },
  { id: "scheming", label: "Scheming" }
];

export const NPC_STAT_KEYS = [
  { id: "health", label: "Health", hint: "HP / staying power" },
  { id: "power", label: "Power", hint: "Raw offensive force" },
  { id: "speed", label: "Speed", hint: "Movement and reflex" },
  { id: "defense", label: "Defense", hint: "Armor, ward, resistance" }
];

export function getNpcRoleLabel(id) {
  return NPC_ROLES.find((entry) => entry.id === id)?.label ?? "Civilian";
}

export function getNpcStatusLabel(id) {
  return NPC_STATUSES.find((entry) => entry.id === id)?.label ?? "Active";
}

export function getNpcStatusDetail(id) {
  return NPC_STATUSES.find((entry) => entry.id === id)?.detail ?? "";
}

export function getNpcDispositionLabel(id) {
  return NPC_DISPOSITIONS.find((entry) => entry.id === id)?.label ?? "Cautious";
}

export function createDefaultNpcStats() {
  return NPC_STAT_KEYS.reduce((accumulator, stat) => {
    accumulator[stat.id] = 10;
    return accumulator;
  }, {});
}
