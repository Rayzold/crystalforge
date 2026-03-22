import { APP_VERSION, BUILD_NOTES, FIREBASE_DEFAULT_REALM_ID } from "../content/Config.js";
import { BUILDING_ROLE_LEGEND, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { CITIZEN_CLASSES, CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER, getCitizenHelpText } from "../content/CitizenConfig.js";
import { RARITY_ORDER } from "../content/Rarities.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate, getStructuredDate } from "../systems/CalendarSystem.js";
import { formatBuildingQualityDisplay } from "../systems/BuildingSystem.js";
import { getActiveConstructionQueue, getAvailableConstructionQueue, getConstructionEtaDetails } from "../systems/ConstructionSystem.js";
import { getMayorAdvice } from "../systems/TownFocusSystem.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { createHelpBubble } from "./HelpBubbles.js";
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
  const publishedBuild = meta?.appVersion ?? APP_VERSION;

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
  const publishedBuild = meta?.appVersion ?? APP_VERSION;

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
  const buildLabel = meta?.appVersion ?? APP_VERSION;

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
                        <span class="player-citizens-summary__label">
                          <span>${escapeHtml(`${CITIZEN_DEFINITIONS[citizenClass]?.emoji ?? "*"} ${citizenClass}`)}</span>
                          ${createHelpBubble(getCitizenHelpText(citizenClass))}
                        </span>
                        <strong>${formatNumber(state.citizens?.[citizenClass] ?? 0, 0)}</strong>
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

function renderBuildingRarityFilters(state) {
  const activeFilter = state.transientUi?.playerBuildingRarityFilter ?? "All";
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
    </section>
  `;
}

function filterBuildingsByRarity(buildings, rarityFilter) {
  if (!rarityFilter || rarityFilter === "All") {
    return buildings;
  }
  return buildings.filter((building) => building.rarity === rarityFilter);
}

function renderManifestedList(title, subtitle, buildings, emptyText, state) {
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
                .map(
                  (building) => `
                    <article class="player-list__item ${state.transientUi?.recentBuildingChanges?.[building.id] ? "is-recently-changed" : ""}">
                      <div class="player-list__copy">
                        <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                      </div>
                      <em>${escapeHtml(formatBuildingQualityDisplay(building))}</em>
                    </article>
                  `
                )
                .join("")}
            </div>
          `
          : `<p class="empty-state">${escapeHtml(emptyText)}</p>`
      }
    </section>
  `;
}

function renderIncubationList(title, subtitle, buildings, emptyText, variant, state) {
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
                  const readyLabel = etaDetails.readyDayOffset === null ? "Unavailable" : formatDate(etaDetails.readyDayOffset);

                  return `
                    <article class="player-list__item ${state.transientUi?.recentBuildingChanges?.[building.id] ? "is-recently-changed" : ""}">
                      <div class="player-list__copy">
                        <strong>${escapeHtml(`${getBuildingEmoji(building)} ${building.displayName}`)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                        <small>${
                          etaDetails.isStalled
                            ? `${formatNumber(building.quality, 0)}% now | Stalled | ${escapeHtml(etaDetails.stallReasons.join(", ") || "insufficient resources")}`
                            : `${formatNumber(building.quality, 0)}% now | ${formatNumber(etaDetails.totalBpd, 1)} bpd | ${formatNumber(etaDetails.dailyPercent, 2)}% per day | ${formatNumber(etaDetails.daysRemaining, 1)}d | Ready ${escapeHtml(readyLabel)}`
                        }</small>
                      </div>
                      <div class="player-list__actions">
                        <em>${formatNumber(building.quality, 0)}%</em>
                        <div class="player-list__actions-row">
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
  const manifested = filterBuildingsByRarity(
    state.buildings.filter((building) => building.isComplete).sort((left, right) => right.quality - left.quality),
    rarityFilter
  );
  const incubating = filterBuildingsByRarity(getActiveConstructionQueue(state), rarityFilter);
  const available = filterBuildingsByRarity(getAvailableConstructionQueue(state), rarityFilter);
  const totalRolls = Object.values(state.crystals ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return {
    title: "Player Screen",
    subtitle: "Available crystals, live manifestation, and the current building roster.",
    content: `
      <section class="player-hero">
        <div>
          <h2>Manifest What The Drift Can Hold</h2>
          <p>The clean shared screen for crystal rolls, existing structures, and active incubation.</p>
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
            <span>Manifested</span>
            <strong>${formatNumber(manifested.length, 0)}</strong>
          </article>
          <article>
            <span>Incubating</span>
            <strong>${formatNumber(incubating.length, 0)}</strong>
          </article>
        </div>
      </section>
      ${renderPlayerSessionBanner(state)}
      ${renderPlayerMayorPriorities(state)}
      ${renderCitizenSummaryToggle(state)}
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      ${renderBuildingRarityFilters(state)}
      ${renderBuildingRolesLegend()}
      <section class="player-lists">
        ${renderManifestedList("Active Buildings", "Manifested and already part of the Drift.", manifested, "No active buildings yet.", state)}
        ${renderIncubationList("Incubating Buildings", "Buildings currently growing inside an incubator slot.", incubating, "Nothing is incubating right now.", "incubating", state)}
      </section>
      ${renderIncubationList("Available Buildings", "Waiting buildings that can be swapped into an incubator.", available, "No waiting buildings are ready to incubate.", "available", state)}
      ${renderBuildNotesPanel(state)}
      ${renderPublishedFooter(state)}
    `
  };
}
