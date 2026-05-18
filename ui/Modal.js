export function renderModal({ id, title, content, open = false, wide = false }) {
  const titleId = `${id}__title`;
  return `
    <div class="modal ${open ? "is-open" : ""}" id="${id}">
      <div class="modal__backdrop" data-action="close-modal" data-modal="${id}" aria-hidden="true"></div>
      <div class="modal__dialog ${wide ? "modal__dialog--wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="modal__header">
          <h2 id="${titleId}">${title}</h2>
          <button class="icon-button" data-action="close-modal" data-modal="${id}" aria-label="Close modal">x</button>
        </div>
        <div class="modal__body">${content}</div>
      </div>
    </div>
  `;
}
