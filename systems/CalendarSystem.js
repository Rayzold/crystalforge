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

  return {
    dayOffset,
    year,
    monthIndex,
    month,
    day,
    weekdayIndex,
    weekday,
    season: SEASON_BY_MONTH[month],
    holiday
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
