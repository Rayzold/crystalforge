import { renderUiIcon } from "./UiIcons.js?v=v1.7.20-20260615092907";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260615092907";
import { getStructuredDate } from "../systems/CalendarSystem.js?v=v1.7.20-20260615092907";
import { formatBuildingExactQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js?v=v1.7.20-20260615092907";
import { getOnboardingGoals } from "../systems/GoalSystem.js?v=v1.7.20-20260615092907";
import { getCityTrendSummary } from "../systems/ResourceSystem.js?v=v1.7.20-20260615092907";
import { renderBuildingArt } from "./BuildingArt.js?v=v1.7.20-20260615092907";

function getQualityMultiplierReadout(building) {
  const multiplier = getBuildingMultiplier(building?.quality ?? 0);
  return `${formatBuildingExactQualityDisplay(building)}${multiplier > 1 ? ` / ${multiplier}x` : ""}`;
}

function renderActionEmptyState(title, detail, href, cta) {
  return `
    <div class="empty-state empty-state--action">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      <a class="button button--ghost" href="${href}">${escapeHtml(cta)}</a>
    </div>
  `;
}

function renderCitySnapshotStrip(state) {
  const trends = Object.fromEntries(getCityTrendSummary(state).map((entry) => [entry.key, entry]));
  const resources = [
    ["Gold", state.resources.gold, "gold"],
    ["Food", state.resources.food, "food"],
    ["Materials", state.resources.materials, "materials"],
    ["Salvage", state.resources.salvage ?? 0, "salvage"],
    ["Mana", state.resources.mana, "mana"]
  ];

  return `
    <div class="landing-command-center landing-command-center--strip">
      <div class="landing-command-center__resources">
        ${resources
          .map(
            ([label, value, iconKey]) => `
              <button
                class="landing-command-center__resource-card landing-command-center__resource-card--${(trends[iconKey]?.delta ?? 0) > 0 ? "positive" : (trends[iconKey]?.delta ?? 0) < 0 ? "negative" : "neutral"}"
                type="button"
                data-action="open-resource-breakdown"
                data-resource-key="${iconKey}"
                aria-label="Open ${escapeHtml(label)} daily breakdown"
              >
                <div class="landing-command-center__resource-head">
                  ${renderUiIcon(iconKey, label)}
                  <span>${escapeHtml(label)}</span>
                </div>
                <strong>${formatNumber(value, 0)}</strong>
                <small>${(trends[iconKey]?.delta ?? 0) >= 0 ? "+" : ""}${formatNumber(trends[iconKey]?.delta ?? 0, 2)} / day</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderLandingHero(state) {
  const progress = getOnboardingGoals(state);
  const nextStep = progress.find((step) => !step.complete) ?? progress[progress.length - 1];
  const date = getStructuredDate(state.calendar.dayOffset);

  return `
    <section class="scene-panel scene-panel--landing scene-panel--home-hero scene-panel--home-hero-compact">
      <div class="landing-hero landing-hero--compact">
        <div class="landing-hero__copy">
          <p class="world-summary__eyebrow">${escapeHtml(date.season)} · ${escapeHtml(`${date.weekday}, ${date.month} ${date.day}`)}</p>
          <h2>${escapeHtml(nextStep.title)}</h2>
          <p class="landing-hero__summary">${escapeHtml(nextStep.details)}</p>
          <div class="landing-hero__actions">
            <a class="button landing-hero__primary-action" href="${nextStep.href}">${escapeHtml(nextStep.cta)}</a>
            <a class="button button--ghost landing-hero__secondary-action" href="./help.html">Help</a>
            <a class="button button--ghost landing-hero__secondary-action" href="./player.html">Player Page</a>
          </div>
        </div>
        ${renderCitySnapshotStrip(state)}
      </div>
    </section>
  `;
}

function renderHomeRouteDeck() {
  const routes = [
    { title: "Forge", href: "./forge.html", details: "Manifest new structures." },
    { title: "Economy", href: "./economy.html", details: "City health and trends." },
    { title: "City", href: "./city.html", details: "Placement and admin." },
    { title: "Chronicle", href: "./chronicle.html", details: "Events and calendar." },
    { title: "Help", href: "./help.html", details: "Rules and glossary." },
    { title: "Player Page", href: "./player.html", details: "Shared public screen." }
  ];

  return `
    <section class="scene-panel scene-panel--home-route-deck scene-panel--home-route-deck-compact">
      <div class="panel__header">
        <h3>Choose A Screen</h3>
      </div>
      <div class="home-route-deck home-route-deck--compact">
        ${routes
          .map(
            (route) => `
              <a class="home-route-card home-route-card--compact" href="${route.href}">
                <strong>${escapeHtml(route.title)}</strong>
                <p>${escapeHtml(route.details)}</p>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFeaturedBuildings(state) {
  const pinnedIds = new Set(state.settings?.pinnedBuildingIds ?? []);
  const featured = [...state.buildings]
    .sort((left, right) => {
      const pinDelta = Number(pinnedIds.has(right.id)) - Number(pinnedIds.has(left.id));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return right.quality - left.quality;
    })
    .slice(0, 3);

  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Featured Buildings</h3>
        <span class="panel__subtle">${featured.length} showcased</span>
      </div>
      <div class="featured-building-grid">
        ${
          featured.length
            ? featured
                .map(
                  (building) => `
                    <article class="featured-building">
                      <div class="featured-building__visual">
                        ${
                          renderBuildingArt(
                            building,
                            `${building.displayName} artwork`,
                            `<div class="featured-building__fallback">${escapeHtml(building.displayName.charAt(0))}</div>`
                          )
                        }
                      </div>
                      <div class="featured-building__meta">
                        <h4>${escapeHtml(building.displayName)}</h4>
                        <span>${escapeHtml(`${building.rarity} / ${getQualityMultiplierReadout(building)}`)}</span>
                        <div class="featured-building__actions">
                          <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                          <a class="button button--ghost" href="./city.html">Open City</a>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")
            : renderActionEmptyState(
                "No featured buildings yet",
                "This panel highlights your best structures so you can jump into the ones shaping the city most.",
                "./forge.html",
                "Create First Building"
              )
        }
      </div>
    </section>
  `;
}

function renderRecentSignals(state) {
  const entries = state.historyLog.slice(0, 6);
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Recent Signals</h3>
        <span class="panel__subtle">The latest things the city remembered</span>
      </div>
      <div class="recent-signals">
        ${
          entries.length
            ? entries
                .map(
                  (entry) => `
                    <article class="recent-signal-card">
                      <span>${escapeHtml(entry.category)}</span>
                      <strong>${escapeHtml(entry.title)}</strong>
                      <p>${escapeHtml(entry.date)}</p>
                    </article>
                  `
                )
                .join("")
            : renderActionEmptyState(
                "No chronicle entries yet",
                "Signals become your memory of what has changed in the realm, which makes Chronicle the best place to verify that systems are actually moving.",
                "./chronicle.html",
                "Open Chronicle"
              )
        }
      </div>
      <div class="recent-signals__actions">
        <a class="button button--ghost" href="./chronicle.html">Open Full Chronicle</a>
      </div>
    </section>
  `;
}

export function renderHomePage(state) {
  return {
    title: "Home",
    subtitle: "Pick a screen or jump into the next step.",
    content: `
      ${renderLandingHero(state)}
      ${renderHomeRouteDeck()}
      ${renderFeaturedBuildings(state)}
    `,
    aside: `
      ${renderRecentSignals(state)}
    `
  };
}
