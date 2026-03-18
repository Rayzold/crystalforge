import { APP_VERSION, MASCOT_MEDIA, PAGE_ROUTES } from "../content/Config.js";
import { formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getCurrentTownFocus, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { renderCrisisBanner } from "./CrisisBanner.js";
import { renderTownFocusBadge } from "./TownFocusShared.js";
import { renderUiIcon } from "./UiIcons.js";

const HUD_ICON_KEYS = {
  Gold: "gold",
  Food: "food",
  Materials: "materials",
  Mana: "mana",
  Population: "population",
  Prosperity: "prosperity",
  Council: "calendar"
};

export function renderPageShell(state, pageKey, { title, subtitle, content, aside = "" }, overlays = "") {
  const townFocusAvailability = getTownFocusAvailability(state);
  const currentFocus = getCurrentTownFocus(state);
  const summary = [
    ["Gold", state.resources.gold],
    ["Food", state.resources.food],
    ["Materials", state.resources.materials],
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

  const forgeNavCollapsed = pageKey === "forge" ? Boolean(state.transientUi?.forgeNavCollapsed) : false;
  return `
    <div class="game-shell game-shell--page-${pageKey} ${forgeNavCollapsed ? "game-shell--forge-collapsed" : ""} ${currentFocus ? `game-shell--focus-${currentFocus.id}` : ""} ${state.settings.liveSessionView ? "game-shell--live-session" : ""}">
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
        ${
          pageKey === "forge"
            ? `
              <button
                class="sidebar-nav__toggle button button--ghost"
                type="button"
                data-action="toggle-forge-nav"
                aria-expanded="${forgeNavCollapsed ? "false" : "true"}"
                title="${forgeNavCollapsed ? "Expand forge navigation" : "Collapse forge navigation"}"
              >
                <span>${forgeNavCollapsed ? "Open" : "Hide"}</span>
              </button>
            `
            : ""
        }
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
              >
                <span>${route.label}</span>
              </a>
            `
          ).join("")}
        </nav>
        <div class="sidebar-nav__footer">
          <button class="button button--ghost" data-action="open-catalog">Building Catalog</button>
          <button class="button button--ghost" data-action="open-admin">${state.settings.liveSessionView ? "GM Console" : "Admin Console"}</button>
          <button class="sidebar-nav__build sidebar-nav__build--mode" data-action="toggle-session-view">
            <span>View Mode</span>
            <strong>${state.settings.liveSessionView ? "Live Session" : "Deep Review"}</strong>
          </button>
          <div class="sidebar-nav__build">
            <span>Current Build</span>
            <strong>${APP_VERSION}</strong>
          </div>
          <p>Type <code>432</code> anywhere to open admin instantly.</p>
        </div>
      </aside>

      <main class="page-stage page-stage--${pageKey}">
        ${renderCrisisBanner(state, pageKey)}
        <header class="page-hero">
          <div>
            <p class="page-hero__eyebrow">${pageKey}</p>
            <h1>${title}</h1>
            <p class="page-hero__subtitle">${subtitle}</p>
          </div>
          ${
            currentFocus
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

        <div class="page-layout ${aside ? "page-layout--with-aside" : ""}">
          <section class="page-layout__content">${content}</section>
          ${aside ? `<aside class="page-layout__aside">${aside}</aside>` : ""}
        </div>
      </main>
      ${overlays}
    </div>
  `;
}
