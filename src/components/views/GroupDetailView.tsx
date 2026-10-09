'use client';

import { ChallengeBoard } from '@/components/groups/ChallengeBoard';
import { ChallengeDialog } from '@/components/groups/ChallengeDialog';
import { ChallengeForm } from '@/components/groups/ChallengeForm';
import {
    ErrorState,
    InlineEmpty,
    PageHeader,
    Surface,
} from '@/components/ui/surfaces';
import { BackLink } from '@/components/ui/BackLink';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    useCreateChallenge,
    useGroup,
    useGroupChallenges,
    useTags,
} from '@/lib/query/hooks';
import type { Group } from '@/types/api';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { Button, Stack } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

export function GroupDetailView({ groupId }: { groupId: string }) {
  const { user } = useAuth();

  const group = useGroup(groupId);

  const data = group.data;
  const isAdmin = data?.my_role === 'owner' || data?.my_role === 'admin';

  if (group.isPending) {
    return (
      <>
        <PageHeader eyebrow="Group" title="Loading…" />
        <InlineEmpty message="Loading the group…" />
      </>
    );
  }

  if (group.isError || !data) {
    return (
      <>
        <PageHeader eyebrow="Group" title="Not available" />
        <ErrorState
          message={errorMessage(group.error, 'That group does not exist, or you are not a member.')}
          onRetry={() => void group.refetch()}
        />
      </>
    );
  }

  return (
    <>
      <BackLink href="/groups">All groups</BackLink>
      <PageHeader
        eyebrow="Group"
        title={data.name}
        description={data.description || undefined}
        actions={
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              rowGap: 1,
            }}
          >
            {data.my_role ? (
              <Button
                component={Link}
                href={`/groups/${groupId}/members`}
                variant="outlined"
                startIcon={<PeopleAltOutlined />}
              >
                Members
              </Button>
            ) : null}
            {isAdmin ? (
              <Button
                component={Link}
                href={`/groups/${groupId}/settings`}
                variant="outlined"
                startIcon={<SettingsOutlined />}
              >
                Settings
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Stack spacing={3}>
        <Surface>
          <ChallengesTab group={data} currentUserId={user?.id} isAdmin={Boolean(isAdmin)} />
        </Surface>
      </Stack>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

function ChallengesTab({
  group,
  currentUserId,
  isAdmin,
}: {
  group: Group;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const challenges = useGroupChallenges(group.id);
  const tags = useTags();
  const createChallenge = useCreateChallenge(group.id);

  const [openId, setOpenId] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeError, setProposeError] = useState<unknown>(null);

  return (
    <>
      <ChallengeBoard
        challenges={challenges.data?.results ?? []}
        loading={challenges.isPending}
        canPropose={group.anyone_can_create_challenge || isAdmin}
        onPropose={() => {
          setProposeError(null);
          setProposeOpen(true);
        }}
        onOpen={setOpenId}
      />

      <ChallengeDialog
        groupId={group.id}
        challengeId={openId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setOpenId(null)}
      />

      {proposeOpen ? (
        <ChallengeForm
          tags={tags.data?.results ?? []}
          submitting={createChallenge.isPending}
          error={proposeError}
          onSubmit={async (input) => {
            setProposeError(null);
            try {
              await createChallenge.mutateAsync(input);
              setProposeOpen(false);
            } catch (error) {
              setProposeError(error);
            }
          }}
          onClose={() => setProposeOpen(false)}
        />
      ) : null}
    </>
  );
}