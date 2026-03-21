import { escapeHtml, formatNumber } from "../engine/Utils.js";

export function renderManifestCompleteModal(state) {
  const manifestModal = state.transientUi?.manifestCompleteModal;
  if (!manifestModal) {
    return "";
  }

  return `
    <div class="modal manifest-complete-modal is-open" id="manifest-complete-modal">
      <div class="modal__backdrop" data-action="close-manifest-complete"></div>
      <div class="modal__dialog manifest-complete-modal__dialog">
        <button class="icon-button manifest-complete-modal__close" data-action="close-manifest-complete" aria-label="Close manifest completion modal">x</button>
        <div class="manifest-complete-modal__body">
          <span class="manifest-complete-modal__eyebrow">Manifestation Complete</span>
          <h2>${escapeHtml(manifestModal.rolledName)}</h2>
          <p>The ${escapeHtml(manifestModal.rarity)} crystal manifested the <strong>${escapeHtml(manifestModal.rolledName)}</strong>.</p>
          <div class="manifest-complete-modal__quality">
            <span>Quality</span>
            <div class="manifest-complete-modal__bar">
              <div
                class="manifest-complete-modal__fill ${manifestModal.revealPercent ? "is-revealed" : ""}"
                style="--manifest-quality:${manifestModal.qualityRoll}%; --manifest-duration:${manifestModal.durationMs}ms"
              ></div>
              <div class="manifest-complete-modal__track"></div>
              <strong class="manifest-complete-modal__value ${manifestModal.revealPercent ? "is-visible" : ""}">
                ${formatNumber(manifestModal.qualityRoll, 0)}%
              </strong>
            </div>
          </div>
          <div class="manifest-complete-modal__actions">
            <button class="button" data-action="manifest-place-building" data-building-id="${escapeHtml(manifestModal.buildingId)}">Place on Map</button>
            <button class="button button--ghost manifest-complete-modal__continue" data-action="close-manifest-complete">Continue</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
