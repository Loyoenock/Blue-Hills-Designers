import { Metadata } from 'next';
import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export const metadata: Metadata = {
  title: 'Verify Elite Account | Blue Hills Designers',
  description: 'Submit your secure 6-digit confirmation key to activate your profile.',
};

export default function VerifyEmailPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Verify Elite Account',
    'description': 'Verify and activate your premium account with Blue Hills Designers Uganda.',
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-8 h-8 border-2 border-[#1C4D8D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
          Loading Security Console...
        </p>
      </div>
    }>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VerifyEmailClient />
    </Suspense>
  );
}
