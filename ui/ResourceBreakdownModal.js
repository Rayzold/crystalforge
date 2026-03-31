import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getBasePopulationSupport } from "../systems/DriftEvolutionSystem.js";
import { getHousingStrainPenalty } from "../systems/CityConditionSystem.js";
import { getEconomyContributionBreakdown, getEconomyDebugSummary } from "../systems/ResourceSystem.js";
import { renderUiIcon } from "./UiIcons.js";

const RESOURCE_META = {
  gold: {
    label: "Gold",
    icon: "gold",
    summary: "Treasury flow from trade, labor, events, and focus."
  },
  food: {
    label: "Food",
    icon: "food",
    summary: "Stores shaped by farms, citizens, routes, and seasonal pressure."
  },
  materials: {
    label: "Materials",
    icon: "materials",
    summary: "Industrial stock used to keep the Drift building and repairing."
  },
  salvage: {
    label: "Salvage",
    icon: "salvage",
    summary: "Recovered parts and scrap feeding frontier work and expeditions."
  },
  mana: {
    label: "Mana",
    icon: "mana",
    summary: "Arcane reserves from structures, legends, events, and focus."
  },
  population: {
    label: "Population",
    icon: "population",
    summary: "Population is a capacity check rather than a daily-flow resource."
  },
  prosperity: {
    label: "Prosperity",
    icon: "prosperity",
    summary: "Long-term civic momentum shaped by trade, care, legends, and strain."
  }
};

const COMPONENT_LABELS = [
  ["buildingBaseProduction", "Buildings"],
  ["districtBonus", "Districts"],
  ["citizenProduction", "Citizens"],
  ["citizenConsumption", "Citizen upkeep"],
  ["uniqueCitizenProduction", "Legends"],
  ["relicProduction", "Relics"],
  ["eventProduction", "Events"],
  ["focusProduction", "Town Focus"]
];

function formatSignedAmount(value, decimals = 2) {
  const numericValue = Number(value ?? 0) || 0;
  return `${numericValue >= 0 ? "+" : ""}${formatNumber(numericValue, decimals)}`;
}

function renderFlowRows(entries, emptyLabel) {
  if (!entries.length) {
    return `<p class="panel__empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <div class="resource-breakdown-modal__flow-list">
      ${entries
        .map(
          (entry) => `
            <article class="resource-breakdown-modal__flow-item ${entry.amount >= 0 ? "is-positive" : "is-negative"}">
              <div>
                <strong>${escapeHtml(entry.label)}</strong>
                <small>${escapeHtml(entry.channel)}</small>
              </div>
              <span>${formatSignedAmount(entry.amount)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPopulationPanel(state) {
  const population = Number(state.resources?.population ?? 0);
  const support = Number(state.cityStats?.populationSupport ?? 0);
  const freeCapacity = Math.max(0, support - population);
  const housingGap = Math.max(0, population - support);
  const strain = getHousingStrainPenalty(state);
  const strainParts = [
    strain.morale > 0 ? `-${formatNumber(strain.morale, 1)} morale` : "",
    strain.health > 0 ? `-${formatNumber(strain.health, 1)} health` : "",
    strain.prosperity > 0 ? `-${formatNumber(strain.prosperity, 1)} prosperity` : ""
  ].filter(Boolean);

  return `
    <div class="resource-breakdown-modal__grid resource-breakdown-modal__grid--population">
      <section class="resource-breakdown-modal__section">
        <div class="resource-breakdown-modal__metrics expedition-preview-grid">
          <article><span>Residents</span><strong>${formatNumber(population, 0)}</strong></article>
          <article><span>Support Capacity</span><strong>${formatNumber(support, 0)}</strong></article>
          <article><span>${housingGap > 0 ? "Over Capacity" : "Free Capacity"}</span><strong>${formatNumber(housingGap > 0 ? housingGap : freeCapacity, 0)}</strong></article>
          <article><span>Base Drift Support</span><strong>${formatNumber(getBasePopulationSupport(), 0)}</strong></article>
        </div>
      </section>
      <section class="resource-breakdown-modal__section">
        <div class="resource-breakdown-modal__callout ${housingGap > 0 ? "is-warning" : ""}">
          <strong>${housingGap > 0 ? "Housing strain is active." : "Housing is stable."}</strong>
          <p>
            ${
              housingGap > 0
                ? `The Drift is sheltering ${formatNumber(housingGap, 0)} more residents than current support allows. Active penalties: ${escapeHtml(strainParts.join(", ") || "none")}.`
                : `The city has room for ${formatNumber(freeCapacity, 0)} more residents before housing penalties begin.`
            }
          </p>
        </div>
      </section>
    </div>
  `;
}

function renderResourcePanel(state, resourceKey) {
  const debugSummary = getEconomyDebugSummary(state);
  const contributionBreakdown = getEconomyContributionBreakdown(state);
  const row = debugSummary.rows.find((entry) => entry.resource === resourceKey) ?? null;
  const contributionEntry = contributionBreakdown[resourceKey] ?? { sources: [], drains: [] };
  if (!row) {
    return "";
  }

  const components = COMPONENT_LABELS
    .map(([key, label]) => ({
      key,
      label,
      amount: Number(row[key] ?? 0)
    }))
    .filter((entry) => Math.abs(entry.amount) > 0.005);

  return `
    <div class="resource-breakdown-modal__grid">
      <section class="resource-breakdown-modal__section">
        <div class="resource-breakdown-modal__metrics expedition-preview-grid">
          <article><span>Current Stock</span><strong>${formatNumber(row.stock, 2)}</strong></article>
          <article><span>Net / Day</span><strong>${formatSignedAmount(row.net)}</strong></article>
          <article><span>Top Source</span><strong>${escapeHtml(contributionEntry.sources[0]?.label ?? "None")}</strong></article>
          <article><span>Top Drain</span><strong>${escapeHtml(contributionEntry.drains[0]?.label ?? "None")}</strong></article>
        </div>
        <div class="resource-breakdown-modal__components">
          ${components.length
            ? components
                .map(
                  (entry) => `
                    <article class="resource-breakdown-modal__component ${entry.amount >= 0 ? "is-positive" : "is-negative"}">
                      <span>${escapeHtml(entry.label)}</span>
                      <strong>${formatSignedAmount(entry.amount)}</strong>
                    </article>
                  `
                )
                .join("")
            : `<p class="panel__empty">No active daily flow is touching this resource right now.</p>`}
        </div>
      </section>
      <section class="resource-breakdown-modal__section">
        <div class="resource-breakdown-modal__flow-grid">
          <div>
            <div class="resource-breakdown-modal__section-head">
              <span>Top Sources</span>
              <strong>${escapeHtml(RESOURCE_META[resourceKey]?.label ?? "Resource")} gains</strong>
            </div>
            ${renderFlowRows(contributionEntry.sources ?? [], "No strong gains are feeding this resource yet.")}
          </div>
          <div>
            <div class="resource-breakdown-modal__section-head">
              <span>Top Drains</span>
              <strong>${escapeHtml(RESOURCE_META[resourceKey]?.label ?? "Resource")} drains</strong>
            </div>
            ${renderFlowRows(contributionEntry.drains ?? [], "No meaningful drains are pulling on this resource.")}
          </div>
        </div>
      </section>
    </div>
  `;
}

export function renderResourceBreakdownModal(state) {
  const resourceKey = String(state.transientUi?.resourceBreakdownKey ?? "").trim().toLowerCase();
  const resourceMeta = RESOURCE_META[resourceKey] ?? null;
  if (!resourceMeta) {
    return "";
  }

  return `
    <div class="modal-overlay resource-breakdown-modal">
      <button class="modal-overlay__dismiss" type="button" data-action="close-resource-breakdown" aria-label="Close resource breakdown"></button>
      <section class="modal-card resource-breakdown-modal__card" role="dialog" aria-modal="true" aria-labelledby="resource-breakdown-title">
        <button class="modal-card__close" type="button" data-action="close-resource-breakdown" aria-label="Close resource breakdown">x</button>
        <header class="resource-breakdown-modal__header">
          <div class="resource-breakdown-modal__title-wrap">
            <div class="resource-breakdown-modal__icon">
              ${renderUiIcon(resourceMeta.icon, resourceMeta.label)}
            </div>
            <div>
              <span>Resource Breakdown</span>
              <h3 id="resource-breakdown-title">${escapeHtml(resourceMeta.label)}</h3>
              <p>${escapeHtml(resourceMeta.summary)}</p>
            </div>
          </div>
        </header>
        ${resourceKey === "population" ? renderPopulationPanel(state) : renderResourcePanel(state, resourceKey)}
      </section>
    </div>
  `;
}
