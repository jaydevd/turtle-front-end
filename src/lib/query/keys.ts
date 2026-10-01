import type { HabitStat } from '@/types/api';

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
