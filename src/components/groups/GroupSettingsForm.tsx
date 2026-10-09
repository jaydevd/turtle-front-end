'use client';

import { Box, Stack, Switch, Typography } from '@mui/material';
import { SettingsSection } from '@/components/ui/surfaces';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Group } from '@/types/api';

/** The policy flags that save the moment they are flipped. */
export type GroupPolicyField =
  | 'join_requests_enabled'
  | 'members_can_invite'
  | 'anyone_can_create_challenge';

export interface GroupSettingsFormProps {
  group: Group;
  /** A policy write is in flight, so every switch holds still until it lands. */
  saving: boolean;
  onToggle: (field: GroupPolicyField, next: boolean) => void;
  /** Visibility needs a confirmation step before it may change. */
  onToggleVisibility: (next: boolean) => void;
}

/**
 * The group's rule set, laid out as labelled blocks rather than as a form: each
 * switch persists on its own the instant it is flipped, so there is nothing to
 * submit. The name and description live behind a dialog on the page header
 * instead, since those are the only fields worth a deliberate save.
 *
 * Each switch is a separate promise to the members underneath it, so they are
 * spelled out rather than lumped under "permissions":
 *
 * - `join_requests_enabled` lets the members ask a registered user to join.
 *   Admins keep that either way, and turning it off does not withdraw requests
 *   already on the table.
 * - `members_can_invite` gates plain members on both invite channels, since an
 *   email invitation and a request are the same ask in two forms.
 * - `anyone_can_create_challenge` decides who may propose; a group's admin can
 *   always do so either way.
 */
export function GroupSettingsForm({
  group,
  saving,
  onToggle,
  onToggleVisibility,
}: GroupSettingsFormProps) {
  const { colors } = useAppScheme();

  return (
    <Stack spacing={6}>
      <SettingsSection title="Membership">
        <ToggleRow
          label="Private group"
          help="Only members and invitees can see it."
          checked={group.is_private}
          disabled={saving}
          onChange={onToggleVisibility}
        />

        <ToggleRow
          label="Allow join requests"
          help="Members can ask registered users to join."
          checked={group.join_requests_enabled}
          disabled={saving}
          onChange={(next) => onToggle('join_requests_enabled', next)}
        />

        <ToggleRow
          label="Members can invite"
          help="Members can send invitations, not just admins."
          checked={group.members_can_invite}
          disabled={saving}
          onChange={(next) => onToggle('members_can_invite', next)}
        />
      </SettingsSection>

      <SettingsSection title="Challenges">
        <ToggleRow
          label="Anyone can propose a challenge"
          help="Let any member propose one, not just admins."
          checked={group.anyone_can_create_challenge}
          disabled={saving}
          onChange={(next) => onToggle('anyone_can_create_challenge', next)}
        />

        <Typography variant="caption" sx={{ color: colors.inkSoft, display: 'block', pt: 0.75 }}>
          Starting and ending a challenge stays with its author or an admin.
        </Typography>
      </SettingsSection>
    </Stack>
  );
}

/**
 * A toggle row with its consequence spelled out underneath, so nobody flips a
 * switch without learning what it turns on. The control sits at the row's end,
 * the way a settings list usually lays it out.
 */
function ToggleRow({
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
      spacing={1.5}
      sx={{
        alignItems: 'center',
        py: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.inkSoft }}>
          {help}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        edge="end"
        slotProps={{ input: { 'aria-label': label } }}
      />
    </Stack>
  );
}
