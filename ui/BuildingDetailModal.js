import { getBuildingEconomySummary, getBuildingEmoji } from "../content/BuildingCatalog.js?v=v1.7.20-20260615092907";
import { RARITY_COLORS } from "../content/Rarities.js?v=v1.7.20-20260615092907";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js?v=v1.7.20-20260615092907";
import { formatDate } from "../systems/CalendarSystem.js?v=v1.7.20-20260615092907";
import { getFoodOutputMultiplier, getGoldOutputMultiplier } from "../systems/CityConditionSystem.js?v=v1.7.20-20260615092907";
import { formatBuildingExactQualityDisplay, formatBuildingQualityDisplay, getBuildingMultiplier, isBuildingAtApex } from "../systems/BuildingSystem.js?v=v1.7.20-20260615092907";
import {
  getConstructionEtaDetails,
  getConstructionQueuePosition,
  getDriftConstructionSlots,
  isBuildingActivelyConstructed
} from "../systems/ConstructionSystem.js?v=v1.7.20-20260615092907";
import { getBuildingPlacementBonuses } from "../systems/MapSystem.js?v=v1.7.20-20260615092907";
import { getTradeGoodsGoldMultiplier } from "../systems/ResourceSystem.js?v=v1.7.20-20260615092907";
import { applyBuildingWorkforceToResource, getBuildingWorkforceStatus, getBuildingWorkforceMultiplier, getWorkforceSummary } from "../systems/WorkforceSystem.js?v=v1.7.20-20260615092907";
import { renderBuildingArt } from "./BuildingArt.js?v=v1.7.20-20260615092907";
import { renderModal } from "./Modal.js?v=v1.7.20-20260615092907";

function renderList(items, inactive) {
  return Object.entries(items)
    .map(
      ([label, value]) => `
        <li class="${inactive ? "is-muted" : ""}">
          <span>${escapeHtml(label)}</span>
          <strong>${formatSigned(value)}</strong>
        </li>
      `
    )
    .join("");
}

function renderTagRow(tags) {
  if (!tags?.length) {
    return `<span class="detail-chip">Untyped</span>`;
  }

  return tags.map((tag) => `<span class="detail-chip">${escapeHtml(tag)}</span>`).join("");
}

function formatFlowList(entries, emptyLabel) {
  if (!entries.length) {
    return `<p class="empty-state">${emptyLabel}</p>`;
  }

  return `
    <ul class="building-detail__list">
      ${entries
        .map(
          (entry) => `
            <li>
              <span>${escapeHtml(entry.key)}</span>
              <strong>${formatSigned(entry.value)}</strong>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function getSignatureReadout(building) {
  return [
    ...Object.entries(building.stats).map(([label, value]) => ({ label, value })),
    ...Object.entries(building.resourceRates).map(([label, value]) => ({ label: `${label}/day`, value }))
  ]
    .filter((entry) => Math.abs(entry.value) > 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 5);
}

function getQualityMultiplierReadout(building) {
  const multiplier = getBuildingMultiplier(building?.quality ?? 0);
  return `${formatBuildingExactQualityDisplay(building)}${multiplier > 1 ? ` · ${multiplier}x` : ""}`;
}

function getEffectiveRateSummary(building, state, workforceSummary, placementBonus) {
  const workforceMultiplier = getBuildingWorkforceMultiplier(building, workforceSummary);
  const placementMultiplier = 1 + placementBonus.totalPercent;
  const tradeGoodsGoldMultiplier = getTradeGoodsGoldMultiplier(state);
  const goldOutputMultiplier = getGoldOutputMultiplier(state);
  const foodOutputMultiplier = getFoodOutputMultiplier(state);

  return Object.entries(building.resourceRates ?? {})
    .map(([resource, value]) => {
      let nextValue = applyBuildingWorkforceToResource(value, workforceMultiplier) * building.multiplier * placementMultiplier;
      if (resource === "gold" && nextValue > 0 && building.tags?.includes("trade")) {
        nextValue *= tradeGoodsGoldMultiplier;
      }
      if (resource === "gold" && nextValue > 0) {
        nextValue *= goldOutputMultiplier;
      }
      if (resource === "food" && nextValue > 0) {
        nextValue *= foodOutputMultiplier;
      }
      return { key: `${resource}/day`, value: nextValue };
    })
    .filter((entry) => Math.abs(entry.value) > 0.05)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 4);
}

export function renderBuildingDetailModal(state, pageKey) {
  const buildingId = state.transientUi?.inspectedBuildingId;
  if (!buildingId) {
    return "";
  }

  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return "";
  }

  const isIncomplete = !building.isComplete;
  const isRuined = Boolean(building.isRuined);
  const isActiveConstruction = isIncomplete && isBuildingActivelyConstructed(state, building.id);
  const etaDetails = isIncomplete ? getConstructionEtaDetails(building, state) : null;
  const queuePosition = isIncomplete ? getConstructionQueuePosition(state, building.id) : -1;
  const driftSlots = getDriftConstructionSlots(state);
  const eta = isActiveConstruction && etaDetails?.readyDayOffset !== null ? formatDate(etaDetails.readyDayOffset) : null;
  const placementBonus = getBuildingPlacementBonuses(state, building);
  const signatureReadout = getSignatureReadout(building);
  const economySummary = getBuildingEconomySummary(building);
  const workforceSummary = getWorkforceSummary(state);
  const workforceStatus = getBuildingWorkforceStatus(building, workforceSummary);
  const effectiveRateSummary = getEffectiveRateSummary(building, state, workforceSummary, placementBonus);
  const buildingEmoji = getBuildingEmoji(building);
  const artMarkup = renderBuildingArt(
    building,
    `${building.displayName} artwork`,
    `<div class="building-detail__fallback">${escapeHtml(buildingEmoji)}</div>`
  );
  const hasUploadedArt = typeof building.imageData === "string" && building.imageData.startsWith("data:image/");

  const content = `
    <article class="building-detail" style="--rarity-color:${RARITY_COLORS[building.rarity]}">
      <div class="building-detail__hero">
        <div class="building-detail__showcase">
          <div class="building-detail__art">${artMarkup}</div>
          <div class="building-detail__art-tools">
            <label class="button button--ghost button--small">
              <span>${hasUploadedArt ? "Replace Image" : "Upload Image"}</span>
              <input
                type="file"
                accept="image/*"
                hidden
                data-action="upload-building-image"
                data-building-id="${escapeHtml(building.id)}"
              />
            </label>
            ${
              hasUploadedArt
                ? `<button class="button button--ghost button--small" type="button" data-action="clear-building-image" data-building-id="${escapeHtml(building.id)}">Reset to Default</button>`
                : ""
            }
          </div>
          <div class="building-detail__spotlights">
            <article class="building-detail__spotlight">
              <span>Placement Resonance</span>
              <strong>${formatNumber(placementBonus.totalPercent * 100, 1)}%</strong>
              <small>${
                placementBonus.reasons.length
                  ? escapeHtml(placementBonus.reasons.join(" / "))
                  : "No terrain or adjacency bonus yet."
              }</small>
            </article>
            <article class="building-detail__spotlight">
              <span>Terrain Seat</span>
              <strong>${escapeHtml(placementBonus.terrain ?? "Unplaced")}</strong>
              <small>${building.mapPosition ? `Hex ${building.mapPosition.q}, ${building.mapPosition.r}` : "Place on the map to gain terrain bonuses."}</small>
            </article>
          </div>
        </div>
        <div class="building-detail__copy">
          <p class="building-detail__eyebrow">${escapeHtml(building.rarity)} Structure / ${escapeHtml(building.district)}</p>
          <h3>${escapeHtml(`${buildingEmoji} ${building.displayName}`)}</h3>
          <p class="building-detail__effect">${escapeHtml(building.specialEffect)}</p>
          <p class="building-detail__flavor">${escapeHtml(building.flavorText ?? "No flavor text has been etched into the city chronicle yet.")}</p>
          <div class="building-detail__chips">
            <span class="detail-chip">${isRuined ? "Ruined" : building.isComplete ? escapeHtml(formatBuildingQualityDisplay(building)) : "Inactive"}</span>
            <span class="detail-chip">${escapeHtml(getQualityMultiplierReadout(building))}</span>
            <span class="detail-chip">${building.mapPosition ? `Hex ${building.mapPosition.q}, ${building.mapPosition.r}` : "Unplaced"}</span>
            ${workforceStatus.totalMultiplier < 0.999 ? `<span class="detail-chip detail-chip--warning">Understaffed</span>` : ""}
          </div>
          <div class="building-detail__actions">
            <button class="button" data-action="select-building" data-building-id="${building.id}">Select Building</button>
            <button class="button button--ghost" data-action="close-modal" data-modal="building-detail-modal">Close</button>
            ${
              state.ui.adminUnlocked
                ? `<button class="button button--ghost button--danger" data-action="remove-building" data-building-id="${building.id}">Unmanifest Building</button>`
                : ""
            }
            ${pageKey === "city" ? "" : `<a class="button button--ghost" href="./city.html">Open City Map</a>`}
          </div>
          ${
            state.ui.adminUnlocked
              ? `
                <div class="building-detail__gm-tools">
                  <label class="building-detail__gm-quality-editor">
                    <span>GM Quality %</span>
                    <div class="gm-quality-stepper">
                      <button class="button button--ghost gm-quality-stepper__button" type="button" data-action="nudge-building-quality-input" data-delta="-10">-10</button>
                      <button class="button button--ghost gm-quality-stepper__button" type="button" data-action="nudge-building-quality-input" data-delta="-1">-1</button>
                    </div>
                    <input
                      class="building-detail__gm-quality-input"
                      type="number"
                      min="0"
                      max="350"
                      step="0.1"
                      value="${Number(building.quality ?? 0)}"
                      data-role="gm-building-quality-input"
                    />
                    <div class="gm-quality-stepper">
                      <button class="button button--ghost gm-quality-stepper__button" type="button" data-action="nudge-building-quality-input" data-delta="1">+1</button>
                      <button class="button button--ghost gm-quality-stepper__button" type="button" data-action="nudge-building-quality-input" data-delta="10">+10</button>
                    </div>
                  </label>
                  <button class="button button--ghost" data-action="save-building-quality" data-building-id="${building.id}">Save Quality</button>
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div class="building-detail__grid">
        <section class="building-detail__panel building-detail__panel--apex ${isBuildingAtApex(building) ? "is-apex-active" : ""}">
          <h4>350% Apex Bonus</h4>
          <p class="building-detail__status-note">${
            isBuildingAtApex(building)
              ? "This building has reached 350% — its apex bonus is active."
              : `Reached at 350% quality (currently ${formatBuildingExactQualityDisplay(building)}). Note the bonus here so it is ready when it caps.`
          }</p>
          <textarea
            class="building-detail__apex-input"
            data-action="set-building-apex-note"
            data-building-id="${building.id}"
            rows="3"
            placeholder="Describe the special bonus this building grants at 350% (e.g. doubles adjacent district output, unlocks a unique action)..."
          >${escapeHtml(building.apexNote ?? "")}</textarea>
        </section>

        <section class="building-detail__panel">
          <h4>Building Role</h4>
          <p class="building-detail__role-line">${escapeHtml(`${economySummary.role.emoji} ${economySummary.role.label} - ${economySummary.role.detail}`)}</p>
          <div class="building-detail__chips">${renderTagRow(building.tags)}</div>
        </section>

        <section class="building-detail__panel">
          <h4>Workforce</h4>
          <ul class="building-detail__facts">
            <li><span>Role Crew</span><strong>${escapeHtml(workforceStatus.categoryLabel)}</strong></li>
            <li><span>Total Multiplier</span><strong>x${formatNumber(workforceStatus.totalMultiplier ?? 1, 2)}</strong></li>
            <li><span>General Staffing</span><strong>${formatNumber((workforceStatus.generalRatio ?? 1) * 100, 0)}%</strong></li>
            <li><span>Specialist Staffing</span><strong>${formatNumber((workforceStatus.specialistRatio ?? 1) * 100, 0)}%</strong></li>
            <li><span>General Demand</span><strong>${formatNumber(workforceStatus.demand ?? 0, 1)}</strong></li>
            <li><span>Specialist Demand</span><strong>${formatNumber(workforceStatus.specialistDemand ?? 0, 1)}</strong></li>
          </ul>
          <p class="building-detail__status-note">${escapeHtml(workforceStatus.note)}</p>
        </section>

        <section class="building-detail__panel">
          <h4>Signature Output</h4>
          <div class="building-detail__signature">
            ${
              signatureReadout.length
                ? signatureReadout
                    .map(
                      (entry) => `
                        <article>
                          <span>${escapeHtml(entry.label)}</span>
                          <strong>${formatSigned(entry.value)}</strong>
                        </article>
                      `
                    )
                    .join("")
                : `<p class="empty-state">This structure has no standout signature yet.</p>`
            }
          </div>
        </section>

        <section class="building-detail__panel">
          <h4>Construction</h4>
          <ul class="building-detail__facts">
            <li><span>Status</span><strong>${isRuined ? "Ruined / Offline" : building.isComplete ? "Active" : isActiveConstruction ? "Incubating" : "Queued"}</strong></li>
            <li><span>Incubation</span><strong>${isIncomplete ? etaDetails?.isStalled ? "Stalled" : `${formatNumber(etaDetails?.totalBpd ?? 0, 1)} build points/day` : "Already active"}</strong></li>
            <li><span>Progress</span><strong>${isIncomplete ? `${formatNumber(etaDetails?.dailyPercent ?? 0, 2)}% quality / day` : "Finished"}</strong></li>
            <li><span>Forecast</span><strong>${building.isComplete ? escapeHtml(building.completedAt ?? "Completed") : escapeHtml(eta ?? "Waiting for a slot")}</strong></li>
            <li><span>Drift Queue</span><strong>${building.isComplete ? "Finished" : isActiveConstruction ? `Active within ${driftSlots} slots` : `Queued #${queuePosition + 1}`}</strong></li>
            <li><span>Support Mix</span><strong>${isIncomplete ? `Structures ${formatNumber(etaDetails?.buildingSupportBpd ?? 0, 1)} / Staff ${formatNumber(etaDetails?.workforceSupportBpd ?? 0, 1)}` : "Not needed"}</strong></li>
            <li><span>Daily Drain</span><strong>${
              isIncomplete
                ? `M ${formatNumber(etaDetails?.dailyCosts?.materials ?? 0, 1)} / S ${formatNumber(etaDetails?.dailyCosts?.salvage ?? 0, 1)} / Mn ${formatNumber(etaDetails?.dailyCosts?.mana ?? 0, 1)}`
                : "No active drain"
            }</strong></li>
          </ul>
          ${
            isIncomplete
              ? `<p class="building-detail__status-note">${escapeHtml(
                  etaDetails?.isStalled
                    ? `Why stalled: ${etaDetails?.stallReasons?.join(", ") || "incubation is offline."}`
                    : etaDetails?.accelerationApplied
                      ? "Incubation acceleration is active and consuming the listed daily resources."
                      : etaDetails?.accelerationReasons?.length
                        ? `Acceleration offline: ${etaDetails.accelerationReasons.join(", ")}.`
                        : "Incubation is healthy at its normal daily speed."
                )}</p>`
              : economySummary.supportBpd
                ? `<p class="building-detail__status-note">This active building contributes ${formatNumber(economySummary.supportBpd * (building.multiplier || 1), 0)} support build points/day to all incubators at its current stage.</p>`
                : ""
          }
        </section>

        <section class="building-detail__panel">
          <h4>City Stats</h4>
          <ul class="building-detail__list">${renderList(building.stats, isIncomplete)}</ul>
        </section>

        <section class="building-detail__panel">
          <h4>Resource Rhythm</h4>
          <ul class="building-detail__list">${renderList(building.resourceRates, isIncomplete)}</ul>
        </section>

        <section class="building-detail__panel">
          <h4>Effective Output</h4>
          ${
            effectiveRateSummary.length
              ? `<ul class="building-detail__list">${renderList(Object.fromEntries(effectiveRateSummary.map((entry) => [entry.key, entry.value])), isIncomplete)}</ul>`
              : `<p class="empty-state">No strong staffed daily flow.</p>`
          }
          <p class="building-detail__status-note">Shown after workforce, placement, and city output multipliers.</p>
        </section>

        <section class="building-detail__panel">
          <h4>Consumes / Produces</h4>
          <div class="building-detail__flow-grid">
            <div>
              <h5>Produces</h5>
              ${formatFlowList(economySummary.produces, "No direct resource production.")}
            </div>
            <div>
              <h5>Consumes</h5>
              ${formatFlowList(economySummary.consumes, "No direct operating cost beyond passive presence.")}
            </div>
          </div>
          ${
            economySummary.supportBpd
              ? `<p class="building-detail__status-note">Construction support: ${formatNumber(economySummary.supportBpd, 0)} base build points/day before stage scaling.</p>`
              : ""
          }
          ${
            isIncomplete && (etaDetails?.workforceSupportBpd ?? 0) > 0
              ? `<p class="building-detail__status-note">Excess workforce adds ${formatNumber(etaDetails.workforceSupportBpd, 1)} build points/day to this incubation lane before speed scaling.</p>`
              : ""
          }
        </section>

        <section class="building-detail__panel">
          <h4>Placement Resonance</h4>
          <ul class="building-detail__facts">
            <li><span>Total Bonus</span><strong>${formatNumber(placementBonus.totalPercent * 100, 1)}%</strong></li>
            <li><span>Same District Links</span><strong>${placementBonus.sameDistrictNeighbors}</strong></li>
            <li><span>Related Tag Links</span><strong>${placementBonus.relatedTagNeighbors}</strong></li>
            <li><span>Terrain Affinity</span><strong>${formatNumber(placementBonus.terrainPercent * 100, 1)}%</strong></li>
          </ul>
        </section>

        <section class="building-detail__panel">
          <h4>Chronicle Marks</h4>
          <ul class="building-detail__facts">
            <li><span>Created</span><strong>${escapeHtml(building.createdAt)}</strong></li>
            <li><span>Last Raised</span><strong>${escapeHtml(building.lastManifestedAt)}</strong></li>
            <li><span>Completed</span><strong>${escapeHtml(building.completedAt ?? "Not yet")}</strong></li>
          </ul>
        </section>
      </div>
    </article>
  `;

  return renderModal({
    id: "building-detail-modal",
    title: `${building.displayName} Dossier`,
    content,
    open: true,
    wide: true
  });
}
