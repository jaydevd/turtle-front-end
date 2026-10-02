'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import {
  ErrorState,
  EmptyState,
  Section,
  StatTile,
  StatTileSkeleton,
  Surface,
  HabitIconTile,
  DetailRow,
} from '@/components/ui/surfaces';
import { StatusPill, TagChip } from '@/components/ui/pills';
import { Heatmap, HeatmapLegend } from '@/components/ui/Heatmap';
import { NumberStepper } from '@/components/ui/inputs';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { CheckInControl } from '@/components/habits/CheckInControl';
import { LogTimeline } from '@/components/habits/LogTimeline';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useDeleteHabit,
  useDeleteLog,
  useHabit,
  useHabitLogs,
  useStats,
  useUpsertLog,
} from '@/lib/query/hooks';
import { indexStats } from '@/lib/query/keys';
import { errorMessage } from '@/lib/api/client';
import {
  addUtcDays,
  formatClock,
  formatLongDate,
  formatShortDate,
  logsByUtcDay,
  startOfToday,
} from '@/lib/date';
import { dailyTarget, describeSchedule, describeWeekdaysLong } from '@/lib/schedule';
import { useAppScheme } from '@/theme/useAppScheme';
import type { HabitLog } from '@/types/api';

const HISTORY_DAYS = 84;
const HISTORY_WINDOW = HISTORY_DAYS - 1;

export function HabitDetailView({ habitId }: { habitId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { colors, accentFor } = useAppScheme();

  const habit = useHabit(habitId);
  const stats = useStats();
  const removeHabit = useDeleteHabit();
  const removeLog = useDeleteLog();
  const upsertLog = useUpsertLog();

  const today = startOfToday();
  const logsQuery = useHabitLogs(habitId, addUtcDays(today, -HISTORY_WINDOW), addUtcDays(today, 1));
  const logs = useMemo(() => logsQuery.data?.results ?? [], [logsQuery.data]);
  const logsByDay = useMemo(() => logsByUtcDay(logs), [logs]);
  const todayLog = logsByDay.get(today) ?? null;
  const stat = indexStats(stats.data?.results)[habitId];

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const data = habit.data;
  const accent = accentFor(data?.color);
  const target = dailyTarget(data?.schedule);
  const showCounter = data?.schedule?.frequency_type === 'DAILY' && target > 1;

  async function handleDeleteHabit() {
    try {
      await removeHabit.mutateAsync(habitId);
      toast({ tone: 'success', message: `“${data?.name ?? 'Habit'}” deleted.` });
      router.push('/habits');
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not delete the habit.') });
    }
  }

  async function handleDeleteLog(log: HabitLog) {
    setDeletingLogId(log.id);
    try {
      await removeLog.mutateAsync(log.id);
      toast({ tone: 'info', message: `Entry for ${formatShortDate(log.date)} removed.` });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not remove the entry.') });
    } finally {
      setDeletingLogId(null);
    }
  }

  async function setCompletedCount(next: number) {
    try {
      await upsertLog.mutateAsync({
        habit: habitId,
        date: today,
        status: next >= target ? 'COMPLETED' : 'PARTIAL',
        completed_count: next,
        note: todayLog?.note ?? '',
      });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not update the count.') });
    }
  }

  if (habit.isError) {
    return (
      <>
        <Button component={Link} href="/habits" color="inherit" size="small" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
          Back to habits
        </Button>
        <ErrorState message={errorMessage(habit.error)} onRetry={() => void habit.refetch()} />
      </>
    );
  }

  if (habit.isPending || !data) {
    return (
      <Stack sx={{ py: 10, alignItems: 'center' }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <>
      <Button
        component={Link}
        href="/habits"
        color="inherit"
        size="small"
        startIcon={<ArrowBackRounded />}
        sx={{ mb: 2 }}
      >
        Back to habits
      </Button>

      <Surface sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 2 }}>
          <HabitIconTile icon={data.icon} color={accent} size={52} />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="h1" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' } }}>
                {data.name}
              </Typography>
              <StatusPill status={data.status} size="medium" />
            </Stack>
            <Stack direction="row" spacing={1.25} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <TagChip name={data.tag_detail?.name ?? 'Untagged'} />
              <Typography variant="body2" sx={{ color: colors.inkSoft }}>
                {describeSchedule(data.schedule)}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button component={Link} href={`/habits/${habitId}/analysis`} variant="outlined" startIcon={<InsightsOutlined />}>
              Analysis
            </Button>
            <Button component={Link} href={`/habits/${habitId}/edit`} variant="outlined" startIcon={<EditOutlined />}>
              Edit
            </Button>
            <IconButton
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              aria-label="Habit actions"
              aria-haspopup="menu"
              sx={{ color: colors.inkSoft }}
            >
              <MoreVertRounded />
            </IconButton>
          </Stack>
        </Stack>
      </Surface>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          mb: 3,
        }}
      >
        {stats.isPending ? (
          <>
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </>
        ) : (
          <>
            <StatTile
              label="Current streak"
              value={stat?.current_streak ?? 0}
              hint="Scheduled days in a row"
              icon={LocalFireDepartmentRounded}
              accent={accent}
            />
            <StatTile label="Best streak" value={stat?.best_streak ?? 0} hint="All time" icon={EmojiEventsRounded} />
            <StatTile
              label="Completions"
              value={stat?.total_completions ?? 0}
              hint="All time"
              icon={TaskAltRounded}
            />
            <StatTile
              label="30-day rate"
              value={`${Math.round(stat?.completion_rate ?? 0)}%`}
              hint={`${stat?.scheduled_days ?? 0} scheduled days`}
              icon={InsightsOutlined}
            />
          </>
        )}
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Section
            title="Today"
            description={formatLongDate(today)}
            action={
              <CheckInControl
                habitId={habitId}
                log={todayLog}
                targetCount={target}
                accent={accent}
              />
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: colors.inkSoft }}>
                {stat?.due_today ? 'This habit is scheduled for today.' : 'Not scheduled today — logging is still welcome.'}
              </Typography>

              {showCounter ? (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Repetitions today · {todayLog?.completed_count ?? 0} of {target}
                  </Typography>
                  <NumberStepper
                    label="repetitions today"
                    value={todayLog?.completed_count ?? 0}
                    onChange={setCompletedCount}
                    min={0}
                    max={target}
                  />
                </Stack>
              ) : null}

              {todayLog?.note ? (
                <Surface sx={{ p: 1.75, backgroundColor: colors.paperRaised, boxShadow: 'none' }}>
                  <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                    Note
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
                    {todayLog.note}
                  </Typography>
                </Surface>
              ) : null}
            </Stack>
          </Section>

          <Section
            title={`Last ${HISTORY_DAYS / 7} weeks`}
            description="A cell per day. Dashed days have no entry."
          >
            {logsQuery.isPending ? (
              <CircularProgress size={22} />
            ) : (
              <Stack spacing={2}>
                <Heatmap logsByDate={logsByDay} days={HISTORY_DAYS} accent={accent} today={today} size={18} />
                <HeatmapLegend accent={accent} />
              </Stack>
            )}
          </Section>

          <Section title="History" description={`Entries from the last ${HISTORY_DAYS / 7} weeks.`}>
            {logsQuery.isPending ? (
              <CircularProgress size={22} />
            ) : logs.length === 0 ? (
              <EmptyState
                compact
                icon={HistoryRounded}
                title="No entries yet"
                description="Your first check-in will appear here."
              />
            ) : (
              <LogTimeline
                logs={logs}
                targetCount={showCounter ? target : 1}
                deletingId={deletingLogId}
                onDelete={handleDeleteLog}
              />
            )}
          </Section>
        </Stack>

        <Stack spacing={3} sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
          <Section title="Schedule">
            <DetailRow label="Frequency" value={describeSchedule(data.schedule)} />
            <Divider sx={{ my: 1.25 }} />
            <DetailRow
              label="Target"
              value={
                data.schedule?.frequency_type === 'WEEKLY'
                  ? `${data.schedule?.target_count ?? 1}× per week`
                  : `${target}${target === 1 ? ' time' : ' times'} per day`
              }
            />
            <Divider sx={{ my: 1.25 }} />
            <DetailRow
              label="Preferred time"
              value={data.schedule?.scheduled_time ? formatClock(data.schedule.scheduled_time) : 'Not set'}
            />
            {data.schedule?.frequency_type === 'CUSTOM' ? (
              <>
                <Divider sx={{ my: 1.25 }} />
                <DetailRow label="Days" value={describeWeekdaysLong(data.schedule.weekdays) || 'Not set'} />
              </>
            ) : null}
          </Section>

          <Section title="Details">
            <DetailRow label="Goal" value={data.goal?.trim() || 'No goal set'} />
            <Divider sx={{ my: 1.25 }} />
            <DetailRow
              label="Reminder"
              value={data.reminder ? formatClock(data.reminder) : 'None'}
            />
            <Divider sx={{ my: 1.25 }} />
            <DetailRow label="Starts" value={formatShortDate(data.start_date)} />
            {data.end_date ? (
              <>
                <Divider sx={{ my: 1.25 }} />
                <DetailRow label="Ends" value={formatShortDate(data.end_date)} />
              </>
            ) : null}
            <Divider sx={{ my: 1.25 }} />
            <DetailRow label="Duration" value={data.duration_type === 'FIXED' ? 'Fixed period' : 'Ongoing'} />
            <Divider sx={{ my: 1.25 }} />
            <DetailRow
              label="Logged"
              value={`${stat?.logged_days ?? 0} of ${stat?.scheduled_days ?? 0} days · 30d`}
            />
          </Section>
        </Stack>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setConfirmDelete(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlineRounded fontSize="small" sx={{ mr: 1.25 }} />
          Delete habit
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this habit?"
        message={
          <>
            <strong>{data.name}</strong> will be removed from every list. Its history is kept on the
            server but hidden, and this cannot be undone from the app.
          </>
        }
        confirmLabel="Delete habit"
        tone="danger"
        busy={removeHabit.isPending}
        onConfirm={handleDeleteHabit}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
