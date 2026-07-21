import type { Metadata } from 'next';
import CartClientWrapper from './CartClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Shopping Cart | Blue Hills Designers',
  description: 'Review your selected ready-to-wear corporate attire, luxury suits, and office accessories before placing your premium order with Blue Hills Designers.',
};

export default function CartPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Shopping Cart',
    'description': 'Review selected menswear items in your Blue Hills Designers cart.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CartClientWrapper />
    </>
  );
}
