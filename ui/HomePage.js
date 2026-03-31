import { renderUiIcon } from "./UiIcons.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getStructuredDate } from "../systems/CalendarSystem.js";
import { formatBuildingExactQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { getOnboardingGoals, getRealmGoals as getRealmGoalCards } from "../systems/GoalSystem.js";
import { getMayorAdvice, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getCityTrendSummary } from "../systems/ResourceSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";

function getHomeProgress(state) {
  return getOnboardingGoals(state);
}

function getRealmGoals(state) {
  return getRealmGoalCards(state);
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
  const progress = getHomeProgress(state);
  const completedCount = progress.filter((step) => step.complete).length;
  const currentStep = progress.find((step) => !step.complete) ?? progress[progress.length - 1];
  const currentStepIndex = Math.max(0, progress.findIndex((step) => step.id === currentStep.id));

  if (state.settings.onboardingDismissed) {
    return `
      <section class="scene-panel scene-panel--compact">
        <div class="panel__header">
          <div>
            <h3>First Session</h3>
            <span class="panel__subtle">Next up: ${escapeHtml(currentStep.title)}.</span>
          </div>
          <button class="button button--ghost" data-action="show-onboarding">Show Guide</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="scene-panel onboarding-panel">
      <div class="panel__header">
        <div>
          <h3>First Session</h3>
          <span class="panel__subtle">${completedCount} / ${progress.length} phases complete</span>
        </div>
        <button class="button button--ghost" data-action="dismiss-onboarding">Hide Guide</button>
      </div>
      <article class="onboarding-panel__current">
        <div>
          <span>Current Objective</span>
          <strong>${escapeHtml(currentStep.title)}</strong>
          <p>${escapeHtml(currentStep.details)}</p>
          <small>${escapeHtml(currentStep.impact)}</small>
        </div>
        <div class="onboarding-panel__current-actions">
          <em>Stage ${formatNumber(currentStepIndex + 1, 0)} / ${formatNumber(progress.length, 0)}</em>
          <strong>${escapeHtml(currentStep.complete ? "Arc Complete" : currentStep.progressText)}</strong>
          <small class="goal-reward-pill ${currentStep.claimed ? "is-claimed" : ""}">${escapeHtml(currentStep.claimed ? `Reward claimed: ${currentStep.rewardLabel}` : `Reward: ${currentStep.rewardLabel}`)}</small>
          <a class="button" href="${currentStep.href}">${escapeHtml(currentStep.cta)}</a>
        </div>
      </article>
      <div class="onboarding-grid">
        ${progress
          .map(
            (step, index) => `
              <article class="onboarding-card ${step.complete ? "is-complete" : ""} ${step.id === currentStep.id ? "is-current" : ""}">
                <div class="onboarding-card__head">
                  <span class="onboarding-card__index">${escapeHtml(step.phase)}</span>
                  <strong class="onboarding-card__status">${step.complete ? "Complete" : step.id === currentStep.id ? "Current Objective" : `Stage ${formatNumber(index + 1, 0)}`}</strong>
                </div>
                <h4>${escapeHtml(step.title)}</h4>
                <p>${escapeHtml(step.details)}</p>
                <small class="onboarding-card__impact">${escapeHtml(step.impact)}</small>
                <div class="onboarding-card__footer">
                  <strong>${escapeHtml(step.progressText)}</strong>
                  <span class="goal-reward-pill ${step.claimed ? "is-claimed" : ""}">${escapeHtml(step.claimed ? "Reward claimed" : step.rewardLabel)}</span>
                  <a class="button button--ghost" href="${step.href}">${escapeHtml(step.complete ? "Review" : step.cta)}</a>
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
                <small class="goal-reward-pill ${goal.claimed ? "is-claimed" : ""}">${escapeHtml(goal.claimed ? `Reward claimed: ${goal.rewardLabel}` : `Reward: ${goal.rewardLabel}`)}</small>
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
