import { RARITY_ORDER } from "../content/Rarities.js";

export function canSpendCrystal(state, rarity, amount = 1) {
  return (state.crystals[rarity] ?? 0) >= amount;
}

export function spendCrystal(state, rarity, amount = 1) {
  if (!canSpendCrystal(state, rarity, amount)) {
    return false;
  }
  state.crystals[rarity] -= amount;
  return true;
}

export function addCrystals(state, rarity, amount) {
  state.crystals[rarity] = Math.max(0, (state.crystals[rarity] ?? 0) + Number(amount));
}

export function setCrystals(state, rarity, amount) {
  state.crystals[rarity] = Math.max(0, Number(amount));
}

export function normalizeCrystalCollection(collection) {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, Math.max(0, Number(collection?.[rarity] ?? 0))]));
}
