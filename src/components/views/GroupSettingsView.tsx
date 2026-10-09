'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Divider, MenuItem, Stack, Typography } from '@mui/material';
import EditRounded from '@mui/icons-material/EditRounded';
import { useToast } from '@/components/feedback/ToastProvider';
import { GroupSettingsForm, type GroupPolicyField } from '@/components/groups/GroupSettingsForm';
import { BackLink } from '@/components/ui/BackLink';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { Field, SelectField } from '@/components/ui/inputs';
import { ErrorState, PageHeader, SettingsSection } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import {
  useDeleteGroup,
  useGroup,
  useGroupMembers,
  useTransferOwnership,
  useUpdateGroup,
} from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Group, GroupUpdate } from '@/types/api';

/**
 * `/groups/<id>/settings` - the whole rule set on one screen.
 *
 * The policy switches persist the moment they are toggled, so the only fields
 * that go through a form are the name and description, edited from the header.
 * Only admins reach this page - the serializer refuses anybody else anyway, so
 * the check here is for a readable message rather than for safety.
 */
export function GroupSettingsView({ groupId }: { groupId: string }) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const group = useGroup(groupId);
  const updateGroup = useUpdateGroup();

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [editError, setEditError] = useState<unknown>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<boolean | null>(null);

  const data = group.data;
  const isAdmin = data?.my_role === 'owner' || data?.my_role === 'admin';
  const isOwner = data?.my_role === 'owner';
  const backHref = `/groups/${groupId}`;

  const backButton = <BackLink href={backHref}>Back to group</BackLink>;

  function openEdit() {
    if (!data) return;
    setDraftName(data.name);
    setDraftDescription(data.description);
    setEditError(null);
    setEditOpen(true);
  }

  async function saveDetails() {
    if (!draftName.trim()) return;
    setEditError(null);
    try {
      await updateGroup.mutateAsync({
        id: groupId,
        input: { name: draftName.trim(), description: draftDescription.trim() },
      });
      toast({ tone: 'success', message: 'Group details saved.' });
      setEditOpen(false);
    } catch (caught) {
      setEditError(caught);
    }
  }

  async function togglePolicy(field: GroupPolicyField, next: boolean) {
    const patch: GroupUpdate =
      field === 'join_requests_enabled'
        ? { join_requests_enabled: next }
        : field === 'members_can_invite'
          ? { members_can_invite: next }
          : { anyone_can_create_challenge: next };
    try {
      await updateGroup.mutateAsync({ id: groupId, input: patch });
    } catch (caught) {
      toast({ tone: 'error', message: errorMessage(caught, 'Could not update the setting.') });
    }
  }

  async function confirmVisibility() {
    if (visibilityTarget === null) return;
    const next = visibilityTarget;
    try {
      await updateGroup.mutateAsync({ id: groupId, input: { is_private: next } });
      toast({
        tone: 'success',
        message: next ? 'This group is now private.' : 'This group is now public.',
      });
    } catch (caught) {
      toast({ tone: 'error', message: errorMessage(caught, 'Could not change the visibility.') });
    } finally {
      setVisibilityTarget(null);
    }
  }

  if (group.isPending) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {backButton}
        <PageHeader eyebrow="Group settings" title="Loading…" />
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      </Box>
    );
  }

  if (group.isError || !data) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {backButton}
        <PageHeader eyebrow="Group settings" title="Not available" />
        <ErrorState
          title="That group is unavailable"
          message={errorMessage(group.error, 'That group does not exist, or you are not a member.')}
          onRetry={() => void group.refetch()}
        />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {backButton}
        <PageHeader eyebrow="Group settings" title={data.name} description={data.description} />
        <ErrorState
          title="Admins only"
          message="Only the group owner and its admins can change these settings."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      {backButton}
      <PageHeader
        eyebrow="Group settings"
        title={data.name}
        description={data.description || 'No description yet.'}
        descriptionSx={{ ml: '3px', color: colors.inkSoft }}
        actions={
          <Button variant="outlined" startIcon={<EditRounded />} onClick={openEdit}>
            Edit details
          </Button>
        }
      />

      <GroupSettingsForm
        group={data}
        saving={updateGroup.isPending}
        onToggle={togglePolicy}
        onToggleVisibility={(next) => setVisibilityTarget(next)}
      />

      {isOwner ? (
        <Box sx={{ mt: 4 }}>
          <OwnerPane group={data} />
        </Box>
      ) : null}

      <FormDialog
        open={editOpen}
        title="Edit group details"
        description="The name every member sees, and what the group is for."
        confirmLabel="Save changes"
        busy={updateGroup.isPending}
        disabled={!draftName.trim()}
        onConfirm={saveDetails}
        onClose={() => setEditOpen(false)}
      >
        <Stack spacing={2.25}>
          {editError ? (
            <Alert severity="error">{errorMessage(editError, 'Could not save the group.')}</Alert>
          ) : null}
          <Field
            label="Name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            autoFocus
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <Field
            label="Description"
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            helperText="Optional. What is this group for?"
            multiline
            minRows={3}
          />
        </Stack>
      </FormDialog>

      <ConfirmDialog
        open={visibilityTarget !== null}
        title={visibilityTarget ? `Make ${data.name} private?` : `Make ${data.name} public?`}
        message={
          visibilityTarget
            ? 'Only members and people you invite will be able to see the group and its challenges.'
            : 'Anyone will be able to find the group and ask to join it.'
        }
        confirmLabel={visibilityTarget ? 'Make private' : 'Make public'}
        busy={updateGroup.isPending}
        onConfirm={confirmVisibility}
        onClose={() => setVisibilityTarget(null)}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

function OwnerPane({ group }: { group: Group }) {
  const router = useRouter();
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const members = useGroupMembers(group.id);
  const transfer = useTransferOwnership();
  const deleteGroup = useDeleteGroup();

  const [transferTarget, setTransferTarget] = useState<string>('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rosterLoading = members.isPending || members.isError;
  const candidates = (members.data?.results ?? []).filter((membership) => membership.role !== 'owner');
  const target = candidates.find((membership) => membership.user === transferTarget);

  function openTransfer() {
    const first = candidates[0];
    setTransferTarget(first ? first.user : '');
  }

  async function confirmTransfer() {
    if (!target) return;
    try {
      await transfer.mutateAsync({ groupId: group.id, userId: target.user });
      toast({
        tone: 'success',
        message: `${target.user_email} now owns this group. You are an admin.`,
      });
      setTransferTarget('');
    } catch (caught) {
      toast({ tone: 'error', message: errorMessage(caught, 'Could not transfer ownership.') });
    }
  }

  async function confirmDelete() {
    try {
      await deleteGroup.mutateAsync(group.id);
      toast({ tone: 'info', message: 'Group deleted.' });
      router.push('/groups');
    } catch (caught) {
      setDeleteOpen(false);
      toast({ tone: 'error', message: errorMessage(caught, 'Could not delete the group.') });
    }
  }

  return (
    <>
      <SettingsSection
        title="Ownership"
        description="Only the owner can hand the group on or delete it. Transferring makes you an admin and leaves your own habits untouched."
      >
        <Stack divider={<Divider />} spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 420 }}>
              Hands the group to another member, who gains every admin right. Only the new owner
              can transfer or delete from then on.
            </Typography>
            <Button
              variant="outlined"
              onClick={openTransfer}
              disabled={rosterLoading || candidates.length === 0 || transfer.isPending}
              sx={{ flexShrink: 0 }}
            >
              {rosterLoading ? 'Loading…' : candidates.length === 0 ? 'No one to hand to' : 'Transfer ownership'}
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 420 }}>
              Deletes the group for everyone: the roster is cleared and any challenge inside is
              cancelled. There is no way to bring it back.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Delete group
            </Button>
          </Stack>
        </Stack>
      </SettingsSection>

      <FormDialog
        open={Boolean(transferTarget)}
        title="Hand over this group?"
        description="They gain every admin right, and you drop to admin. This cannot be undone by them."
        confirmLabel="Transfer ownership"
        busy={transfer.isPending}
        disabled={!target}
        onConfirm={confirmTransfer}
        onClose={() => setTransferTarget('')}
      >
        <SelectField
          label="New owner"
          name="new-owner"
          value={transferTarget}
          onChange={(event) => setTransferTarget(event.target.value)}
        >
          {candidates.map((membership) => (
            <MenuItem key={membership.user} value={membership.user}>
              {membership.user_email}
            </MenuItem>
          ))}
        </SelectField>
      </FormDialog>

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${group.name}?`}
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
