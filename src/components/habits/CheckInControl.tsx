'use client';

import { useState } from 'react';
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import NotesRounded from '@mui/icons-material/NotesRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { alpha } from '@mui/material/styles';
import { Field } from '@/components/ui/inputs';
import { FormDialog } from '@/components/ui/dialogs';
import { useToast } from '@/components/feedback/ToastProvider';
import { errorMessage } from '@/lib/api/client';
import { useDeleteLog, useUpsertLog } from '@/lib/query/hooks';
import { statusLabels } from '@/components/ui/pills';
import { startOfToday } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { radii } from '@/theme/tokens';
import type { HabitStatus } from '@/types/api';

export interface CheckInLog {
  id: string;
  status: HabitStatus;
  completed_count: number;
  note?: string;
}

export interface CheckInControlProps {
  habitId: string;
  log?: CheckInLog | null;
  /** Repetitions one check-in should credit, from the habit's schedule. */
  targetCount?: number;
  accent?: string;
  size?: 'small' | 'medium';
  /** Renders only the primary toggle, with no status menu. */
  quickOnly?: boolean;
}

const EXTRA_STATUSES: HabitStatus[] = ['PARTIAL', 'MISSED', 'SKIPPED'];

/**
 * The check-in affordance used on every screen. Tapping upserts the day's log
 * through the `(habit, date)` upsert endpoint, so repeated taps are safe; a tap
 * on an already-completed day clears the entry instead of stacking duplicates.
 */
export function CheckInControl({
  habitId,
  log,
  targetCount = 1,
  accent,
  size = 'medium',
  quickOnly = false,
}: CheckInControlProps) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const upsert = useUpsertLog();
  const remove = useDeleteLog();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const busy = upsert.isPending || remove.isPending;
  const status = log?.status;
  const complete = status === 'COMPLETED';
  const tint = accent ?? colors.sage;
  const target = Math.max(1, targetCount || 1);

  async function saveStatus(next: HabitStatus) {
    try {
      await upsert.mutateAsync({
        habit: habitId,
        date: startOfToday(),
        status: next,
        completed_count: next === 'COMPLETED' ? target : next === 'PARTIAL' ? 1 : 0,
        note: log?.note ?? '',
      });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not save your check-in.') });
    }
  }

  async function quickToggle() {
    if (!log) {
      await saveStatus('COMPLETED');
      return;
    }
    if (complete) {
      try {
        await remove.mutateAsync(log.id);
        toast({ tone: 'info', message: "Today's check-in cleared." });
      } catch (error) {
        toast({ tone: 'error', message: errorMessage(error, 'Could not clear the entry.') });
      }
      return;
    }
    await saveStatus('COMPLETED');
  }

  async function saveNote() {
    try {
      await upsert.mutateAsync({
        habit: habitId,
        date: startOfToday(),
        status: status ?? 'COMPLETED',
        completed_count: log?.completed_count ?? target,
        note: note.trim(),
      });
      setNoteOpen(false);
      toast({ tone: 'success', message: 'Note saved.' });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not save the note.') });
    }
  }

  const quickButtonSx = {
    minHeight: size === 'small' ? 32 : 36,
    px: size === 'small' ? 1.25 : 1.75,
    fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
    borderRadius: `${radii.pill}px`,
    ...(complete
      ? {
          backgroundColor: tint,
          color: '#FFFFFF',
          '&:hover': { backgroundColor: tint, filter: 'brightness(0.94)' },
        }
      : {
          borderColor: colors.hairline,
          color: colors.inkSoft,
          '&:hover': { borderColor: tint, color: tint, backgroundColor: alpha(tint, 0.06) },
        }),
  } as const;

  return (
    <>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Button
          variant={complete ? 'contained' : 'outlined'}
          size="small"
          disableElevation
          disabled={busy}
          onClick={quickToggle}
          aria-label={complete ? "Clear today's check-in" : 'Check in for today'}
          sx={quickButtonSx}
        >
          {busy ? (
            <CircularProgress size={size === 'small' ? 13 : 15} color="inherit" />
          ) : (
            <CheckRounded sx={{ fontSize: size === 'small' ? 15 : 17, mr: 0.5 }} />
          )}
          {complete ? statusLabels.COMPLETED : 'Check in'}
        </Button>

        {!quickOnly ? (
          <Tooltip title="More options">
            <IconButton
              size="small"
              disabled={busy}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              aria-label="Check-in options"
              aria-haspopup="menu"
              sx={{ color: colors.inkSoft }}
            >
              <ExpandMoreRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {EXTRA_STATUSES.map((option) => (
          <MenuItem
            key={option}
            selected={status === option}
            onClick={() => {
              setMenuAnchor(null);
              void saveStatus(option);
            }}
          >
            <ListItemText primary={statusLabels[option]} />
          </MenuItem>
        ))}
        <MenuItem
          selected={complete}
          onClick={() => {
            setMenuAnchor(null);
            void saveStatus('COMPLETED');
          }}
        >
          <ListItemText primary={statusLabels.COMPLETED} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setNote(log?.note ?? '');
            setNoteOpen(true);
          }}
        >
          <ListItemIcon>
            <NotesRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={log?.note ? 'Edit note' : 'Add note'} />
        </MenuItem>
        {log ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              void remove
                .mutateAsync(log.id)
                .then(() => toast({ tone: 'info', message: "Today's entry removed." }))
                .catch((error: unknown) =>
                  toast({ tone: 'error', message: errorMessage(error, 'Could not remove the entry.') }),
                );
            }}
          >
            <ListItemIcon>
              <DeleteOutlineRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Remove entry" />
          </MenuItem>
        ) : null}
      </Menu>

      <FormDialog
        open={noteOpen}
        title="Today's note"
        description="A short line about how it went. Saved with today's check-in."
        confirmLabel="Save note"
        busy={busy}
        onConfirm={saveNote}
        onClose={() => setNoteOpen(false)}
      >
        <Field
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={3}
          autoFocus
          placeholder="Felt good, 20 minutes of reading."
        />
      </FormDialog>
    </>
  );
}
