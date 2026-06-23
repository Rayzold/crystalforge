import { RARITY_ORDER } from "../content/Rarities.js?v=v1.7.20-20260623075447";
import { addCrystals } from "./CrystalSystem.js?v=v1.7.20-20260623075447";

export const SHARDS_PER_CRYSTAL = 100;

export function addShards(state, rarity, amount) {
  state.shards[rarity] = Math.max(0, (Number(state.shards[rarity] ?? 0) || 0) + (Number(amount) || 0));
}

export function setShards(state, rarity, amount) {
  state.shards[rarity] = Math.max(0, Number(amount) || 0);
}

export function convertShardsToCrystals(state, rarity, amount = 1) {
  const availableShards = Math.max(0, Math.floor(Number(state.shards?.[rarity] ?? 0) || 0));
  const requestedCrystals = Math.max(1, Math.floor(Number(amount) || 1));
  const convertibleCrystals = Math.floor(availableShards / SHARDS_PER_CRYSTAL);
  const convertedCrystals = Math.min(requestedCrystals, convertibleCrystals);

  if (convertedCrystals <= 0) {
    return {
      ok: false,
      reason: `Need ${SHARDS_PER_CRYSTAL} ${rarity} shards to convert into a ${rarity} crystal.`
    };
  }

  const spentShards = convertedCrystals * SHARDS_PER_CRYSTAL;
  state.shards[rarity] = availableShards - spentShards;
  addCrystals(state, rarity, convertedCrystals);

  return {
    ok: true,
    rarity,
    spentShards,
    convertedCrystals,
    remainingShards: state.shards[rarity]
  };
}

export function normalizeShardCollection(collection) {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, Math.max(0, Number(collection?.[rarity] ?? 0))]));
}
