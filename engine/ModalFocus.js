// Focus + keyboard plumbing shared by every modal. Renderer rebuilds the whole
// page on each state change, so we use stable data-* selectors instead of DOM
// node references to restore focus across re-renders.

const MODAL_SELECTOR = ".modal-overlay, .modal.is-open";
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

const SIGNATURE_DATA_KEYS = [
  "action",
  "modal",
  "buildingId",
  "resourceKey",
  "focusId",
  "rarity",
  "missionId",
  "vehicleId",
  "step",
  "dayOffset",
  "monthOffset",
  "supportKey"
];

export function getOpenModals() {
  return Array.from(document.querySelectorAll(MODAL_SELECTOR));
}

export function getTopmostModal() {
  const modals = getOpenModals();
  return modals[modals.length - 1] ?? null;
}

export function getFocusableElements(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("inert")) {
      return false;
    }
    if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
      return false;
    }
    return true;
  });
}

function toAttrName(key) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function serializeSignature(el) {
  if (!el || !(el instanceof Element) || el === document.body) {
    return null;
  }
  const dataset = el.dataset ?? {};
  const present = SIGNATURE_DATA_KEYS.filter((key) => dataset[key] != null && dataset[key] !== "");
  if (!present.length) {
    return null;
  }
  const parts = present.map((key) => `[data-${toAttrName(key)}="${CSS.escape(dataset[key])}"]`);
  return `${el.tagName.toLowerCase()}${parts.join("")}`;
}

function focusFirstInModal(modal) {
  if (!modal) {
    return;
  }
  const focusables = getFocusableElements(modal);
  if (!focusables.length) {
    if (!modal.hasAttribute("tabindex")) {
      modal.setAttribute("tabindex", "-1");
    }
    modal.focus({ preventScroll: true });
    return;
  }
  // Prefer the first non-close interactive control so users land on the primary action.
  const primary = focusables.find((el) => {
    const action = el.dataset?.action ?? "";
    if (action.startsWith("close-")) {
      return false;
    }
    if (el.classList.contains("modal-overlay__dismiss") || el.classList.contains("modal__backdrop")) {
      return false;
    }
    return true;
  });
  (primary ?? focusables[0]).focus({ preventScroll: true });
}

export class ModalFocusManager {
  constructor() {
    this.wasModalOpen = false;
    this.returnSignature = null;
    this.inModalSignature = null;
  }

  capturePreRender() {
    const active = document.activeElement;
    const isOpen = getOpenModals().length > 0;
    if (isOpen && active && active.closest(MODAL_SELECTOR)) {
      this.inModalSignature = serializeSignature(active);
    } else if (!isOpen) {
      this.returnSignature = serializeSignature(active);
      this.inModalSignature = null;
    }
  }

  applyPostRender() {
    const modals = getOpenModals();
    const isOpen = modals.length > 0;
    const topmost = modals[modals.length - 1] ?? null;
    const active = document.activeElement;
    const activeInsideModal = !!(active && active.closest && active.closest(MODAL_SELECTOR));

    if (!this.wasModalOpen && isOpen) {
      focusFirstInModal(topmost);
    } else if (this.wasModalOpen && isOpen) {
      if (!activeInsideModal) {
        let restored = null;
        if (this.inModalSignature) {
          restored = topmost.querySelector(this.inModalSignature);
        }
        if (restored && typeof restored.focus === "function") {
          restored.focus({ preventScroll: true });
        } else {
          focusFirstInModal(topmost);
        }
      }
    } else if (this.wasModalOpen && !isOpen) {
      if (this.returnSignature) {
        const restored = document.querySelector(this.returnSignature);
        if (restored && typeof restored.focus === "function") {
          restored.focus({ preventScroll: true });
        }
      }
      this.returnSignature = null;
      this.inModalSignature = null;
    }

    this.wasModalOpen = isOpen;
  }
}

export function findTopmostCloseAction(modal) {
  if (!modal) {
    return null;
  }
  // Prefer a labelled close button (close X, Continue) over the backdrop or invisible dismiss layer.
  const explicit = modal.querySelector(
    '[data-action^="close-"]:not(.modal-overlay__dismiss):not(.modal__backdrop)'
  );
  return explicit ?? modal.querySelector('[data-action^="close-"]');
}

export function installModalKeyboardHandlers(rootDocument = document) {
  rootDocument.addEventListener(
    "keydown",
    (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        const topmost = getTopmostModal();
        if (!topmost) {
          return;
        }
        const closer = findTopmostCloseAction(topmost);
        if (closer) {
          event.preventDefault();
          event.stopPropagation();
          closer.click();
        }
        return;
      }

      if (event.key === "Tab") {
        const topmost = getTopmostModal();
        if (!topmost) {
          return;
        }
        const focusables = getFocusableElements(topmost);
        if (!focusables.length) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = rootDocument.activeElement;
        const insideModal = active && topmost.contains(active);
        if (event.shiftKey) {
          if (!insideModal || active === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (!insideModal || active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    },
    true
  );
}
