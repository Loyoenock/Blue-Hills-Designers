'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, Award, Truck, ShieldCheck, UserCheck, Star, 
  Heart, ShoppingCart, Clock, Sparkles, CheckCircle2, Eye, Calendar
} from 'lucide-react';
import { useStore } from '../store/useStore';
import AIStylist from '@/components/AIStylist';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { getSafeImageSrc } from '../lib/utils';

function getTimeLeftFromEnd(endMs: number) {
  const diffMs = endMs - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

export default function HomeClient() {
  const router = useRouter();
  const { 
    products, addToCart, wishlist, toggleWishlist, bookConsultation, subscribeNewsletter, settings, isSyncing, testimonials 
  } = useStore();
  const currency = settings?.currencySymbol || 'Ugx';
  
  const [mounted, setMounted] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [addedAlert, setAddedAlert] = useState(false);

  // Booking Consultation state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Newsletter state
  const [newsEmail, setNewsEmail] = useState('');
  const [newsSuccess, setNewsSuccess] = useState('');
  const [newsError, setNewsError] = useState('');

  // Countdown timer for Deal of the Day
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const endMsRef = useRef<number | null>(null);
  const dealKeyRef = useRef<string | null>(null);

  // Testimonial index slider
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const activeTestimonials = useMemo(() => {
    return (testimonials || [])
      .filter(t => t.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [testimonials]);

  // Filter products for featured, new, and deal of the day
  const featuredProducts = products.filter(p => p.isFeatured && !p.isDealOfTheDay).slice(0, 3);
  const newArrivals = products.filter(p => p.isNew && !p.isDealOfTheDay).slice(0, 4);
  const dealProduct = products.find(p => p.isDealOfTheDay);

  // Synchronize endMsRef and timeLeft with dealProduct when identity or timer config changes
  useEffect(() => {
    if (!dealProduct) return;

    const dealKey = `${dealProduct.id}_${dealProduct.dealExpiresAt || ''}_${dealProduct.dealDays ?? ''}_${dealProduct.dealHours ?? ''}_${dealProduct.dealMins ?? ''}_${dealProduct.dealSecs ?? ''}`;

    if (dealKeyRef.current !== dealKey || endMsRef.current === null) {
      dealKeyRef.current = dealKey;
      if (dealProduct.dealExpiresAt) {
        const expiresMs = new Date(dealProduct.dealExpiresAt).getTime();
        if (Number.isFinite(expiresMs) && expiresMs > Date.now()) {
          endMsRef.current = expiresMs;
        } else {
          endMsRef.current = Date.now();
        }
      } else {
        endMsRef.current = Date.now();
      }
      setTimeLeft(getTimeLeftFromEnd(endMsRef.current));
    }
  }, [
    dealProduct?.id,
    dealProduct?.dealExpiresAt,
    dealProduct?.dealDays,
    dealProduct?.dealHours,
    dealProduct?.dealMins,
    dealProduct?.dealSecs
  ]);

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setMounted(true);
    }, 0);

    // Deal of the day countdown interval
    const timer = setInterval(() => {
      if (endMsRef.current !== null) {
        setTimeLeft(getTimeLeftFromEnd(endMsRef.current));
      }
    }, 1000);

    // Testimonials auto slide
    const testimonialsTimer = setInterval(() => {
      setCurrentTestimonial(prev => {
        const len = activeTestimonials.length;
        if (len === 0) return 0;
        return (prev + 1) % len;
      });
    }, 6000);

    return () => {
      clearInterval(timer);
      clearInterval(testimonialsTimer);
      clearTimeout(mountTimer);
    };
  }, [activeTestimonials.length]);

  if (!mounted) return null;

  const handleOpenQuickView = (p: Product) => {
    setQuickViewProduct(p);
    setSelectedSize(p.sizes[0] || '');
    setSelectedColor(p.colors[0] || '');
    setQty(1);
  };

  const handleQuickAdd = (p: Product) => {
    const size = p.sizes[0] || 'One Size';
    const color = p.colors[0] || 'Default';
    addToCart(p, size, color, 1);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  const handleAddFromQuickView = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct, selectedSize, selectedColor, qty);
    setQuickViewProduct(null);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess(false);

    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim() || !bookingDate || !bookingTime) {
      setBookingError('Please fill in all required fields to secure your session.');
      return;
    }

    try {
      const res = await bookConsultation({
        clientName,
        clientEmail,
        clientPhone,
        date: bookingDate,
        time: bookingTime,
        notes: bookingNotes
      });
      if (res && !res.success) {
        setBookingError(res.error || 'Failed to submit booking. Please try again.');
        return;
      }
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingOpen(false);
        // Reset form
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setBookingDate('');
        setBookingTime('');
        setBookingNotes('');
      }, 3000);
    } catch (err: any) {
      setBookingError(err?.message || 'An error occurred while securing your appointment. Please try again.');
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsSuccess('');
    setNewsError('');

    if (!newsEmail.trim() || !newsEmail.includes('@')) {
      setNewsError('Please provide a valid executive email address.');
      return;
    }

    try {
      const res = subscribeNewsletter(newsEmail);
      if (res.success) {
        setNewsSuccess(res.message);
        setNewsEmail('');
      } else {
        setNewsError(res.message);
      }
    } catch (err: any) {
      setNewsError(err?.message || 'An error occurred while subscribing. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Structured JSON-LD Data for local business SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ClothingStore',
            'name': 'Blue Hills Designers',
            'image': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmpv6v2jUImM-jAyTmG0q-i13M_jPYdiZXbf68Zl2bCdBouS5ywBgJ1WwTCNIftLOEUDY3cwSepn8ah0xGo8iYnF_ZciO0DY-ap3YOoWwyMMcx9oEq5PyC2MMYkCrqUhb66K4fDd8g5_bLA0pMH40J4VVr96tUHzvQ5xuyY0fmuYnTEE5Xic_YBbFkMW5R2uGTnRXTmyjwWu40540eKlc-StS0rh-0qA8vXaNhplpCJixzWGFaCPIUHg',
            'description': 'Luxury corporate menswear boutique at Lubowa Shopping Mall, Entebbe Road, Kampala. Featuring premium sourced ready-to-wear clothing from Turkey, Egypt, China, and the UK.',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': 'Lubowa Shopping Mall, Ground Floor, Entebbe Road',
              'addressLocality': 'Kampala',
              'addressRegion': 'Central',
              'addressCountry': 'UG'
            },
            'geo': {
              '@type': 'GeoCoordinates',
              'latitude': 0.2647,
              'longitude': 32.5714
            },
            'url': 'https://blue-hills-designers.com',
            'telephone': '+256772123456',
            'priceRange': '$$$',
            'openingHoursSpecification': {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday'
              ],
              'opens': '08:00',
              'closes': '21:00'
            }
          })
        }}
      />

      {/* Added Alert Notification */}
      <AnimatePresence>
        {addedAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-16 left-1/2 z-50 bg-[#C6A15B] text-[#1D2B3F] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-semibold tracking-wider uppercase"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Added to executive wardrobe</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Cinematic Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmpv6v2jUImM-jAyTmG0q-i13M_jPYdiZXbf68Zl2bCdBouS5ywBgJ1WwTCNIftLOEUDY3cwSepn8ah0xGo8iYnF_ZciO0DY-ap3YOoWwyMMcx9oEq5PyC2MMYkCrqUhb66K4fDd8g5_bLA0pMH40J4VVr96tUHzvQ5xuyY0fmuYnTEE5Xic_YBbFkMW5R2uGTnRXTmyjwWu40540eKlc-StS0rh-0qA8vXaNhplpCJixzWGFaCPIUHg" 
            alt="Luxury corporate African male model, premium tailored suit"
            fill
            className="object-cover object-top filter brightness-45 contrast-105 scale-105"
            priority
            referrerPolicy="no-referrer"
          />
          {/* Subtle gradient overlays using deep brand color */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F] via-[#1D2B3F]/25 to-[#1D2B3F]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1D2B3F]/80 via-transparent to-[#1D2B3F]/30" />
        </div>

        {/* Content Panel */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 w-full z-10 relative flex flex-col items-center md:items-start text-center md:text-left pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl space-y-6"
          >
            <span className="text-xs tracking-[0.4em] uppercase font-semibold text-[#C6A15B] block font-sans">
              Blue Hills Designers • Premium Sourced Ready-to-Wear
            </span>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1]">
              Dress Like The Man You Intend To Become.
            </h1>
            <p className="text-white/70 text-lg md:text-xl font-light leading-relaxed max-w-xl">
              High-quality ready-made corporate clothing sourced from Turkey, Egypt, China, and the UK. Experience premium style made simple for working class professionals.
            </p>
            
            {/* CTA Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
              <Link 
                href="/shop"
                className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-90 px-8 py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-[#1C4D8D]/20 flex items-center gap-2"
                id="hero-shop-cta"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => setBookingOpen(true)}
                className="bg-black/50 backdrop-blur-md text-white border border-white/20 hover:border-white hover:bg-white/5 px-8 py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                id="hero-booking-cta"
              >
                <Calendar className="w-4 h-4 text-[#C6A15B]" />
                <span>Book Consultation</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Atelier Location Badge */}
        <div className="absolute bottom-8 right-8 z-10 hidden lg:flex items-center gap-3.5 bg-black/70 backdrop-blur-md border border-white/10 p-4 rounded-xl max-w-xs font-sans">
          <div className="w-10 h-10 rounded-full bg-[#1C4D8D]/10 border border-[#1C4D8D]/40 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-[#C6A15B]" />
          </div>
          <div>
            <h4 className="text-white font-medium text-xs tracking-wider uppercase">Lubowa Shopping Mall</h4>
            <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Ground Floor, Entebbe Road, Kampala</p>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="bg-[#1D2B3F] border-y border-[#657892]/20 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Award, title: "Premium Sourcing", desc: "Top-notch ready-made clothes from Turkey, Egypt, China, & UK" },
            { icon: Truck, title: "Convenient Delivery", desc: "Delivered straight to your office in Kampala" },
            { icon: ShieldCheck, title: "Secure Payments", desc: "Mobile Money, Card, or Cash on Delivery" },
            { icon: UserCheck, title: "Personal Styling", desc: "Expert styling tips at our Lubowa showroom" }
          ].map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div key={index} className="flex items-start gap-4 p-2">
                <div className="w-12 h-12 rounded-xl bg-[#F7F5F0]/10 border border-[#657892]/20 flex items-center justify-center shrink-0 text-[#C6A15B]">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-white text-sm font-semibold tracking-wide uppercase">{feat.title}</h4>
                  <p className="text-xs text-white/55 leading-relaxed mt-1 font-light">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CATEGORY GRID */}
      {/* Note: This curated section assumes the four default category names ('Suits', 'Shirts', 'Shoes', 'Accessories') continue to exist in the system */}
      <section className="py-24 bg-[#F7F5F0]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">The Wardrobe</span>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#1D2B3F] mt-3">Curated Departments</h2>
            <p className="text-[#657892] text-sm md:text-base max-w-xl mx-auto mt-4 font-light">Explore hand-made menswear crafted from premium fibers suited for the boardroom or diplomatic summit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Suits & Blazers",
                count: `${products.filter(p => p.category === 'Suits').length || 6} Items`,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw",
                category: "Suits"
              },
              {
                name: "Formal Shirts",
                count: `${products.filter(p => p.category === 'Shirts').length || 4} Items`,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuChMtp4jLNpzg9FCNudNK17V5dgPQ7gdqkInztWABOY1s9Wo0WquLDnHGVLaFpcTJ4l9h6f7O76xtk__qJO_Ydu6Yi8rjMn_p2JvvfRREDwwJDPBy83dd3IQCntFWraFkYmJ3LGWRlxwD6c1rBnh-lIF619KM6eoScw650fwNxZT1n7azvn0SlmFjNVIFyK5tBpwfFwh1WTbVRuvsh2okhFkLe5EGxiuvMmY0nIuf3ePWzFrNsg5MqpzA",
                category: "Shirts"
              },
              {
                name: "Elite Footwear",
                count: `${products.filter(p => p.category === 'Shoes').length || 3} Items`,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBJyBXI8NaRR-Ck9F2JIpri68oWsCpNA7Ie-oMwo57RWPijvkzyQJtObOPa0rGqyJX9b2iSarTYZ0B-ZUf5YMtgLQLVIFHtgXW-hXS8HqXtoVijqL3nTsOuMFOmp8oazTtu0fjyeKdouINqfmtXIPlV_BiBb50VRTLlLwy-kRcaqVwlXhGkWDIIi3Z_0V7dZlsIQyDe7Swp-FIz1670sbanWFsYnbJPpp_gKYtjtWNCKOGLCw9haspdWA",
                category: "Shoes"
              },
              {
                name: "Luxury Accessories",
                count: `${products.filter(p => p.category === 'Accessories').length || 2} Items`,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD3GGmGC1lq3ebCU1W9mOX-CfsyMwa4SWAdF9TyTo1wg7-ga-zvcf_MDn5JW_wtISyBjg2HNciG8q-CCdHS96i2TIsWXLlFbJDRpyNsOVqrcftwcWSFDQKUyp1N6J5g21PI941CMbXy5XaX2bncnqHxnDRk1QnC9Doz53_m_8W99oeomA9E9yp8Sz40LQVf9o_x1ayUjuzCDH6sxZrKUsxdw4tpyjR1Z5guKYUyAkqbvsKk9IWfUaMlDw",
                category: "Accessories"
              }
            ].map((cat, index) => (
              <Link 
                href={`/shop?category=${cat.category}`} 
                key={index}
                className="relative h-[480px] rounded-2xl overflow-hidden group block"
              >
                <Image 
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-95" />
                
                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] tracking-widest text-[#C6A15B] font-mono uppercase">{cat.count}</span>
                    <h3 className="font-serif text-xl md:text-2xl text-white font-medium">{cat.name}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white group-hover:bg-[#1C4D8D] group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-24 bg-[#B9CDE5]/20 border-t border-[#657892]/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-semibold">Prestige Selects</span>
              <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#1D2B3F] mt-3">Featured Essentials</h2>
            </div>
            <Link 
              href="/shop"
              className="text-[#1D2B3F] hover:text-[#C6A15B] text-xs font-semibold tracking-widest uppercase flex items-center gap-2 group transition-colors"
            >
              <span>Explore Entire Collection</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isSyncing && featuredProducts.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`featured-skeleton-${i}`} className="bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md h-[550px] animate-pulse">
                  <div className="relative h-[360px] bg-neutral-200" />
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="h-6 bg-neutral-300 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-neutral-200 rounded w-1/4 animate-pulse" />
                    </div>
                    <div className="space-y-2 flex-1 pt-2">
                      <div className="h-3 bg-neutral-200 rounded w-full animate-pulse" />
                      <div className="h-3 bg-neutral-200 rounded w-5/6 mt-2 animate-pulse" />
                    </div>
                    <div className="border-t border-[#657892]/10 pt-4 flex justify-between">
                      <div className="h-4 bg-neutral-200 rounded w-1/3 animate-pulse" />
                      <div className="h-4 bg-neutral-200 rounded w-1/4 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              featuredProducts.map((p) => {
                const inWishlist = wishlist.includes(p.id);
                return (
                  <div key={p.id} className="bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden group hover:border-[#1C4D8D]/30 transition-all duration-300 flex flex-col justify-between shadow-md">
                    {/* Image container */}
                    <div className="relative h-[360px] overflow-hidden bg-[#F7F5F0]">
                      <Image 
                        src={getSafeImageSrc(p.images?.[0])}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Department badge */}
                      <span className="absolute top-4 left-4 bg-[#1D2B3F]/80 backdrop-blur-md text-[#F7F5F0] border border-[#657892]/20 text-[9px] font-mono font-semibold uppercase px-2.5 py-1 rounded">
                        {p.category}
                      </span>

                      {/* Stock indicator if low */}
                      {p.stock <= 10 && (
                        <span className="absolute top-4 right-4 bg-red-950/80 border border-red-500/20 text-red-400 text-[9px] font-mono px-2.5 py-1 rounded">
                          Limited: {p.stock} Left
                        </span>
                      )}

                      {/* Hover controls */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenQuickView(p)}
                          className="w-11 h-11 rounded-full bg-[#1D2B3F]/80 text-[#F7F5F0] hover:bg-[#1C4D8D] transition-all flex items-center justify-center border border-[#657892]/20 shadow-lg cursor-pointer"
                          title="Quick View"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={() => handleQuickAdd(p)}
                          className="w-11 h-11 rounded-full bg-[#1D2B3F]/80 text-[#F7F5F0] hover:bg-[#C6A15B] hover:text-[#1D2B3F] transition-all flex items-center justify-center border border-[#657892]/20 shadow-lg cursor-pointer"
                          title="Add to Wardrobe"
                        >
                          <ShoppingCart className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body details */}
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <h3 className="font-serif text-lg md:text-xl text-[#1D2B3F] font-medium group-hover:text-[#1C4D8D] transition-colors">
                            {p.name}
                          </h3>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[#C6A15B] fill-[#C6A15B]" />
                            <span className="text-xs text-[#657892] font-medium font-mono">{p.rating}</span>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-[#1D2B3F] text-lg">
                          {currency} {p.price}
                        </div>
                      </div>

                      <p className="text-[#657892] text-xs font-light leading-relaxed line-clamp-2">
                        {p.description}
                      </p>

                      <div className="border-t border-[#657892]/10 pt-4 flex items-center justify-between">
                        <button 
                          onClick={() => toggleWishlist(p.id)}
                          className={`text-xs flex items-center gap-1.5 transition-colors ${
                            inWishlist ? 'text-red-500' : 'text-[#657892]/60 hover:text-[#1C4D8D]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{inWishlist ? 'Wishlisted' : 'Add to Wishlist'}</span>
                        </button>
                        <Link 
                          href={`/shop`}
                          className="text-[10px] uppercase font-mono tracking-wider text-[#1C4D8D] hover:text-[#C6A15B] transition-colors"
                        >
                          Tailoring Guides
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* DEAL OF THE DAY (Lubowa Camel Hair Overcoat) */}
      {(settings?.enableSecretOffer !== false && dealProduct) ? (
        <section className="py-24 bg-[#1D2B3F] border-t border-[#657892]/20 relative overflow-hidden">
          {/* Visual embellishment */}
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#B9CDE5]/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Column */}
            <div className="lg:col-span-5 relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-[#657892]/20 group">
              <Image 
                src={getSafeImageSrc(dealProduct.images?.[0])}
                alt={dealProduct.name}
                fill
                className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 40vw"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Discount Ribbon */}
              <div className="absolute top-6 left-6 bg-[#C6A15B] text-[#1D2B3F] px-4 py-1.5 rounded text-xs font-mono font-bold tracking-widest uppercase shadow-lg">
                Exclusive {dealProduct.discountPercentage}% Privilege
              </div>
            </div>

            {/* Copy Column */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C6A15B] animate-ping"></span>
                  <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-bold font-mono">
                    Gentlemen&apos;s Secret Offer • Limited Run
                  </span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-[#F7F5F0]">
                  {dealProduct.name}
                </h2>
                <p className="text-[#F7F5F0]/70 text-base md:text-lg leading-relaxed font-light">
                  {dealProduct.description}
                </p>
              </div>

              {/* Countdown Board */}
              <div className="space-y-3">
                <h4 className="text-[#F7F5F0]/40 text-[10px] tracking-widest uppercase font-mono">Atelier reservation lines close in:</h4>
                <div className="flex gap-4">
                  {[
                    { val: timeLeft.days, label: "Days" },
                    { val: timeLeft.hours, label: "Hours" },
                    { val: timeLeft.minutes, label: "Mins" },
                    { val: timeLeft.seconds, label: "Secs" }
                  ].map((block, i) => (
                    <div key={i} className="flex flex-col items-center bg-[#1C4D8D]/20 border border-[#657892]/30 rounded-xl px-5 py-3 min-w-[70px] shadow-lg">
                      <span className="font-mono text-2xl md:text-3xl font-bold text-[#C6A15B]">
                        {block.val.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[9px] text-[#F7F5F0]/40 uppercase tracking-widest mt-1 font-sans">{block.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Reservation detail */}
              <div className="flex items-center gap-6 border-y border-[#657892]/20 py-6">
                <div>
                  <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-widest font-mono">Standard Registry</div>
                  <div className="text-[#F7F5F0]/40 text-lg line-through font-mono mt-0.5">{currency} {dealProduct.price}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#C6A15B] uppercase tracking-widest font-mono">Privilege Price</div>
                  <div className="text-[#F7F5F0] text-3xl font-bold font-mono mt-0.5">
                    {currency} {Math.floor(dealProduct.price * (1 - (dealProduct.discountPercentage || 0) / 100))}
                  </div>
                </div>
                <div className="border-l border-[#657892]/25 pl-6 space-y-1">
                  <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-widest font-mono">Showroom Stock</div>
                  <div className="text-red-400 text-xs font-semibold flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    Only {dealProduct.stock} coats remaining
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleQuickAdd(dealProduct)}
                  className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-8 py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-[#1C4D8D]/20 text-center cursor-pointer"
                  id="deal-reserve-btn"
                >
                  Reserve Offer & Add to Cart
                </button>
                <button 
                  onClick={() => {
                    handleOpenQuickView(dealProduct);
                  }}
                  className="bg-transparent text-[#F7F5F0] border border-[#F7F5F0]/30 hover:border-[#C6A15B] px-8 py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all text-center cursor-pointer"
                >
                  Inquire Sizing
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        isSyncing && (
          <section className="py-24 bg-[#1D2B3F] border-t border-[#657892]/20 relative overflow-hidden animate-pulse">
            <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 h-[500px] md:h-[600px] rounded-2xl bg-[#657892]/10 border border-[#657892]/20" />
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <div className="h-4 bg-[#657892]/20 rounded w-1/3" />
                  <div className="h-12 bg-[#657892]/20 rounded w-2/3 animate-pulse" />
                  <div className="h-20 bg-[#657892]/20 rounded w-full animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-[#657892]/20 rounded w-1/4" />
                  <div className="flex gap-4">
                    <div className="h-16 w-20 bg-[#657892]/20 rounded-xl animate-pulse" />
                    <div className="h-16 w-20 bg-[#657892]/20 rounded-xl animate-pulse" />
                    <div className="h-16 w-20 bg-[#657892]/20 rounded-xl animate-pulse" />
                  </div>
                </div>
                <div className="h-1 bg-[#657892]/10" />
                <div className="flex gap-4">
                  <div className="h-12 w-40 bg-[#657892]/20 rounded animate-pulse" />
                  <div className="h-12 w-40 bg-[#657892]/20 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </section>
        )
      )}

      {/* NEW ARRIVALS */}
      <section className="py-24 bg-[#F7F5F0] border-t border-[#657892]/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Seasonal Drop</span>
            <h2 className="font-serif text-3xl md:text-5xl tracking-tight text-[#1D2B3F] mt-3 font-medium">New Additions</h2>
            <p className="text-[#657892] text-sm md:text-base max-w-xl mx-auto mt-4 font-light">Explore our newest ready-made outfits, perfect for daily office work and corporate meetings, imported directly from Turkey, Egypt, China, and the UK.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isSyncing && newArrivals.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`new-skeleton-${i}`} className="bg-[#F7F5F0] border border-[#657892]/20 rounded-xl overflow-hidden flex flex-col justify-between shadow-md h-[380px] animate-pulse">
                  <div className="relative h-[280px] bg-neutral-200" />
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-3 bg-neutral-200 rounded w-1/3 animate-pulse" />
                      <div className="h-5 bg-neutral-200 rounded w-3/4 animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#657892]/10">
                      <div className="h-4 bg-neutral-200 rounded w-1/4 animate-pulse" />
                      <div className="h-4 bg-neutral-200 rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              newArrivals.map((p) => {
                const inWishlist = wishlist.includes(p.id);
                return (
                  <div key={p.id} className="group bg-[#F7F5F0] border border-[#657892]/20 rounded-xl overflow-hidden hover:border-[#1C4D8D]/20 transition-all flex flex-col justify-between shadow-md">
                    <div className="relative h-[280px] overflow-hidden bg-[#F7F5F0]">
                      <Image 
                        src={getSafeImageSrc(p.images?.[0])}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      
                      {/* NEW ribbon badge */}
                      <span className="absolute top-3 left-3 bg-[#C6A15B] text-[#1D2B3F] text-[8px] font-mono font-extrabold tracking-widest uppercase px-2 py-0.5 rounded shadow">
                        NEW
                      </span>

                      <button 
                        onClick={() => toggleWishlist(p.id)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F7F5F0]/80 backdrop-blur-md flex items-center justify-center text-[#1D2B3F]/60 hover:text-red-500 transition-colors border border-[#657892]/20"
                        title="Wishlist"
                      >
                        <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#C6A15B] block">{p.category}</span>
                      <h3 className="font-serif text-base text-[#1D2B3F] font-medium group-hover:text-[#1C4D8D] transition-colors line-clamp-1">{p.name}</h3>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-mono text-sm font-semibold text-[#1D2B3F]/90">{currency} {p.price}</span>
                        <button 
                          onClick={() => handleQuickAdd(p)}
                          className="text-[10px] tracking-widest uppercase font-mono text-[#1C4D8D] font-semibold hover:text-[#C6A15B] transition-colors cursor-pointer"
                        >
                          + Quick Purchase
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {activeTestimonials.length > 0 && (
        <section className="py-24 bg-[#1D2B3F] border-t border-[#657892]/20 overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#B9CDE5]/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="max-w-4xl mx-auto px-4 md:px-8 text-center space-y-12">
            <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-semibold">Testimonials</span>
            
            <div className="h-[280px] md:h-[220px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial % activeTestimonials.length}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <blockquote className="font-serif text-xl md:text-3xl text-[#F7F5F0]/90 italic leading-relaxed max-w-2xl mx-auto">
                    &ldquo;{activeTestimonials[currentTestimonial % activeTestimonials.length].quote}&rdquo;
                  </blockquote>
                  
                  <div className="space-y-1">
                    <h4 className="font-serif text-base font-semibold text-[#C6A15B] tracking-wider uppercase">
                      {activeTestimonials[currentTestimonial % activeTestimonials.length].name}
                    </h4>
                    <p className="text-xs text-[#F7F5F0]/60 uppercase tracking-widest font-mono">
                      {activeTestimonials[currentTestimonial % activeTestimonials.length].role}
                      {activeTestimonials[currentTestimonial % activeTestimonials.length].role && activeTestimonials[currentTestimonial % activeTestimonials.length].company ? ' • ' : ''}
                      {activeTestimonials[currentTestimonial % activeTestimonials.length].company}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Stepper Dots */}
            <div className="flex justify-center gap-2 pt-4">
              {activeTestimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    (currentTestimonial % activeTestimonials.length) === idx ? 'bg-[#C6A15B] w-6' : 'bg-[#F7F5F0]/10'
                  }`}
                  title={`View slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AI PERSONAL STYLIST INTEGRATION */}
      <AIStylist />

      {/* NEWSLETTER */}
      <section id="join-circle" className="py-24 bg-[#B9CDE5]/20 border-t border-[#657892]/20">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center space-y-8">
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">The Registry</span>
            <h2 className="font-serif text-3xl md:text-5xl text-[#1D2B3F] tracking-tight">Join the Gentlemen&apos;s Circle</h2>
            <p className="text-[#657892] text-sm md:text-base max-w-xl mx-auto leading-relaxed font-light">
              Join our mailing list to receive style tips, updates on new stock arrivals, and special discount offers at our Lubowa showroom.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 bg-[#F7F5F0] p-1.5 rounded-xl border border-[#657892]/20 focus-within:border-[#1C4D8D] transition-colors">
              <input 
                type="email"
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                placeholder="Submit executive email address..."
                className="bg-transparent border-0 outline-none ring-0 text-sm py-2 px-3 text-[#1D2B3F] placeholder-[#657892]/50 flex-1 focus:ring-0"
                required
                id="newsletter-email-input"
              />
              <button 
                type="submit"
                className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer font-sans"
                id="newsletter-submit-btn"
              >
                Men&apos;s Circle
              </button>
            </div>
            {newsSuccess && (
              <p className="text-[#1C4D8D] text-xs font-semibold mt-3 animate-fade-in font-mono">{newsSuccess}</p>
            )}
            {newsError && (
              <p className="text-red-500 text-xs font-semibold mt-3 animate-fade-in font-mono">{newsError}</p>
            )}
          </form>

          {/* Benefits strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-xs text-[#657892] pt-6 border-t border-[#657892]/20 font-mono">
            <div>• Private Sizing Archiving</div>
            <div>• Tailor Concierge Direct Lines</div>
            <div>• Early Private Sale Access</div>
          </div>
        </div>
      </section>

      {/* PRODUCT QUICK VIEW MODAL */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewProduct(null)}
              className="absolute inset-0 bg-black"
            />
            {/* Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto relative z-10 p-6 md:p-8 text-[#1D2B3F]"
              id="quickview-modal"
            >
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 text-[#657892] hover:text-[#1D2B3F] p-1"
                id="close-quickview-btn"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                {/* Image preview */}
                <div className="relative h-[300px] md:h-[400px] rounded-xl overflow-hidden border border-[#657892]/10">
                  <Image 
                    src={getSafeImageSrc(quickViewProduct.images?.[0])}
                    alt={quickViewProduct.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details purchase panel */}
                <div className="flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] tracking-widest text-[#C6A15B] font-mono uppercase">{quickViewProduct.category}</span>
                    <h3 className="font-serif text-2xl text-[#1D2B3F] font-bold">{quickViewProduct.name}</h3>
                    <div className="font-mono text-xl text-[#1D2B3F] font-bold">{currency} {quickViewProduct.price}</div>
                    <p className="text-[#657892] text-xs font-light leading-relaxed">
                      {quickViewProduct.description}
                    </p>
                  </div>

                  {/* Size select */}
                  {quickViewProduct.sizes.length > 0 && quickViewProduct.sizes[0] !== 'One Size' && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#657892]/60 uppercase tracking-widest font-mono font-medium">Select Size (Sizing guidelines apply)</label>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.sizes.map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all ${
                              selectedSize === sz 
                                ? 'bg-[#1D2B3F] text-[#F7F5F0] border-[#1D2B3F]' 
                                : 'border-[#657892]/20 text-[#1D2B3F] hover:border-[#1D2B3F]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color select */}
                  {quickViewProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#657892]/60 uppercase tracking-widest font-mono font-medium">Select Color</label>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.colors.map((cl) => (
                          <button
                            key={cl}
                            onClick={() => setSelectedColor(cl)}
                            className={`px-3 py-1.5 rounded text-xs border font-mono transition-all ${
                              selectedColor === cl 
                                ? 'bg-[#1C4D8D] text-[#F7F5F0] border-[#1C4D8D]' 
                                : 'border-[#657892]/20 text-[#1D2B3F]/80 hover:border-[#1C4D8D]'
                            }`}
                          >
                            {cl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Qty controls & Add to Cart button */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-[#657892]/20 rounded bg-[#B9CDE5]/20">
                        <button 
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F]"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-mono text-sm text-[#1D2B3F] font-semibold">{qty}</span>
                        <button 
                          onClick={() => setQty(qty + 1)}
                          className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F]"
                        >
                          +
                        </button>
                      </div>

                      <button 
                        onClick={handleAddFromQuickView}
                        className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-[#1C4D8D]/90 px-6 py-2.5 rounded font-semibold uppercase tracking-widest text-xs flex-1 text-center transition-all cursor-pointer"
                        id="add-from-quickview-btn"
                      >
                        Add to Wardrobe
                      </button>
                    </div>

                    <div className="text-[10px] text-center text-[#657892]/50 font-mono">
                      Free delivery included. Sizing advice available on demand.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BESPOKE TAILORING CONSULTATION BOOKING MODAL */}
      <AnimatePresence>
        {bookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookingOpen(false)}
              className="absolute inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#F7F5F0] border border-[#657892]/25 rounded-2xl overflow-hidden max-w-xl w-full z-10 relative p-6 md:p-8 text-[#1D2B3F]"
              id="booking-consultation-modal"
            >
              <button 
                onClick={() => setBookingOpen(false)}
                className="absolute top-4 right-4 text-[#657892] hover:text-[#1D2B3F] p-1"
                id="close-booking-modal-btn"
              >
                ✕
              </button>

              <div className="text-center space-y-2 mb-6">
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#C6A15B] font-mono font-semibold">Boutique Showroom Scheduling</span>
                <h3 className="font-serif text-2xl text-[#1D2B3F] font-bold">Reserve Styling Consultation</h3>
                <p className="text-[#657892] text-xs font-light">Book a personal styling consultation session with our friendly staff at our Lubowa Shopping Mall showroom.</p>
              </div>

              {bookingSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#C6A15B]/10 text-[#C6A15B] flex items-center justify-center mx-auto border border-[#C6A15B]/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-lg text-[#1D2B3F] font-semibold">Lounge Reserved Successfully</h4>
                  <p className="text-xs text-[#657892] max-w-sm mx-auto leading-relaxed">
                    Your appointment request has been recorded. Our showroom staff will reach out to confirm your slot soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4 font-sans">
                  <div>
                    <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Your Executive Name</label>
                    <input 
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Charles Mugisha"
                      className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] placeholder-[#657892]/40 focus:border-[#1C4D8D]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Secure Email</label>
                      <input 
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="mugisha@corporate.com"
                        className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] placeholder-[#657892]/40 focus:border-[#1C4D8D]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Phone Contact</label>
                      <input 
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="+256 772 123456"
                        className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] placeholder-[#657892]/40 focus:border-[#1C4D8D]"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Preferred Date</label>
                      <input 
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] focus:border-[#1C4D8D]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Preferred Time</label>
                      <input 
                        type="time"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] focus:border-[#1C4D8D]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono block mb-1">Style notes or preferences (Optional)</label>
                    <textarea 
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="e.g. Fitting for midnight navy wedding suit or corporate overcoats..."
                      rows={3}
                      className="w-full bg-[#F7F5F0] border border-[#657892]/20 rounded px-3 py-2 text-sm text-[#1D2B3F] placeholder-[#657892]/40 focus:border-[#1C4D8D]"
                    />
                  </div>
                  
                  {bookingError && (
                    <p className="text-red-500 text-xs font-semibold animate-fade-in font-mono text-center pt-1">{bookingError}</p>
                  )}

                  <div className="pt-2">
                    <button 
                      type="submit"
                      className="w-full bg-[#1C4D8D] hover:bg-opacity-95 text-[#F7F5F0] py-3 rounded text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer font-sans"
                      id="submit-booking-btn"
                    >
                      Secure Appointment Slot
                    </button>
                    <p className="text-[9px] text-center text-[#657892]/60 mt-3 font-mono">
                      Showroom visits are fully secure. Personalized ready-made style advice guaranteed.
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
