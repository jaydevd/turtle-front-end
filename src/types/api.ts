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

/* Group enums travel lowercase, unlike the habit enums above. */
export type GroupRole = 'owner' | 'admin' | 'member';
export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';
/** Filter accepted by `GET /groups/<id>/join-requests/?scope=`. */
export type JoinRequestScope = 'incoming' | 'outgoing' | 'pending';

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
  /* Group challenge block. Read-only except `challenge_rules`, which the author
     may edit while the challenge is still a draft. A challenge is only ever
     created through `POST /groups/<id>/challenges/`, so `group` and
     `is_challenge` are never writable on the habit endpoints. */
  group: string | null;
  is_challenge: boolean;
  challenge_status: ChallengeStatus | null;
  challenge_rules: string[];
  /** The challenge a participant copy was built from; null on the template. */
  challenge_source: string | null;
  challenge_started_by: string | null;
  challenge_started_at: number | null;
  challenge_ended_at: number | null;
  /** First winner, kept for a single reference; ties are in `challenge_winners`. */
  challenge_winner: string | null;
  challenge_winners: string[];
  challenge_winner_score: ChallengeScore | null;
  participant_count: number;
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

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */

export interface Group {
  id: string;
  name: string;
  description: string;
  owner: string;
  owner_email: string;
  is_private: boolean;
  /** Master switch for join requests aimed at registered users. */
  join_requests_enabled: boolean;
  /** Whether members below the admin tier may initiate either invite channel. */
  members_can_invite: boolean;
  anyone_can_create_challenge: boolean;
  member_count: number;
  /** The caller's own tier, so the UI knows what to offer without a round trip. */
  my_role: GroupRole | null;
  created_at: number;
  updated_at: number;
}

export interface GroupMembership {
  id: string;
  group: string;
  user: string;
  user_email: string;
  role: GroupRole;
  joined_at: number;
  created_at: number;
  updated_at: number;
}

export interface GroupJoinRequest {
  id: string;
  group: string;
  group_name: string;
  /** Always the caller on create, and read-only on every read. */
  from_user: string;
  from_user_email: string;
  to_user: string;
  to_user_email: string;
  status: JoinRequestStatus;
  message: string;
  /** Null until the recipient answers. */
  responded_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface GroupInvitation {
  id: string;
  group: string;
  group_name: string;
  invited_by: string;
  invited_by_email: string;
  email: string;
  /** The `/invite?token=` link. Server-minted and read-only. */
  token: string;
  status: InvitationStatus;
  /** Epoch seconds, or null for an invitation that never expires. */
  expires_at: number | null;
  accepted_by: string | null;
  responded_at: number | null;
  created_at: number;
  updated_at: number;
}

/** Result of claiming an invitation: both halves of the join in one payload. */
export interface InvitationAcceptResult {
  invitation: GroupInvitation;
  membership: GroupMembership;
}

/* ------------------------------------------------------------------ */
/* Group challenges                                                    */
/* ------------------------------------------------------------------ */

/** One participant's row on a challenge leaderboard. */
export interface ChallengeParticipant {
  user_id: string;
  user_email: string;
  /** `below_minimum_engagement` members are shown but cannot win. */
  participation: 'eligible' | 'below_minimum_engagement';
  eligible: boolean;
  total: number;
  components: { discipline: number; consistency: number; adherence: number };
  engagement: { logged_days: number; scored_days: number; ratio: number };
  evidence: {
    completion_rate: number | null;
    best_streak: number;
    hit_days: number;
    partial_days: number;
    missed_days: number;
    skipped_days: number;
    lapse_count: number;
  };
}

/**
 * The snapshotted result of a completed challenge. `challenge_winner_score` on a
 * habit and the `challenge` block of the progress endpoint carry this shape; the
 * full leaderboard travels with the winner so a retuned score can never quietly
 * rewrite history.
 */
export interface ChallengeScore {
  scoring_version: string;
  weights: Record<string, number>;
  tie_policy: string;
  minimum_engagement_ratio: number;
  /** `strict_rate_proxy`: rules are free text, so this is a stand-in. */
  adherence_source: string;
  rules: string[];
  rules_count: number;
  winner_total: number | null;
  winners: ChallengeParticipant[];
  leaderboard: ChallengeParticipant[];
}

export interface ChallengeSubscription {
  id: string;
  challenge: string;
  challenge_name: string;
  user: string;
  user_email: string;
  /** The habit carrying this member's logs; the challenge itself for the author. */
  habit_id: string | null;
  subscribed_at: number;
}

export interface ChallengeProgress {
  challenge: {
    id: string;
    name: string;
    challenge_status: ChallengeStatus | null;
    challenge_rules: string[];
    challenge_winner: string | null;
    challenge_winners: string[];
    start_date: number;
    end_date: number | null;
    participant_count: number;
  };
  scoring_version: string;
  weights: Record<string, number>;
  minimum_engagement_ratio: number;
  results: ChallengeParticipant[];
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

export type HabitUpdate = Partial<Omit<HabitCreate, 'tag'>> & {
  tag?: string;
  /** Writable only while the habit is a DRAFT challenge. */
  challenge_rules?: string[];
};

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

/* Group write payloads. `owner`, `member_count` and `my_role` are derived
   server side, and the three policy flags default to permissive on create. */

export interface GroupCreate {
  name: string;
  description?: string;
  is_private?: boolean;
  join_requests_enabled?: boolean;
  members_can_invite?: boolean;
  anyone_can_create_challenge?: boolean;
}

export type GroupUpdate = Partial<GroupCreate>;

export interface JoinRequestCreate {
  /** The registered user being asked to join. Cannot be the caller. */
  to_user: string;
  message?: string;
}

export interface InvitationCreate {
  email: string;
  /** Epoch seconds. Omit to take the server's seven-day default. */
  expires_at?: number | null;
}

/**
 * A proposed challenge is a habit payload plus rules. `duration_type` is always
 * `FIXED` and `end_date` is required, because the winner is read off the last
 * day. `group` and `is_challenge` are set by the endpoint, never by the client.
 */
export interface ChallengeCreate extends HabitCreate {
  duration_type: 'FIXED';
  end_date: number;
  challenge_rules?: string[];
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

/* ------------------------------------------------------------------ */
/* Analytics / Insights                                               */
/* ------------------------------------------------------------------ */

export interface DayBucket {
  start: number;
  end: number;
  granularity?: 'day' | 'week';
  days?: number;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  skipped_days: number;
  completion_rate: number | null;
  weekday?: number;
}

/** Resolved outcome of one calendar day. Mirrors the backend `DayState`. */
export type DayState = 'HIT' | 'PARTIAL' | 'MISSED' | 'SKIPPED' | 'NOT_DUE';

export interface HeatmapCell {
  date: number;
  weekday: number;
  state: DayState;
  score: number | null;
  target: number;
  completed_count: number;
}

export interface WeekdayBucket {
  weekday: number;
  name: string;
  short_name?: string;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  skipped_days: number;
  completion_rate: number | null;
  miss_rate?: number | null;
  reliable?: boolean;
}

/**
 * The user-level weekday rollup omits the per-habit `skipped_days`, `miss_rate`
 * and `reliable` fields and instead lists which habits were due that weekday.
 */
export interface AggregateWeekdayBucket {
  weekday: number;
  name: string;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  habit_ids: string[];
  completion_rate: number | null;
}

export interface WeekdayExtremes {
  best_weekday: number | null;
  best_weekday_name?: string | null;
  best_weekday_rate?: number | null;
  worst_weekday: number | null;
  worst_weekday_name?: string | null;
  worst_weekday_rate?: number | null;
  weekday_spread?: number | null;
}

export interface HourBucket {
  hour: number;
  completions: number;
  share?: number | null;
}

export interface HourOfDayProfile {
  buckets: HourBucket[];
  sample_count: number;
  peak_hour: number | null;
  peak_share: number | null;
}

export interface Punctuality {
  available: boolean;
  reference_minutes: number | null;
  tolerance_minutes?: number;
  sample_count: number;
  on_time_count: number;
  on_time_rate: number | null;
  average_offset_minutes: number | null;
}

export interface MonthlyBucket {
  month: string;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  skipped_days: number;
  completion_rate: number | null;
}

export interface PatternReport {
  weekday_profile: WeekdayBucket[];
  best_weekday: number | null;
  best_weekday_name?: string | null;
  best_weekday_rate?: number | null;
  worst_weekday: number | null;
  worst_weekday_name?: string | null;
  worst_weekday_rate?: number | null;
  weekday_spread?: number | null;
  hour_of_day: HourOfDayProfile;
  punctuality: Punctuality;
  monthly_profile: MonthlyBucket[];
}

export interface TrendReport {
  granularity: 'day' | 'week';
  score_unit?: string;
  daily: DayBucket[];
  weekly: DayBucket[];
  heatmap: HeatmapCell[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskProbability {
  habit_id: string;
  habit_name: string;
  /** 0-1. Null when there is too little history to score the habit. */
  probability: number | null;
  components: { overall: number; recency: number };
  weights: { overall: number; recency: number };
  samples: { overall: number; weekday: number };
  sufficient_data: boolean;
  risk: RiskLevel;
}

export interface StreakAtRisk {
  habit_id: string;
  habit_name: string;
  current_streak: number;
  current_streak_start: number | null;
  seconds_remaining_in_day: number | null;
}

export interface DecayingHabit {
  habit_id: string;
  habit_name: string;
  completion_rate: number | null;
  previous_completion_rate: number | null;
  rate_delta: number | null;
  trend: string;
  window_days: number;
}

export interface StrugglingHabit {
  habit_id: string;
  habit_name: string;
  completion_rate: number | null;
  scored_days: number;
  missed_periods: number;
  lapse_count: number;
  longest_lapse: number;
  daily_target: number;
  next_milestone: Milestone | null;
}

export interface LoadProjection {
  outstanding_count: number;
  outstanding_habit_ids: string[];
  typical_completions_same_weekday: number | null;
  sample_occurrences: number;
  overload_ratio: number | null;
  overloaded: boolean;
  risk: RiskLevel;
}

export interface RiskSummary {
  streaks_at_risk: number;
  high_risk_habits: number;
  decaying_habits: number;
  struggling_habits: number;
  overloaded: boolean;
}

export interface RiskReport {
  streaks_at_risk: StreakAtRisk[];
  completion_probabilities: RiskProbability[];
  decaying_habits: DecayingHabit[];
  struggling_habits: StrugglingHabit[];
  load_projection: LoadProjection;
}

export interface HabitOverviewRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  completion_rate: number | null;
  current_streak: number;
  best_streak: number;
  consistency_score: number | null;
  trend: string;
  rate_delta: number | null;
}

export interface TagProfileRow {
  tag_id: string;
  tag_name: string;
  habit_ids: string[];
  habit_count: number;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  skipped_days: number;
  completion_rate: number | null;
}

export interface Milestone {
  threshold: number;
  completed: number;
  remaining: number;
  progress: number;
}

/**
 * The user-level `combined` series is not a `DayBucket`. At day granularity it
 * is one point per calendar day keyed by `date`, and the counts are suffixed
 * with `_count` because they aggregate across habits. At week granularity the
 * backend rolls those rows up into start/end ranges instead, so the two
 * granularities do not share a shape.
 */
export interface CombinedDayPoint {
  date: string;
  weekday: number;
  due_count: number;
  hit_count: number;
  partial_count: number;
  missed_count: number;
  /** 0-1 share of the day's due habits that were completed. */
  score: number | null;
  perfect: boolean;
  habit_ids: string[];
}

export interface CombinedWeekPoint {
  start: number;
  end: number;
  granularity: 'week';
  days: number;
  due_count: number;
  hit_count: number;
  partial_count: number;
  missed_count: number;
  perfect_days: number;
  score: number | null;
}

export interface OverviewResponse {
  today: number;
  window_days: number;
  window_start: number;
  previous_window_start: number | null;
  timezone: string;
  completion_rate: number | null;
  strict_rate: number | null;
  previous_completion_rate: number | null;
  rate_delta: number | null;
  due_days: number;
  hit_days: number;
  partial_days: number;
  missed_days: number;
  skipped_days: number;
  consistency_score: number | null;
  consistency_components?: {
    adherence: number;
    regularity: number;
    persistence: number;
    recency: number;
  };
  active_day_streak: number;
  best_active_day_streak: number;
  perfect_day_streak: number;
  best_perfect_day_streak: number;
  days_considered?: number;
  active_days: number;
  perfect_days: number;
  zero_days: number;
  weekday_profile: AggregateWeekdayBucket[];
  tag_profile: TagProfileRow[];
  habit_count: number;
  top_habits: HabitOverviewRow[];
  bottom_habits: HabitOverviewRow[];
  scoring_weights?: Record<string, number>;
  scoring_version?: string;
  next_milestone?: Milestone | null;
}

export interface PatternsHabitReport {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  weekday_profile: WeekdayBucket[];
  best_weekday: number | null;
  best_weekday_name?: string | null;
  best_weekday_rate?: number | null;
  worst_weekday: number | null;
  worst_weekday_name?: string | null;
  worst_weekday_rate?: number | null;
  weekday_spread?: number | null;
  hour_of_day: HourOfDayProfile;
  punctuality: Punctuality;
  monthly_profile: MonthlyBucket[];
}

export interface PatternsResponse {
  today: number;
  window_days: number;
  timezone: string;
  weekday_profile: AggregateWeekdayBucket[];
  tag_profile: TagProfileRow[];
  habits: PatternsHabitReport[];
}

export interface TrendHabitReport extends TrendReport {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface TrendResponse {
  today: number;
  window_days: number;
  window_start: number;
  granularity: 'day' | 'week';
  timezone: string;
  combined: Array<CombinedDayPoint | CombinedWeekPoint>;
  habits: TrendHabitReport[];
}

export interface RiskResponse extends RiskReport {
  today: number;
  window_days: number;
  timezone: string;
  summary: RiskSummary;
}

export interface HabitDetailInsightsResponse {
  habit: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    tag: string;
    tag_name: string;
    status: HabitStatus;
    goal: string | null;
    duration_type: DurationType;
    start_date: number;
    end_date: number | null;
    reminder: string | null;
  };
  schedule: HabitSchedule | null;
  today: number;
  window_days: number;
  window_start: number;
  history_days: number;
  timezone: string;
  metrics: Omit<HabitStat, 'id' | 'name' | 'color' | 'icon' | 'tag' | 'status' | 'total_completions' | 'scheduled_days' | 'logged_days' | 'due_today'> & {
    consistency_score: number | null;
    completion_rate: number | null;
    strict_rate?: number;
    target_adherence?: number;
    hit_periods?: number;
    partial_periods?: number;
    missed_periods?: number;
    skipped_periods?: number;
    not_due_periods?: number;
    pending_periods?: number;
    scored_periods?: number;
    history_periods?: number;
    current_streak_start?: number | null;
    best_streak_start?: number | null;
    best_streak_end?: number | null;
    partial_in_current_streak?: number;
    volatility?: {
      rate_stddev: number;
      rate_range: number;
      max_gap_days: number;
      samples: number;
    };
    days_since_last_hit?: number | null;
    last_hit_date?: number | null;
    consistency_components?: {
      adherence: number;
      regularity: number;
      persistence: number;
      recency: number;
    };
    scoring_version?: string;
    lapse_count?: number;
    longest_lapse?: number;
    previous_completion_rate?: number | null;
    next_milestone?: Milestone | null;
  };
  patterns: PatternReport;
  trends: TrendReport;
  risk: {
    /** A full probability breakdown, not a bare number. */
    completion_probability_today: RiskProbability | null;
    is_streak_at_risk: boolean;
    seconds_remaining_in_day: number | null;
  };
}
