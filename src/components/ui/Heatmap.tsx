'use client';

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { addUtcDays, formatWeekday, startOfTodayUtc, utcWeekday } from '@/lib/date';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import { statusLabels } from './pills';
import type { HabitLog, HabitStatus } from '@/types/api';

export interface HeatmapProps {
  /** Oldest epoch-seconds day keys included in the strip. */
  logsByDate: Map<number, HabitLog>;
  days?: number;
  accent: string;
  /** Today's UTC midnight, injected so the component stays render-pure. */
  today?: number;
  showLabels?: boolean;
  size?: number;
}

/**
 * A run of day cells, oldest on the left. Days without an entry stay quiet so
 * the completed ones read as the signal. Days the habit was not scheduled are
 * marked so gaps are legible rather than looking like failures.
 */
export function Heatmap({
  logsByDate,
  days = 14,
  accent,
  today = startOfTodayUtc(),
  showLabels = true,
  size = 26,
}: HeatmapProps) {
  const { colors } = useAppScheme();
  const start = addUtcDays(today, -(days - 1));
  const cells = Array.from({ length: days }, (_, index) => addUtcDays(start, index));

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        {cells.map((day) => {
          const log = logsByDate.get(day);
          const isToday = day === today;
          const background = cellBackground(log?.status, accent, colors.hairline);
          const weekday = utcWeekday(day);
          const isWeekend = weekday >= 5;

          return (
            <Tooltip
              key={day}
              title={
                log
                  ? `${formatWeekday(day)} · ${statusLabels[log.status]}`
                  : `${formatWeekday(day)} · not logged`
              }
              arrow
            >
              <Box
                sx={{
                  width: size,
                  height: size,
                  borderRadius: radii.xs,
                  backgroundColor: background,
                  border: '1px solid',
                  borderColor: isToday ? colors.ink : log ? 'transparent' : colors.hairline,
                  borderStyle: log ? 'solid' : 'dashed',
                  position: 'relative',
                  transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                  '&:hover': { transform: 'scale(1.14)' },
                  ...(isWeekend && !log ? { opacity: 0.55 } : {}),
                }}
              >
                {log?.status === 'PARTIAL' ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        backgroundColor: 'background.paper',
                      }}
                    />
                  </Box>
                ) : null}
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {showLabels ? (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          {cells.map((day) => (
            <Box
              key={day}
              sx={{ width: size, textAlign: 'center', flexShrink: 0 }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.625rem',
                  color: day === today ? 'text.primary' : 'text.disabled',
                  fontWeight: day === today ? 700 : 500,
                }}
              >
                {formatWeekday(day).slice(0, 1)}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

function cellBackground(
  status: HabitStatus | undefined,
  accent: string,
  hairline: string,
): string {
  switch (status) {
    case 'COMPLETED':
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

export interface HeatmapLegendProps {
  accent: string;
}

export function HeatmapLegend({ accent }: HeatmapLegendProps) {
  const { colors } = useAppScheme();
  const entries: Array<{ label: string; background: string; dashed?: boolean }> = [
    { label: 'Completed', background: accent },
    { label: 'Partial', background: alpha(accent, 0.42) },
    { label: 'Missed', background: alpha('#B4553F', 0.24) },
    { label: 'Skipped', background: alpha(colors.hairline, 0.9) },
    { label: 'Not logged', background: 'transparent', dashed: true },
  ];

  return (
    <Stack direction="row" spacing={1.75} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      {entries.map((entry) => (
        <Stack key={entry.label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: entry.background,
              border: '1px solid',
              borderColor: entry.dashed ? colors.hairline : 'transparent',
              borderStyle: entry.dashed ? 'dashed' : 'solid',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {entry.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
