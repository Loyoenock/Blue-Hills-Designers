import { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Credentials | Blue Hills Designers',
  description: 'Reconfigure your private security entry keys.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
