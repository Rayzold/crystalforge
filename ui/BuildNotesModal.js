import { APP_DISPLAY_VERSION, BUILD_NOTES } from "../content/Config.js";
import { escapeHtml } from "../engine/Utils.js";
import { renderUiIcon } from "./UiIcons.js";

export function renderBuildNotesModal(state) {
  if (!state.transientUi?.buildNotesOpen) {
    return "";
  }

  const recentNotes = BUILD_NOTES.slice(0, 5);
  const headline = recentNotes[0] ?? "Recent build changes are available on the Help page.";

  return `
    <div class="modal-overlay build-notes-modal">
      <button class="modal-overlay__dismiss" type="button" data-action="close-build-notes" aria-label="Close build notes"></button>
      <section class="modal-card build-notes-modal__card" role="dialog" aria-modal="true" aria-labelledby="build-notes-title">
        <button class="modal-card__close" type="button" data-action="close-build-notes" aria-label="Close build notes">x</button>
        <header class="build-notes-modal__header">
          <div class="build-notes-modal__title-wrap">
            <div class="build-notes-modal__icon">
              ${renderUiIcon("history", "Build notes")}
            </div>
            <div>
              <span>What Changed In This Build?</span>
              <h3 id="build-notes-title">${escapeHtml(APP_DISPLAY_VERSION)}</h3>
              <p>${escapeHtml(headline)}</p>
            </div>
          </div>
        </header>
        <div class="build-notes-modal__body">
          <article class="build-notes-modal__callout">
            <strong>Seen once per version</strong>
            <p>Closing this marks ${escapeHtml(APP_DISPLAY_VERSION)} as seen. Reopen it any time from the build tag in the page chrome.</p>
          </article>
          <section class="build-notes-modal__section">
            <div class="build-notes-modal__section-head">
              <span>Recent Notes</span>
              <strong>Latest changes</strong>
            </div>
            <ul class="build-notes-panel__list build-notes-modal__list">
              ${recentNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
          </section>
          <div class="build-notes-modal__actions">
            <button class="button button--ghost" type="button" data-action="open-build-notes-help" data-href="./help.html">Open Help Page</button>
            <button class="button" type="button" data-action="close-build-notes">Continue</button>
          </div>
        </div>
      </section>
    </div>
  `;
}
