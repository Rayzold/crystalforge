// Player character (Equipment Sheet) state mutations.
// These helpers are the thin layer between the data-action handlers in app.js
// and the `state.playerCharacters[]` slice. Each function returns true when it
// mutated state so callers can short-circuit re-renders if useful.

const EDITABLE_TEXT_FIELDS = new Set(["name", "class", "title", "notes"]);
const EDITABLE_NUMBER_FIELDS = new Set(["level", "attunements"]);
const NUMBER_FIELD_RANGES = {
  level: { min: 1, max: 99 },
  attunements: { min: 0, max: 9 }
};

const VALID_RARITIES = new Set(["common", "uncommon", "rare", "epic", "legendary", "mythic"]);

const TEXT_LIMITS = {
  name: 80,
  class: 80,
  title: 120,
  notes: 4000
};

const SLOT_TEXT_LIMITS = {
  name: 80,
  notes: 1000
};

function findPlayerCharacter(state, characterId) {
  if (!characterId || !Array.isArray(state?.playerCharacters)) {
    return null;
  }
  return state.playerCharacters.find((entry) => entry?.id === characterId) ?? null;
}

function ensureEquipmentBag(character) {
  if (!character.equipment || typeof character.equipment !== "object") {
    character.equipment = {};
  }
  return character.equipment;
}

function ensureSlot(character, slotKey) {
  const bag = ensureEquipmentBag(character);
  if (!bag[slotKey] || typeof bag[slotKey] !== "object") {
    bag[slotKey] = { name: "", rarity: "common", notes: "" };
  }
  return bag[slotKey];
}

function clampNumber(field, raw) {
  const { min, max } = NUMBER_FIELD_RANGES[field] ?? { min: -Infinity, max: Infinity };
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

export function updatePlayerCharacterField(state, characterId, field, value) {
  const character = findPlayerCharacter(state, characterId);
  if (!character) {
    return false;
  }

  if (EDITABLE_TEXT_FIELDS.has(field)) {
    const limit = TEXT_LIMITS[field] ?? 80;
    character[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (EDITABLE_NUMBER_FIELDS.has(field)) {
    character[field] = clampNumber(field, value);
    return true;
  }

  return false;
}

export function updatePlayerCharacterEquipmentSlot(state, characterId, slotKey, field, value) {
  const character = findPlayerCharacter(state, characterId);
  if (!character || !slotKey) {
    return false;
  }
  const slot = ensureSlot(character, slotKey);

  if (field === "name" || field === "notes") {
    const limit = SLOT_TEXT_LIMITS[field] ?? 80;
    slot[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (field === "rarity") {
    const normalized = String(value ?? "").toLowerCase();
    if (!VALID_RARITIES.has(normalized)) {
      return false;
    }
    slot.rarity = normalized;
    return true;
  }

  return false;
}

// ─── Wealth & Inventory ────────────────────────────────────────────────────

const WEALTH_TEXT_LIMITS = {
  name: 80,
  notes: 200
};

function ensureWealth(character) {
  if (!character.wealth || typeof character.wealth !== "object") {
    character.wealth = { gp: 0, items: [] };
  }
  if (!Array.isArray(character.wealth.items)) {
    character.wealth.items = [];
  }
  if (typeof character.wealth.gp !== "number" || !Number.isFinite(character.wealth.gp)) {
    character.wealth.gp = 0;
  }
  return character.wealth;
}

export function updatePlayerCharacterGold(state, characterId, value) {
  const character = findPlayerCharacter(state, characterId);
  if (!character) {
    return false;
  }
  const wealth = ensureWealth(character);
  const numeric = Number(value);
  // Allow zero; clamp negatives to 0; cap to a sane ceiling so a stray paste
  // can't poison the save.
  wealth.gp = Number.isFinite(numeric) ? Math.max(0, Math.min(999_999_999, Math.floor(numeric))) : 0;
  return true;
}

export function addPlayerCharacterWealthItem(state, characterId, item) {
  const character = findPlayerCharacter(state, characterId);
  if (!character || !item || !item.id) {
    return null;
  }
  const wealth = ensureWealth(character);
  // Normalize the incoming shape so the UI sees the same fields every render.
  const normalized = {
    id: String(item.id),
    name: String(item.name ?? "").slice(0, WEALTH_TEXT_LIMITS.name),
    qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    notes: String(item.notes ?? "").slice(0, WEALTH_TEXT_LIMITS.notes)
  };
  wealth.items.push(normalized);
  return normalized;
}

export function removePlayerCharacterWealthItem(state, characterId, itemId) {
  const character = findPlayerCharacter(state, characterId);
  if (!character || !itemId) {
    return false;
  }
  const wealth = ensureWealth(character);
  const before = wealth.items.length;
  wealth.items = wealth.items.filter((entry) => entry?.id !== itemId);
  return wealth.items.length !== before;
}

export function updatePlayerCharacterWealthItem(state, characterId, itemId, field, value) {
  const character = findPlayerCharacter(state, characterId);
  if (!character || !itemId) {
    return false;
  }
  const wealth = ensureWealth(character);
  const item = wealth.items.find((entry) => entry?.id === itemId);
  if (!item) {
    return false;
  }

  if (field === "name" || field === "notes") {
    const limit = WEALTH_TEXT_LIMITS[field] ?? 80;
    item[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (field === "qty") {
    const numeric = Number(value);
    item.qty = Number.isFinite(numeric) ? Math.max(1, Math.min(9999, Math.floor(numeric))) : 1;
    return true;
  }

  return false;
}
