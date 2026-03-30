import { renderUiIcon } from "./UiIcons.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getStructuredDate } from "../systems/CalendarSystem.js";
import { formatBuildingExactQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { getMayorAdvice, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getCityTrendSummary } from "../systems/ResourceSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";

function getHomeProgress(state) {
  const hasBuilding = state.buildings.length > 0;
  const hasPlacedBuilding = state.buildings.some((building) => building.mapPosition);
  const hasCompletedBuilding = state.buildings.some((building) => building.isComplete);
  const hasEventFootprint = state.events.active.length > 0 || state.events.recent.length > 0;

  return [
    {
      title: "Create a building",
      details: "Manifest your first structure from the Forge.",
      complete: hasBuilding,
      href: "./forge.html",
      cta: hasBuilding ? "Open Forge" : "Manifest First Building"
    },
    {
      title: "Place it in the city",
      details: "Claim a district and give the building a home.",
      complete: hasPlacedBuilding,
      href: "./city.html",
      cta: hasPlacedBuilding ? "Open City" : "Place First Building"
    },
    {
      title: "Raise it to life",
      details: "Advance time until at least one building becomes active.",
      complete: hasCompletedBuilding,
      href: "./city.html",
      cta: hasCompletedBuilding ? "Review Incubation" : "Advance Construction"
    },
    {
      title: "Read the realm",
      details: "Check Chronicle once the city starts generating history.",
      complete: hasEventFootprint,
      href: "./chronicle.html",
      cta: hasEventFootprint ? "Open Chronicle" : "Read Chronicle"
    }
  ];
}

function getRealmGoals(state) {
  const activeBuildings = state.buildings.filter((building) => building.isComplete).length;
  const placedBuildings = state.buildings.filter((building) => building.mapPosition).length;
  const recordedSignals = state.historyLog.length;

  return [
    {
      title: "Stabilize the first district",
      details: "Reach 1 active building so the city begins producing real output.",
      progress: activeBuildings,
      target: 1,
      href: "./city.html"
    },
    {
      title: "Claim the outer ring",
      details: "Place 3 buildings to give Drift a usable footprint.",
      progress: placedBuildings,
      target: 3,
      href: "./city.html"
    },
    {
      title: "Build a living record",
      details: "Create 5 chronicle entries so the world starts answering back.",
      progress: recordedSignals,
      target: 5,
      href: "./chronicle.html"
    }
  ].map((goal) => ({
    ...goal,
    complete: goal.progress >= goal.target
  }));
}

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

function renderCommandCenterBubble(state) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const trends = Object.fromEntries(getCityTrendSummary(state).map((entry) => [entry.key, entry]));
  const resources = [
    ["Gold", state.resources.gold, "gold"],
    ["Food", state.resources.food, "food"],
    ["Materials", state.resources.materials, "materials"],
    ["Salvage", state.resources.salvage ?? 0, "salvage"],
    ["Mana", state.resources.mana, "mana"]
  ];

  return `
    <article class="landing-command-center">
      <div class="panel__header">
        <h3>City Snapshot</h3>
        <a class="button button--ghost" href="./help.html">Help</a>
      </div>
      <div class="landing-command-center__facts">
        <article>
          <span>Current Date</span>
          <strong>${escapeHtml(`${date.weekday}, ${date.month} ${date.day}`)}</strong>
        </article>
        <article>
          <span>Population</span>
          <strong>${formatNumber(state.resources.population, 0)}</strong>
        </article>
        <article>
          <span>Buildings</span>
          <strong>${formatNumber(state.buildings.length, 0)}</strong>
        </article>
      </div>
      <div class="landing-command-center__resources">
        ${resources
          .map(
            ([label, value, iconKey]) => `
              <article class="landing-command-center__resource-card landing-command-center__resource-card--${(trends[iconKey]?.delta ?? 0) > 0 ? "positive" : (trends[iconKey]?.delta ?? 0) < 0 ? "negative" : "neutral"}">
                <div class="landing-command-center__resource-head">
                  ${renderUiIcon(iconKey, label)}
                  <span>${escapeHtml(label)}</span>
                </div>
                <strong>${formatNumber(value, 0)}</strong>
                <small>${(trends[iconKey]?.delta ?? 0) >= 0 ? "+" : ""}${formatNumber(trends[iconKey]?.delta ?? 0, 2)} / day</small>
              </article>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderLandingHero(state) {
  const progress = getHomeProgress(state);
  const nextStep = progress.find((step) => !step.complete) ?? progress[progress.length - 1];
  const nextStepIndex = progress.findIndex((step) => !step.complete);
  const date = getStructuredDate(state.calendar.dayOffset);
  const highlightedBuilding =
    [...state.buildings].sort((left, right) => right.quality - left.quality)[0] ?? null;

  return `
    <section class="scene-panel scene-panel--hero scene-panel--landing scene-panel--home-hero">
      <div class="landing-hero">
        <div class="landing-hero__copy">
          <p class="world-summary__eyebrow">${escapeHtml(date.season)}</p>
          <h2>Start With The Next Clear Step.</h2>
          <p class="landing-hero__summary">
            Home is now the quick launcher for Crystal Forge. Use it to pick the next action, then move into Forge, Economy, City, or Chronicle for the real work.
          </p>
          <div class="landing-hero__actions">
            <a class="button landing-hero__primary-action" href="${nextStep.href}" title="${escapeHtml(`Primary next step: ${nextStep.cta}`)}">${escapeHtml(nextStep.cta)}</a>
            <a class="button button--ghost landing-hero__secondary-action" href="./help.html" title="Open Help">Start Here Guide</a>
            <a class="button button--ghost landing-hero__secondary-action" href="./index.html" title="Open the shared player screen">Open Player Page</a>
          </div>
        </div>
        <div class="landing-hero__visual">
          <div class="landing-hero__visual-stage">
            ${
              renderBuildingArt(
                highlightedBuilding?.imagePath,
                `${highlightedBuilding?.displayName ?? nextStep.title} artwork`,
                `<div class="landing-hero__glyph">${escapeHtml(nextStep.title.slice(0, 1))}</div>`
              )
            }
            <div class="landing-hero__badge">
              <span>Step ${formatNumber(nextStepIndex === -1 ? progress.length : nextStepIndex + 1, 0)} / ${formatNumber(progress.length, 0)}</span>
              <strong>${escapeHtml(nextStep.title)}</strong>
              <p>${escapeHtml(nextStep.details)}</p>
              <a class="button landing-hero__badge-action" href="${nextStep.href}">${escapeHtml(nextStep.cta)}</a>
            </div>
          </div>
          ${renderCommandCenterBubble(state)}
        </div>
      </div>
    </section>
  `;
}

function renderHomeRouteDeck() {
  const groups = [
    {
      label: "Do Next",
      routes: [
        { eyebrow: "Create Buildings", title: "Forge", href: "./forge.html", details: "Manifest new structures and inspect results." },
        { eyebrow: "Read The Economy", title: "Economy", href: "./economy.html", details: "Check city health, workforce, and long-term direction." },
        { eyebrow: "Build And Place", title: "City", href: "./city.html", details: "Manage incubation, placement, and administration." }
      ]
    },
    {
      label: "Reference",
      routes: [
        { eyebrow: "Read The Story", title: "Chronicle", href: "./chronicle.html", details: "Open events, history, and the calendar." },
        { eyebrow: "Learn The Rules", title: "Help", href: "./help.html", details: "Use Start Here, the core loop, and the glossary." },
        { eyebrow: "Share The Table", title: "Player Page", href: "./index.html", details: "Show the simplified public screen." }
      ]
    }
  ];

  return `
    <section class="scene-panel scene-panel--home-route-deck">
      <div class="panel__header">
        <h3>Choose A Screen</h3>
        <span class="panel__subtle">One job per page</span>
      </div>
      ${groups
        .map(
          (group) => `
            <div class="home-route-group">
              <span class="home-route-group__label">${escapeHtml(group.label)}</span>
              <div class="home-route-deck">
                ${group.routes
                  .map(
                    (route) => `
                      <a class="home-route-card" href="${route.href}">
                        <span>${escapeHtml(route.eyebrow)}</span>
                        <strong>${escapeHtml(route.title)}</strong>
                        <p>${escapeHtml(route.details)}</p>
                      </a>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderOnboardingPanel(state) {
  if (state.settings.onboardingDismissed) {
    return `
      <section class="scene-panel scene-panel--compact">
        <div class="panel__header">
          <div>
            <h3>First Session</h3>
            <span class="panel__subtle">Bring back the step-by-step guide whenever you want it.</span>
          </div>
          <button class="button button--ghost" data-action="show-onboarding">Show Guide</button>
        </div>
      </section>
    `;
  }

  const progress = getHomeProgress(state);
  const completedCount = progress.filter((step) => step.complete).length;

  return `
    <section class="scene-panel">
      <div class="panel__header">
        <div>
          <h3>First Session</h3>
          <span class="panel__subtle">${completedCount} / ${progress.length} steps complete</span>
        </div>
        <button class="button button--ghost" data-action="dismiss-onboarding">Hide Guide</button>
      </div>
      <div class="onboarding-grid">
        ${progress
          .map(
            (step, index) => `
              <article class="onboarding-card ${step.complete ? "is-complete" : ""}">
                <span class="onboarding-card__index">0${index + 1}</span>
                <h4>${escapeHtml(step.title)}</h4>
                <p>${escapeHtml(step.details)}</p>
                <div class="onboarding-card__footer">
                  <strong>${step.complete ? "Completed" : "Recommended next"}</strong>
                  <a class="button button--ghost" href="${step.href}">${escapeHtml(step.cta)}</a>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRealmGoals(state) {
  const goals = getRealmGoals(state);
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Realm Goals</h3>
        <span class="panel__subtle">Short-term milestones</span>
      </div>
      <div class="policy-history">
        ${goals
          .map(
            (goal) => `
              <article class="policy-history__card ${goal.complete ? "is-complete" : ""}">
                <strong>${escapeHtml(goal.title)}</strong>
                <span>${formatNumber(Math.min(goal.progress, goal.target), 0)} / ${formatNumber(goal.target, 0)}</span>
                <p>${escapeHtml(goal.details)}</p>
                <a class="button button--ghost" href="${goal.href}">${goal.complete ? "Review" : "Go There"}</a>
              </article>
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
                            building.imagePath,
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

function renderHomeSignals(state) {
  const townFocusAvailability = getTownFocusAvailability(state);
  const activeEventCount = state.events.active.length;
  const activeBuildingCount = state.buildings.filter((building) => building.isComplete).length;
  const eventState = activeEventCount === 0 ? "stable" : activeEventCount <= 2 ? "warning" : "urgent";
  const councilState = townFocusAvailability.isSelectionPending ? "warning" : "stable";
  const buildingState = activeBuildingCount === 0 ? "urgent" : activeBuildingCount < 3 ? "warning" : "stable";

  return `
    <section class="panel home-signals-panel">
      <div class="panel__header">
        <h3>Command Signals</h3>
        <span class="panel__subtle">What needs attention first</span>
      </div>
      <div class="home-signals-panel__grid">
        <article class="home-signals-panel__card home-signals-panel__card--${eventState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("calendar", "Signals")}<span>Active Events</span></div>
          <strong>${activeEventCount === 0 ? "Stable" : formatNumber(activeEventCount, 0)}</strong>
          <small>${activeEventCount ? "Chronicle has live disturbances to review." : "No active disturbances are pressuring the realm."}</small>
        </article>
        <article class="home-signals-panel__card home-signals-panel__card--${councilState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("calendar", "Council")}<span>Next Council</span></div>
          <strong>${townFocusAvailability.isSelectionPending ? "Due" : `${townFocusAvailability.daysUntilCouncil}d`}</strong>
          <small>${townFocusAvailability.isSelectionPending ? "A new town focus can be chosen now." : `Next council decision lands in ${townFocusAvailability.daysUntilCouncil} day(s).`}</small>
        </article>
        <article class="home-signals-panel__card home-signals-panel__card--${buildingState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("building", "Buildings")}<span>Active Buildings</span></div>
          <strong>${activeBuildingCount === 0 ? "None" : formatNumber(activeBuildingCount, 0)}</strong>
          <small>${activeBuildingCount === 0 ? "Finish the first building to wake the city economy." : `${formatNumber(state.buildings.length, 0)} total structures are being tracked.`}</small>
        </article>
      </div>
      <div class="home-signals-panel__actions">
        <button class="button button--ghost" type="button" data-action="copy-city-status">Copy City Status</button>
        <button class="button button--ghost" type="button" data-action="copy-active-buildings">Copy Active Buildings</button>
      </div>
    </section>
  `;
}

function renderMayorAdvice(state) {
  const advice = getMayorAdvice(state);

  return `
    <section class="panel mayor-advice-panel">
      <div class="panel__header">
        <h3>Mayor's Advice</h3>
        <span class="panel__subtle">Suggested next moves</span>
      </div>
      <div class="mayor-advice-panel__list">
        ${
          advice.length
            ? advice
                .map(
                  (entry) => `
                    <article class="mayor-advice-card">
                      <strong>${escapeHtml(entry.title)}</strong>
                      <p>${escapeHtml(entry.detail)}</p>
                      <a class="button button--ghost" href="${entry.href}">${escapeHtml(entry.cta)}</a>
                    </article>
                  `
                )
                .join("")
            : renderActionEmptyState(
                "No urgent advice right now",
                "This panel turns into a priority list whenever the city starts drifting off balance, so an empty state here means your settlement is relatively calm.",
                "./economy.html",
                "Open Economy"
              )
        }
      </div>
    </section>
  `;
}

export function renderHomePage(state) {
  return {
    title: "Home",
    subtitle: "Start here, then move into the page that matches the task.",
    content: `
      ${renderLandingHero(state)}
      ${renderHomeRouteDeck()}
      ${renderOnboardingPanel(state)}
      ${renderRealmGoals(state)}
      ${renderFeaturedBuildings(state)}
    `,
    aside: `
      ${renderHomeSignals(state)}
      ${renderMayorAdvice(state)}
      ${renderRecentSignals(state)}
    `
  };
}
