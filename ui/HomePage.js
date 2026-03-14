import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderEventPanel } from "./EventPanel.js";
import { renderHistoryPanel } from "./HistoryPanel.js";

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
    <section class="scene-panel scene-panel--hero">
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

export function renderHomePage(state) {
  return {
    title: "City of Drift",
    subtitle: "A calmer overview of your realm before you step into the forge, the streets, and the chronicle.",
    content: `
      ${renderWorldSummary(state)}
      ${renderFeaturedBuildings(state)}
      ${renderHistoryPanel(state)}
    `,
    aside: `
      ${renderCalendarPanel(state)}
      ${renderEventPanel(state)}
    `
  };
}
