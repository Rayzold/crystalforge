import { escapeHtml } from "../engine/Utils.js?v=v1.7.20-20260615092907";

const SUPPORTED_BUILDING_ART_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

export function resolveBuildingImageSource(building) {
  if (building && typeof building.imageData === "string" && building.imageData.startsWith("data:image/")) {
    return building.imageData;
  }
  return building?.imagePath ?? "";
}

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

export function renderBuildingArt(source, altText, fallbackMarkup, fallbackDisplay = "grid") {
  // Accept either a path string, an inline data URL, or a building object so
  // callers can pass an instance and we pick up imageData → imagePath fallback.
  const resolvedSource =
    source && typeof source === "object" && !Array.isArray(source)
      ? resolveBuildingImageSource(source)
      : source;

  if (!resolvedSource) {
    return fallbackMarkup;
  }

  // Inline data URLs are self-contained; no extension fallback chain needed.
  if (typeof resolvedSource === "string" && resolvedSource.startsWith("data:image/")) {
    return `
      <img src="${escapeHtml(resolvedSource)}" alt="${escapeHtml(altText)}" loading="lazy" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='${fallbackDisplay}';" />
      <div style="display:none">${fallbackMarkup}</div>
    `;
  }

  const [primaryCandidate] = getBuildingArtCandidates(resolvedSource);
  const fallbackAttribute = getBuildingArtFallbackAttribute(resolvedSource);

  return `
    <img src="${escapeHtml(primaryCandidate)}" data-fallback-srcs="${fallbackAttribute}" alt="${escapeHtml(altText)}" loading="lazy" onerror="const paths=(this.dataset.fallbackSrcs||'').split('|').filter(Boolean); if (paths.length) { const next=paths.shift(); this.dataset.fallbackSrcs=paths.join('|'); this.src=next; return; } this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='${fallbackDisplay}';" />
    <div style="display:none">${fallbackMarkup}</div>
  `;
}