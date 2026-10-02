/**
 * Schedule phrasing and due-day logic.
 *
 * `HabitSchedule.frequency_type` is one of DAILY / WEEKLY / CUSTOM. WEEKLY
 * schedules mean "hit `target_count` on any days this week" rather than "on
 * specific days", so a day can never be individually "not scheduled" — the
 * backend's `is_due_on` treats those as due. CUSTOM carries an explicit list of
 * `Weekday` integers (Monday = 0), matching the backend enum.
 */

import { formatClock, dayLabelWeekday } from '@/lib/date';
import { weekdayLabels, weekdayLongLabels } from '@/theme/tokens';
import type { FrequencyType, HabitSchedule, Weekday } from '@/types/api';

export const frequencyLabels: Record<FrequencyType, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  CUSTOM: 'Custom days',
};

/** Short phrases for the schedule-frequency segmented control. */
export const frequencyOptions: Array<{ value: FrequencyType; label: string }> = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'CUSTOM', label: 'Custom' },
];

const WEEKDAYS_IN_ORDER = '0,1,2,3,4';
const WEEKEND_ORDER = '5,6';

/** "Mon, Wed, Fri" / "Weekdays" / "Weekends" / "Every day". */
export function describeWeekdays(weekdays: Weekday[] | null | undefined): string {
  const days = [...new Set(weekdays ?? [])].sort((a, b) => a - b);
  if (days.length === 0) return '';
  if (days.length === 7) return 'Every day';
  if (days.join(',') === WEEKDAYS_IN_ORDER) return 'Weekdays';
  if (days.join(',') === WEEKEND_ORDER) return 'Weekends';
  return days.map((day) => weekdayLabels[day]).join(', ');
}

/** One human sentence for a schedule row or card subtitle. */
export function describeSchedule(schedule: HabitSchedule | null | undefined): string {
  if (!schedule) return 'No schedule set';

  const time = schedule.scheduled_time ? ` at ${formatClock(schedule.scheduled_time)}` : '';
  switch (schedule.frequency_type) {
    case 'DAILY':
      return schedule.target_count > 1
        ? `${schedule.target_count}× a day${time}`
        : `Every day${time}`;
    case 'WEEKLY':
      return `${schedule.target_count}× a week${time}`;
    case 'CUSTOM': {
      const days = describeWeekdays(schedule.weekdays);
      return days ? `${days}${time}` : `Custom days${time}`;
    }
    default:
      return 'No schedule set';
  }
}

/** Long-form weekday list for the detail screen. */
export function describeWeekdaysLong(weekdays: Weekday[] | null | undefined): string {
  const days = [...new Set(weekdays ?? [])].sort((a, b) => a - b);
  return days.map((day) => weekdayLongLabels[day]).join(', ');
}

/**
 * Whether the habit is scheduled on a given UTC-midnight day. WEEKLY has no
 * fixed days (any day of the week counts towards its target), and no schedule
 * means the habit is always available.
 */
export function isScheduledOn(
  schedule: HabitSchedule | null | undefined,
  day: number,
): boolean {
  if (!schedule) return true;
  if (schedule.frequency_type === 'CUSTOM') {
    return (schedule.weekdays ?? []).includes(dayLabelWeekday(day) as Weekday);
  }
  return true;
}

/** How many repetitions one check-in satisfies on a daily-style schedule. */
export function dailyTarget(schedule: HabitSchedule | null | undefined): number {
  if (!schedule) return 1;
  return Math.max(1, schedule.target_count);
}
