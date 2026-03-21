import { RARITY_ORDER } from "../content/Rarities.js";

export function hasCrystalAvailable(state, rarity, amount = 1) {
  return (state.crystals[rarity] ?? 0) >= amount;
}

// Crystal counts now represent persistent availability by reality level.
// Spending is only used for crystal evolution and admin actions.
export function spendCrystal(state, rarity, amount = 1) {
  if (!hasCrystalAvailable(state, rarity, amount)) {
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
