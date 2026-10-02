'use client';

import { Box, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo } from 'react';
import { formatShortDate } from '@/lib/date';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type {
  AggregateWeekdayBucket,
  CombinedDayPoint,
  CombinedWeekPoint,
  DayState,
  HeatmapCell,
  HourOfDayProfile,
} from '@/types/api';

const stateLabels: Record<DayState, string> = {
  HIT: 'Hit',
  PARTIAL: 'Partial',
  MISSED: 'Missed',
  SKIPPED: 'Skipped',
  NOT_DUE: 'Not due',
};

function stateColor(state: DayState, accent: string, hairline: string): string {
  switch (state) {
    case 'HIT':
      return accent;
    case 'PARTIAL':
      return alpha(accent, 0.42);
    case 'MISSED':
      return alpha('#B4553F', 0.24);
    case 'SKIPPED':
      return alpha(hairline, 0.9);
    default:
      return 'transparent';
  }
}

/* ------------------------------------------------------------------ */
/* Completion heatmap                                                 */
/* ------------------------------------------------------------------ */

export interface InsightsHeatmapProps {
  cells: HeatmapCell[];
  accent: string;
  cellSize?: number;
}

/**
 * GitHub-style grid built from the insights heatmap cells, which the backend
 * only emits for days the habit was actually due. Columns are weeks starting
 * on Monday and gaps are padded so every row lines up on its weekday.
 */
export function InsightsHeatmap({ cells, accent, cellSize = 13 }: InsightsHeatmapProps) {
  const { colors } = useAppScheme();

  const columns = useMemo(() => {
    const ordered = [...cells].sort((a, b) => a.date - b.date);
    const out: Array<Array<HeatmapCell | null>> = [];
    let column: Array<HeatmapCell | null> = [];
    let expected = -1;

    for (const cell of ordered) {
      if (expected !== -1 && cell.weekday !== expected) {
        out.push(column);
        column = [];
      }
      column.push(cell);
      expected = (cell.weekday + 1) % 7;
    }
    if (column.length) out.push(column);
    return out;
  }, [cells]);

  if (!columns.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No completed days in this window yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
      <Stack direction="row" spacing={0.5}>
        {columns.map((column, columnIndex) => {
          const padded: Array<HeatmapCell | null> = [];
          for (const cell of column) {
            if (!cell) continue;
            while (padded.length < cell.weekday) padded.push(null);
            padded.push(cell);
          }
          while (padded.length < 7) padded.push(null);

          return (
            <Stack key={columnIndex} spacing={0.5}>
              {padded.map((cell, rowIndex) =>
                cell ? (
                  <Tooltip
                    key={cell.date}
                    arrow
                    title={`${formatShortDate(cell.date)} · ${stateLabels[cell.state]} · ${cell.completed_count}/${cell.target}`}
                  >
                    <Box
                      sx={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radii.xs,
                        backgroundColor: stateColor(cell.state, accent, colors.hairline),
                        border: '1px solid',
                        borderColor: cell.state === 'HIT' ? 'transparent' : colors.hairline,
                        transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                        '&:hover': { transform: 'scale(1.2)' },
                      }}
                    />
                  </Tooltip>
                ) : (
                  <Box
                    key={`pad-${columnIndex}-${rowIndex}`}
                    sx={{ width: cellSize, height: cellSize }}
                  />
                ),
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

export function InsightsHeatmapLegend({ accent }: { accent: string }) {
  const { colors } = useAppScheme();
  const entries: Array<[string, string]> = [
    ['Hit', accent],
    ['Partial', alpha(accent, 0.42)],
    ['Missed', alpha('#B4553F', 0.24)],
    ['Skipped', alpha(colors.hairline, 0.9)],
  ];

  return (
    <Stack direction="row" spacing={1.75} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      {entries.map(([label, background]) => (
        <Stack key={label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 11,
              height: 11,
              borderRadius: 3,
              backgroundColor: background,
              border: '1px solid',
              borderColor: colors.hairline,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Weekday profile                                                    */
/* ------------------------------------------------------------------ */

export interface WeekdayProfileProps {
  buckets: AggregateWeekdayBucket[];
  emptyMessage?: string;
}

/**
 * Per-weekday completion as horizontal bars. A weekday with no due days has a
 * null rate and is drawn as an empty track rather than as a 0% failure.
 */
export function WeekdayProfileBars({ buckets, emptyMessage }: WeekdayProfileProps) {
  const { colors } = useAppScheme();

  if (!buckets.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage ?? 'No scheduled days in this window.'}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {buckets.map((bucket) => {
        const rate = bucket.completion_rate;
        return (
          <Stack key={bucket.weekday} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography
              variant="caption"
              sx={{ width: 74, flexShrink: 0, color: colors.inkSoft, fontWeight: 600 }}
            >
              {bucket.name}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={rate ?? 0}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: radii.pill,
                backgroundColor: alpha(colors.inkSoft, 0.1),
                '& .MuiLinearProgress-bar': { borderRadius: radii.pill },
              }}
            />
            <Typography
              variant="caption"
              sx={{ width: 92, flexShrink: 0, textAlign: 'right', color: colors.inkSoft }}
            >
              {rate === null || rate === undefined
                ? `${bucket.due_days} due`
                : `${Math.round(rate)}% · ${bucket.hit_days}/${bucket.due_days}`}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Combined trend series                                              */
/* ------------------------------------------------------------------ */

export interface TrendBarsProps {
  points: Array<CombinedDayPoint | CombinedWeekPoint>;
  accent: string;
  height?: number;
}

/**
 * The user-level combined series as a bar per day (or week). `score` is a 0-1
 * share, so a bar's height is the share of that day's due habits completed.
 */
export function TrendBars({ points, accent, height = 96 }: TrendBarsProps) {
  const { colors } = useAppScheme();

  if (!points.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No trend data for this window yet.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={0.375} sx={{ alignItems: 'flex-end', height }}>
      {points.map((point, index) => {
        const score = point.score ?? 0;
        const due = point.due_count;
        const label =
          'date' in point
            ? `${point.date} · ${Math.round(score * 100)}% of ${due} due`
            : `${formatShortDate(point.start)} – ${formatShortDate(point.end)} · ${Math.round(score * 100)}% of ${due} due`;

        return (
          <Tooltip key={index} arrow title={label}>
            <Box
              sx={{
                flex: 1,
                minWidth: 3,
                height: `${Math.max(score * 100, 3)}%`,
                borderRadius: radii.xs,
                backgroundColor: score > 0 ? accent : alpha(colors.inkSoft, 0.12),
                transition: 'opacity 160ms',
                '&:hover': { opacity: 0.75 },
              }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Hour of day                                                        */
/* ------------------------------------------------------------------ */

export function HourOfDayBars({ profile }: { profile: HourOfDayProfile }) {
  const { colors } = useAppScheme();

  if (!profile.sample_count) {
    return (
      <Typography variant="body2" color="text.secondary">
        No completion times recorded yet, so there is nothing to plot.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={0.375} sx={{ alignItems: 'flex-end', height: 72 }}>
        {profile.buckets.map((bucket) => (
          <Tooltip
            key={bucket.hour}
            arrow
            title={`${formatClockLabel(bucket.hour)} · ${bucket.completions} completed`}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 3,
                height: `${Math.max((bucket.share ?? 0) * 100, bucket.completions ? 4 : 2)}%`,
                borderRadius: radii.xs,
                backgroundColor:
                  bucket.hour === profile.peak_hour
                    ? colors.sage
                    : alpha(colors.sage, 0.28),
              }}
            />
          </Tooltip>
        ))}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        {[0, 6, 12, 18, 23].map((hour) => (
          <Typography key={hour} variant="caption" color="text.disabled">
            {formatClockLabel(hour)}
          </Typography>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Peak hour {formatClockLabel(profile.peak_hour)} ·{' '}
        {profile.peak_share === null ? 'no single dominant hour' : `${Math.round(profile.peak_share * 100)}% of completions`}
      </Typography>
    </Stack>
  );
}

function formatClockLabel(hour: number | null): string {
  if (hour === null || hour === undefined) return 'n/a';
  return `${String(hour).padStart(2, '0')}:00`;
}
