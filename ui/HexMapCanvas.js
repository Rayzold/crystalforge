// Canvas-backed hex map. Replaces the 3,630-node SVG grid used by the
// classic HexMap render with a single <canvas>. Drawing, pan/zoom, hit
// testing, and overlay switching all happen on the canvas — the
// surrounding chrome (toolbar / tooltip / legend / picker / planner) is
// still rendered as ordinary DOM by HexMap.js.
//
// Usage from UIRenderer:
//   attachHexMapCanvas(root, state);
// is called after each innerHTML render. It finds any mount points marked
// with [data-town-map-mount], pulls cells/buildings/overlay from state,
// draws into the canvas, and wires mouse interactions.

import { MAP_CONFIG } from "../content/MapConfig.js";
import { RARITY_COLORS } from "../content/Rarities.js";

const TWO_PI = Math.PI * 2;
const SQRT3 = Math.sqrt(3);

function axialToPixel(q, r, size) {
  return {
    x: size * SQRT3 * (q + r / 2),
    y: size * 1.5 * r
  };
}

// Inverse of axialToPixel. Returns fractional axial coordinates which the
// caller rounds via cubeRound() below.
function pixelToAxialFractional(x, y, size) {
  const r = (2 / 3) * y / size;
  const q = (-r / 2) + (x / (size * SQRT3));
  return { q, r };
}

function cubeRound(qf, rf) {
  let x = qf;
  let z = rf;
  let y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

function getCellsBounds(cells, size) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const cell of cells) {
    const { x, y } = axialToPixel(cell.q, cell.r, size);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const pad = size * 1.5;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: (maxX - minX) + pad * 2,
    height: (maxY - minY) + pad * 2
  };
}

// Pre-build a small Map for fast cell + building lookup by axial key.
function buildLookup(cells, buildings) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(`${cell.q},${cell.r}`, { cell, building: null });
  for (const b of buildings ?? []) {
    if (!b.mapPosition) continue;
    const entry = byKey.get(`${b.mapPosition.q},${b.mapPosition.r}`);
    if (entry) entry.building = b;
  }
  return byKey;
}

// Color rules per overlay. Each returns { fill, stroke }.
function getHexStyle(entry, overlay, state, isHovered, isSelected) {
  const { cell, building } = entry;
  const rarity = building?.rarity;
  let fill = "rgba(40, 54, 84, 0.85)"; // empty plot default
  let stroke = "rgba(140, 170, 220, 0.18)";
  let strokeWidth = 0.6;

  if (cell.isReserved) {
    fill = "rgba(120, 90, 60, 0.85)";
    stroke = "rgba(240, 196, 130, 0.8)";
  } else if (cell.isFortificationRing) {
    fill = building ? "rgba(120, 80, 110, 0.78)" : "rgba(36, 30, 56, 0.72)";
    stroke = "rgba(229, 140, 255, 0.32)";
  }

  if (building && rarity && RARITY_COLORS[rarity]) {
    fill = RARITY_COLORS[rarity];
    stroke = "rgba(255, 255, 255, 0.32)";
    strokeWidth = 1;
  }

  // Overlay tweaks — light tinting on top of the base.
  if (overlay === "Defense") {
    if (building && cell.isFortificationRing) fill = "#f97316";
    else if (cell.isFortificationRing && !building) fill = "rgba(255, 124, 157, 0.32)";
  } else if (overlay === "Trade") {
    if (building) fill = "rgba(240, 196, 130, 0.82)";
  } else if (overlay === "Resonance") {
    if (building) fill = "rgba(167, 139, 250, 0.82)";
  } else if (overlay === "Water" && cell.terrain === "water") {
    fill = "rgba(96, 165, 250, 0.78)";
  } else if (overlay === "Bastion" && cell.isFortificationRing) {
    fill = building ? "rgba(148, 163, 184, 0.85)" : "rgba(255, 124, 157, 0.48)";
  } else if (overlay === "District" && building && state.districts?.definitions?.[building.district]) {
    const dColor = state.districts.definitions[building.district].color;
    if (dColor) fill = dColor;
  }

  if (isSelected) {
    stroke = "#ffffff";
    strokeWidth = 2.5;
  } else if (isHovered) {
    stroke = "rgba(141, 214, 255, 0.95)";
    strokeWidth = 2;
  }

  return { fill, stroke, strokeWidth };
}

function tracePointyHex(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

class TownMapCanvas {
  constructor(mount, state, options = {}) {
    this.mount = mount;
    this.state = state;
    this.size = options.size ?? MAP_CONFIG.hexSize ?? 18;
    this.cells = state.map?.cells ?? [];
    this.buildings = state.buildings ?? [];
    this.lookup = buildLookup(this.cells, this.buildings);
    this.bounds = getCellsBounds(this.cells, this.size);
    this.overlay = state.transientUi?.mapOverlay ?? "District";
    this.zoom = Number(state.transientUi?.mapZoom ?? 1) || 1;
    this.panX = Number(state.transientUi?.mapPanX ?? 0) || 0;
    this.panY = Number(state.transientUi?.mapPanY ?? 0) || 0;
    this.selectedCell = state.ui?.selectedMapCell ?? null;
    this.hoverKey = null;
    this.draggingPan = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.dragMoved = false;
    this.deviceRatio = window.devicePixelRatio || 1;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "town-map-canvas";
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "560px";
    this.canvas.style.cursor = "grab";
    this.canvas.style.borderRadius = "16px";
    this.canvas.style.background = "linear-gradient(180deg, rgba(14,20,38,0.92), rgba(8,12,24,0.94))";
    mount.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resizeCanvas();
    this.bindEvents();
    this.draw();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(280, Math.round(rect.height));
    this.canvas.width = Math.round(w * this.deviceRatio);
    this.canvas.height = Math.round(h * this.deviceRatio);
    this.cssWidth = w;
    this.cssHeight = h;
    this.ctx.setTransform(this.deviceRatio, 0, 0, this.deviceRatio, 0, 0);
  }

  // Convert a canvas-space pixel (CSS coords) to world coordinates (the same
  // space axialToPixel produces), accounting for pan, zoom, and the centring
  // offset draw() applies.
  canvasToWorld(cssX, cssY) {
    const centreX = this.cssWidth / 2 + this.panX;
    const centreY = this.cssHeight / 2 + this.panY;
    return {
      x: (cssX - centreX) / this.zoom,
      y: (cssY - centreY) / this.zoom
    };
  }

  hitTest(cssX, cssY) {
    const { x, y } = this.canvasToWorld(cssX, cssY);
    const frac = pixelToAxialFractional(x, y, this.size);
    const { q, r } = cubeRound(frac.q, frac.r);
    return this.lookup.get(`${q},${r}`) ? { q, r } : null;
  }

  bindEvents() {
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextZoom = Math.max(0.4, Math.min(3, this.zoom * factor));
      // Zoom around the cursor: keep the world point under the mouse fixed.
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const before = this.canvasToWorld(cx, cy);
      this.zoom = nextZoom;
      // Recompute pan so the same world point still sits under (cx, cy).
      const centreX = this.cssWidth / 2 + this.panX;
      const centreY = this.cssHeight / 2 + this.panY;
      const afterX = before.x * this.zoom + centreX;
      const afterY = before.y * this.zoom + centreY;
      this.panX += cx - afterX;
      this.panY += cy - afterY;
      this.draw();
    }, { passive: false });

    this.canvas.addEventListener("pointerdown", (e) => {
      this.draggingPan = true;
      this.dragMoved = false;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.style.cursor = "grabbing";
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.draggingPan) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
        this.panX += dx;
        this.panY += dy;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.draw();
      } else {
        const rect = this.canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const hit = this.hitTest(cx, cy);
        const key = hit ? `${hit.q},${hit.r}` : null;
        if (key !== this.hoverKey) {
          this.hoverKey = key;
          this.draw();
        }
      }
    });

    this.canvas.addEventListener("pointerup", () => {
      this.draggingPan = false;
      this.canvas.style.cursor = "grab";
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.draggingPan = false;
      this.canvas.style.cursor = "grab";
      if (this.hoverKey !== null) {
        this.hoverKey = null;
        this.draw();
      }
    });

    this.canvas.addEventListener("click", (e) => {
      if (this.dragMoved) return; // suppress click after a pan drag
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const hit = this.hitTest(cx, cy);
      if (!hit) return;
      // Dispatch the existing select-map-cell action by synthesising a click
      // on a transient element with the right data attributes. The root
      // click handler in app.js picks it up like any other map cell click.
      const proxy = document.createElement("button");
      proxy.type = "button";
      proxy.dataset.action = "select-map-cell";
      proxy.dataset.q = String(hit.q);
      proxy.dataset.r = String(hit.r);
      proxy.style.display = "none";
      document.body.append(proxy);
      proxy.click();
      proxy.remove();
    });

    // Resize observer so panning/drawing keeps up if the column width changes.
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        this.resizeCanvas();
        this.draw();
      });
      ro.observe(this.canvas);
      this._resizeObserver = ro;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    const centreX = this.cssWidth / 2 + this.panX;
    const centreY = this.cssHeight / 2 + this.panY;
    ctx.save();
    ctx.translate(centreX, centreY);
    ctx.scale(this.zoom, this.zoom);

    const drawSize = this.size - 1;
    for (const cell of this.cells) {
      const { x, y } = axialToPixel(cell.q, cell.r, this.size);
      const entry = this.lookup.get(`${cell.q},${cell.r}`);
      const key = `${cell.q},${cell.r}`;
      const isSelected = this.selectedCell && this.selectedCell.q === cell.q && this.selectedCell.r === cell.r;
      const isHovered = this.hoverKey === key;
      const { fill, stroke, strokeWidth } = getHexStyle(entry, this.overlay, this.state, isHovered, isSelected);
      tracePointyHex(ctx, x, y, drawSize);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth / this.zoom;
      ctx.stroke();

      // Building marker — small filled disc inside the hex so the GM can see
      // where buildings are at a glance regardless of overlay tint.
      if (entry?.building) {
        ctx.beginPath();
        ctx.arc(x, y, drawSize * 0.32, 0, TWO_PI);
        ctx.fillStyle = "rgba(20, 28, 44, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1 / this.zoom;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  destroy() {
    this._resizeObserver?.disconnect();
    this.canvas.remove();
  }
}

/**
 * Find every [data-town-map-mount] under `root` and (re)attach a canvas map
 * to it. Called once per UIRenderer render — each render destroys the old
 * mount and creates a new one, so we just create a fresh controller every
 * time.
 */
export function attachHexMapCanvas(root, state) {
  const mounts = root.querySelectorAll("[data-town-map-mount]");
  for (const mount of mounts) {
    // Clear any previous canvas from a no-op double-render.
    mount.replaceChildren();
    try {
      new TownMapCanvas(mount, state);
    } catch (error) {
      console.error("Town map canvas failed to mount:", error);
      mount.append(Object.assign(document.createElement("p"), {
        className: "town-map-canvas__error",
        textContent: "Town map failed to render. See console for details."
      }));
    }
  }
}
