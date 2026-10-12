import type { Metadata } from 'next';
import { ForgotPasswordView } from '@/components/views/AuthViews';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
