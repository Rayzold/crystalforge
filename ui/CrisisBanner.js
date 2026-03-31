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
      cause: `A negative ${event.type ?? "world"} event is actively applying pressure to the city right now.`,
      fixes: [
        "Review the event in Chronicle and check which effects are dragging the city.",
        getSuggestedFocusForEvent(state, event)?.name ? `Consider shifting focus toward ${getSuggestedFocusForEvent(state, event).name}.` : ""
      ].filter(Boolean).slice(0, 2),
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
      case "workforce":
        return (
          Math.max(0, building.citizenEffects.populationSupport) * building.multiplier +
          Math.max(0, building.stats.prosperity) * 0.25 * building.multiplier +
          (building.tags.includes("housing") || building.tags.includes("civic") ? 6 : 0)
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
      actionLabel: focusBuilding ? `Inspect ${focusBuilding.displayName}` : "",
      href: focusBuilding ? buildBuildingHref(focusBuilding) : ""
    };
  });
}

export function renderCrisisBanner(state, pageKey) {
  const alerts = getCriticalAlerts(state);

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
      </div>
      <ul class="crisis-banner__list">
        ${alerts
          .map(
            (alert) => `
              <li class="crisis-banner__item ${alert.kind === "event" ? "is-event" : "is-resource"}">
                <strong>${escapeHtml(alert.label)}</strong>
                <span>${escapeHtml(alert.details)}</span>
                ${alert.cause ? `<small>Cause: ${escapeHtml(alert.cause)}</small>` : ""}
                ${
                  alert.fixes?.length
                    ? `<div class="crisis-banner__fixes">${alert.fixes.map((fix) => `<em>${escapeHtml(fix)}</em>`).join("")}</div>`
                    : ""
                }
                ${alert.recommendation ? `<small>Response: ${escapeHtml(alert.recommendation)}</small>` : ""}
                ${alert.actionLabel && alert.href ? `<a class="crisis-banner__link" href="${alert.href}">${escapeHtml(alert.actionLabel)}</a>` : ""}
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}

export function getCriticalAlerts(state) {
  const criticalEmergencies = enrichEmergencyAlerts(
    state,
    getEmergencyStatus(state).emergencies.filter((emergency) => emergency.severity === "critical")
  );
  const criticalEventAlerts = getCriticalEventAlerts(state);
  return [...criticalEmergencies, ...criticalEventAlerts];
}
