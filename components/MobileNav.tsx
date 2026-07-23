'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, User, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect, useState } from 'react';

export default function MobileNav() {
  const pathname = usePathname();
  const cart = useStore((state) => state.cart);
  const wishlist = useStore((state) => state.wishlist);
  const currentUser = useStore((state) => state.currentUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Stylist', href: '/#stylist', icon: Sparkles, badge: null },
    { name: 'Wishlist', href: '/shop?filter=wishlist', icon: Heart, badge: wishlist.length > 0 ? wishlist.length : null },
    { name: 'Profile', href: currentUser ? '/account' : '/login', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1D2B3F] border-t border-[#657892]/20 py-2.5 z-40 md:hidden shadow-xl">
      <div className="grid grid-cols-5 items-center justify-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.name === 'Wishlist' && pathname === '/shop' && item.badge !== null);
          
          let ariaLabel = item.name;
          if (item.name === 'Shop' && cartCount > 0) {
            ariaLabel = `Shop, ${cartCount} items in cart`;
          } else if (item.name === 'Wishlist' && item.badge && item.badge > 0) {
            ariaLabel = `Wishlist, ${item.badge} saved items`;
          }

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className="flex flex-col items-center justify-center relative group"
              aria-label={ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative p-1">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'text-[#C6A15B] scale-110' : 'text-[#F7F5F0]/60 hover:text-[#C6A15B]'
                }`} />
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C6A15B] text-[8px] font-bold text-[#1D2B3F] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {item.name === 'Shop' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C6A15B] text-[8px] font-bold text-[#1D2B3F] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] tracking-wider mt-0.5 uppercase transition-colors duration-200 ${
                isActive ? 'text-[#C6A15B] font-medium' : 'text-[#F7F5F0]/40'
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
