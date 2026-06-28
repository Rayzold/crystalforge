import { escapeHtml, formatNumber } from "../engine/Utils.js?v=v1.7.21-20260628063649";
import {
  DEFAULT_EFFORT_LEVEL,
  DEFAULT_SALARIES_LEVEL,
  EFFORT_LEVELS,
  EFFORT_MORALE_PER_STEP,
  SALARIES_LEVELS,
  SALARIES_MORALE_PER_STEP
} from "../content/Config.js?v=v1.7.21-20260628063649";

function formatSignedNumber(value, decimals = 1) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${formatNumber(value, decimals)}`;
}

function renderDial({ label, hint, options, current, action, formatOption }) {
  return `
    <article class="policy-panel__dial">
      <header class="policy-panel__dial-head">
        <strong>${escapeHtml(label)}</strong>
        <em>${escapeHtml(formatOption(current))}</em>
      </header>
      <p class="policy-panel__dial-hint">${escapeHtml(hint)}</p>
      <div class="policy-panel__dial-options">
        ${options
          .map(
            (option) => `
              <button
                class="policy-panel__step ${Math.abs(option - current) < 1e-9 ? "is-active" : ""}"
                type="button"
                data-action="${escapeHtml(action)}"
                data-level="${option}"
              >${escapeHtml(formatOption(option))}</button>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

export function renderPolicyPanel(state) {
  const salariesLevel = Number(state.policySettings?.salariesLevel ?? DEFAULT_SALARIES_LEVEL);
  const effortLevel = Number(state.policySettings?.effortLevel ?? DEFAULT_EFFORT_LEVEL);
  const salariesMoraleDelta = ((salariesLevel - 1) / 0.5) * SALARIES_MORALE_PER_STEP;
  const effortMoraleDelta = ((effortLevel - 1) / 0.1) * EFFORT_MORALE_PER_STEP;

  return `
    <section class="panel policy-panel">
      <div class="panel__header">
        <h3>Citizen Policies</h3>
        <span class="panel__subtle">Pay vs. push — morale shifts ${formatSignedNumber(salariesMoraleDelta + effortMoraleDelta, 0)}</span>
      </div>
      <div class="policy-panel__grid">
        ${renderDial({
          label: "Salaries",
          hint: `Scales gold paid to citizens. Each step from 1x shifts morale ${formatSignedNumber(SALARIES_MORALE_PER_STEP, 0)}. Current: ${formatSignedNumber(salariesMoraleDelta, 0)} morale.`,
          options: SALARIES_LEVELS,
          current: salariesLevel,
          action: "set-policy-salaries",
          formatOption: (v) => `${v}x`
        })}
        ${renderDial({
          label: "Effort",
          hint: `Scales citizen output. Each step from 1x shifts morale ${formatSignedNumber(EFFORT_MORALE_PER_STEP, 0)}. Current: ${formatSignedNumber(effortMoraleDelta, 0)} morale.`,
          options: EFFORT_LEVELS,
          current: effortLevel,
          action: "set-policy-effort",
          formatOption: (v) => `${formatNumber(v, 1)}x`
        })}
      </div>
    </section>
  `;
}
