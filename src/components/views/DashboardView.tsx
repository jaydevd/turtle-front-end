'use client';

import { HabitRow } from '@/components/habits/HabitCard';
import { TagChip } from '@/components/ui/pills';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Section, StatTile, StatTileSkeleton, Surface } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { formatLongDate, formatPlural } from '@/lib/date';
import { useDashboard, useStats } from '@/lib/query/hooks';
import { indexStats } from '@/lib/query/keys';
import { radii } from '@/theme/tokens';
import { tabularNums } from '@/theme/typography';
import { useAppScheme } from '@/theme/useAppScheme';
import AddRounded from '@mui/icons-material/AddRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import {
    Box,
    Button,
    Stack,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const ALL_TAGS = '__all__';

export function DashboardView() {
  const dashboard = useDashboard();
  const stats = useStats();
  const { colors } = useAppScheme();
  const [tagFilter, setTagFilter] = useState<string>(ALL_TAGS);

  const statsById = useMemo(() => indexStats(stats.data?.results), [stats.data]);
  const tagsWithHabits = (dashboard.data?.tags ?? []).filter((tag) => tag.habit_count > 0);

  const habits = useMemo(() => {
    const list = dashboard.data?.habits ?? [];
    if (tagFilter === ALL_TAGS) return list;
    return list.filter((habit) => habit.tag === tagFilter);
  }, [dashboard.data, tagFilter]);

  const dueHabits = habits.filter(
    (habit) => habit.status === 'ACTIVE' && (statsById[habit.id]?.due_today ?? true),
  );
  const otherHabits = habits.filter((habit) => !dueHabits.includes(habit));
  const completedToday = habits.filter((habit) => habit.log?.status === 'COMPLETED').length;
  const bestStreak = Math.max(0, ...(stats.data?.results ?? []).map((row) => row.current_streak));

  const momentum = useMemo(() => {
    const names = new Map((dashboard.data?.habits ?? []).map((habit) => [habit.id, habit]));
    return [...(stats.data?.results ?? [])]
      .filter((row) => row.current_streak > 0)
      .sort((a, b) => b.current_streak - a.current_streak)
      .slice(0, 5)
      .map((row) => ({ row, habit: names.get(row.id) }));
  }, [dashboard.data, stats.data]);

  const loading = dashboard.isPending;

  return (
    <>
      <PageHeader
        eyebrow={dashboard.data ? formatLongDate(dashboard.data.today) : undefined}
        title="Today"
        description="Your habits for the day. One tap records a check-in — the streak maths lives on the server."
        actions={
          <Button component={Link} href="/habits/new" variant="contained" startIcon={<AddRounded />}>
            New habit
          </Button>
        }
      />

      {dashboard.isError ? (
        <ErrorState
          message={errorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            }}
          >
            {loading || stats.isPending ? (
              <>
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
              </>
            ) : (
              <>
                <StatTile
                  label="Active habits"
                  value={(dashboard.data?.habits ?? []).filter((habit) => habit.status === 'ACTIVE').length}
                  hint={formatPlural(dashboard.data?.habits.length ?? 0, 'habit')}
                  icon={AutoAwesomeRounded}
                />
                <StatTile
                  label="Due today"
                  value={dueHabits.length}
                  hint="Scheduled for today"
                  icon={EventAvailableRounded}
                  accent={colors.terracotta}
                />
                <StatTile
                  label="Done today"
                  value={completedToday}
                  hint={dueHabits.length ? `${dueHabits.length - completedToday} left` : 'Nothing scheduled'}
                  icon={TaskAltRounded}
                />
                <StatTile
                  label="Best streak"
                  value={bestStreak}
                  hint="Days in a row"
                  icon={LocalFireDepartmentRounded}
                />
              </>
            )}
          </Box>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Section
                title="Today's habits"
                description="Check off what you have done. Tap the arrow for partial, missed or a note."
                action={
                  <Button component={Link} href="/habits" size="small" color="inherit">
                    All habits
                  </Button>
                }
              >
                {tagsWithHabits.length ? (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ mb: 2, flexWrap: 'wrap', rowGap: 0.75 }}
                  >
                    <TagChip
                      name="All"
                      active={tagFilter === ALL_TAGS}
                      onClick={() => setTagFilter(ALL_TAGS)}
                    />
                    {tagsWithHabits.map((tag) => (
                      <TagChip
                        key={tag.id}
                        name={tag.name}
                        count={tag.habit_count}
                        active={tagFilter === tag.id}
                        onClick={() => setTagFilter(tag.id)}
                      />
                    ))}
                  </Stack>
                ) : null}

                {loading ? (
                  <ListSkeleton rows={4} />
                ) : dueHabits.length === 0 ? (
                  <EmptyState
                    compact
                    icon={TaskAltRounded}
                    title={tagFilter === ALL_TAGS ? 'Nothing due today' : 'Nothing due in this tag'}
                    description="Enjoy the breather, or add a habit to keep building momentum."
                    action={
                      <Button component={Link} href="/habits/new" variant="outlined" startIcon={<AddRounded />}>
                        New habit
                      </Button>
                    }
                  />
                ) : (
                  <Box>
                    {dueHabits.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        stat={statsById[habit.id]}
                        todayLog={habit.log}
                      />
                    ))}
                  </Box>
                )}

                {!loading && otherHabits.length > 0 ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="overline" sx={{ color: colors.inkSoft }}>
                      Not due today
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {otherHabits.map((habit) => (
                        <HabitRow
                          key={habit.id}
                          habit={habit}
                          stat={statsById[habit.id]}
                          todayLog={habit.log}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : null}
              </Section>
            </Box>

            <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
              <Stack spacing={3}>
                <Section title="Momentum" description="Longest running streaks right now.">
                  {stats.isPending ? (
                    <ListSkeleton rows={3} />
                  ) : momentum.length === 0 ? (
                    <EmptyState
                      compact
                      icon={LocalFireDepartmentRounded}
                      title="No streaks yet"
                      description="Complete a scheduled day to start a streak."
                    />
                  ) : (
                    <Stack spacing={1.5}>
                      {momentum.map((entry) => (
                        <Stack key={entry.row.id} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: `${radii.pill}px`,
                              display: 'grid',
                              placeItems: 'center',
                              backgroundColor: colors.terracottaWash,
                              color: colors.terracotta,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              ...tabularNums,
                            }}
                          >
                            {entry.row.current_streak}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              component={Link}
                              href={`/habits/${entry.row.id}`}
                              variant="body2"
                              noWrap
                              sx={{ fontWeight: 600, display: 'block', '&:hover': { color: 'primary.dark' } }}
                            >
                              {entry.habit?.name ?? entry.row.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                              {Math.round(entry.row.completion_rate)}% over 30 days
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Section>

                <Surface>
                  <Typography variant="h5">Keep it small</Typography>
                  <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.75 }}>
                    A streak only counts days a habit is scheduled, so a rest day never breaks your
                    run. Missed a day? Mark it and move on.
                  </Typography>
                </Surface>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      )}
    </>
  );
}
