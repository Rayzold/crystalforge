import { APP_VERSION, MASCOT_MEDIA, PAGE_ROUTES } from "../content/Config.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getActiveConstructionQueue, getConstructionQueue } from "../systems/ConstructionSystem.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";
import { getCurrentTownFocus, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
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
  city: "\u{1F3D9}\uFE0F",
  citizens: "\u{1F465}",
  chronicle: "\u{1F4DC}"
};

const DICE_TYPES = ["d2", "d4", "d6", "d8", "d10", "d12", "d20", "d100"];

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

function renderSidebarBuildingList(title, items, emptyLabel) {
  return `
    <section class="sidebar-manifest-list">
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
                    (building) => `
                      <div class="sidebar-manifest-list__item">
                        <span>${escapeHtml(building.displayName)}</span>
                        <em>${building.isComplete ? `x${building.multiplier}` : `${formatNumber(building.quality, 0)}%`}</em>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
          : `<p class="sidebar-manifest-list__empty">${escapeHtml(emptyLabel)}</p>`
      }
    </section>
  `;
}

export function renderPageShell(state, pageKey, { title, subtitle, content, aside = "" }, overlays = "") {
  const manualSaveMeta = getManualSaveMeta();
  const townFocusAvailability = getTownFocusAvailability(state);
  const currentFocus = getCurrentTownFocus(state);
  const cityAlertCount = getCriticalAlerts(state).length;
  const availableCrystalCount = Object.values(state.crystals ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const manifestedBuildings = state.buildings.filter((building) => building.isComplete);
  const constructionQueue = getConstructionQueue(state);
  const incubatingBuildings = getActiveConstructionQueue(state);
  const availableBuildings = constructionQueue.filter(
    (building) => !incubatingBuildings.some((activeBuilding) => activeBuilding.id === building.id)
  );
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
  return `
    <div class="game-shell game-shell--page-${pageKey} ${currentFocus ? `game-shell--focus-${currentFocus.id}` : ""} ${state.settings.liveSessionView ? "game-shell--live-session" : ""} game-shell--theme-${state.settings.theme ?? "dark"}">
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
          ${PAGE_ROUTES.map(
            (route) => `
              <a
                class="sidebar-link ${route.key === pageKey ? "is-active" : ""}"
                href="${route.href}"
                data-short="${route.label.slice(0, 2).toUpperCase()}"
                data-glyph="${ROUTE_GLYPHS[route.key] ?? "\u2022"}"
              >
                <span class="sidebar-link__label">
                  <span class="sidebar-link__emoji">${ROUTE_GLYPHS[route.key] ?? "\u2022"}</span>
                  <span>${route.label}</span>
                </span>
                ${
                  route.key === "city" && cityAlertCount
                    ? `<em class="sidebar-link__badge">${cityAlertCount}</em>`
                    : route.key === "forge" && availableCrystalCount > 0
                      ? `<em class="sidebar-link__badge">${availableCrystalCount}</em>`
                      : ""
                }
              </a>
            `
          ).join("")}
        </nav>
        <div class="sidebar-nav__status">
          ${renderSidebarBuildingList("Manifested", manifestedBuildings, "No active buildings yet.")}
          ${renderSidebarBuildingList("Incubating", incubatingBuildings, "No buildings are incubating.")}
          ${renderSidebarBuildingList("Available", availableBuildings, "No additional buildings are waiting.")}
        </div>
        <div class="sidebar-nav__footer">
          <button class="button button--ghost" data-action="open-catalog">Building Catalog</button>
          <button class="button button--ghost" data-action="open-admin">${state.settings.liveSessionView ? "GM Console" : "Admin Console"}</button>
          <div class="sidebar-nav__save-actions">
            <button class="button button--ghost" data-action="save-manual-state">Save State</button>
            <button class="button button--ghost" data-action="load-manual-state">Load State</button>
          </div>
          ${
            manualSaveMeta?.manualSavedAt
              ? `
                <div class="sidebar-nav__build">
                  <span>Manual Save</span>
                  <strong>${new Date(manualSaveMeta.manualSavedAt).toLocaleString()}</strong>
                </div>
              `
              : ""
          }
          <button class="sidebar-nav__build sidebar-nav__build--mode" data-action="toggle-session-view">
            <span>View Mode</span>
            <strong>${state.settings.liveSessionView ? "Live Session" : "Deep Review"}</strong>
          </button>
          <div class="sidebar-nav__build">
            <span>Current Build</span>
            <strong>${APP_VERSION}</strong>
          </div>
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
          <p>Type <code>432</code> anywhere to open admin instantly.</p>
        </div>
      </aside>

      <main class="page-stage page-stage--${pageKey}">
        ${pageKey === "citizens" || pageKey === "chronicle" ? "" : renderCrisisBanner(state, pageKey)}
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

        ${
          pageKey === "home" || pageKey === "forge" || pageKey === "citizens" || pageKey === "chronicle"
            ? ""
            : `
              <section class="hud-ribbon">
                ${summary
                  .map(
                    ([label, value, className = "hud-ribbon__item", sublabel = ""]) =>
                      label === "Council"
                        ? `
                            <a class="${className} hud-ribbon__item--link" href="./index.html#town-focus-council">
                              <div class="hud-ribbon__head">
                                ${renderUiIcon(HUD_ICON_KEYS[label] ?? "route", label)}
                                <span>${label}</span>
                              </div>
                              <strong>${typeof value === "number" ? formatNumber(value, 2) : value}</strong>
                              ${sublabel ? `<small>${sublabel}</small>` : ""}
                            </a>
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
        }

        <div class="page-layout ${aside ? "page-layout--with-aside" : ""}">
          <section class="page-layout__content">${content}</section>
          ${aside ? `<aside class="page-layout__aside">${aside}</aside>` : ""}
        </div>
      </main>
      ${overlays}
    </div>
  `;
}
