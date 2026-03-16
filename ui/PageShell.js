import { PAGE_ROUTES } from "../content/Config.js";
import { formatNumber } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getCurrentTownFocus, getTownFocusAvailability } from "../systems/TownFocusSystem.js";
import { renderCrisisBanner } from "./CrisisBanner.js";
import { renderTownFocusBadge } from "./TownFocusShared.js";

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

  return `
    <div class="game-shell ${currentFocus ? `game-shell--focus-${currentFocus.id}` : ""}">
      <aside class="sidebar-nav">
        <div class="sidebar-nav__brand">
          <p>Crystal Forge</p>
          <strong>City of Drift</strong>
        </div>
        <nav class="sidebar-nav__links">
          ${PAGE_ROUTES.map(
            (route) => `
              <a class="sidebar-link ${route.key === pageKey ? "is-active" : ""}" href="${route.href}">
                <span>${route.label}</span>
              </a>
            `
          ).join("")}
        </nav>
        <div class="sidebar-nav__footer">
          <button class="button button--ghost" data-action="open-catalog">Building Catalog</button>
          <button class="button button--ghost" data-action="open-admin">Admin Console</button>
          <p>Type <code>432</code> anywhere to open admin instantly.</p>
        </div>
      </aside>

      <main class="page-stage">
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
                        <span>${label}</span>
                        <strong>${typeof value === "number" ? formatNumber(value, 2) : value}</strong>
                        ${sublabel ? `<small>${sublabel}</small>` : ""}
                      </a>
                    `
                  : `
                      <article class="${className}">
                        <span>${label}</span>
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
