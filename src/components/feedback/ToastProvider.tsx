'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  /** Optional single action, e.g. "Retry". */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastRecord extends Required<Omit<ToastInput, 'action'>> {
  id: number;
  action?: ToastInput['action'];
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4200;

const toneIcons = {
  success: CheckCircleRounded,
  error: ErrorOutlineRounded,
  info: InfoOutlined,
} as const;

const toneColors = {
  success: 'success',
  error: 'error',
  info: 'info',
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const record: ToastRecord = {
        id,
        message: input.message,
        tone: input.tone ?? 'info',
        durationMs: input.durationMs ?? DEFAULT_DURATION,
        action: input.action,
      };
      // Keep the stack shallow so it never covers the interface.
      setToasts((current) => [...current.slice(-2), record]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), record.durationMs),
      );
    },
    [dismiss],
  );

  const success = useCallback((message: string) => toast({ message, tone: 'success' }), [toast]);
  const error = useCallback((message: string) => toast({ message, tone: 'error' }), [toast]);

  const value = useMemo(() => ({ toast, success, error }), [toast, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Stack
        spacing={1.25}
        sx={{
          position: 'fixed',
          bottom: { xs: 20, md: 28 },
          left: { xs: 16, md: 28 },
          right: { xs: 16, md: 'auto' },
          zIndex: (t) => t.zIndex.snackbar + 2,
          maxWidth: 420,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((item) => {
          const Icon = toneIcons[item.tone];
          return (
            <Alert
              key={item.id}
              severity={toneColors[item.tone]}
              variant="filled"
              icon={<Icon fontSize="small" />}
              onClose={() => dismiss(item.id)}
              sx={{
                pointerEvents: 'auto',
                alignItems: 'center',
                py: 0.5,
                px: 1.5,
                boxShadow: (t) => t.shadows[3],
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                  {item.message}
                </Typography>
                {item.action ? (
                  <ToastAction
                    label={item.action.label}
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                  />
                ) : null}
              </Box>
            </Alert>
          );
        })}
      </Stack>
    </ToastContext.Provider>
  );
}

function ToastAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Typography
      component="button"
      type="button"
      onClick={onClick}
      variant="body2"
      sx={{
        border: 'none',
        background: 'none',
        color: 'inherit',
        cursor: 'pointer',
        fontWeight: 700,
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        p: 0,
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
