'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import type { CheckInLog } from '@/components/habits/CheckInControl';
import { HabitCard } from '@/components/habits/HabitCard';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { SegmentedControl } from '@/components/ui/inputs';
import { TagChip } from '@/components/ui/pills';
import {
    EmptyState,
    ErrorState,
    HabitCardSkeleton,
    PageHeader,
} from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { useDashboard, useDeleteHabit, useHabits, useStats, useTags } from '@/lib/query/hooks';
import { indexStats } from '@/lib/query/keys';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Habit } from '@/types/api';
import AddRounded from '@mui/icons-material/AddRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import {
    Box,
    Button,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const ALL_TAGS = '__all__';

type SortKey = 'recent' | 'name' | 'streak';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'name', label: 'A–Z' },
  { value: 'streak', label: 'Streak' },
];

export function HabitsView() {
  const habitsQuery = useHabits();
  const stats = useStats();
  const tags = useTags();
  const dashboard = useDashboard();
  const removeHabit = useDeleteHabit();
  const { toast } = useToast();
  const { colors } = useAppScheme();

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>(ALL_TAGS);
  const [sort, setSort] = useState<SortKey>('recent');
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  const statsById = useMemo(() => indexStats(stats.data?.results), [stats.data]);
  const todayLogs = useMemo(() => {
    const map = new Map<string, CheckInLog | null>();
    for (const habit of dashboard.data?.habits ?? []) {
      map.set(habit.id, habit.log);
    }
    return map;
  }, [dashboard.data]);

  const habits = useMemo(() => habitsQuery.data?.results ?? [], [habitsQuery.data?.results]);
  const tagsWithHabits = useMemo(
    () => (tags.data?.results ?? []).filter((tag) => tag.habit_count > 0),
    [tags.data?.results],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = habits.filter((habit) => {
      if (tagFilter !== ALL_TAGS && habit.tag !== tagFilter) return false;
      if (!query) return true;
      return (
        habit.name.toLowerCase().includes(query) ||
        (habit.goal ?? '').toLowerCase().includes(query) ||
        (habit.tag_detail?.name ?? '').toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'streak') {
      sorted.sort(
        (a, b) => (statsById[b.id]?.current_streak ?? 0) - (statsById[a.id]?.current_streak ?? 0),
      );
    } else {
      sorted.sort((a, b) => b.created_at - a.created_at);
    }
    return sorted;
  }, [habits, search, tagFilter, sort, statsById]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await removeHabit.mutateAsync(pendingDelete.id);
      toast({ tone: 'success', message: `“${pendingDelete.name}” was deleted.` });
      setPendingDelete(null);
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not delete the habit.') });
    }
  }

  const loading = habitsQuery.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Habits"
        description="Everything you are tracking, with the last 30 days of momentum."
        actions={
          <Button component={Link} href="/habits/new" variant="contained" startIcon={<AddRounded />}>
            New habit
          </Button>
        }
      />

      {habitsQuery.isError ? (
        <ErrorState message={errorMessage(habitsQuery.error)} onRetry={() => void habitsQuery.refetch()} />
      ) : (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search habits, goals or tags"
              aria-label="Search habits"
              sx={{ maxWidth: { md: 320 }, flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                Sort
              </Typography>
              <SegmentedControl ariaLabel="Sort habits" value={sort} options={SORT_OPTIONS} onChange={setSort} />
            </Stack>
          </Stack>

          {tagsWithHabits.length ? (
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
              <TagChip name="All" active={tagFilter === ALL_TAGS} onClick={() => setTagFilter(ALL_TAGS)} />
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
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' } }}>
              <HabitCardSkeleton />
              <HabitCardSkeleton />
              <HabitCardSkeleton />
              <HabitCardSkeleton />
            </Box>
          ) : habits.length === 0 ? (
            <EmptyState
              icon={AutoAwesomeRounded}
              title="No habits yet"
              description="Pick one small thing to do every day. You can add a schedule, colour and icon in the next step."
              action={
                <Button component={Link} href="/habits/new" variant="contained" startIcon={<AddRounded />}>
                  Create your first habit
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No habits match"
              description="Try a different search term or clear the tag filter."
              action={
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearch('');
                    setTagFilter(ALL_TAGS);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' } }}>
              {visible.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  stat={statsById[habit.id]}
                  todayLog={todayLogs.get(habit.id) ?? null}
                  onTagClick={(id) => setTagFilter(id)}
                  onDelete={() => setPendingDelete(habit)}
                />
              ))}
            </Box>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this habit?"
        message={
          <>
            <strong>{pendingDelete?.name}</strong> will be removed from every list. Its history is
            kept on the server but hidden, and this cannot be undone from the app.
          </>
        }
        confirmLabel="Delete habit"
        tone="danger"
        busy={removeHabit.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
