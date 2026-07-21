import type { Metadata } from 'next';
import LoginClientWrapper from './LoginClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure Account Login | Blue Hills Designers',
  description: 'Log in to your executive account at Blue Hills Designers. Manage your premium wardrobe, view your rewards points, and track your tailored orders.',
};

export default function LoginPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Secure Account Login',
    'description': 'Log in to your Blue Hills Designers account to browse premium suits and track order status.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LoginClientWrapper />
    </>
  );
}
