// Manifestation roll logic.
// This system spends crystals, chooses a result from the current rarity pool,
// and either manifests a building or resolves a direct crystal-upgrade outcome.
import { pickRandom, randomInt } from "../engine/Random.js";
import { getCatalogKey } from "../content/BuildingCatalog.js";
import { getNextRarity } from "../content/Rarities.js";
import { formatDate } from "./CalendarSystem.js";
import { addCrystals, hasCrystalAvailable, spendCrystal } from "./CrystalSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { manifestIntoBuilding } from "./BuildingSystem.js";

export function manifestSelectedRarity(state, rarity) {
  const pool = state.rollTables[rarity] ?? [];
  if (!pool.length) {
    return { ok: false, reason: "That rarity pool is empty." };
  }

  if (!hasCrystalAvailable(state, rarity, 1)) {
    return { ok: false, reason: "No available crystals at that level." };
  }

  spendCrystal(state, rarity, 1);

  const rolledName = pickRandom(pool);
  if (rolledName === "Crystal Upgrade") {
    // Crystal Upgrade is a direct rarity conversion now, not a placeable building.
    const nextRarity = getNextRarity(rarity);
    if (!nextRarity) {
      // Give the spent crystal back if the roll hit an upgrade at the top of the chain.
      addCrystals(state, rarity, 1);
      return { ok: false, reason: "That crystal cannot be upgraded further." };
    }

    addCrystals(state, nextRarity, 1);
    // Move the forge forward immediately so the next manifest uses the elevated crystal.
    state.selectedRarity = nextRarity;

    addHistoryEntry(state, {
      category: "Crystal Upgrade",
      title: `${rarity} crystal elevated`,
      details: `${rarity} crystal manifested a crystal upgrade and became ${nextRarity}.`
    });

    return {
      ok: true,
      rarity: nextRarity,
      rolledName: `${nextRarity} Crystal`,
      sourceRarity: rarity,
      targetRarity: nextRarity,
      isCrystalUpgrade: true,
      qualityRoll: null,
      overflow: 0,
      building: null,
      wasNew: false
    };
  }

  const catalogKey = getCatalogKey(rolledName, rarity);
  const catalogEntry = state.buildingCatalog[catalogKey];
  const qualityRoll = randomInt(1, 100);
  const timestamps = {
    date: formatDate(state.calendar.dayOffset),
    dayOffset: state.calendar.dayOffset
  };

  const result = manifestIntoBuilding(state, catalogEntry, qualityRoll, timestamps);

  addHistoryEntry(state, {
    category: "Manifest",
    title: result.building.displayName,
    details: `${rarity} crystal manifested with quality roll ${qualityRoll}% and consumed 1 ${rarity} crystal.`
  });

  return {
    ok: true,
    rarity,
    qualityRoll,
    rolledName,
    overflow: result.overflow,
    building: result.building,
    wasNew: result.wasNew,
    previousQuality: result.previousQuality,
    appliedQuality: result.appliedQuality,
    finalQuality: result.finalQuality,
    crossedActivation: result.crossedActivation
  };
}
