import { GroupInviteView } from '@/components/views/GroupInviteView';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Group invitation' };

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return <GroupInviteView token={token ?? ''} />;
}