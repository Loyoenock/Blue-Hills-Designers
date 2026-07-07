'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShoppingBag, Trash2, ArrowRight, Shield, Award, MapPin 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion, AnimatePresence } from 'motion/react';

export default function CartClient() {
  const cart = useStore((state) => state.cart);
  const updateCartQty = useStore((state) => state.updateCartQty);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const settings = useStore((state) => state.settings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  const currency = settings?.currencySymbol || 'Ugx';
  const threshold = settings?.freeShippingThreshold ?? 2000;
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = subtotal > threshold ? 0 : 50; // Free delivery for executive runs > threshold
  const loyaltyPointsEarned = Math.floor(subtotal * 0.1); // 10% cash value points
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
      <Header />

      {/* Cart Shelf Header */}
      <div className="bg-[#1D2B3F] border-b border-[#657892]/20 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h1 className="font-serif text-3xl md:text-4xl text-[#F7F5F0] tracking-tight font-medium">Your Wardrobe Trunk</h1>
          <p className="text-[#F7F5F0]/60 text-xs md:text-sm font-light mt-1">
            Review and adjust your selection of luxury corporate attire before checkout.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 flex-1 w-full">
        <AnimatePresence mode="wait">
          {cart.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="py-24 border border-[#657892]/20 bg-[#F7F5F0] rounded-2xl text-center max-w-xl mx-auto space-y-6 shadow-sm"
              id="empty-cart-container"
            >
              <div className="w-16 h-16 rounded-full bg-[#1D2B3F]/5 border border-[#657892]/20 flex items-center justify-center mx-auto text-[#657892]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-lg text-[#1D2B3F] font-medium">Your Wardrobe Trunk is Empty</h3>
                <p className="text-[#657892] text-xs font-light max-w-xs mx-auto leading-relaxed">
                  You have not added any garments to your active session. Explore our fine imported Suits and luxury Italian shoes.
                </p>
              </div>
              <Link 
                href="/shop"
                className="inline-block bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest font-sans transition-all shadow-sm"
                id="continue-shopping-btn"
              >
                Continue Shopping
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
              id="active-cart-container"
            >
              
              {/* CART ITEMS LIST TABLE (8 columns on lg) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="hidden md:grid grid-cols-12 text-[10px] uppercase tracking-widest font-mono font-semibold text-[#657892] border-b border-[#657892]/20 pb-4 px-2">
                  <div className="col-span-6">Sartorial Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                <div className="space-y-4">
                  {cart.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      className="grid grid-cols-1 md:grid-cols-12 items-center bg-[#F7F5F0] border border-[#657892]/20 rounded-xl p-4 gap-4 md:gap-0 shadow-sm hover:border-[#1C4D8D]/20 transition-all duration-300"
                    >
                      {/* Product details cell */}
                      <div className="col-span-6 flex items-center gap-4">
                        <div className="relative w-20 h-24 rounded overflow-hidden border border-[#657892]/10 bg-[#F7F5F0] shrink-0">
                          <Image 
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="font-serif text-[#1D2B3F] text-base font-semibold">{item.product.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#657892]/80 font-mono">
                            <span className="bg-[#657892]/10 border border-[#657892]/20 px-2 py-0.5 rounded">Size: {item.selectedSize}</span>
                            <span className="bg-[#657892]/10 border border-[#657892]/20 px-2 py-0.5 rounded">Color: {item.selectedColor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price cell */}
                      <div className="col-span-2 text-left md:text-center font-mono text-sm font-semibold text-[#1D2B3F]/85">
                        <span className="md:hidden text-[#657892]/60 font-sans text-xs uppercase block tracking-wider mb-1">Unit Price</span>
                        {currency} {item.product.price}
                      </div>

                      {/* Quantity control cell */}
                      <div className="col-span-2 flex flex-col items-start md:items-center justify-center">
                        <span className="md:hidden text-[#657892]/60 font-sans text-xs uppercase block tracking-wider mb-2">Quantity</span>
                        <div className="flex items-center border border-[#657892]/20 rounded bg-[#B9CDE5]/20">
                          <button 
                            onClick={() => updateCartQty(item.id, item.quantity - 1)}
                            className="px-2.5 py-1 text-[#1D2B3F]/60 hover:text-[#1D2B3F]"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono text-xs text-[#1D2B3F] font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQty(item.id, item.quantity + 1)}
                            className="px-2.5 py-1 text-[#1D2B3F]/60 hover:text-[#1D2B3F]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Total and delete cell */}
                      <div className="col-span-2 flex justify-between md:justify-end items-center gap-4">
                        <div className="text-right">
                          <span className="md:hidden text-[#657892]/60 font-sans text-xs uppercase block tracking-wider mb-1">Total Price</span>
                          <span className="font-mono text-base font-bold text-[#1D2B3F]">{currency} {item.product.price * item.quantity}</span>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#657892]/60 hover:text-red-600 p-2 border border-[#657892]/20 hover:border-red-500/20 rounded hover:bg-red-500/5 transition-all cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </motion.div>
                  ))}
                </div>

                {/* Left panel clear wardrobe button */}
                <div className="flex justify-between items-center pt-4">
                  <Link 
                    href="/shop"
                    className="text-xs text-[#1D2B3F]/60 hover:text-[#1D2B3F] underline font-mono tracking-wider uppercase transition-colors"
                  >
                    ← Browse More Products
                  </Link>
                  <button 
                    onClick={clearCart}
                    className="text-xs text-red-600/60 hover:text-red-600 font-mono tracking-wider uppercase transition-colors p-2"
                  >
                    Clear Wardrobe Trunk
                  </button>
                </div>
              </div>

              {/* ORDER SUMMARY SIDEBAR (4 columns on lg, sticky) */}
              <div className="lg:col-span-4">
                <div className="bg-[#F7F5F0] border border-[#657892]/25 rounded-2xl p-6 md:p-8 space-y-6 sticky top-28 shadow-md">
                  <h3 className="font-serif text-[#1D2B3F] text-lg font-bold tracking-wide border-b border-[#657892]/20 pb-4">
                    Boutique Summary
                  </h3>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#657892]">Boutique Subtotal</span>
                      <span className="text-[#1D2B3F] font-semibold">{currency} {subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#657892]">White-Glove Delivery</span>
                      <span className="text-[#C6A15B] font-semibold uppercase">
                        {deliveryFee === 0 ? 'Complimentary' : `${currency} ${deliveryFee}`}
                      </span>
                    </div>
                    {deliveryFee > 0 && (
                      <p className="text-[10px] text-[#657892] font-sans leading-normal">
                        Tip: Add {currency} {(threshold - subtotal)} more to qualify for complimentary white-glove hand courier.
                      </p>
                    )}
                    
                    <div className="flex justify-between border-t border-[#657892]/15 pt-4">
                      <span className="text-[#657892]">Loyalty Rewards Earned</span>
                      <span className="text-[#C6A15B] font-semibold">+{loyaltyPointsEarned} Points</span>
                    </div>

                    <div className="flex justify-between text-base border-t border-[#657892]/25 pt-4 font-sans font-bold text-[#1D2B3F]">
                      <span>Total Amount</span>
                      <span className="font-mono text-lg text-[#1D2B3F]">{currency} {total}</span>
                    </div>
                  </div>

                  {/* Security Assurance Box */}
                  <div className="bg-[#B9CDE5]/10 rounded-lg border border-[#657892]/20 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#1C4D8D] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-semibold text-[#1D2B3F] uppercase tracking-wider">Secure Escrow Protection</h5>
                        <p className="text-[10px] text-[#657892] leading-relaxed font-light">All orders are securely packaged in high-grade visual protection garments and hand-couriered with confidentiality.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#C6A15B] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-semibold text-[#1D2B3F] uppercase tracking-wider">Lubowa Boutique Pickup</h5>
                        <p className="text-[10px] text-[#657892] leading-relaxed font-light">You may also choose instant physical pickup at our Lubowa showroom lounge during checkout.</p>
                      </div>
                    </div>
                  </div>

                  {/* Checkout CTA */}
                  <div className="space-y-2">
                    <Link 
                      href="/checkout"
                      className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-md font-sans"
                      id="proceed-checkout-btn"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <div className="text-[10px] text-center text-[#657892]/50 font-mono">
                      Confidential checkout • Escrow active
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
