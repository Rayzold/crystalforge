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

// Each weather entry is tagged with an `intensity` of "calm" or "dramatic".
// Calm conditions are the typical comfortable weather of the season — they
// fire ~70% of the time when rolling randomized weather. Dramatic conditions
// are the events that affect travel, expeditions, or moods — they fire the
// remaining ~30%. The streak logic in WeatherSystem.js uses this tag to
// decide whether the next day stays in the same category or breaks out.
export const WEATHER_BY_SEASON = {
  "Season of the Twilight": [
    { name: "Pale Sun",    icon: "🌤", tone: "clear",  intensity: "calm" },
    { name: "Snowfall",    icon: "🌨", tone: "snow",   intensity: "dramatic" },
    { name: "Frostwind",   icon: "💨", tone: "wind",   intensity: "dramatic" },
    { name: "Overcast",    icon: "☁️", tone: "cloud",  intensity: "calm" },
    { name: "Hard Freeze", icon: "❄️", tone: "frost",  intensity: "dramatic" }
  ],
  "Season of the Mists": [
    { name: "Mistbound",   icon: "🌫️", tone: "mist",   intensity: "calm" },
    { name: "Rainfall",    icon: "🌧️", tone: "rain",   intensity: "dramatic" },
    { name: "Drizzle",     icon: "🌦️", tone: "rain",   intensity: "calm" },
    { name: "Windlash",    icon: "💨", tone: "wind",   intensity: "dramatic" },
    { name: "Clear Break", icon: "⛅", tone: "clear",  intensity: "calm" }
  ],
  "Season of the Embers": [
    { name: "Bright Sun",   icon: "☀️", tone: "clear", intensity: "calm" },
    { name: "Dry Heat",     icon: "🌞", tone: "heat",  intensity: "calm" },
    { name: "Warm Gusts",   icon: "🌬️", tone: "wind", intensity: "calm" },
    { name: "Stormflash",   icon: "⛈️", tone: "storm", intensity: "dramatic" },
    { name: "Golden Skies", icon: "🌅", tone: "clear", intensity: "calm" }
  ],
  "Season of the Gloom": [
    { name: "Ashen Overcast", icon: "☁️", tone: "cloud", intensity: "calm" },
    { name: "Cold Rain",      icon: "🌧️", tone: "rain",  intensity: "dramatic" },
    { name: "Dim Mist",       icon: "🌫️", tone: "mist",  intensity: "calm" },
    { name: "Amber Wind",     icon: "💨", tone: "wind",  intensity: "calm" },
    { name: "Dusklight",      icon: "🌥️", tone: "clear", intensity: "calm" }
  ]
};

export function getSeasonForOffset(dayOffset = 0) {
  const date = getStructuredDate(dayOffset);
  return date.season;
}

export function getWeatherPoolForSeason(season) {
  return WEATHER_BY_SEASON[season] ?? WEATHER_BY_SEASON["Season of the Mists"];
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
