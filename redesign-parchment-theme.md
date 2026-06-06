# Crystal Forge — Parchment Theme Spec

## Overview

Add a second color theme ("Parchment") that can be toggled alongside the existing dark theme. Feels like an aged manuscript or fantasy cartography map — warm tans, sepia ink, ruled lines. All existing dark theme values are untouched.

---

## How to implement theme switching

### 1. Toggle mechanism

Add `data-theme` attribute to `<html>`:

```js
// toggle
function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('crystalforge-theme', name);
}

// on load
const saved = localStorage.getItem('crystalforge-theme') || 'dark';
document.documentElement.setAttribute('data-theme', saved);
```

### 2. CSS override block

The existing `:root` block stays as-is (dark theme defaults). Add a new block:

```css
[data-theme="parchment"] {
  /* all overrides here — see full table below */
}
```

### 3. Toggle button

Add a theme button to the right side of `.top-nav`, between the dice and settings buttons:

```html
<button class="top-nav__theme-toggle" title="Toggle theme" aria-label="Toggle parchment theme">
  📜
</button>
```

```js
document.querySelector('.top-nav__theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current === 'dark' ? 'parchment' : 'dark');
});
```

---

## Full variable mapping

| Variable | Dark (current) | Parchment |
|---|---|---|
| `--bg-0` | `#131b2e` | `#f4ead8` |
| `--bg-1` | `#1b2440` | `#ede0c4` |
| `--bg-2` | `#0c1322` | `#faf4e8` |
| `--panel` | `rgba(30,42,66,0.92)` | `rgba(237,224,196,0.96)` |
| `--panel-border` | `rgba(182,212,255,0.34)` | `rgba(101,67,33,0.28)` |
| `--text` | `#f2f7ff` | `#2c1a0e` |
| `--muted` | `#b6c6e3` | `#7a5c3c` |
| `--accent` | `#8dd6ff` | `#8b4513` |
| `--accent-soft` | `rgba(141,214,255,0.24)` | `rgba(139,69,19,0.14)` |
| `--accent-pink` | `#e58cff` | `#b5325a` |
| `--accent-blue` | `#58b8ff` | `#1e5fa8` |
| `--accent-violet` | `#8b7dff` | `#6b3fa0` |
| `--accent-gold` | `#f0c482` | `#b45309` |
| `--accent-mint` | `#72d9c8` | `#276749` |
| `--danger` | `#ff7c9d` | `#b91c1c` |
| `--success` | `#70f1c2` | `#166534` |
| `--shadow` | `0 28px 78px rgba(0,0,0,0.42)` | `0 4px 20px rgba(80,40,10,0.18)` |
| `--shadow-soft` | `0 20px 52px rgba(0,0,0,0.32)` | `0 2px 10px rgba(80,40,10,0.10)` |
| `--bg-radial-a` | `rgba(96,196,255,0.18)` | `rgba(180,140,80,0.10)` |
| `--bg-radial-b` | `rgba(229,140,255,0.13)` | `rgba(160,90,60,0.07)` |
| `--bg-radial-c` | `rgba(122,142,255,0.14)` | `rgba(100,60,140,0.05)` |
| `--bg-radial-d` | `rgba(240,196,130,0.10)` | `rgba(200,160,80,0.08)` |
| `--bg-start` | `#131c30` | `#f0e6cc` |
| `--bg-mid` | `#0d1426` | `#ede0c4` |
| `--bg-end` | `#07101e` | `#e8d9b8` |
| `--overlay-grid` | `rgba(140,180,255,0.025)` | `rgba(101,67,33,0.03)` |

---

## Rarity colors in parchment mode

The current rarity colors are neon/bright and won't read on a light background. Override them under `[data-theme="parchment"]`:

```css
[data-theme="parchment"] {
  --rarity-common:    #64748b;
  --rarity-uncommon:  #166534;
  --rarity-rare:      #1e4fa8;
  --rarity-epic:      #6d28d9;
  --rarity-legendary: #b45309;
  --rarity-beyond:    #be185d;
}
```

If rarity colors are hardcoded (not via CSS vars), add CSS overrides per selector:

```css
[data-theme="parchment"] .bldg--legendary::before,
[data-theme="parchment"] [data-rarity="legendary"] .rarity-accent { background: #b45309; }

[data-theme="parchment"] .bldg--epic::before,
[data-theme="parchment"] [data-rarity="epic"] .rarity-accent      { background: #6d28d9; }

[data-theme="parchment"] .bldg--rare::before,
[data-theme="parchment"] [data-rarity="rare"] .rarity-accent       { background: #1e4fa8; }

[data-theme="parchment"] .bldg--uncommon::before,
[data-theme="parchment"] [data-rarity="uncommon"] .rarity-accent   { background: #166534; }

[data-theme="parchment"] .bldg--common::before,
[data-theme="parchment"] [data-rarity="common"] .rarity-accent     { background: #64748b; }

[data-theme="parchment"] .bldg--beyond::before,
[data-theme="parchment"] [data-rarity="beyond"] .rarity-accent     { background: #be185d; }
```

---

## Parchment-specific extras (beyond variable swaps)

### Page background texture

The dark theme uses radial gradients for depth. In parchment mode, replace with a warm paper-like gradient:

```css
[data-theme="parchment"] .game-shell,
[data-theme="parchment"] body {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 27px,
      rgba(101, 67, 33, 0.04) 28px
    ),
    linear-gradient(160deg, #f5ecda 0%, #ede0c4 50%, #e8d4b0 100%);
}
```

This gives subtle horizontal ruled lines (like parchment) over the warm tan gradient. Adjust line spacing (28px) to match the base font size.

### Scrollbar styling

```css
[data-theme="parchment"] * {
  scrollbar-color: rgba(101,67,33,0.35) rgba(237,224,196,0.5);
}
[data-theme="parchment"] ::-webkit-scrollbar-thumb {
  background: rgba(101,67,33,0.35);
  border-radius: 4px;
}
[data-theme="parchment"] ::-webkit-scrollbar-track {
  background: rgba(237,224,196,0.5);
}
```

### Border style

In dark mode borders are glow-like (semi-transparent light blue). In parchment they should feel ruled/inked:

```css
[data-theme="parchment"] .panel,
[data-theme="parchment"] [class*="card"],
[data-theme="parchment"] [class*="section"] {
  border-color: rgba(101, 67, 33, 0.25);
}
```

### Button and pill adjustments

Ghost buttons in dark mode have blue-tinted borders. In parchment:

```css
[data-theme="parchment"] .button--ghost {
  border-color: rgba(101, 67, 33, 0.30);
  color: #4a2c10;
}
[data-theme="parchment"] .button--ghost:hover {
  background: rgba(101, 67, 33, 0.08);
  border-color: rgba(101, 67, 33, 0.50);
}
[data-theme="parchment"] .button--ghost.is-active {
  background: rgba(139, 69, 19, 0.14);
  border-color: #8b4513;
  color: #8b4513;
}
```

### Alert strip in parchment

The red alert strip needs a warm equivalent:

```css
[data-theme="parchment"] .alert-strip {
  background: rgba(185, 28, 28, 0.08);
  border-color: rgba(185, 28, 28, 0.25);
  color: #7f1d1d;
}
```

### Town Map canvas

The canvas draws hex fill colors from JS. The render function needs to check the current theme and swap the color palette:

```js
const isParchment = document.documentElement.getAttribute('data-theme') === 'parchment';

const HEX_COLORS = isParchment ? {
  empty:    '#e8d9b8',
  stroke:   'rgba(101,67,33,0.20)',
  frontier: '#d4a96a',
  arcane:   '#9b8ec4',
  bastion:  '#a0a0a0',
  trade:    '#c49b2e',
  // etc.
} : {
  empty:    '#131b2e',
  stroke:   'rgba(182,212,255,0.12)',
  // dark values...
};
```

Re-call `render()` when the theme toggle fires.

---

---

## Fix — Panels and cards still rendering dark (hardcoded colors)

### Problem

After applying `[data-theme="parchment"]`, the top nav, resource bar, alert strip, and page background correctly adopt parchment colors. However all `.panel` elements, content cards, and sidebar cards remain dark navy/black. This happens because component styles use **hardcoded hex values** instead of CSS variables — the theme override changes the variables but the components never read them.

Screenshot evidence: "THE CHRONICLE" header, "LATEST CHRONICLE" card, "UPCOMING HOLIDAY" card, and right sidebar cards ("Quiet Streets") all remained dark navy/black.

### Find all hardcoded colors

Run this in the project root to locate every offending line:

```bash
grep -rn "#131b2e\|#1b2440\|#0c1322\|rgba(30, 42, 66\|rgba(30,42,66\|rgba(182, 212, 255\|#f2f7ff\|#b6c6e3" src/
```

Also check for these patterns in `.vue`, `.js`, `.ts`, `.css`, `.scss` files:

```bash
grep -rn "background:\s*#1[0-9a-f]\{5\}\|background-color:\s*#0[0-9a-f]\{5\}" src/
```

### Replace all hardcoded values with CSS variables

Every occurrence of a hardcoded color must become the corresponding `var(--*)`:

| Find (hardcoded) | Replace with |
|---|---|
| `#131b2e` | `var(--bg-0)` |
| `#1b2440` | `var(--bg-1)` |
| `#0c1322` | `var(--bg-2)` |
| `rgba(30, 42, 66, 0.92)` | `var(--panel)` |
| `rgba(30,42,66,0.92)` | `var(--panel)` |
| `rgba(182, 212, 255, 0.34)` | `var(--panel-border)` |
| `rgba(182,212,255,0.34)` | `var(--panel-border)` |
| `#f2f7ff` | `var(--text)` |
| `#b6c6e3` | `var(--muted)` |
| `#8dd6ff` | `var(--accent)` |
| `#f0c482` | `var(--accent-gold)` |
| `#72d9c8` | `var(--accent-mint)` |
| `#ff7c9d` | `var(--danger)` |
| `#70f1c2` | `var(--success)` |
| `#131c30` | `var(--bg-start)` |
| `#0d1426` | `var(--bg-mid)` |
| `#07101e` | `var(--bg-end)` |

### Priority components (fix these first)

Based on what's visually broken in the screenshot:

1. `.panel` — the main card wrapper used everywhere (Chronicle header, content panels)
2. `.building-card`, `.building-card--stream` — black in parchment mode
3. Right sidebar cards (`.incubator-sidebar`, event cards, chronicle cards)
4. `.page-hero` band
5. Any component with an inline `style` binding like `:style="{ background: '#131b2e' }"` in Vue templates — these won't be caught by CSS grep and need a separate search:

```bash
grep -rn "background.*#1[0-9a-f]\{5\}\|background.*#0[0-9a-f]\{5\}" src/ --include="*.vue"
```

### Round 7 — Forge page dark surfaces (`2.0.39`)

User screenshot showed four dark surfaces still surviving on the Forge page after Round 6:

| Surface | Was | Now |
|---|---|---|
| `.crystal-card` (rarity selector "LEVEL 1 / Common / 2") | `linear-gradient(180deg, rgba(17,18,28,0.98), rgba(18,19,32,0.88))` + rarity radial | Cream gradient + bumped rarity radial (22% → strong), sepia border, ink text. Selected state uses sepia ring instead of white. |
| `.manifest-panel__switch` (Quick Manifestations toggle bar) | `linear-gradient(180deg, rgba(17,23,39,0.84), rgba(10,13,22,0.92))` | Cream gradient; `.is-active` keeps mint accent border (success indicator). Switch track + thumb retinted sepia-on-cream. |
| `.forge-stage__visual` (manifest sphere "scrying chamber") | `linear-gradient(180deg, rgba(14,27,49,0.98), rgba(6,10,17,0.98))` cold navy | Warm aged umber gradient (`#5a3a1f → #3a2510`). Kept intentionally darker than the surrounding cream cards so the orb glow still reads, but in-theme. Sigil rings and ::after vignette retinted warm. |
| `.forge-stage__ritual-notes article` (Reality / Available / Last Roll tiles) | `linear-gradient(180deg, rgba(30,42,68,0.92), rgba(16,22,40,0.95))` | Cream gradient + sepia border, ink text, brown muted labels |

### Round 6 — Contrast pass (`2.0.38`)

Visual feedback: cream-on-cream panels-vs-body had almost zero value delta — the parchment theme looked flat and uninteresting. Repainted the body to a medium aged-tan / leather tone so cream panels lift off the page like real paper on a worn desk.

Body palette deepened:

| Var | Round 1 | Round 6 |
|---|---|---|
| `--bg-start` | `#f0e6cc` (very light) | `#d6b985` (medium aged tan) |
| `--bg-mid`   | `#ede0c4` (very light) | `#c5a572` (deeper bronze) |
| `--bg-end`   | `#e8d9b8` (very light) | `#ab8a52` (warm khaki / leather) |
| `--bg-radial-a` | `rgba(180,140,80,0.10)` | `rgba(150,100,50,0.18)` |
| `--bg-radial-b` | `rgba(160,90,60,0.07)` | `rgba(130,70,40,0.14)` |
| `--bg-radial-d` | `rgba(200,160,80,0.08)` | `rgba(170,120,60,0.14)` |
| `--shadow` | `0 4px 20px rgba(80,40,10,0.18)` | `0 8px 28px rgba(70,35,8,0.28)` (more lift) |
| `--overlay-grid` | `rgba(101,67,33,0.03)` | `rgba(70,40,10,0.05)` (rule lines stay visible on deeper bg) |

Body rule rewritten to include two explicit warm radial highlights (220,180,120 at top-left and 130,75,35 at bottom-right) over the new linear-gradient(160deg, #d6b985 → #c5a572 → #a88654). Ruled lines bumped to 0.07 alpha so they don't get lost on the darker base.

Panel rules are unchanged — they're still the bright cream gradient (`rgba(250,244,232,…)` → `rgba(237,224,196,…)`). The new contrast comes entirely from the deeper body, plus the stronger shadow for visual lift.

### Round 5 — Audit script sweep (`2.0.37`)

Ran `find-hardcoded-colors.sh` (adapted to project root, since this codebase keeps source at root, not under `src/`). The full audit surfaced ~20 more dark-gradient backgrounds. Most are minor card depth gradients that aren't visible on common screens. The user's screenshot specifically called out **two black boxes** (empty-state + empowerment slot) plus the **top-nav** chrome — all three repainted plus a few neighbors with no rarity dependency.

| Surface | Original | Parchment override |
|---|---|---|
| `.empty-state` | `linear-gradient(180deg, rgba(15,18,29,0.92), rgba(8,10,16,0.96))` | Warm cream gradient + sepia border + ink text |
| `.city-empowerment-slot__active`, `.city-empowerment-slot__candidate` | `linear-gradient(180deg, rgba(15,18,29,0.92), rgba(10,13,22,0.98))` | Same cream gradient; `.is-filled` keeps the rarity-color border via `color-mix` |
| `.top-nav` | `linear-gradient(180deg, rgba(32,46,74,0.98), rgba(18,26,46,0.98))` | Cream gradient, sepia border; brand divider tinted sepia |
| `.town-statistics` | `rgba(18,17,28,0.98)` → `rgba(10,10,18,0.98)` | Cream gradient, sepia border, ink text |
| `.city-aside__summary-card` | `rgba(18,17,28,0.94)` → `rgba(12,14,22,0.96)` | Cream gradient + ink text |
| `.sidebar-density-picker__button.is-active` | `rgba(10,12,19,0.96)` base | Cream base + faint sepia accent layer, ink text |
| `.landing-hero__badge` | `rgba(5,10,18,0.72)` | Cream tinted, sepia border, warm shadow |
| Inner muted text (`.empowerment-slot__head span`, etc.) | mixed greys | `rgba(101, 67, 33, 0.82)` |

The dark theme is bit-for-bit unchanged. Remaining audit hits are deeper card variants (rarity-tinted building cards, focus-accent gradients per town focus) — those should keep their accent palette and will need a follow-up per-focus parchment palette if they ever become visually broken.

### Round 4 — Buttons + city workspace (`2.0.36`)

DOM audit after Round 3 surfaced two more hardcoded dark backgrounds the parchment swap couldn't reach:

| Surface | Hardcoded value | Cause | Fix |
|---|---|---|---|
| `.button`, `.button--ghost` | resolved to `rgba(30, 42, 66, 0.92)` | The button background was already `linear-gradient(...) , var(--panel)` — the variable *did* swap, but the iridescent neon overlay on top of the cream `--panel` skewed the perceived color and still let the audit script flag a "dark" value. The right call was to strip the overlay under parchment, not to chase the literal. | `[data-theme="parchment"] .button, .button--ghost { background: var(--panel); }` flattens both buttons to a clean cream surface; existing ink-text + sepia-border rules anchor them. |
| `.panel.city-workspace`, `.city-admin-view` | literal `rgba(18, 17, 28, 0.94)` | Hand-tuned dark fill that pre-dated the var system; not caught by previous greps. | Two rules swapped to `var(--panel)` in the base CSS; `[data-theme="parchment"] .panel.city-workspace, .city-workspace, .city-admin-view { background: var(--panel); }` added for belt-and-braces. |

After this round, the only remaining `rgba(* dark *)` literals are the two intentional ones from Round 2: `.reveal-overlay` and `.alert-strip`.

### Round 3 — Selector + JS hosting fix (`2.0.35`)

Audit on a deployed build showed `:root` still reporting dark CSS variables after the parchment toggle was clicked. Root cause: the parchment overrides were all scoped to `body[data-theme="parchment"]` (matching the existing silver-theme convention), but the spec puts `data-theme` on `<html>`, and DevTools shows custom properties scoped per-element. CSS inheritance still made parchment reach descendants, but the audit signal was misleading and easier to fix at the source.

Fix applied:
- **CSS:** stripped the `body` prefix from all 85 occurrences of `body[data-theme="parchment"]` → `[data-theme="parchment"]`. Now matches either `<html>` or `<body>`, and `:root[data-theme="parchment"]` would also match if needed. Specificity stays at 0,1,0 — same as `:root` — and source order puts parchment after, so it wins on conflicts.
- **JS:** `boot.js`, the gameState subscriber, the boot-time sync, and the `toggle-theme` action handler all now set the `data-theme` attribute on **both** `document.documentElement` and `document.body`. DevTools inspection of `:root` now shows parchment variables when the theme is active.

### Round 2 — Remaining dark elements (after first pass)

After the first fix pass, the major panels are now correctly themed. Only **3 unique hardcoded dark values** remain (verified via live DOM audit with parchment theme active):

| Hardcoded value | Used on | Replace with | Status |
|---|---|---|---|
| `rgba(12, 18, 30, 0.92)` | `.button` (primary — Advance Day) | `var(--panel)` | ✅ applied `2.0.34` |
| `rgba(10, 12, 19, 0.92)` | `.button--ghost`, `.city-filter`, all ghost buttons | `var(--panel)` | ✅ applied `2.0.34` |
| `rgba(5, 10, 18, 0.9)` | Sub-panel container (time controls area) | `var(--bg-1)` | ✅ applied `2.0.34` (the input/select/textarea rule; the SVG hex-map hover-readout still uses raw rgba because it's a tooltip, not a panel) |

The `.reveal-overlay` (`rgba(0,0,0,0.96)`) and `alert-strip` (`rgba(185,28,28,0.08)`) are **intentional** — do not change them.

Find these in CSS:
```bash
grep -rn "rgba(12, 18, 30\|rgba(10, 12, 19\|rgba(5, 10, 18" src/
```

Button fix — replace hardcoded backgrounds:
```css
/* Before */
.button        { background: rgba(12, 18, 30, 0.92); }
.button--ghost { background: rgba(10, 12, 19, 0.92); }

/* After */
.button        { background: var(--panel); }
.button--ghost { background: var(--panel); }
```

Then add parchment-specific button hover/active states to the theme block:
```css
[data-theme="parchment"] .button {
  color: var(--text);
  border-color: rgba(101, 67, 33, 0.40);
}
[data-theme="parchment"] .button--ghost {
  border-color: rgba(101, 67, 33, 0.30);
  color: #4a2c10;
}
[data-theme="parchment"] .button--ghost:hover {
  background: rgba(101, 67, 33, 0.10);
  border-color: rgba(101, 67, 33, 0.55);
}
[data-theme="parchment"] .button--ghost.is-active {
  background: rgba(139, 69, 19, 0.14);
  border-color: #8b4513;
  color: #8b4513;
}
```

### After the refactor

Once all hardcoded values are replaced with variables, the `[data-theme="parchment"]` block in the CSS will automatically theme every component with zero additional selectors needed.

### Resolution applied (styles.css `2.0.33`)

Rather than rewrite every hardcoded color in the project (which would change the dark theme as a side-effect and touch hundreds of rules), the parchment block in `styles.css` was extended with a **structural-overrides** section that re-paints each affected surface under `body[data-theme="parchment"]`. The dark theme rules are bit-for-bit unchanged.

Selectors repainted (cream backgrounds + sepia ink borders + `#2c1a0e` text):

- **Top-level surfaces:** `.panel`, `.scene-panel`, `.modal__dialog`, `.hud-ribbon__item`, `.sidebar-nav`, `.page-hero`, `.building-card--stream`
- **Inner cards:** `.expedition-card`, `.expedition-team-card`, `.expedition-return-card`, `.vehicle-card`, `.notable-card`, `.vehicle-roster-panel`, `.expedition-vehicle-group`
- **Stat tiles:** `.vehicle-card__stats article`, `.expedition-preview-grid article`
- **Awakened picker chips:** `.expedition-awakened-chip`, `__grade`, `__body small`, `__mark` (selected + unselected)
- **Sidebar widgets:** `.sidebar-manifest-list`, `.sidebar-dice`, `.sidebar-save-slot`, `.sidebar-gm-tools`
- **Top-nav popovers:** `.top-nav__dropdown`, `.top-nav__link`, `.top-nav__settings-panel`, `.top-nav__settings-link`
- **Chronicle:** `.chronicle-calendar__day`, `.chronicle-calendar__day-cell`, `.chronicle-notes-list__item`, `.weather-info-panel__*`
- **Crisis banner:** `.crisis-banner`
- **Muted text:** `.panel__subtle`, `.*-card__eyebrow`, `.*-card__footer`, `.*-card p`, `.vehicle-roster-panel__counts`, `.expedition-pending-panel__copy`, etc. → `rgba(101, 67, 33, 0.82)`

This means the dark theme keeps using its hardcoded values exactly as before, and the parchment theme reads cleanly on every visible card, panel, and tile without a global codebase refactor.

If a new card style appears later that uses hardcoded rgba dark colors, the fix is one of:
1. Add it to the structural-overrides block in `styles.css` under `body[data-theme="parchment"]`, **or**
2. Rewrite the component's rule to use `var(--bg-1)` / `var(--panel)` / etc. (preferred for new code).

---

## Files to change

- Root CSS file (wherever `:root` is defined) — add `[data-theme="parchment"]` block
- `index.html` / shell template — add theme toggle button to `.top-nav`
- Main JS entry point — add `setTheme()` + load from `localStorage` on init
- Town Map canvas render function — pass theme-aware color palette
- Any file with hardcoded rarity hex colors — add `[data-theme="parchment"]` overrides
