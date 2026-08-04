import { Metadata } from 'next';
import { Suspense } from 'react';
import SetNewPasswordClient from './SetNewPasswordClient';

export const metadata: Metadata = {
  title: 'Set Permanent Password | Blue Hills Designers',
  description: 'Choose your new personal password to activate your account.',
};

export default function SetNewPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-8 h-8 border-2 border-[#1C4D8D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
          Loading Security Console...
        </p>
      </div>
    }>
      <SetNewPasswordClient />
    </Suspense>
  );
}
