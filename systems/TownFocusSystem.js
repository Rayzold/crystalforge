import { TOWN_FOCUS_DEFINITIONS, TOWN_FOCUS_INTERVAL_DAYS } from "../content/TownFocusConfig.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { addShards } from "./ShardSystem.js";
import { getActiveConstructionQueue, getAvailableConstructionQueue, getDriftConstructionSlots } from "./ConstructionSystem.js";

function uniqueFocuses(items) {
  return [...new Set(items.filter(Boolean))];
}

export function createDefaultTownFocusState() {
  return {
    currentFocusId: null,
    selectedAtDayOffset: null,
    nextSelectionDayOffset: 0,
    isSelectionPending: true,
    intervalDays: TOWN_FOCUS_INTERVAL_DAYS
  };
}

export function normalizeTownFocusState(sourceTownFocus) {
  const base = createDefaultTownFocusState();
  if (!sourceTownFocus || typeof sourceTownFocus !== "object") {
    return base;
  }
  return {
    currentFocusId:
      typeof sourceTownFocus.currentFocusId === "string" && TOWN_FOCUS_DEFINITIONS[sourceTownFocus.currentFocusId]
        ? sourceTownFocus.currentFocusId
        : null,
    selectedAtDayOffset:
      typeof sourceTownFocus.selectedAtDayOffset === "number" ? sourceTownFocus.selectedAtDayOffset : null,
    nextSelectionDayOffset:
      typeof sourceTownFocus.nextSelectionDayOffset === "number" ? sourceTownFocus.nextSelectionDayOffset : 0,
    isSelectionPending:
      typeof sourceTownFocus.isSelectionPending === "boolean"
        ? sourceTownFocus.isSelectionPending
        : (typeof sourceTownFocus.nextSelectionDayOffset === "number" ? sourceTownFocus.nextSelectionDayOffset <= 0 : true),
    intervalDays:
      typeof sourceTownFocus.intervalDays === "number" ? sourceTownFocus.intervalDays : TOWN_FOCUS_INTERVAL_DAYS
  };
}

export function getCurrentTownFocus(state) {
  return state.townFocus.currentFocusId ? TOWN_FOCUS_DEFINITIONS[state.townFocus.currentFocusId] ?? null : null;
}

export function getTownFocusAvailability(state) {
  const daysUntilCouncil = Math.max(0, state.townFocus.nextSelectionDayOffset - state.calendar.dayOffset);
  return {
    isSelectionPending: state.townFocus.isSelectionPending,
    daysUntilCouncil,
    nextSelectionDayOffset: state.townFocus.nextSelectionDayOffset
  };
}

export function getMayorSuggestions(state) {
  const suggestions = [];
  const activeEventTypes = new Set(state.events.active.map((event) => event.type));
  const totalShards = Object.values(state.shards).reduce((sum, value) => sum + value, 0);

  if (state.resources.food <= 30) {
    suggestions.push({
      focusId: "food-production",
      reason: "Granaries are thinning and the mayor wants kitchens and fields prioritized."
    });
  }

  if ((state.cityStats.morale ?? 0) <= 20) {
    suggestions.push({
      focusId: "civic-restoration",
      reason: "Morale is slipping and the mayor wants the city steadied before unrest grows."
    });
  }

  if (
    activeEventTypes.has("military") ||
    activeEventTypes.has("world") ||
    (state.cityStats.defense ?? 0) <= 35 ||
    (state.cityStats.security ?? 0) <= 25
  ) {
    suggestions.push({
      focusId: "defense-readiness",
      reason: "Threats are pressing in and the council wants stronger walls, drills, and watches."
    });
  }

  if (state.resources.gold <= 35) {
    suggestions.push({
      focusId: "trade-drive",
      reason: "The treasury is under strain, so the mayor wants merchants and routes pushed harder."
    });
  }

  if (
    totalShards <= 70 ||
    Object.values(state.crystals).reduce((sum, value) => sum + value, 0) <= 6
  ) {
    suggestions.push({
      focusId: "crystal-expedition",
      reason: "The forge will need more crystal stock soon, and scouts are asking to range outward."
    });
  }

  const fallbackOrder = ["food-production", "defense-readiness", "crystal-expedition", "trade-drive", "civic-restoration"];
  const orderedFocusIds = uniqueFocuses([
    ...suggestions.map((entry) => entry.focusId),
    ...fallbackOrder
  ]).slice(0, 3);

  return orderedFocusIds.map((focusId) => {
    const existing = suggestions.find((entry) => entry.focusId === focusId);
    return (
      existing ?? {
        focusId,
        reason: TOWN_FOCUS_DEFINITIONS[focusId].mayorLine
      }
    );
  });
}

export function getMayorAdvice(state) {
  const advice = [];
  const completedBuildings = state.buildings.filter((building) => building.isComplete && !building.isRuined);
  const placedBuildings = completedBuildings.filter((building) => building.mapPosition);
  const activeConstruction = getActiveConstructionQueue(state);
  const availableConstruction = getAvailableConstructionQueue(state);
  const constructionSlots = getDriftConstructionSlots(state);
  const supportShortfall = Math.max(0, (state.resources.population ?? 0) - (state.cityStats.populationSupport ?? 0));
  const runway = state.emergencyState?.runway ?? {};

  const hasTag = (tag) => completedBuildings.some((building) => (building.tags ?? []).includes(tag));
  const hasDistrict = (districtName) => completedBuildings.some((building) => building.district === districtName);

  if ((runway.foodDays ?? null) !== null && runway.foodDays <= 7) {
    advice.push({
      id: "food-runway",
      title: "Secure provisions",
      detail: `Only ${runway.foodDays.toFixed(1)} days of food remain at the current pace. The mayor wants fields, fisheries, and ovens reinforced immediately.`,
      href: "./city.html",
      cta: "Review City"
    });
  } else if (!hasTag("agriculture")) {
    advice.push({
      id: "missing-agriculture",
      title: "Establish food infrastructure",
      detail: "The city still lacks an active agricultural backbone. The mayor wants a farm, fishery, grove, or granary brought online.",
      href: "./forge.html",
      cta: "Open Forge"
    });
  }

  if (supportShortfall > 0) {
    advice.push({
      id: "housing-strain",
      title: "Relieve housing strain",
      detail: `${supportShortfall} citizens are beyond current support capacity. The mayor wants housing and civic comforts expanded before unrest spreads.`,
      href: "./city.html",
      cta: "Open City"
    });
  } else if (!hasTag("housing")) {
    advice.push({
      id: "missing-housing",
      title: "Anchor the settlement",
      detail: "No active housing foundation is in place yet. The mayor wants at least one residence, well, or public shelter made dependable.",
      href: "./forge.html",
      cta: "Manifest Housing"
    });
  }

  if (availableConstruction.length > 0 && activeConstruction.length < constructionSlots) {
    advice.push({
      id: "idle-incubator",
      title: "Fill idle incubators",
      detail: `${constructionSlots - activeConstruction.length} incubator slot(s) are idle while ${availableConstruction.length} buildings wait for work. The mayor wants the queue tightened.`,
      href: "./city.html",
      cta: "Manage Incubators"
    });
  }

  if (completedBuildings.length > 0 && placedBuildings.length < completedBuildings.length) {
    advice.push({
      id: "unplaced-buildings",
      title: "Place dormant structures",
      detail: `${completedBuildings.length - placedBuildings.length} active building(s) are still unplaced. The mayor wants them seated on the ring so their bonuses start mattering.`,
      href: "./city.html",
      cta: "Open Map"
    });
  }

  if ((state.cityStats.defense ?? 0) <= 35 || (state.cityStats.security ?? 0) <= 25) {
    advice.push({
      id: "weak-defense",
      title: "Raise the watch",
      detail: "Defense and security are still too soft for the current threats. The mayor wants towers, walls, and drills given more weight.",
      href: "./city.html",
      cta: "Review Defenses"
    });
  } else if (!hasTag("military") && !hasDistrict("Military District")) {
    advice.push({
      id: "missing-military",
      title: "Show a line of force",
      detail: "The city has no active military footprint yet. The mayor wants at least one guard, wall, or barracks structure standing.",
      href: "./forge.html",
      cta: "Manifest Defense"
    });
  }

  if ((runway.goldDays ?? null) !== null && runway.goldDays <= 10) {
    advice.push({
      id: "gold-runway",
      title: "Refill the treasury",
      detail: `Gold runway is down to ${runway.goldDays.toFixed(1)} days. The mayor wants trade buildings, routes, and commerce brought forward.`,
      href: "./city.html",
      cta: "Boost Trade"
    });
  } else if (!hasTag("trade")) {
    advice.push({
      id: "missing-trade",
      title: "Open channels of trade",
      detail: "No active trade presence is shaping the city yet. The mayor wants stalls, stores, or a market square brought into the fold.",
      href: "./forge.html",
      cta: "Manifest Trade"
    });
  }

  const focusAdvice = getMayorSuggestions(state).map((entry) => ({
    id: `focus-${entry.focusId}`,
    title: TOWN_FOCUS_DEFINITIONS[entry.focusId]?.name ?? "Council Priority",
    detail: entry.reason,
    href: "./home.html",
    cta: "Review Focus"
  }));

  const seen = new Set();
  return [...advice, ...focusAdvice].filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  }).slice(0, 4);
}

export function getTownFocusHistory(state, limit = 5) {
  return state.historyLog
    .filter(
      (entry) =>
        entry.category === "Town Focus" &&
        Object.values(TOWN_FOCUS_DEFINITIONS).some((focus) => focus.name === entry.title)
    )
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      focus: Object.values(TOWN_FOCUS_DEFINITIONS).find((focus) => focus.name === entry.title) ?? null
    }));
}

export function getSuggestedFocusForAlert(state, alertKey) {
  const mapping = {
    food: "food-production",
    gold: "trade-drive",
    mana: "crystal-expedition",
    morale: "civic-restoration",
    housing: "civic-restoration"
  };
  const focusId = mapping[alertKey];
  return focusId ? TOWN_FOCUS_DEFINITIONS[focusId] ?? null : null;
}

export function getSuggestedFocusForEvent(state, event) {
  const typeMap = {
    economic: "trade-drive",
    magical: "crystal-expedition",
    social: "civic-restoration",
    military: "defense-readiness",
    world: "defense-readiness"
  };

  const suggestionFromType = typeMap[event?.type];
  const mayorSuggestion = getMayorSuggestions(state).find((entry) => entry.focusId === suggestionFromType);
  const focusId = mayorSuggestion?.focusId ?? suggestionFromType;
  return focusId ? TOWN_FOCUS_DEFINITIONS[focusId] ?? null : null;
}

export function updateTownFocusAvailability(state) {
  if (!state.townFocus.isSelectionPending && state.calendar.dayOffset >= state.townFocus.nextSelectionDayOffset) {
    state.townFocus.isSelectionPending = true;
    addHistoryEntry(state, {
      category: "Town Focus",
      title: "Council reconvened",
      details: "The mayor is calling for a new town focus."
    });
    return true;
  }
  return false;
}

export function selectTownFocus(state, focusId, source = "Council") {
  const focus = TOWN_FOCUS_DEFINITIONS[focusId];
  if (!focus) {
    return { ok: false, reason: "Unknown town focus." };
  }

  state.townFocus.currentFocusId = focusId;
  state.townFocus.selectedAtDayOffset = state.calendar.dayOffset;
  state.townFocus.nextSelectionDayOffset = state.calendar.dayOffset + state.townFocus.intervalDays;
  state.townFocus.isSelectionPending = false;

  addHistoryEntry(state, {
    category: "Town Focus",
    title: focus.name,
    details: `${source} selected the ${focus.name} focus. ${focus.mayorLine}`
  });

  return { ok: true, focus };
}

export function forceTownFocus(state, focusId, source = "Admin") {
  return selectTownFocus(state, focusId, source);
}

export function reopenTownFocusSelection(state, source = "Admin") {
  state.townFocus.isSelectionPending = true;
  state.townFocus.nextSelectionDayOffset = state.calendar.dayOffset;
  addHistoryEntry(state, {
    category: "Town Focus",
    title: "Council reopened",
    details: `${source} reopened the town focus council immediately.`
  });
}

export function applyTownFocusDailyEffects(state) {
  const focus = getCurrentTownFocus(state);
  if (!focus) {
    return null;
  }

  if (focus.shardDaily) {
    for (const [rarity, amount] of Object.entries(focus.shardDaily)) {
      addShards(state, rarity, amount);
    }
  }

  return focus;
}
