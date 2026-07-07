'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Shield, Calendar, Award } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Footer() {
  const settings = useStore((state) => state.settings);
  return (
    <footer className="bg-[#1D2B3F] border-t border-[#657892]/20 pt-20 pb-10 text-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Boutique Signature */}
        <div className="flex flex-col space-y-4">
          <span className="font-serif text-2xl tracking-widest font-bold text-[#F7F5F0]">
            BLUE HILLS
          </span>
          <p className="text-[#F7F5F0]/70 text-sm leading-relaxed max-w-sm">
            Uganda&apos;s premier ready-made corporate clothing boutique. Sourcing top-notch ready-to-wear business clothing from Turkey, Egypt, China, and the UK since 2018.
          </p>
          <div className="flex items-center space-x-3 text-[#C6A15B] text-xs font-semibold tracking-wider uppercase pt-2">
            <Award className="w-4 h-4" />
            <span>Lubowa Shopping Mall • Kampala</span>
          </div>
        </div>

        {/* Collections Links */}
        <div>
          <h4 className="font-serif text-[#F7F5F0] tracking-widest uppercase text-sm font-semibold mb-6">
            Our Collections
          </h4>
          <ul className="space-y-3">
            {[
              { name: 'Luxury Corporate Suits', href: '/shop?category=Suits' },
              { name: 'Elite Business Shirts', href: '/shop?category=Shirts' },
              { name: 'Hand-Finished Oxfords', href: '/shop?category=Shoes' },
              { name: 'Exquisite Accessories', href: '/shop?category=Accessories' },
            ].map((link) => (
              <li key={link.name}>
                <Link 
                  href={link.href}
                  className="text-[#F7F5F0]/60 hover:text-[#1C4D8D] text-sm transition-colors duration-200"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Brand & Experience */}
        <div>
          <h4 className="font-serif text-[#F7F5F0] tracking-widest uppercase text-sm font-semibold mb-6">
            Blue Hills
          </h4>
          <ul className="space-y-3">
            {[         
              { name: 'Speak to Personal Stylist', href: '/#stylist' },
              { name: 'The Gentlemen\'s Circle', href: '/#join-circle' },            
            ].map((link) => (
              <li key={link.name}>
                <Link 
                  href={link.href}
                  className="text-[#F7F5F0]/60 hover:text-[#1C4D8D] text-sm transition-colors duration-200"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Location & Contact */}
        <div className="space-y-4">
          <h4 className="font-serif text-[#F7F5F0] tracking-widest uppercase text-sm font-semibold mb-6">
            Our Location
          </h4>
          <div className="flex items-start space-x-3 text-sm text-[#F7F5F0]/70">
            <MapPin className="w-5 h-5 text-[#C6A15B] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#F7F5F0]">Lubowa Shopping Mall</p>
              <p className="text-xs text-[#F7F5F0]/40">Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[#F7F5F0]/70">
            <Phone className="w-5 h-5 text-[#C6A15B] shrink-0" />
            <span>{settings?.supportPhone || settings?.conciergePhone || '+256 (772) 123-456'}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[#F7F5F0]/70">
            <Mail className="w-5 h-5 text-[#C6A15B] shrink-0" />
            <span>support@bluehillsdesigners.com</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-[#F7F5F0]/40 border-t border-[#657892]/20 pt-3">
            <Calendar className="w-4 h-4 text-[#C6A15B]" />
            <span>{settings?.showroomHours || 'Sun - Friday: 9:00 AM - 7:00 PM'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 border-t border-[#657892]/20 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#F7F5F0]/40">
        <p>© {new Date().getFullYear()} Blue Hills Designers. All Rights Reserved. Kampala, Uganda.</p>
        <div className="flex items-center space-x-6 mt-4 md:mt-0 font-mono">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#C6A15B]" /> Secure AES-256 SSL Protocol
          </span>
          <span className="hover:text-[#C6A15B] transition-colors cursor-pointer">Privacy Charter</span>
          <span className="hover:text-[#C6A15B] transition-colors cursor-pointer">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
