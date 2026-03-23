import { escapeHtml } from "../engine/Utils.js";

const SUPPORTED_BUILDING_ART_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

export function getBuildingArtCandidates(imagePath) {
  const normalizedPath = String(imagePath ?? "").trim();
  if (!normalizedPath) {
    return [];
  }

  const matchedExtension = SUPPORTED_BUILDING_ART_EXTENSIONS.find((extension) =>
    normalizedPath.toLowerCase().endsWith(extension)
  );

  if (!matchedExtension) {
    return [normalizedPath];
  }

  const basePath = normalizedPath.slice(0, -matchedExtension.length);
  return [
    normalizedPath,
    ...SUPPORTED_BUILDING_ART_EXTENSIONS.filter((extension) => extension !== matchedExtension).map((extension) => `${basePath}${extension}`)
  ];
}

export function getBuildingArtFallbackAttribute(imagePath) {
  const [, ...fallbackCandidates] = getBuildingArtCandidates(imagePath);
  return escapeHtml(fallbackCandidates.join("|"));
}

export function renderBuildingArt(imagePath, altText, fallbackMarkup, fallbackDisplay = "grid") {
  if (!imagePath) {
    return fallbackMarkup;
  }

  const [primaryCandidate] = getBuildingArtCandidates(imagePath);
  const fallbackAttribute = getBuildingArtFallbackAttribute(imagePath);

  return `
    <img src="${escapeHtml(primaryCandidate)}" data-fallback-srcs="${fallbackAttribute}" alt="${escapeHtml(altText)}" loading="lazy" onerror="const paths=(this.dataset.fallbackSrcs||'').split('|').filter(Boolean); if (paths.length) { const next=paths.shift(); this.dataset.fallbackSrcs=paths.join('|'); this.src=next; return; } this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='${fallbackDisplay}';" />
    <div style="display:none">${fallbackMarkup}</div>
  `;
}