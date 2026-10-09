/**
 * Group transport: groups, the member roster, join requests, email invitations
 * and the challenges proposed inside a group.
 *
 * The routes mirror `groups/urls.py`. Two of its choices are load-bearing here:
 *
 * - `join-requests/`, `invitations/` and `invitations/accept/` are declared
 *   above the `<uuid:group_id>` catch-all, so they are the caller's own inbox
 *   rather than a group's. They are separate functions for exactly that reason.
 * - Every id below a group is a UUID, so no route here can be reached with an
 *   `int`, which is the one shape that used to 404 by accident.
 *
 * Challenge *lifecycle* actions are not here: they hang off the habit that
 * carries the challenge, because a participant's copy routes back to its
 * template inside the view. They live in `habitsApi`.
 */

import type {
    ChallengeCreate,
    ChallengeStatus,
    Group,
    GroupCreate,
    GroupInvitation,
    GroupJoinRequest,
    GroupMembership,
    GroupRole,
    GroupUpdate,
    Habit,
    InvitationAcceptResult,
    InvitationCreate,
    JoinRequestCreate,
    JoinRequestScope,
    Page,
} from '@/types/api';
import { api } from './client';
import { WORKING_SET_SIZE } from './habits';

/**
 * The prefix stays slash-less because nested routes append their own separator.
 * Every request path includes the backend's trailing slash to avoid POST
 * redirects that can discard the request body.
 */
const GROUPS = '/user/groups';

export const groupsApi = {
  /** The caller's own groups: owned or joined, soft-deleted ones excluded. */
  list(signal?: AbortSignal): Promise<Page<Group>> {
    return api.get<Page<Group>>(`${GROUPS}/`, { limit: WORKING_SET_SIZE }, signal);
  },

  get(id: string, signal?: AbortSignal): Promise<Group> {
    return api.get<Group>(`${GROUPS}/${id}/`, undefined, signal);
  },

  /** Creating a group also writes the caller's `owner` membership row. */
  create(input: GroupCreate): Promise<Group> {
    return api.post<Group>(`${GROUPS}/`, {
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      is_private: input.is_private ?? false,
      join_requests_enabled: input.join_requests_enabled ?? true,
      members_can_invite: input.members_can_invite ?? true,
      anyone_can_create_challenge: input.anyone_can_create_challenge ?? true,
    });
  },

  /** Admin-only server side; a plain member gets a 403. */
  update(id: string, input: GroupUpdate): Promise<Group> {
    return api.patch<Group>(`${GROUPS}/${id}/`, input);
  },

  /**
   * Owner-only soft delete. Memberships go, the group row stays for a moderation
   * trail, and any challenge inside it is cancelled. There is no undo endpoint.
   */
  remove(id: string): Promise<void> {
    return api.delete<void>(`${GROUPS}/${id}/`);
  },

  /** Visible to every member: a group's membership is not private. */
  members(id: string, signal?: AbortSignal): Promise<Page<GroupMembership>> {
    return api.get<Page<GroupMembership>>(
      `${GROUPS}/${id}/members/`,
      { limit: WORKING_SET_SIZE },
      signal,
    );
  },

  /**
   * Moves a member between `admin` and `member`. `owner` is refused here on
   * purpose: ownership moves through `transferOwnership` because it also
   * reassigns the group's `owner` column and demotes the old owner.
   */
  setMemberRole(groupId: string, memberId: string, role: GroupRole): Promise<GroupMembership> {
    return api.patch<GroupMembership>(`${GROUPS}/${groupId}/members/${memberId}/`, { role });
  },

  /** Removes a member. An admin may not evict another admin. */
  removeMember(groupId: string, memberId: string): Promise<void> {
    return api.delete<void>(`${GROUPS}/${groupId}/members/${memberId}/`);
  },

  /** Owner-only. The target gains the owner tier and the caller drops to admin. */
  transferOwnership(groupId: string, userId: string): Promise<GroupMembership> {
    return api.post<GroupMembership>(`${GROUPS}/${groupId}/transfer-ownership/`, {
      user: userId,
    });
  },
};

export const joinRequestsApi = {
  /**
   * Admins see the whole log, everybody else only their own rows, and `scope`
   * narrows further. A non-member may only name a group they are already
   * connected to by a request, which is why this 404s for a stranger.
   */
  list(
    groupId: string,
    scope?: JoinRequestScope,
    signal?: AbortSignal,
  ): Promise<Page<GroupJoinRequest>> {
    return api.get<Page<GroupJoinRequest>>(
      `${GROUPS}/${groupId}/join-requests/`,
      { scope, limit: WORKING_SET_SIZE },
      signal,
    );
  },

  /**
   * The caller's own requests, from either side, with no group id required.
   *
   * This is the only route a recipient can reach before they have answered:
   * they are not in `visible_groups`, so the group-scoped route above is closed
   * to them until they know the group id - which is what they are waiting on
   * this to learn.
   */
  mine(
    scope?: JoinRequestScope,
    signal?: AbortSignal,
  ): Promise<Page<GroupJoinRequest>> {
    return api.get<Page<GroupJoinRequest>>(
      `${GROUPS}/join-requests/`,
      { scope, limit: WORKING_SET_SIZE },
      signal,
    );
  },

  /**
   * Asks a registered user to join, addressed by email. The recipient alone may
   * accept or reject.
   */
  create(groupId: string, input: JoinRequestCreate): Promise<GroupJoinRequest> {
    return api.post<GroupJoinRequest>(`${GROUPS}/${groupId}/join-requests/`, {
      email: input.email.trim().toLowerCase(),
      message: input.message?.trim() ?? '',
    });
  },

  /** Withdraws a pending request. Sender only, by design. */
  withdraw(groupId: string, requestId: string): Promise<void> {
    return api.delete<void>(`${GROUPS}/${groupId}/join-requests/${requestId}/`);
  },

  accept(groupId: string, requestId: string): Promise<GroupJoinRequest> {
    return api.post<GroupJoinRequest>(`${GROUPS}/${groupId}/join-requests/${requestId}/accept/`);
  },

  reject(groupId: string, requestId: string): Promise<GroupJoinRequest> {
    return api.post<GroupJoinRequest>(`${GROUPS}/${groupId}/join-requests/${requestId}/reject/`);
  },
};

export const invitationsApi = {
  /**
   * The caller's own pending invitations, matched on their email. This is the
   * route that makes an invitation issued to an unregistered address reachable:
   * the row appears the moment its owner has an account.
   */
  mine(signal?: AbortSignal): Promise<Page<GroupInvitation>> {
    return api.get<Page<GroupInvitation>>(
      `${GROUPS}/invitations/`,
      { limit: WORKING_SET_SIZE },
      signal,
    );
  },

  /** The group's sent log, for revoking a pending link and copying it by hand. */
  list(groupId: string, signal?: AbortSignal): Promise<Page<GroupInvitation>> {
    return api.get<Page<GroupInvitation>>(
      `${GROUPS}/${groupId}/invitations/`,
      { limit: WORKING_SET_SIZE },
      signal,
    );
  },

  /**
   * Invites an address with no account. A registered address is refused with a
   * 411 pointing at join requests instead.
   */
  create(groupId: string, input: InvitationCreate): Promise<GroupInvitation> {
    return api.post<GroupInvitation>(`${GROUPS}/${groupId}/invitations/`, {
      email: input.email.trim().toLowerCase(),
      ...(input.expires_at ? { expires_at: input.expires_at } : {}),
    });
  },

  /** Revokes a pending invitation. One already answered is left alone. */
  revoke(groupId: string, invitationId: string): Promise<void> {
    return api.delete<void>(`${GROUPS}/${groupId}/invitations/${invitationId}/`);
  },

  /**
   * Claims an invitation by token and joins the group it names. Idempotent, so an
   * invite link opened twice - or one already promoted to a join request at
   * registration - still lands the caller in the group.
   */
  accept(token: string): Promise<InvitationAcceptResult> {
    return api.post<InvitationAcceptResult>(`${GROUPS}/invitations/accept/`, { token });
  },
};

export const challengesApi = {
  /**
   * The group's challenge templates, never the per-participant copies - listing
   * those would show the same challenge once per member.
   */
  list(
    groupId: string,
    challengeStatus?: ChallengeStatus,
    signal?: AbortSignal,
  ): Promise<Page<Habit>> {
    return api.get<Page<Habit>>(
      `${GROUPS}/${groupId}/challenges/`,
      { challenge_status: challengeStatus, limit: WORKING_SET_SIZE },
      signal,
    );
  },

  get(groupId: string, challengeId: string, signal?: AbortSignal): Promise<Habit> {
    return api.get<Habit>(`${GROUPS}/${groupId}/challenges/${challengeId}/`, undefined, signal);
  },

  /**
   * Proposes a challenge. `group` and `is_challenge` are set by the endpoint, and
   * the author is subscribed from this call onwards.
   */
  create(groupId: string, input: ChallengeCreate): Promise<Habit> {
    return api.post<Habit>(`${GROUPS}/${groupId}/challenges/`, input);
  },
};
