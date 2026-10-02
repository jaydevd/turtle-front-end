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
import { insightsApi } from '@/lib/api/insights';
import {
  challengesApi,
  groupsApi,
  invitationsApi,
  joinRequestsApi,
} from '@/lib/api/groups';
import {
  groupKeys,
  indexStats,
  insightsKeys,
  queryKeys,
  type StatsByHabitId,
} from '@/lib/query/keys';
import type {
  ChallengeCreate,
  ChallengeStatus,
  DashboardResponse,
  Group,
  GroupCreate,
  GroupRole,
  GroupUpdate,
  Habit,
  HabitCreate,
  HabitLog,
  HabitLogUpsert,
  HabitStatsResponse,
  HabitUpdate,
  InvitationCreate,
  JoinRequestCreate,
  JoinRequestScope,
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

/* ------------------------------------------------------------------ */
/* Insights / Analytics                                                */
/* ------------------------------------------------------------------ */

export function useInsightsOverview(windowDays?: number) {
  return useQuery({
    queryKey: insightsKeys.overview(windowDays),
    queryFn: ({ signal }) => insightsApi.overview({ window: windowDays }, signal),
  });
}

export function useInsightsPatterns(params?: { window?: number; habitId?: string }) {
  return useQuery({
    queryKey: insightsKeys.patterns(params),
    queryFn: ({ signal }) => insightsApi.patterns({ window: params?.window, habit_id: params?.habitId }, signal),
  });
}

export function useInsightsTrend(params?: { window?: number; granularity?: 'day' | 'week' }) {
  return useQuery({
    queryKey: insightsKeys.trend(params),
    queryFn: ({ signal }) => insightsApi.trend({ window: params?.window, granularity: params?.granularity }, signal),
  });
}

export function useInsightsRisk(windowDays?: number) {
  return useQuery({
    queryKey: insightsKeys.risk(windowDays),
    queryFn: ({ signal }) => insightsApi.risk({ window: windowDays }, signal),
  });
}

export function useHabitInsights(habitId: string | undefined, windowDays?: number) {
  return useQuery({
    queryKey: insightsKeys.detail(habitId ?? '', windowDays),
    queryFn: ({ signal }) => insightsApi.detail(habitId as string, { window: windowDays }, signal),
    enabled: Boolean(habitId),
  });
}

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */

export function useGroups(): UseQueryResult<Page<Group>> {
  return useQuery({
    queryKey: groupKeys.list,
    queryFn: ({ signal }) => groupsApi.list(signal),
  });
}

export function useGroup(groupId: string | undefined): UseQueryResult<Group> {
  return useQuery({
    queryKey: groupKeys.detail(groupId ?? ''),
    queryFn: ({ signal }) => groupsApi.get(groupId as string, signal),
    enabled: Boolean(groupId),
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.members(groupId ?? ''),
    queryFn: ({ signal }) => groupsApi.members(groupId as string, signal),
    enabled: Boolean(groupId),
  });
}

/**
 * The caller's requests for one group. `scope` is a server-side filter and the
 * admin/non-admin split happens there too, so the cache is keyed by the scope the
 * screen asked for rather than filtering a superset on the client.
 */
export function useJoinRequests(groupId: string | undefined, scope?: JoinRequestScope) {
  return useQuery({
    queryKey: groupKeys.joinRequests(groupId ?? '', scope),
    queryFn: ({ signal }) => joinRequestsApi.list(groupId as string, scope, signal),
    enabled: Boolean(groupId),
  });
}

export function useGroupInvitations(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.invitations(groupId ?? ''),
    queryFn: ({ signal }) => invitationsApi.list(groupId as string, signal),
    enabled: Boolean(groupId),
  });
}

/** The caller's own pending invitations, matched on their email. */
export function useMyInvitations() {
  return useQuery({
    queryKey: groupKeys.myInvitations,
    queryFn: ({ signal }) => invitationsApi.mine(signal),
  });
}

export function useGroupChallenges(groupId: string | undefined, status?: ChallengeStatus) {
  return useQuery({
    queryKey: groupKeys.challenges(groupId ?? '', status),
    queryFn: ({ signal }) => challengesApi.list(groupId as string, status, signal),
    enabled: Boolean(groupId),
  });
}

export function useChallenge(groupId: string | undefined, challengeId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.challenge(challengeId ?? ''),
    queryFn: ({ signal }) => challengesApi.get(groupId as string, challengeId as string, signal),
    enabled: Boolean(groupId && challengeId),
  });
}

export function useChallengeSubscribers(challengeId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.challengeSubscribers(challengeId ?? ''),
    queryFn: ({ signal }) => habitsApi.challengeSubscribers(challengeId as string, signal),
    enabled: Boolean(challengeId),
  });
}

/**
 * The leaderboard. Deliberately opt-in: the endpoint scores every subscriber over
 * the challenge window, so it is only fetched while a challenge is actually open
 * rather than with the group's list.
 */
export function useChallengeProgress(challengeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: groupKeys.challengeProgress(challengeId ?? ''),
    queryFn: ({ signal }) => habitsApi.challengeProgress(challengeId as string, signal),
    enabled: Boolean(challengeId) && enabled,
  });
}

/**
 * Group writes and challenge participation both move the caller's own habit
 * list: a challenge is a habit, and subscribing materialises a copy of it. So the
 * habit caches are invalidated alongside the group ones.
 */
function useInvalidateGroupViews() {
  const queryClient = useQueryClient();
  return (groupId?: string) => {
    void queryClient.invalidateQueries({ queryKey: groupKeys.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    if (groupId) {
      void queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
    }
  };
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupCreate) => groupsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GroupUpdate }) => groupsApi.update(id, input),
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
      void queryClient.setQueryData(groupKeys.detail(group.id), group);
    },
  });
}

/** Soft delete: the group leaves every reachable list and cannot be restored. */
export function useDeleteGroup() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: (id: string) => groupsApi.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useSetMemberRole() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, memberId, role }: { groupId: string; memberId: string; role: GroupRole }) =>
      groupsApi.setMemberRole(groupId, memberId, role),
    onSuccess: (_membership, variables) => invalidate(variables.groupId),
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      groupsApi.removeMember(groupId, memberId),
    onSuccess: (_result, variables) => invalidate(variables.groupId),
  });
}

export function useTransferOwnership() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.transferOwnership(groupId, userId),
    onSuccess: (_membership, variables) => invalidate(variables.groupId),
  });
}

export function useSendJoinRequest() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: JoinRequestCreate }) =>
      joinRequestsApi.create(groupId, input),
    onSuccess: (_request, variables) => invalidate(variables.groupId),
  });
}

export function useWithdrawJoinRequest() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, requestId }: { groupId: string; requestId: string }) =>
      joinRequestsApi.withdraw(groupId, requestId),
    onSuccess: (_result, variables) => invalidate(variables.groupId),
  });
}

/** Accepting or rejecting. Only the recipient may call either. */
export function useRespondToJoinRequest() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({
      groupId,
      requestId,
      action,
    }: {
      groupId: string;
      requestId: string;
      action: 'accept' | 'reject';
    }) =>
      action === 'accept'
        ? joinRequestsApi.accept(groupId, requestId)
        : joinRequestsApi.reject(groupId, requestId),
    onSuccess: (_request, variables) => invalidate(variables.groupId),
  });
}

export function useSendInvitation() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: InvitationCreate }) =>
      invitationsApi.create(groupId, input),
    onSuccess: (_invitation, variables) => invalidate(variables.groupId),
  });
}

export function useRevokeInvitation() {
  const invalidate = useInvalidateGroupViews();
  return useMutation({
    mutationFn: ({ groupId, invitationId }: { groupId: string; invitationId: string }) =>
      invitationsApi.revoke(groupId, invitationId),
    onSuccess: (_result, variables) => invalidate(variables.groupId),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => invitationsApi.accept(token),
    onSuccess: () => {
      // Claiming an invitation makes a group visible to the caller for the first
      // time, so the group list, detail and roster are all stale.
      void queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

/* ---- Challenges ---- */

/** Invalidates the group's challenge board plus the caller's own habit caches. */
function useInvalidateChallenge(groupId: string) {
  const queryClient = useQueryClient();
  return (challengeId?: string) => {
    // The board is keyed *by* status, so the shared parent is what has to be
    // invalidated. `groupKeys.challenges(groupId)` would resolve to the
    // `.../all` key alone and leave every status-filtered board stale.
    void queryClient.invalidateQueries({ queryKey: groupKeys.challengeBoard(groupId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.habits });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    if (challengeId) {
      void queryClient.invalidateQueries({ queryKey: groupKeys.challenge(challengeId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.challengeSubscribers(challengeId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.challengeProgress(challengeId) });
    }
  };
}

export function useCreateChallenge(groupId: string) {
  const invalidate = useInvalidateChallenge(groupId);
  return useMutation({
    mutationFn: (input: ChallengeCreate) => challengesApi.create(groupId, input),
    onSuccess: (challenge) => invalidate(challenge.id),
  });
}

export function useJoinChallenge(groupId: string) {
  const invalidate = useInvalidateChallenge(groupId);
  return useMutation({
    mutationFn: (challengeId: string) => habitsApi.subscribeToChallenge(challengeId),
    onSuccess: (_subscription, challengeId) => invalidate(challengeId),
  });
}

export function useLeaveChallenge(groupId: string) {
  const invalidate = useInvalidateChallenge(groupId);
  return useMutation({
    mutationFn: (challengeId: string) => habitsApi.unsubscribeFromChallenge(challengeId),
    onSuccess: (_result, challengeId) => invalidate(challengeId),
  });
}

/** Start, end and cancel. All three are author-or-group-admin server side. */
export function useChallengeLifecycle(groupId: string) {
  const invalidate = useInvalidateChallenge(groupId);
  return useMutation({
    mutationFn: ({ challengeId, action }: { challengeId: string; action: 'start' | 'end' | 'cancel' }) => {
      if (action === 'start') return habitsApi.startChallenge(challengeId);
      if (action === 'end') return habitsApi.endChallenge(challengeId);
      return habitsApi.cancelChallenge(challengeId);
    },
    onSuccess: (_challenge, variables) => invalidate(variables.challengeId),
  });
}

/**
 * Rules are editable only while the challenge is a draft, and only through the
 * habit endpoints - the group challenge routes are read-only. The author is the
 * habit's owner, so the ordinary detail route reaches it.
 */
export function useUpdateChallengeRules(groupId: string) {
  const invalidate = useInvalidateChallenge(groupId);
  return useMutation({
    mutationFn: ({ challengeId, rules }: { challengeId: string; rules: string[] }) =>
      habitsApi.update(challengeId, { challenge_rules: rules }),
    onSuccess: (_challenge, variables) => invalidate(variables.challengeId),
  });
}
