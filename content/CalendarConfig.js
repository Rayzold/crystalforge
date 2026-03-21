export const WEEKDAYS = [
  "Moonday",
  "Tidesday",
  "Glimmerday",
  "Dreamday",
  "Soothingday",
  "Dazzleday",
  "Sunburstday"
];

export const MONTHS = [
  "Iceheart",
  "Frostbloom",
  "Stormwatch",
  "Cloudbreak",
  "Winddance",
  "Firethorn",
  "Sunspark",
  "Starfall",
  "Emberfall",
  "Leafwilt",
  "Moonwhisper",
  "Snowshimmer"
];

export const SEASON_BY_MONTH = {
  Iceheart: "Season of the Twilight",
  Frostbloom: "Season of the Twilight",
  Snowshimmer: "Season of the Twilight",
  Stormwatch: "Season of the Mists",
  Cloudbreak: "Season of the Mists",
  Winddance: "Season of the Mists",
  Firethorn: "Season of the Embers",
  Sunspark: "Season of the Embers",
  Starfall: "Season of the Embers",
  Emberfall: "Season of the Gloom",
  Leafwilt: "Season of the Gloom",
  Moonwhisper: "Season of the Gloom"
};

export const HOLIDAYS = [
  { month: "Iceheart", day: 1, name: "New Dawning", type: "renewal", description: "The first dawn of the civic year, marked by vows, lanterns, and fresh ledgers." },
  { month: "Frostbloom", day: 14, name: "Love's Embrace", type: "social", description: "A day for unions, pledges, and public affection even in the cold season." },
  { month: "Stormwatch", day: 12, name: "Mists' Equinox", type: "equinox", description: "Balance between hidden things and seen paths, observed with fog rites and quiet watchfires." },
  { month: "Cloudbreak", day: 1, name: "The Renewal", type: "renewal", description: "The city reopens its public works after the heavy mist season." },
  { month: "Cloudbreak", day: 9, name: "The Ascension", type: "civic", description: "A ceremonial day of banners, speeches, and honor for the city's chosen direction." },
  { month: "Winddance", day: 1, name: "Zephyr's Calling", type: "travel", description: "Routes, scouts, and sky ambitions are blessed as fair winds begin." },
  { month: "Firethorn", day: 12, name: "Burning Solstice", type: "solstice", description: "The fiercest light of the year, celebrated with braziers, duels, and ember feasts." },
  { month: "Sunspark", day: 28, name: "Night of the Red Nanites", type: "arcane", description: "A dangerous and beautiful night when ancient machine-lights are said to stir." },
  { month: "Starfall", day: 15, name: "Doublemoon Alignment", type: "astral", description: "Twin moons align over Drift, filling scholars and prophets with omen-hunger." },
  { month: "Emberfall", day: 13, name: "Gloom Equinox", type: "equinox", description: "The turning into decline and shadow, marked by ash offerings and quiet bells." },
  { month: "Emberfall", day: 20, name: "Harvest Moon Festival", type: "harvest", description: "Granaries open, tables fill, and the city's survival is counted in full view." },
  { month: "Leafwilt", day: 4, name: "The Great Scarring", type: "remembrance", description: "A remembrance of devastation, ruin, and the cost of earlier ages." },
  { month: "Leafwilt", day: 28, name: "Day of the Dead / Night of the Undead", type: "death", description: "The line between remembrance and terror thins as the city honors and fears its dead." },
  { month: "Moonwhisper", day: 7, name: "Datasphere's Reach", type: "arcane", description: "Signals from beyond are strongest, and fragments of impossible knowledge bleed through." },
  { month: "Snowshimmer", day: 13, name: "End's Solstice", type: "solstice", description: "The longest shadow of the year, observed with endings, reckonings, and endurance rites." },
  { month: "Snowshimmer", day: 28, name: "New Year's Eve", type: "civic", description: "The final night before the cycle resets, heavy with forecasts and toasts." }
];

export const YEARLY_EVENTS = HOLIDAYS;

export const START_DATE = {
  weekday: "Glimmerday",
  month: "Firethorn",
  monthIndex: 5,
  day: 17,
  year: 1218
};

export const DAYS_PER_MONTH = 28;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
