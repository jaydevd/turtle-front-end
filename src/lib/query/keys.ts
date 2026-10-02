import type { ChallengeStatus, HabitStat, JoinRequestScope } from '@/types/api';

export const queryKeys = {
  habits: ['habits'] as const,
  habit: (id: string) => ['habits', 'detail', id] as const,
  tags: ['tags'] as const,
  stats: ['habits', 'stats'] as const,
  /** Prefix shared by every per-habit log query, for broad invalidation. */
  allLogs: ['habits', 'logs'] as const,
  logs: (habitId: string) => ['habits', 'logs', habitId] as const,
  dashboard: ['habits', 'dashboard'] as const,
  profile: ['profile'] as const,
};

/** Merges server stats onto a habit list so cards can render without N calls. */
export type StatsByHabitId = Record<string, HabitStat>;

export function indexStats(stats: HabitStat[] | undefined): StatsByHabitId {
  const index: StatsByHabitId = {};
  for (const stat of stats ?? []) {
    index[stat.id] = stat;
  }
  return index;
}

export const insightsKeys = {
  all: ['insights'] as const,
  overview: (window?: number) => ['insights', 'overview', window ?? 'default'] as const,
  patterns: (params?: { window?: number; habitId?: string }) => ['insights', 'patterns', params?.window ?? 'default', params?.habitId ?? 'all'] as const,
  trend: (params?: { window?: number; granularity?: 'day' | 'week' }) => ['insights', 'trend', params?.window ?? 'default', params?.granularity ?? 'day'] as const,
  risk: (window?: number) => ['insights', 'risk', window ?? 'default'] as const,
  detail: (habitId: string, window?: number) => ['insights', 'detail', habitId, window ?? 'default'] as const,
};

export const groupKeys = {
  /** Prefix for every group query, so a membership change can invalidate broadly. */
  all: ['groups'] as const,
  list: ['groups', 'list'] as const,
  detail: (id: string) => ['groups', 'detail', id] as const,
  members: (id: string) => ['groups', 'members', id] as const,
  joinRequests: (id: string, scope?: JoinRequestScope) =>
    ['groups', 'join-requests', id, scope ?? 'all'] as const,
  /** `mine` is the caller's inbox, so it sits in the same branch but never collides. */
  myInvitations: ['groups', 'invitations', 'mine'] as const,
  invitations: (id: string) => ['groups', 'invitations', id] as const,
  /**
   * Parent of every challenge-list query for one group, whatever the status
   * filter. Invalidation needs this prefix: `challenges(id)` resolves to the
   * concrete `all` key and would not touch the filtered boards.
   */
  challengeBoard: (id: string) => ['groups', 'challenges', id] as const,
  challenges: (id: string, status?: ChallengeStatus) =>
    ['groups', 'challenges', id, status ?? 'all'] as const,
  /**
   * Challenge lifecycle reads are habit-scoped on the backend, so they are keyed
   * by challenge id alone rather than under a group.
   */
  challenge: (challengeId: string) => ['groups', 'challenge', challengeId] as const,
  challengeSubscribers: (challengeId: string) =>
    ['groups', 'challenge-subscribers', challengeId] as const,
  challengeProgress: (challengeId: string) => ['groups', 'challenge-progress', challengeId] as const,
};
