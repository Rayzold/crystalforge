import { RARITY_COLORS } from "../content/Rarities.js";

export class AnimationEngine {
  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "reveal-overlay";
    document.body.append(this.overlay);
  }

  async playManifestReveal(result) {
    const imageMarkup = result.building?.imagePath
      ? `<div class="reveal-overlay__art"><img src="${result.building.imagePath}" alt="${result.rolledName} artwork" /></div>`
      : `<div class="reveal-overlay__core" style="--rarity-color:${RARITY_COLORS[result.rarity]}"></div>`;

    const particles = Array.from({ length: 10 }, (_, index) => {
      const angle = (360 / 10) * index;
      const delay = index * 40;
      return `<span class="reveal-overlay__particle" style="--particle-angle:${angle}deg; --particle-delay:${delay}ms; --rarity-color:${RARITY_COLORS[result.rarity]}"></span>`;
    }).join("");

    this.overlay.innerHTML = `
      <div class="reveal-overlay__scene rarity-${result.rarity.toLowerCase()}" style="--rarity-color:${RARITY_COLORS[result.rarity]}">
        <div class="reveal-overlay__backdrop"></div>
        <div class="reveal-overlay__ring reveal-overlay__ring--outer" style="--rarity-color:${RARITY_COLORS[result.rarity]}"></div>
        <div class="reveal-overlay__ring reveal-overlay__ring--inner" style="--rarity-color:${RARITY_COLORS[result.rarity]}"></div>
        <div class="reveal-overlay__particles">${particles}</div>
        ${imageMarkup}
        <div class="reveal-overlay__text">
          <span>${result.rarity} Manifest</span>
          <strong>${result.rolledName}</strong>
          <small>${result.qualityRoll}% quality</small>
        </div>
      </div>
    `;
    this.overlay.classList.add("is-active");

    await new Promise((resolve) => window.setTimeout(resolve, result.rarity === "Beyond" ? 1900 : 1300));
    this.overlay.classList.remove("is-active");
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    this.overlay.innerHTML = "";
  }
}
