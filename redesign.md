# Crystal Forge — City Page UI/UX Redesign Spec
## Round 2 — Fixes & Remaining Work

This file documents what has been implemented, what still needs fixing, and what is new.

---

## Status after Round 1

### Done ✅
- `top-nav` (44px, full width, Core / People / World / Craft dropdown groups)
- `resource-bar` (Gold, Food, Materials, Mana with daily deltas)
- `alert-strip` (compact 36px crisis strip replacing old `crisis-banner`)
- `incubator-sidebar` (280px right panel)
- `city-tabs` row (replacing nested tab structure)
- Old `.city-modes`, `.city-section-nav`, `.city-session-controls` removed
- Advance Day button moved into `.page-hero`

### Not done / broken 🔧
See fixes below.

---

## Fix 1 — Collapse `page-hero` to ~60px

**Problem:** `page-hero` is currently 262px tall. `page-hero__side` (237px) stacks date, town focus, and Advance Day button vertically.

**Target:** Single flex row, ~60px tall:

```
[CITY title]  [Leafwilt 3rd, 1218 AC chip]  [Expedition Charter chip]  →  [▶ Advance Day]  [▾]
```

- `page-hero` → `display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 20px`
- Remove `page-hero__side` as a wrapper — inline all children into the one flex row
- Date chip: `background: rgba(141,214,255,0.1); border: 1px solid rgba(141,214,255,0.25); border-radius: 20px; padding: 2px 12px; font-size: 11px; color: var(--accent)`
- Town Focus chip: same style but `color: var(--accent-mint)` (teal)
- Advance Day: primary button, pushed to right via `margin-left: auto`
- More ▾ button: ghost icon-only button next to Advance Day

---

## Fix 2 — Collapse toolbar to single-row filter bar

**Problem:** `.city-workspace__toolbar` is 160px / 3 separate `city-workspace__filters` rows stacked vertically (rarity row, status row, quick-filter row) plus a tall sort block.

**Target:** Single `<div class="filter-bar">` row, ~40px tall, horizontally scrollable:

```
[RARITY ▸] [All] [Common] [Uncommon] [Rare] [Epic] [Legendary] [Beyond]  │  [STATE ▸] [All] [Active] [Stalled] [Needs Input]  │  [Sort ▾]
```

Implementation:
- `.city-workspace__toolbar` → `display: flex; align-items: center; gap: 6px; padding: 6px 12px; overflow-x: auto; flex-wrap: nowrap; height: 44px`
- Remove `flex-wrap: wrap` from any child element
- The three `city-workspace__filters` divs become inline siblings with a `1px` divider between groups (use `border-right: 1px solid rgba(182,212,255,0.12); margin-right: 6px; padding-right: 6px`)
- Move "Gold / Food / Materials / Pinned / Understaffed" quick-filter options into the Sort dropdown instead of a separate row — they are sort criteria, not filters
- Sort dropdown: `<select>` or custom dropdown, 32px height, aligned to the right via `margin-left: auto`
- Filter pill style: `border-radius: 20px; padding: 2px 10px; font-size: 11px; white-space: nowrap`
- Active pill: `background: rgba(141,214,255,0.18); border-color: var(--accent); color: var(--accent)`

---

## Fix 3 — Add "The Stream" to `city-tabs`

**Problem:** `city-tabs` only has 3 buttons: Buildings, Town Map, Administration. The Stream tab is missing.

**Fix:** Add a fourth `<button class="city-tab">The Stream</button>` to `.city-tabs`. The Stream content (`.city-workspace__stream`) is already in the workspace — it just needs a tab to show/hide it.

Tab order: **Buildings** | **Administration** | **The Stream** | **Town Map**

---

## Fix 4 — Add Defense to resource bar

**Problem:** `.resource-bar` shows Gold, Food, Materials, Mana — but Defense % is missing.

**Fix:** Add a fifth slot:

```html
<div class="resource-bar__slot resource-bar__slot--defense">
  🛡️ <span class="val">64%</span> <span class="label">DEFENSE</span>
</div>
```

- Color: `#f97316` (orange)
- No delta (defense doesn't have a daily rate)
- Pull value from the same source the Administration panel uses

---

## Fix 5 — Remove duplicate sub-nav from workspace top

**Problem:** `.city-workspace__top` still shows "THE STREAM | TOWN MAP | OPEN MAP" inside the workspace. This is now duplicate of `city-tabs`.

**Fix:** Remove `.city-workspace__top` entirely, or hide it with `display: none`. The "Open Map" button (if useful) can move into the Town Map tab header or the page-hero right side.

---

## Fix 6 — Redesign building cards

**Problem:** Building cards (`.city-incubation-strip__item` and active building cards) are still the old flat text format — no quality ring, no rarity color accent, no progress bar.

### Target card structure

Use CSS grid: `grid-template-columns: 3px 28px 1fr auto`

```
[rarity accent] [emoji] [info block]         [right stats]
                        Name (13px 500)       [quality ring 40×40]
                        [slot tag][support]   [N.N days]
                        NNN BPD · Staff +N    [action buttons]
                        [progress bar 3px]
```

**Left accent:** `width: 3px; align-self: stretch; border-radius: 2px 0 0 2px`

Rarity color map (apply via `.city-incubation-strip__item--{rarity}` or `data-rarity` attribute):
- common → `#94a3b8`
- uncommon → `#4ade80`
- rare → `#60a5fa`
- epic → `#c084fc`
- legendary → `#f0c482`
- beyond → `#ff7c9d`

**Quality ring (right column):**
```html
<div class="quality-ring" style="position:relative;width:40px;height:40px">
  <svg width="40" height="40" viewBox="0 0 40 40" style="transform:rotate(-90deg)">
    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(182,212,255,0.12)" stroke-width="3"/>
    <circle cx="20" cy="20" r="16" fill="none" stroke="{rarity-color}" stroke-width="3"
      stroke-dasharray="{quality_pct * 1.0053} 100.53" stroke-linecap="round"/>
  </svg>
  <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:500">{pct}%</span>
</div>
```

`stroke-dasharray` formula: circumference = 2π×16 ≈ 100.53. Fill = `quality_pct / 100 * 100.53`.

**Progress bar:**
```html
<div style="height:3px;background:rgba(182,212,255,0.1);border-radius:2px;margin-top:5px;overflow:hidden">
  <div style="width:{quality_pct}%;height:100%;background:{rarity-color};border-radius:2px"></div>
</div>
```

**Time remaining color:** green (`var(--success)`) if < 7 days, default muted otherwise.

**Inline action buttons:** 10px, ghost style, context-sensitive:
- Incubating: `Cancel` + `Hero Support` + `Expert Support`
- Active/Stalled: `Assign Staff` + `Details`
- Needs Input: `Review` + `Details`

**Section headers:**
```
Incubating    5 active / 5 slots    [Pause All]  [Resume All]
─────────────────────────────────────────────────────────────
Active        120 buildings
─────────────────────────────────────────────────────────────
```
Use `display: flex; justify-content: space-between; align-items: center` with `border-bottom: 1px solid rgba(182,212,255,0.1)` underneath.

---

## New — Sticky resource bar + filter bar

Page height is 2800px+. Both bars should stick while scrolling:

```css
.resource-bar {
  position: sticky;
  top: 44px; /* height of top-nav */
  z-index: 90;
  background: var(--bg-2);
}

.city-workspace__toolbar {
  position: sticky;
  top: 84px; /* top-nav 44px + resource-bar 40px */
  z-index: 80;
  background: var(--bg-0);
}
```

`alert-strip` should NOT be sticky — it's a one-time alert and should scroll away.

---

## New — Incubator sidebar sticky + scroll

`.incubator-sidebar` is currently 1343px tall and scrolls away with the page. It should stay fixed in the viewport:

```css
.incubator-sidebar {
  position: sticky;
  top: 84px; /* top-nav + resource-bar */
  height: calc(100vh - 84px);
  overflow-y: auto;
  align-self: flex-start;
}
```

The wrapper that holds `.city-workspace` + `.incubator-sidebar` side by side should be:
```css
display: flex;
align-items: flex-start;
gap: 0;
```

---

## New — Keyboard shortcut hints on key buttons

Add `title` attributes on frequently used buttons (zero UI cost, helps new users):
- Advance Day → `title="Advance Day"`
- Cloud Save → `title="Cloud Save"`
- Cloud Load → `title="Cloud Load"`
- Roll → `title="Roll Dice"`
- ⚙ Settings → `title="Session Settings"`

---

## New — Make `top-nav` sticky

**Problem:** `top-nav` has `position: relative` — scrolls away with the page. On a 2800px+ page this means the user loses navigation immediately.

```css
.top-nav {
  position: sticky;
  top: 0;
  z-index: 100;
}

.resource-bar {
  position: sticky;
  top: 44px;
  z-index: 90;
}
```

---

## New — Fix base font-size per density level

**Problem:** All elements (`top-nav`, `resource-bar`, `toolbar`, `alert-strip`) render at 18px regardless of the active density setting. This is why the toolbar stays tall even with pills — the text is simply too large. The `game-shell--density-*` classes need to set a root font-size:

```css
.game-shell--density-comfort { font-size: 15px; }
.game-shell--density-compact { font-size: 13px; }
.game-shell--density-dense   { font-size: 12px; }
.game-shell--density-small   { font-size: 11px; }
```

All `em`/`rem` values inside the shell will scale automatically. Any hardcoded `px` values on pills, cards, and tabs should be converted to `em` so they participate in the scale.

---

## New — Fix 4 unlabeled buttons (accessibility)

**Problem:** 4 `<button>` elements have no `innerText`, no `aria-label`, and no `title` — screen readers announce them as just "button".

Find them with:
```js
document.querySelectorAll('button').forEach(b => {
  if (!b.innerText?.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
    console.log(b);
});
```

Fix: add `aria-label="..."` or `title="..."` to each. Common culprits are icon-only buttons (close ✕, collapse ▾, pause ⏸).

---

## New — Add missing pages to top-nav dropdowns

**Problem:** Two pages exist in the project but are not linked from `top-nav`:
- `gm.html` — GM Console. Add to the **Core** dropdown (or the ⚙ Settings button as a direct link).
- `uniques.html` — appears to be Legends/Uniques. Add to the **People** dropdown between Legends and Awakened.

Updated dropdown maps:

| Group | Links |
|---|---|
| Core | Home, Forge, Economy, City, GM Console |
| People | Citizens, NPCs, Awakened, Legends, Uniques |
| World | Expeditions, Vehicles, Behemoths, Army, Chronicle |
| Craft | Crafting, Management |

---

## Files to change

- City page component / `city.html`
- `city.css` (toolbar, filter-bar, building card styles, page-hero collapse)
- Incubator card component (quality ring, rarity accent, progress bar)
- Resource bar component (add Defense slot)
- `city-tabs` component (add The Stream tab)
