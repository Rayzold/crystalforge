# Crystal Forge — Town Map Rebuild Spec

## Why it's slow

The current Town Map renders **914 hex cells as individual DOM nodes**, each with SVG children. Total DOM inside the map panel: **3,630 nodes**, **2,366 SVG shapes**. The full page sits at **5,764 DOM nodes**.

Every pan, zoom, overlay switch, or reactive state update forces the browser to recalculate layout and repaint thousands of elements. This is the wrong architecture for any grid above ~100 cells.

## What the current map actually does

From the live data:
- Hex grid showing city plots (inner ring, 115/120 occupied) and bastion ring (11/42)
- 5 overlays: District, Defense, Trade, Resonance, Water, Bastion
- Planner mode: arm a building → click a hex to place it
- Pan/zoom controls (−/+/Reset)
- Tooltips per hex (zone, coordinates, district influence, occupant, placement bonus)
- Map presets (save/load layouts)

## Recommendation: remove the DOM hex grid, replace with two things

### 1. Canvas hex map (replaces `.hex-map-wrap`)
### 2. District summary cards (replaces the status panel)

These two together cover everything the current map does, with a fraction of the DOM cost.

---

## Part 1 — Canvas hex map

Replace `.hex-map-wrap` (3,630 DOM nodes) with a single `<canvas>` element.

```html
<canvas id="town-map-canvas" width="900" height="700"></canvas>
```

**DOM cost: 1 node instead of 3,630.**

### Drawing hexes

```js
const HEX_SIZE = 18; // radius in px
const ctx = canvas.getContext('2d');

function hexToPixel(q, r) {
  const x = HEX_SIZE * (3/2 * q);
  const y = HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x: x + canvas.width/2, y: y + canvas.height/2 };
}

function drawHex(ctx, cx, cy, size, fillColor, strokeColor) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5; ctx.stroke(); }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);
  for (const hex of hexData) {
    const { x, y } = hexToPixel(hex.q, hex.r);
    const color = getHexColor(hex, activeOverlay); // returns CSS color based on overlay
    drawHex(ctx, x, y, HEX_SIZE - 1, color, 'rgba(182,212,255,0.2)');
  }
  ctx.restore();
}
```

### Color scheme per overlay

| Overlay | Empty hex | Occupied hex |
|---|---|---|
| District | district color at 30% opacity | district color at 80% |
| Defense | `#334` | `#f97316` scaled by wall strength |
| Trade | `#334` | `#f0c482` scaled by trade value |
| Resonance | `#334` | `#a78bfa` scaled by mana output |
| Water | `#334` | `#60a5fa` |
| Bastion | `#334` | `#94a3b8` (walls) / `#ff7c9d` (gaps) |

### Pan and zoom

```js
let panX = 0, panY = 0, zoom = 1;

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  zoom = Math.max(0.4, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  render();
});

let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
canvas.addEventListener('mousemove', e => {
  if (dragging) { panX += e.clientX - lastX; panY += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; render(); }
  else hoverHex(e); // hit test for tooltip
});
canvas.addEventListener('mouseup', () => dragging = false);
```

### Hit testing (click / hover)

```js
function pixelToHex(px, py) {
  // reverse of hexToPixel, accounting for pan/zoom
  const x = (px - panX) / zoom - canvas.width/2;
  const y = (py - panY) / zoom - canvas.height/2;
  const q = (2/3 * x) / HEX_SIZE;
  const r = (-1/3 * x + Math.sqrt(3)/3 * y) / HEX_SIZE;
  return hexRound(q, r); // cube coordinate rounding
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const { q, r } = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
  const hex = hexData.find(h => h.q === q && h.r === r);
  if (hex) selectHex(hex); // show tooltip / trigger planner placement
});
```

### Tooltip

Keep the existing `.hex-map-panel__tooltip` DOM element — it's only 28 nodes and is fine as HTML. Show/hide it on canvas hover, position it at `e.clientX + 12, e.clientY + 12`.

### Planner mode

When planner is armed:
- On canvas hover: highlight the hovered hex with a glowing outline (draw a second hex outline in `--accent` color)
- On canvas click: call the existing placement handler with the hex coordinates

---

## Part 2 — District summary cards (replace `.hex-map-panel__status`)

The status panel currently shows raw counts. Replace with proper district cards that give the GM and players real information at a glance.

```
┌─────────────────────────────────────────────────────┐
│ Frontier District                         115 / 120 │
│ ████████████████████████░  96% full                 │
│                                                     │
│ Inner ring · 1 building awaiting placement          │
│ Bastion: 11/42 · 330 wall strength · 36% coverage  │
└─────────────────────────────────────────────────────┘
```

One card per district. Each card:
- District name + color swatch
- Occupancy bar (`current / total` with fill)
- Awaiting placement count (if > 0, show in amber)
- Bastion stats if applicable (wall strength, coverage %)
- Clicking a card pans the canvas to center on that district

HTML structure:
```html
<div class="district-card" data-district="frontier">
  <div class="district-card__header">
    <span class="district-card__swatch" style="background: {districtColor}"></span>
    <span class="district-card__name">Frontier District</span>
    <span class="district-card__count">115 / 120</span>
  </div>
  <div class="district-card__bar">
    <div class="district-card__fill" style="width: 96%"></div>
  </div>
  <div class="district-card__meta">1 building awaiting placement</div>
</div>
```

---

## What to remove entirely

- `.hex-map-wrap` and all its contents (3,630 DOM nodes → gone)
- The SVG element (2,366 shapes → gone)
- All `.hex-cell` elements and their event listeners
- Pan/zoom DOM controls (replaced by canvas wheel/drag)
- Map Presets section — low value, rarely used; remove or defer to a settings modal

## What to keep

- `.hex-map-panel__toolbar` (overlay buttons) — keep as-is, wire to canvas re-render
- `.hex-map-panel__tooltip` — keep as HTML, position via JS on canvas hover
- `.hex-map-panel__legend` — keep as-is
- Planner drawer — keep, wire placement clicks to canvas hit test

---

## Expected result

| Metric | Before | After |
|---|---|---|
| DOM nodes in map panel | 3,630 | ~50 |
| SVG shapes | 2,366 | 0 |
| Hex event listeners | 914+ | 3 (canvas) |
| Pan/zoom | CSS transform on 3,630 nodes | canvas matrix |
| Re-render cost | Full DOM reconcile | `ctx.clearRect` + draw loop |

---

## Implementation order

1. Build `hexData` array from existing state (q, r, zone, district, occupant, overlayValues)
2. Swap `.hex-map-wrap` for `<canvas id="town-map-canvas">`
3. Implement `render()`, pan/zoom, hit test
4. Wire overlay buttons to `activeOverlay` variable → call `render()`
5. Wire tooltip to canvas `mousemove`
6. Wire planner clicks to canvas `click`
7. Replace `.hex-map-panel__status` with district cards
8. Remove Map Presets section
