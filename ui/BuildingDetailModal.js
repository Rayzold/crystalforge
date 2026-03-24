import { getBuildingEconomySummary, getBuildingEmoji } from "../content/BuildingCatalog.js";
import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getFoodOutputMultiplier, getGoldOutputMultiplier } from "../systems/CityConditionSystem.js";
import { formatBuildingExactQualityDisplay, formatBuildingQualityDisplay, getBuildingMultiplier } from "../systems/BuildingSystem.js";
import {
  getConstructionEtaDetails,
  getConstructionQueuePosition,
  getDriftConstructionSlots,
  isBuildingActivelyConstructed
} from "../systems/ConstructionSystem.js";
import { getBuildingPlacementBonuses } from "../systems/MapSystem.js";
import { getTradeGoodsGoldMultiplier } from "../systems/ResourceSystem.js";
import { applyBuildingWorkforceToResource, getBuildingWorkforceStatus, getBuildingWorkforceMultiplier, getWorkforceSummary } from "../systems/WorkforceSystem.js";
import { renderBuildingArt } from "./BuildingArt.js";
import { renderModal } from "./Modal.js";

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
    building.imagePath,
    `${building.displayName} artwork`,
    `<div class="building-detail__fallback">${escapeHtml(buildingEmoji)}</div>`
  );

  const content = `
    <article class="building-detail" style="--rarity-color:${RARITY_COLORS[building.rarity]}">
      <div class="building-detail__hero">
        <div class="building-detail__showcase">
          <div class="building-detail__art">${artMarkup}</div>
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
        </div>
      </div>

      <div class="building-detail__grid">
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
