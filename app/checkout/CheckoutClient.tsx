'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, Shield, ShoppingBag, CreditCard, Landmark, 
  MapPin, CheckCircle2, ChevronRight, Truck, Award
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion, AnimatePresence } from 'motion/react';

export default function CheckoutClient() {
  const router = useRouter();
  const { cart, currentUser, placeOrder, settings } = useStore();
  const [mounted, setMounted] = useState(false);
  const [isQuick, setIsQuick] = useState(false);

  // Form Step State: 1 = Contact & Shipping, 2 = Payment Selection
  const [step, setStep] = useState(1);

  // Form Inputs
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Mobile Money' | 'Visa' | 'Cash on Delivery'>('Mobile Money');
  
  // Custom Mobile Money Network Select or Card Details
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'Airtel'>('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (currentUser) {
        setEmail(currentUser.email);
        setPhone(currentUser.phone || '');
      }
      if (typeof window !== 'undefined' && window.location.search.includes('quick=true')) {
        setIsQuick(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  if (!mounted) return null;

  // Prevent accessing checkout with empty cart (unless success screen is being shown)
  if (cart.length === 0 && !checkoutSuccess) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
        <Header />
        <div className="py-24 text-center max-w-md mx-auto space-y-4 animate-fade-in">
          <p className="font-serif text-lg text-[#1D2B3F]">Your Trunk is Empty</p>
          <p className="text-[#657892] text-xs font-light">You cannot checkout without registering an item first.</p>
          <Link href="/shop" className="inline-block bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-widest font-sans shadow-sm transition-all duration-300">
            Go to Shop
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const threshold = settings?.freeShippingThreshold ?? 2000;
  const currency = settings?.currencySymbol || 'Ugx';
  const deliveryFee = subtotal > threshold ? 0 : 50;
  const total = subtotal + deliveryFee;

  const handleOrderSubmission = (e: React.FormEvent) => {
    e.preventDefault();

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      image: item.product.images[0]
    }));

    const details = placeOrder({
      customerName: currentUser ? currentUser.name : email.split('@')[0].toUpperCase(),
      customerEmail: email,
      customerPhone: phone,
      amount: total,
      status: 'Pending',
      items: orderItems,
      shippingAddress: {
        country,
        district: district || city,
        city,
        address
      },
      paymentMethod,
      notes: paymentMethod === 'Mobile Money' 
        ? `Mobile Money operator: ${momoProvider}, Wallet No: ${momoNumber}` 
        : paymentMethod === 'Visa' 
          ? `Visa ending with ${cardNumber.slice(-4)}` 
          : 'Cash on delivery requested.'
    });

    setCreatedOrderNumber(details.id);
    setCheckoutSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 flex-1 w-full" id="checkout-root">
        <AnimatePresence mode="wait">
          {checkoutSuccess ? (
            /* LEGENDARY SUCCESS ORDER SCREEN */
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl p-8 text-center space-y-8 shadow-md"
              id="order-success-screen"
            >
              <div className="w-20 h-20 rounded-full bg-[#C6A15B]/10 text-[#C6A15B] border border-[#C6A15B]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#C6A15B] font-mono font-bold">Boutique Courier Dispatch</span>
                <h2 className="font-serif text-3xl text-[#1D2B3F] font-bold">Purchase Order Confirmed</h2>
                <p className="text-[#657892] text-xs font-mono font-semibold">Registry Number: {createdOrderNumber}</p>
                <p className="text-[#657892] text-xs font-light leading-relaxed max-w-sm mx-auto pt-2">
                  Your order has been confirmed. Our delivery courier is dispatching your premium ready-made corporate clothing directly from our Lubowa Shopping Mall showroom.
                </p>
              </div>

              {/* Order journey timeline */}
              <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-xl p-5 space-y-4 text-left font-sans">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Delivery Protocol</h4>
                <div className="space-y-4">
                  {[
                    { title: "Order Confirmed", desc: "Order details recorded and garments set aside.", active: true },
                    { title: "Premium Packaging", desc: "Placed in protective clothing bags for transit.", active: true },
                    { title: "Courier Dispatch", desc: "Courier en-route to your specified address in Kampala.", active: false }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                          item.active ? 'bg-[#1C4D8D] border-[#1C4D8D] text-[#F7F5F0]' : 'border-[#657892]/30 text-[#657892]/40'
                        }`}>✓</div>
                        {i < 2 && <div className="w-[1.5px] h-8 bg-[#657892]/20 mt-1"></div>}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold ${item.active ? 'text-[#1D2B3F]' : 'text-[#1D2B3F]/40'}`}>{item.title}</p>
                        <p className="text-[10px] text-[#657892] leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/shop"
                  className="bg-[#657892]/10 hover:bg-[#657892]/20 text-[#1D2B3F] border border-[#657892]/20 text-xs py-3.5 rounded-lg font-semibold uppercase tracking-widest flex-1 transition-all font-sans text-center flex items-center justify-center"
                >
                  Browse Atelier
                </Link>
                <Link 
                  href="/account"
                  className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] text-xs py-3.5 rounded-lg font-semibold uppercase tracking-widest flex-1 transition-all font-sans shadow-sm text-center flex items-center justify-center"
                  id="view-success-order-btn"
                >
                  Track Dispatch
                </Link>
              </div>
            </motion.div>
          ) : (
            /* TWO-COLUMN CHECKOUT LAYOUT */
            <motion.div 
              key="checkout-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {/* Form entries panel (8 columns on lg) */}
              <div className="lg:col-span-7 space-y-8">
                {settings?.maintenanceMode && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-xs flex flex-col gap-1 shadow-sm select-none">
                    <p className="font-bold uppercase tracking-wider text-[10px]">Storefront Under Maintenance</p>
                    <p className="font-light">We are currently conducting scheduled adjustments. Direct ordering is temporarily restricted. Please visit our showroom at Lubowa Shopping Mall or contact us directly at {settings?.supportPhone || settings?.conciergePhone || '+256 772 123456'}.</p>
                  </div>
                )}
                {isQuick ? (
                  /* SIMPLIFIED QUICK CHECKOUT PANEL */
                  <div className="space-y-6 bg-[#F7F5F0] border border-[#657892]/20 p-6 rounded-2xl shadow-md animate-fade-in" id="quick-checkout-panel">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C6A15B] font-mono font-bold">Express Portal</span>
                      <h2 className="font-serif text-2xl text-[#1D2B3F] font-bold">Instant Order Checkout</h2>
                      <p className="text-xs text-[#657892] font-light">Complete your purchase in seconds. Enter your details below.</p>
                    </div>

                    <form onSubmit={handleOrderSubmission} className="space-y-5" id="quick-checkout-details-form">
                      {/* Contact details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono">Email Address</label>
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="executive@corporate.com"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono">Mobile Contact Line</label>
                          <input 
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+256 772 123456"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono">City / Suburb</label>
                          <input 
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Lubowa / Kololo"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono">Physical Address / Suite</label>
                          <input 
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Plot 42, Executive Rise"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      {/* Compact Payment selection */}
                      <div className="space-y-2 pt-2 border-t border-[#657892]/10">
                        <label className="text-[9px] text-[#657892] uppercase tracking-widest font-mono font-bold block">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'Mobile Money', title: 'MoMo', icon: Landmark },
                            { id: 'Visa', title: 'Visa', icon: CreditCard },
                            { id: 'Cash on Delivery', title: 'Cash on Del.', icon: Truck }
                          ].map((pay) => {
                            const Icon = pay.icon;
                            const selected = paymentMethod === pay.id;
                            return (
                              <button
                                key={pay.id}
                                type="button"
                                onClick={() => setPaymentMethod(pay.id as any)}
                                className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer ${
                                  selected 
                                    ? 'bg-[#1C4D8D]/15 border-[#1C4D8D] text-[#1D2B3F] font-bold shadow-sm' 
                                    : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1C4D8D]/40 bg-[#F7F5F0]'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{pay.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detailed field depends on payment option */}
                      <div className="bg-[#B9CDE5]/10 border border-[#657892]/25 rounded-xl p-4 text-xs">
                        {paymentMethod === 'Mobile Money' && (
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[10px]">
                                <input 
                                  type="radio" 
                                  checked={momoProvider === 'MTN'} 
                                  onChange={() => setMomoProvider('MTN')}
                                  className="accent-[#1C4D8D]"
                                />
                                <span>MTN MoMo</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[10px]">
                                <input 
                                  type="radio" 
                                  checked={momoProvider === 'Airtel'} 
                                  onChange={() => setMomoProvider('Airtel')}
                                  className="accent-[#1C4D8D]"
                                />
                                <span>Airtel Money</span>
                              </label>
                            </div>
                            <div className="space-y-1">
                              <input 
                                type="tel"
                                value={momoNumber}
                                onChange={(e) => setMomoNumber(e.target.value)}
                                placeholder="Mobile Money Number (+256 7xx xxxxxx)"
                                className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                required
                              />
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'Visa' && (
                          <div className="space-y-3">
                            <input 
                              type="text"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="Card Number (xxxx xxxx xxxx xxxx)"
                              maxLength={19}
                              className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                              required
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input 
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                placeholder="MM/YY"
                                maxLength={5}
                                className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                required
                              />
                              <input 
                                type="password"
                                value={cardCVV}
                                onChange={(e) => setCardCVV(e.target.value)}
                                placeholder="CVV"
                                maxLength={3}
                                className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                required
                              />
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'Cash on Delivery' && (
                          <p className="text-[11px] text-[#657892] leading-relaxed font-light">
                            Pay securely with cash or mobile money directly to our support representative upon physical sizing confirmation at delivery.
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={!!settings?.maintenanceMode}
                        className={`w-full text-[#F7F5F0] py-3.5 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-md font-sans ${
                          settings?.maintenanceMode 
                            ? 'bg-gray-400 border-gray-400 cursor-not-allowed' 
                            : 'bg-[#1C4D8D] hover:bg-opacity-95 cursor-pointer'
                        }`}
                      >
                        {settings?.maintenanceMode ? 'Ordering Suspended' : `Complete Quick Order (${currency} ${total})`}
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    {/* Dynamic progress steps indicator */}
                    <div className="flex items-center gap-4 bg-[#F7F5F0] p-4 rounded-xl border border-[#657892]/20 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold font-mono ${
                      step >= 1 ? 'bg-[#1C4D8D] text-[#F7F5F0]' : 'border border-[#657892]/30 text-[#657892]/50'
                    }`}>1</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${step >= 1 ? 'text-[#1D2B3F]' : 'text-[#657892]/50'}`}>
                      Address
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#657892]/30" />
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold font-mono ${
                      step >= 2 ? 'bg-[#1C4D8D] text-[#F7F5F0]' : 'border border-[#657892]/30 text-[#657892]/50'
                    }`}>2</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${step >= 2 ? 'text-[#1D2B3F]' : 'text-[#657892]/50'}`}>
                      Payment Selection
                    </span>
                  </div>
                </div>

                {/* Form wrapper */}
                <form onSubmit={handleOrderSubmission} className="space-y-6" id="checkout-details-form">
                  {step === 1 ? (
                    /* STEP 1: CONTACT & SHIPPING ADDRESS */
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                      id="checkout-step-1-fields"
                    >
                      <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">
                        1. Private Contact & Shipping Registry
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Secure Executive Email</label>
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. executive@corporate.com"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Mobile Contact Line</label>
                          <input 
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +256 772 123456"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Country</label>
                        <select 
                          value={country} 
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] outline-none focus:border-[#1C4D8D] shadow-sm"
                        >
                          <option value="Uganda">Uganda (Atelier Base)</option>
                          <option value="Kenya">Kenya</option>
                          <option value="Rwanda">Rwanda</option>
                          <option value="Tanzania">Tanzania</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">District / Region</label>
                          <input 
                            type="text"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="e.g. Wakiso / Kampala"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">City / Suburb</label>
                          <input 
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Lubowa / Kololo"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Physical Address / Suite / Office Number</label>
                        <input 
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Plot 42, Executive Rise, Showroom Floor 2"
                          className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                          required
                        />
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (email && phone && district && city && address) {
                              setStep(2);
                            } else {
                              alert("Please fill out all address registry fields to proceed to payment secure portal.");
                            }
                          }}
                          className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-8 py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest font-sans flex items-center gap-2 shadow-sm cursor-pointer transition-all duration-300"
                        >
                          <span>Proceed to Payment</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* STEP 2: PAYMENT METHOD CONFIGURATION */
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                      id="checkout-step-2-fields"
                    >
                      <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3 flex justify-between items-center">
                        <span>2. Authorize Payment Settlement</span>
                        <button 
                          type="button" 
                          onClick={() => setStep(1)} 
                          className="text-xs font-mono text-[#1C4D8D] hover:underline"
                        >
                          Back to Address
                        </button>
                      </h3>

                      {/* Payment custom cards list */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'Mobile Money', title: 'Mobile Money', icon: Landmark, desc: 'Instant MTN/Airtel Wallet' },
                          { id: 'Visa', title: 'Visa / MasterCard', icon: CreditCard, desc: 'Secure Bank Portal' },
                          { id: 'Cash on Delivery', title: 'Cash on Delivery', icon: Truck, desc: 'Settle at Fitting' }
                        ].map((pay) => {
                          const Icon = pay.icon;
                          const selected = paymentMethod === pay.id;
                          return (
                            <button
                              key={pay.id}
                              type="button"
                              onClick={() => setPaymentMethod(pay.id as any)}
                              className={`text-left p-4 rounded-xl border flex flex-col justify-between h-[130px] transition-all cursor-pointer ${
                                selected 
                                  ? 'bg-[#1C4D8D]/10 border-[#1C4D8D] text-[#1D2B3F] shadow-sm' 
                                  : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1C4D8D]/40 bg-[#F7F5F0]'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <Icon className={`w-5 h-5 ${selected ? 'text-[#C6A15B]' : 'text-[#657892]/50'}`} />
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  selected ? 'bg-[#C6A15B] border-[#C6A15B]' : 'border-[#657892]/25'
                                }`}>
                                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#1D2B3F]"></div>}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#1D2B3F] font-serif uppercase tracking-wide">{pay.title}</h4>
                                <p className="text-[10px] text-[#657892] mt-1 leading-normal">{pay.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Payment detailed options */}
                      <div className="bg-[#B9CDE5]/10 border border-[#657892]/25 rounded-xl p-5">
                        {paymentMethod === 'Mobile Money' && (
                          <div className="space-y-4" id="momo-fields">
                            <h4 className="text-xs font-bold text-[#1D2B3F] uppercase tracking-wider font-mono">MTN / Airtel Escrow Settlement</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => setMomoProvider('MTN')}
                                className={`py-3.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                  momoProvider === 'MTN' 
                                    ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500 font-bold shadow-sm' 
                                    : 'border-[#657892]/20 text-[#1D2B3F]/50 hover:border-[#1D2B3F]/40 bg-[#F7F5F0]'
                                }`}
                              >
                                MTN MoMo
                              </button>
                              <button
                                type="button"
                                onClick={() => setMomoProvider('Airtel')}
                                className={`py-3.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                                  momoProvider === 'Airtel' 
                                    ? 'bg-red-500/10 text-red-600 border-red-500 font-bold shadow-sm' 
                                    : 'border-[#657892]/20 text-[#1D2B3F]/50 hover:border-[#1D2B3F]/40 bg-[#F7F5F0]'
                                }`}
                              >
                                Airtel Money
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Mobile Money Number</label>
                              <input 
                                type="tel"
                                value={momoNumber}
                                onChange={(e) => setMomoNumber(e.target.value)}
                                placeholder="+256 7xx xxxxxx"
                                className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                required
                              />
                              <p className="text-[9px] text-[#657892] leading-normal font-sans pt-1">
                                Notice: A prompt pin window will display on your mobile device terminal to authorize the escrow holds.
                              </p>
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'Visa' && (
                          <div className="space-y-4" id="visa-fields">
                            <h4 className="text-xs font-bold text-[#1D2B3F] uppercase tracking-wider font-mono">PCI-DSS Secure Card Gateway</h4>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Card Holder Number</label>
                                <input 
                                  type="text"
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(e.target.value)}
                                  placeholder="xxxx xxxx xxxx xxxx"
                                  maxLength={19}
                                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                  required
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Expiry Date</label>
                                  <input 
                                    type="text"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value)}
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Secure CVV</label>
                                  <input 
                                    type="password"
                                    value={cardCVV}
                                    onChange={(e) => setCardCVV(e.target.value)}
                                    placeholder="•••"
                                    maxLength={3}
                                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'Cash on Delivery' && (
                          <div className="space-y-2 text-left" id="cod-fields">
                            <h4 className="text-xs font-bold text-[#1D2B3F] uppercase tracking-wider font-mono">Kampala Cash on Delivery</h4>
                            <p className="text-xs text-[#657892] leading-relaxed font-light">
                              For our esteemed Kampala and Wakiso clientele, we offer delivery with on-the-spot physical fittings. Settle your balance securely using cash or local mobile money directly with our master tailor escort upon delivery confirmation.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Final Order Submit button */}
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={!!settings?.maintenanceMode}
                          className={`w-full text-[#F7F5F0] py-4 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-md font-sans ${
                            settings?.maintenanceMode 
                              ? 'bg-gray-400 border-gray-400 cursor-not-allowed' 
                              : 'bg-[#1C4D8D] hover:bg-opacity-95 cursor-pointer'
                          }`}
                          id="submit-order-final-btn"
                        >
                          {settings?.maintenanceMode ? 'Ordering Suspended' : `Confirm Tailoring Order Settlement (${currency} ${total})`}
                        </button>
                        <p className="text-[9px] text-center text-[#657892]/60 mt-3 font-mono">
                          Confirming your order activates a secure SSL token. Garment reservations hold for 2 hours.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </form>
                  </>
                )}

              </div>

              {/* ORDER ITEMS REVIEW STICKY SIDEBAR (5 columns on lg) */}
              <div className="lg:col-span-5">
                <div className="bg-[#F7F5F0] border border-[#657892]/25 rounded-2xl p-6 md:p-8 space-y-6 sticky top-28 shadow-md">
                  <h3 className="font-serif text-[#1D2B3F] text-lg font-bold tracking-wide border-b border-[#657892]/20 pb-4 flex justify-between items-center">
                    <span>Order Review</span>
                    <span className="text-xs text-[#C6A15B] font-mono">({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                  </h3>

                  {/* Cart preview list */}
                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className="relative w-12 h-16 rounded overflow-hidden border border-[#657892]/10 shrink-0 bg-[#F7F5F0]">
                          <Image 
                            src={item.product.images[0]}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-[#1D2B3F] text-xs font-semibold truncate">{item.product.name}</h4>
                          <p className="text-[10px] text-[#657892] font-mono mt-0.5">Size: {item.selectedSize} • Qty: {item.quantity}</p>
                        </div>
                        <div className="font-mono text-xs font-semibold text-[#1D2B3F]/85">
                          {currency} {item.product.price * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals */}
                  <div className="space-y-3 pt-4 border-t border-[#657892]/15 text-xs font-mono">
                    <div className="flex justify-between text-[#657892]">
                      <span>Items total</span>
                      <span className="text-[#1D2B3F] font-semibold">{currency} {subtotal}</span>
                    </div>
                    <div className="flex justify-between text-[#657892]">
                      <span>White-Glove Courier</span>
                      <span className="text-[#C6A15B] font-semibold uppercase">{deliveryFee === 0 ? 'Complimentary' : `${currency} ${deliveryFee}`}</span>
                    </div>
                    <div className="flex justify-between text-[#657892]">
                      <span>Escrow Holds / Tax</span>
                      <span className="text-[#657892]">{settings?.taxRate ? `${settings.taxRate}% VAT Included` : 'Included'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm border-t border-[#657892]/25 pt-4 font-sans font-bold text-[#1D2B3F]">
                      <span>Total Balance</span>
                      <span className="font-mono text-base text-[#1D2B3F]">{currency} {total}</span>
                    </div>
                  </div>

                  <div className="bg-[#B9CDE5]/10 rounded-lg border border-[#657892]/20 p-4 flex gap-3 text-xs">
                    <Shield className="w-5 h-5 text-[#1C4D8D] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#1D2B3F] uppercase tracking-wider text-[10px]">Private Client Security</p>
                      <p className="text-[9px] text-[#657892] leading-relaxed font-light">
                        Atelier orders undergo high-grade security sanitization. Sizing configurations are saved securely on local keychain tokens.
                      </p>
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
