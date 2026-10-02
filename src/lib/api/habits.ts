import { api } from './client';
import type {
  ChallengeProgress,
  ChallengeSubscription,
  DashboardResponse,
  Habit,
  HabitCreate,
  HabitLog,
  HabitLogUpsert,
  HabitStat,
  HabitStatsResponse,
  HabitUpdate,
  LogQuery,
  Page,
  ScheduleInput,
} from '@/types/api';

/** The backend caps `limit` at 100 and offers no server-side filtering, so the
 *  list screens pull the full working set and filter and sort on the client. */
export const MAX_PAGE_SIZE = 100;
export const WORKING_SET_SIZE = MAX_PAGE_SIZE;

export const habitsApi = {
  list(signal?: AbortSignal): Promise<Page<Habit>> {
    return api.get<Page<Habit>>('/user/habits/', { limit: WORKING_SET_SIZE }, signal);
  },

  get(id: string, signal?: AbortSignal): Promise<Habit> {
    return api.get<Habit>(`/user/habits/${id}/`, undefined, signal);
  },

  create(input: HabitCreate): Promise<Habit> {
    return api.post<Habit>('/user/habits/', input);
  },

  /** PATCH is used for edits; PUT would require resending name and start_date. */
  update(id: string, input: HabitUpdate): Promise<Habit> {
    return api.patch<Habit>(`/user/habits/${id}/`, input);
  },

  /** Soft delete: the row is retained and flagged, and there is no undo. */
  remove(id: string): Promise<void> {
    return api.delete<void>(`/user/habits/${id}/`);
  },

  stats(signal?: AbortSignal): Promise<HabitStatsResponse> {
    return api.get<HabitStatsResponse>('/user/habits/stats/', undefined, signal);
  },

  getSchedule(id: string, signal?: AbortSignal): Promise<ScheduleInput | null> {
    return api.get<ScheduleInput | null>(`/user/habits/${id}/schedule/`, undefined, signal);
  },

  saveSchedule(id: string, input: ScheduleInput): Promise<ScheduleInput> {
    return api.put<ScheduleInput>(`/user/habits/${id}/schedule/`, input);
  },

  /** Single request backing the whole dashboard: today's habits, tags, totals. */
  dashboard(signal?: AbortSignal): Promise<DashboardResponse> {
    return api.get<DashboardResponse>('/user/habits/dashboard/', undefined, signal);
  },

  /* ---- Group challenge lifecycle ----
   *
   * These hang off the habit rather than off the group because a participant logs
   * against their own copy of the challenge, not the template. The view routes
   * both spellings back to the same challenge, so a copy's id works here too. */

  /** Joins a challenge and hands the caller their own copy to log against. */
  subscribeToChallenge(challengeId: string): Promise<ChallengeSubscription> {
    return api.post<ChallengeSubscription>(`/user/habits/${challengeId}/subscribe/`);
  },

  /** Leaves a challenge and discards the caller's copy of it. */
  unsubscribeFromChallenge(challengeId: string): Promise<void> {
    return api.delete<void>(`/user/habits/${challengeId}/subscribe/`);
  },

  /** Everyone taking part, whether or not they are still logging. */
  challengeSubscribers(challengeId: string, signal?: AbortSignal): Promise<Page<ChallengeSubscription>> {
    return api.get<Page<ChallengeSubscription>>(
      `/user/habits/${challengeId}/subscribers/`,
      { limit: MAX_PAGE_SIZE },
      signal,
    );
  },

  /** The full leaderboard, with scoring evidence. Readable without subscribing. */
  challengeProgress(challengeId: string, signal?: AbortSignal): Promise<ChallengeProgress> {
    return api.get<ChallengeProgress>(`/user/habits/${challengeId}/progress/`, undefined, signal);
  },

  /** DRAFT to ACTIVE, by the author or a group admin. Manual on purpose. */
  startChallenge(challengeId: string): Promise<Habit> {
    return api.post<Habit>(`/user/habits/${challengeId}/start-challenge/`);
  },

  /** Closes a challenge early and announces its winner. */
  endChallenge(challengeId: string): Promise<Habit> {
    return api.post<Habit>(`/user/habits/${challengeId}/end-challenge/`);
  },

  /** Shuts a challenge down without a winner. */
  cancelChallenge(challengeId: string): Promise<Habit> {
    return api.post<Habit>(`/user/habits/${challengeId}/cancel-challenge/`);
  },
};

export const logsApi = {
  list(query: LogQuery = {}, signal?: AbortSignal): Promise<Page<HabitLog>> {
    return api.get<Page<HabitLog>>(
      '/user/habits/logs/',
      {
        habit: query.habit,
        start: query.start,
        end: query.end,
        page: query.page,
        limit: query.limit ?? MAX_PAGE_SIZE,
      },
      signal,
    );
  },

  /** Upserts on the (habit, date) unique constraint, so repeat taps are safe. */
  upsert(input: HabitLogUpsert): Promise<HabitLog> {
    return api.post<HabitLog>('/user/habits/logs/', input);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`/user/habits/logs/${id}/`);
  },
};

export type { Habit, HabitLog, HabitStat };



