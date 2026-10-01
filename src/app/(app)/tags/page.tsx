import type { Metadata } from 'next';
import { TagsView } from '@/components/views/TagsView';

export const metadata: Metadata = { title: 'Tags' };

export default function TagsPage() {
  return <TagsView />;
}
