// Random event orchestration.
// This system evaluates city pressure, holiday timing, and event weights to
// trigger appropriate incidents while keeping a bounded recent-event history.
import { EVENT_POOLS } from "../content/EventPools.js";
import { EVENT_STEP_CHANCES, MAX_RECENT_EVENTS } from "../content/Config.js";
import { pickRandom, randomInt } from "../engine/Random.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { formatDate, getHolidayName } from "./CalendarSystem.js";
import { getDistrictSummary } from "./DistrictSystem.js";
import { getWarningFlags } from "./ResourceSystem.js";
import { getEventRollModifier, getEventTypeWeight } from "./CityConditionSystem.js";

function hasActiveBuilding(state, names) {
  return state.buildings.some((building) => building.isComplete && names.includes(building.name));
}

function hasDistrictLevel(state, requirement) {
  return getDistrictSummary(state).some(
    (district) => district.name === requirement.district && district.level >= requirement.level
  );
}

function meetsRequirements(state, eventDefinition, dayOffset = state.calendar.dayOffset) {
  const requirements = eventDefinition.requirements;
  if (!requirements) {
    return true;
  }
  if (requirements.buildingsAny && !hasActiveBuilding(state, requirements.buildingsAny)) {
    return false;
  }
  if (requirements.resourcesBelow) {
    for (const [resource, amount] of Object.entries(requirements.resourcesBelow)) {
      if ((state.resources[resource] ?? 0) >= amount) {
        return false;
      }
    }
  }
  if (requirements.districtLevel && !hasDistrictLevel(state, requirements.districtLevel)) {
    return false;
  }
  if (requirements.holidaysAny) {
    const holiday = getHolidayName(dayOffset);
    if (!holiday || !requirements.holidaysAny.includes(holiday)) {
      return false;
    }
  }
  return true;
}

function isDuplicateActive(state, eventId) {
  return state.events.active.some((event) => event.id === eventId);
}

function getEventDefinition(eventId) {
  return EVENT_POOLS.find((eventDefinition) => eventDefinition.id === eventId) ?? null;
}

function pickWeightedEvent(candidates, state) {
  if (!candidates.length) {
    return null;
  }

  const weighted = candidates.map((candidate) => ({
    candidate,
    weight: getEventTypeWeight(state, candidate)
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return pickRandom(candidates);
  }

  let roll = Math.random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.candidate;
    }
  }

  return weighted[weighted.length - 1].candidate;
}

function scheduleFollowUps(state, eventDefinition, event) {
  for (const followUp of eventDefinition.followUps ?? []) {
    state.events.scheduled.push({
      id: `${event.id}:${followUp.eventId}:${event.startedDayOffset}`,
      sourceEventId: event.id,
      sourceEventName: event.name,
      eventId: followUp.eventId,
      triggerDayOffset: state.calendar.dayOffset + (followUp.delayDays ?? 1),
      chance: typeof followUp.chance === "number" ? followUp.chance : 1
    });
  }
}

export function triggerEvent(state, eventDefinition, source = eventDefinition.triggerSource, metadata = {}) {
  if (isDuplicateActive(state, eventDefinition.id)) {
    return null;
  }

  const startedAt = formatDate(state.calendar.dayOffset);
  const event = {
    id: eventDefinition.id,
    name: eventDefinition.name,
    type: eventDefinition.type,
    rarity: eventDefinition.rarity,
    description: eventDefinition.description,
    triggerSource: source,
    durationDays: eventDefinition.durationDays,
    effects: structuredClone(eventDefinition.effects),
    startedAt,
    startedDayOffset: state.calendar.dayOffset,
    endsAt: formatDate(state.calendar.dayOffset + eventDefinition.durationDays),
    endsDayOffset: state.calendar.dayOffset + eventDefinition.durationDays,
    isActive: true,
    sourceEventId: metadata.sourceEventId ?? null,
    sourceEventName: metadata.sourceEventName ?? null
  };

  state.events.active.unshift(event);
  state.events.recent.unshift(event);
  state.events.recent = state.events.recent.slice(0, MAX_RECENT_EVENTS);
  scheduleFollowUps(state, eventDefinition, event);

  addHistoryEntry(state, {
    category: "Event",
    title: event.name,
    details: `${event.description} (${event.triggerSource})${event.sourceEventName ? ` Followed ${event.sourceEventName}.` : ""}`
  });

  return event;
}

export function expireEvents(state) {
  const expired = [];
  state.events.active = state.events.active.filter((event) => {
    const stillActive = event.endsDayOffset > state.calendar.dayOffset;
    if (!stillActive) {
      expired.push(event);
    }
    return stillActive;
  });
  return expired;
}

export function maybeTriggerHolidayEvents(state) {
  const holidayName = getHolidayName(state.calendar.dayOffset);
  if (!holidayName) {
    return [];
  }

  return EVENT_POOLS.filter((eventDefinition) => meetsRequirements(state, eventDefinition)).reduce(
    (events, definition) => {
      if (definition.requirements?.holidaysAny?.includes(holidayName) || definition.name === "Festival") {
        const event = triggerEvent(state, definition, "holiday");
        if (event) {
          events.push(event);
        }
      }
      return events;
    },
    []
  );
}

export function processScheduledEvents(state) {
  const triggered = [];
  const pending = [];

  for (const scheduled of state.events.scheduled) {
    if (scheduled.triggerDayOffset > state.calendar.dayOffset) {
      pending.push(scheduled);
      continue;
    }

    const eventDefinition = getEventDefinition(scheduled.eventId);
    if (!eventDefinition) {
      continue;
    }

    if (Math.random() <= scheduled.chance && meetsRequirements(state, eventDefinition)) {
      const event = triggerEvent(state, eventDefinition, "event chain", {
        sourceEventId: scheduled.sourceEventId,
        sourceEventName: scheduled.sourceEventName
      });
      if (event) {
        triggered.push(event);
      }
    }
  }

  state.events.scheduled = pending;
  return triggered;
}

export function maybeTriggerRandomEvents(state, stepKey) {
  const chance = EVENT_STEP_CHANCES[stepKey] ?? EVENT_STEP_CHANCES.day;
  const warningFlags = getWarningFlags(state);
  const attempts = stepKey === "year" ? randomInt(2, 4) : stepKey === "month" ? randomInt(1, 2) : 1;
  const triggered = [];
  const cityEventRollModifier = getEventRollModifier(state);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rollModifier =
      (warningFlags.lowFood ? 0.03 : 0) +
      (warningFlags.lowGold ? 0.03 : 0) +
      (warningFlags.lowMana ? 0.02 : 0) +
      cityEventRollModifier;
    if (Math.random() > chance + rollModifier) {
      continue;
    }
    const candidates = EVENT_POOLS.filter((eventDefinition) => meetsRequirements(state, eventDefinition));
    if (!candidates.length) {
      continue;
    }
    const event = triggerEvent(state, pickWeightedEvent(candidates, state));
    if (event) {
      triggered.push(event);
    }
  }

  return triggered;
}

export function clearActiveEvents(state) {
  state.events.active = [];
  state.events.scheduled = [];
}
