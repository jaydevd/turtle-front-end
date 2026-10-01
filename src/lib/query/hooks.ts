'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { habitsApi, logsApi } from '@/lib/api/habits';
import { tagsApi } from '@/lib/api/tags';
import { profileApi, type UpdateProfileInput } from '@/lib/api/profile';
import { indexStats, queryKeys, type StatsByHabitId } from '@/lib/query/keys';
import type {
  DashboardResponse,
  Habit,
  HabitCreate,
  HabitLog,
  HabitLogUpsert,
  HabitStatsResponse,
  HabitUpdate,
  Page,
  ScheduleInput,
  Tag,
  User,
} from '@/types/api';

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function useHabits(): UseQueryResult<Page<Habit>> {
  return useQuery({
    queryKey: queryKeys.habits,
    queryFn: ({ signal }) => habitsApi.list(signal),
  });
}

export function useHabit(id: string | undefined): UseQueryResult<Habit> {
  return useQuery({
    queryKey: queryKeys.habit(id ?? ''),
    queryFn: ({ signal }) => habitsApi.get(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useStats(): UseQueryResult<HabitStatsResponse> {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => habitsApi.stats(signal),
  });
}

/** Stats indexed by habit id, for the list and grid screens. */
export function useStatsByHabitId(): StatsByHabitId {
  return indexStats(useStats().data?.results);
}

export function useTags(): UseQueryResult<Page<Tag>> {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async ({ signal }) => {
      const { results } = await tagsApi.list(signal);
      return { count: results.length, next: null, previous: null, results };
    },
  });
}

export function useDashboard(): UseQueryResult<DashboardResponse> {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => habitsApi.dashboard(signal),
  });
}

export function useHabitLogs(
  habitId: string | undefined,
  start?: number,
  end?: number,
): UseQueryResult<Page<HabitLog>> {
  return useQuery({
    queryKey: [...queryKeys.logs(habitId ?? ''), start, end],
    queryFn: ({ signal }) => logsApi.list({ habit: habitId, start, end }, signal),
    enabled: Boolean(habitId),
  });
}

export function useProfile(): UseQueryResult<User> {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => profileApi.getProfile(signal as AbortSignal | undefined),
  });
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Anything that can change a habit's completion state can change a streak, a
 * completion rate or the dashboard's "due today" list, so all four caches are
 * invalidated together.
 */
function useInvalidateHabitViews() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabitViews();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HabitCreate) => habitsApi.create(input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useUpdateHabit() {
  const invalidate = useInvalidateHabitViews();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: HabitUpdate }) =>
      habitsApi.update(id, input),
    onSuccess: (habit) => {
      invalidate();
      void queryClient.setQueryData(queryKeys.habit(habit.id), habit);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabitViews();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => habitsApi.remove(id),
    onSuccess: (_result, id) => {
      invalidate();
      queryClient.removeQueries({ queryKey: queryKeys.habit(id) });
      queryClient.removeQueries({ queryKey: queryKeys.logs(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateHabitViews();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScheduleInput }) =>
      habitsApi.saveSchedule(id, input),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.habit(variables.id) });
      invalidate();
    },
  });
}

export function useUpsertLog() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateHabitViews();

  return useMutation({
    mutationFn: (input: HabitLogUpsert) => logsApi.upsert(input),
    onSuccess: (log) => {
      // Logs are read per habit, so a refetch is enough; no list mutation needed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.logs(log.habit) });
      invalidate();
    },
  });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateHabitViews();

  return useMutation({
    mutationFn: (id: string) => logsApi.remove(id),
    onSuccess: () => {
      // The DELETE response is empty, so the habit id is unknown; invalidate
      // every log query rather than guessing which day row changed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.allLogs });
      invalidate();
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => tagsApi.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    },
  });
}

export function useRenameTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.profile, user);
    },
  });
}
