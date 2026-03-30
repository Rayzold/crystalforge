// Vehicle roster page.
// Vehicles gate how many expeditions can be active at once and expose GM-side
// fleet adjustment controls after the hidden admin mode is unlocked.
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getAvailableVehicleCounts, getVehicleAssignments } from "../systems/ExpeditionSystem.js";
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER } from "../content/VehicleConfig.js";
import { EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";

function renderVehicleCard(state, vehicleId) {
  const definition = VEHICLE_DEFINITIONS[vehicleId];
  const total = Number(state.vehicles?.[vehicleId] ?? 0) || 0;
  const assigned = Number(getVehicleAssignments(state)?.[vehicleId] ?? 0) || 0;
  const available = Number(getAvailableVehicleCounts(state)?.[vehicleId] ?? 0) || 0;
  return `
    <article class="panel vehicle-card">
      <div class="vehicle-card__head">
        <div>
          <p class="vehicle-card__eyebrow">${escapeHtml(definition.sizeLabel ?? (definition.type === "air" ? "Air Vehicle" : "Land Vehicle"))}</p>
          <h3>${escapeHtml(`${definition.emoji} ${definition.name}`)}</h3>
        </div>
        <strong>${formatNumber(total)}</strong>
      </div>
      <p>${escapeHtml(definition.summary)}</p>
      <div class="vehicle-card__stats">
        <article><span>Free</span><strong>${formatNumber(available)}</strong></article>
        <article><span>Assigned</span><strong>${formatNumber(assigned)}</strong></article>
        <article><span>Time</span><strong>x${formatNumber(definition.timeMultiplier ?? 1, 2)}</strong></article>
        <article><span>Cargo</span><strong>x${formatNumber(definition.cargoMultiplier, 2)}</strong></article>
        <article><span>Safety</span><strong>x${formatNumber(definition.safety ?? 1, 2)}</strong></article>
        <article><span>Scout</span><strong>x${formatNumber(definition.scouting ?? 1, 2)}</strong></article>
      </div>
      <p class="panel__subtle">Best for: ${escapeHtml((definition.favoredMissionTags ?? []).map((typeId) => EXPEDITION_TYPES[typeId]?.label ?? typeId).join(", "))}</p>
      ${
        state.ui?.adminUnlocked
          ? `
            <div class="vehicle-card__actions">
              <button type="button" class="button button--ghost" data-action="adjust-vehicle-count" data-vehicle-id="${vehicleId}" data-delta="-1">-1</button>
              <button type="button" class="button" data-action="adjust-vehicle-count" data-vehicle-id="${vehicleId}" data-delta="1">+1</button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

export function renderVehiclesPage(state) {
  const totalVehicles = VEHICLE_ORDER.reduce((sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0), 0);
  const availableVehicles = VEHICLE_ORDER.reduce((sum, vehicleId) => sum + (Number(getAvailableVehicleCounts(state)?.[vehicleId] ?? 0) || 0), 0);
  const airVehicles = VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId].type === "air").reduce(
    (sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0),
    0
  );

  return {
    title: "Vehicles",
    subtitle: "Each expedition needs a vehicle, and stronger buggies or airships shorten the journey by different amounts.",
    content: `
      <section class="panel vehicle-summary-panel">
        <div class="panel__header">
          <h3>Fleet Summary</h3>
          <span class="panel__subtle">Three land buggies and three elemental airships now define how many expeditions can leave the Drift at once.</span>
        </div>
        <div class="vehicle-card__stats">
          <article><span>Total Fleet</span><strong>${formatNumber(totalVehicles)}</strong></article>
          <article><span>Free Vehicles</span><strong>${formatNumber(availableVehicles)}</strong></article>
          <article><span>Air Vehicles</span><strong>${formatNumber(airVehicles)}</strong></article>
          <article><span>Rule</span><strong>1 vehicle = 1 expedition</strong></article>
        </div>
      </section>
      <div class="vehicle-grid">
        ${VEHICLE_ORDER.map((vehicleId) => renderVehicleCard(state, vehicleId)).join("")}
      </div>
    `
  };
}
