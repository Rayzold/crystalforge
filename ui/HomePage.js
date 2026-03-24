// GM home dashboard.
// This page surfaces the current city summary, trends, advice, release checks,
// and quick-reference panels so the settlement can be read at a glance.
import { renderUiIcon } from "./UiIcons.js";
import { BUILDING_ROLE_LEGEND } from "../content/BuildingCatalog.js";
import { APP_VERSION, BUILD_NOTES } from "../content/Config.js";
import { GLOSSARY_TERMS } from "../content/GlossaryConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getNextHoliday, getStructuredDate } from "../systems/CalendarSystem.js";
import { formatBuildingExactQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { getMayorAdvice, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getTownFocusHistory } from "../systems/TownFocusSystem.js";
import { getCityTrendSummary, getResourceChainSummary } from "../systems/ResourceSystem.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";
import { renderDriftEvolutionPanel } from "./DriftEvolutionPanel.js";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js";
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
      details: "Reach 5 active buildings to unlock the first evolution point.",
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
          <h2>Command the Drift.</h2>
          <p class="landing-hero__summary">
            ${
              state.settings.liveSessionView
                ? "GM session dashboard."
                : "Overview of forge, city, and chronicle."
            }
            ${date.holiday ? ` ${escapeHtml(date.holiday.name)} today.` : ""}
          </p>
          <div class="landing-hero__actions">
            <a class="button landing-hero__primary-action" href="${nextStep.href}" title="${escapeHtml(`Primary next step: ${nextStep.cta}`)}">${escapeHtml(nextStep.cta)}</a>
            ${state.settings.liveSessionView ? `<button class="button button--ghost landing-hero__secondary-action" data-action="open-admin" title="Open the GM control layer">Open GM Console</button>` : `<a class="button button--ghost landing-hero__secondary-action" href="./forge.html" title="Open the Forge">Open Forge</a>`}
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
              <span>Step ${formatNumber((nextStepIndex === -1 ? progress.length : nextStepIndex + 1), 0)} / ${formatNumber(progress.length, 0)}</span>
              <strong>${escapeHtml(nextStep.title)}</strong>
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
  const routes = [
    { group: "Core", title: "Manifest", label: "Forge", href: "./forge.html", details: "Manifest buildings" },
    { group: "Core", title: "Shape", label: "City", href: "./city.html", details: "Manage map and construction" },
    { group: "Management", title: "Remember", label: "Chronicle", href: "./chronicle.html", details: "Events and history" },
    { group: "Management", title: "Reference", label: "Help", href: "./help.html", details: "Rules and notes" },
    { group: "Management", title: "Present", label: "Player Page", href: "./index.html", details: "Shared player view" }
  ];
  const groups = ["Core", "Management"];

  return `
    <section class="scene-panel scene-panel--home-route-deck">
      <div class="panel__header">
        <h3>Realm Routes</h3>
        <span class="panel__subtle">Quick links</span>
      </div>
      ${groups
        .map(
          (group) => `
            <div class="home-route-group">
              <span class="home-route-group__label">${escapeHtml(group)}</span>
              <div class="home-route-deck">
                ${routes
                  .filter((route) => route.group === group)
                  .map(
                    (route) => `
                      <a class="home-route-card" href="${route.href}">
                        <span>${escapeHtml(route.label)}</span>
                        <strong>${escapeHtml(route.title)}</strong>
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

function getQualityMultiplierReadout(building) {
  const multiplier = getBuildingMultiplier(building?.quality ?? 0);
  return `${formatBuildingExactQualityDisplay(building)}${multiplier > 1 ? ` · ${multiplier}x` : ""}`;
}

function renderRealmGoals(state) {
  const goals = getRealmGoals(state);
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Realm Goals</h3>
        <span class="panel__subtle">Milestones</span>
      </div>
      <div class="policy-history">
        ${goals
          .map(
            (goal) => `
              <article class="policy-history__card ${goal.complete ? "is-complete" : ""}">
                <strong>${escapeHtml(goal.title)}</strong>
                <span>${formatNumber(Math.min(goal.progress, goal.target), 0)} / ${formatNumber(goal.target, 0)}</span>
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
          <span class="panel__subtle">${completedCount} / ${progress.length} complete</span>
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
    .sort((left, right) => {
      const pinDelta = Number((state.settings?.pinnedBuildingIds ?? []).includes(right.id)) - Number((state.settings?.pinnedBuildingIds ?? []).includes(left.id));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return right.quality - left.quality;
    })
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
                          renderBuildingArt(
                            building.imagePath,
                            `${building.displayName} artwork`,
                            `<div class="featured-building__fallback">${escapeHtml(building.displayName.charAt(0))}</div>`
                          )
                        }
                      </div>
                      <div class="featured-building__meta">
                        <h4>${escapeHtml(building.displayName)}</h4>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(getQualityMultiplierReadout(building))}</span>
                        <div class="featured-building__actions">
                          <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                          <a class="button button--ghost" href="./city.html">Map It</a>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<div class="empty-state empty-state--action"><p>No buildings yet.</p><a class="button button--ghost" href="./forge.html">Create First Building</a></div>`
        }
      </div>
    </section>
  `;
}

function renderWorldSummary(state) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayGlyph = nextHoliday ? getHolidayGlyph(nextHoliday) : "✦";
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const completedBuildings = state.buildings.filter((building) => building.isComplete).length;
  const activeEvents = state.events.active.length;

  return `
    <section class="scene-panel">
      <div class="world-summary">
        <div>
          <p class="world-summary__eyebrow">${date.season}</p>
          <h2>${formatDate(state.calendar.dayOffset)}</h2>
          <p>${date.holiday ? `Holiday: ${date.holiday.name}` : ""}</p>
          <a
            class="world-summary__holiday-callout calendar-panel__focus calendar-panel__focus--holiday calendar-panel__focus--link ${nextHolidayAccentClass}"
            href="${nextHoliday ? `./chronicle.html?focusChronicleDay=${nextHoliday.dayOffset}` : "./chronicle.html"}"
            title="${nextHoliday ? `Open Chronicle on ${nextHoliday.name}` : "Open Chronicle"}"
          >
            <strong class="calendar-panel__focus-title"><span class="holiday-glyph" aria-hidden="true">${nextHolidayGlyph}</span>Upcoming Holiday</strong>
            <span>
              ${
                nextHoliday
                  ? `${nextHoliday.name} in ${nextHoliday.daysUntil} day(s).`
                  : "No upcoming holidays."
              }
            </span>
          </a>
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
        <span class="panel__subtle">Recent focus history</span>
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
        <span class="panel__subtle">Unseen by rarity</span>
      </div>
      <div class="rolltable-review">
        ${Object.entries(state.rollTables)
          .map(
            ([rarity, entries]) => {
              const remainingCount = entries.filter((entry) => entry !== "Crystal Upgrade" && !ownedKeys.has(`${rarity}::${entry}`)).length;
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
        <span class="panel__subtle">View mode</span>
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
        <span class="panel__subtle">Latest entries</span>
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
            : `<div class="empty-state empty-state--action"><p>No recent entries.</p><a class="button button--ghost" href="./chronicle.html">Open Chronicle</a></div>`
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
        <span class="panel__subtle">Status</span>
      </div>
      <div class="home-signals-panel__grid">
        <article class="home-signals-panel__card home-signals-panel__card--${eventState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("calendar", "Signals")}<span>Active Events</span></div>
          <strong>${activeEventCount === 0 ? "Stable" : formatNumber(activeEventCount, 0)}</strong>
          <small>${activeEventCount ? "Chronicle has live disturbances" : "All systems stable"}</small>
        </article>
        <article class="home-signals-panel__card home-signals-panel__card--${councilState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("calendar", "Council")}<span>Next Council</span></div>
          <strong>${townFocusAvailability.isSelectionPending ? "Due" : `${townFocusAvailability.daysUntilCouncil}d`}</strong>
          <small>${townFocusAvailability.isSelectionPending ? "A new focus can be chosen now" : formatDate(townFocusAvailability.nextSelectionDayOffset)}</small>
        </article>
        <article class="home-signals-panel__card home-signals-panel__card--${buildingState}">
          <div class="home-signals-panel__card-head">${renderUiIcon("building", "Buildings")}<span>Active Buildings</span></div>
          <strong>${activeBuildingCount === 0 ? "None" : formatNumber(activeBuildingCount, 0)}</strong>
          <small>${activeBuildingCount === 0 ? "The Drift still needs its first finished structure" : `${formatNumber(state.buildings.length, 0)} total structures tracked`}</small>
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
        <span class="panel__subtle">Priority actions</span>
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
            : `<div class="empty-state empty-state--action"><p>No urgent guidance.</p><a class="button button--ghost" href="./city.html">Review City</a></div>`
        }
      </div>
    </section>
  `;
}

function renderBuildingRolesLegend() {
  return `
    <section class="panel building-roles-panel">
      <div class="panel__header">
        <h3>Building Roles</h3>
        <span class="panel__subtle">Legend</span>
      </div>
      <div class="building-roles-panel__list">
        ${BUILDING_ROLE_LEGEND.map((role) => `
          <article class="building-role-chip">
            <strong>${escapeHtml(`${role.emoji} ${role.label}`)}</strong>
            <span>${escapeHtml(role.detail)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBuildNotesPanel(buildLabel = APP_VERSION) {
  return `
    <section class="panel build-notes-panel">
      <div class="panel__header">
        <h3>Build Notes</h3>
        <span class="panel__subtle">${escapeHtml(buildLabel)}</span>
      </div>
      <ul class="build-notes-panel__list">
        ${BUILD_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderCityTrendPanel(state) {
  const trends = getCityTrendSummary(state);
  return `
    <section class="panel city-trend-panel">
      <div class="panel__header">
        <h3>City Trends</h3>
        <span class="panel__subtle">Daily change</span>
      </div>
      <div class="city-trend-panel__grid">
        ${trends
          .map(
            (entry) => `
              <article class="city-trend-panel__item city-trend-panel__item--${entry.delta > 0 ? "positive" : entry.delta < 0 ? "negative" : "neutral"} ${state.transientUi?.recentResourceChanges?.[entry.key] ? "is-recently-changed" : ""}">
                <span>${escapeHtml(entry.label)}</span>
                <strong>${entry.delta >= 0 ? "+" : ""}${formatNumber(entry.delta, 2)} / day</strong>
                <small>${escapeHtml(`Stock ${formatNumber(entry.stock, 0)} / ${entry.detail}`)}</small>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderResourceChainPanel(state) {
  const chains = getResourceChainSummary(state);
  return `
    <section class="panel resource-chain-panel">
      <div class="panel__header">
        <h3>Resource Chain</h3>
        <span class="panel__subtle">Roles by resource</span>
      </div>
      <div class="resource-chain-panel__grid">
        ${chains
          .map(
            (chain) => `
              <article class="resource-chain-panel__item">
                <strong>${escapeHtml(chain.title)}</strong>
                <small>${escapeHtml(chain.detail)}</small>
                <p>${escapeHtml(chain.buildings.length ? chain.buildings.map((building) => building.displayName).slice(0, 6).join(", ") : "No buildings are filling this role yet.")}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderGlossaryPanel() {
  return `
    <section class="panel glossary-panel">
      <div class="panel__header">
        <h3>Rules Glossary</h3>
        <span class="panel__subtle">Key terms</span>
      </div>
      <div class="glossary-panel__list">
        ${GLOSSARY_TERMS.map((entry) => `
          <article class="glossary-panel__item">
            <strong>${escapeHtml(entry.term)}</strong>
            <p>${escapeHtml(entry.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderReleaseChecklistPanel(state) {
  const hasLocalSave = Boolean(getManualSaveMeta()?.manualSavedAt);
  const hasSharedSave = Boolean(state.transientUi?.firebasePublishedMeta?.updatedAtMs);
  const hasPlacedBuilding = state.buildings.some((building) => building.mapPosition);
  const hasCalendarSnapshot = Object.keys(state.dailyCitySnapshots ?? {}).length > 0;
  const hasPlayerScreenReady = true;

  const items = [
    {
      label: "Shared Save",
      done: hasSharedSave,
      detail: hasSharedSave ? "Firebase save is present." : "No shared Firebase save detected yet."
    },
    {
      label: "Local Save",
      done: hasLocalSave,
      detail: hasLocalSave ? "Local backup exists." : "Create a local fallback save."
    },
    {
      label: "Player Page",
      done: hasPlayerScreenReady,
      detail: "Open index.html and verify the public table view."
    },
    {
      label: "Calendar",
      done: hasCalendarSnapshot,
      detail: hasCalendarSnapshot ? "Chronicle snapshots exist." : "Advance time once and review Chronicle."
    },
    {
      label: "Map",
      done: hasPlacedBuilding,
      detail: hasPlacedBuilding ? "At least one building is placed." : "Place at least one building on the town map."
    }
  ];

  return `
    <section class="panel release-checklist-panel">
      <div class="panel__header">
        <h3>Release Checklist</h3>
        <span class="panel__subtle">Pre-session checks</span>
      </div>
      <div class="release-checklist-panel__list">
        ${items
          .map(
            (item) => `
              <article class="release-checklist-panel__item ${item.done ? "is-complete" : ""}">
                <strong>${item.done ? "Done" : "Check"} / ${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.detail)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderHomePage(state) {
  const liveSessionView = state.settings.liveSessionView;
  return {
    title: "Command Chamber",
    subtitle: liveSessionView ? "GM overview." : "Overview.",
    content: `
      ${renderLandingHero(state)}
      ${liveSessionView ? "" : renderHomeRouteDeck()}
      ${renderDriftEvolutionPanel(state)}
      ${renderTownFocusPanel(state, { expanded: Boolean(state.transientUi?.homeTownFocusExpanded) })}
      ${renderHomeShelves(state)}
    `,
    aside: `
      ${renderHomeSignals(state)}
      ${renderCityTrendPanel(state)}
      ${renderMayorAdvice(state)}
      ${renderResourceChainPanel(state)}
    `
  };
}
