import { APP_VERSION, PAGE_ROUTES } from "../content/Config.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { getTownFocusHistory } from "../systems/TownFocusSystem.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderDriftEvolutionPanel } from "./DriftEvolutionPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";
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

function renderLandingHero(state) {
  const progress = getHomeProgress(state);
  const nextStep = progress.find((step) => !step.complete) ?? progress[progress.length - 1];
  const date = getStructuredDate(state.calendar.dayOffset);
  const compactDate = `${date.weekday} / ${date.month} ${date.day} / ${date.year} AC`;
  const highlightedBuilding =
    [...state.buildings].sort((left, right) => right.quality - left.quality)[0] ?? null;

  return `
    <section class="scene-panel scene-panel--hero scene-panel--landing">
      <div class="landing-hero">
        <div class="landing-hero__copy">
          <p class="world-summary__eyebrow">${escapeHtml(date.season)}</p>
          <h2>Raise the city one manifestation at a time.</h2>
          <p class="landing-hero__summary">
            The forge core is stable, the outer hexes are waiting, and the next meaningful move is clear.
            ${date.holiday ? ` Today is ${escapeHtml(date.holiday.name)}.` : ""}
          </p>
          <div class="landing-hero__actions">
            <a class="button" href="${nextStep.href}">${escapeHtml(nextStep.cta)}</a>
            <a class="button button--ghost" href="./city.html">Survey the Map</a>
          </div>
          <div class="landing-hero__facts">
            <article class="landing-hero__fact landing-hero__fact--date"><span>Current Date</span><strong>${escapeHtml(compactDate)}</strong></article>
            <article><span>Active Districts</span><strong>${state.districtSummary.filter((district) => district.level > 0).length}</strong></article>
            <article><span>Population</span><strong>${formatNumber(state.resources.population)}</strong></article>
            <article><span>Current Build</span><strong>${escapeHtml(APP_VERSION)}</strong></article>
          </div>
        </div>
        <div class="landing-hero__visual">
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
                          <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">View Dossier</button>
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

function renderRealmLinks() {
  return `
    <section class="scene-panel">
      <div class="panel__header">
        <h3>Realm Routes</h3>
        <span class="panel__subtle">Jump directly to the part of the game you want to shape</span>
      </div>
      <div class="realm-links">
        ${PAGE_ROUTES.filter((route) => route.key !== "home")
          .map(
            (route) => `
              <a class="realm-link-card" href="${route.href}">
                <span>${escapeHtml(route.label)}</span>
                <strong>Enter ${escapeHtml(route.label)}</strong>
              </a>
            `
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
      ${renderFeaturedBuildings(state)}
      ${renderPolicyHistory(state)}
    `,
    command: `
      ${renderOnboardingPanel(state)}
      ${renderRealmLinks()}
    `,
    chronicle: `
      ${renderHistoryPanel(state)}
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

export function renderHomePage(state) {
  return {
    title: "Command Chamber",
    subtitle: "A calmer overview of Drift, with the council, city pulse, and next actions gathered into cleaner shelves.",
    content: `
      ${renderLandingHero(state)}
      ${renderDriftEvolutionPanel(state)}
      ${renderTownFocusPanel(state)}
      ${renderHomeShelves(state)}
    `,
    aside: `
      ${renderCalendarPanel(state)}
      ${renderEventPanel(state)}
    `
  };
}
