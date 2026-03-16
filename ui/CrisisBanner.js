import { escapeHtml } from "../engine/Utils.js";
import { getEmergencyStatus } from "../systems/ResourceSystem.js";
import { getSuggestedFocusForAlert, getSuggestedFocusForEvent } from "../systems/TownFocusSystem.js";

const RARITY_WEIGHTS = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Legendary: 5,
  Beyond: 6
};

function getNegativeEffectScore(effects) {
  return Object.values(effects ?? {}).reduce((score, value) => {
    if (typeof value !== "number" || value >= 0) {
      return score;
    }
    return score + Math.abs(value) * (Math.abs(value) < 1 ? 24 : 1);
  }, 0);
}

function getCriticalEventAlerts(state) {
  return state.events.active.reduce((alerts, event) => {
    const score = getNegativeEffectScore(event.effects);
    const hasNegativeEffect = score > 0;
    if (!hasNegativeEffect) {
      return alerts;
    }

    const rarityWeight = RARITY_WEIGHTS[event.rarity] ?? 1;
    const isCritical =
      event.type === "military" ||
      event.type === "world" ||
      rarityWeight >= 3 ||
      score >= 8;

    if (!isCritical) {
      return alerts;
    }

    alerts.push({
      kind: "event",
      severity: "critical",
      label: event.name,
      details: `${event.description} Active until ${event.endsAt}.`,
      recommendation: getSuggestedFocusForEvent(state, event)?.name ?? "",
      actionLabel: "Review event",
      href: `./chronicle.html?focusEvent=${encodeURIComponent(event.id)}`
    });
    return alerts;
  }, []);
}

function buildBuildingHref(building) {
  return `./city.html?focusBuilding=${encodeURIComponent(building.id)}&openDossier=1`;
}

function findBestBuildingForAlert(state, alertKey) {
  const completedBuildings = state.buildings.filter((building) => building.isComplete);
  if (!completedBuildings.length) {
    return null;
  }

  const scoreBuilding = (building) => {
    switch (alertKey) {
      case "food":
        return Math.max(0, building.resourceRates.food) * building.multiplier + (building.tags.includes("agriculture") ? 6 : 0);
      case "gold":
        return Math.max(0, building.resourceRates.gold) * building.multiplier + (building.tags.includes("trade") ? 6 : 0);
      case "mana":
        return Math.max(0, building.resourceRates.mana) * building.multiplier + (building.tags.includes("arcane") ? 6 : 0);
      case "morale":
        return (
          Math.max(0, building.stats.morale) * building.multiplier +
          Math.max(0, building.stats.prosperity) * 0.5 * building.multiplier +
          (building.tags.includes("religious") || building.tags.includes("culture") ? 6 : 0)
        );
      case "housing":
        return (
          Math.max(0, building.citizenEffects.populationSupport) * building.multiplier +
          (building.tags.includes("housing") ? 6 : 0)
        );
      default:
        return 0;
    }
  };

  return completedBuildings
    .map((building) => ({ building, score: scoreBuilding(building) }))
    .sort((left, right) => right.score - left.score)[0]?.building ?? null;
}

function enrichEmergencyAlerts(state, emergencies) {
  return emergencies.map((emergency) => {
    const focusBuilding = findBestBuildingForAlert(state, emergency.key);
    const suggestedFocus = getSuggestedFocusForAlert(state, emergency.key);
    return {
      ...emergency,
      kind: "resource",
      recommendation: suggestedFocus?.name ?? "",
      actionLabel: focusBuilding ? `Inspect ${focusBuilding.displayName}` : "Open city command",
      href: focusBuilding ? buildBuildingHref(focusBuilding) : "./city.html"
    };
  });
}

export function renderCrisisBanner(state, pageKey) {
  const criticalEmergencies = enrichEmergencyAlerts(
    state,
    getEmergencyStatus(state).emergencies.filter((emergency) => emergency.severity === "critical")
  );
  const criticalEventAlerts = getCriticalEventAlerts(state);
  const alerts = [...criticalEmergencies, ...criticalEventAlerts];

  if (!alerts.length) {
    return "";
  }

  return `
    <section class="crisis-banner">
      <div class="crisis-banner__header">
        <div>
          <p class="crisis-banner__eyebrow">Critical City Alert</p>
          <strong>${alerts.length} urgent alert${alerts.length === 1 ? "" : "s"} demand attention</strong>
        </div>
        ${pageKey === "city" ? "" : `<a class="button button--ghost" href="./city.html">Open City Command</a>`}
      </div>
      <div class="crisis-banner__stack">
        ${alerts
          .map(
            (alert) => `
              <article class="crisis-banner__card ${alert.kind === "event" ? "is-event" : "is-resource"}">
                <strong>${escapeHtml(alert.label)}</strong>
                <p>${escapeHtml(alert.details)}</p>
                ${alert.recommendation ? `<small>Recommended response: ${escapeHtml(alert.recommendation)}</small>` : ""}
                <a class="button button--ghost" href="${alert.href}">${escapeHtml(alert.actionLabel)}</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
