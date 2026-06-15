// Army overview page.
// A read-only muster of the city's military strength, pulled together from the
// systems that own each piece: martial citizens, Awakened operatives, defensive
// structures, the vehicle fleet, and held behemoth war beasts. Editing happens
// on each source page — this screen just consolidates the picture.
import { CITIZEN_DEFINITIONS, CITIZEN_GROUP_ORDER } from "../content/CitizenConfig.js?v=v1.7.20-20260615130257";
import {
  AWAKENED_GRADES,
  getAwakenedAbilityTypeLabel,
  getAwakenedStatusLabel
} from "../content/AwakenedConfig.js?v=v1.7.20-20260615130257";
import { VEHICLE_DEFINITIONS, VEHICLE_ORDER } from "../content/VehicleConfig.js?v=v1.7.20-20260615130257";
import { getBehemothStatusLabel } from "../content/BehemothConfig.js?v=v1.7.20-20260615130257";
import { getBuildingEmoji } from "../content/BuildingCatalog.js?v=v1.7.20-20260615180000";
import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.20-20260615130257";
import { getAvailableVehicleCounts, getVehicleAssignments } from "../systems/ExpeditionSystem.js?v=v1.7.20-20260615130257";
import { getBuildingMultiplier } from "../systems/BuildingSystem.js?v=v1.7.20-20260615130257";

const BEHEMOTH_HELD_STATUSES = new Set(["captured", "bonded"]);
const AWAKENED_GRADE_RANK = Object.fromEntries(AWAKENED_GRADES.map((grade, index) => [grade.id, index]));

// A citizen class counts as martial if it carries defense or security weight.
// Role is decided by the dominant stat: defense-leaning classes form the strike
// force (offensive), security-leaning classes form the garrison (defensive).
function getMartialCitizenClasses() {
  const classes = [];
  for (const groupTitle of CITIZEN_GROUP_ORDER) {
    for (const [name, definition] of Object.entries(CITIZEN_DEFINITIONS)) {
      if (definition.group !== groupTitle) {
        continue;
      }
      const defense = Number(definition.stats?.defense ?? 0);
      const security = Number(definition.stats?.security ?? 0);
      if (defense <= 0 && security <= 0) {
        continue;
      }
      classes.push({
        name,
        emoji: definition.emoji ?? "*",
        defense,
        security,
        role: defense >= security ? "offensive" : "defensive"
      });
    }
  }
  return classes;
}

function renderForceGroup(state, title, units, emptyLabel) {
  if (!units.length) {
    return `
      <section class="army-group">
        <h4>${escapeHtml(title)}</h4>
        <p class="empty-state">${escapeHtml(emptyLabel)}</p>
      </section>
    `;
  }
  const total = units.reduce((sum, unit) => sum + unit.count, 0);
  return `
    <section class="army-group">
      <div class="army-group__head">
        <h4>${escapeHtml(title)}</h4>
        <strong>${formatNumber(total)} troops</strong>
      </div>
      <div class="army-unit-list">
        ${units
          .map(
            (unit) => `
              <div class="army-unit-row ${unit.count <= 0 ? "is-empty" : ""}">
                <span class="army-unit-row__name"><span aria-hidden="true">${escapeHtml(unit.emoji)}</span> ${escapeHtml(unit.name)}</span>
                <span class="army-unit-row__count">${formatNumber(unit.count)}</span>
                <span class="army-unit-row__stat">DEF ${formatNumber(unit.defense, 2)} · SEC ${formatNumber(unit.security, 2)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAwakenedSection(state) {
  const roster = Array.isArray(state.awakened) ? [...state.awakened] : [];
  if (!roster.length) {
    return `
      <section class="panel army-panel">
        <div class="panel__header">
          <div><h3>Awakened Operatives</h3><span class="panel__subtle">Superhuman assets aligned with the city.</span></div>
          <a class="button button--ghost button--small" href="./awakened.html">Manage</a>
        </div>
        <p class="empty-state">No Awakened recorded yet. Add them on the Awakened page.</p>
      </section>
    `;
  }
  // Joined first, then by power grade (strongest first).
  const statusWeight = (entry) => (entry.status === "joined" ? 0 : entry.status === "recruiting" ? 1 : entry.status === "contacted" ? 2 : 3);
  roster.sort((a, b) => {
    const sw = statusWeight(a) - statusWeight(b);
    if (sw !== 0) return sw;
    return (AWAKENED_GRADE_RANK[b.grade] ?? -1) - (AWAKENED_GRADE_RANK[a.grade] ?? -1);
  });
  const joinedCount = roster.filter((entry) => entry.status === "joined").length;
  return `
    <section class="panel army-panel">
      <div class="panel__header">
        <div><h3>Awakened Operatives</h3><span class="panel__subtle">${formatNumber(joinedCount)} joined of ${formatNumber(roster.length)} tracked.</span></div>
        <a class="button button--ghost button--small" href="./awakened.html">Manage</a>
      </div>
      <div class="army-awakened-list">
        ${roster
          .map(
            (entry) => `
              <div class="army-awakened-row">
                <span class="awakened-grade awakened-grade--${escapeHtml(AWAKENED_GRADES.some((g) => g.id === entry.grade) ? entry.grade : "F")}">${escapeHtml(entry.grade)}</span>
                <div class="army-awakened-row__meta">
                  <strong>${escapeHtml(entry.name || "Unnamed Awakened")}</strong>
                  <span>${escapeHtml(getAwakenedAbilityTypeLabel(entry.abilityTypeId))} · ${escapeHtml(getAwakenedStatusLabel(entry.status))}</span>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDefensiveStructures(state) {
  const buildings = (state.buildings ?? [])
    .filter((building) => building.isComplete && !building.isRuined)
    .map((building) => {
      const multiplier = getBuildingMultiplier(building.quality) || 1;
      return {
        id: building.id,
        name: building.displayName ?? building.name,
        emoji: getBuildingEmoji(building),
        defense: Number(building.stats?.defense ?? 0) * multiplier,
        security: Number(building.stats?.security ?? 0) * multiplier
      };
    })
    .filter((building) => building.defense > 0 || building.security > 0)
    .sort((a, b) => b.defense + b.security - (a.defense + a.security));

  if (!buildings.length) {
    return `
      <section class="panel army-panel">
        <div class="panel__header">
          <div><h3>Defensive Structures</h3><span class="panel__subtle">Walls, fortifications, and watch posts.</span></div>
          <a class="button button--ghost button--small" href="./city.html">Open City</a>
        </div>
        <p class="empty-state">No active defensive buildings yet.</p>
      </section>
    `;
  }
  return `
    <section class="panel army-panel">
      <div class="panel__header">
        <div><h3>Defensive Structures</h3><span class="panel__subtle">${formatNumber(buildings.length)} active structures contributing defense or security.</span></div>
        <a class="button button--ghost button--small" href="./city.html">Open City</a>
      </div>
      <div class="army-structure-list">
        ${buildings
          .map(
            (building) => `
              <div class="army-structure-row">
                <span class="army-structure-row__name"><span aria-hidden="true">${escapeHtml(building.emoji)}</span> ${escapeHtml(building.name)}</span>
                <span class="army-structure-row__stat">DEF ${formatNumber(building.defense, 0)}</span>
                <span class="army-structure-row__stat">SEC ${formatNumber(building.security, 0)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderVessels(state) {
  const available = getAvailableVehicleCounts(state) ?? {};
  const assigned = getVehicleAssignments(state) ?? {};
  const rows = VEHICLE_ORDER.filter((vehicleId) => VEHICLE_DEFINITIONS[vehicleId]?.showInFleetRoster !== false)
    .map((vehicleId) => {
      const definition = VEHICLE_DEFINITIONS[vehicleId];
      const total = Number(state.vehicles?.[vehicleId] ?? 0) || 0;
      return {
        id: vehicleId,
        name: definition.name,
        emoji: definition.emoji ?? "*",
        total,
        free: Number(available[vehicleId] ?? 0) || 0,
        assigned: Number(assigned[vehicleId] ?? 0) || 0,
        capacity: Number(definition.maxPeople ?? 0) || 0
      };
    })
    .filter((row) => row.total > 0);

  const totalVessels = rows.reduce((sum, row) => sum + row.total, 0);
  const totalLift = rows.reduce((sum, row) => sum + row.total * row.capacity, 0);

  if (!rows.length) {
    return `
      <section class="panel army-panel">
        <div class="panel__header">
          <div><h3>Vessels</h3><span class="panel__subtle">Troop transport and air/land support.</span></div>
          <a class="button button--ghost button--small" href="./vehicles.html">Open Fleet</a>
        </div>
        <p class="empty-state">No vessels in the fleet yet.</p>
      </section>
    `;
  }
  return `
    <section class="panel army-panel">
      <div class="panel__header">
        <div><h3>Vessels</h3><span class="panel__subtle">${formatNumber(totalVessels)} vessels · up to ${formatNumber(totalLift)} crew lift.</span></div>
        <a class="button button--ghost button--small" href="./vehicles.html">Open Fleet</a>
      </div>
      <div class="army-structure-list">
        ${rows
          .map(
            (row) => `
              <div class="army-structure-row">
                <span class="army-structure-row__name"><span aria-hidden="true">${escapeHtml(row.emoji)}</span> ${escapeHtml(row.name)}</span>
                <span class="army-structure-row__stat">${formatNumber(row.total)} total · ${formatNumber(row.free)} free</span>
                <span class="army-structure-row__stat">${formatNumber(row.capacity)} crew each</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderBehemoths(state) {
  const held = (state.behemoths ?? []).filter((entry) => BEHEMOTH_HELD_STATUSES.has(entry.status));
  if (!held.length) {
    return `
      <section class="panel army-panel">
        <div class="panel__header">
          <div><h3>War Beasts</h3><span class="panel__subtle">Captured and bonded behemoths held at the Drift.</span></div>
          <a class="button button--ghost button--small" href="./behemoths.html">Manage</a>
        </div>
        <p class="empty-state">No captured or bonded behemoths yet.</p>
      </section>
    `;
  }
  held.sort((a, b) => Number(b.stats?.power ?? 0) - Number(a.stats?.power ?? 0));
  return `
    <section class="panel army-panel">
      <div class="panel__header">
        <div><h3>War Beasts</h3><span class="panel__subtle">${formatNumber(held.length)} behemoths held at the Drift.</span></div>
        <a class="button button--ghost button--small" href="./behemoths.html">Manage</a>
      </div>
      <div class="army-structure-list">
        ${held
          .map(
            (entry) => `
              <div class="army-structure-row">
                <span class="army-structure-row__name"><span aria-hidden="true">\u{1F409}</span> ${escapeHtml(entry.name || "Unnamed Behemoth")}</span>
                <span class="army-structure-row__stat">PWR ${formatNumber(Number(entry.stats?.power ?? 0))} · HP ${formatNumber(Number(entry.stats?.health ?? 0))}</span>
                <span class="army-structure-row__stat">${escapeHtml(getBehemothStatusLabel(entry.status))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderArmyPage(state) {
  const martialClasses = getMartialCitizenClasses().map((unit) => ({
    ...unit,
    count: Number(state.citizens?.[unit.name] ?? 0) || 0
  }));
  const offensiveUnits = martialClasses.filter((unit) => unit.role === "offensive");
  const defensiveUnits = martialClasses.filter((unit) => unit.role === "defensive");

  const totalMartial = martialClasses.reduce((sum, unit) => sum + unit.count, 0);
  const totalDefense = Number(state.cityStats?.defense ?? 0);
  const totalSecurity = Number(state.cityStats?.security ?? 0);
  const awakenedJoined = (state.awakened ?? []).filter((entry) => entry.status === "joined").length;
  const awakenedTotal = (state.awakened ?? []).length;
  const heldBehemoths = (state.behemoths ?? []).filter((entry) => BEHEMOTH_HELD_STATUSES.has(entry.status)).length;
  const totalVessels = VEHICLE_ORDER.reduce((sum, vehicleId) => sum + (Number(state.vehicles?.[vehicleId] ?? 0) || 0), 0);

  const content = `
    <section class="panel army-summary-panel">
      <div class="panel__header">
        <div>
          <h3>City Muster</h3>
          <span class="panel__subtle">A consolidated view of the Drift's fighting strength. Edit each force on its own page.</span>
        </div>
      </div>
      <div class="behemoth-summary army-summary">
        <article><span>City Defense</span><strong>${formatNumber(totalDefense, 0)}</strong></article>
        <article><span>City Security</span><strong>${formatNumber(totalSecurity, 0)}</strong></article>
        <article><span>Martial Citizens</span><strong>${formatNumber(totalMartial)}</strong></article>
        <article><span>Awakened (Joined)</span><strong>${formatNumber(awakenedJoined)} / ${formatNumber(awakenedTotal)}</strong></article>
        <article><span>War Beasts</span><strong>${formatNumber(heldBehemoths)}</strong></article>
        <article><span>Vessels</span><strong>${formatNumber(totalVessels)}</strong></article>
      </div>
    </section>

    <section class="panel army-panel">
      <div class="panel__header">
        <div><h3>Standing Forces</h3><span class="panel__subtle">Martial citizen classes, split by combat role.</span></div>
        <a class="button button--ghost button--small" href="./citizens.html">Open Citizens</a>
      </div>
      <div class="army-forces-grid">
        ${renderForceGroup(state, "Offensive Units", offensiveUnits, "No offensive units trained yet.")}
        ${renderForceGroup(state, "Defensive Units", defensiveUnits, "No defensive units posted yet.")}
      </div>
    </section>

    ${renderAwakenedSection(state)}
    ${renderDefensiveStructures(state)}
    ${renderVessels(state)}
    ${renderBehemoths(state)}
  `;

  return {
    title: "Army",
    subtitle: "The full muster of the Drift — forces, Awakened, defenses, vessels, and war beasts in one place.",
    content
  };
}
