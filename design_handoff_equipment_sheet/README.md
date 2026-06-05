# Handoff: D&D Character Equipment Sheet ("Aether HUD")

## Overview
An interactive **equipment / inventory sheet** for a tabletop-RPG website. Each player
gets a page showing a heroic character figure in the center, surrounded by labelled
**equipment slots** (Head, Eyes, Neck, Shoulders, Back, Torso, Arms/Wrists, Hands, Waist,
Legs, Feet, Ring I, Ring II) connected to the body by thin "HUD" lines. Below the figure
are an **Arsenal** block (weapons, shield, coin purse) and a **Backpack** list. Every field
is a real text input the player fills in. There is a **male** and a **female** version
(same layout, different hero silhouette).

Visual direction: **"Aether HUD"** — a modern video-game inventory screen. Dark slate
panels, neon-cyan glow, notched tech corners, condensed display type.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a
prototype showing the intended look and behavior. They are **not** meant to be shipped
as-is. Recreate this design in your site's existing environment (React/Vue/Svelte/etc.)
using your established component and styling patterns. If you have no front-end framework
yet, the prototype is plain enough to drop in directly (see "Files" below) and refactor later.

The prototype loads React 18 + Babel from a CDN and transpiles `.jsx` in the browser.
**For production, port the JSX to your build pipeline** (or convert to plain components) —
don't ship the in-browser Babel transformer.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, glow, and layout are all specified
below and present in `themes.css`. Recreate it pixel-closely. The one deliberately-replaceable
element is the **hero silhouette**: it is a clean stylized SVG placeholder meant to be swapped
for real character art later (see "Swapping the hero art").

## Layout (one sheet)

Fixed design width **820px**. The sheet is a vertical stack: header → figure zone → footer.
The figure zone uses **absolute positioning** with hard-coded coordinates (it's a diagram,
not a responsive grid). Overall height ~1180px; `.sheet` has `min-height:1180px`.

```
┌────────────────────────────────────────── 820px ──────────────────────────────────────┐
│ HEADER  [ Character name (flex-grow) ]  [ Class · 172px ]  [ Lv · 62px ]                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ FIGURE ZONE  (position:relative, width 820, height 760)                                  │
│                                                                                          │
│  LEFT COLUMN (x=28, w=220)        centered hero          RIGHT COLUMN (x=572, w=220)     │
│   Head      (top 120, h76)        SVG silhouette          Back        (top 120, h70)     │
│   Eyes      (top 214)             in a 300×640 box        Torso/Body  (top 206)          │
│   Neck      (top 308)             at left:260, top:120    Arms/Wrists (top 292)          │
│   Shoulders (top 402)             ↔ connector <svg>       Waist       (top 378)          │
│   Hands     (top 496)               overlay draws         Legs        (top 464)          │
│   Ring I    (top 590)               polyline + nodes      Feet        (top 550)          │
│                                                           Ring II     (top 636)          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ FOOTER (flex, gap 22, padding 10/28/28)                                                  │
│   ARSENAL (flex:1)                          BACKPACK & CARRIED (flex:1)                   │
│    Melee Weapon / Ranged Weapon /            7 rows of [ item input | qty 46px ]          │
│    Shield · Off-hand / Coin Purse                                                        │
│    Coin Purse = 3 fields: GP / SP / CP                                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Slot boxes
- Each `.slot` is `position:absolute`, width **220px**, height **76px** (left col) or
  **70px** (right col). Left boxes at `left:28`; right boxes at `left:572`.
- Internal: a header row (`.slot-head`) = a 9px round **dot** (accent, glowing) + an
  uppercase **label**; below it a borderless **text input** with a 1px bottom rule.
- HUD detail: clipped corners via
  `clip-path: polygon(0 0, calc(100% - 11px) 0, 100% 11px, 100% 100%, 11px 100%, 0 calc(100% - 11px))`
  and a faint inner cyan glow.

### Connector lines (the diagram wiring)
A single full-zone `<svg class="connectors">` (820×760, `pointer-events:none`) draws, per slot:
- a **polyline** from the box's inner edge → a 16px horizontal stub → the body anchor point;
- a small **stub dot** (r 3.5) at the box edge and a glowing **node** (r 5.5) at the body.

Body anchor points are hard-coded per slot in `equipment-doll.jsx` (`LEFT` / `RIGHT` arrays,
`anchor:[x,y]` in figure-zone coordinates). **If you resize or re-pose the figure, update these
anchors** so the lines still land on the right body part.

## Design Tokens  (Aether HUD — all defined as CSS vars on `.theme-hud` in `themes.css`)

| Token | Value | Used for |
|---|---|---|
| Title font | **Orbitron** (600/700/800) | labels, headings, name/level inputs |
| Body font | **Chakra Petch** (400–700) | input values |
| Page background | `radial-gradient(125% 85% at 50% 6%, #1b2f4d 0%, #102036 52%, #080f1d 100%)` | sheet bg |
| Ink (text) | `#dceafa` | input text |
| Muted | `#5f7790` | placeholders |
| Label | `#79d3ef` | slot/field labels |
| Title color | `#9fe3ff` | footer section titles |
| **Accent (cyan)** | `#39d4ff` | dots, nodes, glow, field underlines |
| Accent 2 (amber) | `#ffb648` | reserved / accents |
| Box background | `linear-gradient(180deg, rgba(30,52,82,.82), rgba(15,28,48,.9))` | slot + coin boxes |
| Box border | `1px solid rgba(80,168,214,.42)` | slot + coin boxes |
| Box radius | `8px` (before corner clip) | slots |
| Field underline | `rgba(120,200,235,.35)` | input bottom rules |
| Connector line | `rgba(95,205,245,.5)`, width 2 | wiring |
| Node fill | `#39d4ff` + `drop-shadow(0 0 6px)` | body connection dots |
| Figure fill | `#2aa6d6` | hero silhouette (`color`/`currentColor`) |
| Figure glow | `drop-shadow(0 0 20px rgba(57,212,255,.45))` | hero |
| Panel bg / border | `rgba(13,26,45,.55)` / `1px solid rgba(80,168,214,.3)` | footer columns |
| Coin label colors | GP `#f4b740`, SP `#c2c9d4`, CP `#d08a52` | coin purse |
| Faint grid overlay | 34px cyan grid, radial-masked, ~6% opacity | figure-zone backdrop |

Typography specifics: slot labels 13px / `letter-spacing .07em` / uppercase / 700 with a
soft cyan text-shadow. Input values 16px. Name input 25px, other header inputs 21px.
Footer titles 17px / `.08em` / uppercase.

## Slots & fields (exact content)
- **Header:** Character (placeholder "Name your adventurer"), Class, Lv (placeholder "1").
- **Worn equipment (13):** Head, Eyes, Neck, Shoulders, Hands, Ring Ⅰ (left column);
  Back, Torso / Body, Arms / Wrists, Waist, Legs, Feet, Ring Ⅱ (right column).
- **Arsenal:** Melee Weapon, Ranged Weapon, Shield / Off-hand, Coin Purse (GP / SP / CP).
- **Backpack & Carried:** 7 rows, each an item field + a narrow quantity field.

All inputs are uncontrolled `<input type="text">` with a placeholder of "—" when empty.
Wire them to your own state / persistence (see "State" below).

## Interactions & Behavior
- The prototype has **no JS behavior beyond rendering** — it's a static fillable form.
  Focus styling is the browser default `outline:none` + the field underline; you may add a
  brighter `:focus` underline (e.g. underline → solid `--accent`).
- Suggested production behavior:
  - **Persist** each field (controlled inputs → save to your DB / localStorage per character).
  - Optionally make slot dots reflect "filled vs empty" (e.g. dot solid when the slot has an item).
  - Optional hover: lift a slot box / brighten its border on `:hover`.

## State Management
Minimal. One record per character:
```
{ name, class, level,
  slots: { head, eyes, neck, shoulders, hands, ring1,
           back, torso, arms, waist, legs, feet, ring2 },
  arsenal: { melee, ranged, shield },
  coins: { gp, sp, cp },
  backpack: [ { item, qty } × 7 (or dynamic) ] }
```
Convert the uncontrolled inputs to controlled, bound to this object; save on change/blur.

## Swapping the hero art
The figure is `silhouettes.jsx` → `<Silhouette gender="male|female" />`, a symmetric SVG
drawn with `fill="currentColor"` so the theme's `--fig` color drives it. To use real art:
replace the `.figure` contents with your `<img>` / SVG, keep the same 300×640 box at
`left:260; top:120` inside the figure zone, then **re-check the connector `anchor` points**
in `equipment-doll.jsx` so the lines meet the new artwork.

## Responsive note
The sheet is a fixed 820px diagram. For narrow screens, the cleanest approach is to scale
the whole `.sheet` (`transform: scale()`) to fit width, **or** build a stacked variant
(figure on top, slots as a single column below) — ask the designer if you need that layout.

## Files (in this bundle)
- **`demo.html`** — standalone page rendering the male + female sheets side by side. Open it
  to see the design live. This is the reference to match.
- **`equipment-doll.jsx`** — the `EquipmentDoll` component: layout, slot data + connector
  geometry, all inputs, the footer. Exposes `window.EquipmentDoll`.
- **`silhouettes.jsx`** — the hero `Silhouette` component (male/female SVG). Exposes
  `window.Silhouette`.
- **`themes.css`** — all structural layout + the `.theme-hud` token set. (The file also
  contains two unused themes, `.theme-story` / `.theme-arcane`; you can delete those blocks.)

> In the original project, these are presented inside a pan/zoom "design canvas"
> (`Equipment Sheet.html`). That wrapper is **only for design review** — ignore it for
> implementation; use `demo.html` + the three source files above.
