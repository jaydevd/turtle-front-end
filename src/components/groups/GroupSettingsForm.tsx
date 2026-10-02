'use client';

import { useState } from 'react';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { FormDialog } from '@/components/ui/dialogs';
import { Field } from '@/components/ui/inputs';
import { errorMessage, isApiError } from '@/lib/api/client';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Group, GroupUpdate } from '@/types/api';

export interface GroupSettingsFormProps {
  group: Group;
  submitting: boolean;
  error: unknown;
  onSubmit: (input: GroupUpdate) => void | Promise<void>;
  onClose: () => void;
}

/**
 * The group's own settings.
 *
 * Each switch is a separate promise to the members underneath it, so they are
 * spelled out rather than lumped under "permissions":
 *
 * - `join_requests_enabled` is the master switch for asking registered users.
 *   Turning it off does not withdraw requests already on the table.
 * - `members_can_invite` gates plain members on both invite channels, since an
 *   email invitation and a request are the same ask in two forms.
 * - `anyone_can_create_challenge` decides who may propose; a group's admin can
 *   always do so either way.
 */
export function GroupSettingsForm({
  group,
  submitting,
  error,
  onSubmit,
  onClose,
}: GroupSettingsFormProps) {
  const { colors } = useAppScheme();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  const [joinRequests, setJoinRequests] = useState(group.join_requests_enabled);
  const [membersInvite, setMembersInvite] = useState(group.members_can_invite);
  const [anyoneChallenges, setAnyoneChallenges] = useState(group.anyone_can_create_challenge);
  const [touched, setTouched] = useState(false);

  const fieldError = (field: string): string | undefined =>
    touched && isApiError(error) ? error.fieldError(field) : undefined;
  const serverErrors = isApiError(error) ? error.errors : {};
  const formError =
    touched && error && Object.keys(serverErrors).length === 0
      ? errorMessage(error, 'Could not save the group.')
      : undefined;

  const invalidName = !name.trim();

  async function handleSubmit() {
    setTouched(true);
    if (invalidName) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      is_private: isPrivate,
      join_requests_enabled: joinRequests,
      members_can_invite: membersInvite,
      anyone_can_create_challenge: anyoneChallenges,
    });
  }

  return (
    <FormDialog
      open
      title="Group settings"
      description="Names, rules and who may do what."
      confirmLabel="Save changes"
      busy={submitting}
      disabled={invalidName}
      onConfirm={handleSubmit}
      onClose={onClose}
    >
      <Stack spacing={2.25}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Field
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          errorText={fieldError('name')}
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Field
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          helperText="Optional. What is this group for?"
          multiline
          minRows={3}
        />

        <Divider />

        <Stack spacing={0.5}>
          <Typography variant="subtitle2" color="text.secondary">
            Membership
          </Typography>

          <Switch
            label="Private group"
            help="Only members and people you invite can see it."
            checked={isPrivate}
            onChange={setIsPrivate}
          />

          <Switch
            label="Allow join requests"
            help="Members can ask a registered user to join. Existing requests stay as they are."
            checked={joinRequests}
            onChange={setJoinRequests}
          />

          <Switch
            label="Members can invite"
            help="Lets plain members, not just admins, send invitations and requests. This works for email invitations too, which do not need the switch above."
            checked={membersInvite}
            onChange={setMembersInvite}
          />
        </Stack>

        <Divider />

        <Stack spacing={0.5}>
          <Typography variant="subtitle2" color="text.secondary">
            Challenges
          </Typography>

          <Switch
            label="Anyone can propose a challenge"
            help="Turn this off to keep proposals to admins."
            checked={anyoneChallenges}
            onChange={setAnyoneChallenges}
          />

          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            Starting and ending a challenge is always up to its author or an admin.
          </Typography>
        </Stack>
      </Stack>
    </FormDialog>
  );
}

/**
 * A checkbox row with its consequence spelled out underneath, so nobody enables a
 * switch without learning what it turns on.
 */
function Switch({
  label,
  help,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppScheme();

  return (
    <Stack
      component="label"
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'flex-start',
        py: 0.75,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Box
        component="input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        sx={{
          mt: 0.25,
          width: 18,
          height: 18,
          accentColor: colors.sage,
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.inkSoft }}>
          {help}
        </Typography>
      </Box>
    </Stack>
  );
}