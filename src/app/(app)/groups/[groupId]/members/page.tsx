import type { Metadata } from 'next';
import { GroupMembersView } from '@/components/views/GroupMembersView';

export const metadata: Metadata = { title: 'Members' };

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupMembersView groupId={groupId} />;
}