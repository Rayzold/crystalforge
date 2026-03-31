import { APP_DISPLAY_VERSION, MASCOT_MEDIA, PAGE_ROUTES } from "../content/Config.js";
import { getBuildingEmoji } from "../content/BuildingCatalog.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { formatBuildingExactQualityDisplay, formatBuildingQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import { getActiveConstructionQueue, getAvailableConstructionQueue, getConstructionEtaDetails } from "../systems/ConstructionSystem.js";
import { getDecisionHistory, getDecisionInboxItems } from "../systems/DecisionInboxSystem.js";
import { getCityTrendSummary } from "../systems/ResourceSystem.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";
import { getCurrentTownFocus, getMayorAdvice, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { getCriticalAlerts, renderCrisisBanner } from "./CrisisBanner.js";
import { renderTownFocusBadge } from "./TownFocusShared.js";
import { renderUiIcon } from "./UiIcons.js";

const HUD_ICON_KEYS = {
  Gold: "gold",
  Food: "food",
  Materials: "materials",
  Salvage: "salvage",
  Mana: "mana",
  Population: "population",
  Prosperity: "prosperity",
  Council: "calendar"
};

const ROUTE_GLYPHS = {
  home: "\u{1F3E0}",
  forge: "\u{1F48E}",
  economy: "\u{1F4CA}",
  city: "\u{1F3D9}\uFE0F",
  citizens: "\u{1F465}",
  expeditions: "\u{1F9ED}",
  vehicles: "\u{1F69A}",
  uniques: "\u2728",
  chronicle: "\u{1F4DC}",
  help: "\u2754"
};

const ROUTE_SHORTCUTS = {
  home: "1",
  forge: "2",
  economy: "3",
  city: "4",
  citizens: "5",
  chronicle: "6",
  expeditions: "7",
  vehicles: "8",
  uniques: "9",
  help: "0"
};

const DICE_TYPES = ["d2", "d4", "d6", "d8", "d10", "d12", "d20", "d100"];
const RESOURCE_CHROME_PAGES = new Set(["city", "economy"]);
const BUILDING_STATUS_PAGES = new Set(["city", "economy"]);
const RESOURCE_BREAKDOWN_KEYS = new Set(["gold", "food", "materials", "salvage", "mana", "population", "prosperity"]);
const UI_DENSITY_OPTIONS = [
  { id: "comfort", label: "Comfort" },
  { id: "compact", label: "Compact" },
  { id: "dense", label: "Dense" }
];

function formatSidebarEtaDays(daysRemaining) {
  if (!Number.isFinite(daysRemaining)) {
    return "";
  }
  const decimals = Math.abs(daysRemaining - Math.round(daysRemaining)) < 0.05 ? 0 : 1;
  return `${formatNumber(daysRemaining, decimals)}d`;
}

function orderSidebarBuildings(state, buildings = []) {
  const pinnedIds = new Set(state.settings?.pinnedBuildingIds ?? []);
  return [...buildings].sort((left, right) => {
    const pinDelta = Number(pinnedIds.has(right.id)) - Number(pinnedIds.has(left.id));
    if (pinDelta !== 0) {
      return pinDelta;
    }
    return right.quality - left.quality;
  });
}

function renderDiceHistory(history = []) {
  if (!history.length) {
    return `<p class="sidebar-dice__empty">No recent rolls yet.</p>`;
  }

  return `
    <div class="sidebar-dice__history-list">
      ${history
        .map(
          (entry) => `
            <div class="sidebar-dice__history-item">
              <strong>${escapeHtml(entry.label ?? "")}</strong>
              <span>${escapeHtml((entry.results ?? []).join(", "))}</span>
              <em>Total ${formatNumber(entry.total ?? 0)}</em>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSidebarEmptyState(title, detail, href, cta) {
  return `
    <div class="empty-state empty-state--action sidebar-manifest-list__empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      <a class="button button--ghost" href="${href}">${escapeHtml(cta)}</a>
    </div>
  `;
}

function renderSidebarBuildingList(state, title, items, emptyLabel, variant = "active") {
  const emptyStateByVariant = {
    active: renderSidebarEmptyState(
      `No ${title.toLowerCase()} buildings`,
      "Active buildings are the structures currently powering your economy, defenses, and city bonuses.",
      "./city.html",
      "Open City"
    ),
    incubating: renderSidebarEmptyState(
      `No ${title.toLowerCase()} buildings`,
      "Incubating buildings are the next structures the Drift is actively raising toward completion.",
      "./city.html",
      "Manage Incubation"
    ),
    available: renderSidebarEmptyState(
      `No ${title.toLowerCase()} buildings`,
      "Available buildings are manifested structures waiting to be queued into the incubator flow.",
      "./forge.html",
      "Open Forge"
    )
  };

  return `
    <section class="sidebar-manifest-list sidebar-manifest-list--${variant}">
      <div class="sidebar-manifest-list__head">
        <strong>${escapeHtml(title)}</strong>
        <span>${formatNumber(items.length, 0)}</span>
      </div>
      ${
        items.length
          ? `
              <div class="sidebar-manifest-list__items">
                ${items
                  .map(
                    (building) => {
                      const etaDetails = variant === "incubating" ? getConstructionEtaDetails(building, state) : null;
                      const readyLabel =
                        etaDetails && etaDetails.readyDayOffset !== null
                          ? `Ready on ${formatDate(etaDetails.readyDayOffset)}`
                          : "Ready date unavailable";
                      const isRecentlyChanged = Boolean(state.transientUi?.recentBuildingChanges?.[building.id]);
                      const emoji = getBuildingEmoji(building);
                      return `
                      <div class="sidebar-manifest-list__item ${isRecentlyChanged ? "is-recently-changed" : ""}" title="${escapeHtml(`${emoji} ${building.displayName}`)}">
                        <span>${escapeHtml(`${state.settings?.pinnedBuildingIds?.includes(building.id) ? "📌 " : ""}${emoji} ${building.displayName}`)}</span>
                        <div class="sidebar-manifest-list__meta">
                          <em>${escapeHtml(
                            variant === "active"
                              ? `${formatBuildingExactQualityDisplay(building)}${getBuildingMultiplier(building.quality) > 1 ? ` · ${getBuildingMultiplier(building.quality)}x` : ""}`
                              : formatBuildingExactQualityDisplay(building)
                          )}</em>
                          ${
                            etaDetails
                              ? `<small class="sidebar-manifest-list__eta" data-ready-label="${escapeHtml(readyLabel)}" title="${escapeHtml(readyLabel)}" tabindex="0">${formatSidebarEtaDays(etaDetails.daysRemaining)}</small>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                    }
                  )
                  .join("")}
              </div>
            `
          : emptyStateByVariant[variant] ?? `<p class="sidebar-manifest-list__empty">${escapeHtml(emptyLabel)}</p>`
      }
    </section>
  `;
}

function renderResourceDeltaStrip(state) {
  const deltas = getCityTrendSummary(state).filter((entry) => ["gold", "food", "materials", "salvage", "mana"].includes(entry.key));
  const resourceValues = {
    gold: state.resources.gold ?? 0,
    food: state.resources.food ?? 0,
    materials: state.resources.materials ?? 0,
    salvage: state.resources.salvage ?? 0,
    mana: state.resources.mana ?? 0
  };
  return `
    <section class="page-delta-strip" aria-label="Daily resource deltas">
      ${deltas
        .map(
          (entry) => `
            <button
              class="page-delta-strip__item page-delta-strip__item--button page-delta-strip__item--${entry.delta > 0 ? "positive" : entry.delta < 0 ? "negative" : "neutral"} ${state.transientUi?.recentResourceChanges?.[entry.key] ? "is-recently-changed" : ""}"
              type="button"
              data-action="open-resource-breakdown"
              data-resource-key="${entry.key}"
            >
              <div class="page-delta-strip__head">
                ${renderUiIcon(entry.key, entry.label)}
                <span>${escapeHtml(entry.label)}</span>
              </div>
              <strong>${formatNumber(resourceValues[entry.key] ?? 0, 0)}</strong>
              <small>${entry.delta >= 0 ? "+" : ""}${formatNumber(entry.delta, 2)} / day</small>
            </button>
          `
        )
        .join("")}
    </section>
  `;
}

function renderDensityControls(currentDensity = "compact") {
  return `
    <div class="sidebar-density-picker">
      <div class="sidebar-density-picker__copy">
        <span>Density</span>
        <strong>${escapeHtml(UI_DENSITY_OPTIONS.find((option) => option.id === currentDensity)?.label ?? "Compact")}</strong>
      </div>
      <div class="sidebar-density-picker__buttons" role="group" aria-label="UI density">
        ${UI_DENSITY_OPTIONS.map(
          (option) => `
            <button
              class="button button--ghost sidebar-density-picker__button ${currentDensity === option.id ? "is-active" : ""}"
              type="button"
              data-action="set-ui-density"
              data-density="${option.id}"
              aria-pressed="${currentDensity === option.id ? "true" : "false"}"
            >
              ${escapeHtml(option.label)}
            </button>
          `
        ).join("")}
      </div>
    </div>
  `;
}

function renderCommandStripAction(item) {
  const body = `
    <div class="page-command-strip__action-copy">
      <span>${renderUiIcon(item.icon ?? "route", item.title)}${escapeHtml(item.title)}</span>
      <strong>${escapeHtml(item.detail)}</strong>
    </div>
    <em>${escapeHtml(item.cta)}</em>
  `;

  if (item.action) {
    return `
      <button class="page-command-strip__action" type="button" data-action="${item.action}">
        ${body}
      </button>
    `;
  }

  return `
    <a class="page-command-strip__action" href="${item.href}">
      ${body}
    </a>
  `;
}

function renderDecisionInboxItem(item) {
  const urgencyLabel = item.urgency === "critical" ? "Critical" : item.urgency === "high" ? "High" : item.urgency === "medium" ? "Medium" : "Low";
  return `
    <article class="page-command-strip__decision page-command-strip__decision--${escapeHtml(item.urgency ?? "medium")} ${item.snoozed ? "is-snoozed" : ""}">
      <div class="page-command-strip__decision-head">
        <span>${renderUiIcon(item.iconKey ?? "route", item.title)}${escapeHtml(item.title)}</span>
        <div class="page-command-strip__decision-badges">
          <em class="page-command-strip__decision-badge">${escapeHtml(urgencyLabel)}</em>
          ${item.blocking ? `<em class="page-command-strip__decision-badge is-blocking">Blocking</em>` : ""}
          ${item.snoozed ? `<em class="page-command-strip__decision-badge is-snoozed">Snoozed ${formatNumber(item.snoozeRemainingDays ?? 0, 0)}d</em>` : ""}
        </div>
      </div>
      <strong>${escapeHtml(item.detail)}</strong>
      <div class="page-command-strip__decision-actions">
        <button class="button ${item.snoozed ? "button--ghost" : ""}" type="button" data-action="resolve-decision-item" data-decision-id="${escapeHtml(item.id)}">
          ${escapeHtml(item.cta ?? "Resolve")}
        </button>
        ${
          item.snoozeable === false
            ? ""
            : item.snoozed
              ? `<button class="button button--ghost" type="button" data-action="clear-decision-snooze" data-decision-id="${escapeHtml(item.id)}">Unsnooze</button>`
              : `<button class="button button--ghost" type="button" data-action="snooze-decision-item" data-decision-id="${escapeHtml(item.id)}">Snooze</button>`
        }
      </div>
    </article>
  `;
}

function getDecisionHistoryKindLabel(kind) {
  switch (kind) {
    case "journey":
      return "Journey";
    case "council":
      return "Council";
    case "assignment":
      return "Assignment";
    case "slot":
      return "Relic";
    case "snoozed":
      return "Snoozed";
    case "unsnoozed":
      return "Reopened";
    default:
      return "Decision";
  }
}

function renderDecisionHistory(history = []) {
  if (!history.length) {
    return "";
  }

  return `
    <div class="page-command-strip__history">
      <div class="page-command-strip__history-head">
        <span>Decision History</span>
        <strong>Recent answers</strong>
      </div>
      <div class="page-command-strip__history-list">
        ${history
          .map(
            (entry) => `
              <article class="page-command-strip__history-item">
                <div class="page-command-strip__history-copy">
                  <span>${renderUiIcon(entry.iconKey ?? "route", entry.title)}${escapeHtml(getDecisionHistoryKindLabel(entry.kind))}</span>
                  <strong>${escapeHtml(entry.title)}</strong>
                  <p>${escapeHtml(entry.outcome || entry.detail || "Decision updated.")}</p>
                </div>
                <em>${escapeHtml(entry.date ?? "")}</em>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderGlobalCommandStrip(state, townFocusAvailability, pageKey) {
  const allDecisionItems = getDecisionInboxItems(state, pageKey, { includeSnoozed: true });
  const decisionHistory = getDecisionHistory(state, 4);
  const showSnoozed = state.transientUi?.decisionInboxShowSnoozed === true;
  const activeDecisionItems = allDecisionItems.filter((item) => !item.snoozed);
  const snoozedDecisionItems = allDecisionItems.filter((item) => item.snoozed);
  const visibleDecisionItems = showSnoozed ? allDecisionItems : activeDecisionItems;
  const mayorAdvice = getMayorAdvice(state).slice(0, 2);

  return `
    <section class="page-command-strip">
      <article class="page-command-strip__section ${activeDecisionItems.length ? "is-attention" : ""}">
        <div class="page-command-strip__section-head">
          <div>
            <span>Pending Decisions</span>
            <strong>${activeDecisionItems.length ? `${formatNumber(activeDecisionItems.length, 0)} active` : "Clear"}</strong>
          </div>
          <div class="page-command-strip__section-tools">
            ${
              activeDecisionItems.length
                ? `<button class="button button--ghost" type="button" data-action="resolve-next-decision">Resolve Next</button>`
                : ""
            }
            ${
              snoozedDecisionItems.length
                ? `<button class="button button--ghost" type="button" data-action="toggle-decision-snoozed">${
                    showSnoozed ? "Hide Snoozed" : `Show Snoozed (${formatNumber(snoozedDecisionItems.length, 0)})`
                  }</button>`
                : ""
            }
          </div>
          <small>${
            activeDecisionItems.length
              ? "This queue ranks blocking items, live problems, and assignable opportunities in one place."
              : snoozedDecisionItems.length
                ? "Nothing is active right now. Some decisions are snoozed and will return to the queue later."
                : townFocusAvailability.isSelectionPending
                  ? "A new council choice is ready."
                  : `Nothing is blocking progress right now. Next council in ${formatNumber(townFocusAvailability.daysUntilCouncil, 0)} day(s).`
          }</small>
        </div>
        <div class="page-command-strip__list">
          ${
            visibleDecisionItems.length
              ? visibleDecisionItems.map((item) => renderDecisionInboxItem(item)).join("")
              : `
                  <article class="page-command-strip__status">
                    ${renderUiIcon("completed", "All clear")}
                    <div>
                      <strong>No pending decisions</strong>
                      <p>Journeys, council picks, and other high-priority choices will surface here the moment they need you.</p>
                    </div>
                  </article>
                `
          }
        </div>
        ${renderDecisionHistory(decisionHistory)}
      </article>
      <article class="page-command-strip__section">
        <div class="page-command-strip__section-head">
          <div>
            <span>Next Actions</span>
            <strong>Mayor's short list</strong>
          </div>
          <small>These are the fastest useful next moves from anywhere in the app.</small>
        </div>
        <div class="page-command-strip__list">
          ${
            mayorAdvice.length
              ? mayorAdvice
                  .map(
                    (entry) => `
                      <a class="page-command-strip__action" href="${entry.href}">
                        <div class="page-command-strip__action-copy">
                          <span>${renderUiIcon("route", entry.title)}${escapeHtml(entry.title)}</span>
                          <strong>${escapeHtml(entry.detail)}</strong>
                        </div>
                        <em>${escapeHtml(entry.cta)}</em>
                      </a>
                    `
                  )
                  .join("")
              : `
                  <article class="page-command-strip__status">
                    ${renderUiIcon("completed", "Stable")}
                    <div>
                      <strong>The mayor has no urgent asks</strong>
                      <p>The city is relatively balanced right now, so use this moment to review Economy or Chronicle at your own pace.</p>
                    </div>
                  </article>
                `
          }
        </div>
      </article>
    </section>
  `;
}

function renderSidebarRouteGroup(routes, pageKey, cityAlertCount, availableCrystalCount, expeditionCount, uniqueCitizenCount) {
  return routes
    .map((route) => {
      let badge = "";
      if (route.key === "city" && cityAlertCount) {
        badge = `<em class="sidebar-link__badge">${cityAlertCount}</em>`;
      } else if (route.key === "forge" && availableCrystalCount > 0) {
        badge = `<em class="sidebar-link__badge">${availableCrystalCount}</em>`;
      } else if (route.key === "expeditions" && expeditionCount > 0) {
        badge = `<em class="sidebar-link__badge">${expeditionCount}</em>`;
      } else if (route.key === "uniques" && uniqueCitizenCount > 0) {
        badge = `<em class="sidebar-link__badge">${uniqueCitizenCount}</em>`;
      }

      return `
        <a
          class="sidebar-link ${route.key === pageKey ? "is-active" : ""}"
          href="${route.href}"
          data-short="${route.label.slice(0, 2).toUpperCase()}"
          data-glyph="${ROUTE_GLYPHS[route.key] ?? "\u2022"}"
          title="${escapeHtml(ROUTE_SHORTCUTS[route.key] ? `${route.label} (${ROUTE_SHORTCUTS[route.key]})` : route.label)}"
        >
          <span class="sidebar-link__label">
            <span class="sidebar-link__emoji">${ROUTE_GLYPHS[route.key] ?? "\u2022"}</span>
            <span>${route.label}</span>
          </span>
          ${badge}
        </a>
      `
    })
    .join("");
}

export function renderPageShell(state, pageKey, { title, subtitle, content, aside = "" }, overlays = "") {
  if (pageKey === "player") {
    return `
      <div class="game-shell game-shell--player game-shell--density-${state.settings?.uiDensity ?? "compact"} game-shell--theme-dark ${state.transientUi?.projectorMode ? "game-shell--projector" : ""} ${state.transientUi?.projectorChromeHidden ? "game-shell--projector-hidden" : ""}">
        <main class="page-stage page-stage--player">
          <header class="player-stage__header">
            <div class="player-stage__brand">
              <span>Crystal Forge</span>
              <strong>Shared Table Screen</strong>
            </div>
            <div class="player-stage__actions">
              <button class="player-stage__return ${state.transientUi?.projectorMode ? "is-active" : ""}" type="button" data-action="toggle-projector-mode">Projector Mode</button>
              <button class="player-stage__return" type="button" data-action="enter-fullscreen">Fullscreen</button>
              <a class="player-stage__return" href="./gm.html">Return to GM Mode</a>
              <button class="page-build-tag page-build-tag--player" type="button" data-action="open-build-notes" aria-label="Open build notes">${APP_DISPLAY_VERSION}</button>
            </div>
          </header>
          ${content}
        </main>
        ${overlays}
      </div>
    `;
  }

  const manualSaveMeta = getManualSaveMeta();
  const townFocusAvailability = getTownFocusAvailability(state);
  const currentFocus = getCurrentTownFocus(state);
  const showResourceChrome = RESOURCE_CHROME_PAGES.has(pageKey);
  const showBuildingStatus = BUILDING_STATUS_PAGES.has(pageKey);
  const cityAlertCount = getCriticalAlerts(state).length;
  const availableCrystalCount = Object.values(state.crystals ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const expeditionCount = (state.expeditions?.active?.length ?? 0) + (state.expeditions?.pending?.length ?? 0);
  const uniqueCitizenCount = state.uniqueCitizens?.length ?? 0;
  const coreRoutes = PAGE_ROUTES.filter((route) => ["home", "forge", "economy", "city"].includes(route.key));
  const managementRoutes = PAGE_ROUTES.filter((route) => ["citizens", "expeditions", "vehicles", "uniques", "chronicle", "help"].includes(route.key));
  const manifestedBuildings = orderSidebarBuildings(state, state.buildings.filter((building) => building.isComplete));
  const incubatingBuildings = orderSidebarBuildings(state, getActiveConstructionQueue(state));
  const availableBuildings = orderSidebarBuildings(state, getAvailableConstructionQueue(state));
  const firebaseMeta = state.transientUi?.firebasePublishedMeta ?? null;
  const summary = [
    ["Gold", state.resources.gold],
    ["Food", state.resources.food],
    ["Materials", state.resources.materials],
    ["Salvage", state.resources.salvage ?? 0],
    ["Mana", state.resources.mana],
    ["Population", state.resources.population],
    ["Prosperity", state.resources.prosperity],
    [
      "Council",
      townFocusAvailability.isSelectionPending
        ? "Focus Due"
        : `${townFocusAvailability.daysUntilCouncil}d`,
      townFocusAvailability.isSelectionPending
        ? "hud-ribbon__item is-attention"
        : "hud-ribbon__item",
      townFocusAvailability.isSelectionPending
        ? "Choose a new town focus now."
        : `Next council ${formatDate(townFocusAvailability.nextSelectionDayOffset)}`
    ]
  ];

  const diceAmount = Math.max(1, Math.min(20, Number(state.settings.diceAmount ?? 1) || 1));
  const diceType = DICE_TYPES.includes(state.settings.diceType) ? state.settings.diceType : "d20";
  const lastDiceRoll = state.settings.lastDiceRoll ?? null;
  const uiDensity = UI_DENSITY_OPTIONS.some((option) => option.id === state.settings?.uiDensity) ? state.settings.uiDensity : "compact";
  return `
    <div class="game-shell game-shell--density-${uiDensity} game-shell--page-${pageKey} ${currentFocus ? `game-shell--focus-${currentFocus.id}` : ""} ${state.settings.liveSessionView ? "game-shell--live-session" : ""} game-shell--theme-${state.settings.theme ?? "dark"}">
      ${
        MASCOT_MEDIA?.enabled
          ? `
              <div class="mascot-backdrop" aria-hidden="true">
                <div class="mascot-backdrop__halo"></div>
                <video class="mascot-backdrop__video" autoplay muted loop playsinline preload="metadata">
                  <source src="${MASCOT_MEDIA.videoPath}" type="video/mp4" />
                </video>
              </div>
            `
          : ""
      }
      <aside class="sidebar-nav">
        <div class="sidebar-nav__brand">
          <p>Crystal Forge</p>
          <strong>City of Drift</strong>
        </div>
        <nav class="sidebar-nav__links">
          <div class="sidebar-link-group">
            <span class="sidebar-link-group__label">Core</span>
            ${renderSidebarRouteGroup(coreRoutes, pageKey, cityAlertCount, availableCrystalCount, expeditionCount, uniqueCitizenCount)}
          </div>
          <div class="sidebar-link-group">
            <span class="sidebar-link-group__label">Management</span>
            ${renderSidebarRouteGroup(managementRoutes, pageKey, cityAlertCount, availableCrystalCount, expeditionCount, uniqueCitizenCount)}
          </div>
        </nav>
        ${
          showBuildingStatus
            ? `
                <div class="sidebar-nav__status">
                  ${renderSidebarBuildingList(state, "Active", manifestedBuildings, "No active buildings yet.", "active")}
                  ${renderSidebarBuildingList(state, "Incubating", incubatingBuildings, "No buildings are incubating.", "incubating")}
                  ${renderSidebarBuildingList(state, "Available", availableBuildings, "No additional buildings are waiting.", "available")}
                </div>
              `
            : ""
        }
        <div class="sidebar-nav__footer">
          <a class="sidebar-mode-link" href="./index.html">
            <span>Player Mode</span>
            <strong>Open Shared Player Screen</strong>
          </a>
          <button class="button button--ghost" data-action="open-catalog">Building Catalog</button>
          <details class="sidebar-gm-tools">
            <summary class="sidebar-gm-tools__summary">
              <span>GM Tools</span>
              <strong>Admin, saves, view mode, and dice</strong>
            </summary>
            <div class="sidebar-gm-tools__body">
              <button class="button button--ghost" data-action="open-admin">${state.settings.liveSessionView ? "GM Console" : "Admin Console"}</button>
              ${renderDensityControls(uiDensity)}
              <div class="sidebar-nav__save-actions">
                <button class="button button--ghost" data-action="save-firebase-realm">Save</button>
                <button class="button button--ghost" data-action="load-firebase-realm">Load</button>
                <button class="button button--ghost" data-action="save-manual-state">Local Save</button>
                <button class="button button--ghost" data-action="load-manual-state">Local Load</button>
              </div>
              ${
                firebaseMeta?.updatedAtMs
                  ? `
                    <div class="sidebar-nav__build">
                      <span>Firebase Save</span>
                      <strong>${new Date(firebaseMeta.updatedAtMs).toLocaleString()}</strong>
                    </div>
                  `
                  : ""
              }
              ${
                manualSaveMeta?.manualSavedAt
                  ? `
                    <div class="sidebar-nav__build">
                      <span>Local Save</span>
                      <strong>${new Date(manualSaveMeta.manualSavedAt).toLocaleString()}</strong>
                    </div>
                  `
                  : ""
              }
              <button class="sidebar-nav__build sidebar-nav__build--mode" data-action="toggle-session-view">
                <span>View Mode</span>
                <strong>${state.settings.liveSessionView ? "Live Session" : "Deep Review"}</strong>
              </button>
              <div class="sidebar-dice">
                <div class="sidebar-dice__header">
                  <span>Dice Roller</span>
                  <button class="button button--ghost sidebar-dice__history-toggle" data-action="toggle-dice-history">History</button>
                </div>
                <div class="sidebar-dice__controls">
                  <label>
                    <span>Amount</span>
                    <input type="number" min="1" max="20" value="${diceAmount}" data-action="set-dice-amount" />
                  </label>
                  <label>
                    <span>Die</span>
                    <select data-action="set-dice-type">
                      ${DICE_TYPES.map((type) => `<option value="${type}" ${type === diceType ? "selected" : ""}>${type}</option>`).join("")}
                    </select>
                  </label>
                </div>
                <button class="button sidebar-dice__roll" data-action="roll-dice">Roll</button>
                ${
                  lastDiceRoll
                    ? `<div class="sidebar-dice__last"><strong>${escapeHtml(lastDiceRoll.label ?? "Last Roll")}</strong><span>${escapeHtml((lastDiceRoll.results ?? []).join(", "))}</span><em>Total ${formatNumber(lastDiceRoll.total ?? 0)}</em></div>`
                    : `<p class="sidebar-dice__empty">Roll any combination to log it here.</p>`
                }
                ${
                  state.transientUi?.diceHistoryOpen
                    ? `<div class="sidebar-dice__history">${renderDiceHistory(state.settings.diceHistory ?? [])}</div>`
                    : ""
                }
              </div>
              <p>Type <code>432!</code> anywhere to open admin instantly.</p>
            </div>
          </details>
        </div>
      </aside>

      <main class="page-stage page-stage--${pageKey}">
        <button class="page-build-tag" type="button" data-action="open-build-notes" aria-label="Open build notes">${APP_DISPLAY_VERSION}</button>
        ${pageKey === "city" || pageKey === "economy" ? renderCrisisBanner(state, pageKey) : ""}
        <header class="page-hero">
          <div>
            <p class="page-hero__eyebrow">${pageKey}</p>
            <h1>${title}</h1>
            <p class="page-hero__subtitle">${subtitle}</p>
          </div>
          ${
            currentFocus && pageKey !== "forge"
              ? `
                  <div class="page-hero__focus">
                    <span>Town Focus</span>
                    ${renderTownFocusBadge(currentFocus)}
                    <small>${currentFocus.mayorLine}</small>
                  </div>
                `
              : ""
          }
        </header>

        ${showResourceChrome ? renderResourceDeltaStrip(state) : ""}

        ${
          showResourceChrome
            ? `
              <section class="hud-ribbon">
                ${summary
                  .map(
                    ([label, value, className = "hud-ribbon__item", sublabel = ""]) =>
                      label === "Council"
                        ? `
                            <a class="${className} hud-ribbon__item--link" href="./gm.html#town-focus-council">
                              <div class="hud-ribbon__head">
                                ${renderUiIcon(HUD_ICON_KEYS[label] ?? "route", label)}
                                <span>${label}</span>
                              </div>
                              <strong>${typeof value === "number" ? formatNumber(value, 2) : value}</strong>
                              ${sublabel ? `<small>${sublabel}</small>` : ""}
                            </a>
                          `
                        : RESOURCE_BREAKDOWN_KEYS.has(String(label).toLowerCase())
                          ? `
                              <button
                                class="${className} hud-ribbon__item--button"
                                type="button"
                                data-action="open-resource-breakdown"
                                data-resource-key="${String(label).toLowerCase()}"
                              >
                                <div class="hud-ribbon__head">
                                  ${renderUiIcon(HUD_ICON_KEYS[label] ?? "route", label)}
                                  <span>${label}</span>
                                </div>
                                <strong>${typeof value === "number" ? formatNumber(value, 2) : value}</strong>
                                ${sublabel ? `<small>${sublabel}</small>` : ""}
                              </button>
                            `
                        : `
                            <article class="${className}">
                              <div class="hud-ribbon__head">
                                ${renderUiIcon(HUD_ICON_KEYS[label] ?? "route", label)}
                                <span>${label}</span>
                              </div>
                              <strong>${typeof value === "number" ? formatNumber(value, 2) : value}</strong>
                              ${sublabel ? `<small>${sublabel}</small>` : ""}
                            </article>
                          `
                  )
                  .join("")}
              </section>
            `
            : ""
        }

        ${renderGlobalCommandStrip(state, townFocusAvailability, pageKey)}

        <div class="page-layout ${aside ? "page-layout--with-aside" : ""}">
          <section class="page-layout__content">${content}</section>
          ${aside ? `<aside class="page-layout__aside">${aside}</aside>` : ""}
        </div>
      </main>
      ${overlays}
    </div>
  `;
}
