'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { Surface, HabitIconTile } from '@/components/ui/surfaces';
import { StatusPill, TagChip } from '@/components/ui/pills';
import { CheckInControl, type CheckInLog } from './CheckInControl';
import { describeSchedule, dailyTarget, isScheduledOn } from '@/lib/schedule';
import { formatClock, formatPlural, startOfTodayUtc } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { radii } from '@/theme/tokens';
import { tabularNums } from '@/theme/typography';
import type { Habit, HabitSchedule, HabitStat } from '@/types/api';

export interface HabitCardProps {
  habit: Habit;
  stat?: HabitStat;
  todayLog?: CheckInLog | null;
  onTagClick?: (tagId: string) => void;
  onDelete?: () => void;
}

/** One row in the habits list: identity, schedule, momentum and today's action. */
export function HabitCard({ habit, stat, todayLog, onTagClick, onDelete }: HabitCardProps) {
  const { colors, accentFor } = useAppScheme();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const accent = accentFor(habit.color);
  const dueToday = stat ? stat.due_today : isScheduledOn(habit.schedule, startOfTodayUtc());

  return (
    <Surface sx={{ position: 'relative', overflow: 'hidden' }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 3,
          backgroundColor: accent,
          opacity: 0.85,
        }}
      />

      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
        <HabitIconTile icon={habit.icon} color={accent} size={42} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography
              component={Link}
              href={`/habits/${habit.id}`}
              variant="h5"
              noWrap
              sx={{
                color: 'text.primary',
                borderRadius: `${radii.xs}px`,
                '&:hover': { color: 'primary.dark' },
              }}
            >
              {habit.name}
            </Typography>
            <StatusPill status={habit.status} />
          </Stack>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{ mt: 0.75, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}
          >
            {habit.tag_detail ? (
              <TagChip
                name={habit.tag_detail.name}
                onClick={onTagClick ? () => onTagClick(habit.tag_detail.id) : undefined}
              />
            ) : null}
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: colors.inkSoft }}>
              <ScheduleRounded sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ color: 'inherit' }}>
                {describeSchedule(habit.schedule)}
              </Typography>
            </Stack>
            {habit.reminder ? (
              <Typography variant="caption" sx={{ color: colors.inkSoft, ...tabularNums }}>
                Reminder {formatClock(habit.reminder)}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        <IconButton
          size="small"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          aria-label={`${habit.name} actions`}
          aria-haspopup="menu"
          sx={{ color: colors.inkSoft, mt: -0.5 }}
        >
          <MoreVertRounded fontSize="small" />
        </IconButton>
      </Stack>

      <Stack
        direction="row"
        spacing={3}
        sx={{ mt: 2, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: colors.inkSoft }}>
            <LocalFireDepartmentRounded sx={{ fontSize: 17, color: accent }} />
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, ...tabularNums }}>
              {stat?.current_streak ?? 0}
            </Typography>
            <Typography variant="caption" sx={{ color: 'inherit' }}>
              day streak
            </Typography>
          </Stack>
          <Tooltip title="Completed ÷ scheduled days over the last 30 days">
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, stat?.completion_rate ?? 0)}
                sx={{
                  width: 72,
                  height: 6,
                  borderRadius: radii.pill,
                  backgroundColor: colors.hairline,
                  '& .MuiLinearProgress-bar': { backgroundColor: accent, borderRadius: radii.pill },
                }}
              />
              <Typography variant="caption" sx={{ color: colors.inkSoft, ...tabularNums }}>
                {Math.round(stat?.completion_rate ?? 0)}%
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>

        {habit.status === 'ACTIVE' && dueToday ? (
          <CheckInControl
            habitId={habit.id}
            log={todayLog ?? null}
            targetCount={dailyTarget(habit.schedule)}
            accent={accent}
            size="small"
            quickOnly
          />
        ) : (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            {habit.status === 'ACTIVE' ? 'Not scheduled today' : formatPlural(stat?.total_completions ?? 0, 'completion')}
          </Typography>
        )}
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem component={Link} href={`/habits/${habit.id}`} onClick={() => setMenuAnchor(null)}>
          Open details
        </MenuItem>
        <MenuItem component={Link} href={`/habits/${habit.id}/edit`} onClick={() => setMenuAnchor(null)}>
          <EditOutlined fontSize="small" sx={{ mr: 1.25, opacity: 0.7 }} />
          Edit habit
        </MenuItem>
        {onDelete ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onDelete();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutlineRounded fontSize="small" sx={{ mr: 1.25 }} />
            Delete habit
          </MenuItem>
        ) : null}
      </Menu>
    </Surface>
  );
}

/**
 * Compact non-interactive row used by the dashboard checklist, where identity
 * and the toggle matter more than the full card body. Only the fields the row
 * actually renders are required, so both the habit list and the leaner
 * dashboard payload satisfy it.
 */
export interface HabitRowData {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  schedule: HabitSchedule | null;
}

export interface HabitRowProps {
  habit: HabitRowData;
  stat?: HabitStat;
  todayLog?: CheckInLog | null;
}

export function HabitRow({ habit, stat, todayLog }: HabitRowProps) {
  const { colors, accentFor } = useAppScheme();
  const accent = accentFor(habit.color);

  return (
    <Stack
      direction="row"
      spacing={1.75}
      sx={{ alignItems: 'center', py: 1.5, '& + &': { borderTop: `1px solid ${colors.hairline}` } }}
    >
      <HabitIconTile icon={habit.icon} color={accent} size={38} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component={Link}
          href={`/habits/${habit.id}`}
          variant="h6"
          noWrap
          sx={{ display: 'block', '&:hover': { color: 'primary.dark' } }}
        >
          {habit.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: colors.inkSoft, display: 'block' }}>
          {describeSchedule(habit.schedule)}
          {stat ? ` · ${stat.current_streak} day streak` : ''}
        </Typography>
      </Box>
      <CheckInControl
        habitId={habit.id}
        log={todayLog ?? null}
        targetCount={dailyTarget(habit.schedule)}
        accent={accent}
        size="small"
      />
      <IconButton
        component={Link}
        href={`/habits/${habit.id}`}
        size="small"
        aria-label={`Open ${habit.name}`}
        sx={{ color: colors.inkSoft }}
      >
        <ChevronRightRounded fontSize="small" />
      </IconButton>
    </Stack>
  );
}
