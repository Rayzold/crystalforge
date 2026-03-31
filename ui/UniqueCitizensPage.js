// Legends page.
// Named citizens live here so they feel separate from the normal workforce and
// read more like a roster of singular characters than another resource screen.
import { EXPEDITION_TYPES } from "../content/ExpeditionConfig.js";
import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { getLegendAssignmentDetails, getLegendAssignmentPosts } from "../systems/ExpeditionSystem.js";
import { renderUiIcon } from "./UiIcons.js";

const LEGEND_SOURCE_ICONS = {
  rescue: "citizens",
  recruit: "citizens",
  resourceRun: "supplies",
  crystalHunt: "mana",
  relicRecovery: "excavation",
  diplomatic: "contact",
  monsterHunt: "encounter",
  pilgrimage: "signal"
};

function hashLegendSeed(value = "") {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash);
}

function renderLegendSigil(uniqueCitizen, modifierClass = "") {
  const seedValue = hashLegendSeed(uniqueCitizen.sigilSeed ?? `${uniqueCitizen.fullName}|${uniqueCitizen.title}`);
  const hueA = seedValue % 360;
  const hueB = (hueA + 54 + (seedValue % 70)) % 360;
  const rotation = (seedValue % 46) - 23;
  const initials = String(uniqueCitizen.fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "LG";

  return `
    <div
      class="legend-sigil ${modifierClass}"
      style="--legend-hue-a:${hueA}; --legend-hue-b:${hueB}; --legend-rotation:${rotation}deg;"
      aria-hidden="true"
    >
      <span class="legend-sigil__ring"></span>
      <span class="legend-sigil__ring legend-sigil__ring--inner"></span>
      <span class="legend-sigil__spark"></span>
      <strong>${escapeHtml(initials)}</strong>
    </div>
  `;
}

function renderLegendBonuses(uniqueCitizen) {
  const assignment = getLegendAssignmentDetails(uniqueCitizen);
  return `
    <div class="notable-card__bonuses">
      ${Object.entries(uniqueCitizen.bonuses?.resources ?? {})
        .map(
          ([key, amount]) => `
            <em>${escapeHtml(`${key} +${formatNumber(amount, 2)}/day`)}</em>
          `
        )
        .join("")}
      ${Object.entries(uniqueCitizen.bonuses?.stats ?? {})
        .map(
          ([key, amount]) => `
            <em>${escapeHtml(`${key} +${formatNumber(amount, 2)}`)}</em>
          `
        )
        .join("")}
      ${
        Number(uniqueCitizen.bonuses?.expeditionPowerPercent ?? 0) > 0
          ? `<em>${escapeHtml(`expedition power +${formatNumber(uniqueCitizen.bonuses.expeditionPowerPercent, 0)}%`)}</em>`
          : ""
      }
      ${
        assignment.post
          ? `<em>${escapeHtml(`${assignment.post.label}: ${assignment.bonusSummary}`)}</em>`
          : ""
      }
    </div>
  `;
}

function renderLegendAssignment(uniqueCitizen) {
  const assignment = getLegendAssignmentDetails(uniqueCitizen);
  const currentPostId = assignment.post?.id ?? "";
  const options = [
    {
      id: "",
      label: "At Large",
      summary: "Keep only the legend's innate bonuses active."
    },
    ...getLegendAssignmentPosts()
  ];

  return `
    <section class="legend-card__assignment">
      <div class="legend-card__assignment-head">
        <div>
          <span>Legend Post</span>
          <strong>${escapeHtml(assignment.post?.label ?? "At Large")}</strong>
        </div>
        <small>${escapeHtml(assignment.summary)}</small>
      </div>
      <p class="legend-card__assignment-bonus">${escapeHtml(assignment.bonusSummary)}</p>
      <div class="legend-card__assignment-options">
        ${options
          .map(
            (option) => `
              <button
                class="button button--ghost legend-card__assignment-button ${currentPostId === option.id ? "is-active" : ""}"
                type="button"
                data-action="set-legend-assignment"
                data-citizen-id="${escapeHtml(uniqueCitizen.id)}"
                data-post-id="${escapeHtml(option.id)}"
                aria-pressed="${currentPostId === option.id ? "true" : "false"}"
                title="${escapeHtml(option.summary ?? option.label)}"
              >
                ${escapeHtml(option.label)}
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderLegendRoutePill(uniqueCitizen, labelOverride = "") {
  const expeditionType = EXPEDITION_TYPES[uniqueCitizen.sourceTypeId] ?? null;
  const label = labelOverride || uniqueCitizen.originLabel || expeditionType?.label || "Unrecorded Route";
  return `
    <span class="legend-route-pill">
      ${renderUiIcon(LEGEND_SOURCE_ICONS[uniqueCitizen.sourceTypeId] ?? "route", label)}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function renderLegendCard(uniqueCitizen) {
  return `
    <article class="panel notable-card legend-card">
      <div class="legend-card__hero">
        ${renderLegendSigil(uniqueCitizen)}
        <div class="legend-card__identity">
          <p class="notable-card__eyebrow">${escapeHtml(uniqueCitizen.className)} Legend</p>
          <h3>${escapeHtml(uniqueCitizen.fullName)}</h3>
          <span>${escapeHtml(uniqueCitizen.title)}</span>
        </div>
        ${renderLegendRoutePill(uniqueCitizen)}
      </div>
      <p class="legend-card__arrival">${escapeHtml(uniqueCitizen.arrivalLine ?? `Arrived: ${uniqueCitizen.joinedAt}`)}</p>
      <p>${escapeHtml(uniqueCitizen.effectText)}</p>
      <div class="legend-card__memory">
        <span>Origin Memory</span>
        <strong>${escapeHtml(uniqueCitizen.originLabel ?? "Unrecorded Route")}</strong>
        <p>${escapeHtml(uniqueCitizen.originMemory ?? "Their road into the Drift has faded from the ledgers.")}</p>
      </div>
      <div class="notable-card__meta">
        <span>Status: ${escapeHtml(uniqueCitizen.status === "inCity" ? "In Drift" : uniqueCitizen.status)}</span>
        <span>Arrived: ${escapeHtml(uniqueCitizen.joinedAt)}</span>
        <span>Class: ${escapeHtml(uniqueCitizen.className)}</span>
      </div>
      ${renderLegendAssignment(uniqueCitizen)}
      ${renderLegendBonuses(uniqueCitizen)}
    </article>
  `;
}

function renderLegendOverview(uniqueCitizens) {
  const latest = uniqueCitizens[0] ?? null;
  const representedClasses = new Set(uniqueCitizens.map((entry) => entry.className)).size;
  const expeditionSources = new Set(uniqueCitizens.map((entry) => entry.sourceTypeId).filter(Boolean)).size;
  const assignedCount = uniqueCitizens.filter((entry) => entry.assignmentPostId).length;
  const latestAssignment = latest ? getLegendAssignmentDetails(latest) : null;

  return `
    <section class="panel legends-summary-panel">
      <div class="panel__header">
        <h3>Legends of the Drift</h3>
        <span class="panel__subtle">Rare named citizens who arrive through long success and change the city in ways ordinary recruits cannot.</span>
      </div>
      <div class="legends-summary-stage">
        <div class="legends-summary-grid">
          <article><span>Total Legends</span><strong>${formatNumber(uniqueCitizens.length)}</strong></article>
          <article><span>Latest Arrival</span><strong>${escapeHtml(latest?.fullName ?? "None yet")}</strong></article>
          <article><span>Classes Represented</span><strong>${formatNumber(representedClasses)}</strong></article>
          <article><span>Expedition Paths</span><strong>${formatNumber(expeditionSources)}</strong></article>
          <article><span>Active Posts</span><strong>${formatNumber(assignedCount)}</strong></article>
        </div>
        ${
          latest
            ? `
                <article class="legends-featured-card">
                  <div class="legends-featured-card__head">
                    ${renderLegendSigil(latest, "legend-sigil--hero")}
                    <div>
                      <p class="notable-card__eyebrow">Latest Arrival</p>
                      <h4>${escapeHtml(latest.fullName)}</h4>
                      <span>${escapeHtml(latest.title)}</span>
                    </div>
                    ${renderLegendRoutePill(latest, latest.originLabel ?? "Arrival Route")}
                  </div>
                  <p class="legends-featured-card__arrival">${escapeHtml(latest.arrivalLine ?? `Arrived on ${latest.joinedAt}`)}</p>
                  <p class="legends-featured-card__memory">${escapeHtml(latest.originMemory ?? latest.effectText)}</p>
                  <p class="legends-featured-card__assignment">${escapeHtml(`${latestAssignment?.post?.label ?? "At Large"}: ${latestAssignment?.bonusSummary ?? "No active assignment bonus."}`)}</p>
                  ${renderLegendBonuses(latest)}
                </article>
              `
            : ""
        }
      </div>
      <div class="legends-page__guidance">
        <article class="legends-guidance-card">
          <strong>How Legends Arrive</strong>
          <p>Legends do not appear through normal population growth. They are drawn in by repeated expedition success, stronger mission cards, and the long arc of the Drift's reputation.</p>
        </article>
        <article class="legends-guidance-card">
          <strong>What Makes Them Distinct</strong>
          <p>Each Legend now keeps an arrival memory, a route marker, and a sigil-like identity so the roster reads like a hall of remembered arrivals instead of just another bonus list.</p>
        </article>
      </div>
    </section>
  `;
}

export function renderUniqueCitizensPage(state) {
  const uniqueCitizens = [...(state.uniqueCitizens ?? [])].sort((left, right) => (right.joinedDayOffset ?? 0) - (left.joinedDayOffset ?? 0));
  return {
    title: "Legends",
    subtitle: "Named figures, remembered arrivals, and singular allies who leave a permanent mark on the Drift.",
    content: `
      ${renderLegendOverview(uniqueCitizens)}
      ${
        uniqueCitizens.length
          ? `<div class="notable-grid">
              ${uniqueCitizens.map((uniqueCitizen) => renderLegendCard(uniqueCitizen)).join("")}
            </div>`
          : `
              <section class="panel legends-empty-panel">
                <div class="panel__header">
                  <h3>No Legends Yet</h3>
                  <span class="panel__subtle">The Drift has not attracted a named figure yet.</span>
                </div>
                <p class="panel__empty">Keep expeditions active, pursue stronger mission cards, and over time a true legend will join the city with a full name and unique abilities.</p>
              </section>
            `
      }
    `
  };
}
