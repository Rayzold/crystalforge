import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getVisibleBuildings, renderBuildingGrid } from "./BuildingGrid.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderEmergencyPanel } from "./EmergencyPanel.js";
import { renderHexMap } from "./HexMap.js";
import { renderResourcePanel } from "./ResourcePanel.js";
import { renderUiIcon } from "./UiIcons.js";

function renderTownStatistics(state) {
  const buildings = state.buildings;
  const dailyNet =
    (state.cityStats.income ?? 0) -
    (state.cityStats.upkeep ?? 0);

  const items = [
    ["Net Daily", `${dailyNet >= 0 ? "+" : ""}${formatNumber(dailyNet, 0)}g`, dailyNet >= 0 ? "positive" : "negative"],
    ["Population", formatNumber(state.resources.population ?? 0, 0), "population"],
    ["Food", formatNumber(state.resources.food ?? 0, 0), "food"],
    ["Defense", formatNumber(state.cityStats.defense ?? 0, 0), "defense"],
    ["Morale", formatNumber(state.cityStats.morale ?? 0, 0), "morale"],
    ["Buildings", formatNumber(buildings.length, 0), "buildings"]
  ];

  return `
    <section class="panel town-statistics town-statistics--command-strip">
      <div class="panel__header">
        <h3>Town Statistics</h3>
        <span class="panel__subtle">The shortest useful read of Drift right now</span>
      </div>
      <div class="town-statistics__grid town-statistics__grid--compact">
        ${items
          .map(
            ([label, value, accent]) => `
              <article class="town-statistics__card town-statistics__card--${accent}">
                <div class="town-statistics__card-head">
                  ${renderUiIcon(
                    accent === "negative" ? "upkeep" :
                    accent === "population" ? "population" :
                    accent === "food" ? "food" :
                    accent === "defense" ? "defense" :
                    accent === "morale" ? "morale" : "building",
                    label
                  )}
                  <span>${escapeHtml(label)}</span>
                </div>
                <strong>${escapeHtml(String(value))}</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderCityWorkspace(state) {
  const currentView = state.transientUi?.cityView ?? "stream";
  const sortKey = state.transientUi?.buildingSort ?? "newest";
  const totalRolls = state.historyLog.filter((entry) => entry.category === "Manifest").length;
  const visibleBuildings = getVisibleBuildings(state);

  return `
    <section class="panel city-workspace">
      <div class="city-workspace__top">
        <div class="city-workspace__tabs">
          <button class="button button--ghost ${currentView === "stream" ? "is-active" : ""}" data-action="set-city-view" data-view="stream">The Stream</button>
          <button class="button button--ghost ${currentView === "map" ? "is-active" : ""}" data-action="set-city-view" data-view="map">Town Map</button>
        </div>
        <span class="city-workspace__total">Total Rolls: ${formatNumber(totalRolls, 0)}</span>
      </div>

      <div class="city-workspace__toolbar">
        <div class="city-workspace__filters">
          <button class="button button--ghost city-filter ${state.buildingFilter === "All" ? "is-active" : ""}" data-action="set-building-filter" value="All">All</button>
          ${RARITY_ORDER.map(
            (rarity) => `
              <button
                class="button button--ghost city-filter ${state.buildingFilter === rarity ? "is-active" : ""}"
                data-action="set-building-filter"
                value="${rarity}"
                style="--filter-color:${RARITY_COLORS[rarity]}"
              >
                ${escapeHtml(rarity)}
              </button>
            `
          ).join("")}
        </div>
        <label class="city-workspace__sort">
          <span>Sort</span>
          <select data-action="set-building-sort">
            <option value="newest" ${sortKey === "newest" ? "selected" : ""}>Newest First</option>
            <option value="quality" ${sortKey === "quality" ? "selected" : ""}>Highest Quality</option>
            <option value="rarity" ${sortKey === "rarity" ? "selected" : ""}>Highest Rarity</option>
          </select>
        </label>
      </div>

      ${
        currentView === "map"
          ? `<div class="city-workspace__map">${renderHexMap(state)}</div>`
          : `
            <div class="city-workspace__stream">
              ${renderBuildingGrid(state, { limit: null, showHeader: false, className: "building-grid-panel--stream" })}
            </div>
          `
      }

      <div class="city-workspace__footer">
        <article><strong>${formatNumber(visibleBuildings.length, 0)}</strong><span>Visible</span></article>
        <article><strong>${formatNumber(state.buildings.filter((building) => building.quality >= 100).length, 0)}</strong><span>Completed</span></article>
        <article><strong>${formatNumber(state.buildings.length ? state.buildings.reduce((sum, building) => sum + building.quality, 0) / state.buildings.length : 0, 0)}%</strong><span>Average Quality</span></article>
      </div>
    </section>
  `;
}

function renderCityDrawer(state) {
  const activeEvents = state.events.active.length;
  const activeConstruction = state.buildings.filter(
    (building) =>
      !building.isComplete &&
      (state.constructionPriority ?? []).slice(0, state.cityStats.activeConstructionSlots ?? 0).includes(building.id)
  ).length;
  const councilDue = state.townFocus?.isSelectionPending;

  return `
    <aside class="city-command-drawer">
      <section class="panel city-command-drawer__panel city-command-drawer__panel--intro">
        <div class="panel__header">
          <h3>City Command</h3>
          <span class="panel__subtle">Live session operations</span>
        </div>
        <p class="city-command-drawer__copy">
          Keep the map central while this drawer handles time, raising order, and the realm pressure a game master actually needs during a session.
        </p>
        <div class="city-command-drawer__signals">
          <article>
            <span>Today</span>
            <strong>${escapeHtml(formatDate(state.calendar.dayOffset))}</strong>
          </article>
          <article>
            <span>Raising</span>
            <strong>${formatNumber(activeConstruction, 0)}</strong>
          </article>
          <article>
            <span>Events</span>
            <strong>${formatNumber(activeEvents, 0)}</strong>
          </article>
          <article>
            <span>Council</span>
            <strong>${councilDue ? "Due" : "Waiting"}</strong>
          </article>
        </div>
        <div class="city-command-drawer__quick-actions">
          <button class="button button--ghost" data-action="advance-time" data-step="day">Advance 1 Day</button>
          <button class="button button--ghost" data-action="advance-time" data-step="week">Advance 1 Week</button>
          <button class="button button--ghost" data-action="open-admin">Open GM Console</button>
        </div>
      </section>
      ${renderCalendarPanel(state, { showQueue: true })}
      ${renderEmergencyPanel(state)}
      ${renderResourcePanel(state)}
      ${renderDistrictPanel(state)}
    </aside>
  `;
}

export function renderCityPage(state) {
  return {
    title: "The City",
    subtitle: "Run the session, place structures, and advance the realm.",
    content: `
      <section class="city-command-screen">
        ${renderTownStatistics(state)}
        <div class="city-command-screen__body">
          <div class="city-command-screen__main">
            ${renderCityWorkspace(state)}
          </div>
          ${renderCityDrawer(state)}
        </div>
      </section>
    `
  };
}
