export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import AdminClient from './AdminClient';

export const metadata: Metadata = {
  title: 'Executive Admin Console | Blue Hills Designers',
  description: 'Confidential system administrative controls for Blue Hills Designers luxury inventory, user profiles, and sales analytics.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Executive Admin Console',
    'description': 'Private admin panel for managing boutique inventory, orders, and clients.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AdminClient />
    </>
  );
}
