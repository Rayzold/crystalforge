import { escapeHtml, formatNumber } from "../engine/Utils.js";
import {
  getCurrentDriftEvolution,
  getDriftConstructionSlots,
  getNextDriftEvolutionStage,
  getPopulationGoals
} from "../systems/DriftEvolutionSystem.js";
import { getActiveConstructionQueue } from "../systems/ConstructionSystem.js";

export function renderDriftEvolutionPanel(state, { compact = false } = {}) {
  const currentStage = getCurrentDriftEvolution(state);
  const nextStage = getNextDriftEvolutionStage(state);
  const populationGoals = getPopulationGoals();
  const activeQueue = getActiveConstructionQueue(state);
  const manifestedCount = state.driftEvolution?.manifestedBuildingCount ?? state.buildings.length;

  return `
    <section class="panel drift-evolution-panel ${compact ? "drift-evolution-panel--compact" : ""}">
      <div class="panel__header">
        <h3>Drift Evolution</h3>
        <span class="panel__subtle">${manifestedCount} active building${manifestedCount === 1 ? "" : "s"}</span>
      </div>
      <div class="drift-evolution-panel__hero">
        <div>
          <span class="drift-evolution-panel__eyebrow">Current Stage</span>
          <strong>${escapeHtml(currentStage.name)}</strong>
          <p>${escapeHtml(currentStage.summary)}</p>
        </div>
        <div class="drift-evolution-panel__mobility">
          <span>Mobility</span>
          <strong>${escapeHtml(currentStage.mobility)}</strong>
        </div>
      </div>
      <div class="drift-evolution-panel__stats">
        <article>
          <span>Build Slots</span>
          <strong>${formatNumber(getDriftConstructionSlots(state), 0)}</strong>
          <small>${activeQueue.length} currently active</small>
        </article>
        <article>
          <span>Growth Speed</span>
          <strong>+${formatNumber(currentStage.constructionSpeedPercent, 0)}%</strong>
          <small>Applied to incubation build points/day</small>
        </article>
        <article>
          <span>Optimal Pop.</span>
          <strong>${formatNumber(populationGoals.optimalPopulation, 0)}</strong>
          <small>Healthy late-game target</small>
        </article>
        <article>
          <span>Strain Ceiling</span>
          <strong>${formatNumber(populationGoals.strainCeiling, 0)}</strong>
          <small>Beyond this, the Drift is overcrowded</small>
        </article>
      </div>
      <div class="drift-evolution-panel__progress">
        ${
          nextStage
            ? `
                <span>Next evolution</span>
                <strong>${escapeHtml(nextStage.name)}</strong>
                <small>${Math.max(0, nextStage.threshold - manifestedCount)} more active buildings needed (${nextStage.threshold} total).</small>
              `
            : `
                <span>Evolution Status</span>
                <strong>Final stage unlocked</strong>
                <small>The Drift has awakened all currently defined growth thresholds.</small>
              `
        }
      </div>
      <div class="drift-evolution-panel__abilities">
        <span>Stage Abilities</span>
        <ul>
          ${currentStage.abilities.map((ability) => `<li>${escapeHtml(ability)}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}
