// Special NPC roster system.
// Mirrors BehemothSystem but without daily resource upkeep — NPCs are
// notable people the GM tracks with a simple character sheet.
import { createId } from "../engine/Utils.js?v=v1.7.20-20260621155633";
import {
  NPC_ROLES,
  NPC_STATUSES,
  NPC_STAT_KEYS,
  NPC_DISPOSITIONS,
  createDefaultNpcStats
} from "../content/NpcConfig.js?v=v1.7.20-20260621155633";

const VALID_ROLE_IDS = new Set(NPC_ROLES.map((entry) => entry.id));
const VALID_STATUS_IDS = new Set(NPC_STATUSES.map((entry) => entry.id));
const VALID_DISPOSITION_IDS = new Set(NPC_DISPOSITIONS.map((entry) => entry.id));
const VALID_STAT_IDS = new Set(NPC_STAT_KEYS.map((entry) => entry.id));
export const NPC_CRAFTER_LEVELS = [
  { id: "",            label: "Not a crafter" },
  { id: "advanced",    label: "Advanced Crafter" },
  { id: "experienced", label: "Experienced Crafter" },
  { id: "master",      label: "Master Crafter" }
];
const VALID_CRAFTER_LEVEL_IDS = new Set(NPC_CRAFTER_LEVELS.map((entry) => entry.id));

const EDITABLE_TEXT_FIELDS = new Set(["name", "kind", "lore", "origin", "imagePath"]);
const EDITABLE_CHOICE_FIELDS = {
  role: VALID_ROLE_IDS,
  status: VALID_STATUS_IDS,
  disposition: VALID_DISPOSITION_IDS,
  crafterLevel: VALID_CRAFTER_LEVEL_IDS
};

function normalizeStats(rawStats) {
  const stats = createDefaultNpcStats();
  if (rawStats && typeof rawStats === "object") {
    for (const key of VALID_STAT_IDS) {
      const raw = Number(rawStats[key]);
      if (Number.isFinite(raw)) {
        stats[key] = Math.max(0, Math.round(raw));
      }
    }
  }
  return stats;
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
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("npc-ability"),
    name: name || "Unnamed Ability",
    description
  };
}

function normalizeNpc(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const roleId = VALID_ROLE_IDS.has(raw.role) ? raw.role : "civilian";
  const statusId = VALID_STATUS_IDS.has(raw.status) ? raw.status : "active";
  const dispositionId = VALID_DISPOSITION_IDS.has(raw.disposition) ? raw.disposition : "cautious";
  const crafterLevelId = VALID_CRAFTER_LEVEL_IDS.has(raw.crafterLevel) ? raw.crafterLevel : "";
  const imagePath = typeof raw.imagePath === "string" ? raw.imagePath.trim().slice(0, 1024) : "";
  const imageData = typeof raw.imageData === "string" && raw.imageData.startsWith("data:image/") ? raw.imageData : "";

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("npc"),
    name: String(raw.name ?? "").trim().slice(0, 80) || "Unnamed NPC",
    kind: String(raw.kind ?? "").trim().slice(0, 80),
    role: roleId,
    status: statusId,
    disposition: dispositionId,
    crafterLevel: crafterLevelId,
    origin: String(raw.origin ?? "").trim().slice(0, 200),
    lore: String(raw.lore ?? "").trim().slice(0, 1200),
    imagePath,
    imageData,
    stats: normalizeStats(raw.stats),
    abilities: Array.isArray(raw.abilities)
      ? raw.abilities.map(normalizeAbility).filter(Boolean)
      : [],
    metDayOffset: Number.isFinite(Number(raw.metDayOffset)) ? Number(raw.metDayOffset) : null,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
  };
}

export function normalizeNpcs(rawCollection) {
  if (!Array.isArray(rawCollection)) {
    return [];
  }
  return rawCollection.map(normalizeNpc).filter(Boolean);
}

/**
 * Returns how many crafters of each level are available — i.e. NPCs whose
 * crafterLevel matches and whose status is "active" (or otherwise present).
 */
export function getCrafterCapacity(state) {
  const counts = { advanced: 0, experienced: 0, master: 0 };
  const npcs = Array.isArray(state?.npcs) ? state.npcs : [];
  for (const npc of npcs) {
    const lvl = npc?.crafterLevel;
    if (lvl && counts[lvl] !== undefined && npc.status !== "deceased") {
      counts[lvl]++;
    }
  }
  return counts;
}

export function createBlankNpc(state) {
  return {
    id: createId("npc"),
    name: "New NPC",
    kind: "",
    role: "civilian",
    status: "active",
    disposition: "cautious",
    crafterLevel: "",
    origin: "",
    lore: "",
    imagePath: "",
    imageData: "",
    stats: createDefaultNpcStats(),
    abilities: [],
    metDayOffset: Number(state?.calendar?.dayOffset ?? 0) || 0,
    createdAt: Date.now()
  };
}

export function addNpc(state, overrides = {}) {
  if (!Array.isArray(state.npcs)) {
    state.npcs = [];
  }
  const npc = normalizeNpc({
    ...createBlankNpc(state),
    ...overrides
  });
  if (!npc) {
    return null;
  }
  state.npcs.push(npc);
  return npc;
}

function findNpc(state, npcId) {
  if (!Array.isArray(state.npcs)) {
    return null;
  }
  return state.npcs.find((entry) => entry.id === npcId) ?? null;
}

export function removeNpc(state, npcId) {
  if (!Array.isArray(state.npcs)) {
    return false;
  }
  const startLength = state.npcs.length;
  state.npcs = state.npcs.filter((entry) => entry.id !== npcId);
  return state.npcs.length !== startLength;
}

export function updateNpcField(state, npcId, field, value) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }

  if (EDITABLE_TEXT_FIELDS.has(field)) {
    const limit = field === "lore" ? 1200 : field === "origin" ? 200 : field === "imagePath" ? 1024 : 80;
    npc[field] = String(value ?? "").slice(0, limit);
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(EDITABLE_CHOICE_FIELDS, field)) {
    const allowed = EDITABLE_CHOICE_FIELDS[field];
    if (allowed.has(value)) {
      npc[field] = value;
      return true;
    }
    return false;
  }

  if (field === "metDayOffset") {
    const numeric = Number(value);
    npc.metDayOffset = Number.isFinite(numeric) ? numeric : null;
    return true;
  }

  return false;
}

export function updateNpcStat(state, npcId, statId, value) {
  if (!VALID_STAT_IDS.has(statId)) {
    return false;
  }
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }
  const numeric = Number(value);
  npc.stats[statId] = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  return true;
}

export function setNpcImageData(state, npcId, dataUrl) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
    npc.imageData = dataUrl;
    return true;
  }
  return false;
}

export function clearNpcImage(state, npcId) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }
  npc.imageData = "";
  npc.imagePath = "";
  return true;
}

export function addNpcAbility(state, npcId) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return null;
  }
  const ability = {
    id: createId("npc-ability"),
    name: "New Ability",
    description: ""
  };
  npc.abilities.push(ability);
  return ability;
}

export function updateNpcAbility(state, npcId, abilityId, field, value) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }
  const ability = npc.abilities.find((entry) => entry.id === abilityId);
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

export function removeNpcAbility(state, npcId, abilityId) {
  const npc = findNpc(state, npcId);
  if (!npc) {
    return false;
  }
  const startLength = npc.abilities.length;
  npc.abilities = npc.abilities.filter((entry) => entry.id !== abilityId);
  return npc.abilities.length !== startLength;
}
