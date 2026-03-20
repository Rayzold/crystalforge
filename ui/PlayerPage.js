import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getActiveConstructionQueue } from "../systems/ConstructionSystem.js";
import { renderCrystalSelector } from "./CrystalSelector.js";
import { renderManifestPanel } from "./ManifestPanel.js";

function renderBuildingList(title, subtitle, buildings, emptyText) {
  return `
    <section class="panel player-list">
      <div class="panel__header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <span class="panel__subtle">${escapeHtml(subtitle)}</span>
        </div>
      </div>
      ${
        buildings.length
          ? `
            <div class="player-list__items">
              ${buildings
                .map(
                  (building) => `
                    <article class="player-list__item">
                      <div>
                        <strong>${escapeHtml(building.displayName)}</strong>
                        <span>${escapeHtml(building.rarity)} / ${escapeHtml(building.district ?? "Unassigned")}</span>
                      </div>
                      <em>${building.isComplete ? `x${formatNumber(building.multiplier, 0)}` : `${formatNumber(building.quality, 0)}%`}</em>
                    </article>
                  `
                )
                .join("")}
            </div>
          `
          : `<p class="empty-state">${escapeHtml(emptyText)}</p>`
      }
    </section>
  `;
}

export function renderPlayerPage(state) {
  const manifested = state.buildings
    .filter((building) => building.isComplete)
    .sort((left, right) => right.quality - left.quality);
  const incubating = getActiveConstructionQueue(state);
  const totalRolls = Object.values(state.crystals ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return {
    title: "Player Screen",
    subtitle: "Available crystals, live manifestation, and the current building roster.",
    content: `
      <section class="player-hero">
        <div>
          <p class="player-hero__eyebrow">Shared Realm View</p>
          <h2>Manifest What The Drift Can Hold</h2>
          <p>Use this screen during play for crystal rolls and a clean read on what already exists or is still growing.</p>
        </div>
        <div class="player-hero__meta">
          <article>
            <span>Available Crystals</span>
            <strong>${formatNumber(totalRolls, 0)}</strong>
          </article>
          <article>
            <span>Manifested</span>
            <strong>${formatNumber(manifested.length, 0)}</strong>
          </article>
          <article>
            <span>Incubating</span>
            <strong>${formatNumber(incubating.length, 0)}</strong>
          </article>
        </div>
      </section>
      ${renderCrystalSelector(state)}
      ${renderManifestPanel(state)}
      <section class="player-lists">
        ${renderBuildingList("Existing Buildings", "Manifested and already part of the Drift.", manifested, "No manifested buildings yet.")}
        ${renderBuildingList("Incubated Buildings", "Buildings currently growing inside an incubator slot.", incubating, "Nothing is incubating right now.")}
      </section>
    `
  };
}
