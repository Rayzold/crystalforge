import { RARITY_COLORS } from "../content/Rarities.js";

const REVEAL_PROFILES = {
  Common: { duration: 1200, particles: 8, rings: 2, title: "Common Manifest", accent: "A faint pulse answers the forge." },
  Uncommon: { duration: 1350, particles: 12, rings: 2, title: "Uncommon Manifest", accent: "The chamber hums with a brighter resonance." },
  Rare: { duration: 1550, particles: 16, rings: 3, title: "Rare Manifest", accent: "A sharper current sweeps through the sigils." },
  Epic: { duration: 1750, particles: 20, rings: 3, title: "Epic Manifest", accent: "The altar cracks with layered crystal thunder." },
  Legendary: { duration: 2050, particles: 26, rings: 4, title: "Legendary Manifest", accent: "Radiant force bends the whole chamber around the pull." },
  Beyond: { duration: 2350, particles: 34, rings: 5, title: "Beyond Manifest", accent: "Reality distorts as the forge tears open a higher answer." }
};

export class AnimationEngine {
  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "reveal-overlay";
    document.body.append(this.overlay);
  }

  async playManifestReveal(result) {
    const profile = REVEAL_PROFILES[result.rarity] ?? REVEAL_PROFILES.Common;
    const imageMarkup = result.building?.imagePath
      ? `<div class="reveal-overlay__art"><img src="${result.building.imagePath}" alt="${result.rolledName} artwork" /></div>`
      : `<div class="reveal-overlay__core" style="--rarity-color:${RARITY_COLORS[result.rarity]}"></div>`;

    const particles = Array.from({ length: profile.particles }, (_, index) => {
      const angle = (360 / profile.particles) * index;
      const delay = index * 40;
      return `<span class="reveal-overlay__particle" style="--particle-angle:${angle}deg; --particle-delay:${delay}ms; --rarity-color:${RARITY_COLORS[result.rarity]}"></span>`;
    }).join("");

    const rings = Array.from({ length: profile.rings }, (_, index) => `
      <div
        class="reveal-overlay__ring reveal-overlay__ring--tier-${index + 1}"
        style="--rarity-color:${RARITY_COLORS[result.rarity]}; --ring-delay:${index * 90}ms"
      ></div>
    `).join("");

    this.overlay.innerHTML = `
      <div class="reveal-overlay__scene rarity-${result.rarity.toLowerCase()}" style="--rarity-color:${RARITY_COLORS[result.rarity]}">
        <div class="reveal-overlay__backdrop"></div>
        ${rings}
        <div class="reveal-overlay__particles">${particles}</div>
        ${imageMarkup}
        <div class="reveal-overlay__text">
          <span>${profile.title}</span>
          <strong>${result.rolledName}</strong>
          <small>${profile.accent}</small>
        </div>
      </div>
    `;
    this.overlay.classList.add("is-active");

    await new Promise((resolve) => window.setTimeout(resolve, profile.duration));
    this.overlay.classList.remove("is-active");
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    this.overlay.innerHTML = "";
  }
}
