import type {Metadata} from 'next';
import { Manrope, Cormorant_Garamond } from 'next/font/google';
import './globals.css'; // Global styles
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Blue Hills Designers | Luxury Corporate Menswear',
  description: 'Lubowa Shopping Mall, Uganda. Premier corporate ready-to-wear boutique featuring premium clothing imported from Turkey, Egypt, China, and the UK.',
  openGraph: {
    title: 'Blue Hills Designers | Luxury Corporate Menswear',
    description: 'Lubowa Shopping Mall, Uganda. Premier corporate ready-to-wear boutique featuring premium clothing imported from Turkey, Egypt, China, and the UK.',
    siteName: 'Blue Hills Designers',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blue Hills Designers | Luxury Corporate Menswear',
    description: 'Lubowa Shopping Mall, Uganda. Premier corporate ready-to-wear boutique featuring premium clothing imported from Turkey, Egypt, China, and the UK.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-[#F7F5F0] text-[#1D2B3F] selection:bg-[#1C4D8D]/30 selection:text-[#1D2B3F]" suppressHydrationWarning>
        <Header />
        {children}
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
