'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader, ErrorState } from '@/components/ui/surfaces';
import { HabitForm } from '@/components/habits/HabitForm';
import { useToast } from '@/components/feedback/ToastProvider';
import { useCreateHabit, useTags } from '@/lib/query/hooks';
import { errorMessage } from '@/lib/api/client';
import type { HabitDraft } from '@/types/api';

export function NewHabitView() {
  const router = useRouter();
  const tags = useTags();
  const createHabit = useCreateHabit();
  const { toast } = useToast();
  const [error, setError] = useState<unknown>(null);

  async function handleSubmit(draft: HabitDraft) {
    setError(null);
    try {
      const habit = await createHabit.mutateAsync(draft);
      toast({ tone: 'success', message: `“${habit.name}” created.` });
      router.push(`/habits/${habit.id}`);
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
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

      <PageHeader
        eyebrow="New habit"
        title="Build a new routine"
        description="Name it, choose how often it is due, and give it a look you will recognise at a glance."
      />

      {tags.isError ? (
        <ErrorState message={errorMessage(tags.error)} onRetry={() => void tags.refetch()} />
      ) : tags.isPending ? (
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        <HabitForm
          mode="create"
          tags={tags.data?.results ?? []}
          submitting={createHabit.isPending}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/habits')}
        />
      )}
    </Box>
  );
}
