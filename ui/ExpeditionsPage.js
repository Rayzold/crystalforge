// Expedition planning page.
// This screen is the player-facing mini-game for sending crews and vehicles
// beyond the Drift to return with resources, recruits, and rare notables.
import { EXPEDITION_APPROACHES, EXPEDITION_DURATION_OPTIONS, EXPEDITION_ORDER, EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";
import { CITIZEN_DEFINITIONS } from "../content/CitizenConfig.js";
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER } from "../content/VehicleConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import {
  createExpeditionLaunchPreview,
  getAvailableExpeditionCitizenCount,
  getAvailableVehicleCounts,
  getExpeditionOverview
} from "../systems/ExpeditionSystem.js";
import { formatDate } from "../systems/CalendarSystem.js";

const RESOURCE_LABELS = {
  food: "Food",
  gold: "Gold",
  materials: "Materials",
  mana: "Mana"
};

function getDefaultDraft(state) {
  const firstType = EXPEDITION_TYPES[state.transientUi?.expeditionDraft?.typeId] ? state.transientUi.expeditionDraft.typeId : EXPEDITION_ORDER[0];
  return {
    typeId: firstType,
    vehicleId: state.transientUi?.expeditionDraft?.vehicleId ?? "caravanWagon",
    approachId: state.transientUi?.expeditionDraft?.approachId ?? "balanced",
    durationDays: Number(state.transientUi?.expeditionDraft?.durationDays ?? 7) || 7,
    team: structuredClone(state.transientUi?.expeditionDraft?.team ?? {}),
    resources: structuredClone(state.transientUi?.expeditionDraft?.resources ?? {})
  };
}

function renderMissionCards(draft) {
  return `
    <div class="expedition-grid expedition-grid--missions">
      ${EXPEDITION_ORDER.map((typeId) => {
        const expeditionType = EXPEDITION_TYPES[typeId];
        return `
          <button
            type="button"
            class="expedition-card expedition-card--mission ${draft.typeId === typeId ? "is-active" : ""}"
            data-action="set-expedition-type"
            data-type-id="${typeId}"
          >
            <span class="expedition-card__emoji" aria-hidden="true">${escapeHtml(expeditionType.emoji)}</span>
            <strong>${escapeHtml(expeditionType.label)}</strong>
            <small>${escapeHtml(expeditionType.summary)}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderVehicleOptions(state, draft) {
  const availableVehicles = getAvailableVehicleCounts(state);
  const totalVehicles = state.vehicles ?? {};
  return `
    <div class="expedition-grid expedition-grid--vehicles">
      ${VEHICLE_ORDER.map((vehicleId) => {
        const total = totalVehicles[vehicleId] ?? 0;
        const definition = VEHICLE_DEFINITIONS[vehicleId];
        const available = availableVehicles[vehicleId] ?? 0;
        const isSelected = draft.vehicleId === vehicleId;
        return `
          <button
            type="button"
            class="expedition-card expedition-card--vehicle ${isSelected ? "is-active" : ""}"
            data-action="set-expedition-vehicle"
            data-vehicle-id="${vehicleId}"
            ${available <= 0 && !isSelected ? "disabled" : ""}
          >
            <div class="expedition-card__row">
              <span class="expedition-card__emoji" aria-hidden="true">${escapeHtml(definition?.emoji ?? "•")}</span>
              <strong>${escapeHtml(definition?.name ?? vehicleId)}</strong>
            </div>
            <small>${escapeHtml(definition?.type === "air" ? "Air vehicle · half travel time" : "Land vehicle")}</small>
            <em>${formatNumber(available)} free / ${formatNumber(total)} total</em>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderApproachOptions(draft) {
  return `
    <div class="expedition-button-row">
      ${Object.values(EXPEDITION_APPROACHES).map((approach) => `
        <button
          type="button"
          class="button ${draft.approachId === approach.id ? "" : "button--ghost"}"
          data-action="set-expedition-approach"
          data-approach-id="${approach.id}"
        >
          ${escapeHtml(approach.label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderDurationOptions(draft) {
  return `
    <div class="expedition-button-row">
      ${EXPEDITION_DURATION_OPTIONS.map((days) => `
        <button
          type="button"
          class="button ${Number(draft.durationDays) === days ? "" : "button--ghost"}"
          data-action="set-expedition-duration"
          data-duration-days="${days}"
        >
          ${days}d
        </button>
      `).join("")}
    </div>
  `;
}

function renderTeamInputs(state, draft, expeditionType) {
  return `
    <div class="expedition-grid expedition-grid--team">
      ${expeditionType.allowedClasses.map((citizenClass) => {
        const definition = CITIZEN_DEFINITIONS[citizenClass];
        const available = getAvailableExpeditionCitizenCount(state, citizenClass);
        return `
          <label class="expedition-team-card">
            <div class="expedition-team-card__head">
              <strong>${escapeHtml(`${definition?.emoji ?? "•"} ${citizenClass}`)}</strong>
              <span>${formatNumber(available)} free</span>
            </div>
            <input
              type="number"
              min="0"
              max="${available}"
              step="1"
              value="${Math.max(0, Number(draft.team?.[citizenClass] ?? 0) || 0)}"
              data-action="set-expedition-team-count"
              data-citizen-class="${citizenClass}"
            />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderSupplyInputs(state, draft) {
  return `
    <div class="expedition-grid expedition-grid--supplies">
      ${Object.entries(RESOURCE_LABELS).map(([resource, label]) => `
        <label class="expedition-team-card">
          <div class="expedition-team-card__head">
            <strong>${escapeHtml(label)}</strong>
            <span>${formatNumber(state.resources?.[resource] ?? 0)} on hand</span>
          </div>
          <input
            type="number"
            min="0"
            max="${Math.max(0, Number(state.resources?.[resource] ?? 0) || 0)}"
            step="1"
            value="${Math.max(0, Number(draft.resources?.[resource] ?? 0) || 0)}"
            data-action="set-expedition-resource"
            data-resource-key="${resource}"
          />
        </label>
      `).join("")}
    </div>
  `;
}

function renderPreviewPanel(state, draft) {
  const preview = createExpeditionLaunchPreview(state, draft);
  const outcomeText =
    preview.successScore >= 1.35
      ? "Likely strong return"
      : preview.successScore >= 1.05
        ? "Likely steady return"
        : preview.successScore >= 0.8
          ? "Risky but workable"
          : "Thin odds";

  return `
    <section class="panel expedition-launch-preview">
      <div class="panel__header">
        <h3>Launch Preview</h3>
        <span class="panel__subtle">Who leaves, when they return, and how bold the mission feels.</span>
      </div>
      <div class="expedition-preview-grid">
        <article><span>Team</span><strong>${formatNumber(preview.teamSize)}</strong></article>
        <article><span>Travel Time</span><strong>${formatNumber(preview.durationDays, 0)}d</strong></article>
        <article><span>Expected Return</span><strong>${escapeHtml(formatDate(preview.expectedReturnDayOffset))}</strong></article>
        <article><span>Power</span><strong>${formatNumber(preview.powerScore, 1)}</strong></article>
      </div>
      <p class="expedition-launch-preview__outlook">${escapeHtml(outcomeText)}</p>
      <button class="button expedition-launch-preview__launch" type="button" data-action="launch-expedition">
        Launch Expedition
      </button>
    </section>
  `;
}

function renderActiveExpeditions(state) {
  const active = state.expeditions?.active ?? [];
  if (!active.length) {
    return `
      <section class="panel">
        <div class="panel__header">
          <h3>Active Expeditions</h3>
          <span class="panel__subtle">Nothing is currently outside the Drift.</span>
        </div>
        <p class="panel__empty">Launch a mission to send citizens into the surrounding world.</p>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel__header">
        <h3>Active Expeditions</h3>
        <span class="panel__subtle">${formatNumber(active.length)} mission${active.length === 1 ? "" : "s"} currently deployed.</span>
      </div>
      <div class="expedition-return-list">
        ${active.map((expedition) => `
          <article class="expedition-return-card">
            <div class="expedition-return-card__head">
              <strong>${escapeHtml(expedition.typeLabel)}</strong>
              <span>${escapeHtml(expedition.vehicleName)}</span>
            </div>
            <p>${escapeHtml(`${getTeamSizeText(expedition.team)} deployed / ${expedition.notes}`)}</p>
            <div class="expedition-return-card__meta">
              <span>Returns ${escapeHtml(expedition.expectedReturnAt)}</span>
              <span>${escapeHtml(EXPEDITION_APPROACHES[expedition.approachId]?.label ?? "Balanced")}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getTeamSizeText(team) {
  const total = Object.values(team ?? {}).reduce((sum, bundle) => {
    return sum + Object.values(bundle ?? {}).reduce((bundleSum, amount) => bundleSum + (Number(amount) || 0), 0);
  }, 0);
  return `${formatNumber(total)} crew`;
}

function renderRecentReturns(state) {
  const recent = state.expeditions?.recent ?? [];
  return `
    <section class="panel">
      <div class="panel__header">
        <h3>Recent Returns</h3>
        <span class="panel__subtle">The last expeditions to make it back to the Drift.</span>
      </div>
      ${
        recent.length
          ? `<div class="expedition-return-list">
              ${recent.map((record) => `
                <article class="expedition-return-card">
                  <div class="expedition-return-card__head">
                    <strong>${escapeHtml(record.typeLabel)}</strong>
                    <span>${escapeHtml(record.outcomeLabel)}</span>
                  </div>
                  <p>${escapeHtml(record.summary)}</p>
                  <div class="expedition-return-card__meta">
                    <span>${escapeHtml(record.returnDateLabel)}</span>
                    <span>${escapeHtml(record.vehicleName)}</span>
                  </div>
                </article>
              `).join("")}
            </div>`
          : `<p class="panel__empty">No expeditions have returned yet.</p>`
      }
    </section>
  `;
}

function renderExpeditionSummary(state) {
  const overview = getExpeditionOverview(state);
  return `
    <section class="panel expedition-summary-panel">
      <div class="panel__header">
        <h3>Expedition Command</h3>
        <span class="panel__subtle">Citizens leave the city while deployed, and air vehicles halve travel time.</span>
      </div>
      <div class="expedition-preview-grid">
        <article><span>Active</span><strong>${formatNumber(overview.activeExpeditions)}</strong></article>
        <article><span>Vehicles Free</span><strong>${formatNumber(overview.freeVehicles)} / ${formatNumber(overview.totalVehicles)}</strong></article>
        <article><span>Unique Progress</span><strong>${formatNumber(overview.uniqueProgress)} / ${formatNumber(overview.nextUniqueThreshold)}</strong></article>
        <article><span>Notables</span><strong>${formatNumber(overview.uniqueCitizens)}</strong></article>
      </div>
    </section>
  `;
}

export function renderExpeditionsPage(state) {
  const draft = getDefaultDraft(state);
  const expeditionType = EXPEDITION_TYPES[draft.typeId] ?? EXPEDITION_TYPES[EXPEDITION_ORDER[0]];

  return {
    title: "Expeditions",
    subtitle: "Send crews beyond the Drift to gather recruits, resources, crystals, and legends.",
    content: `
      ${renderExpeditionSummary(state)}
      <section class="panel expedition-launch-panel">
        <div class="panel__header">
          <h3>Launch Expedition</h3>
          <span class="panel__subtle">Choose the mission, vehicle, crew, supplies, and pace.</span>
        </div>
        <div class="expedition-launch-panel__stack">
          <div>
            <div class="panel__subtle">Mission Type</div>
            ${renderMissionCards(draft)}
          </div>
          <div>
            <div class="panel__subtle">Vehicle</div>
            ${renderVehicleOptions(state, draft)}
          </div>
          <div>
            <div class="panel__subtle">Approach</div>
            ${renderApproachOptions(draft)}
          </div>
          <div>
            <div class="panel__subtle">Duration</div>
            ${renderDurationOptions(draft)}
          </div>
          <div>
            <div class="panel__subtle">Crew Assignment</div>
            ${renderTeamInputs(state, draft, expeditionType)}
          </div>
          <div>
            <div class="panel__subtle">Committed Supplies</div>
            ${renderSupplyInputs(state, draft)}
          </div>
        </div>
      </section>
      ${renderActiveExpeditions(state)}
      ${renderRecentReturns(state)}
    `,
    aside: `
      ${renderPreviewPanel(state, draft)}
    `
  };
}
