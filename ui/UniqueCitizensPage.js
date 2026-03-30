// Unique citizen page.
// Named notables live here so they feel distinct from the normal workforce and
// their one-off bonuses can be read without scanning the whole roster.
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";

function renderUniqueCitizenCard(uniqueCitizen) {
  return `
    <article class="panel notable-card">
      <div class="notable-card__head">
        <div>
          <p class="notable-card__eyebrow">${escapeHtml(uniqueCitizen.className)}</p>
          <h3>${escapeHtml(uniqueCitizen.fullName)}</h3>
          <span>${escapeHtml(uniqueCitizen.title)}</span>
        </div>
        <strong>Unique</strong>
      </div>
      <p>${escapeHtml(uniqueCitizen.effectText)}</p>
      <div class="notable-card__meta">
        <span>Status: ${escapeHtml(uniqueCitizen.status === "inCity" ? "In City" : uniqueCitizen.status)}</span>
        <span>Joined: ${escapeHtml(uniqueCitizen.joinedAt)}</span>
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

export function renderUniqueCitizensPage(state) {
  const uniqueCitizens = [...(state.uniqueCitizens ?? [])].sort((left, right) => (right.joinedDayOffset ?? 0) - (left.joinedDayOffset ?? 0));
  return {
    title: "Unique Citizens",
    subtitle: "Named legends, specialists, and singular minds who reshape the Drift beyond normal rarity tiers.",
    content: `
      <section class="panel notable-summary-panel">
        <div class="panel__header">
          <h3>Notables</h3>
          <span class="panel__subtle">Unique citizens join rarely, carry full names, and bring one-off powers to the city.</span>
        </div>
        <div class="vehicle-card__stats">
          <article><span>Total</span><strong>${formatNumber(uniqueCitizens.length)}</strong></article>
          <article><span>Latest Arrival</span><strong>${escapeHtml(uniqueCitizens[0]?.fullName ?? "None yet")}</strong></article>
          <article><span>Status</span><strong>${uniqueCitizens.length ? "Present in Drift" : "Awaiting discovery"}</strong></article>
        </div>
      </section>
      ${
        uniqueCitizens.length
          ? `<div class="notable-grid">
              ${uniqueCitizens.map((uniqueCitizen) => renderUniqueCitizenCard(uniqueCitizen)).join("")}
            </div>`
          : `<section class="panel"><p class="panel__empty">No unique citizens have joined yet. Long and successful expeditions will eventually bring one home.</p></section>`
      }
    `
  };
}
