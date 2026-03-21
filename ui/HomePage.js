import { renderUiIcon } from "./UiIcons.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getTownFocusHistory } from "../systems/TownFocusSystem.js";
import { renderDriftEvolutionPanel } from "./DriftEvolutionPanel.js";
import { getCurrentDriftEvolution } from "../systems/DriftEvolutionSystem.js";
import { renderTownFocusPanel } from "./TownFocusPanel.js";
import { renderTownFocusBadge } from "./TownFocusShared.js";

function getHomeProgress(state) {
  const hasBuilding = state.buildings.length > 0;
  const hasPlacedBuilding = state.buildings.some((building) => building.mapPosition);
  const hasCompletedBuilding = state.buildings.some((building) => building.isComplete);
  const hasEventFootprint = state.events.active.length > 0 || state.events.recent.length > 0;

  return [
    {
      title: "Awaken the Forge",
      details: "Manifest your first structure from the crystal realities.",
      complete: hasBuilding,
      href: "./forge.html",
      cta: hasBuilding ? "Forge humming" : "Go to Forge"
    },
    {
      title: "Claim the Outer Ring",
      details: "Place a structure onto the selectable hex district map.",
      complete: hasPlacedBuilding,
      href: "./city.html",
      cta: hasPlacedBuilding ? "District claimed" : "Open City Map"
    },
    {
      title: "Stabilize Construction",
      details: "Advance time until at least one building becomes active.",
      complete: hasCompletedBuilding,
      href: "./city.html",
      cta: hasCompletedBuilding ? "City awakened" : "Review Construction"
    },
    {
      title: "Write the Chronicle",
      details: "Let events and history begin shaping the realm.",
      complete: hasEventFootprint,
      href: "./chronicle.html",
      cta: hasEventFootprint ? "Chronicle alive" : "Open Chronicle"
    }
  ];
}

function getRealmGoals(state) {
  const goals = [
    {
      title: "Establish the Drift",
      details: "Reach 5 manifested buildings to unlock the first evolution point.",
      progress: state.buildings.length,
      target: 5,
      href: "./forge.html"
    },
    {
      title: "Claim the Ring",
      details: "Place 3 buildings on the town map.",
      progress: state.buildings.filter((building) => building.mapPosition).length,
      target: 3,
      href: "./city.html"
    },
    {
      title: "Awaken the Core",
      details: "Complete 2 buildings so they begin affecting the settlement.",
      progress: state.buildings.filter((building) => building.isComplete).length,
      target: 2,
      href: "./city.html"
    }
  ];

  return goals.map((goal) => ({
    ...goal,
    complete: goal.progress >= goal.target
  }));
}

function renderCommandCenterBubble(state) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const currentStage = getCurrentDriftEvolution(state);
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
        <h3>Command Center</h3>
        <button class="button button--ghost" data-action="open-home-help">Help</button>
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
          <span>Drift Level</span>
          <strong>${escapeHtml(currentStage.name)}</strong>
        </article>
      </div>
      <div class="landing-command-center__resources">
        ${resources
          .map(
            ([label, value, iconKey]) => `
              <article>
                <div class="landing-command-center__resource-head">
                  ${renderUiIcon(iconKey, label)}
                  <span>${escapeHtml(label)}</span>
                </div>
                <strong>${formatNumber(value, 0)}</strong>
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
  const date = getStructuredDate(state.calendar.dayOffset);
  const highlightedBuilding =
    [...state.buildings].sort((left, right) => right.quality - left.quality)[0] ?? null;

  return `
    <section class="scene-panel scene-panel--hero scene-panel--landing scene-panel--home-hero">
      <div class="landing-hero">
        <div class="landing-hero__copy">
          <p class="world-summary__eyebrow">${escapeHtml(date.season)}</p>
          <h2>Command the Drift.</h2>
          <p class="landing-hero__summary">
            ${
              state.settings.liveSessionView
                ? "A live session deck for the game master: grant crystals, place structures, advance time, and keep the settlement readable."
                : "A quieter command deck for the realm: forge, map, and chronicle gathered into fewer, sharper decisions."
            }
            ${date.holiday ? ` Today is ${escapeHtml(date.holiday.name)}.` : ""}
          </p>
          <div class="landing-hero__actions">
            <a class="button" href="${nextStep.href}">${escapeHtml(nextStep.cta)}</a>
            ${state.settings.liveSessionView ? `<button class="button button--ghost" data-action="open-admin">Open GM Console</button>` : `<a class="button button--ghost" href="./forge.html">Open Forge</a>`}
            <a class="button button--ghost" href="./index.html">Open Player Page</a>
          </div>
        </div>
        <div class="landing-hero__visual">
          <div class="landing-hero__visual-stage">
            ${
              highlightedBuilding?.imagePath
                ? `<img src="${escapeHtml(highlightedBuilding.imagePath)}" alt="${escapeHtml(highlightedBuilding.displayName)} artwork" loading="lazy" />`
                : `<div class="landing-hero__glyph">${escapeHtml(nextStep.title.slice(0, 1))}</div>`
            }
            <div class="landing-hero__badge">
              <span>Next Objective</span>
              <strong>${escapeHtml(nextStep.title)}</strong>
              <p>${escapeHtml(nextStep.details)}</p>
            </div>
          </div>
          ${renderCommandCenterBubble(state)}
        </div>
      </div>
    </section>
  `;
}

function renderHomeRouteDeck() {
  const routes = [
    { title: "Manifest", label: "Forge", href: "./forge.html", details: "Choose a crystal, manifest a structure, and watch the roll resolve." },
    { title: "Shape", label: "City", href: "./city.html", details: "Place buildings on the map, tune districts, and direct construction." },
    { title: "Remember", label: "Chronicle", href: "./chronicle.html", details: "Track events, monthly stories, and the realm's living history." },
    { title: "Present", label: "Player Page", href: "./index.html", details: "Open the cleaner shared player view for testers, tables, and screens." }
  ];

  return `
    <section class="scene-panel scene-panel--home-route-deck">
      <div class="panel__header">
        <h3>Realm Routes</h3>
        <span class="panel__subtle">The companion app's three main working areas</span>
      </div>
      <div class="home-route-deck">
        ${routes
          .map(
            (route) => `
              <a class="home-route-card" href="${route.href}">
                <span>${escapeHtml(route.label)}</span>
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

function renderRealmGoals(state) {
  const goals = getRealmGoals(state);
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Realm Goals</h3>
        <span class="panel__subtle">Short milestones to keep the session moving</span>
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

function renderOnboardingPanel(state) {
  if (state.settings.onboardingDismissed) {
    return `
      <section class="scene-panel scene-panel--compact">
        <div class="panel__header">
          <h3>First Steps Through Drift</h3>
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
        <h3>First Steps Through Drift</h3>
        <div class="onboarding-panel__header">
          <span class="panel__subtle">${completedCount} / ${progress.length} rites complete</span>
          <button class="button button--ghost" data-action="dismiss-onboarding">Hide Guide</button>
        </div>
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

function renderFeaturedBuildings(state) {
  const featured = [...state.buildings]
    .sort((left, right) => right.quality - left.quality)
    .slice(0, 3);

  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Featured Structures</h3>
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
                          building.imagePath
                            ? `<img src="${escapeHtml(building.imagePath)}" alt="${escapeHtml(building.displayName)} artwork" loading="lazy" />`
                            : `<div class="featured-building__fallback">${escapeHtml(building.displayName.charAt(0))}</div>`
                        }
                      </div>
                      <div class="featured-building__meta">
                        <h4>${escapeHtml(building.displayName)}</h4>
                        <span>${escapeHtml(building.rarity)} / ${formatNumber(building.quality, 2)}%</span>
                        <p>${escapeHtml(building.specialEffect)}</p>
                        <div class="featured-building__actions">
                          <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                          <a class="button button--ghost" href="./city.html">Map It</a>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">Manifest your first buildings to turn the skyline into something worth remembering.</p>`
        }
      </div>
    </section>
  `;
}

function renderWorldSummary(state) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const completedBuildings = state.buildings.filter((building) => building.isComplete).length;
  const activeEvents = state.events.active.length;

  return `
    <section class="scene-panel">
      <div class="world-summary">
        <div>
          <p class="world-summary__eyebrow">${date.season}</p>
          <h2>${formatDate(state.calendar.dayOffset)}</h2>
          <p>${date.holiday ? `Holiday: ${date.holiday.name}` : "No holiday today."}</p>
        </div>
        <div class="world-summary__stats">
          <article><span>Buildings</span><strong>${state.buildings.length}</strong></article>
          <article><span>Completed</span><strong>${completedBuildings}</strong></article>
          <article><span>Districts Active</span><strong>${state.districtSummary.filter((district) => district.level > 0).length}</strong></article>
          <article><span>Events</span><strong>${activeEvents}</strong></article>
        </div>
      </div>
    </section>
  `;
}

function renderPolicyHistory(state) {
  const history = getTownFocusHistory(state, 5);
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Policy Memory</h3>
        <span class="panel__subtle">The last decrees that shaped Drift</span>
      </div>
      <div class="policy-history">
        ${
          history.length
            ? history
                .map(
                  (entry) => `
                    <article class="policy-history__card ${entry.focus ? `policy-history__card--${entry.focus.id}` : ""}">
                      ${entry.focus ? renderTownFocusBadge(entry.focus, { compact: true }) : ""}
                      <strong>${escapeHtml(entry.title)}</strong>
                      <span>${escapeHtml(entry.date)}</span>
                      <p>${escapeHtml(entry.details)}</p>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">No policy decrees have been recorded yet.</p>`
        }
      </div>
    </section>
  `;
}

function renderRollTableReview(state) {
  const ownedKeys = new Set(state.buildings.map((building) => `${building.rarity}::${building.name}`));
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Roll Table Review</h3>
        <span class="panel__subtle">Buildings still unmanifested in each reality</span>
      </div>
      <div class="rolltable-review">
        ${Object.entries(state.rollTables)
          .map(
            ([rarity, entries]) => {
              const remainingCount = entries.filter((entry) => !ownedKeys.has(`${rarity}::${entry}`)).length;
              return `
              <article class="rolltable-review__card">
                <span>${escapeHtml(rarity)}</span>
                <strong>${remainingCount}</strong>
                <small>${remainingCount === 1 ? "building remains unseen" : "buildings remain unseen"}</small>
              </article>
            `;
            }
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHomeShelves(state) {
  const activeTab = state.transientUi?.homeShelfTab ?? "overview";
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "command", label: "Command" },
    { key: "chronicle", label: "Chronicle" }
  ];

  const panels = {
    overview: `
      ${renderWorldSummary(state)}
      ${renderRealmGoals(state)}
      ${renderRollTableReview(state)}
      ${renderFeaturedBuildings(state)}
      ${renderPolicyHistory(state)}
    `,
    command: `
      ${renderOnboardingPanel(state)}
      ${renderPolicyHistory(state)}
    `,
    chronicle: `
      ${renderRecentSignals(state)}
    `
  };

  return `
    <section class="scene-panel home-shelves">
      <div class="panel__header">
        <h3>Command Shelves</h3>
        <span class="panel__subtle">Show one cluster of information at a time</span>
      </div>
      <div class="home-shelves__tabs">
        ${tabs
          .map(
            (tab) => `
              <button
                class="button button--ghost ${activeTab === tab.key ? "is-active" : ""}"
                data-action="set-home-shelf"
                data-shelf="${tab.key}"
              >
                ${escapeHtml(tab.label)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="home-shelves__body">
        ${panels[activeTab]}
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
        <span class="panel__subtle">A light overview before entering Chronicle</span>
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
            : `<p class="empty-state">No recent signals have been recorded yet.</p>`
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
  return `
    <section class="panel home-signals-panel">
      <div class="panel__header">
        <h3>Command Signals</h3>
        <span class="panel__subtle">Only the overview that matters here</span>
      </div>
      <div class="home-signals-panel__grid">
        <article>
          <span>Active Events</span>
          <strong>${formatNumber(state.events.active.length, 0)}</strong>
          <small>${state.events.active.length ? "Chronicle has live disturbances" : "No urgent disruptions"}</small>
        </article>
        <article>
          <span>Next Council</span>
          <strong>${townFocusAvailability.isSelectionPending ? "Due" : `${townFocusAvailability.daysUntilCouncil}d`}</strong>
          <small>${townFocusAvailability.isSelectionPending ? "A new focus can be chosen now" : formatDate(townFocusAvailability.nextSelectionDayOffset)}</small>
        </article>
        <article>
          <span>Manifested Buildings</span>
          <strong>${formatNumber(state.buildings.length, 0)}</strong>
          <small>${formatNumber(state.buildings.filter((building) => building.isComplete).length, 0)} complete</small>
        </article>
      </div>
    </section>
  `;
}

export function renderHomePage(state) {
  const liveSessionView = state.settings.liveSessionView;
  return {
    title: "Command Chamber",
    subtitle: liveSessionView ? "GM overview, session signals, and the next action." : "Overview, routes, and the next decision.",
    content: `
      ${renderLandingHero(state)}
      ${liveSessionView ? "" : renderHomeRouteDeck()}
      ${renderDriftEvolutionPanel(state)}
      ${renderTownFocusPanel(state, { expanded: Boolean(state.transientUi?.homeTownFocusExpanded) })}
      ${renderHomeShelves(state)}
    `,
    aside: `
      ${renderHomeSignals(state)}
    `
  };
}
