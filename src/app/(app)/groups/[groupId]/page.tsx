import { GroupDetailView } from '@/components/views/GroupDetailView';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Group' };

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupDetailView groupId={groupId} />;
}