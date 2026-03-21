import { APP_VERSION, FIREBASE_DEFAULT_REALM_ID } from "../content/Config.js";
import { CITIZEN_CLASSES } from "../content/CitizenConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getActiveConstructionQueue, getAvailableConstructionQueue, getConstructionEtaDetails } from "../systems/ConstructionSystem.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderStatusPill(state) {
  const connectionState = state.transientUi?.firebaseConnectionState ?? "idle";
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const publishedRealmId = state.settings?.firebasePublishedRealmId ?? state.settings?.firebaseRealmId ?? FIREBASE_DEFAULT_REALM_ID;
  const statusLabel =
    connectionState === "connected"
      ? "Published realm loaded"
      : connectionState === "disconnected"
        ? "Disconnected"
        : "Shared state pending";

  const timestamp = meta?.updatedAtMs
    ? new Date(meta.updatedAtMs).toLocaleString()
    : "No published timestamp yet";

  return `
    <div class="player-status ${connectionState === "connected" ? "is-connected" : connectionState === "disconnected" ? "is-disconnected" : ""}">
      <strong>${statusLabel}</strong>
      <span>Published realm: ${escapeHtml(String(publishedRealmId))}</span>
      <span>Last published: ${escapeHtml(timestamp)}</span>
      <span>Published build: ${escapeHtml(APP_VERSION)}</span>
    </div>
  `;
}

function renderPublishedFooter(state) {
  const meta = state.transientUi?.firebasePublishedMeta ?? null;
  const publishedRealmId = state.settings?.firebasePublishedRealmId ?? state.settings?.firebaseRealmId ?? FIREBASE_DEFAULT_REALM_ID;
  const timestamp = meta?.updatedAtMs
    ? new Date(meta.updatedAtMs).toLocaleString()
    : "No published timestamp yet";

  return `
    <footer class="player-published-footer">
      <span>Published realm <strong>${escapeHtml(String(publishedRealmId))}</strong></span>
      <span>Last published <strong>${escapeHtml(timestamp)}</strong></span>
      <span>Build <strong>${escapeHtml(APP_VERSION)}</strong></span>
    </footer>
  `;
}

function renderCitizenSummaryToggle(state) {
  const isOpen = Boolean(state.transientUi?.playerCitizensOpen);
  const totalCitizens = CITIZEN_CLASSES.reduce((sum, citizenClass) => sum + Number(state.citizens?.[citizenClass] ?? 0), 0);

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
            <div class="player-citizens-summary__list">
              ${CITIZEN_CLASSES.map((citizenClass) => `
                <article class="player-citizens-summary__item">
                  <span>${escapeHtml(citizenClass)}</span>
                  <strong>${formatNumber(state.citizens?.[citizenClass] ?? 0, 0)}</strong>
                </article>
              `).join("")}
            </div>
          `
          : ""
      }
    </section>
  `;
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
                        <strong>${escapeHtml(building.displayName)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                      </div>
                      <em>x${formatNumber(building.multiplier, 0)}</em>
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
                  const readyLabel = formatDate(etaDetails.readyDayOffset);

                  return `
                    <article class="player-list__item ${state.transientUi?.recentBuildingChanges?.[building.id] ? "is-recently-changed" : ""}">
                      <div class="player-list__copy">
                        <strong>${escapeHtml(building.displayName)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                        <small>${formatNumber(building.quality, 0)}% now · ${formatNumber(etaDetails.daysRemaining, 1)}d if incubated · Ready ${escapeHtml(readyLabel)}</small>
                      </div>
                      <div class="player-list__actions">
                        <em>${formatNumber(building.quality, 0)}%</em>
                        <button class="button button--ghost" data-action="${variant === "incubating" ? "pause-construction" : "activate-construction"}" data-building-id="${building.id}">
                          ${variant === "incubating" ? "Cancel Incubation" : "Use Incubator"}
                        </button>
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
  const manifested = state.buildings
    .filter((building) => building.isComplete)
    .sort((left, right) => right.quality - left.quality);
  const incubating = getActiveConstructionQueue(state);
  const available = getAvailableConstructionQueue(state);
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
      ${renderCitizenSummaryToggle(state)}
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      <section class="player-lists">
        ${renderManifestedList("Active Buildings", "Manifested and already part of the Drift.", manifested, "No active buildings yet.", state)}
        ${renderIncubationList("Incubating Buildings", "Buildings currently growing inside an incubator slot.", incubating, "Nothing is incubating right now.", "incubating", state)}
        ${renderIncubationList("Available Buildings", "Waiting buildings that can be swapped into an incubator.", available, "No waiting buildings are ready to incubate.", "available", state)}
      </section>
      ${renderPublishedFooter(state)}
    `
  };
}
