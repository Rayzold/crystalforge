// Expedition planning page.
// This screen renders the rotating mission board, launch setup, and the return
// feed that turns expeditions into a proper citizen-and-resource mini-game.
import { EXPEDITION_APPROACHES, EXPEDITION_DURATION_OPTIONS, EXPEDITION_ORDER, EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";
import { CITIZEN_DEFINITIONS } from "../content/CitizenConfig.js";
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER } from "../content/VehicleConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import {
  createExpeditionLaunchPreview,
  getAvailableExpeditionCitizenCount,
  getAvailableVehicleCounts,
  getCurrentPendingExpeditionJourney,
  getExpeditionJourneyProjection,
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
  const board = state.expeditions?.board ?? [];
  const missionId = board.some((mission) => mission.id === state.transientUi?.expeditionDraft?.missionId)
    ? state.transientUi.expeditionDraft.missionId
    : board[0]?.id ?? null;
  const selectedMission = board.find((mission) => mission.id === missionId) ?? board[0] ?? null;
  const firstType = EXPEDITION_TYPES[selectedMission?.typeId ?? state.transientUi?.expeditionDraft?.typeId]
    ? (selectedMission?.typeId ?? state.transientUi?.expeditionDraft?.typeId)
    : EXPEDITION_ORDER[0];
  const durationDays =
    EXPEDITION_DURATION_OPTIONS.includes(Number(state.transientUi?.expeditionDraft?.durationDays))
      ? Number(state.transientUi.expeditionDraft.durationDays)
      : Number(selectedMission?.suggestedDurationDays ?? 7);
  return {
    missionId,
    typeId: firstType,
    vehicleId: state.transientUi?.expeditionDraft?.vehicleId ?? "trailBuggy",
    approachId: state.transientUi?.expeditionDraft?.approachId ?? "balanced",
    durationDays,
    team: structuredClone(state.transientUi?.expeditionDraft?.team ?? {}),
    resources: structuredClone(state.transientUi?.expeditionDraft?.resources ?? {})
  };
}

function renderMissionBoard(state, draft) {
  const board = state.expeditions?.board ?? [];
  if (!board.length) {
    return `<p class="panel__empty">No mission cards are currently available.</p>`;
  }

  return `
    <div class="expedition-grid expedition-grid--missions">
      ${board.map((mission) => `
        <button
          type="button"
          class="expedition-card expedition-card--mission ${draft.missionId === mission.id ? "is-active" : ""} ${mission.isSpecial ? "is-special" : ""}"
          data-action="set-expedition-mission"
          data-mission-id="${mission.id}"
          data-type-id="${mission.typeId}"
          data-duration-days="${mission.suggestedDurationDays}"
        >
          <div class="expedition-card__row">
            <span class="expedition-card__emoji" aria-hidden="true">${escapeHtml(mission.typeEmoji ?? "•")}</span>
            <strong>${escapeHtml(mission.name)}</strong>
          </div>
          <small>${escapeHtml(mission.summary)}</small>
          <div class="expedition-card__tags">
            <em>${escapeHtml(mission.risk)} Risk</em>
            <em>${escapeHtml(mission.distance)}</em>
            <em>${formatNumber(Math.max(0, mission.expiresDayOffset - state.calendar.dayOffset), 0)}d left</em>
            ${mission.isSpecial ? `<em class="expedition-card__tag expedition-card__tag--special">Special</em>` : ""}
          </div>
          <span class="expedition-card__footer">${escapeHtml((mission.likelyRewards ?? []).join(" • "))}</span>
        </button>
      `).join("")}
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
            <small>${escapeHtml(definition?.summary ?? "")}</small>
            <div class="expedition-card__tags">
              <em>${escapeHtml(definition?.sizeLabel ?? (definition?.type === "air" ? "Air Vehicle" : "Land Vehicle"))}</em>
              <em>Travel x${formatNumber(definition?.timeMultiplier ?? 1, 2)}</em>
              <em>Cargo x${formatNumber(definition?.cargoMultiplier ?? 1, 2)}</em>
              <em>Scout x${formatNumber(definition?.scouting ?? 1, 2)}</em>
            </div>
            <span class="expedition-card__footer">${formatNumber(available)} free / ${formatNumber(total)} total</span>
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
  if (!(state.expeditions?.board ?? []).length) {
    return `
      <section class="panel expedition-launch-preview">
        <div class="panel__header">
          <h3>Launch Preview</h3>
          <span class="panel__subtle">No mission card is currently selected.</span>
        </div>
        <p class="panel__empty">The Mission Board is empty right now. Wait for the next refresh or use the GM refresh action.</p>
      </section>
    `;
  }

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
        <h3>${escapeHtml(preview.mission.name)}</h3>
        <span class="panel__subtle">${escapeHtml(preview.mission.summary)}</span>
      </div>
      <div class="expedition-preview-grid">
        <article><span>Risk</span><strong>${escapeHtml(preview.mission.risk)}</strong></article>
        <article><span>Travel</span><strong>${formatNumber(preview.durationDays, 0)}d</strong></article>
        <article><span>Return</span><strong>${escapeHtml(formatDate(preview.expectedReturnDayOffset))}</strong></article>
        <article><span>Power</span><strong>${formatNumber(preview.powerScore, 1)}</strong></article>
      </div>
      <p class="expedition-launch-preview__outlook">${escapeHtml(outcomeText)}</p>
      <div class="expedition-preview-insights">
        <div class="expedition-preview-insights__col">
          <strong>Strengths</strong>
          ${
            preview.strengths.length
              ? `<ul>${preview.strengths.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
              : `<p>No clear strengths yet.</p>`
          }
        </div>
        <div class="expedition-preview-insights__col">
          <strong>Risks</strong>
          ${
            preview.risks.length
              ? `<ul>${preview.risks.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
              : `<p>No major weaknesses detected.</p>`
          }
        </div>
      </div>
      <button class="button expedition-launch-preview__launch" type="button" data-action="launch-expedition">
        Launch Expedition
      </button>
    </section>
  `;
}

function getTeamSizeText(team) {
  const total = Object.values(team ?? {}).reduce((sum, bundle) => {
    return sum + Object.values(bundle ?? {}).reduce((bundleSum, amount) => bundleSum + (Number(amount) || 0), 0);
  }, 0);
  return `${formatNumber(total)} crew`;
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
              <strong>${escapeHtml(expedition.missionName ?? expedition.typeLabel)}</strong>
              <span>${escapeHtml(expedition.vehicleName)}</span>
            </div>
            <p>${escapeHtml(expedition.missionSummary ?? expedition.notes)}</p>
            <div class="expedition-card__tags">
              <em>${escapeHtml(expedition.missionRisk)} Risk</em>
              <em>${escapeHtml(expedition.missionDistance)}</em>
              ${expedition.missionIsSpecial ? `<em class="expedition-card__tag expedition-card__tag--special">Special</em>` : ""}
            </div>
            <div class="expedition-return-card__meta">
              <span>${escapeHtml(getTeamSizeText(expedition.team))}</span>
              <span>Returns ${escapeHtml(expedition.expectedReturnAt)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
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
                    <strong>${escapeHtml(record.missionName ?? record.typeLabel)}</strong>
                    <span>${escapeHtml(record.outcomeLabel)}</span>
                  </div>
                  <p>${escapeHtml(record.narrative ?? record.summary)}</p>
                  ${
                    record.detailLines?.length
                      ? `<ul class="expedition-return-card__details">
                          ${record.detailLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
                        </ul>`
                      : ""
                  }
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

function renderPendingJourneyPanel(state) {
  const pending = state.expeditions?.pending ?? [];
  const currentJourney = getCurrentPendingExpeditionJourney(state);
  if (!pending.length || !currentJourney) {
    return "";
  }

  const projection = getExpeditionJourneyProjection(currentJourney);
  const nextStage = currentJourney.stages?.[currentJourney.currentStageIndex] ?? null;
  return `
    <section class="panel expedition-pending-panel">
      <div class="panel__header">
        <div>
          <h3>Journey Debriefs</h3>
          <span class="panel__subtle">Returned expeditions now resolve their route one decision at a time before rewards are granted.</span>
        </div>
        <button class="button" type="button" data-action="open-expedition-journey">Open Debrief</button>
      </div>
      <div class="expedition-preview-grid">
        <article><span>Waiting</span><strong>${formatNumber(pending.length, 0)}</strong></article>
        <article><span>Current Route</span><strong>${escapeHtml(currentJourney.expedition.missionName ?? currentJourney.expedition.typeLabel)}</strong></article>
        <article><span>Stage</span><strong>${formatNumber(Math.min(currentJourney.currentStageIndex + 1, currentJourney.stages.length), 0)} / ${formatNumber(currentJourney.stages.length, 0)}</strong></article>
        <article><span>Projected Outcome</span><strong>${escapeHtml(projection.outcomeLabel)}</strong></article>
      </div>
      <p class="expedition-pending-panel__copy">
        ${
          nextStage
            ? escapeHtml(`Next call: ${nextStage.title}. ${nextStage.prompt}`)
            : escapeHtml("A returned crew is ready for final debrief decisions.")
        }
      </p>
      <div class="expedition-return-list">
        ${pending
          .slice(0, 3)
          .map((journey) => `
            <article class="expedition-return-card">
              <div class="expedition-return-card__head">
                <strong>${escapeHtml(journey.expedition.missionName ?? journey.expedition.typeLabel)}</strong>
                <span>${formatNumber(Math.min(journey.currentStageIndex + 1, journey.stages.length), 0)} / ${formatNumber(journey.stages.length, 0)}</span>
              </div>
              <p>${escapeHtml(journey.expedition.missionSummary ?? journey.expedition.notes ?? "Returned expedition awaiting debrief.")}</p>
              <div class="expedition-return-card__meta">
                <span>${escapeHtml(journey.returnDateLabel)}</span>
                <span>${escapeHtml(journey.expedition.vehicleName)}</span>
              </div>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderExpeditionSummary(state) {
  const overview = getExpeditionOverview(state);
  return `
    <section class="panel expedition-summary-panel">
      <div class="panel__header">
        <h3>Expedition Command</h3>
        <span class="panel__subtle">Mission cards rotate over time, vehicles gate departures, and Unique Citizens arrive only after repeated success.</span>
      </div>
      <div class="expedition-preview-grid">
        <article><span>Board</span><strong>${formatNumber(overview.boardMissions)}</strong></article>
        <article><span>Active</span><strong>${formatNumber(overview.activeExpeditions)}</strong></article>
        <article><span>Debriefs</span><strong>${formatNumber(overview.pendingJourneys ?? 0, 0)}</strong></article>
        <article><span>Vehicles Free</span><strong>${formatNumber(overview.freeVehicles)} / ${formatNumber(overview.totalVehicles)}</strong></article>
        <article><span>Unique Progress</span><strong>${formatNumber(overview.uniqueProgress, 0)} / ${formatNumber(overview.nextUniqueThreshold, 0)}</strong></article>
        <article><span>Unique Citizens</span><strong>${formatNumber(overview.uniqueCitizens)}</strong></article>
      </div>
      <div class="expedition-summary-panel__guidance">
        <article class="expedition-guidance-card">
          <strong>Quick Start</strong>
          <ul>
            <li>Pick a mission card from the Mission Board.</li>
            <li>Each expedition needs exactly one free vehicle.</li>
            <li>Better vehicles shorten travel time by different amounts.</li>
            <li>Returned expeditions open journey debriefs every 4 travel days, up to 5 stages.</li>
            <li>Long success fills the Unique Citizen meter.</li>
          </ul>
        </article>
        <article class="expedition-guidance-card">
          <strong>Board Rules</strong>
          <ul>
            <li>The Mission Board refreshes every 7 days.</li>
            <li>It rolls 5-7 normal cards and 0-2 special cards.</li>
            <li>Taking every card does not force an early reroll.</li>
            <li>GM can refresh the board manually for testing.</li>
          </ul>
        </article>
      </div>
      ${
        state.ui?.adminUnlocked
          ? `
            <div class="expedition-gm-strip">
              <strong>GM Expedition Tools</strong>
              <div class="expedition-button-row">
                <button class="button button--ghost" type="button" data-action="refresh-expedition-board">Refresh Board</button>
                <button class="button button--ghost" type="button" data-action="force-return-expedition" ${overview.activeExpeditions ? "" : "disabled"}>Force Soonest Return</button>
                <button class="button button--ghost" type="button" data-action="advance-time" data-step="day">+1 Day</button>
                <button class="button button--ghost" type="button" data-action="adjust-vehicle-count" data-vehicle-id="trailBuggy" data-delta="1">+ Trail Buggy</button>
                <button class="button button--ghost" type="button" data-action="adjust-vehicle-count" data-vehicle-id="elementalSkiff" data-delta="1">+ Elemental Skiff</button>
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

export function renderExpeditionsPage(state) {
  const draft = getDefaultDraft(state);
  const selectedMission = (state.expeditions?.board ?? []).find((mission) => mission.id === draft.missionId) ?? (state.expeditions?.board ?? [])[0] ?? null;
  const expeditionType = EXPEDITION_TYPES[selectedMission?.typeId ?? draft.typeId] ?? EXPEDITION_TYPES[EXPEDITION_ORDER[0]];

  return {
    title: "Expeditions",
    subtitle: "Send crews beyond the Drift, then debrief their trip stage by stage before the final haul is settled.",
    content: `
      ${renderExpeditionSummary(state)}
      ${renderPendingJourneyPanel(state)}
      <section class="panel expedition-launch-panel">
        <div class="panel__header">
          <h3>Mission Board</h3>
          <span class="panel__subtle">The board refreshes with fresh opportunities, including a random number of special missions.</span>
        </div>
        ${renderMissionBoard(state, draft)}
      </section>
      <section class="panel expedition-launch-panel">
        <div class="panel__header">
          <h3>Prepare Mission</h3>
          <span class="panel__subtle">Choose the vehicle, approach, crew, and supplies for the selected card.</span>
        </div>
        <div class="expedition-launch-panel__stack">
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
