'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingBag, User, Heart, Menu, X, 
  Sparkles, ShieldCheck
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabaseClient } from '../lib/supabase';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useStore((state) => state.cart);
  const currentUser = useStore((state) => state.currentUser);
  const wishlist = useStore((state) => state.wishlist);
  const syncFromSupabase = useStore((state) => state.syncFromSupabase);
  const settings = useStore((state) => state.settings);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Subscribe to realtime products, reviews, orders & payments changes via shared hook
  useRealtimeSync({ products: true, reviews: true, orders: true, payments: true });

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    // Initial sync from the database
    syncFromSupabase();

    // Track last sync time for debounced visibility-change refetch (e.g. 15s debounce)
    let lastSyncTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Fallback catch-up: only refetch if at least 15 seconds have elapsed since last sync
        if (now - lastSyncTime >= 15000) {
          lastSyncTime = now;
          syncFromSupabase();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const supabase = getSupabaseClient();
    let authSubscription: any = null;

    if (supabase) {
      // Set up onAuthStateChange listener for session synchronization
      const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Header Supabase Auth Change:', event, !!session);
        if (event === 'SIGNED_OUT') {
          useStore.setState({ currentUser: null, currentUserId: null, wishlist: [], savedAddresses: [] });
        }
        lastSyncTime = Date.now();
        syncFromSupabase();
      });
      authSubscription = authSub;
    }

    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [syncFromSupabase]);

  useEffect(() => {
    if (currentUser?.mustChangePassword && pathname !== '/set-new-password') {
      router.push('/set-new-password');
    }
  }, [currentUser?.mustChangePassword, pathname, router]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { name: 'Collections', href: '/shop' },
    { name: 'AI Personal Stylist', href: '/#stylist', scroll: true },
    { name: "Men's Circle", href: '/#join-circle', scroll: true },
  ];

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-[#1D2B3F] border-b border-[#657892]/20 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <div className="font-serif text-xl md:text-2xl tracking-widest font-bold text-[#F7F5F0]">
            BLUE HILLS
          </div>
          <div className="w-12 h-6 bg-[#F7F5F0]/10 animate-pulse rounded"></div>
        </div>
      </header>
    );
  }

  return (
    <div className="sticky top-0 z-50 flex flex-col w-full">
      {settings?.enableNewsBanner !== false && (
        <div className="bg-[#C6A15B] text-[#1D2B3F] py-2 px-4 text-center text-[10px] md:text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 select-none w-full">
          <Sparkles className="w-3.5 h-3.5 text-[#1D2B3F] shrink-0" />
          <span>Complimentary Delivery over {settings?.currencySymbol || 'Ugx'} {settings?.freeShippingThreshold?.toLocaleString() || '2,000'} Across Kampala</span>
        </div>
      )}
      {settings?.maintenanceMode && (
        <div className="bg-red-600 text-white py-1.5 px-4 text-center text-[9px] md:text-[10px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 select-none w-full">
          <span>● Storefront Maintenance Mode Active: Ordering Restricted ●</span>
        </div>
      )}
      <header className="bg-[#1D2B3F] border-b border-[#657892]/20 py-4 transition-all duration-300 w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        {/* Mobile menu trigger */}
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden text-[#F7F5F0]/80 hover:text-[#C6A15B] transition-colors p-1"
          id="mobile-menu-trigger"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand Logo - Cormorant Garamond / font-serif */}
        <Link href="/" className="flex flex-col items-center md:items-start group">
          <span className="font-serif text-xl md:text-2xl lg:text-3xl tracking-widest font-bold text-[#F7F5F0] group-hover:text-[#C6A15B] transition-colors">
            BLUE HILLS
          </span>
          <span className="text-[9px] md:text-[10px] tracking-[0.3em] text-[#F7F5F0]/50 font-sans font-light mt-0.5 group-hover:text-[#F7F5F0]/80 transition-colors uppercase">
            Designers • Lubowa
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`text-sm tracking-wider uppercase transition-colors relative py-1 ${
                pathname === item.href 
                  ? 'text-[#C6A15B] font-medium' 
                  : 'text-[#F7F5F0]/70 hover:text-[#C6A15B]'
              }`}
            >
              {item.name}
              {pathname === item.href && (
                <motion.span 
                  layoutId="activeNavLine"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6A15B]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
          {/* Quick link for Admin Dashboard if logged in as Admin */}
          {currentUser && currentUser.role !== 'Customer' && (
            <Link 
              href="/admin"
              className="text-xs font-semibold tracking-widest uppercase bg-[#1C4D8D]/20 text-[#C6A15B] border border-[#C6A15B]/30 px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-[#1C4D8D]/40 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Action icons */}
        <div className="flex items-center space-x-3 md:space-x-5">
          {/* Wishlist Link */}
          <Link 
            href="/shop?filter=wishlist" 
            className="text-[#F7F5F0]/80 hover:text-[#C6A15B] relative transition-colors p-1"
            title="Wishlist"
            aria-label={wishlist.length > 0 ? `Wishlist, ${wishlist.length} items` : "Wishlist"}
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1C4D8D] text-[9px] font-bold text-[#F7F5F0] w-4 h-4 rounded-full flex items-center justify-center animate-pulse" aria-hidden="true">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Bag Link */}
          <Link 
            href="/cart" 
            className="text-[#F7F5F0]/80 hover:text-[#C6A15B] relative transition-colors p-1"
            title="Cart"
            id="desktop-cart-link"
            aria-label={cartCount > 0 ? `View cart, ${cartCount} items` : "View cart"}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C6A15B] text-[9px] font-bold text-[#1D2B3F] w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account Link */}
          <Link 
            href={currentUser ? "/account" : "/login"} 
            className={`p-1 transition-colors ${
              pathname === '/account' || pathname === '/login' ? 'text-[#C6A15B]' : 'text-[#F7F5F0]/80 hover:text-[#C6A15B]'
            }`}
            title="Account"
            aria-label={currentUser ? "View account profile" : "Sign in to account"}
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#1D2B3F]/70 z-50 md:hidden"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#1D2B3F] z-50 md:hidden flex flex-col justify-between border-r border-[#657892]/20"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-10">
                  <div className="font-serif text-lg tracking-widest font-bold text-[#F7F5F0]">
                    BLUE HILLS
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[#F7F5F0]/80 hover:text-[#C6A15B] p-1"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col space-y-6">
                  <Link 
                    href="/shop" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium tracking-wider text-[#F7F5F0] hover:text-[#C6A15B] transition-colors"
                  >
                    COLLECTIONS
                  </Link>
                  <Link 
                    href="/#stylist" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium tracking-wider text-[#F7F5F0] hover:text-[#C6A15B] transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-[#C6A15B]" />
                    AI STYLIST
                  </Link>
                  <Link 
                    href="/#join-circle" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium tracking-wider text-[#F7F5F0] hover:text-[#C6A15B] transition-colors"
                  >
                    MEN&apos;S CIRCLE
                  </Link>
                  {currentUser && currentUser.role !== 'Customer' && (
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium tracking-wider text-[#C6A15B] hover:text-white transition-colors flex items-center gap-2 border-t border-[#657892]/10 pt-4"
                    >
                      <ShieldCheck className="w-5 h-5 text-[#C6A15B]" />
                      ADMIN DASHBOARD
                    </Link>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="p-6 border-t border-[#657892]/20 bg-[#1D2B3F]/90">
                {currentUser ? (
                  <div className="flex flex-col space-y-2">
                    <div className="text-xs text-[#F7F5F0]/50">Logged in as</div>
                    <div className="font-medium text-[#F7F5F0] text-sm">{currentUser.name}</div>
                    <div className="text-[10px] tracking-widest uppercase font-mono text-[#C6A15B]">{currentUser.role}</div>
                    <Link 
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-2 text-xs bg-[#1C4D8D] text-[#F7F5F0] py-2 rounded text-center hover:bg-[#1C4D8D]/90 transition-all uppercase tracking-wider font-semibold"
                    >
                      My Elite Profile
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <p className="text-xs text-[#F7F5F0]/60">Experience our premium ready-made corporate collections.</p>
                    <Link 
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-xs border border-[#C6A15B] text-[#F7F5F0] py-2 rounded text-center hover:bg-[#F7F5F0]/5 transition-all uppercase tracking-wider"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </header>
    </div>
  );
}
