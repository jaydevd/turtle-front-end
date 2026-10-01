'use client';

import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { StatusPill } from '@/components/ui/pills';
import { formatShortDate } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { tabularNums } from '@/theme/typography';
import type { HabitLog } from '@/types/api';

export interface LogTimelineProps {
  logs: HabitLog[];
  /** Repetitions a fully completed day requires; 1 hides the counter. */
  targetCount?: number;
  deletingId?: string | null;
  onDelete: (log: HabitLog) => void;
}

/** Recent day entries, newest first, with status, count, note and removal. */
export function LogTimeline({ logs, targetCount = 1, deletingId, onDelete }: LogTimelineProps) {
  const { colors } = useAppScheme();
  const ordered = [...logs].sort((a, b) => b.date - a.date);

  return (
    <Box>
      {ordered.map((log) => (
        <Stack
          key={log.id}
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'flex-start',
            py: 1.5,
            '& + &': { borderTop: `1px solid ${colors.hairline}` },
          }}
        >
          <Box sx={{ width: 68, flexShrink: 0, pt: 0.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, ...tabularNums }}>
              {formatShortDate(log.date)}
            </Typography>
            {targetCount > 1 ? (
              <Typography variant="caption" sx={{ color: colors.inkSoft, ...tabularNums }}>
                {log.completed_count}/{targetCount}
              </Typography>
            ) : null}
          </Box>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
            <StatusPill status={log.status} />
            {log.note ? (
              <Typography variant="body2" sx={{ color: colors.inkSoft, whiteSpace: 'pre-wrap' }}>
                {log.note}
              </Typography>
            ) : null}
          </Stack>
          <Tooltip title="Remove entry">
            <span>
              <IconButton
                size="small"
                aria-label={`Remove ${formatShortDate(log.date)}`}
                onClick={() => onDelete(log)}
                disabled={deletingId === log.id}
                sx={{ color: colors.inkSoft }}
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ))}
    </Box>
  );
}
