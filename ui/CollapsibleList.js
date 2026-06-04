// Generic "show first N + collapse arrow" for any long list/grid.
//
// Runs after every UIRenderer render. For each opted-in container with more
// than ITEM_LIMIT direct children, hides the overflow children and inserts a
// toggle button. Expansion state persists across re-renders via localStorage,
// keyed by a stable signature of the container's position in the page.

const ITEM_LIMIT = 5;
const STORAGE_KEY = "crystalforge.collapseState.v1";
const STATE_ATTR = "data-collapse-state";

// Containers that should auto-collapse when long. The first set are class-name
// patterns commonly used by list/grid containers across the codebase; the
// shouldSkip() heuristic filters out short pill rows, filters, and toolbars.
const AUTO_SELECTORS = [
  "ul",
  "ol",
  "[class*='-grid']",
  "[class*='-list']",
  "[class*='-feed']",
  "[class*='-strip__list']",
  "[class*='-stack']",
  "[class*='-items']",
  "[class*='-cards']",
  "[class*='__rows']",
  "[data-collapse-auto]"
];

// Containers/list-types that should never collapse (e.g. the sidebar nav,
// inline pill rows that are visually compact, etc.). Add more here as needed.
const OPT_OUT_ANCESTORS = [
  ".sidebar-nav",
  ".hud-ribbon",
  ".page-command-strip",
  ".help-bubble",
  ".modal__dialog",
  ".overflow-list",
  "[data-no-collapse]"
];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

let stateCache = null;

function getState() {
  if (stateCache === null) stateCache = loadState();
  return stateCache;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateCache || {}));
  } catch {
    // ignore
  }
}

function isExpanded(key) {
  return Boolean(getState()[key]);
}

function setExpanded(key, expanded) {
  const state = getState();
  if (expanded) state[key] = true;
  else delete state[key];
  saveState();
}

function indexOfWithinParent(el) {
  let i = 0;
  let n = el;
  while ((n = n.previousElementSibling)) i++;
  return i;
}

// Build a stable-enough key from the element's position in the page so that
// the same container re-rendered later gets the same key.
function buildKey(container) {
  const page = document.body.getAttribute("data-page") || "page";
  const parts = [page];
  let node = container;
  let depth = 0;
  while (node && node !== document.body && depth < 6) {
    const tag = node.tagName.toLowerCase();
    const cls = (node.className || "").toString().trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    const idx = indexOfWithinParent(node);
    parts.push(`${tag}${cls ? "." + cls : ""}[${idx}]`);
    node = node.parentElement;
    depth++;
  }
  return parts.join(">");
}

function shouldSkip(container) {
  if (container.hasAttribute("data-collapse-applied")) return true;
  for (const sel of OPT_OUT_ANCESTORS) {
    if (container.closest(sel)) return true;
  }
  const cls = (container.className || "").toString();
  // Skip short/inline rows: pills, chips, filter rows, toolbars, breadcrumbs.
  if (/(pill|chip|tag-row|filter|toolbar|breadcrumb|tab-strip|tabs?\b|controls?\b|actions?\b|nav\b|legend|switcher|toggle-group|stepper|segmented)/i.test(cls)) {
    return true;
  }
  // Skip if container has explicit role that signals it's not a content list.
  const role = container.getAttribute("role") || "";
  if (/tablist|toolbar|menubar|menu/i.test(role)) return true;

  // Only collapse if children look "card-like" rather than inline controls.
  // Heuristic: at least half of children are block-level item tags or have a
  // class name that names them as cards/items/rows.
  const kids = Array.from(container.children).filter(
    (c) => !(c.tagName === "BUTTON" && c.hasAttribute("data-collapse-toggle"))
  );
  if (!kids.length) return true;
  const blockTags = new Set(["LI", "ARTICLE", "SECTION", "TR", "DT", "DD", "FIGURE"]);
  let cardLike = 0;
  for (const k of kids) {
    if (blockTags.has(k.tagName)) { cardLike++; continue; }
    const kc = (k.className || "").toString();
    if (/(card|item|row|entry|tile|cell|node|chunk|brick|line)\b/i.test(kc)) { cardLike++; }
  }
  if (cardLike < Math.ceil(kids.length / 2)) return true;
  return false;
}

function makeToggle(key, hiddenCount, expanded) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "collapse-toggle";
  btn.setAttribute("data-collapse-toggle", key);
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  btn.innerHTML = expanded
    ? `<span class="collapse-toggle__chevron" aria-hidden="true">▲</span><span>Show less</span>`
    : `<span class="collapse-toggle__chevron" aria-hidden="true">▼</span><span>Show ${hiddenCount} more</span>`;
  return btn;
}

function applyTo(container) {
  if (shouldSkip(container)) return;
  const children = Array.from(container.children).filter(
    (el) => el.tagName !== "BUTTON" || !el.hasAttribute("data-collapse-toggle")
  );
  if (children.length <= ITEM_LIMIT) return;

  const key = buildKey(container);
  const expanded = isExpanded(key);
  container.setAttribute("data-collapse-applied", "true");
  container.setAttribute("data-collapse-key", key);
  container.setAttribute(STATE_ATTR, expanded ? "expanded" : "collapsed");

  children.forEach((child, i) => {
    if (i >= ITEM_LIMIT) {
      child.classList.add("collapse-hidden-item");
    }
  });

  const hiddenCount = children.length - ITEM_LIMIT;
  const toggle = makeToggle(key, hiddenCount, expanded);

  // Place toggle as a sibling right after the container so it sits below the
  // list visually and isn't affected by list layout (grid/flex).
  if (container.parentElement) {
    container.parentElement.insertBefore(toggle, container.nextSibling);
  }
}

function handleToggleClick(event) {
  const btn = event.target.closest("[data-collapse-toggle]");
  if (!btn) return;
  const key = btn.getAttribute("data-collapse-toggle");
  const container = document.querySelector(`[data-collapse-key="${CSS.escape(key)}"]`);
  if (!container) return;
  const wasExpanded = container.getAttribute(STATE_ATTR) === "expanded";
  const nowExpanded = !wasExpanded;
  container.setAttribute(STATE_ATTR, nowExpanded ? "expanded" : "collapsed");
  setExpanded(key, nowExpanded);
  const hiddenCount = container.querySelectorAll(":scope > .collapse-hidden-item").length;
  btn.setAttribute("aria-expanded", nowExpanded ? "true" : "false");
  btn.innerHTML = nowExpanded
    ? `<span class="collapse-toggle__chevron" aria-hidden="true">▲</span><span>Show less</span>`
    : `<span class="collapse-toggle__chevron" aria-hidden="true">▼</span><span>Show ${hiddenCount} more</span>`;
}

let clickHandlerInstalled = false;

export function attachListCollapse(root = document) {
  if (!clickHandlerInstalled) {
    document.addEventListener("click", handleToggleClick);
    clickHandlerInstalled = true;
  }
  const seen = new Set();
  for (const selector of AUTO_SELECTORS) {
    let nodes;
    try {
      nodes = root.querySelectorAll(selector);
    } catch {
      continue;
    }
    for (const node of nodes) {
      if (seen.has(node)) continue;
      seen.add(node);
      applyTo(node);
    }
  }
}
