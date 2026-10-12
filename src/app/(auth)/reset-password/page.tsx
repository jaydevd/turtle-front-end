import type { Metadata } from 'next';
import { ResetPasswordView } from '@/components/views/AuthViews';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
