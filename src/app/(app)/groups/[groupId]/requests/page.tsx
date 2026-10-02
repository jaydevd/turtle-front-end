import { JoinRequestReviewView } from '@/components/views/JoinRequestReviewView';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Join request' };

export default async function JoinRequestPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <JoinRequestReviewView groupId={groupId} />;
}