import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getEmergencyStatus } from "../systems/ResourceSystem.js";
import { getVisibleBuildings, renderBuildingGrid } from "./BuildingGrid.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderEmergencyPanel } from "./EmergencyPanel.js";
import { renderHexMap } from "./HexMap.js";
import { renderResourcePanel } from "./ResourcePanel.js";
import { renderUiIcon } from "./UiIcons.js";

function renderTownStatistics(state) {
  const dailyNet = (state.cityStats.income ?? 0) - (state.cityStats.upkeep ?? 0);
  const emergencyState = getEmergencyStatus(state);
  const foodRunway = emergencyState.runway.foodDays;

  const items = [
    ["Net Daily", `${dailyNet >= 0 ? "+" : ""}${formatNumber(dailyNet, 0)}g`, dailyNet >= 0 ? "positive" : "negative"],
    ["Population", formatNumber(state.resources.population ?? 0, 0), "population"],
    ["Food Stores", formatNumber(state.resources.food ?? 0, 0), "food"],
    ["Food Runway", foodRunway === null ? "Stable" : `${formatNumber(foodRunway, 1)}d`, foodRunway !== null && foodRunway <= 5 ? "negative" : "food"],
    ["Defense", formatNumber(state.cityStats.defense ?? 0, 0), "defense"],
    ["Morale", formatNumber(state.cityStats.morale ?? 0, 0), "morale"]
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
                    accent === "negative"
                      ? "upkeep"
                      : accent === "population"
                        ? "population"
                        : accent === "food"
                          ? "food"
                          : accent === "defense"
                            ? "defense"
                            : accent === "morale"
                              ? "morale"
                              : "building",
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

function renderBuildingsView(state) {
  const currentView = state.transientUi?.cityBuildingView ?? "stream";
  const sortKey = state.transientUi?.buildingSort ?? "newest";
  const totalRolls = state.historyLog.filter((entry) => entry.category === "Manifest").length;
  const visibleBuildings = getVisibleBuildings(state);

  return `
    <section class="panel city-workspace">
      <div class="city-workspace__top">
        <div class="city-workspace__tabs">
          <button class="button button--ghost ${currentView === "stream" ? "is-active" : ""}" data-action="set-city-building-view" data-view="stream">The Stream</button>
          <button class="button button--ghost ${currentView === "map" ? "is-active" : ""}" data-action="set-city-building-view" data-view="map">Town Map</button>
        </div>
        <span class="city-workspace__total">Total Rolls: ${formatNumber(totalRolls, 0)}</span>
      </div>

      <div class="city-workspace__toolbar">
        <div class="city-workspace__filters">
          <button class="button button--ghost city-filter ${state.buildingFilter === "All" ? "is-active" : ""}" data-action="set-building-filter" data-filter="All">All</button>
          ${RARITY_ORDER.map(
            (rarity) => `
              <button
                class="button button--ghost city-filter ${state.buildingFilter === rarity ? "is-active" : ""}"
                data-action="set-building-filter"
                data-filter="${rarity}"
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

function renderAdministrationView(state) {
  const adminView = state.transientUi?.cityAdminView ?? "operations";

  return `
    <section class="panel city-admin-view">
      <div class="city-admin-view__top">
        <div class="city-admin-view__tabs">
          <button class="button button--ghost ${adminView === "operations" ? "is-active" : ""}" data-action="set-city-admin-view" data-view="operations">Operations</button>
          <button class="button button--ghost ${adminView === "readouts" ? "is-active" : ""}" data-action="set-city-admin-view" data-view="readouts">Readouts</button>
        </div>
        <span class="city-workspace__total">${adminView === "operations" ? "Time, raising, and emergencies" : "Stores and district posture"}</span>
      </div>

      ${
        adminView === "operations"
          ? `
              <div class="city-admin-view__grid city-admin-view__grid--operations">
                <section class="city-command-drawer__section">
                  <div class="city-command-drawer__section-head">
                    <span>Session Clock</span>
                    <small>Advance time and raising</small>
                  </div>
                  ${renderCalendarPanel(state, { showQueue: true })}
                </section>
                <section class="city-command-drawer__section">
                  <div class="city-command-drawer__section-head">
                    <span>Emergency Watch</span>
                    <small>Pressure and shortfalls</small>
                  </div>
                  ${renderEmergencyPanel(state)}
                </section>
              </div>
            `
          : `
              <div class="city-admin-view__grid city-admin-view__grid--readouts">
                <section class="city-command-drawer__section city-command-drawer__section--quiet">
                  <div class="city-command-drawer__section-head">
                    <span>City Stores</span>
                    <small>Resources and runway</small>
                  </div>
                  ${renderResourcePanel(state)}
                </section>
                <section class="city-command-drawer__section city-command-drawer__section--quiet">
                  <div class="city-command-drawer__section-head">
                    <span>Districts</span>
                    <small>Bonuses and levels</small>
                  </div>
                  ${renderDistrictPanel(state)}
                </section>
              </div>
            `
      }
    </section>
  `;
}

function renderCityModes(state) {
  const cityMode = state.transientUi?.cityMode ?? "buildings";
  return `
    <section class="city-modes">
      <div class="city-modes__tabs">
        <button class="button button--ghost ${cityMode === "buildings" ? "is-active" : ""}" data-action="set-city-mode" data-view="buildings">Buildings</button>
        <button class="button button--ghost ${cityMode === "administration" ? "is-active" : ""}" data-action="set-city-mode" data-view="administration">Administration</button>
      </div>
      ${cityMode === "buildings" ? renderBuildingsView(state) : renderAdministrationView(state)}
    </section>
  `;
}

export function renderCityPage(state) {
  return {
    title: "The City",
    subtitle: "Switch between structures and administration.",
    content: `
      <section class="city-command-screen">
        ${renderTownStatistics(state)}
        ${renderCityModes(state)}
      </section>
    `
  };
}
