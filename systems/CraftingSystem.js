// Crafting system — item lifecycle and daily upkeep.

import { createId } from "../engine/Utils.js";

const RESOURCE_KEYS = ["gold", "mana", "materials", "salvage", "food"];

function makeCosts(raw = {}) {
  return Object.fromEntries(
    RESOURCE_KEYS.map(k => [k, Math.max(0, Number(raw[k] ?? 0))])
  );
}

export function createCraftingItem({ name, desc = "", startDayOffset, durationDays, costs = {}, queued = false }) {
  return {
    id:             createId("crafting"),
    name:           String(name ?? "Unnamed").trim(),
    desc:           String(desc ?? "").trim(),
    startDayOffset: Math.max(0, Number(startDayOffset ?? 0)),
    durationDays:   Math.max(1, Number(durationDays ?? 1)),
    status:         queued ? "queued" : "active",
    costs:          makeCosts(costs),
  };
}

export function normalizeCraftingItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    id:             String(item.id ?? createId("crafting")),
    name:           String(item.name ?? "Unnamed"),
    desc:           String(item.desc ?? ""),
    startDayOffset: Math.max(0, Number(item.startDayOffset ?? 0)),
    durationDays:   Math.max(1, Number(item.durationDays ?? 1)),
    status:         ["active", "queued", "collected"].includes(item.status) ? item.status : "active",
    costs:          makeCosts(item.costs),
  }));
}

export function craftingCompletionDay(item) {
  return item.startDayOffset + item.durationDays;
}

function isItemActive(item, dayOffset) {
  return item.status === "active" && dayOffset < craftingCompletionDay(item);
}

/** Returns the combined daily upkeep for all items actively being crafted (not yet complete). */
export function getActiveCraftingUpkeep(state) {
  const items   = Array.isArray(state.craftingItems) ? state.craftingItems : [];
  const day     = state.calendar?.dayOffset ?? 0;
  const totals  = Object.fromEntries(RESOURCE_KEYS.map(k => [k, 0]));
  for (const item of items) {
    if (!isItemActive(item, day)) continue;
    for (const k of RESOURCE_KEYS) {
      totals[k] += item.costs[k] ?? 0;
    }
  }
  return totals;
}

/** Collect an item (mark as collected). */
export function collectCraftingItem(state, itemId) {
  const item = (state.craftingItems ?? []).find(x => x.id === itemId);
  if (item) item.status = "collected";
}

/** Delete an item by id. */
export function deleteCraftingItem(state, itemId) {
  state.craftingItems = (state.craftingItems ?? []).filter(x => x.id !== itemId);
}

/** Start a queued item now (sets startDayOffset to current day). */
export function startCraftingItem(state, itemId) {
  const item = (state.craftingItems ?? []).find(x => x.id === itemId && x.status === "queued");
  if (item) {
    item.status         = "active";
    item.startDayOffset = state.calendar?.dayOffset ?? 0;
  }
}

/** Move item to queue (pauses active crafting). */
export function queueCraftingItem(state, itemId) {
  const item = (state.craftingItems ?? []).find(x => x.id === itemId);
  if (item && item.status === "active") item.status = "queued";
}

/** Move a queued item up or down. dir = -1 or 1. */
export function moveCraftingQueueItem(state, itemId, dir) {
  const queued = (state.craftingItems ?? []).filter(x => x.status === "queued");
  const idx    = queued.findIndex(x => x.id === itemId);
  const nIdx   = idx + dir;
  if (idx < 0 || nIdx < 0 || nIdx >= queued.length) return;
  const a = state.craftingItems.findIndex(x => x.id === queued[idx].id);
  const b = state.craftingItems.findIndex(x => x.id === queued[nIdx].id);
  [state.craftingItems[a], state.craftingItems[b]] = [state.craftingItems[b], state.craftingItems[a]];
}

/** Start the first queued item. */
export function startNextQueuedCraftingItem(state) {
  const first = (state.craftingItems ?? []).find(x => x.status === "queued");
  if (first) startCraftingItem(state, first.id);
}

/** Remove all collected items. */
export function clearCollectedCraftingItems(state) {
  state.craftingItems = (state.craftingItems ?? []).filter(x => x.status !== "collected");
}

/** Returns items that became ready on the given dayOffset (for notifications). */
export function getNewlyCompletedCraftingItems(state, dayOffset) {
  return (state.craftingItems ?? []).filter(
    it => it.status === "active" && craftingCompletionDay(it) === dayOffset
  );
}
