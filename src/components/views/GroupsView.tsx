'use client';

import { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  Section,
} from '@/components/ui/surfaces';
import { FormDialog } from '@/components/ui/dialogs';
import { Field } from '@/components/ui/inputs';
import { GroupCard } from '@/components/groups/GroupCard';
import { useToast } from '@/components/feedback/ToastProvider';
import { errorMessage, isApiError } from '@/lib/api/client';
import { formatRelative } from '@/lib/date';
import {
  useCreateGroup,
  useGroups,
  useMyJoinRequests,
  useRespondToJoinRequest,
} from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import type { GroupCreate, GroupJoinRequest } from '@/types/api';

export function GroupsView() {
  const { colors } = useAppScheme();
  const { toast } = useToast();

  const groups = useGroups();
  const joinRequests = useMyJoinRequests('incoming');
  const createGroup = useCreateGroup();
  const respondToRequest = useRespondToJoinRequest();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const list = groups.data?.results ?? [];
  /**
   * A request addressed to the caller. They are not in the group yet, so this
   * inbox is the only place it can surface - the group itself will not appear in
   * `list` until they accept. An invitation aimed at their address becomes one of
   * these the moment they register, so the same list covers both ways in.
   */
  const pendingRequests = (joinRequests.data?.results ?? []).filter(
    (request) => request.status === 'pending',
  );

  const fieldError = (field: string): string | undefined =>
    touched && isApiError(error) ? error.fieldError(field) : undefined;
  const serverErrors = isApiError(error) ? error.errors : {};
  const formError =
    touched && error && Object.keys(serverErrors).length === 0
      ? errorMessage(error, 'Could not create the group.')
      : undefined;

  async function handleCreate() {
    setTouched(true);
    setError(null);
    if (!name.trim()) return;

    const input: GroupCreate = {
      name: name.trim(),
      description: description.trim(),
      is_private: isPrivate,
    };

    try {
      const group = await createGroup.mutateAsync(input);
      toast({ tone: 'success', message: `${group.name} is ready.` });
      setCreateOpen(false);
      setName('');
      setDescription('');
      setIsPrivate(false);
    } catch (caught) {
      setError(caught);
    }
  }

  async function answerRequest(request: GroupJoinRequest, action: 'accept' | 'reject') {
    try {
      await respondToRequest.mutateAsync({
        groupId: request.group,
        requestId: request.id,
        action,
      });
      toast({
        tone: action === 'accept' ? 'success' : 'info',
        message:
          action === 'accept'
            ? `You joined ${request.group_name}.`
            : 'Request declined.',
      });
    } catch (caught) {
      toast({ tone: 'error', message: errorMessage(caught, 'Could not respond to that request.') });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Accountability"
        title="Groups"
        description="Habits are easier to keep with other people watching. A group shares challenges, keeps a roster, and can be private."
        actions={
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New group
          </Button>
        }
      />

      <Stack spacing={3}>
        {pendingRequests.length > 0 ? (
          <Section
            title="Join requests for you"
            description="A member asked you to join a group. Nothing changes until you accept."
          >
            <Stack spacing={1}>
              {pendingRequests.map((request) => (
                <Stack
                  key={request.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: 'center' } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {request.group_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                      from {request.from_user_email} · {formatRelative(request.created_at)}
                    </Typography>
                    {request.message ? (
                      <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.25 }}>
                        {request.message}
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={respondToRequest.isPending}
                      onClick={() => void answerRequest(request, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      disabled={respondToRequest.isPending}
                      onClick={() => void answerRequest(request, 'reject')}
                    >
                      Decline
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Section>
        ) : null}

        <Section
          title="Your groups"
          description="Groups you own and groups you have joined."
          action={
            groups.isFetching && !groups.isPending ? (
              <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                Refreshing…
              </Typography>
            ) : null
          }
        >
          {groups.isPending ? (
            <ListSkeleton rows={3} />
          ) : groups.isError ? (
            <ErrorState
              message={errorMessage(groups.error, 'Could not load your groups.')}
              onRetry={() => void groups.refetch()}
            />
          ) : list.length === 0 ? (
            <EmptyState
              icon={GroupsOutlined}
              title="No groups yet"
              description="Create one to invite people, track a roster, and run challenges together."
              action={
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
                  New group
                </Button>
              }
            />
          ) : (
            <Box>
              {list.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </Box>
          )}
        </Section>
      </Stack>

      <FormDialog
        open={createOpen}
        title="New group"
        description="You become its owner and first member."
        confirmLabel="Create group"
        busy={createGroup.isPending}
        disabled={!name.trim()}
        onConfirm={handleCreate}
        onClose={() => {
          setCreateOpen(false);
          setError(null);
        }}
      >
        <Stack spacing={2}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <Field
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            errorText={fieldError('name')}
            placeholder="Morning runners"
            autoFocus
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />

          <Field
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            helperText="Optional."
            multiline
            minRows={2}
          />

          <Stack component="label" direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
            <Box
              component="input"
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
              sx={{ mt: 0.25, width: 18, height: 18, accentColor: colors.sage, cursor: 'pointer' }}
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Private
              </Typography>
              <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                Keeps the group off anyone&rsquo;s list until they join. You can open it up later.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </FormDialog>
    </>
  );
}