'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader, ErrorState } from '@/components/ui/surfaces';
import { HabitForm } from '@/components/habits/HabitForm';
import { useToast } from '@/components/feedback/ToastProvider';
import { useHabit, useTags, useUpdateHabit } from '@/lib/query/hooks';
import { errorMessage } from '@/lib/api/client';
import type { HabitDraft } from '@/types/api';

export function EditHabitView({ habitId }: { habitId: string }) {
  const router = useRouter();
  const habit = useHabit(habitId);
  const tags = useTags();
  const updateHabit = useUpdateHabit();
  const { toast } = useToast();
  const [error, setError] = useState<unknown>(null);

  async function handleSubmit(draft: HabitDraft) {
    setError(null);
    try {
      const updated = await updateHabit.mutateAsync({ id: habitId, input: draft });
      toast({ tone: 'success', message: `“${updated.name}” updated.` });
      router.push(`/habits/${habitId}`);
    } catch (caught) {
      setError(caught);
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

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Button
        component={Link}
        href={`/habits/${habitId}`}
        color="inherit"
        size="small"
        startIcon={<ArrowBackRounded />}
        sx={{ mb: 2 }}
      >
        Back to habit
      </Button>

      <PageHeader
        eyebrow="Edit habit"
        title={habit.data?.name ?? 'Edit habit'}
        description="Changes to the schedule apply immediately; streak maths follows the new rules."
      />

      {habit.isPending || tags.isPending ? (
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      ) : habit.data ? (
        <HabitForm
          mode="edit"
          habit={habit.data}
          tags={tags.data?.results ?? []}
          submitting={updateHabit.isPending}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/habits/${habitId}`)}
        />
      ) : null}
    </Box>
  );
}
