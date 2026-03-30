// Legends page.
// Named citizens live here so they feel separate from the normal workforce and
// read more like a roster of singular characters than another resource screen.
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";

function renderLegendCard(uniqueCitizen) {
  return `
    <article class="panel notable-card">
      <div class="notable-card__head">
        <div>
          <p class="notable-card__eyebrow">${escapeHtml(uniqueCitizen.className)}</p>
          <h3>${escapeHtml(uniqueCitizen.fullName)}</h3>
          <span>${escapeHtml(uniqueCitizen.title)}</span>
        </div>
        <strong>Legend</strong>
      </div>
      <p>${escapeHtml(uniqueCitizen.effectText)}</p>
      <div class="notable-card__meta">
        <span>Status: ${escapeHtml(uniqueCitizen.status === "inCity" ? "In Drift" : uniqueCitizen.status)}</span>
        <span>Arrived: ${escapeHtml(uniqueCitizen.joinedAt)}</span>
        ${uniqueCitizen.sourceTypeId ? `<span>Found through ${escapeHtml(EXPEDITION_TYPES[uniqueCitizen.sourceTypeId]?.label ?? uniqueCitizen.sourceTypeId)}</span>` : ""}
      </div>
      <div class="notable-card__bonuses">
        ${Object.entries(uniqueCitizen.bonuses?.resources ?? {}).map(([key, amount]) => `
          <em>${escapeHtml(`${key} +${formatNumber(amount, 2)}/day`)}</em>
        `).join("")}
        ${Object.entries(uniqueCitizen.bonuses?.stats ?? {}).map(([key, amount]) => `
          <em>${escapeHtml(`${key} +${formatNumber(amount, 2)}`)}</em>
        `).join("")}
        ${
          Number(uniqueCitizen.bonuses?.expeditionPowerPercent ?? 0) > 0
            ? `<em>${escapeHtml(`expedition power +${formatNumber(uniqueCitizen.bonuses.expeditionPowerPercent, 0)}%`)}</em>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderLegendOverview(uniqueCitizens) {
  const latest = uniqueCitizens[0] ?? null;
  const representedClasses = new Set(uniqueCitizens.map((entry) => entry.className)).size;
  const expeditionSources = new Set(uniqueCitizens.map((entry) => entry.sourceTypeId).filter(Boolean)).size;

  return `
    <section class="panel legends-summary-panel">
      <div class="panel__header">
        <h3>Legends of the Drift</h3>
        <span class="panel__subtle">Rare named citizens who arrive through long success and change the city in ways ordinary recruits cannot.</span>
      </div>
      <div class="legends-summary-grid">
        <article><span>Total Legends</span><strong>${formatNumber(uniqueCitizens.length)}</strong></article>
        <article><span>Latest Arrival</span><strong>${escapeHtml(latest?.fullName ?? "None yet")}</strong></article>
        <article><span>Classes Represented</span><strong>${formatNumber(representedClasses)}</strong></article>
        <article><span>Expedition Paths</span><strong>${formatNumber(expeditionSources)}</strong></article>
      </div>
      <div class="legends-page__guidance">
        <article class="legends-guidance-card">
          <strong>How Legends Arrive</strong>
          <p>Legends do not appear through normal population growth. They are drawn in by repeated expedition success, stronger mission cards, and the long arc of the Drift's reputation.</p>
        </article>
        <article class="legends-guidance-card">
          <strong>Why They Matter</strong>
          <p>Each Legend carries a full name, a title, and one-off effects that can strengthen resources, city stats, or future expeditions beyond normal rarity multipliers.</p>
        </article>
      </div>
    </section>
  `;
}

export function renderUniqueCitizensPage(state) {
  const uniqueCitizens = [...(state.uniqueCitizens ?? [])].sort((left, right) => (right.joinedDayOffset ?? 0) - (left.joinedDayOffset ?? 0));
  return {
    title: "Legends",
    subtitle: "Named figures, remembered arrivals, and singular allies who leave a permanent mark on the Drift.",
    content: `
      ${renderLegendOverview(uniqueCitizens)}
      ${
        uniqueCitizens.length
          ? `<div class="notable-grid">
              ${uniqueCitizens.map((uniqueCitizen) => renderLegendCard(uniqueCitizen)).join("")}
            </div>`
          : `
              <section class="panel legends-empty-panel">
                <div class="panel__header">
                  <h3>No Legends Yet</h3>
                  <span class="panel__subtle">The Drift has not attracted a named figure yet.</span>
                </div>
                <p class="panel__empty">Keep expeditions active, pursue stronger mission cards, and over time a true legend will join the city with a full name and unique abilities.</p>
              </section>
            `
      }
    `
  };
}
