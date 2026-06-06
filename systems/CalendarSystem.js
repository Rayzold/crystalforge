import {
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  DAYS_PER_YEAR,
  HOLIDAYS,
  MONTHS,
  SEASON_BY_MONTH,
  START_DATE,
  WEEKDAYS
} from "../content/CalendarConfig.js";

const MOON_PHASES = [
  { name: "New Moon", icon: "🌑", from: 0, to: 2 },
  { name: "Waxing Crescent", icon: "🌒", from: 3, to: 5 },
  { name: "First Quarter", icon: "🌓", from: 6, to: 9 },
  { name: "Waxing Gibbous", icon: "🌔", from: 10, to: 12 },
  { name: "Full Moon", icon: "🌕", from: 13, to: 15 },
  { name: "Waning Gibbous", icon: "🌖", from: 16, to: 19 },
  { name: "Last Quarter", icon: "🌗", from: 20, to: 22 },
  { name: "Waning Crescent", icon: "🌘", from: 23, to: 27 }
];

// Two pools drive weather randomization:
//
//   - WEATHER_BY_SEASON: the everyday CALM conditions for each season.
//     These cover the ~70% of days the calendar should feel stable and
//     livable. Each entry is { name, icon, tone, intensity: "calm" }.
//
//   - DRAMATIC_WEATHER: the global list of 20 Scarred Lands weather
//     phenomena, drawn from the campaign sourcebook. These are the
//     reality-warping, monster-summoning events — NOT seasonal weather,
//     so they fire from a single global pool regardless of season.
//     Each entry carries the same shape (name, icon, tone, intensity:
//     "dramatic") plus rich GM metadata: navLevel, monsterRange,
//     description, signs, gear, quote.
//
// The streak logic in WeatherSystem.js decides which pool to draw from
// each day (calm-vs-dramatic with persistence), then picks a specific
// entry from that pool.
export const WEATHER_BY_SEASON = {
  "Season of the Twilight": [
    { name: "Pale Sun",  icon: "🌤", tone: "clear", intensity: "calm" },
    { name: "Overcast",  icon: "☁️", tone: "cloud", intensity: "calm" }
  ],
  "Season of the Mists": [
    { name: "Mistbound",   icon: "🌫️", tone: "mist",  intensity: "calm" },
    { name: "Drizzle",     icon: "🌦️", tone: "rain",  intensity: "calm" },
    { name: "Clear Break", icon: "⛅", tone: "clear", intensity: "calm" }
  ],
  "Season of the Embers": [
    { name: "Bright Sun",   icon: "☀️", tone: "clear", intensity: "calm" },
    { name: "Dry Heat",     icon: "🌞", tone: "heat",  intensity: "calm" },
    { name: "Warm Gusts",   icon: "🌬️", tone: "wind", intensity: "calm" },
    { name: "Golden Skies", icon: "🌅", tone: "clear", intensity: "calm" }
  ],
  "Season of the Gloom": [
    { name: "Ashen Overcast", icon: "☁️", tone: "cloud", intensity: "calm" },
    { name: "Dim Mist",       icon: "🌫️", tone: "mist",  intensity: "calm" },
    { name: "Amber Wind",     icon: "💨", tone: "wind",  intensity: "calm" },
    { name: "Dusklight",      icon: "🌥️", tone: "clear", intensity: "calm" }
  ]
};

// The 20 dramatic weather phenomena from the Scarred Lands sourcebook —
// global, not seasonal. Nav levels (D / C / B / A / S) escalate from
// Drizzle through Scarring; monster ranges tell GMs what creature tiers
// can show up. See the Weather Conditions info panel on the Chronicle
// page for the GM-facing reference.
export const DRAMATIC_WEATHER = [
  {
    name: "Petrichor Rain", icon: "🌧️", tone: "rain", intensity: "dramatic",
    navLevel: "D", monsterRange: "D–C (Wolf–Lion)",
    description: "Rain containing a substance that smells of petrichor. Manageable, but Savages don't stay home for rain.",
    signs: "A slight drizzle followed by the smell of petrichor.",
    gear: "Umbrella (protects cargo from smell), sound-making device (scares weaker monsters).",
    quote: "Intimidation is key when dealing with these monsters. With a strong enough sound, they'll flee without a second thought."
  },
  {
    name: "Skyquakes", icon: "💥", tone: "storm", intensity: "dramatic",
    navLevel: "C", monsterRange: "D–C (Wolf–Lion)",
    description: "Mysterious sonic booms from the sky. Deafening, damaging to cargo. Visibility is clear. Monsters that appear are deaf and hunt by sight only.",
    signs: "Distant explosions, then progressive ground shaking until thunderbolts appear.",
    gear: "Suspension gear (protects cargo), earplugs or noise-cancelling headphones.",
    quote: "Do not carry eggs. Unless your client prefers them scrambled."
  },
  {
    name: "Thunder Booms", icon: "⚡", tone: "storm", intensity: "dramatic",
    navLevel: "C", monsterRange: "D–C (Wolf–Lion)",
    description: "Explosive electrical discharges targeting all metallic objects. Metal equipment = death sentence. Some drifters weaponize this with metal spikes in non-metallic cases.",
    signs: "Static electricity; shivers up the entire body.",
    gear: "Non-metallic equipment. Metal spikes in a non-metallic case (offensive).",
    quote: "I had to leave my armor behind! Can you imagine that! By the Divine Spark, the humiliation!"
  },
  {
    name: "Living Cyclones", icon: "🌪️", tone: "wind", intensity: "dramatic",
    navLevel: "C", monsterRange: "D–B (Wolf–Dragon)",
    description: "Whirlwinds of dust, debris, and elemental energy reaching hundreds of feet tall. Highly localized but multiple form at once. No gear helps — just run.",
    signs: "Atmosphere initially very calm; a gentle breeze is the only warning.",
    gear: "None — speed is the only tool.",
    quote: "They told me cardio helps lengthen life expectancy. Turns out they were right!"
  },
  {
    name: "Nanite Storm", icon: "🤖", tone: "storm", intensity: "dramatic",
    navLevel: "C", monsterRange: "D–C (Wolf–Lion)",
    description: "Rain containing nanomachines that alter matter at molecular level. Nanites can upgrade monsters mid-encounter — making them far more dangerous than their tier suggests. Glass and diamond surfaces are immune.",
    signs: "Clouds appear from metallic surfaces; rain tastes bitter with metallic aftertaste.",
    gear: "Glass/diamond containers and gear.",
    quote: "Before the storm we decided not to hunt the rabbits… After the Nanite Storm we found ourselves running from a swarm of killer-robot rabbits that threw lasers from their eyes…"
  },
  {
    name: "Elemental Bursts", icon: "🔥", tone: "storm", intensity: "dramatic",
    navLevel: "B", monsterRange: "C–B (Lion–Dragon)",
    description: "Unpredictable energy releases that charge, damage, or explode any object holding electrical charge. All devices fail or detonate. Only organic monsters appear.",
    signs: "Objects with elemental charges begin exhibiting unusual behavior.",
    gear: "Wooden cloak, wooden-soled boots, throwable metal spikes in a non-metallic case.",
    quote: "Some savage clans move freely during Elemental Bursts. They just avoid carrying metallic equipment. We found out the hard way…"
  },
  {
    name: "Ice Blossoms", icon: "❄️", tone: "frost", intensity: "dramatic",
    navLevel: "B", monsterRange: "B (Dragon only)",
    description: "Rare ice crystal formations that coat terrain, making it lethally slippery. Dragon-level monsters exclusively. Visibility excellent. Oil flasks thrown at monsters cause uncontrollable sliding.",
    signs: "Sudden temperature drop.",
    gear: "Grip-soled boots, oil flasks (offensive).",
    quote: "Do you want to build a Snowdrifter? No? Then keep moving before you become one."
  },
  {
    name: "Moonbows", icon: "🌈", tone: "mist", intensity: "dramatic",
    navLevel: "B", monsterRange: "C–A (Lion–Calamity)",
    description: "Mystical rainbows visible only at night. No warning before they appear. Calamity-level creatures present; when disoriented they make a sound called \"An Ode to the Moons.\"",
    signs: "None. The most unpredictable phenomenon. They simply appear.",
    gear: "Silence and stealth are the only tools.",
    quote: "I do not know what I will forget first, the beauty of the moonbow, or the eerie Ode to the Moon those crazy monsters sing."
  },
  {
    name: "Umbral Tempest", icon: "🔅", tone: "dark", intensity: "dramatic",
    navLevel: "B", monsterRange: "B–A (Dragon–Calamity)",
    description: "A storm that devours all light. Thunderbolts absorb illumination — daylight turns to absolute darkness in seconds. Monsters fear light but thrive in darkness.",
    signs: "Rain clouds with deep purple sparks.",
    gear: "Shardlights (mandatory).",
    quote: "SHARDLIGHTS. You must have Shardlights with you if you want to live. Did I mention Shardlights? GET. SOME. SHARDLIGHTS!"
  },
  {
    name: "Flat Rain", icon: "🌧️", tone: "rain", intensity: "dramatic",
    navLevel: "B", monsterRange: "B–A (Dragon–Calamity)",
    description: "Powerful horizontal rain with enough force to open wounds. Monsters are present but fight each other — drifters report they follow a pattern, as if fighting for a reason.",
    signs: "Sky turns black with huge clouds; central cloud gathers water from the rest.",
    gear: "Shield or heavy armor.",
    quote: "I tell you; they are fighting for a reason. They have a pattern… No dammit, I'm not mad! The rain did not hit me that hard on the head!… I was wearing a helmet!"
  },
  {
    name: "Psionic Storm", icon: "🧠", tone: "mind", intensity: "dramatic",
    navLevel: "B", monsterRange: "D–A (Wolf–Calamity)",
    description: "A storm of psychic energy. Danger is mental, not physical. May cause madness, hallucinations, or the awakening of psychic abilities. The Wizard became Awakened when struck by a Psionic Storm bolt.",
    signs: "Rainbow shimmer in sky; animals behave strangely; Datasphere signals garble; buzzing behind the eyes.",
    gear: "Psionic insulation helmet/suit, psychic dampener device.",
    quote: "I saw everything at once — every possible future, every possible mistake. Then it passed, and I couldn't remember my mother's face."
  },
  {
    name: "Shadowstorms", icon: "👻", tone: "dark", intensity: "dramatic",
    navLevel: "A", monsterRange: "D–C (Wolf–Lion)",
    description: "Supernatural darkness and shadow energy. Visibility near-zero. Ghostly apparitions active. Electronic equipment malfunctions. Monster threat is relatively low despite the terrifying atmosphere.",
    signs: "Shadows lengthen unnaturally; lights flicker; devices corrupt; animals go silent.",
    gear: "Shardlights, divine artifacts.",
    quote: "The darkness isn't empty. Something moves in it. Something that knows your name."
  },
  {
    name: "Chrono Fog", icon: "⏰", tone: "time", intensity: "dramatic",
    navLevel: "A", monsterRange: "D–A (Wolf–Calamity)",
    description: "Temporal distortion — time moves at different speeds in different zones. Drifters have emerged years older or younger. May transport drifters to the past. Time Wraiths feed on temporal energy within.",
    signs: "Clocks erratic; déjà-vu intensifies; ghost images of past events; Datasphere shows timestamps from multiple eras.",
    gear: "Time Anchor (mandatory), temporal scanner.",
    quote: "Came out three years older. My caravan had given me up for dead. I'd only been inside for what felt like an afternoon."
  },
  {
    name: "Volcanic Storm", icon: "🌋", tone: "heat", intensity: "dramatic",
    navLevel: "A", monsterRange: "C–S (Lion–Apocalypse)",
    description: "Ash, magma rain, superheated gas, and pyroclastic flows. The first weather entry with an S-tier monster rating. Fire-based Apocalypse-class entities emerge from eruptions.",
    signs: "Ground vibration days in advance; sulfur smell; geysers activate; sky turns brick-red.",
    gear: "Thermal armor (full-body), ice grenades, cryo weapons.",
    quote: "Wore full thermal and still felt like I was melting. Lost three caravan members to the magma rain before we reached high ground."
  },
  {
    name: "Anti-Gravity Vortex", icon: "🌀", tone: "wind", intensity: "dramatic",
    navLevel: "A", monsterRange: "A–S+ (Calamity–Cataclysmic)",
    description: "Gravity is negated. Everything floats and becomes lethal. Metallic objects become high-velocity projectiles — do not bring metal. Cataclysmic-level monsters documented within the eye.",
    signs: "Small objects begin floating; water runs upward; low hum; animals levitate.",
    gear: "Maglev gear, non-metallic tethers.",
    quote: "Left my iron blade behind. Good thing. Watched it go through a man's chest at a hundred meters per second when the vortex hit."
  },
  {
    name: "Necrotic Shroud", icon: "☠️", tone: "death", intensity: "dramatic",
    navLevel: "A", monsterRange: "A–S (Calamity–Apocalypse)",
    description: "A fog of necrotic energy that kills living tissue on prolonged contact. Voices of the dead are audible. Undead entities empowered and multiplied. Divine powers uniquely effective here.",
    signs: "Plants wither rapidly; animals flee; greenish cold fog; smell of decay; Datasphere goes silent.",
    gear: "Shardlights, divine power artifacts.",
    quote: "The Necrotic Shroud is your enemy. Light and faith are your only allies."
  },
  {
    name: "Glass Rain", icon: "💎", tone: "ice", intensity: "dramatic",
    navLevel: "A", monsterRange: "A–S (Calamity–Apocalypse)",
    description: "Rain composed of glass shards, sometimes mixed with actual diamonds. Shards range from microscopic (infiltrating lungs) to building-sized panels. Diamonds genuinely fall — but no one survives to collect them unprotected.",
    signs: "Faint tinkling in wind; sky develops glassy shimmer; hot sand smell; initial \"probe shards\" fall first.",
    gear: "Sealed armored vehicles (minimum); full sealed heavy armor for foot travel.",
    quote: "Saw a diamond the size of my fist hit the road six feet away. Left a crater. Prettiest thing I've ever seen. Nearly killed me."
  },
  {
    name: "Waterfall Shower", icon: "🌊", tone: "rain", intensity: "dramatic",
    navLevel: "A", monsterRange: "A–S (Calamity–Apocalypse)",
    description: "Water condenses in the sky and expands into massive rivers that crash to ground. Water moves, so static shelter is insufficient. Monsters are in a frenzy — attacking everything including each other.",
    signs: "Starts like a normal storm but the environment feels extremely dry… until it isn't.",
    gear: "None documented — speed is the only survival tool.",
    quote: "If you dare enter a Waterfall Shower be ready for a series of fights, last man, or monster, standing."
  },
  {
    name: "Cosmic Storm", icon: "🌌", tone: "cosmic", intensity: "dramatic",
    navLevel: "S", monsterRange: "A–S+ (Calamity–Cataclysmic)",
    description: "Tempests that cause fluctuations in reality — objects, creatures, and entire landscapes appear and disappear. The most powerful free monsters emerge. Cannot be navigated or flown around. Avoid at all costs.",
    signs: "You see the sky shattering on the horizon. It has already begun.",
    gear: "Avoid entirely.",
    quote: "It's lunch break for them, and they come out altogether to find some lunch. Namely, you."
  },
  {
    name: "Dimensional Scars", icon: "🌀", tone: "cosmic", intensity: "dramatic",
    navLevel: "S", monsterRange: "Any–S+ (Any tier–Cataclysmic)",
    description: "Rifts in reality allowing passage to other dimensions. The birthplace of monsters — The First Scarring opened these rifts. Every new Dimensional Scar releases more creatures. Not a time to fight — hide.",
    signs: "Starts like normal rain; closed portals appear on walls and objects; then they open.",
    gear: "Hide.",
    quote: "I'm just happy the bigger ones do not fit through the portals… Usually."
  }
];

export function getSeasonForOffset(dayOffset = 0) {
  const date = getStructuredDate(dayOffset);
  return date.season;
}

// Calm pool is per-season; dramatic pool is global. Callers select by intensity.
export function getCalmPoolForSeason(season) {
  return WEATHER_BY_SEASON[season] ?? WEATHER_BY_SEASON["Season of the Mists"];
}

export function getDramaticPool() {
  return DRAMATIC_WEATHER;
}

// Back-compat alias for callers that still pull "the season's pool" — returns
// just the calm entries. Dramatic pickers should call getDramaticPool() directly.
export function getWeatherPoolForSeason(season) {
  return getCalmPoolForSeason(season);
}

// Returns the weather for a given day — honoring any persisted user override
// in state.weatherOverrides, otherwise falling back to the deterministic
// season-table pick that drives the read-only calendar history.
export function getWeatherForDay(state, dayOffset) {
  const override = state?.weatherOverrides?.[String(dayOffset)];
  if (override && override.name) {
    return override;
  }
  return getStructuredDate(dayOffset).weather;
}

const START_ORDINAL =
  START_DATE.year * DAYS_PER_YEAR +
  START_DATE.monthIndex * DAYS_PER_MONTH +
  (START_DATE.day - 1);

function ordinalSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function getMoonPhase(dayOffset = 0) {
  const cycleDay = ((dayOffset % DAYS_PER_MONTH) + DAYS_PER_MONTH) % DAYS_PER_MONTH;
  return MOON_PHASES.find((phase) => cycleDay >= phase.from && cycleDay <= phase.to) ?? MOON_PHASES[0];
}

function getWeatherForDate(year, monthIndex, day, season) {
  const seasonalWeather = WEATHER_BY_SEASON[season] ?? WEATHER_BY_SEASON["Season of the Mists"];
  const weatherIndex = Math.abs((year * 7 + monthIndex * 11 + day * 5) % seasonalWeather.length);
  return seasonalWeather[weatherIndex];
}

export function getStructuredDate(dayOffset = 0) {
  const worldOrdinal = START_ORDINAL + dayOffset;
  const year = Math.floor(worldOrdinal / DAYS_PER_YEAR);
  const remainder = worldOrdinal % DAYS_PER_YEAR;
  const monthIndex = Math.floor(remainder / DAYS_PER_MONTH);
  const day = (remainder % DAYS_PER_MONTH) + 1;
  const month = MONTHS[monthIndex];
  const weekdayIndex = (WEEKDAYS.indexOf(START_DATE.weekday) + dayOffset) % WEEKDAYS.length;
  const weekday = WEEKDAYS[(weekdayIndex + WEEKDAYS.length) % WEEKDAYS.length];
  const holiday = HOLIDAYS.find((entry) => entry.month === month && entry.day === day) ?? null;
  const season = SEASON_BY_MONTH[month];

  return {
    dayOffset,
    year,
    monthIndex,
    month,
    day,
    weekdayIndex,
    weekday,
    season,
    holiday,
    moonPhase: getMoonPhase(dayOffset),
    weather: getWeatherForDate(year, monthIndex, day, season)
  };
}

export function formatDate(dayOffset = 0) {
  const date = getStructuredDate(dayOffset);
  return `${date.weekday}, ${date.month} the ${date.day}${ordinalSuffix(date.day)}, Year ${date.year} AC`;
}

export function addDays(dayOffset, days) {
  return dayOffset + days;
}

export function getMonthStartOffset(dayOffset = 0) {
  const date = getStructuredDate(dayOffset);
  return dayOffset - (date.day - 1);
}

export function addMonthsToOffset(dayOffset = 0, monthDelta = 0) {
  const date = getStructuredDate(dayOffset);
  const totalMonths = date.year * MONTHS_PER_YEAR + date.monthIndex + monthDelta;
  const nextYear = Math.floor(totalMonths / MONTHS_PER_YEAR);
  const nextMonthIndex = ((totalMonths % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  return dateFromParts(nextYear, MONTHS[nextMonthIndex], 1);
}

export function getMonthDayOffsets(dayOffset = 0) {
  const monthStart = getMonthStartOffset(dayOffset);
  return Array.from({ length: DAYS_PER_MONTH }, (_, index) => monthStart + index);
}

export function compareDates(leftOffset, rightOffset) {
  return leftOffset - rightOffset;
}

export function getHolidayName(dayOffset) {
  return getStructuredDate(dayOffset).holiday?.name ?? null;
}

export function getNextHoliday(dayOffset = 0) {
  const currentDate = getStructuredDate(dayOffset);

  const upcomingHoliday = HOLIDAYS.reduce((closestHoliday, holiday) => {
    let holidayYear = currentDate.year;
    let holidayOffset = dateFromParts(holidayYear, holiday.month, holiday.day);

    if (holidayOffset === null) {
      return closestHoliday;
    }

    if (holidayOffset <= dayOffset) {
      holidayYear += 1;
      holidayOffset = dateFromParts(holidayYear, holiday.month, holiday.day);
    }

    if (holidayOffset === null) {
      return closestHoliday;
    }

    const daysUntil = holidayOffset - dayOffset;

    if (!closestHoliday || daysUntil < closestHoliday.daysUntil) {
      return {
        ...holiday,
        year: holidayYear,
        dayOffset: holidayOffset,
        daysUntil,
        date: getStructuredDate(holidayOffset)
      };
    }

    return closestHoliday;
  }, null);

  return upcomingHoliday;
}

export function getSeason(dayOffset) {
  return getStructuredDate(dayOffset).season;
}

export function dateFromParts(year, monthName, day) {
  const monthIndex = MONTHS.indexOf(monthName);
  if (monthIndex === -1) {
    return null;
  }
  const targetOrdinal = year * DAYS_PER_YEAR + monthIndex * DAYS_PER_MONTH + (day - 1);
  return targetOrdinal - START_ORDINAL;
}
