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

## Files to change

- Root CSS file (wherever `:root` is defined) — add `[data-theme="parchment"]` block
- `index.html` / shell template — add theme toggle button to `.top-nav`
- Main JS entry point — add `setTheme()` + load from `localStorage` on init
- Town Map canvas render function — pass theme-aware color palette
- Any file with hardcoded rarity hex colors — add `[data-theme="parchment"]` overrides
