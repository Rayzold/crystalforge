import { PAGE_ROUTES } from "../content/Config.js";
import { formatNumber } from "../engine/Utils.js";

export function renderPageShell(state, pageKey, { title, subtitle, content, aside = "" }) {
  const summary = [
    ["Gold", state.resources.gold],
    ["Food", state.resources.food],
    ["Materials", state.resources.materials],
    ["Mana", state.resources.mana],
    ["Population", state.resources.population],
    ["Prosperity", state.resources.prosperity]
  ];

  return `
    <div class="game-shell">
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
          <button class="button button--ghost" data-action="open-admin">Admin Console</button>
          <p>Type <code>432</code> anywhere to open admin instantly.</p>
        </div>
      </aside>

      <main class="page-stage">
        <header class="page-hero">
          <div>
            <p class="page-hero__eyebrow">${pageKey}</p>
            <h1>${title}</h1>
            <p class="page-hero__subtitle">${subtitle}</p>
          </div>
        </header>

        <section class="hud-ribbon">
          ${summary
            .map(
              ([label, value]) => `
                <article class="hud-ribbon__item">
                  <span>${label}</span>
                  <strong>${formatNumber(value, 2)}</strong>
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
    </div>
  `;
}
