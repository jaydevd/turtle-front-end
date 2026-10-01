'use client';

import { useAppScheme } from '@/theme/useAppScheme';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { Surface } from './surfaces';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle component="div" sx={{ pb: 1 }}>
        <Typography id="confirm-dialog-title" component="h2" variant="h4">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          color={tone === 'danger' ? 'error' : 'primary'}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface FormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function FormDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  busy = false,
  disabled = false,
  onConfirm,
  onClose,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle component="div" sx={{ pb: 0.5 }}>
        <Typography id="form-dialog-title" component="h2" variant="h4">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {description}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy || disabled} variant="contained">
          {busy ? 'Saving…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export interface InUseTagDialogProps {
  open: boolean;
  tagName: string;
  habitNames: string[];
  onClose: () => void;
  onReassign: () => void;
}

/**
 * The tag foreign key is `on_delete=PROTECT`, so a tag that still carries
 * habits cannot be removed. The backend reports this as a 400, and this dialog
 * turns it into a clear next step rather than a dead end.
 */
export function InUseTagDialog({
  open,
  tagName,
  habitNames,
  onClose,
  onReassign,
}: InUseTagDialogProps) {
  const { colors } = useAppScheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="in-use-tag-title"
    >
      <DialogTitle component="div" sx={{ pb: 0.5 }}>
        <Typography id="in-use-tag-title" component="h2" variant="h4">
          {tagName} is still in use
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Move these habits to another tag, then this one can be deleted.
        </Typography>
        <Surface sx={{ mt: 2, p: 1.5, backgroundColor: colors.paperRaised }}>
          <Stack spacing={0.5}>
            {habitNames.map((name) => (
              <Typography key={name} variant="body2">
                {name}
              </Typography>
            ))}
          </Stack>
        </Surface>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button onClick={onReassign} variant="contained">
          Reassign habits
        </Button>
      </DialogActions>
    </Dialog>
  );
}
