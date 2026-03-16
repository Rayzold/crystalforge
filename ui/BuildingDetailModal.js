import { RARITY_COLORS } from "../content/Rarities.js";
import { escapeHtml, formatNumber, formatSigned } from "../engine/Utils.js";
import { formatDate } from "../systems/CalendarSystem.js";
import { getBuildingDailyRate } from "../systems/ConstructionSystem.js";
import { getBuildingPlacementBonuses } from "../systems/MapSystem.js";
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

function getSignatureReadout(building) {
  return [
    ...Object.entries(building.stats).map(([label, value]) => ({ label, value })),
    ...Object.entries(building.resourceRates).map(([label, value]) => ({ label: `${label}/day`, value }))
  ]
    .filter((entry) => Math.abs(entry.value) > 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 5);
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
  const rate = getBuildingDailyRate(building, state.constructionSpeedMultiplier);
  const daysRemaining = rate > 0 && isIncomplete ? Math.ceil((100 - building.quality) / rate) : 0;
  const eta = isIncomplete ? formatDate(state.calendar.dayOffset + daysRemaining) : null;
  const placementBonus = getBuildingPlacementBonuses(state, building);
  const signatureReadout = getSignatureReadout(building);
  const artMarkup = building.imagePath
    ? `<img src="${escapeHtml(building.imagePath)}" alt="${escapeHtml(building.displayName)} artwork" loading="lazy" />`
    : `<div class="building-detail__fallback">${escapeHtml(building.displayName.slice(0, 1))}</div>`;

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
          <p class="building-detail__eyebrow">${escapeHtml(building.rarity)} Manifest / ${escapeHtml(building.district)}</p>
          <h3>${escapeHtml(building.displayName)}</h3>
          <p class="building-detail__effect">${escapeHtml(building.specialEffect)}</p>
          <p class="building-detail__flavor">${escapeHtml(building.flavorText ?? "No flavor text has been etched into the city chronicle yet.")}</p>
          <div class="building-detail__chips">
            <span class="detail-chip">${building.isComplete ? `Active x${building.multiplier}` : "Inactive"}</span>
            <span class="detail-chip">${formatNumber(building.quality, 2)}% quality</span>
            <span class="detail-chip">${building.mapPosition ? `Hex ${building.mapPosition.q}, ${building.mapPosition.r}` : "Unplaced"}</span>
          </div>
          <div class="building-detail__actions">
            <button class="button" data-action="select-building" data-building-id="${building.id}">Select Building</button>
            <button class="button button--ghost" data-action="close-modal" data-modal="building-detail-modal">Close</button>
            ${pageKey === "city" ? "" : `<a class="button button--ghost" href="./city.html">Open City Map</a>`}
          </div>
        </div>
      </div>

      <div class="building-detail__grid">
        <section class="building-detail__panel">
          <h4>Role Sigils</h4>
          <div class="building-detail__chips">${renderTagRow(building.tags)}</div>
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
            <li><span>Status</span><strong>${building.isComplete ? "Completed" : "Auto-constructing"}</strong></li>
            <li><span>Rate</span><strong>${formatNumber(rate, 2)}% / day</strong></li>
            <li><span>Forecast</span><strong>${building.isComplete ? escapeHtml(building.completedAt ?? "Completed") : escapeHtml(eta ?? "Waiting")}</strong></li>
          </ul>
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
            <li><span>Last Manifested</span><strong>${escapeHtml(building.lastManifestedAt)}</strong></li>
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
