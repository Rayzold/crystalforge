import { RARITY_COLORS } from "../content/Rarities.js";

export class AnimationEngine {
  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "reveal-overlay";
    document.body.append(this.overlay);
  }

  async playManifestReveal(result) {
    this.overlay.innerHTML = `
      <div class="reveal-overlay__scene rarity-${result.rarity.toLowerCase()}">
        <div class="reveal-overlay__core" style="--rarity-color:${RARITY_COLORS[result.rarity]}"></div>
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
