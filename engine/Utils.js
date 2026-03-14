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
