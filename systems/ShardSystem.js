import { RARITY_ORDER } from "../content/Rarities.js";
import { addCrystals } from "./CrystalSystem.js";

export function addShards(state, rarity, amount) {
  state.shards[rarity] = Math.max(0, (state.shards[rarity] ?? 0) + Number(amount));
  while (state.shards[rarity] >= 100) {
    state.shards[rarity] -= 100;
    addCrystals(state, rarity, 1);
  }
}

export function setShards(state, rarity, amount) {
  state.shards[rarity] = Math.max(0, Number(amount));
  while (state.shards[rarity] >= 100) {
    state.shards[rarity] -= 100;
    addCrystals(state, rarity, 1);
  }
}

export function normalizeShardCollection(collection) {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, Math.max(0, Number(collection?.[rarity] ?? 0))]));
}
