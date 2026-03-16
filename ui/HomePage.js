import { PAGE_ROUTES } from "../content/Config.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";
import { renderTownFocusPanel } from "./TownFocusPanel.js";

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
            <article><span>Current Date</span><strong>${formatDate(state.calendar.dayOffset)}</strong></article>
            <article><span>Active Districts</span><strong>${state.districtSummary.filter((district) => district.level > 0).length}</strong></article>
            <article><span>Population</span><strong>${formatNumber(state.resources.population)}</strong></article>
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

export function renderHomePage(state) {
  return {
    title: "City of Drift",
    subtitle: "A more guided command chamber for your realm, with clearer first steps, featured structures, and direct routes into the living city.",
    content: `
      ${renderLandingHero(state)}
      ${renderTownFocusPanel(state)}
      ${renderOnboardingPanel(state)}
      ${renderWorldSummary(state)}
      ${renderFeaturedBuildings(state)}
      ${renderRealmLinks()}
      ${renderHistoryPanel(state)}
    `,
    aside: `
      ${renderCalendarPanel(state)}
      ${renderEventPanel(state)}
    `
  };
}
