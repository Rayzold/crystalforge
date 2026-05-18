// Behemoth bestiary — DM-editable creature sheets for huge monsters
// captured and held at the Drift. Stats and abilities are kept loose on
// purpose so the GM can author whatever fits the table, instead of being
// boxed into a strict combat schema.

export const BEHEMOTH_SIZES = [
  { id: "large", label: "Large" },
  { id: "huge", label: "Huge" },
  { id: "gargantuan", label: "Gargantuan" },
  { id: "titanic", label: "Titanic" }
];

export const BEHEMOTH_STATUSES = [
  { id: "wild", label: "Wild", detail: "Spotted in the wilds but not yet captured." },
  { id: "captured", label: "Captured", detail: "Restrained at the Drift, not yet tamed." },
  { id: "bonded", label: "Bonded", detail: "Tamed and bonded to the city, available for service." },
  { id: "released", label: "Released", detail: "Returned to the wild or escaped — kept for the record." }
];

export const BEHEMOTH_TEMPERAMENTS = [
  { id: "feral", label: "Feral" },
  { id: "guarded", label: "Guarded" },
  { id: "curious", label: "Curious" },
  { id: "loyal", label: "Loyal" }
];

export const BEHEMOTH_STAT_KEYS = [
  { id: "vigor", label: "Vigor", hint: "HP / staying power" },
  { id: "power", label: "Power", hint: "Raw offensive force" },
  { id: "speed", label: "Speed", hint: "Movement and reflex" },
  { id: "defense", label: "Defense", hint: "Hide, ward, resistance" }
];

export function getBehemothSizeLabel(id) {
  return BEHEMOTH_SIZES.find((entry) => entry.id === id)?.label ?? "Huge";
}

export function getBehemothStatusLabel(id) {
  return BEHEMOTH_STATUSES.find((entry) => entry.id === id)?.label ?? "Captured";
}

export function getBehemothStatusDetail(id) {
  return BEHEMOTH_STATUSES.find((entry) => entry.id === id)?.detail ?? "";
}

export function getBehemothTemperamentLabel(id) {
  return BEHEMOTH_TEMPERAMENTS.find((entry) => entry.id === id)?.label ?? "Guarded";
}

export function createDefaultBehemothStats() {
  return BEHEMOTH_STAT_KEYS.reduce((accumulator, stat) => {
    accumulator[stat.id] = 10;
    return accumulator;
  }, {});
}
