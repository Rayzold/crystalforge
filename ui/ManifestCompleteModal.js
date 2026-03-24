import { escapeHtml, formatNumber } from "../engine/Utils.js";
import { renderBuildingArt } from "./BuildingArt.js";

let lastAnimatedManifestToken = null;

export function renderManifestCompleteModal(state) {
  const manifestModal = state.transientUi?.manifestCompleteModal;
  if (!manifestModal) {
    return "";
  }

  try {
    const building = manifestModal.buildingId
      ? state.buildings.find((entry) => entry.id === manifestModal.buildingId) ?? null
      : null;
    const isCrystalUpgrade = Boolean(manifestModal.isCrystalUpgrade);
    const animationToken = String(manifestModal.animationToken ?? "");
    const shouldAnimate = Boolean(manifestModal.revealPercent) && animationToken !== lastAnimatedManifestToken;
    if (shouldAnimate && animationToken) {
      lastAnimatedManifestToken = animationToken;
    }
    const shouldShowImmediately = Boolean(manifestModal.showPercentImmediately);
    const previousQuality = Number(manifestModal.previousQuality ?? 0);
    const finalQuality = Number(manifestModal.finalQuality ?? manifestModal.qualityRoll ?? 0);
    const firstThreshold = previousQuality < 100 ? 100 : Math.ceil(previousQuality / 100) * 100;
    const stageStart = previousQuality < 100 ? 0 : Math.floor(previousQuality / 100) * 100;
    const stageProgressStart = Math.max(0, Math.min(100, previousQuality - stageStart));
    const filledWithinStage = Math.max(0, Math.min(firstThreshold, finalQuality) - previousQuality);
    const firstFillPercent = Math.max(0, Math.min(100 - stageProgressStart, filledWithinStage));
    const overflowIntoNext = Math.max(0, finalQuality - firstThreshold);
    const carryPercent = Math.max(0, Math.min(100, overflowIntoNext));
    const manifestSentence = isCrystalUpgrade
      ? `The ${escapeHtml(manifestModal.sourceRarity)} crystal resonated as a crystal upgrade and became <strong>${escapeHtml(manifestModal.targetRarity)}</strong>.`
      : `The ${escapeHtml(manifestModal.rarity)} crystal manifested the <strong>${escapeHtml(manifestModal.rolledName)}</strong>.`;

    return `
    <div class="modal manifest-complete-modal is-open" id="manifest-complete-modal">
      <div class="modal__backdrop" data-action="close-manifest-complete"></div>
      <div class="modal__dialog manifest-complete-modal__dialog">
        <button class="icon-button manifest-complete-modal__close" data-action="close-manifest-complete" aria-label="Close manifest completion modal">x</button>
        <div class="manifest-complete-modal__body">
          <div class="manifest-complete-modal__visual ${isCrystalUpgrade ? "manifest-complete-modal__visual--upgrade" : ""} ${shouldAnimate ? "manifest-complete-modal__visual--reveal" : ""}">
            ${
              isCrystalUpgrade
                ? `<div class="manifest-complete-modal__fallback">${escapeHtml(manifestModal.targetRarity?.slice(0, 1) ?? "U")}</div>`
                : renderBuildingArt(building?.imagePath, `${manifestModal.rolledName} artwork`, `<div class="manifest-complete-modal__fallback">${escapeHtml(manifestModal.rolledName.slice(0, 1))}</div>`, "grid")
            }
          </div>
          <span class="manifest-complete-modal__eyebrow">${isCrystalUpgrade ? "Rarity Elevated" : "Manifestation Complete"}</span>
          <h2>${escapeHtml(manifestModal.rolledName)}</h2>
          <p>${manifestSentence}</p>
          ${
            isCrystalUpgrade
              ? `
                <div class="manifest-complete-modal__quality">
                  <span>Upgrade Result</span>
                  <div class="manifest-complete-modal__bar">
                    <div class="manifest-complete-modal__track"></div>
                    <strong class="manifest-complete-modal__value is-visible">
                      ${escapeHtml(`${manifestModal.sourceRarity} -> ${manifestModal.targetRarity}`)}
                    </strong>
                  </div>
                </div>
              `
              : manifestModal.wasNew
                ? `
                <div class="manifest-complete-modal__quality">
                  <span>Quality</span>
                  <div class="manifest-complete-modal__bar">
                    <div
                      class="manifest-complete-modal__fill ${shouldAnimate ? "is-revealed" : shouldShowImmediately ? "is-static" : ""}"
                      style="--manifest-quality:${manifestModal.qualityRoll}%; --manifest-duration:${manifestModal.durationMs}ms"
                    ></div>
                    <div class="manifest-complete-modal__track"></div>
                    <strong class="manifest-complete-modal__value ${shouldAnimate || shouldShowImmediately ? "is-visible" : ""}">
                      ${formatNumber(manifestModal.qualityRoll, 0)}%
                    </strong>
                  </div>
                </div>
              `
                : `
                <div class="manifest-complete-modal__quality">
                  <span>Quality Added</span>
                  <div class="manifest-complete-modal__stack">
                    <div class="manifest-complete-modal__bar manifest-complete-modal__bar--carry">
                      <div class="manifest-complete-modal__track"></div>
                      <div class="manifest-complete-modal__base-progress" style="--manifest-base-start:${stageProgressStart}%"></div>
                      <div
                        class="manifest-complete-modal__fill ${shouldAnimate ? "is-revealed" : shouldShowImmediately ? "is-static" : ""}"
                        style="--manifest-quality:${firstFillPercent}%; --manifest-duration:${manifestModal.durationMs}ms; --manifest-fill-delay:0ms; --manifest-fill-start:${stageProgressStart}%"
                      ></div>
                      ${manifestModal.crossedActivation ? `<div class="manifest-complete-modal__burst ${shouldAnimate ? "is-revealed" : ""}"></div>` : ""}
                      ${
                        carryPercent > 0
                          ? `<div
                              class="manifest-complete-modal__carry-fill ${shouldAnimate ? "is-revealed" : shouldShowImmediately ? "is-static" : ""}"
                              style="--manifest-carry:${carryPercent}%; --manifest-duration:${manifestModal.durationMs}ms; --manifest-fill-delay:900ms"
                            ></div>`
                          : ""
                      }
                      <strong class="manifest-complete-modal__value ${shouldAnimate || shouldShowImmediately ? "is-visible" : ""}">
                        ${formatNumber(previousQuality, 0)}% -> ${formatNumber(finalQuality, 0)}%
                      </strong>
                    </div>
                    <p class="manifest-complete-modal__carry-copy">
                      ${
                        carryPercent > 0
                          ? `${formatNumber(previousQuality, 0)}% rose to ${formatNumber(firstThreshold, 0)}%, then carried ${formatNumber(carryPercent, 0)}% into the next quality band.`
                          : `${formatNumber(previousQuality, 0)}% rose to ${formatNumber(finalQuality, 0)}%.`
                      }
                    </p>
                  </div>
                </div>
              `
          }
          <div class="manifest-complete-modal__actions">
            ${
              isCrystalUpgrade
                ? ""
                : `<button class="button" data-action="manifest-place-building" data-building-id="${escapeHtml(manifestModal.buildingId)}">Place on Map</button>`
            }
            <button class="button button--ghost manifest-complete-modal__continue" data-action="close-manifest-complete">Continue</button>
          </div>
        </div>
      </div>
    </div>
  `;
  } catch (error) {
    return `
      <div class="modal manifest-complete-modal is-open" id="manifest-complete-modal">
        <div class="modal__backdrop" data-action="close-manifest-complete"></div>
        <div class="modal__dialog manifest-complete-modal__dialog">
          <button class="icon-button manifest-complete-modal__close" data-action="close-manifest-complete" aria-label="Close manifest completion modal">x</button>
          <div class="manifest-complete-modal__body">
            <span class="manifest-complete-modal__eyebrow">Manifestation Complete</span>
            <h2>${escapeHtml(String(manifestModal.rolledName ?? "Manifest Result"))}</h2>
            <p>Fallback manifest popup rendered because the full result view failed to build.</p>
            <div class="manifest-complete-modal__quality">
              <span>Quality</span>
              <div class="manifest-complete-modal__bar">
                <div class="manifest-complete-modal__track"></div>
                <strong class="manifest-complete-modal__value is-visible">${escapeHtml(String(formatNumber(manifestModal.finalQuality ?? manifestModal.qualityRoll ?? 0, 0)))}%</strong>
              </div>
            </div>
            <div class="manifest-complete-modal__actions">
              <button class="button button--ghost manifest-complete-modal__continue" data-action="close-manifest-complete">Continue</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
