import type { Metadata } from 'next';
import RegisterClientWrapper from './RegisterClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Register Corporate Account | Blue Hills Designers',
  description: 'Create your luxury customer account at Blue Hills Designers. Experience priority tailoring alerts, track your sartorial order history, and earn exclusive rewards points.',
};

export default function RegisterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Register Corporate Account',
    'description': 'Register an account to shop luxury corporate suits and track premium apparel orders.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RegisterClientWrapper />
    </>
  );
}
