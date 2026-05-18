export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value, decimals = 0) {
  return roundTo(value, decimals).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

export function formatSigned(value, decimals = 2) {
  const rounded = roundTo(value, decimals);
  if (rounded === 0) {
    return "0";
  }
  return `${rounded > 0 ? "+" : ""}${formatNumber(rounded, decimals)}`;
}

export function createId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function deepClone(value) {
  return structuredClone(value);
}

export function sumObjectValues(record) {
  return Object.values(record).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function sortBuildings(buildings, rarityOrder) {
  return [...buildings].sort((left, right) => {
    const rarityDelta = rarityOrder.indexOf(right.rarity) - rarityOrder.indexOf(left.rarity);
    if (rarityDelta !== 0) {
      return rarityDelta;
    }
    if (Number(right.isComplete) !== Number(left.isComplete)) {
      return Number(right.isComplete) - Number(left.isComplete);
    }
    return left.name.localeCompare(right.name);
  });
}

export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Downscale and re-encode an image File into a JPEG dataURL, keeping the
// long edge under `maxEdge`. Prevents large phone photos from filling
// localStorage. PNG inputs lose transparency (acceptable for portraits).
export function downscaleImageFile(file, { maxEdge = 400, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("File is not an image."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode image."));
      image.onload = () => {
        const longEdge = Math.max(image.width, image.height);
        const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable."));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
