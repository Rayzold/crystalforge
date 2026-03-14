import { pickRandom, randomInt } from "../engine/Random.js";
import { getCatalogKey } from "../content/BuildingCatalog.js";
import { formatDate } from "./CalendarSystem.js";
import { spendCrystal } from "./CrystalSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { manifestIntoBuilding } from "./BuildingSystem.js";

export function manifestSelectedRarity(state, rarity) {
  const pool = state.rollTables[rarity] ?? [];
  if (!pool.length) {
    return { ok: false, reason: "That rarity pool is empty." };
  }

  if (!spendCrystal(state, rarity, 1)) {
    return { ok: false, reason: "Not enough crystals." };
  }

  const rolledName = pickRandom(pool);
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
    details: `${rarity} crystal manifested with quality roll ${qualityRoll}%.`
  });

  return {
    ok: true,
    rarity,
    qualityRoll,
    rolledName,
    overflow: result.overflow,
    building: result.building,
    wasNew: result.wasNew
  };
}
