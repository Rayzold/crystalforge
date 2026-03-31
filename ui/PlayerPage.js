// Public/player-facing presentation page.
// It exposes the shared session state in a simplified read-mostly format with
// manifest choices, incubator controls, active buildings, and table-safe info.
import { APP_DISPLAY_VERSION, BUILD_NOTES, FIREBASE_DEFAULT_REALM_ID } from "../content/Config.js";
import { BUILDING_ROLE_LEGEND, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js";
import { GLOSSARY_TERMS } from "../content/GlossaryConfig.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getNextHoliday, getStructuredDate } from "../systems/CalendarSystem.js";
import { formatBuildingExactQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { getActiveConstructionQueue, getAvailableConstructionQueue, getConstructionEtaDetails } from "../systems/ConstructionSystem.js";
import { getTradeGoodsGoldMultiplier, getCityTrendSummary, getGoodsSummary, getResourceChainSummary } from "../systems/ResourceSystem.js";
import { getFoodOutputMultiplier, getGoldOutputMultiplier } from "../systems/CityConditionSystem.js";
import { getBuildingPlacementBonuses } from "../systems/MapSystem.js";
import { getMayorAdvice } from "../systems/TownFocusSystem.js";
import { applyBuildingWorkforceToResource, getBuildingWorkforceStatus, getBuildingWorkforceMultiplier, getWorkforceSummary } from "../systems/WorkforceSystem.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { createHelpBubble } from "./HelpBubbles.js";
import { getHolidayGlyph, getHolidayTypeClass } from "./HolidayPresentation.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderStatusPill(state) {
  const connectionState = state.transientUi?.firebaseConnectionState ?? "idle";
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const publishedRealmId = state.settings?.firebaseRealmId ?? FIREBASE_DEFAULT_REALM_ID;
  const statusLabel =
    connectionState === "connected"
      ? "Latest Firebase save loaded"
      : connectionState === "disconnected"
        ? "Disconnected"
        : "No Firebase save loaded";

  const timestamp = meta?.updatedAtMs
    ? new Date(meta.updatedAtMs).toLocaleString()
    : "No published timestamp yet";
  const publishedBuild = meta?.appVersion ?? APP_DISPLAY_VERSION;

  return `
    <div class="player-status ${connectionState === "connected" ? "is-connected" : connectionState === "disconnected" ? "is-disconnected" : ""}">
      <strong>${statusLabel}</strong>
      <span>Firebase save: ${escapeHtml(String(publishedRealmId))}</span>
      <span>Last saved: ${escapeHtml(timestamp)}</span>
      <span>Save build: ${escapeHtml(publishedBuild)}</span>
    </div>
  `;
}

function renderPublishedFooter(state) {
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const publishedRealmId = state.settings?.firebaseRealmId ?? FIREBASE_DEFAULT_REALM_ID;
  const timestamp = meta?.updatedAtMs
    ? new Date(meta.updatedAtMs).toLocaleString()
    : "No published timestamp yet";
  const publishedBuild = meta?.appVersion ?? APP_DISPLAY_VERSION;

  return `
    <footer class="player-published-footer">
      <span>Firebase save <strong>${escapeHtml(String(publishedRealmId))}</strong></span>
      <span>Last saved <strong>${escapeHtml(timestamp)}</strong></span>
      <span>Build <strong>${escapeHtml(publishedBuild)}</strong></span>
    </footer>
  `;
}

function renderPlayerSessionBanner(state) {
  const date = getStructuredDate(state.calendar.dayOffset);
  const nextHoliday = getNextHoliday(state.calendar.dayOffset);
  const nextHolidayGlyph = nextHoliday ? getHolidayGlyph(nextHoliday) : "✦";
  const nextHolidayAccentClass = nextHoliday ? getHolidayTypeClass(nextHoliday) : "";
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const timestamp = meta?.updatedAtMs ? new Date(meta.updatedAtMs).toLocaleString() : "No published timestamp yet";

  return `
    <section class="panel player-session-banner">
      <div class="panel__header">
        <div>
          <h3>Session Banner</h3>
          <span class="panel__subtle">The current shared table state at a glance</span>
        </div>
      </div>
      <div class="player-session-banner__grid">
        <article>
          <span>Date</span>
          <strong>${escapeHtml(`${date.weekday}, ${date.month} ${date.day}`)}</strong>
        </article>
        <article>
          <span>Holiday</span>
          <strong>${escapeHtml(date.holiday?.name ?? "None today")}</strong>
        </article>
        <article>
          <span>Weather</span>
          <strong>${escapeHtml(`${date.weather.icon} ${date.weather.name}`)}</strong>
        </article>
        <article>
          <span>Moon</span>
          <strong>${escapeHtml(`${date.moonPhase.icon} ${date.moonPhase.name}`)}</strong>
        </article>
        <article>
          <span>Published</span>
          <strong>${escapeHtml(timestamp)}</strong>
        </article>
      </div>
      <a
        class="player-session-banner__holiday-callout calendar-panel__focus calendar-panel__focus--holiday calendar-panel__focus--link ${nextHolidayAccentClass}"
        href="${nextHoliday ? `./chronicle.html?focusChronicleDay=${nextHoliday.dayOffset}` : "./chronicle.html"}"
        title="${nextHoliday ? `Open Chronicle on ${nextHoliday.name}` : "Open Chronicle"}"
      >
        <strong class="calendar-panel__focus-title"><span class="holiday-glyph" aria-hidden="true">${nextHolidayGlyph}</span>Upcoming Holiday${nextHoliday ? `<em class="holiday-countdown-badge">${nextHoliday.daysUntil === 0 ? "Today" : `${nextHoliday.daysUntil}d`}</em>` : ""}</strong>
        <span>
          ${
            nextHoliday
              ? `${nextHoliday.name} arrives in ${nextHoliday.daysUntil} day(s) on ${nextHoliday.date.weekday}, ${nextHoliday.date.month} ${nextHoliday.date.day}.`
              : "No upcoming holidays found."
          }
        </span>
      </a>
    </section>
  `;
}

function renderPlayerMayorPriorities(state) {
  const advice = getMayorAdvice(state).slice(0, 3);
  return `
    <section class="panel player-mayor-panel">
      <div class="panel__header">
        <div>
          <h3>Mayor's Priorities</h3>
          <span class="panel__subtle">What the city most needs right now</span>
        </div>
      </div>
      <div class="player-mayor-panel__list">
        ${
          advice.length
            ? advice
                .map(
                  (entry) => `
                    <article class="player-mayor-panel__item">
                      <strong>${escapeHtml(entry.title)}</strong>
                      <p>${escapeHtml(entry.detail)}</p>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">The mayor has no urgent priorities right now.</p>`
        }
      </div>
    </section>
  `;
}

function renderBuildingRolesLegend() {
  return `
    <section class="panel building-roles-panel">
      <div class="panel__header">
        <div>
          <h3>Building Roles</h3>
          <span class="panel__subtle">How the main building profiles read at a glance.</span>
        </div>
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

function renderBuildNotesPanel(state) {
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const buildLabel = meta?.appVersion ?? APP_DISPLAY_VERSION;

  return `
    <section class="panel build-notes-panel">
      <div class="panel__header">
        <div>
          <h3>Build Notes</h3>
          <span class="panel__subtle">What changed in ${escapeHtml(buildLabel)}.</span>
        </div>
      </div>
      <ul class="build-notes-panel__list">
        ${BUILD_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderCitizenSummaryToggle(state) {
  const isOpen = Boolean(state.transientUi?.playerCitizensOpen);
  const totalCitizens = CITIZEN_CLASSES.reduce((sum, citizenClass) => sum + Number(state.citizens?.[citizenClass] ?? 0), 0);
  const groupedCitizens = CITIZEN_GROUP_ORDER.map((groupTitle) => ({
    title: groupTitle,
    classes: CITIZEN_CLASSES.filter((citizenClass) => CITIZEN_DEFINITIONS[citizenClass]?.group === groupTitle)
  })).filter((group) => group.classes.length);

  return `
    <section class="panel player-citizens-summary">
      <div class="panel__header">
        <div>
          <h3>Citizen Roster</h3>
          <span class="panel__subtle">A brief shared look at the current population</span>
        </div>
        <button class="button button--ghost" data-action="toggle-player-citizens">${isOpen ? "Hide Citizens" : "Show Citizens"}</button>
      </div>
      <div class="player-citizens-summary__meta">
        <span>Total citizens</span>
        <strong>${formatNumber(totalCitizens, 0)}</strong>
      </div>
      ${
        isOpen
          ? `
            <div class="player-citizens-summary__groups">
              ${groupedCitizens.map((group) => `
                <section class="player-citizens-summary__group">
                  <h4>${escapeHtml(group.title)}</h4>
                  <div class="player-citizens-summary__list">
                    ${group.classes.map((citizenClass) => `
                      <article class="player-citizens-summary__item">
                        <span class="player-citizens-summary__change ${state.transientUi?.recentCitizenChanges?.[citizenClass] ? "is-recently-changed" : ""}">
                        <span class="player-citizens-summary__label">
                          <span>${escapeHtml(`${CITIZEN_DEFINITIONS[citizenClass]?.emoji ?? "*"} ${citizenClass}`)}</span>
                          ${createHelpBubble(getCitizenHelpText(citizenClass))}
                        </span>
                        <strong>${formatNumber(state.citizens?.[citizenClass] ?? 0, 0)}</strong>
                        </span>
                      </article>
                    `).join("")}
                  </div>
                </section>
              `).join("")}
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCityTrendPanel(state) {
  const trends = getCityTrendSummary(state);
  return `
    <section class="panel city-trend-panel">
      <div class="panel__header">
        <div>
          <h3>City Trends</h3>
          <span class="panel__subtle">Daily movement of the shared economy.</span>
        </div>
      </div>
      <div class="city-trend-panel__grid">
        ${trends
          .map(
            (entry) => `
              <article class="city-trend-panel__item city-trend-panel__item--${entry.delta > 0 ? "positive" : entry.delta < 0 ? "negative" : "neutral"} ${state.transientUi?.recentResourceChanges?.[entry.key] ? "is-recently-changed" : ""}">
                <span>${escapeHtml(entry.label)}</span>
                <strong>${entry.delta >= 0 ? "+" : ""}${formatNumber(entry.delta, 2)} / day</strong>
                <small>${escapeHtml(`${entry.trend} / Stock ${formatNumber(entry.stock, 0)} / ${entry.detail}`)}</small>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPlayerGoodsPanel(state) {
  const goodsSummary = getGoodsSummary(state);
  return `
    <section class="panel player-goods-panel">
      <div class="panel__header">
        <div>
          <h3>Goods and Trade</h3>
          <span class="panel__subtle">Trade goods amplify gold from trade-tagged structures.</span>
        </div>
      </div>
      <div class="town-statistics__grid town-statistics__grid--compact">
        <article class="town-statistics__card town-statistics__card--goods">
          <div class="town-statistics__card-head">
            <span>Goods</span>
          </div>
          <strong>${formatNumber(goodsSummary.total, 1)}</strong>
        </article>
        <article class="town-statistics__card town-statistics__card--positive">
          <div class="town-statistics__card-head">
            <span>Trade Gold</span>
          </div>
          <strong>x${formatNumber(goodsSummary.multiplier, 2)}</strong>
        </article>
      </div>
      <div class="panel__subtle">
        Base ${formatNumber(goodsSummary.base, 1)} / GM ${goodsSummary.gmOverride >= 0 ? "+" : ""}${formatNumber(goodsSummary.gmOverride, 1)}.
        ${goodsSummary.multiplier > 1 ? ` Trade-tagged gold buildings are earning ${formatNumber((goodsSummary.multiplier - 1) * 100, 0)}% bonus gold.` : " Trade-tagged gold buildings gain their first bonus at 20 goods."}
        ${goodsSummary.toNextThreshold > 0 ? ` ${formatNumber(goodsSummary.toNextThreshold, 1)} more goods reaches the next step.` : ""}
      </div>
    </section>
  `;
}

function renderResourceChainPanel(state) {
  const chains = getResourceChainSummary(state);
  return `
    <section class="panel resource-chain-panel">
      <div class="panel__header">
        <div>
          <h3>Resource Chain</h3>
          <span class="panel__subtle">Who gathers, who refines, and who turns it into gold.</span>
        </div>
      </div>
      <div class="resource-chain-panel__grid">
        ${chains.map((chain) => `
          <article class="resource-chain-panel__item">
            <strong>${escapeHtml(chain.title)}</strong>
            <small>${escapeHtml(chain.detail)}</small>
            <p>${escapeHtml(chain.buildings.length ? chain.buildings.map((building) => building.displayName).slice(0, 6).join(", ") : "No current buildings fill this role.")}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGlossaryPanel() {
  return `
    <section class="panel glossary-panel">
      <div class="panel__header">
        <div>
          <h3>Rules Glossary</h3>
          <span class="panel__subtle">Short explanations of the most important city terms.</span>
        </div>
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

function renderBuildingRarityFilters(state) {
  const activeFilter = state.transientUi?.playerBuildingRarityFilter ?? "All";
  const hideCompleted = Boolean(state.transientUi?.playerHideCompleted);
  const options = ["All", ...RARITY_ORDER];

  return `
    <section class="panel player-building-toolbar">
      <div class="panel__header">
        <div>
          <h3>Building Filter</h3>
          <span class="panel__subtle">Filter the player roster by rarity across active, incubating, and available structures.</span>
        </div>
      </div>
      <div class="player-building-toolbar__buttons">
        ${options
          .map(
            (rarity) => `
              <button
                class="button ${activeFilter === rarity ? "" : "button--ghost"}"
                data-action="set-player-building-rarity-filter"
                data-rarity="${escapeHtml(rarity)}"
              >
                ${escapeHtml(rarity)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="player-building-toolbar__buttons player-building-toolbar__buttons--secondary">
        <button class="button ${hideCompleted ? "" : "button--ghost"}" data-action="toggle-player-hide-completed">
          ${hideCompleted ? "Showing Incubation Only" : "Hide Completed Buildings"}
        </button>
      </div>
    </section>
  `;
}

function filterBuildingsByRarity(buildings, rarityFilter) {
  if (!rarityFilter || rarityFilter === "All") {
    return buildings;
  }
  return buildings.filter((building) => building.rarity === rarityFilter);
}

function getQualityMultiplierReadout(building) {
  const multiplier = getBuildingMultiplier(building?.quality ?? 0);
  return `${formatBuildingExactQualityDisplay(building)}${multiplier > 1 ? ` · ${multiplier}x` : ""}`;
}

function getPlayerEffectiveRateSummary(building, state, workforceSummary) {
  const workforceMultiplier = getBuildingWorkforceMultiplier(building, workforceSummary);
  const placementMultiplier = 1 + getBuildingPlacementBonuses(state, building).totalPercent;
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);
  const entries = Object.entries(building.resourceRates ?? {})
    .map(([resource, value]) => {
      let nextValue = applyBuildingWorkforceToResource(value, workforceMultiplier) * building.multiplier * placementMultiplier;
      if (resource === "gold" && nextValue > 0 && building.tags?.includes("trade")) {
        nextValue *= tradeGoodsGoldMultiplier;
      }
      if (resource === "gold" && nextValue > 0) {
        nextValue *= goldOutputMultiplier;
      }
      if (resource === "food" && nextValue > 0) {
        nextValue *= foodOutputMultiplier;
      }
      return [resource, nextValue];
    })
    .filter(([, value]) => Math.abs(value) > 0.05)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 2)
    .map(([resource, value]) => `${resource} ${value >= 0 ? "+" : ""}${formatNumber(value, 1)}`);

  return entries.length ? entries.join(" / ") : "No strong daily flow";
}

function renderManifestedList(title, subtitle, buildings, emptyText, state) {
  const workforceSummary = getWorkforceSummary(state);
  return `
    <section class="panel player-list player-list--manifested">
      <div class="panel__header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <span class="panel__subtle">${escapeHtml(subtitle)}</span>
        </div>
      </div>
      ${
        buildings.length
          ? `
            <div class="player-list__items">
              ${buildings
                .map((building) => {
                  const workforceStatus = getBuildingWorkforceStatus(building, workforceSummary);
                  const effectiveRateSummary = getPlayerEffectiveRateSummary(building, state, workforceSummary);
                  return `
                    <article class="player-list__item ${state.transientUi?.recentBuildingChanges?.[building.id] ? "is-recently-changed" : ""}" title="${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}">
                      <div class="player-list__copy">
                        <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                        ${workforceStatus.totalMultiplier < 0.999 ? `<div class="player-list__badges"><span class="status-badge status-badge--warning">Understaffed</span></div>` : ""}
                        <small>Effective flow: ${escapeHtml(effectiveRateSummary)} | Workforce x${formatNumber(workforceStatus.totalMultiplier ?? 1, 2)}</small>
                      </div>
                      <em>${escapeHtml(getQualityMultiplierReadout(building))}</em>
                    </article>
                  `;
                })
                .join("")}
            </div>
          `
          : `<p class="empty-state">${escapeHtml(emptyText)}</p>`
      }
    </section>
  `;
}

function renderIncubationList(title, subtitle, buildings, emptyText, variant, state) {
  const workforceSummary = getWorkforceSummary(state);
  return `
    <section class="panel player-list player-list--${variant}">
      <div class="panel__header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <span class="panel__subtle">${escapeHtml(subtitle)}</span>
        </div>
      </div>
      ${
        buildings.length
          ? `
            <div class="player-list__items">
              ${buildings
                .map((building) => {
                  const etaDetails = getConstructionEtaDetails(building, state);
                  const workforceStatus = getBuildingWorkforceStatus(building, workforceSummary);
                  const readyLabel = etaDetails.readyDayOffset === null ? "Unavailable" : formatDate(etaDetails.readyDayOffset);
                  const workforceSupportReadout = Number(etaDetails?.workforceSupportBpd ?? 0) > 0 ? ` | Staff +${formatNumber(etaDetails.workforceSupportBpd, 1)} BPD` : "";
                  const supportMultiplier = Number(etaDetails?.incubatorSupportMultiplier ?? 1);
                  const supportReadout = supportMultiplier > 1 ? ` | Support x${formatNumber(supportMultiplier, 2)}` : "";
                  const supportBonusLabel = building.heroSupport && building.expertSupport ? "+150% Support" : building.heroSupport ? "+100% Support" : building.expertSupport ? "+50% Support" : "";

                  return `
                    <article class="player-list__item ${state.transientUi?.recentBuildingChanges?.[building.id] ? "is-recently-changed" : ""}" title="${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}">
                      <div class="player-list__copy">
                        <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                        ${workforceStatus.totalMultiplier < 0.999 ? `<div class="player-list__badges"><span class="status-badge status-badge--warning">Understaffed</span></div>` : ""}
                        ${supportBonusLabel ? `<div class="player-list__badges"><span class="incubator-support-badge">${escapeHtml(supportBonusLabel)}</span></div>` : ""}
                        <small>${
                          etaDetails.isStalled
                            ? `${formatNumber(building.quality, 0)}% quality now | Stalled | Why: ${escapeHtml(etaDetails.stallReasons.join(", ") || "insufficient resources")}`
                            : `${formatNumber(building.quality, 0)}% quality now | ${formatNumber(etaDetails.totalBpd, 1)} build points/day${workforceSupportReadout}${supportReadout} | ${formatNumber(etaDetails.dailyPercent, 2)}% quality per day | ${formatNumber(etaDetails.daysRemaining, 1)}d | Ready ${escapeHtml(readyLabel)}`
                        }</small>
                      </div>
                      <div class="player-list__actions">
                        <em>${formatNumber(building.quality, 0)}%</em>
                        <div class="player-list__actions-row">
                          ${
                            variant === "incubating"
                              ? `
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
                              `
                              : ""
                          }
                          <button class="button button--ghost" data-action="${variant === "incubating" ? "pause-construction" : "activate-construction"}" data-building-id="${building.id}">
                            ${variant === "incubating" ? "Cancel Incubation" : "Use Incubator"}
                          </button>
                          ${
                            variant === "incubating" && state.ui.adminUnlocked
                              ? `
                                <button class="button" data-action="manifest-building-now" data-building-id="${building.id}">
                                  Manifest Now
                                </button>
                              `
                              : ""
                          }
                        </div>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </div>
          `
          : `<p class="empty-state">${escapeHtml(emptyText)}</p>`
      }
    </section>
  `;
}

export function renderPlayerPage(state) {
  const rarityFilter = state.transientUi?.playerBuildingRarityFilter ?? "All";
  const hideCompleted = Boolean(state.transientUi?.playerHideCompleted);
  const manifested = filterBuildingsByRarity(
    state.buildings.filter((building) => building.isComplete).sort((left, right) => right.quality - left.quality),
    rarityFilter
  );
  const incubating = filterBuildingsByRarity(getActiveConstructionQueue(state), rarityFilter);
  const available = filterBuildingsByRarity(getAvailableConstructionQueue(state), rarityFilter);
  const totalRolls = Object.values(state.crystals ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return {
    title: "Player Screen",
    subtitle: "Shared player view.",
    content: `
      <section class="player-hero">
        <div>
          <h2>Manifest What The Drift Can Hold</h2>
          <p>Crystal rolls and active structures.</p>
          ${renderStatusPill(state)}
          <div class="player-lock-note">
            <strong>Player-safe view</strong>
            <span>GM tools, save controls, admin unlocks, and review panels stay hidden here.</span>
          </div>
        </div>
        <div class="player-hero__meta">
          <article>
            <span>Available Crystals</span>
            <strong>${formatNumber(totalRolls, 0)}</strong>
          </article>
          <article>
            <span>Active</span>
            <strong>${hideCompleted ? "Hidden" : formatNumber(manifested.length, 0)}</strong>
          </article>
          <article>
            <span>Incubating</span>
            <strong>${formatNumber(incubating.length, 0)}</strong>
          </article>
        </div>
      </section>
      ${renderPlayerSessionBanner(state)}
      ${renderCityTrendPanel(state)}
      ${renderPlayerGoodsPanel(state)}
      ${renderPlayerMayorPriorities(state)}
      ${renderCitizenSummaryToggle(state)}
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      ${renderBuildingRarityFilters(state)}
      ${renderResourceChainPanel(state)}
      <section class="player-lists">
        ${hideCompleted ? "" : renderManifestedList("Active Buildings", "Completed and already part of the Drift.", manifested, "No active buildings yet.", state)}
        ${renderIncubationList("Incubating Buildings", "Buildings currently growing inside an incubator slot.", incubating, "Nothing is incubating right now.", "incubating", state)}
      </section>
      ${renderIncubationList("Available Buildings", "Waiting buildings that can be swapped into an incubator.", available, "No waiting buildings are ready to incubate.", "available", state)}
      ${renderPublishedFooter(state)}
    `
  };
}
