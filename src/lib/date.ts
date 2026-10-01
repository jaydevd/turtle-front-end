/**
 * Date helpers.
 *
 * The backend stores every timestamp as Unix epoch **seconds**, and it derives
 * "a day" using UTC midnight (`TIME_ZONE = "UTC"`). To avoid off-by-one-day
 * drift between a check-in and the streak it feeds, this module treats a
 * calendar day as UTC midnight throughout. That keeps the frontend and the
 * streak maths in exact agreement regardless of where the browser is.
 */

export const SECONDS_PER_DAY = 86_400;

export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000);
}

/** UTC midnight of the day containing `seconds`. */
export function startOfUtcDay(seconds: number): number {
  return Math.floor(seconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

export function startOfTodayUtc(): number {
  return startOfUtcDay(Math.floor(Date.now() / 1000));
}

export function addUtcDays(seconds: number, days: number): number {
  return seconds + days * SECONDS_PER_DAY;
}

/** 0 = Monday ... 6 = Sunday, matching the backend `Weekday` enum. */
export function utcWeekday(seconds: number): number {
  return new Date(seconds * 1000).getUTCDay() === 0
    ? 6
    : new Date(seconds * 1000).getUTCDay() - 1;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'UTC',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatShortDate(seconds: number): string {
  return dateFormatter.format(fromUnixSeconds(seconds));
}

export function formatLongDate(seconds: number): string {
  return longDateFormatter.format(fromUnixSeconds(seconds));
}

export function formatWeekday(seconds: number): string {
  return weekdayFormatter.format(fromUnixSeconds(seconds));
}

export function formatToday(): string {
  return formatLongDate(startOfTodayUtc());
}

/** `"07:30:00"` or `"07:30"` to a localised time. */
export function formatClock(value: string | null | undefined): string {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  const hour = Number(hours);
  const minute = Number(minutes ?? 0);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  return timeFormatter.format(new Date(2000, 0, 1, hour, minute));
}

/** `"07:30"` to the `"HH:MM:SS"` shape the API expects. */
export function toApiTime(value: string): string | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':');
  if (hours === undefined || minutes === undefined) return null;
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
}

export function fromApiTime(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Native date input bridging                                          */
/* ------------------------------------------------------------------ */

/** Epoch seconds to the `YYYY-MM-DD` string `<input type="date">` expects. */
export function toDateInputValue(seconds: number): string {
  const date = fromUnixSeconds(seconds);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` from the input to UTC-midnight epoch seconds. */
export function fromDateInputValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 1000);
}

/**
 * Indexes logs by their UTC-midnight day key, which is exactly the shape the
 * heatmap and day rows consume. The API always stores `date` at UTC midnight,
 * but `startOfUtcDay` defensively snaps any stray value.
 */
export function logsByUtcDay<T extends { date: number }>(logs: T[] | undefined): Map<number, T> {
  const index = new Map<number, T>();
  for (const log of logs ?? []) {
    index.set(startOfUtcDay(log.date), log);
  }
  return index;
}

/** Every day between two UTC-midnight timestamps, inclusive of `start`. */
export function eachUtcDay(start: number, end: number): number[] {
  const days: number[] = [];
  for (let day = start; day <= end; day = addUtcDays(day, 1)) {
    days.push(day);
  }
  return days;
}


/* ------------------------------------------------------------------ */
/* Relative phrasing                                                   */
/* ------------------------------------------------------------------ */

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function formatRelative(seconds: number): string {
  const delta = seconds - Math.floor(Date.now() / 1000);
  const magnitude = Math.abs(delta);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (magnitude >= size) {
      return relativeFormatter.format(Math.round(delta / size), unit);
    }
  }
  return 'just now';
}

export function formatPlural(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}
