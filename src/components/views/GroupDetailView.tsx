'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { ChallengeBoard } from '@/components/groups/ChallengeBoard';
import { ChallengeDialog } from '@/components/groups/ChallengeDialog';
import { ChallengeForm } from '@/components/groups/ChallengeForm';
import { GroupSettingsForm } from '@/components/groups/GroupSettingsForm';
import { InvitationPanel } from '@/components/groups/InvitationPanel';
import { JoinRequestPanel } from '@/components/groups/JoinRequestPanel';
import { MemberRoster } from '@/components/groups/MemberRoster';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { RolePill } from '@/components/ui/pills';
import {
    ErrorState,
    InlineEmpty,
    PageHeader,
    Section,
    StatTile,
    Surface,
} from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    useCreateChallenge,
    useDeleteGroup,
    useGroup,
    useGroupChallenges,
    useGroupInvitations,
    useGroupMembers,
    useJoinRequests,
    useTags,
    useUpdateGroup,
} from '@/lib/query/hooks';
import type { Group, GroupUpdate, JoinRequestScope } from '@/types/api';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { Box, Button, Stack, Tab, Tabs } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type TabKey = 'overview' | 'challenges' | 'requests' | 'invitations';

export function GroupDetailView({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const [tab, setTab] = useState<TabKey>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<unknown>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const data = group.data;
  const isAdmin = data?.my_role === 'owner' || data?.my_role === 'admin';
  const isOwner = data?.my_role === 'owner';

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

  async function saveSettings(input: GroupUpdate) {
    setSettingsError(null);
    try {
      await updateGroup.mutateAsync({ id: groupId, input });
      toast({ tone: 'success', message: 'Group settings saved.' });
      setSettingsOpen(false);
    } catch (error) {
      setSettingsError(error);
    }
  }

  async function confirmDelete() {
    try {
      await deleteGroup.mutateAsync(groupId);
      toast({ tone: 'info', message: 'Group deleted.' });
      router.push('/groups');
    } catch (error) {
      setDeleteOpen(false);
      toast({ tone: 'error', message: errorMessage(error, 'Could not delete the group.') });
    }
  }

  return (
    <>
      <Button
        component={Link}
        href="/groups"
        color="inherit"
        size="small"
        startIcon={<ArrowBackRounded />}
        sx={{ mb: 2 }}
      >
        All groups
      </Button>
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
            {data.my_role ? <RolePill role={data.my_role} size="medium" /> : null}
            {isAdmin ? (
              <Button
                variant="outlined"
                startIcon={<SettingsOutlined />}
                onClick={() => setSettingsOpen(true)}
              >
                Settings
              </Button>
            ) : null}
            {isOwner ? (
              <Button
                color="inherit"
                startIcon={<DeleteOutlineRounded />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Stack spacing={3}>
        <Section title="At a glance">
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            <StatTile
              label="Members"
              value={data.member_count}
              compactValue
              hint={
                data.owner_email === user?.email
                  ? 'You own this group'
                  : `Owned by ${data.owner_email}`
              }
            />
            <StatTile label="Visibility" value={data.is_private ? 'Private' : 'Open'} compactValue />
            <StatTile
              label="Join requests"
              value={data.join_requests_enabled ? 'On' : 'Off'}
              compactValue
              hint={data.members_can_invite ? 'Members may ask' : 'Admins only'}
            />
            <StatTile
              label="Proposals"
              value={data.anyone_can_create_challenge ? 'Open to all' : 'Admins only'}
              compactValue
              hint="who may propose a challenge"
            />
          </Box>
        </Section>

        <Surface>
          <Tabs
            value={tab}
            onChange={(_event, value: TabKey) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2.5, minHeight: 40 }}
          >
            <Tab value="overview" label="Members" />
            <Tab value="challenges" label="Challenges" />
            <Tab value="requests" label="Requests" />
            <Tab value="invitations" label="Invitations" />
          </Tabs>

          {tab === 'overview' ? (
            members.isPending ? (
              <InlineEmpty message="Loading the roster…" />
            ) : members.isError ? (
              <ErrorState
                message={errorMessage(members.error, 'Could not load the roster.')}
                onRetry={() => void members.refetch()}
              />
            ) : (
              <MemberRoster
                group={data}
                members={members.data.results}
                currentUserId={user?.id}
              />
            )
          ) : null}

          {tab === 'challenges' ? (
            <ChallengesTab group={data} currentUserId={user?.id} isAdmin={Boolean(isAdmin)} />
          ) : null}

          {tab === 'requests' ? (
            <RequestsTab group={data} currentUserId={user?.id} isAdmin={Boolean(isAdmin)} />
          ) : null}

          {tab === 'invitations' ? <InvitationsTab group={data} /> : null}
        </Surface>
      </Stack>

      {settingsOpen ? (
        <GroupSettingsForm
          group={data}
          submitting={updateGroup.isPending}
          error={settingsError}
          onSubmit={saveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${data.name}?`}
        message="The roster is cleared and any challenge inside is cancelled. Members keep their own habits, but there is no way to bring this group back."
        confirmLabel="Delete group"
        tone="danger"
        busy={deleteGroup.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
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

function RequestsTab({
  group,
  currentUserId,
  isAdmin,
}: {
  group: Group;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const [scope, setScope] = useState<JoinRequestScope>('incoming');
  const requests = useJoinRequests(group.id, scope);

  return (
    <JoinRequestPanel
      group={group}
      requests={requests.data?.results ?? []}
      loading={requests.isPending}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}

function InvitationsTab({ group }: { group: Group }) {
  const invitations = useGroupInvitations(group.id);

  return (
    <InvitationPanel
      group={group}
      invitations={invitations.data?.results ?? []}
      loading={invitations.isPending}
    />
  );
}