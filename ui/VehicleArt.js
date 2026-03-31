import { escapeHtml } from "../engine/Utils.js";

const SUPPORTED_VEHICLE_ART_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

export function getVehicleArtCandidates(imagePath) {
  const normalizedPath = String(imagePath ?? "").trim();
  if (!normalizedPath) {
    return [];
  }

  const matchedExtension = SUPPORTED_VEHICLE_ART_EXTENSIONS.find((extension) =>
    normalizedPath.toLowerCase().endsWith(extension)
  );

  if (!matchedExtension) {
    return [normalizedPath];
  }

  const basePath = normalizedPath.slice(0, -matchedExtension.length);
  return [
    normalizedPath,
    ...SUPPORTED_VEHICLE_ART_EXTENSIONS.filter((extension) => extension !== matchedExtension).map((extension) => `${basePath}${extension}`)
  ];
}

export function renderVehicleArt(imagePath, altText, fallbackMarkup, fallbackDisplay = "grid") {
  if (!imagePath) {
    return fallbackMarkup;
  }

  const [primaryCandidate, ...fallbackCandidates] = getVehicleArtCandidates(imagePath);

  return `
    <img src="${escapeHtml(primaryCandidate)}" data-fallback-srcs="${escapeHtml(fallbackCandidates.join("|"))}" alt="${escapeHtml(altText)}" loading="lazy" onerror="const paths=(this.dataset.fallbackSrcs||'').split('|').filter(Boolean); if (paths.length) { const next=paths.shift(); this.dataset.fallbackSrcs=paths.join('|'); this.src=next; return; } this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='${fallbackDisplay}';" />
    <div style="display:none">${fallbackMarkup}</div>
  `;
}
