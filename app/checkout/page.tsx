import type { Metadata } from 'next';
import CheckoutClientWrapper from './CheckoutClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure Checkout | Blue Hills Designers',
  description: 'Complete your premium corporate order securely. Select payment and shipping options for Kampala and local/regional deliveries.',
};

export default function CheckoutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CheckoutPage',
    'name': 'Secure Checkout',
    'description': 'Securely purchase luxury corporate clothing items from Blue Hills Designers.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CheckoutClientWrapper />
    </>
  );
}
