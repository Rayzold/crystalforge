import { createId, formatNumber } from "../engine/Utils.js";
import { formatDate } from "./CalendarSystem.js";
import { getExpeditionRelicOverview } from "./ExpeditionSystem.js";
import { getEmergencyStatus } from "./ResourceSystem.js";
import { getTownFocusAvailability } from "./TownFocusSystem.js";

const URGENCY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};
const MAX_DECISION_HISTORY = 10;

function getProblemHref(problemKey) {
  return `./city.html?problem=${encodeURIComponent(problemKey)}`;
}

function getDecisionSnoozeMap(settings) {
  if (!settings?.decisionSnoozes || typeof settings.decisionSnoozes !== "object") {
    return {};
  }
  return settings.decisionSnoozes;
}

function applySnoozeMeta(state, item) {
  const currentDay = Number(state.calendar?.dayOffset ?? 0) || 0;
  const snoozedUntilDayOffset = Number(getDecisionSnoozeMap(state.settings)[item.id] ?? 0) || 0;
  const snoozed = item.snoozeable !== false && snoozedUntilDayOffset > currentDay;
  return {
    ...item,
    snoozed,
    snoozedUntilDayOffset: snoozed ? snoozedUntilDayOffset : null,
    snoozeRemainingDays: snoozed ? Math.max(1, snoozedUntilDayOffset - currentDay) : 0
  };
}

function sortDecisionItems(left, right) {
  const snoozeDelta = Number(left.snoozed) - Number(right.snoozed);
  if (snoozeDelta !== 0) {
    return snoozeDelta;
  }

  const urgencyDelta = (URGENCY_ORDER[left.urgency] ?? 99) - (URGENCY_ORDER[right.urgency] ?? 99);
  if (urgencyDelta !== 0) {
    return urgencyDelta;
  }

  const blockingDelta = Number(right.blocking === true) - Number(left.blocking === true);
  if (blockingDelta !== 0) {
    return blockingDelta;
  }

  const orderDelta = Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0);
  if (orderDelta !== 0) {
    return orderDelta;
  }

  return String(left.title ?? "").localeCompare(String(right.title ?? ""));
}

function createJourneyDecision(state, pageKey) {
  const pendingJourneys = state.expeditions?.pending?.length ?? 0;
  if (pendingJourneys <= 0) {
    return null;
  }

  return {
    id: "journeys",
    urgency: "critical",
    blocking: true,
    snoozeable: false,
    iconKey: "route",
    title: pendingJourneys === 1 ? "Expedition debrief ready" : `${formatNumber(pendingJourneys, 0)} expedition debriefs ready`,
    detail:
      pendingJourneys === 1
        ? "A returned crew is waiting on your route choices before rewards can settle."
        : `${formatNumber(pendingJourneys, 0)} returned crews are waiting on your route choices before rewards can settle.`,
    cta: pendingJourneys === 1 ? "Resolve Journey" : "Resolve Journeys",
    action: pageKey === "expeditions" ? "open-expedition-journey" : null,
    href: pageKey === "expeditions" ? null : "./expeditions.html",
    sortOrder: 0
  };
}

function createCouncilDecision(state) {
  const availability = getTownFocusAvailability(state);
  if (!availability.isSelectionPending) {
    return null;
  }

  return {
    id: "council",
    urgency: "high",
    blocking: false,
    snoozeable: true,
    snoozeDays: 2,
    iconKey: "calendar",
    title: "Town focus due",
    detail: "The council chamber is ready for a new focus before the next stretch of planning.",
    cta: "Open Council",
    action: "open-town-focus-modal",
    href: null,
    sortOrder: 5
  };
}

function createEmergencyDecisions(state, pageKey) {
  const emergencies = getEmergencyStatus(state);
  return emergencies.slice(0, 3).map((emergency, index) => ({
    id: `problem:${emergency.key}`,
    urgency: emergency.severity === "critical" ? "critical" : "high",
    blocking: false,
    snoozeable: true,
    snoozeDays: 3,
    iconKey:
      emergency.key === "housing"
        ? "building"
        : emergency.key === "workforce"
          ? "citizens"
          : emergency.key,
    title: emergency.label,
    detail: emergency.cause ?? emergency.details ?? "This pressure point needs attention.",
    cta: emergency.severity === "critical" ? "Fix Now" : "Review Problem",
    action: pageKey === "city" ? "go-to-problem" : null,
    actionData: { problem: emergency.key },
    href: pageKey === "city" ? null : getProblemHref(emergency.key),
    problemKey: emergency.key,
    sortOrder: 10 + index
  }));
}

function createLegendDecision(state) {
  const unassignedLegends = (state.uniqueCitizens ?? []).filter(
    (citizen) => citizen?.status === "inCity" && !citizen?.assignmentPostId
  ).length;
  if (unassignedLegends <= 0) {
    return null;
  }

  return {
    id: "unassigned-legends",
    urgency: "medium",
    blocking: false,
    snoozeable: true,
    snoozeDays: 4,
    iconKey: "citizens",
    title: unassignedLegends === 1 ? "Legend assignment open" : `${formatNumber(unassignedLegends, 0)} legend assignments open`,
    detail:
      unassignedLegends === 1
        ? "One legend is still at large, so their post bonus is not active yet."
        : `${formatNumber(unassignedLegends, 0)} legends are still at large, so their post bonuses are not active yet.`,
    cta: "Assign Legends",
    href: "./uniques.html",
    sortOrder: 30
  };
}

function createRelicDecision(state) {
  const relicOverview = getExpeditionRelicOverview(state);
  if ((relicOverview.storedRelics ?? 0) <= 0 || (relicOverview.emptySlots ?? 0) <= 0) {
    return null;
  }

  return {
    id: "relic-slots",
    urgency: "medium",
    blocking: false,
    snoozeable: true,
    snoozeDays: 4,
    iconKey: "relic",
    title: relicOverview.emptySlots === 1 ? "Empty relic slot" : `${formatNumber(relicOverview.emptySlots, 0)} empty relic slots`,
    detail:
      relicOverview.storedRelics === 1
        ? "A recovered relic is sitting in storage instead of boosting the city."
        : `${formatNumber(relicOverview.storedRelics, 0)} recovered relics are sitting in storage instead of boosting the city.`,
    cta: "Slot Relics",
    href: "./expeditions.html",
    sortOrder: 35
  };
}

export function getDecisionInboxItems(state, pageKey = "home", { includeSnoozed = true } = {}) {
  const items = [
    createJourneyDecision(state, pageKey),
    createCouncilDecision(state),
    createLegendDecision(state),
    createRelicDecision(state),
    ...createEmergencyDecisions(state, pageKey)
  ]
    .filter(Boolean)
    .map((item) => applySnoozeMeta(state, item))
    .sort(sortDecisionItems);

  return includeSnoozed ? items : items.filter((item) => !item.snoozed);
}

export function getTopDecisionInboxItem(state, pageKey = "home") {
  return getDecisionInboxItems(state, pageKey, { includeSnoozed: false })[0] ?? null;
}

export function setDecisionSnooze(state, decisionId, days = 3) {
  const normalizedId = String(decisionId ?? "").trim();
  if (!normalizedId) {
    return null;
  }

  const currentDay = Number(state.calendar?.dayOffset ?? 0) || 0;
  const snoozeDays = Math.max(1, Math.round(Number(days) || 3));
  state.settings.decisionSnoozes = {
    ...(state.settings?.decisionSnoozes ?? {}),
    [normalizedId]: currentDay + snoozeDays
  };
  return state.settings.decisionSnoozes[normalizedId];
}

export function clearDecisionSnooze(state, decisionId) {
  const normalizedId = String(decisionId ?? "").trim();
  if (!normalizedId) {
    return;
  }

  const nextSnoozes = { ...(state.settings?.decisionSnoozes ?? {}) };
  delete nextSnoozes[normalizedId];
  state.settings.decisionSnoozes = nextSnoozes;
}

export function getDecisionHistory(state, limit = 4) {
  const history = Array.isArray(state.settings?.decisionHistory) ? state.settings.decisionHistory : [];
  return history.slice(0, Math.max(0, Number(limit) || 0));
}

export function recordDecisionHistory(state, entry = {}) {
  if (!state?.settings) {
    return null;
  }

  const title = String(entry.title ?? "").trim();
  const outcome = String(entry.outcome ?? "").trim();
  if (!title && !outcome) {
    return null;
  }

  const record = {
    id: String(entry.id ?? createId("decision-history")).trim() || createId("decision-history"),
    kind: String(entry.kind ?? "resolved").trim() || "resolved",
    title,
    detail: String(entry.detail ?? "").trim(),
    outcome,
    date: String(entry.date ?? formatDate(Number(state.calendar?.dayOffset ?? 0) || 0)).trim() || formatDate(Number(state.calendar?.dayOffset ?? 0) || 0),
    dayOffset: Number(entry.dayOffset ?? state.calendar?.dayOffset ?? 0) || 0,
    iconKey: String(entry.iconKey ?? "route").trim() || "route"
  };

  state.settings.decisionHistory = [record, ...(state.settings?.decisionHistory ?? [])].slice(0, MAX_DECISION_HISTORY);
  return record;
}
