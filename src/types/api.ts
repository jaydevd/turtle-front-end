/**
 * Types mirroring the Django REST API contract exactly.
 *
 * Notes on things that are easy to get wrong:
 * - All timestamps are Unix epoch **seconds**, not milliseconds or ISO strings.
 * - Enum members travel as uppercase values (`"FIXED"`), never their labels.
 * - `reminder` is a naive `"HH:MM:SS"` string with no timezone.
 * - Validation failures arrive as HTTP **411**, not 400.
 * - `DELETE` responds 204 with a completely empty body.
 */

export type DurationType = 'INDEFINITE' | 'FIXED';
export type FrequencyType = 'DAILY' | 'WEEKLY' | 'CUSTOM';
export type HabitStatus = 'ACTIVE' | 'COMPLETED' | 'PARTIAL' | 'MISSED' | 'SKIPPED';
export type UserRole = 'admin' | 'manager' | 'user';
/** Matches the backend `Weekday` enum: Monday = 0 ... Sunday = 6. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: UserRole;
  is_deleted: boolean;
  created_at: number;
}

export interface Tag {
  id: string;
  name: string;
  /** Non-deleted habits carrying this tag. Read-only. */
  habit_count: number;
}

export interface HabitSchedule {
  id: string;
  habit: string;
  frequency_type: FrequencyType;
  target_count: number;
  weekdays: Weekday[];
  scheduled_time: string | null;
  created_at: number;
  updated_at: number;
}

export interface Habit {
  id: string;
  user: string;
  name: string;
  goal: string | null;
  reminder: string | null;
  tag: string;
  /** Convenience projection of `tag` so cards need no second round trip. */
  tag_detail: Tag;
  start_date: number;
  end_date: number | null;
  duration_type: DurationType;
  status: HabitStatus;
  color: string | null;
  icon: string | null;
  schedule: HabitSchedule | null;
  created_at: number;
  updated_at: number;
}

export interface HabitLog {
  id: string;
  habit: string;
  /** UTC midnight, epoch seconds. */
  date: number;
  status: HabitStatus;
  completed_count: number;
  note: string;
  /** ISO-8601 datetime string, unlike every other timestamp here. */
  completed_at: string | null;
  created_at: number;
  updated_at: number;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Payload returned by `GET /api/user/habits/stats/`. */
export interface HabitStat {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  tag: string;
  status: HabitStatus;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  completion_rate: number;
  scheduled_days: number;
  logged_days: number;
  due_today: boolean;
}

export interface HabitStatsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HabitStat[];
  window_days: number;
  today: number;
}

/** One row on the dashboard's "Today's habits" list. */
export interface DashboardHabit {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  reminder: string | null;
  status: HabitStatus;
  tag: string;
  tag_name: string;
  schedule: HabitSchedule | null;
  log: Pick<HabitLog, 'id' | 'date' | 'status' | 'completed_count' | 'note'> | null;
}

export interface DashboardTag {
  id: string;
  name: string;
  habit_count: number;
}

export interface DashboardResponse {
  today: number;
  habits: DashboardHabit[];
  tags: DashboardTag[];
}

export interface AuthPayload {
  tokens: { access: string; refresh: string };
  user: User;
}

/* ------------------------------------------------------------------ */
/* Write payloads                                                      */
/* ------------------------------------------------------------------ */

export interface ScheduleInput {
  frequency_type: FrequencyType;
  target_count: number;
  weekdays: Weekday[];
  scheduled_time?: string | null;
}

export interface HabitCreate {
  name: string;
  start_date: number;
  /** Required by the backend even though the serializer marks it optional. */
  tag: string;
  goal?: string | null;
  reminder?: string | null;
  end_date?: number | null;
  duration_type?: DurationType;
  status?: HabitStatus;
  color?: string | null;
  icon?: string | null;
  schedule?: ScheduleInput | null;
}

export type HabitUpdate = Partial<Omit<HabitCreate, 'tag'>> & { tag?: string };

/**
 * The normalised payload the habit form produces. It carries a resolved tag id
 * and a complete schedule, so it can be posted as a create or a partial update.
 */
export interface HabitDraft {
  name: string;
  goal: string | null;
  reminder: string | null;
  tag: string;
  start_date: number;
  end_date: number | null;
  duration_type: DurationType;
  status: HabitStatus;
  color: string | null;
  icon: string | null;
  schedule: ScheduleInput;
}

export interface TagCreate {
  name: string;
}

export interface HabitLogUpsert {
  habit: string;
  date: number;
  status: HabitStatus;
  completed_count?: number;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Envelopes                                                           */
/* ------------------------------------------------------------------ */

export interface ApiSuccess<T> {
  status: number | string;
  message: string;
  data: T;
}

export interface ApiFailure {
  status: number;
  message: string;
  data: Record<string, never>;
  errors: Record<string, string | string[]>;
}

/** DRF's non-enveloped 401/403 shape. */
export interface DetailError {
  detail: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface LogQuery extends PaginationParams {
  habit?: string;
  start?: number;
  end?: number;
}
