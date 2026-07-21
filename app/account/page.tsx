import type { Metadata } from 'next';
import AccountClientWrapper from './AccountClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Executive Account | Blue Hills Designers',
  description: 'View your corporate purchase history, update physical address settings for courier delivery, and check accumulated VIP rewards points.',
};

export default function AccountPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'My Executive Account Dashboard',
    'description': 'Manage corporate details, reward metrics, and order history.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AccountClientWrapper />
    </>
  );
}
