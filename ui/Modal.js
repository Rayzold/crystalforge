export function renderModal({ id, title, content, open = false, wide = false }) {
  return `
    <div class="modal ${open ? "is-open" : ""}" id="${id}">
      <div class="modal__backdrop" data-action="close-modal" data-modal="${id}"></div>
      <div class="modal__dialog ${wide ? "modal__dialog--wide" : ""}">
        <div class="modal__header">
          <h2>${title}</h2>
          <button class="icon-button" data-action="close-modal" data-modal="${id}" aria-label="Close modal">x</button>
        </div>
        <div class="modal__body">${content}</div>
      </div>
    </div>
  `;
}
