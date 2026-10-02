/**
 * Date helpers.
 *
 * The backend stores every timestamp as Unix epoch **seconds**, and identifies a
 * calendar day with an integer **day label**: the UTC midnight of that day. The
 * stored value is a label, not an instant, so UTC accessors below are correct for
 * rendering one - `Date.UTC(2026, 9, 8)` is the label that reads as "Oct 8".
 *
 * What is *not* stored is the mapping from the current instant to today's label.
 * That follows `APP_TIME_ZONE`, matching the backend's `habits/analytics/calendar.py`.
 * When it followed UTC instead, between 00:00 and 05:30 IST the app still treated
 * the previous calendar day as "today", rolled the day over 5.5 hours late, and
 * wrote check-ins onto the wrong day. `startOfToday` is the single place that
 * mapping happens, so it must ship together with the backend that reads it.
 *
 * This is deliberately one global timezone rather than a per-user setting: a
 * streak means the same thing regardless of where the traveller's browser is, and
 * a label written in one zone has to stay readable from every other.
 */

export const SECONDS_PER_DAY = 86_400;

/** Must match `habits/analytics/calendar.py: APP_TIMEZONE`. */
export const APP_TIME_ZONE = 'Asia/Kolkata';

export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000);
}

/** Snap a value onto the day-label grid. Labels are always UTC midnight. */
export function startOfUtcDay(seconds: number): number {
  return Math.floor(seconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * `YYYY-MM-DD` of the `APP_TIME_ZONE` calendar day containing `seconds`.
 *
 * Built from `formatToParts` rather than a formatted string so it cannot depend
 * on locale-specific ordering or separators.
 */
export function localDateKey(seconds: number): string {
  const parts = localDateFormatter.formatToParts(fromUnixSeconds(seconds));
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  const year = read('year');
  const month = String(read('month')).padStart(2, '0');
  const day = String(read('day')).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The day label for the `APP_TIME_ZONE` calendar day containing `seconds`. */
export function dayLabelFor(seconds: number): number {
  const [year, month, day] = localDateKey(seconds).split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}

/**
 * Today's day label, in `APP_TIME_ZONE`.
 *
 * The counterpart of the backend's `analytics.calendar.today_label`.
 */
export function startOfToday(now: number = Math.floor(Date.now() / 1000)): number {
  return dayLabelFor(now);
}

export function addUtcDays(seconds: number, days: number): number {
  return seconds + days * SECONDS_PER_DAY;
}

/**
 * 0 = Monday ... 6 = Sunday, matching the backend `Weekday` enum.
 *
 * Takes a day *label*, whose UTC date components are the local calendar date, so
 * the weekday is read in UTC on purpose.
 */
export function dayLabelWeekday(seconds: number): number {
  const day = new Date(seconds * 1000).getUTCDay();
  return day === 0 ? 6 : day - 1;
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
  return formatLongDate(startOfToday());
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
