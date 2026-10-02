import { GroupsView } from '@/components/views/GroupsView';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Groups' };

export default function GroupsPage() {
  return <GroupsView />;
}