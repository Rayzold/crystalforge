// Behemoth bestiary system.
// Provides creation, edit, and removal helpers for the GM-authored
// roster of huge monsters captured and held at the Drift.
import { createId } from "../engine/Utils.js?v=v1.7.20-20260615092907";
import {
  BEHEMOTH_SIZES,
  BEHEMOTH_STATUSES,
  BEHEMOTH_STAT_KEYS,
  BEHEMOTH_TEMPERAMENTS,
  BEHEMOTH_UPKEEP_RESOURCES,
  createDefaultBehemothStats
} from "../content/BehemothConfig.js?v=v1.7.20-20260615092907";

const VALID_SIZE_IDS = new Set(BEHEMOTH_SIZES.map((entry) => entry.id));
const VALID_STATUS_IDS = new Set(BEHEMOTH_STATUSES.map((entry) => entry.id));
const VALID_TEMPERAMENT_IDS = new Set(BEHEMOTH_TEMPERAMENTS.map((entry) => entry.id));
const VALID_STAT_IDS = new Set(BEHEMOTH_STAT_KEYS.map((entry) => entry.id));
const VALID_UPKEEP_RESOURCE_IDS = new Set(BEHEMOTH_UPKEEP_RESOURCES.map((entry) => entry.id));

const EDITABLE_TEXT_FIELDS = new Set(["name", "kind", "lore", "origin", "imagePath"]);
const EDITABLE_CHOICE_FIELDS = {
  size: VALID_SIZE_IDS,
  status: VALID_STATUS_IDS,
  temperament: VALID_TEMPERAMENT_IDS
};

function normalizeStats(rawStats) {
  const stats = createDefaultBehemothStats();
  if (rawStats && typeof rawStats === "object") {
    for (const key of VALID_STAT_IDS) {
      const raw = Number(rawStats[key]);
      if (Number.isFinite(raw)) {
        stats[key] = Math.max(0, Math.round(raw));
      }
    }
    // Legacy: pre-rename "vigor" carries over into "health" if health was not set.
    if (
      VALID_STAT_IDS.has("health") &&
      !Number.isFinite(Number(rawStats.health)) &&
      Number.isFinite(Number(rawStats.vigor))
    ) {
      stats.health = Math.max(0, Math.round(Number(rawStats.vigor)));
    }
  }
  return stats;
}

function normalizeUpkeepEntry(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const resourceId = VALID_UPKEEP_RESOURCE_IDS.has(raw.resource) ? raw.resource : "food";
  const amount = Number(raw.amount);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("upkeep"),
    resource: resourceId,
    amount: Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
  };
}

function normalizeAbility(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const name = String(raw.name ?? "").trim().slice(0, 80);
  const description = String(raw.description ?? "").trim().slice(0, 600);
  if (!name && !description) {
    return null;
  }
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("ability"),
    name: name || "Unnamed Ability",
    description
  };
}

function normalizeBehemoth(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const sizeId = VALID_SIZE_IDS.has(raw.size) ? raw.size : "huge";
  const statusId = VALID_STATUS_IDS.has(raw.status) ? raw.status : "captured";
  const temperamentId = VALID_TEMPERAMENT_IDS.has(raw.temperament) ? raw.temperament : "guarded";
  const imagePath = typeof raw.imagePath === "string" ? raw.imagePath.trim().slice(0, 1024) : "";
  const imageData = typeof raw.imageData === "string" && raw.imageData.startsWith("data:image/") ? raw.imageData : "";

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("behemoth"),
    name: String(raw.name ?? "").trim().slice(0, 80) || "Unnamed Behemoth",
    kind: String(raw.kind ?? "").trim().slice(0, 80),
    size: sizeId,
    status: statusId,
    temperament: temperamentId,
    origin: String(raw.origin ?? "").trim().slice(0, 200),
    lore: String(raw.lore ?? "").trim().slice(0, 1200),
    imagePath,
    imageData,
    stats: normalizeStats(raw.stats),
    abilities: Array.isArray(raw.abilities)
      ? raw.abilities.map(normalizeAbility).filter(Boolean)
      : [],
    upkeep: Array.isArray(raw.upkeep)
      ? raw.upkeep.map(normalizeUpkeepEntry).filter(Boolean)
      : [],
    capturedDayOffset: Number.isFinite(Number(raw.capturedDayOffset)) ? Number(raw.capturedDayOffset) : null,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
  };
}

export function normalizeBehemoths(rawCollection) {
  if (!Array.isArray(rawCollection)) {
    return [];
  }
  return rawCollection.map(normalizeBehemoth).filter(Boolean);
}

export function createBlankBehemoth(state) {
  return {
    id: createId("behemoth"),
    name: "New Behemoth",
    kind: "",
    size: "huge",
    status: "captured",
    temperament: "guarded",
    origin: "",
    lore: "",
    imagePath: "",
    imageData: "",
    stats: createDefaultBehemothStats(),
    abilities: [],
    upkeep: [],
    capturedDayOffset: Number(state?.calendar?.dayOffset ?? 0) || 0,
    createdAt: Date.now()
  };
}

export function addBehemoth(state, overrides = {}) {
  if (!Array.isArray(state.behemoths)) {
    state.behemoths = [];
  }
  const behemoth = normalizeBehemoth({
    ...createBlankBehemoth(state),
    ...overrides
  });
  if (!behemoth) {
    return null;
  }
  state.behemoths.push(behemoth);
  return behemoth;
}

function findBehemoth(state, behemothId) {
  if (!Array.isArray(state.behemoths)) {
    return null;
  }
  return state.behemoths.find((entry) => entry.id === behemothId) ?? null;
}

export function removeBehemoth(state, behemothId) {
  if (!Array.isArray(state.behemoths)) {
    return false;
  }
  const startLength = state.behemoths.length;
  state.behemoths = state.behemoths.filter((entry) => entry.id !== behemothId);
  return state.behemoths.length !== startLength;
}

export function updateBehemothField(state, behemothId, field, value) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }

  if (EDITABLE_TEXT_FIELDS.has(field)) {
    const limit = field === "lore" ? 1200 : field === "origin" ? 200 : field === "imagePath" ? 1024 : 80;
    behemoth[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(EDITABLE_CHOICE_FIELDS, field)) {
    const allowed = EDITABLE_CHOICE_FIELDS[field];
    if (allowed.has(value)) {
      behemoth[field] = value;
      return true;
    }
    return false;
  }

  if (field === "capturedDayOffset") {
    const numeric = Number(value);
    behemoth.capturedDayOffset = Number.isFinite(numeric) ? numeric : null;
    return true;
  }

  return false;
}

export function updateBehemothStat(state, behemothId, statId, value) {
  if (!VALID_STAT_IDS.has(statId)) {
    return false;
  }
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }
  const numeric = Number(value);
  behemoth.stats[statId] = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  return true;
}

export function setBehemothImageData(state, behemothId, dataUrl) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
    behemoth.imageData = dataUrl;
    return true;
  }
  return false;
}

export function clearBehemothImage(state, behemothId) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }
  behemoth.imageData = "";
  behemoth.imagePath = "";
  return true;
}

export function addBehemothAbility(state, behemothId) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return null;
  }
  const ability = {
    id: createId("ability"),
    name: "New Ability",
    description: ""
  };
  behemoth.abilities.push(ability);
  return ability;
}

export function updateBehemothAbility(state, behemothId, abilityId, field, value) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }
  const ability = behemoth.abilities.find((entry) => entry.id === abilityId);
  if (!ability) {
    return false;
  }
  if (field === "name") {
    ability.name = String(value ?? "").slice(0, 80);
    return true;
  }
  if (field === "description") {
    ability.description = String(value ?? "").slice(0, 600);
    return true;
  }
  return false;
}

export function removeBehemothAbility(state, behemothId, abilityId) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return false;
  }
  const startLength = behemoth.abilities.length;
  behemoth.abilities = behemoth.abilities.filter((entry) => entry.id !== abilityId);
  return behemoth.abilities.length !== startLength;
}

export function addBehemothUpkeep(state, behemothId) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth) {
    return null;
  }
  if (!Array.isArray(behemoth.upkeep)) {
    behemoth.upkeep = [];
  }
  const usedResources = new Set(behemoth.upkeep.map((entry) => entry.resource));
  const nextResource = BEHEMOTH_UPKEEP_RESOURCES.find((entry) => !usedResources.has(entry.id))?.id ?? "food";
  const entry = {
    id: createId("upkeep"),
    resource: nextResource,
    amount: 1
  };
  behemoth.upkeep.push(entry);
  return entry;
}

export function updateBehemothUpkeep(state, behemothId, entryId, field, value) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth || !Array.isArray(behemoth.upkeep)) {
    return false;
  }
  const entry = behemoth.upkeep.find((item) => item.id === entryId);
  if (!entry) {
    return false;
  }
  if (field === "resource") {
    if (VALID_UPKEEP_RESOURCE_IDS.has(value)) {
      entry.resource = value;
      return true;
    }
    return false;
  }
  if (field === "amount") {
    const numeric = Number(value);
    entry.amount = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric * 100) / 100) : 0;
    return true;
  }
  return false;
}

export function removeBehemothUpkeep(state, behemothId, entryId) {
  const behemoth = findBehemoth(state, behemothId);
  if (!behemoth || !Array.isArray(behemoth.upkeep)) {
    return false;
  }
  const startLength = behemoth.upkeep.length;
  behemoth.upkeep = behemoth.upkeep.filter((entry) => entry.id !== entryId);
  return behemoth.upkeep.length !== startLength;
}
