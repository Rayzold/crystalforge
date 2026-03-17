import { formatNumber } from "../engine/Utils.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";
import { getStructuredDate } from "./CalendarSystem.js";
import { getCurrentTownFocus } from "./TownFocusSystem.js";

function getMonthBounds(dayOffset) {
  const date = getStructuredDate(dayOffset);
  const startOffset = dayOffset - (date.day - 1);
  const endOffset = startOffset + 27;
  return { startOffset, endOffset, date };
}

function formatList(items) {
  if (!items.length) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getUniqueTitles(entries, limit = 3) {
  return [...new Set(entries.map((entry) => entry.title))].slice(0, limit);
}

function buildGrowthParagraph(monthDate, manifests, completions, evolutions) {
  const parts = [];

  if (manifests.length) {
    const highlights = formatList(getUniqueTitles(manifests, 3));
    parts.push(
      `${formatNumber(manifests.length, 0)} manifestation${manifests.length === 1 ? "" : "s"} altered the skyline, with ${highlights} drawing the most notice`
    );
  }

  if (completions.length) {
    const highlights = formatList(getUniqueTitles(completions, 2));
    parts.push(
      `${formatNumber(completions.length, 0)} structure${completions.length === 1 ? "" : "s"} reached full awakening, including ${highlights}`
    );
  }

  if (evolutions.length) {
    parts.push(`${formatList(getUniqueTitles(evolutions, 2))} marked a fresh change in the Drift itself`);
  }

  if (!parts.length) {
    return `${monthDate.month} passed in a quieter rhythm, with the Drift holding to its routines and no great leap in the skyline.`;
  }

  return `${monthDate.month} closed with ${parts.join("; ")}.`;
}

function buildWorldParagraph(state, events, citizenChanges) {
  const focus = getCurrentTownFocus(state);
  const population = formatNumber(state.resources.population, 0);
  const support = formatNumber(state.cityStats.populationSupport ?? 0, 0);
  const eventLine = events.length
    ? `The month was further shaped by ${formatList(getUniqueTitles(events, 3))}, which carried the city's mood from one week into the next.`
    : "No single calamity or festival dominated the month, and the city was allowed a steadier cadence than usual.";
  const citizenLine = citizenChanges.length
    ? ` Population rolls shifted ${formatNumber(citizenChanges.length, 0)} time${citizenChanges.length === 1 ? "" : "s"}, reminding the council that Drift is still becoming what its people make of it.`
    : "";
  const focusLine = focus
    ? ` The council's standing focus remained ${focus.name}, while the city ended the month with ${population} citizens supported for roughly ${support}.`
    : ` The city ended the month with ${population} citizens supported for roughly ${support}.`;

  return `${eventLine}${citizenLine}${focusLine}`;
}

export function addMonthlyChronicleIfNeeded(state, previousDayOffset) {
  const { startOffset, endOffset, date } = getMonthBounds(previousDayOffset);
  const title = `Chronicle of ${date.month}, Year ${date.year} AC`;

  if (
    state.historyLog.some(
      (entry) =>
        entry.category === "Monthly Chronicle" &&
        entry.title === title
    )
  ) {
    return null;
  }

  const monthEntries = state.historyLog
    .filter(
      (entry) =>
        entry.dayOffset >= startOffset &&
        entry.dayOffset <= endOffset &&
        entry.category !== "Monthly Chronicle" &&
        entry.category !== "Time"
    )
    .sort((left, right) => left.dayOffset - right.dayOffset);

  const manifests = monthEntries.filter((entry) => entry.category === "Manifest");
  const completions = monthEntries.filter((entry) => entry.category === "Completion");
  const events = monthEntries.filter((entry) => entry.category === "Event");
  const evolutions = monthEntries.filter((entry) => entry.category === "Evolution");
  const citizenChanges = monthEntries.filter((entry) => entry.category === "Citizens");

  const growthParagraph = buildGrowthParagraph(date, manifests, completions, evolutions);
  const worldParagraph = buildWorldParagraph(state, events, citizenChanges);

  addHistoryEntry(state, {
    category: "Monthly Chronicle",
    title,
    dayOffset: previousDayOffset,
    date: `${date.month} End, Year ${date.year} AC`,
    details: `${growthParagraph}\n\n${worldParagraph}`
  });

  return title;
}
