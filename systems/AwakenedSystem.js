// Awakened roster system.
// CRUD + normalization for the GM-authored roster of Awakened — the
// superhuman individuals who may join the city. Mirrors the NPC/Behemoth
// sheet pattern with grade, ability archetype, and a six-attribute block.
import { createId } from "../engine/Utils.js?v=v1.7.20-20260615093534";
import {
  AWAKENED_GRADES,
  AWAKENED_STATUSES,
  AWAKENED_GENDERS,
  AWAKENED_ABILITY_TYPES,
  AWAKENED_ATTRIBUTE_KEYS,
  getAwakenedAbilityType,
  createDefaultAwakenedAttributes
} from "../content/AwakenedConfig.js?v=v1.7.20-20260615093534";

const VALID_GRADE_IDS = new Set(AWAKENED_GRADES.map((entry) => entry.id));
const VALID_STATUS_IDS = new Set(AWAKENED_STATUSES.map((entry) => entry.id));
const VALID_GENDER_IDS = new Set(AWAKENED_GENDERS.map((entry) => entry.id));
const VALID_ABILITY_IDS = new Set(AWAKENED_ABILITY_TYPES.map((entry) => entry.id));
const VALID_ATTR_IDS = new Set(AWAKENED_ATTRIBUTE_KEYS.map((entry) => entry.id));

const EDITABLE_TEXT_FIELDS = new Set(["name", "originCity", "powerName", "powerDescription", "powerTheme", "similarHero", "lore", "imagePath"]);
const EDITABLE_CHOICE_FIELDS = {
  grade: VALID_GRADE_IDS,
  status: VALID_STATUS_IDS,
  gender: VALID_GENDER_IDS,
  abilityTypeId: VALID_ABILITY_IDS,
  primaryAttr: VALID_ATTR_IDS,
  secondaryAttr: VALID_ATTR_IDS
};

function normalizeAttributes(rawAttributes) {
  const attributes = createDefaultAwakenedAttributes();
  if (rawAttributes && typeof rawAttributes === "object") {
    for (const key of VALID_ATTR_IDS) {
      const raw = Number(rawAttributes[key]);
      if (Number.isFinite(raw)) {
        attributes[key] = Math.max(0, Math.round(raw));
      }
    }
  }
  return attributes;
}

function normalizeAwakened(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const abilityTypeId = VALID_ABILITY_IDS.has(raw.abilityTypeId) ? raw.abilityTypeId : "other";
  const abilityType = getAwakenedAbilityType(abilityTypeId);
  const gradeId = VALID_GRADE_IDS.has(raw.grade) ? raw.grade : "F";
  const statusId = VALID_STATUS_IDS.has(raw.status) ? raw.status : "unknown";
  const genderId = VALID_GENDER_IDS.has(raw.gender) ? raw.gender : "other";
  const primaryAttr = VALID_ATTR_IDS.has(raw.primaryAttr) ? raw.primaryAttr : abilityType?.primary ?? "STR";
  const secondaryAttr = VALID_ATTR_IDS.has(raw.secondaryAttr) ? raw.secondaryAttr : abilityType?.secondary ?? "DEX";
  const imagePath = typeof raw.imagePath === "string" ? raw.imagePath.trim().slice(0, 1024) : "";
  const imageData = typeof raw.imageData === "string" && raw.imageData.startsWith("data:image/") ? raw.imageData : "";
  const ageValue = Number(raw.age);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("awakened"),
    name: String(raw.name ?? "").trim().slice(0, 80) || "Unnamed Awakened",
    grade: gradeId,
    status: statusId,
    gender: genderId,
    originCity: String(raw.originCity ?? "").trim().slice(0, 80),
    age: Number.isFinite(ageValue) ? Math.max(0, Math.round(ageValue)) : null,
    abilityTypeId,
    primaryAttr,
    secondaryAttr,
    powerName: String(raw.powerName ?? "").trim().slice(0, 80),
    powerDescription: String(raw.powerDescription ?? "").trim().slice(0, 800),
    powerTheme: String(raw.powerTheme ?? "").trim().slice(0, 200),
    similarHero: String(raw.similarHero ?? "").trim().slice(0, 80),
    lore: String(raw.lore ?? "").trim().slice(0, 1200),
    imagePath,
    imageData,
    attributes: normalizeAttributes(raw.attributes),
    metDayOffset: Number.isFinite(Number(raw.metDayOffset)) ? Number(raw.metDayOffset) : null,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
  };
}

export function normalizeAwakened_(rawCollection) {
  if (!Array.isArray(rawCollection)) {
    return [];
  }
  return rawCollection.map(normalizeAwakened).filter(Boolean);
}

// Exported under a clean name for the storage/migration layer.
export function normalizeAwakenedRoster(rawCollection) {
  return normalizeAwakened_(rawCollection);
}

export function createBlankAwakened(state) {
  const abilityType = getAwakenedAbilityType("other");
  return {
    id: createId("awakened"),
    name: "New Awakened",
    grade: "F",
    status: "unknown",
    gender: "other",
    originCity: "",
    age: null,
    abilityTypeId: "other",
    primaryAttr: abilityType?.primary ?? "STR",
    secondaryAttr: abilityType?.secondary ?? "DEX",
    powerName: "",
    powerDescription: "",
    powerTheme: "",
    similarHero: "",
    lore: "",
    imagePath: "",
    imageData: "",
    attributes: createDefaultAwakenedAttributes(),
    metDayOffset: Number(state?.calendar?.dayOffset ?? 0) || 0,
    createdAt: Date.now()
  };
}

export function addAwakened(state, overrides = {}) {
  if (!Array.isArray(state.awakened)) {
    state.awakened = [];
  }
  const entry = normalizeAwakened({
    ...createBlankAwakened(state),
    ...overrides
  });
  if (!entry) {
    return null;
  }
  state.awakened.push(entry);
  return entry;
}

function findAwakened(state, awakenedId) {
  if (!Array.isArray(state.awakened)) {
    return null;
  }
  return state.awakened.find((entry) => entry.id === awakenedId) ?? null;
}

export function removeAwakened(state, awakenedId) {
  if (!Array.isArray(state.awakened)) {
    return false;
  }
  const startLength = state.awakened.length;
  state.awakened = state.awakened.filter((entry) => entry.id !== awakenedId);
  return state.awakened.length !== startLength;
}

export function updateAwakenedField(state, awakenedId, field, value) {
  const entry = findAwakened(state, awakenedId);
  if (!entry) {
    return false;
  }

  if (EDITABLE_TEXT_FIELDS.has(field)) {
    const limit =
      field === "lore" ? 1200 : field === "powerDescription" ? 800 : field === "powerTheme" ? 200 : field === "imagePath" ? 1024 : 80;
    entry[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (field === "abilityTypeId") {
    if (!VALID_ABILITY_IDS.has(value)) {
      return false;
    }
    entry.abilityTypeId = value;
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(EDITABLE_CHOICE_FIELDS, field)) {
    const allowed = EDITABLE_CHOICE_FIELDS[field];
    if (allowed.has(value)) {
      entry[field] = value;
      return true;
    }
    return false;
  }

  if (field === "age") {
    const numeric = Number(value);
    entry.age = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
    return true;
  }

  if (field === "metDayOffset") {
    const numeric = Number(value);
    entry.metDayOffset = Number.isFinite(numeric) ? numeric : null;
    return true;
  }

  return false;
}

export function updateAwakenedAttribute(state, awakenedId, attrId, value) {
  if (!VALID_ATTR_IDS.has(attrId)) {
    return false;
  }
  const entry = findAwakened(state, awakenedId);
  if (!entry) {
    return false;
  }
  const numeric = Number(value);
  entry.attributes[attrId] = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  return true;
}

export function setAwakenedImageData(state, awakenedId, dataUrl) {
  const entry = findAwakened(state, awakenedId);
  if (!entry) {
    return false;
  }
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
    entry.imageData = dataUrl;
    return true;
  }
  return false;
}

export function clearAwakenedImage(state, awakenedId) {
  const entry = findAwakened(state, awakenedId);
  if (!entry) {
    return false;
  }
  entry.imageData = "";
  entry.imagePath = "";
  return true;
}
