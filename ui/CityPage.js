// City management page.
// This page combines the building stream, map access, incubation controls,
// filters, and city-side summaries used during active management play.
import { getBuildingEmoji } from "../content/BuildingCatalog.js";
import { SPEED_MULTIPLIERS } from "../content/Config.js";
import { RARITY_COLORS, RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getNextHoliday } from "../systems/CalendarSystem.js";
import {
  getActiveConstructionQueue,
  getAvailableConstructionQueue,
  getConstructionEtaDetails,
  getConstructionQueue,
  getConstructionQueuePosition,
  getDriftConstructionSlots,
  getIncubatorQueuedBuildings,
  INCUBATOR_QUEUE_LIMIT,
  isBuildingActivelyConstructed
} from "../systems/ConstructionSystem.js";
import { getEmergencyStatus, getGoodsSummary } from "../systems/ResourceSystem.js";
import { getWorkforceCategoryLabel, getWorkforceSummary } from "../systems/WorkforceSystem.js";
import { getVisibleBuildings, renderBuildingGrid } from "./BuildingGrid.js";
import { renderCalendarPanel } from "./CalendarPanel.js";
import { renderDistrictPanel } from "./DistrictPanel.js";
import { renderDriftEvolutionPanel } from "./DriftEvolutionPanel.js";
import { renderEmergencyPanel } from "./EmergencyPanel.js";
import { renderHexMap } from "./HexMap.js";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js";
import { renderResourcePanel } from "./ResourcePanel.js";
import { renderTownFocusPanel } from "./TownFocusPanel.js";
import { renderUiIcon } from "./UiIcons.js";

function renderCitySectionNav(pageKey) {
  return `
    <section class="city-section-nav">
      <div class="city-section-nav__tabs">
        <a class="button button--ghost ${pageKey === "economy" ? "is-active" : ""}" href="./economy.html">Economy</a>
        <a class="button button--ghost ${pageKey === "city" ? "is-active" : ""}" href="./city.html">City</a>
      </div>
    </section>
  `;
}

function renderActionEmptyState(title, detail, actionMarkup) {
  return `
    <div class="empty-state empty-state--action">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      ${actionMarkup}
    </div>
  `;
}

function getAvailableConstructionSortDays(etaDetails) {
  return Number.isFinite(etaDetails?.daysRemaining) ? etaDetails.daysRemaining : Number.POSITIVE_INFINITY;
}

function compareAvailableConstructionEntries(left, right) {
  const leftDays = getAvailableConstructionSortDays(left.etaDetails);
  const rightDays = getAvailableConstructionSortDays(right.etaDetails);

  if (leftDays !== rightDays) {
    return leftDays - rightDays;
  }

  if ((right.building.quality ?? 0) !== (left.building.quality ?? 0)) {
    return (right.building.quality ?? 0) - (left.building.quality ?? 0);
  }

  return left.building.displayName.localeCompare(right.building.displayName);
}

function renderCitySessionControls(state) {
  return `
    <section class="panel city-session-controls">
      <div class="panel__header">
        <div>
          <h3>Session Controls</h3>
          <span class="panel__subtle">Advance time and tune raising speed from one place.</span>
        </div>
      </div>
      <div class="city-session-controls__actions">
        <div class="time-controls">
          <button class="button button--ghost" data-action="advance-time" data-step="day">Advance Day</button>
          <button class="button button--ghost" data-action="advance-time" data-step="3days">Advance 3 Days</button>
          <button class="button button--ghost" data-action="advance-time" data-step="week">Advance Week</button>
          <button class="button button--ghost" data-action="advance-time" data-step="month">Advance Month</button>
          <button class="button button--ghost" data-action="advance-time" data-step="year">Advance Year</button>
        </div>
        <div class="city-session-controls__advanced">
          <div class="city-workspace__preset-time">
            <label class="calendar-panel__custom-days">
              Advance Multiple Days
              <select data-role="advance-days-preset">
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="14" selected>14 Days</option>
                <option value="28">28 Days</option>
                <option value="56">56 Days</option>
                <option value="112">112 Days</option>
              </select>
            </label>
            <button class="button button--ghost" data-action="advance-selected-time">Advance Selected Span</button>
          </div>
          <div class="city-workspace__custom-time">
            <label class="calendar-panel__custom-days">
              Advance by Days
              <input type="number" min="1" step="1" value="14" data-role="custom-days" />
            </label>
            <button class="button button--ghost" data-action="advance-custom-time">Advance Custom Span</button>
          </div>
          <label class="speed-selector">
            Raising Speed
            <select data-action="set-speed-multiplier">
              ${SPEED_MULTIPLIERS.map(
                (value) => `<option value="${value}" ${state.constructionSpeedMultiplier === value ? "selected" : ""}>${value}x</option>`
              ).join("")}
            </select>
          </label>
        </div>
      </div>
    </section>
  `;
}

function renderTownStatistics(state) {
  const dailyNet = (state.cityStats.income ?? 0) - (state.cityStats.upkeep ?? 0);
  const emergencyState = getEmergencyStatus(state);
  const foodRunway = emergencyState.runway.foodDays;
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const nextHolidayGlyph = nextHoliday ? getHolidayGlyph(nextHoliday) : "✦";
  const goodsSummary = getGoodsSummary(state);

  const items = [
    ["Net Daily", `${dailyNet >= 0 ? "+" : ""}${formatNumber(dailyNet, 0)}g`, dailyNet >= 0 ? "positive" : "negative"],
    ["Population", formatNumber(state.resources.population ?? 0, 0), "population"],
    ["Food Stores", formatNumber(state.resources.food ?? 0, 0), "food"],
    ["Food Runway", foodRunway === null ? "Stable" : `${formatNumber(foodRunway, 1)}d`, foodRunway !== null && foodRunway <= 5 ? "negative" : "food"],
    ["Goods", formatNumber(goodsSummary.total, 1), "goods"],
    ["Trade Gold", `x${formatNumber(goodsSummary.multiplier, 2)}`, goodsSummary.multiplier > 1 ? "positive" : "goods"],
    ["Defense", formatNumber(state.cityStats.defense ?? 0, 0), "defense"],
    ["Morale", formatNumber(state.cityStats.morale ?? 0, 0), "morale"]
  ];

  return `
    <section class="panel town-statistics town-statistics--command-strip">
      <div class="panel__header">
        <div>
          <h3>Town Statistics</h3>
          <span class="panel__subtle">The shortest useful read of Drift right now</span>
        </div>
        ${
          nextHoliday
            ? `
              <a
                class="town-statistics__holiday-badge ${nextHolidayAccentClass}"
                href="./chronicle.html?focusChronicleDay=${nextHoliday.dayOffset}"
                title="Open Chronicle on ${escapeHtml(nextHoliday.name)}"
              >
                <span class="town-statistics__holiday-badge-label"><span class="holiday-glyph" aria-hidden="true">${nextHolidayGlyph}</span>Next Holiday${nextHoliday ? `<em class="holiday-countdown-badge">${escapeHtml(nextHoliday.daysUntil === 0 ? "Today" : `${nextHoliday.daysUntil}d`)}</em>` : ""}</span>
                <strong>${escapeHtml(nextHoliday.name)}</strong>
                <small>${escapeHtml(nextHoliday.daysUntil === 0 ? "Today" : `${nextHoliday.daysUntil} day(s)`)}</small>
              </a>
            `
            : ""
        }
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
      <div class="panel__subtle">
        ${
          goodsSummary.multiplier > 1
            ? `Trade-tagged gold buildings are currently earning at ${formatNumber((goodsSummary.multiplier - 1) * 100, 0)}% bonus from goods.`
            : "Trade-tagged gold buildings gain their first bonus at 20 goods."
        }
        ${goodsSummary.toNextThreshold > 0 ? ` ${formatNumber(goodsSummary.toNextThreshold, 1)} more goods reaches the next trade bonus step.` : ""}
        ${` Base ${formatNumber(goodsSummary.base, 1)} / GM ${goodsSummary.gmOverride >= 0 ? "+" : ""}${formatNumber(goodsSummary.gmOverride, 1)}.`}
      </div>
    </section>
  `;
}

function renderWorkforcePanel(state) {
  const workforce = getWorkforceSummary(state);
  const specialistEntries = Object.entries(workforce.specialistDemand)
    .filter(([, demand]) => demand > 0)
    .sort((left, right) => right[1] - left[1]);

  return `
    <section class="panel workforce-panel">
      <div class="panel__header">
        <div>
          <h3>Workforce</h3>
          <span class="panel__subtle">General labor sets the floor. Specialists sharpen each district role.</span>
        </div>
        <span class="workforce-panel__headline">Base Output x${formatNumber(workforce.generalMultiplier ?? 1, 2)}</span>
      </div>
      <div class="workforce-panel__overview">
        <article class="workforce-panel__stat">
          <span>General Supply</span>
          <strong>${formatNumber(workforce.generalSupply ?? 0, 1)}</strong>
          <small>Weighted workforce available now</small>
        </article>
        <article class="workforce-panel__stat">
          <span>General Demand</span>
          <strong>${formatNumber(workforce.generalDemand ?? 0, 1)}</strong>
          <small>Completed building demand</small>
        </article>
        <article class="workforce-panel__stat">
          <span>General Staffing</span>
          <strong>${formatNumber((workforce.generalRatio ?? 1) * 100, 0)}%</strong>
          <small>General multiplier x${formatNumber(workforce.generalMultiplier ?? 1, 2)}</small>
        </article>
      </div>
      <div class="workforce-panel__specialists">
        ${
          specialistEntries.length
            ? specialistEntries
                .map(([category, demand]) => `
                  <article class="workforce-panel__role-card ${(workforce.specialistMultipliers?.[category] ?? 1) < 0.999 ? "is-constrained" : ""}">
                    <div>
                      <span>${escapeHtml(getWorkforceCategoryLabel(category))}</span>
                      <strong>${formatNumber((workforce.specialistRatios?.[category] ?? 1) * 100, 0)}%</strong>
                    </div>
                    <small>Supply ${formatNumber(workforce.specialistSupply?.[category] ?? 0, 1)} / Demand ${formatNumber(demand, 1)} / x${formatNumber(workforce.specialistMultipliers?.[category] ?? 1, 2)}</small>
                  </article>
                `)
                .join("")
            : renderActionEmptyState(
                "No workforce demand yet",
                "Workforce demand appears once completed buildings begin operating, and it explains why output can rise or soften even when resources look healthy.",
                `<a class="button button--ghost" href="./city.html">Open City</a>`
              )
        }
      </div>
    </section>
  `;
}

function renderBuildingsView(state) {
  const currentView = state.transientUi?.cityBuildingView ?? "stream";
  const sortKey = state.transientUi?.buildingSort ?? "newest";
  const statusFilter = state.transientUi?.buildingStatusFilter ?? "All";
  const quickFilter = state.transientUi?.buildingQuickFilter ?? "All";
  const totalRolls = state.historyLog.filter((entry) => entry.category === "Manifest").length;
  const visibleBuildings = getVisibleBuildings(state);
  const incubating = getActiveConstructionQueue(state);
  const queued = getIncubatorQueuedBuildings(state);
  const constructionQueue = getConstructionQueue(state);
  const queuedIds = new Set(queued.map((building) => building.id));
  const waitingEntries = getAvailableConstructionQueue(state)
    .filter((building) => !queuedIds.has(building.id))
    .map((building) => ({
      building,
      etaDetails: getConstructionEtaDetails(building, state)
    }))
    .sort(compareAvailableConstructionEntries);
  const waiting = waitingEntries.map((entry) => entry.building);
  const slots = getDriftConstructionSlots(state);

  return `
    <section class="panel city-workspace">
      <div class="city-workspace__top">
        <div class="city-workspace__tabs">
          <button class="button button--ghost ${currentView === "stream" ? "is-active" : ""}" data-action="set-city-building-view" data-view="stream">The Stream</button>
          <button class="button button--ghost ${currentView === "map" ? "is-active" : ""}" data-action="set-city-building-view" data-view="map">Town Map</button>
        </div>
        <div class="city-workspace__top-actions">
          <button class="button city-workspace__map-shortcut ${currentView === "map" ? "is-active" : ""}" data-action="set-city-building-view" data-view="map">Open Map</button>
          <span class="city-workspace__total">Total Rolls: ${formatNumber(totalRolls, 0)}</span>
        </div>
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
        <div class="city-workspace__filters city-workspace__filters--status">
          <button class="button button--ghost city-filter ${statusFilter === "All" ? "is-active" : ""}" data-action="set-building-status-filter" data-filter="All">All States</button>
          <button class="button button--ghost city-filter ${statusFilter === "Active" ? "is-active" : ""}" data-action="set-building-status-filter" data-filter="Active">Active</button>
          <button class="button button--ghost city-filter ${statusFilter === "Incomplete" ? "is-active" : ""}" data-action="set-building-status-filter" data-filter="Incomplete">Incomplete</button>
          <button class="button button--ghost city-filter ${statusFilter === "Available" ? "is-active" : ""}" data-action="set-building-status-filter" data-filter="Available">Available</button>
        </div>
        <div class="city-workspace__filters city-workspace__filters--quick">
          <button class="button button--ghost city-filter ${quickFilter === "All" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="All">All</button>
          <button class="button button--ghost city-filter ${quickFilter === "Pinned" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Pinned">Pinned</button>
          <button class="button button--ghost city-filter ${quickFilter === "Understaffed" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Understaffed">Understaffed</button>
          <button class="button button--ghost city-filter ${quickFilter === "Stalled" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Stalled">Stalled</button>
          <button class="button button--ghost city-filter ${quickFilter === "Consuming Input" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Consuming Input">Needs Input</button>
          <button class="button button--ghost city-filter ${quickFilter === "Produces Gold" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Produces Gold">Gold</button>
          <button class="button button--ghost city-filter ${quickFilter === "Produces Food" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Produces Food">Food</button>
          <button class="button button--ghost city-filter ${quickFilter === "Produces Materials" ? "is-active" : ""}" data-action="set-building-quick-filter" data-filter="Produces Materials">Materials</button>
        </div>
        <label class="city-workspace__sort">
          <span>Sort</span>
          <select data-action="set-building-sort">
            <option value="newest" ${sortKey === "newest" ? "selected" : ""}>Newest First</option>
            <option value="quality" ${sortKey === "quality" ? "selected" : ""}>Highest Quality</option>
            <option value="rarity" ${sortKey === "rarity" ? "selected" : ""}>Highest Rarity</option>
            <option value="impact-gold" ${sortKey === "impact-gold" ? "selected" : ""}>Gold Impact</option>
            <option value="impact-food" ${sortKey === "impact-food" ? "selected" : ""}>Food Impact</option>
            <option value="impact-materials" ${sortKey === "impact-materials" ? "selected" : ""}>Materials Impact</option>
            <option value="impact-mana" ${sortKey === "impact-mana" ? "selected" : ""}>Mana Impact</option>
            <option value="impact-defense" ${sortKey === "impact-defense" ? "selected" : ""}>Defense Impact</option>
            <option value="impact-security" ${sortKey === "impact-security" ? "selected" : ""}>Security Impact</option>
          </select>
        </label>
      </div>

      <section class="city-incubation-strip">
        <div class="city-incubation-strip__head">
          <div>
            <h4>Incubating</h4>
            <span>${formatNumber(incubating.length, 0)} active / ${formatNumber(slots, 0)} slots</span>
          </div>
          <div class="city-incubation-strip__head-actions">
            <small>${queued.length ? `${formatNumber(queued.length, 0)} buildings are reserved in the incubator queue.` : "No buildings are reserved in the incubator queue right now."}</small>
            <div class="city-incubation-strip__buttons">
              <button class="button button--ghost" data-action="pause-all-construction">Pause All</button>
              <button class="button button--ghost" data-action="resume-all-construction">Resume All</button>
            </div>
          </div>
        </div>
        ${
          incubating.length
            ? `
                <div class="city-incubation-strip__list">
                  ${incubating
                    .map(
                      (building, index) => {
                        const etaDetails = getConstructionEtaDetails(building, state);
                        const workforceSupportReadout = Number(etaDetails?.workforceSupportBpd ?? 0) > 0 ? ` / Staff +${formatNumber(etaDetails.workforceSupportBpd, 1)} BPD` : "";
                        const supportMultiplier = Number(etaDetails?.incubatorSupportMultiplier ?? 1);
                        const supportReadout = supportMultiplier > 1 ? ` / Support x${formatNumber(supportMultiplier, 2)}` : "";
                        const supportBonusLabel = building.heroSupport && building.expertSupport ? "+150% Support" : building.heroSupport ? "+100% Support" : building.expertSupport ? "+50% Support" : "";
                        return `
                        <article class="city-incubation-strip__item ${isBuildingActivelyConstructed(state, building.id) ? "is-active" : ""}" title="${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}">
                          <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                          <span>${escapeHtml(formatNumber(building.quality, 1))}% quality</span>
                          <em>Slot ${index + 1}</em>
                          ${supportBonusLabel ? `<div class="incubator-support-badge">${escapeHtml(supportBonusLabel)}</div>` : ""}
                          <small>${etaDetails.isStalled ? `Incubation stalled${supportReadout}` : `${formatNumber(etaDetails.totalBpd, 1)} build points/day${workforceSupportReadout}${supportReadout} / ${formatNumber(etaDetails.dailyPercent, 2)}% quality per day`}</small>
                          <small>${
                            etaDetails.daysRemaining === null
                              ? escapeHtml(etaDetails.stallReasons.join(", ") || "insufficient resources")
                              : `${formatNumber(etaDetails.daysRemaining, 1)} day${etaDetails.daysRemaining === 1 ? "" : "s"} remaining`
                          }</small>
                          <small>${
                            etaDetails.readyDayOffset === null
                              ? "Ready date unavailable"
                              : `Ready ${escapeHtml(formatDate(etaDetails.readyDayOffset))}`
                          }</small>
                          <div class="incubator-support-toggles">
                            <button
                              class="incubator-support-toggle ${building.heroSupport ? "is-active" : ""}"
                              type="button"
                              data-action="toggle-incubator-support"
                              data-building-id="${building.id}"
                              data-support-key="heroSupport"
                              data-enabled="${building.heroSupport ? "true" : "false"}"
                              aria-pressed="${building.heroSupport ? "true" : "false"}"
                            >
                              <span class="incubator-support-toggle__indicator" aria-hidden="true"></span>
                              <span>Hero Support</span>
                            </button>
                            <button
                              class="incubator-support-toggle ${building.expertSupport ? "is-active" : ""}"
                              type="button"
                              data-action="toggle-incubator-support"
                              data-building-id="${building.id}"
                              data-support-key="expertSupport"
                              data-enabled="${building.expertSupport ? "true" : "false"}"
                              aria-pressed="${building.expertSupport ? "true" : "false"}"
                            >
                              <span class="incubator-support-toggle__indicator" aria-hidden="true"></span>
                              <span>Expert Support</span>
                            </button>
                          </div>
                          <button class="button button--ghost" data-action="pause-construction" data-building-id="${building.id}">Cancel Incubation</button>
                        </article>
                      `;
                      }
                    )
                    .join("")}
                </div>
              `
            : renderActionEmptyState(
                "No buildings are incubating",
                "The incubator is where incomplete buildings are actively raised toward readiness, so this panel tells you whether the next part of the city is moving.",
                queued[0]
                  ? `<button class="button button--ghost" data-action="activate-construction" data-building-id="${queued[0].id}">Start Incubation</button>`
                  : waiting[0]
                    ? `<button class="button button--ghost" data-action="activate-construction" data-building-id="${waiting[0].id}">Queue First Building</button>`
                    : `<a class="button button--ghost" href="./forge.html">Create First Building</a>`
              )
        }

        <div class="city-incubation-strip__waiting">
          <h5>Incubator Queue</h5>
          <p class="city-incubation-queue__summary">Up to ${INCUBATOR_QUEUE_LIMIT} reserved buildings wait here and auto-fill the next open incubator slot.</p>
          <div class="city-incubation-queue">
            ${Array.from({ length: INCUBATOR_QUEUE_LIMIT }, (_, index) => {
              const building = queued[index] ?? null;
              const queueIndex = building ? getConstructionQueuePosition(state, building.id) : -1;
              return `
                <article class="city-incubation-queue__slot ${building ? "is-filled" : ""}">
                  <span class="city-incubation-queue__slot-label">Queue Slot ${index + 1}</span>
                  ${
                    building
                      ? `
                          <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                          <small>${escapeHtml(`Construction queue #${queueIndex + 1}. Auto-fills the next open incubator.`)}</small>
                          <div class="city-incubation-queue__actions">
                            <button class="button button--ghost" data-action="prioritize-construction" data-direction="top" data-building-id="${building.id}">Raise Now</button>
                            <button class="button button--ghost" data-action="prioritize-construction" data-direction="up" data-building-id="${building.id}" ${queueIndex <= 0 ? "disabled" : ""}>Up</button>
                            <button class="button button--ghost" data-action="prioritize-construction" data-direction="down" data-building-id="${building.id}" ${queueIndex === constructionQueue.length - 1 ? "disabled" : ""}>Down</button>
                            <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                          </div>
                        `
                      : `
                          <strong>Empty</strong>
                          <small>No building reserved for this slot yet.</small>
                        `
                  }
                </article>
              `;
            }).join("")}
          </div>
        </div>

        <div class="city-incubation-strip__waiting">
          <h5>Available Buildings</h5>
          ${
            waitingEntries.length
              ? `
                  <div class="city-available-buildings">
                    ${waitingEntries
                      .map(({ building, etaDetails }) => {
                        const etaNote =
                          etaDetails.daysRemaining === null
                            ? `Queue ETA unavailable${etaDetails.stallReasons.length ? `: ${etaDetails.stallReasons.join(", ")}` : "."}`
                            : `If queued now: ${formatNumber(etaDetails.daysRemaining, 1)} day${etaDetails.daysRemaining === 1 ? "" : "s"} remaining`;
                        return `
                          <article class="city-available-buildings__item" title="${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}">
                            <div class="city-available-buildings__copy">
                              <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                              <small>${escapeHtml(etaNote)}</small>
                            </div>
                            <div class="city-available-buildings__actions">
                              <button class="button button--ghost" data-action="activate-construction" data-building-id="${building.id}">Queue</button>
                              <button class="button button--ghost" data-action="inspect-building" data-building-id="${building.id}">Open Details</button>
                            </div>
                          </article>
                        `;
                      })
                      .join("")}
                  </div>
                `
              : renderActionEmptyState(
                  "No extra buildings are waiting",
                  "Available buildings are manifested structures that are not yet reserved for incubation, so this list is where you choose what should enter the queue next.",
                  `<a class="button button--ghost" href="./forge.html">Open Forge</a>`
                )
          }
        </div>
      </section>

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
        <article><strong>${formatNumber(state.buildings.length ? state.buildings.reduce((sum, building) => sum + building.quality, 0) / state.buildings.length : 0, 0)}%</strong><span>Average Roll Quality</span></article>
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
        <span class="city-workspace__total">${adminView === "operations" ? "Session clock, queue, and emergencies" : "Stores and district posture"}</span>
      </div>

      ${
        adminView === "operations"
          ? `
              <div class="city-admin-view__grid city-admin-view__grid--operations">
                <section class="city-command-drawer__section">
                  <div class="city-command-drawer__section-head">
                    <span>Session Clock</span>
                    <small>Date, holidays, council timing, and queue</small>
                  </div>
                  ${renderCalendarPanel(state, { showQueue: true, hideControls: true, hideSpeedSelector: true })}
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

export function renderEconomyPage(state) {
  return {
    title: "Economy",
    subtitle: "Town readouts and mayoral direction.",
    content: `
      <section class="city-command-screen">
        ${renderCitySectionNav("economy")}
        ${renderTownStatistics(state)}
        ${renderDriftEvolutionPanel(state)}
        ${renderWorkforcePanel(state)}
        ${renderTownFocusPanel(state, { expanded: true })}
      </section>
    `
  };
}

export function renderCityPage(state) {
  return {
    title: "City",
    subtitle: "Incubation, buildings, and administration.",
    content: `
      <section class="city-command-screen">
        ${renderCitySectionNav("city")}
        ${renderCitySessionControls(state)}
        ${renderCityModes(state)}
      </section>
    `
  };
}
