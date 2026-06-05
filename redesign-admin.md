# Crystal Forge — Admin Console UI/UX Redesign Spec

## What the console currently has

**Trigger:** GM Console button → full-screen modal overlay  
**Header:** Title + X close + ? help  
**Tabs:** Economy | Population | World | System | Search  

**Economy tab sections:**
1. GM Quick Grants — 8 quick-action cards (Common +1, Common +3, Tier Ladder, Rare +1, Epic +1, Session Pack, Recovery Pack, Legend Spark)
2. Crystals — Add / Remove / Set × 6 rarities
3. Shards — Add / Remove / Set × 6 rarities
4. Resources — 8 fields (Gold, Food, Materials, Salvage, Mana, Prosperity, Goods, Population) + Apply + Reset
5. Economy Debug — wide breakdown table (Stock | Buildings | District | Citizens +/- | Behemoths | Events | Focus | Net/Day)
6. Daily Resource Adjustments

**Population tab:** Citizen Management (1457 total), Provision count, citizen types (Farmers, Archers, etc.) each with Add / Remove / Set

**World tab:** Session Mode toggle, Drift Evolution stage editor (name, threshold, build slots, speed %, mobility, summary, abilities)

**System tab:** Save/Load, debug tools

---

## Issue 1 — Full-screen modal kills all city context

**Problem:** The console takes over the entire screen. During a live session the GM needs to see city state (resources, building list, alerts) while making changes. A full-screen overlay means they lose all context.

**Fix:** Replace the full-screen modal with a **right-side drawer panel**.

```css
.admin-root .modal__dialog {
  position: fixed;
  right: 0;
  top: 0;
  width: 520px;
  height: 100vh;
  overflow-y: auto;
  border-radius: 0;
  border-left: 1px solid var(--panel-border);
  background: var(--bg-1);
  box-shadow: -20px 0 60px rgba(0,0,0,0.5);
}

.admin-root .modal__backdrop {
  background: rgba(0,0,0,0.3); /* semi-transparent, not full black */
}
```

The city is still visible and readable in the background. The GM can reference the city state while editing.

---

## Issue 2 — Add / Remove / Set trio is too verbose

**Problem:** Every resource type (6 crystals + 6 shards + 8 economy resources = 20 types) shows three separate buttons: Add, Remove, Set. That's 60 buttons in the Economy tab alone, most of which are rarely used.

**Fix:** Replace with a compact inline spinner pattern per row:

```
[Common crystals]   current: 0   [−] [  input  ] [+]   [Apply]
```

- The current value is shown next to the label
- `−` decrements by 1, `+` increments by 1 (hold to repeat)
- The input field allows typing an exact value
- A single small Apply button (or Enter key) commits
- This collapses 3 buttons + hidden input into 1 row

---

## Issue 3 — Crystals and Shards sections are identical in layout

**Problem:** Two full sections (Crystals, Shards) each list 6 rarities with the same controls, stacked one after the other. They take a lot of vertical space and look the same.

**Fix:** Merge into a single **Currencies** section with a `Crystals / Shards` toggle pill at the top:

```
CURRENCIES  [● Crystals]  [  Shards  ]

Common        0    [−] [___] [+]
Uncommon      0    [−] [___] [+]
Rare          0    [−] [___] [+]
Epic          0    [−] [___] [+]
Legendary     0    [−] [___] [+]
Beyond        0    [−] [___] [+]
```

Half the vertical space, same functionality.

---

## Issue 4 — Resources section shows no current values

**Problem:** The Resources section (Gold, Food, Materials, Salvage, Mana, Prosperity, Goods, Population) shows only text inputs with no indication of what the current value is. The GM has to remember or switch to another panel to check.

**Fix:** Show current stock inline:

```
Gold          current: 88,999   [± input]   [Apply]
Food          current: 28,094   [± input]   [Apply]
Materials     current:    818   [± input]   [Apply]
```

Per-resource Apply buttons instead of one global Apply — this prevents accidentally overwriting multiple resources at once.

---

## Issue 5 — Economy Debug table overflows and is always expanded

**Problem:** The Economy Debug breakdown table (10 columns × 6 rows) is always visible and almost certainly overflows horizontally on most monitors. It's a diagnostic tool, not a live-session tool.

**Fix:**
- Collapse by default behind a `▶ Economy Debug` disclosure toggle
- On expand: allow horizontal scroll on the table wrapper (`overflow-x: auto`)
- Highlight the `NET / DAY` column in a slightly different background so it reads as the "result" column
- Color negative net values red (`var(--danger)`), positive green (`var(--success)`)

---

## Issue 6 — Session Mode toggle buried in System tab

**Problem:** The "Session Mode" toggle (switches to cleaner live-play layout) is inside the System tab. During a live session, the GM needs to switch modes quickly — not dig through tabs.

**Fix:** Move Session Mode to the **console header**, as a persistent toggle:

```
[Crystal Forge Admin Console]          [● Full]  [Session]        [X]
```

Or as a labeled pill in the header bar, always visible regardless of which tab is active.

---

## Issue 7 — Quick Grants cards are all-caps and description is redundant

**Problem:** Cards show "COMMON +1" (title) + "GRANT 1 COMMON CRYSTAL" (subtitle). The subtitle restates the title in different words — not useful.

**Fix:**
- Lowercase the title: "Common +1"
- Replace subtitle with the *effect* instead: "+1 crystal to pool · tap to apply"
- Or for complex ones like Session Pack: "2 Common, 1 Uncommon, 1 Rare"
- Use rarity color accent (left border) matching the crystal tier

---

## Issue 8 — No confirmation on destructive / large-value actions

**Problem:** "Apply Resources", "Reset GM Goods Override", and citizen Add/Remove have no confirmation step. A misclick or wrong value commits immediately.

**Fix:**
- For Apply Resources and Reset GM Override: require a **two-step confirm** — button changes to "Confirm Apply ✓" on first click, reverts after 3 seconds if not clicked again
- For Citizen Add/Remove: show a brief toast confirmation ("Added 5 Farmers") with an Undo button that persists for 5 seconds
- For Drift Evolution stage edits: require explicit "Save Stage Changes" button — do not auto-save on input

---

## Issue 9 — Search is a tab, not a persistent bar

**Problem:** Search is one of 5 equal tabs, meaning the GM has to switch away from Economy/Population to search. During a session they likely want to search while staying in their current context.

**Fix:** Move Search to a **persistent input in the header**, always visible:

```
[Crystal Forge Admin Console]   [🔍 Search buildings, events...]   [Session ●]   [X]
```

Results appear as a dropdown overlay below the search bar, without switching tabs.

---

## Issue 10 — Population citizen list has no totals or visual feedback

**Problem:** Citizen types (Farmers, Archers, etc.) each have Add/Remove/Set but there's no running total showing how many citizens are allocated vs. provisioned, and no visual indication of the distribution.

**Fix:**
- Add a compact summary bar at the top of the Population tab:
  ```
  Total: 1,457    Provisioned: 381    Unassigned: 1,076
  [████████░░░░░░░░░░░░] 26% provisioned
  ```
- Show current count next to each citizen type label
- Color-code types that are at 0 (unmanned) in muted red

---

## Issue 11 — Drift Evolution editor needs guardrails

**Problem:** The Drift Evolution stage editor (name, threshold, build slots, speed, mobility, summary, abilities) edits core game progression. Mistakes here can break the campaign.

**Fix:**
- Add a `⚠ Advanced — changes affect core game progression` warning header on this section
- Show a diff preview of what will change before saving
- Add an explicit "Save Stage Changes" button (no auto-save)
- Consider a "Restore Defaults" button per stage

---

## New layout structure

```
.admin-root (right drawer, 520px, fixed)
  header (44px)
    title
    [search input — always visible]
    [Session Mode toggle]
    [X close]
  tab-bar (40px)
    Economy | Population | World | System
  tab-content (scrollable, remaining height)
    [active tab sections]
```

---

## Quick win — keyboard shortcuts

Add these with zero UI cost:
- `Escape` → close console
- `Cmd/Ctrl + K` → focus search input
- `Enter` inside any number input → apply that row
- `Tab` → move between currency/resource rows

---

---

## Round 2 — Remaining fixes (after first pass)

### Status after Round 1

Done ✅
- Right drawer (560px) + semi-transparent backdrop (`rgba(0,0,0,0.32)`)
- Search input in header (always visible)
- Session Mode toggle in header
- Quick Grants cards — subtitle rewritten ("1 Common crystal · tap to apply")
- Currencies section merged with Crystals / Shards toggle + −/+ spinners
- Resources section shows current values with per-resource Apply buttons
- Population summary bar (Total / Provisioned / Unassigned / %)

Remaining 🔧 — see fixes below.

---

### Round 2 Fix 1 — Remove "Set" button from Currencies rows

**Problem:** Each currency rarity shows `− [value] + Set`. The Set button is redundant — the spinner already handles direct input.

**Options (pick one):**
- **Remove Set entirely** if the −/+ input accepts typed values directly
- **Replace with `=` icon button** that activates an inline exact-value input field, then dismisses on blur/Enter

Target row layout:
```
Common    0    [−]  [___]  [+]
```
No Set button. The number field is directly editable.

---

### Round 2 Fix 2 — Convert Population citizen rows to spinners

**Problem:** All citizen type rows (Farmers, Hunters, Fishermen, Scavengers, Druids, Laborers, etc.) still use the old Add / Remove / Set trio.

**Fix:** Same spinner pattern as the Economy Currencies section:
```
🌾 Farmers    ?    107    [−]  [___]  [+]
🏹 Hunters    ?     82    [−]  [___]  [+]
```

- Current count shown between label and spinner
- `?` help tooltip stays
- Remove the three-button trio entirely
- Group headers (e.g. "Labor & Industry — 224 citizens") stay as-is

---

### Round 2 Fix 3 — Collapse Economy Debug table by default

**Problem:** The Economy Debug breakdown table (Stock | Buildings | District | Citizens +/- | Behemoths | Events | Focus | Net/Day) is always expanded. It's a diagnostic tool, not a live-session tool.

**Fix:** Wrap in a `<details>` element, closed by default:

```html
<details class="admin-debug-disclosure">
  <summary>Economy Debug</summary>
  <!-- existing table -->
</details>
```

Additional table improvements when expanded:
- Wrap table in `overflow-x: auto` container (it overflows on narrower screens)
- `NET / DAY` column: slightly different background (`rgba(182,212,255,0.06)`)
- Positive net values: `color: var(--success)` — negative: `color: var(--danger)`

---

### Round 2 Fix 4 — Add confirmation for destructive actions

**Problem:** Apply Resources, Reset GM Goods Override, and citizen Add/Remove commit instantly with no undo.

**Fix — two-step confirm pattern for Apply / Reset buttons:**

On first click, the button changes state:
```
[Apply]  →  [Confirm ✓]   (reverts after 3s if not clicked again)
```

Implementation:
```js
btn.addEventListener('click', () => {
  if (btn.dataset.confirming) {
    // execute action
    btn.dataset.confirming = '';
    btn.textContent = originalText;
    clearTimeout(btn._timer);
  } else {
    btn.dataset.confirming = '1';
    btn.textContent = 'Confirm ✓';
    btn._timer = setTimeout(() => {
      btn.dataset.confirming = '';
      btn.textContent = originalText;
    }, 3000);
  }
});
```

Apply this to: Apply (per-resource), Apply Bulk, Reset GM Goods Override.

**Fix — undo toast for citizen changes:**

After any citizen Add/Remove commits, show a toast:
```
✓ Added 5 Farmers    [Undo]    (disappears after 5s)
```

Toast element: fixed bottom-right of the drawer, `background: var(--bg-1)`, `border: 1px solid var(--panel-border)`, auto-dismiss.

---

---

## Round 3 — Remaining fixes (after second pass)

### Status after Round 2

Done ✅
- Resources: current values + per-resource Apply buttons
- Economy Debug: `▶ Economy Debug` collapsible toggle
- Quick Grants cards: subtitle format correct

Remaining / new 🔧 — see fixes below.

---

### Round 3 Fix 1 — Remove "Set" button from Currencies (still present)

**Problem:** Each currency rarity still shows `0  −  +  Set`. The Set button was not removed.

**Fix:** If the number input between `−` and `+` accepts direct keyboard input, remove the Set button from the template entirely. No other changes needed — the input field replaces it.

If the input is read-only (only controlled by −/+), then make it editable (`type="number"`, no `readonly`) and remove Set.

---

### Round 3 Fix 2 — Confirm two-step pattern not implemented

**Problem:** Apply buttons (per-resource and bulk) fire immediately with no confirmation step. The `data-confirming` attribute and "Confirm ✓" state are not present in the DOM.

**Fix:** Apply the two-step pattern to all Apply and Reset buttons (see Round 2 Fix 4 JS snippet). Priority order:
1. Reset GM Goods Override (most destructive)
2. Per-resource Apply buttons
3. Apply Bulk

---

### Round 3 Fix 3 — Population summary bar shows wrong Provisioned count

**Problem:** The summary bar shows `Provisioned: 0 / Unassigned: 1,457 / 0% provisioned` even though citizens are assigned (Farmers: 107, Hunters: 82, etc.). The Provision count (381) exists but the summary is not reading from the right source.

**Fix:** The summary bar total should sum all assigned citizen counts across all types, not read from a separate `provision` field. Pseudocode:

```js
const totalAssigned = citizenTypes.reduce((sum, type) => sum + type.count, 0);
const provisioned = totalAssigned; // or sum of all non-zero citizen assignments
const pct = Math.round((provisioned / totalPopulation) * 100);
```

Update the bar to: `Total: 1,457 · Assigned: 628 · Unassigned: 829 · 43% assigned`

---

### Round 3 Fix 4 — Population citizen rows: confirm spinner conversion

**Problem:** In the previous audit, citizen type rows (Farmers, Hunters, Fishermen, etc.) still showed `Add Remove Set 107`. Confirm whether this was converted to spinners in Round 2.

If not converted: apply the same spinner pattern as the Currencies section —
```
🌾 Farmers   107   [−]  [___]  [+]
```
Remove Add / Remove / Set trio. Current count sits between label and spinner.

---

---

## Round 4 — Remaining fixes (after third pass)

### Status after Round 3

Done ✅
- Currencies: Set button removed — rows now `Common  0  −  +`
- Population citizen rows: spinners (`− +`) replacing Add/Remove/Set
- Population summary: now shows `Assigned: 1,457 · Unassigned: 0 · 100% assigned`

Remaining 🔧 — see fixes below.

---

### Round 4 Fix 1 — Two-step confirm still not implemented

**Problem:** Apply buttons still fire immediately — clicking "Apply" does not change to "Confirm ✓".

**Fix:** Apply the two-step pattern to all `button.admin-resource-row__apply` buttons and the Reset GM Goods Override button:

```js
document.querySelectorAll('.admin-resource-row__apply, .admin-reset-btn').forEach(btn => {
  const original = btn.textContent.trim();
  btn.addEventListener('click', e => {
    if (btn.dataset.confirming) {
      // second click — execute
      btn.dataset.confirming = '';
      btn.textContent = original;
      clearTimeout(btn._confirmTimer);
      // ... run the actual apply logic here
    } else {
      // first click — arm
      e.stopImmediatePropagation();
      btn.dataset.confirming = '1';
      btn.textContent = 'Confirm ✓';
      btn._confirmTimer = setTimeout(() => {
        btn.dataset.confirming = '';
        btn.textContent = original;
      }, 3000);
    }
  }, true); // capture phase so it intercepts before existing handlers
});
```

CSS for the armed state:
```css
.admin-resource-row__apply[data-confirming] {
  background: rgba(112, 241, 194, 0.15);
  border-color: var(--success);
  color: var(--success);
}
```

---

### Round 4 Fix 2 — Population citizen rows missing current count

**Problem:** Each citizen row shows `🌾 Farmers  ?  −  +` — the current count (e.g. 107) is missing from between the label and the spinner. The spec called for:

```
🌾 Farmers   ?   107   [−]  [___]  [+]
```

**Fix:** The number input between `−` and `+` should be pre-populated with the current citizen count and remain visible at all times. If the input has `value=""` or is hidden, set its value to the current count on render and ensure it has a visible width (min-width: 48px).

If the count is stored separately from the input, bind it: `input.value = citizenType.count` on mount and on every update.

---

## Files to change

- Admin console modal component (layout → right drawer)
- Economy section component (merge Crystals+Shards, inline spinners, collapse Debug table)
- Population section component (summary bar, current counts)
- Console header component (Session Mode toggle, persistent search)
- CSS: drawer width, backdrop opacity, table overflow
