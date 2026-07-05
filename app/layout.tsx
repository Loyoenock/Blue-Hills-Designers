import type {Metadata} from 'next';
import { Manrope, Cormorant_Garamond } from 'next/font/google';
import './globals.css'; // Global styles

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
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-[#F7F5F0] text-[#1D2B3F] selection:bg-[#1C4D8D]/30 selection:text-[#1D2B3F]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
