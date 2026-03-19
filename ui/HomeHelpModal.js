import { escapeHtml } from "../engine/Utils.js";
import { renderModal } from "./Modal.js";

const RUNBOOK_STEPS = [
  "Grant crystals from the GM console.",
  "Manifest new structures in the Forge.",
  "Place them onto the town map.",
  "Advance time from City command.",
  "Resolve events and warnings.",
  "Review the Chronicle at month end."
];

export function renderHomeHelpModal(state) {
  const content = `
    <section class="home-help-modal">
      <p class="panel__subtle">A short companion loop for live table use.</p>
      <div class="policy-history">
        ${RUNBOOK_STEPS.map(
          (step, index) => `
            <article class="policy-history__card">
              <span>Step ${index + 1}</span>
              <strong>${escapeHtml(step)}</strong>
            </article>
          `
        ).join("")}
      </div>
    </section>
  `;

  return renderModal({
    id: "home-help-modal",
    title: "Session Help",
    content,
    open: Boolean(state.transientUi?.homeHelpOpen)
  });
}
