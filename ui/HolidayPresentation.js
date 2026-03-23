const HOLIDAY_GLYPHS = {
  renewal: "✦",
  social: "❀",
  harvest: "❀",
  equinox: "◐",
  solstice: "☼",
  astral: "✧",
  arcane: "✧",
  death: "☾",
  remembrance: "☾",
  civic: "⚑",
  travel: "➤"
};

export function getHolidayTypeToken(holiday) {
  return String(holiday?.type ?? "holiday")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export function getHolidayTypeClass(holiday, prefix = "holiday-accent--") {
  return `${prefix}${getHolidayTypeToken(holiday)}`;
}

export function getHolidayGlyph(holiday) {
  return HOLIDAY_GLYPHS[getHolidayTypeToken(holiday)] ?? "✦";
}