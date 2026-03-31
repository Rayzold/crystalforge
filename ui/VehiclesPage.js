// Vehicle roster page.
// Vehicles gate how many expeditions can be active at once and expose GM-side
// fleet adjustment controls after the hidden admin mode is unlocked.
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER, VEHICLE_TYPE_SECTIONS } from "../content/VehicleConfig.js";
import { EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getAvailableVehicleCounts, getVehicleAssignments } from "../systems/ExpeditionSystem.js";
import { renderVehicleArt } from "./VehicleArt.js";

function renderVehicleImage(definition, variant = "full") {
  const fallbackMarkup = `
    <div class="vehicle-art-fallback vehicle-art-fallback--${variant}" aria-hidden="true">
      <span>${escapeHtml(definition.emoji ?? "*")}</span>
    </div>
  `;
  return renderVehicleArt(definition.imagePath, `${definition.name} artwork`, fallbackMarkup);
}

function renderVehicleCard(state, vehicleId) {
  const definition = VEHICLE_DEFINITIONS[vehicleId];
  const total = Number(state.vehicles?.[vehicleId] ?? 0) || 0;
  const assigned = Number(getVehicleAssignments(state)?.[vehicleId] ?? 0) || 0;
  const available = Number(getAvailableVehicleCounts(state)?.[vehicleId] ?? 0) || 0;

  return `
    <article class="panel vehicle-card">
      <div class="vehicle-card__media">
        ${renderVehicleImage(definition)}
      </div>
      <div class="vehicle-card__content">
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
      </div>
    </article>
  `;
}

function renderVehicleGroup(state, section) {
  const vehicleIds = VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId].type === section.type);
  const total = vehicleIds.reduce((sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0), 0);
  const available = vehicleIds.reduce((sum, vehicleId) => sum + (Number(getAvailableVehicleCounts(state)?.[vehicleId] ?? 0) || 0), 0);

  return `
    <section class="panel vehicle-roster-panel">
      <div class="panel__header vehicle-roster-panel__head">
        <div>
          <h3>${escapeHtml(section.title)}</h3>
          <span class="panel__subtle">${escapeHtml(section.detail)}</span>
        </div>
        <div class="vehicle-roster-panel__counts">
          <strong>${formatNumber(available)} free</strong>
          <span>${formatNumber(total)} total</span>
        </div>
      </div>
      <div class="vehicle-grid">
        ${vehicleIds.map((vehicleId) => renderVehicleCard(state, vehicleId)).join("")}
      </div>
    </section>
  `;
}

export function renderVehiclesPage(state) {
  const totalVehicles = VEHICLE_ORDER.reduce((sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0), 0);
  const availableVehicles = VEHICLE_ORDER.reduce((sum, vehicleId) => sum + (Number(getAvailableVehicleCounts(state)?.[vehicleId] ?? 0) || 0), 0);
  const landVehicles = VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId].type === "land").reduce(
    (sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0),
    0
  );
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
          <span class="panel__subtle">The fleet is now split into separate land and air sections, and vehicle art can be added through the shared vehicles image folder.</span>
        </div>
        <div class="vehicle-card__stats">
          <article><span>Total Fleet</span><strong>${formatNumber(totalVehicles)}</strong></article>
          <article><span>Free Vehicles</span><strong>${formatNumber(availableVehicles)}</strong></article>
          <article><span>Land Vehicles</span><strong>${formatNumber(landVehicles)}</strong></article>
          <article><span>Air Vehicles</span><strong>${formatNumber(airVehicles)}</strong></article>
          <article><span>Rule</span><strong>1 vehicle = 1 expedition</strong></article>
        </div>
      </section>
      <div class="vehicle-groups">
        ${VEHICLE_TYPE_SECTIONS.map((section) => renderVehicleGroup(state, section)).join("")}
      </div>
    `
  };
}
