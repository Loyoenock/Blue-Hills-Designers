'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, Shield, ShoppingBag, CreditCard, Landmark, 
  MapPin, CheckCircle2, ChevronRight, Truck, Award,
  Loader2, Eye, Receipt, Mail, AlertTriangle, FileText, Check, X, Printer
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { getSafeImageSrc } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function CheckoutClient() {
  const router = useRouter();
  const cart = useStore((state) => state.cart);
  const currentUser = useStore((state) => state.currentUser);
  const placeOrder = useStore((state) => state.placeOrder);
  const settings = useStore((state) => state.settings);
  
  const appliedCoupon = useStore((state) => state.appliedCoupon);
  const selectedShippingMethod = useStore((state) => state.selectedShippingMethod);
  const clearCart = useStore((state) => state.clearCart);

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

  // Extended Transactional states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingMsg, setProcessingMsg] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [paymentGatewayOpen, setPaymentGatewayOpen] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [momoPin, setMomoPin] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [simulatedEmailSent, setSimulatedEmailSent] = useState(false);

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

  // 1. Coupon calculation
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscount = Math.round(subtotal * (appliedCoupon.discountValue / 100));
    } else if (appliedCoupon.discountType === 'fixed') {
      couponDiscount = appliedCoupon.discountValue;
    }
  }

  // 2. Shipping fee calculation
  let deliveryFee = 0;
  if (selectedShippingMethod === 'standard') {
    deliveryFee = subtotal > threshold ? 0 : 50;
  } else if (selectedShippingMethod === 'express') {
    deliveryFee = 120;
  } else if (selectedShippingMethod === 'pickup') {
    deliveryFee = 0;
  }

  // 3. Tax computation (VAT 18% inclusive)
  const taxRate = settings?.taxRate || 18;
  const taxableAmount = subtotal - couponDiscount;
  const taxAmount = Math.round((taxableAmount / (1 + taxRate / 100)) * (taxRate / 100));

  // 4. Total calculation
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  // Complete Order Placement Transaction
  const executeOrderPlacement = async () => {
    setPaymentGatewayOpen(false);
    setIsProcessing(true);
    setProcessingStep(4);
    setProcessingMsg("Broadcasting garments allocation to secure relational database...");
    await new Promise(resolve => setTimeout(resolve, 1200));

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      image: item.product.images[0]
    }));

    try {
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

      setCreatedOrder(details);
      setCreatedOrderNumber(details.id);

      setProcessingStep(5);
      setProcessingMsg(`Sending digital dispatch itinerary & receipt to ${email}...`);
      await new Promise(resolve => setTimeout(resolve, 1200));

      setSimulatedEmailSent(true);
      setCheckoutSuccess(true);
      setIsProcessing(false);
      clearCart();
    } catch (err: any) {
      console.error(err);
      setValidationError(err?.message || "An unexpected error occurred during database commit. Please retry.");
      setIsProcessing(false);
    }
  };

  const handleOrderSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setGatewayError(null);

    // 1. Basic validation
    if (!email || !phone || !city || !address) {
      setValidationError("Please fill out all address and contact details to proceed.");
      return;
    }

    if (!isQuick && step === 1 && !district) {
      setValidationError("Please fill out all address registry fields to proceed.");
      return;
    }

    if (paymentMethod === 'Mobile Money' && !momoNumber) {
      setValidationError("Please enter a valid mobile money number.");
      return;
    }

    if (paymentMethod === 'Visa' && (!cardNumber || !cardExpiry || !cardCVV)) {
      setValidationError("Please specify cardholder credentials.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError("Please enter a valid corporate-formatted email address.");
      return;
    }

    // Phone length validation
    if (phone.replace(/\s/g, '').length < 8) {
      setValidationError("Please enter a valid phone contact line.");
      return;
    }

    // Stock level allocation checks
    const products = useStore.getState().products;
    for (const item of cart) {
      const dbProduct = products.find(p => p.id === item.product.id);
      if (dbProduct && item.quantity > dbProduct.stock) {
        setValidationError(`Atelier Capacity Limit: Only ${dbProduct.stock} units of "${dbProduct.name}" are currently available in Lubowa Stock. You requested ${item.quantity}. Please adjust your trunk list quantity.`);
        return;
      }
    }

    // Progress loader triggers
    setIsProcessing(true);
    setProcessingStep(1);
    setProcessingMsg("Reserving bespoke garments in Lubowa Atelier ledger...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    setProcessingStep(2);
    setProcessingMsg("Securing priority high-security courier dispatch corridor...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    setProcessingStep(3);
    setProcessingMsg("Contacting external billing settlement service...");
    await new Promise(resolve => setTimeout(resolve, 800));

    if (paymentMethod !== 'Cash on Delivery') {
      setPaymentGatewayOpen(true);
    } else {
      await executeOrderPlacement();
    }
  };

  const handlePaymentCancel = () => {
    setPaymentGatewayOpen(false);
    setIsProcessing(false);
    setValidationError("Payment Canceled: Secure authorization was canceled. Sizing configurations remain saved. Please select a payment option to complete your order.");
  };

  const handlePaymentDecline = () => {
    setPaymentGatewayOpen(false);
    setIsProcessing(false);
    setValidationError("Payment Declined: The secure bank gateway reported insufficient funds, card restriction, or authorization failure. Please check your credit/wallet parameters or use Cash on Delivery.");
  };

  const handlePaymentTimeout = () => {
    setPaymentGatewayOpen(false);
    setIsProcessing(false);
    setValidationError("Payment Network Timeout: The MTN/Airtel escrow response timed out. Please verify your connection status and re-verify PIN authorization, or select Cash on Delivery.");
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

              {/* Simulated Email Confirmation Indicator */}
              <div className="bg-[#1C4D8D]/5 border border-[#1C4D8D]/15 rounded-xl p-4 flex gap-3 text-left animate-fade-in">
                <Mail className="w-5 h-5 text-[#1C4D8D] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[#1D2B3F] uppercase tracking-wider text-[10px] font-mono">Secure Email Receipt Transmitted</p>
                  <p className="text-[10px] text-[#657892] leading-relaxed">
                    A copy of your private client purchase itinerary and ready-to-wear dispatch protocol has been sent to <span className="font-bold text-[#1C4D8D]">{email || "your email address"}</span>.
                  </p>
                </div>
              </div>

              {/* View Invoice button */}
              <div className="pt-1">
                <button 
                  onClick={() => setInvoiceModalOpen(true)}
                  className="w-full bg-[#C6A15B]/10 hover:bg-[#C6A15B]/20 text-[#C6A15B] border border-[#C6A15B]/30 text-xs py-3 px-4 rounded-xl font-mono uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Bespoke Invoice Receipt</span>
                </button>
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
                {validationError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-4 rounded-xl text-xs flex gap-3 items-start shadow-sm animate-fade-in" id="validation-error-banner">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 animate-pulse" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] font-mono">Atelier Validation Advisory</p>
                      <p className="font-light mt-0.5">{validationError}</p>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-6 bg-[#F7F5F0] border border-[#657892]/20 p-8 rounded-2xl shadow-md flex flex-col items-center justify-center min-h-[350px] animate-fade-in">
                    <Loader2 className="w-12 h-12 text-[#C6A15B] animate-spin" />
                    <div className="space-y-2 text-center max-w-sm">
                      <h4 className="font-serif text-[#1D2B3F] text-lg font-bold">Securing Atelier Dispatch</h4>
                      <p className="text-[11px] text-[#657892] font-mono font-bold uppercase tracking-widest text-[#C6A15B] animate-pulse">{processingMsg}</p>
                    </div>
                    {/* Visual Progress Timeline */}
                    <div className="w-full max-w-md bg-[#657892]/10 h-1.5 rounded-full overflow-hidden mt-4">
                      <div 
                        className="bg-[#1C4D8D] h-full transition-all duration-500"
                        style={{ width: `${(processingStep / 5) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between w-full max-w-md text-[9px] text-[#657892] font-mono mt-2">
                      <span className={processingStep >= 1 ? "text-[#1C4D8D] font-bold" : ""}>1. RESERVE</span>
                      <span className={processingStep >= 2 ? "text-[#1C4D8D] font-bold" : ""}>2. CORRIDOR</span>
                      <span className={processingStep >= 3 ? "text-[#1C4D8D] font-bold" : ""}>3. GATEWAY</span>
                      <span className={processingStep >= 4 ? "text-[#1C4D8D] font-bold" : ""}>4. LEDGER</span>
                      <span className={processingStep >= 5 ? "text-[#1C4D8D] font-bold" : ""}>5. DISPATCH</span>
                    </div>
                  </div>
                )}

                {settings?.maintenanceMode && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-xs flex flex-col gap-1 shadow-sm select-none">
                    <p className="font-bold uppercase tracking-wider text-[10px]">Storefront Under Maintenance</p>
                    <p className="font-light">We are currently conducting scheduled adjustments. Direct ordering is temporarily restricted. Please visit our showroom at Lubowa Shopping Mall or contact us directly at {settings?.supportPhone || settings?.conciergePhone || '+256 772 123456'}.</p>
                  </div>
                )}

                {!isProcessing && (
                  isQuick ? (
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
                              setValidationError(null);
                            } else {
                              setValidationError("Address Registration Incomplete: Please fill out all required shipping fields (Email, Phone, District, City, Address) to advance to the secure payment portal.");
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
                )
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
                            src={getSafeImageSrc(item.product.images?.[0])}
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
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Atelier Code ({appliedCoupon.code})</span>
                        <span className="font-semibold">-{currency} {couponDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#657892]">
                      <span>Courier Protocol ({selectedShippingMethod === 'standard' ? 'Standard' : selectedShippingMethod === 'express' ? 'Express' : 'Pickup'})</span>
                      <span className="text-[#C6A15B] font-semibold uppercase">{deliveryFee === 0 ? 'Complimentary' : `${currency} ${deliveryFee}`}</span>
                    </div>
                    <div className="flex justify-between text-[#657892]">
                      <span>VAT Component ({taxRate}%)</span>
                      <span className="text-[#1D2B3F] font-light">Included ({currency} {taxAmount})</span>
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

      {/* SECURE SIMULATED PAYMENT VERIFICATION GATEWAY OVERLAY */}
      <AnimatePresence>
        {paymentGatewayOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1D2B3F]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            id="secure-payment-gateway-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-[#657892]/20 shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header banner indicating secure handshake */}
              <div className="bg-[#1D2B3F] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#C6A15B]" />
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#F7F5F0]">Secure Escrow Auth v2.1</span>
                </div>
                <button 
                  onClick={handlePaymentCancel}
                  className="text-white/60 hover:text-white transition-all p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gateway Body */}
              <div className="p-6 space-y-6">
                {paymentMethod === 'Mobile Money' ? (
                  <div className="space-y-4 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      momoProvider === 'MTN' ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' : 'bg-red-100 text-red-600 border border-red-200'
                    }`}>
                      <span className="font-bold text-xs font-mono">{momoProvider}</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif text-lg font-bold text-[#1D2B3F]">Authorize Debit Request</h4>
                      <p className="text-xs text-[#657892] font-light">
                        A secure pull transaction was requested for <span className="font-semibold text-[#1D2B3F]">{phone}</span> ({momoProvider} Wallet).
                      </p>
                    </div>

                    <div className="bg-[#F7F5F0] p-4 rounded-xl border border-[#657892]/10 space-y-3 text-left">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#657892]">Beneficiary:</span>
                        <span className="text-[#1D2B3F] font-bold">Blue Hills Designers Ltd</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#657892]">Amount:</span>
                        <span className="text-[#1D2B3F] font-bold">{currency} {total}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono font-bold">Enter Mobile Wallet PIN</label>
                      <input 
                        type="password"
                        placeholder="••••"
                        maxLength={4}
                        value={momoPin}
                        onChange={(e) => setMomoPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center bg-[#F7F5F0] border border-[#657892]/20 rounded-xl py-3.5 text-lg font-mono tracking-[0.6em] text-[#1D2B3F] focus:border-[#1C4D8D] outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif text-lg font-bold text-[#1D2B3F]">3D Secure OTP Authentication</h4>
                      <p className="text-xs text-[#657892] font-light">
                        Verified by Visa has dispatched a one-time verification passcode to card registry ending in <span className="font-mono font-semibold">*{cardNumber.slice(-4)}</span>.
                      </p>
                    </div>

                    <div className="bg-[#F7F5F0] p-4 rounded-xl border border-[#657892]/10 space-y-3 text-left">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#657892]">Merchant:</span>
                        <span className="text-[#1D2B3F] font-bold">BLUE HILLS ONLINE ATELIER</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#657892]">Amount:</span>
                        <span className="text-[#1D2B3F] font-bold">{currency} {total}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono font-bold">Enter 6-Digit One-Time PIN (OTP)</label>
                      <input 
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center bg-[#F7F5F0] border border-[#657892]/20 rounded-xl py-3.5 text-lg font-mono tracking-[0.6em] text-[#1D2B3F] focus:border-[#1C4D8D] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Gateway Control buttons */}
                <div className="space-y-2 pt-2">
                  <button 
                    onClick={executeOrderPlacement}
                    className="w-full bg-[#1D2B3F] hover:bg-[#1D2B3F]/90 text-[#F7F5F0] text-xs py-3.5 rounded-xl font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle className="w-4 h-4 text-[#C6A15B]" />
                    <span>Authorize Settlement</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 text-center pt-2">
                    <button 
                      onClick={handlePaymentDecline}
                      className="text-[9px] font-mono text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/40 rounded py-1.5 uppercase transition-all"
                    >
                      Simulate Decline
                    </button>
                    <button 
                      onClick={handlePaymentTimeout}
                      className="text-[9px] font-mono text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200/40 rounded py-1.5 uppercase transition-all"
                    >
                      Simulate Timeout
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer advisory */}
              <div className="bg-[#F7F5F0] px-6 py-3 border-t border-[#657892]/10 text-center text-[9px] text-[#657892] font-mono">
                Protected by Bank of Uganda cyber-risk guidelines. Token ID: secure_handshake_48w92
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRIVATE CLIENT LUXURY ATELIER INVOICE MODAL */}
      <AnimatePresence>
        {invoiceModalOpen && createdOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1D2B3F]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
            id="private-client-invoice-modal"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#F7F5F0] rounded-2xl border-2 border-[#C6A15B]/30 shadow-2xl max-w-2xl w-full overflow-hidden p-6 md:p-8 space-y-6"
            >
              {/* Top controls */}
              <div className="flex justify-between items-center border-b border-[#657892]/20 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#C6A15B]" />
                  <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-[#1D2B3F]">Private Atelier Registry Copy</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print();
                      }
                    }}
                    className="p-2 hover:bg-[#657892]/10 rounded-lg text-[#1D2B3F] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Print Registry Invoice"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print / Save</span>
                  </button>
                  <button 
                    onClick={() => setInvoiceModalOpen(false)}
                    className="p-2 hover:bg-[#657892]/10 rounded-lg text-[#1D2B3F]/70 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div className="space-y-6 text-[#1D2B3F] font-sans" id="printable-invoice">
                {/* Invoice Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] tracking-[0.25em] text-[#C6A15B] font-mono font-bold">BLUE HILLS DESIGNERS</span>
                    <h1 className="font-serif text-2xl font-bold tracking-tight">Purchase Allocation Invoice</h1>
                    <p className="text-[10px] text-[#657892] leading-normal font-light">
                      Lubowa Shopping Mall, Showroom 12, Kampala, Uganda<br />
                      Tel: +256 (0) 772 123456 • concierge@bluehillsdesigners.com
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-1 font-mono text-[11px]">
                    <p><span className="text-[#657892]">Invoice Ref:</span> <span className="font-bold">{createdOrder.id}</span></p>
                    <p><span className="text-[#657892]">Allocation Date:</span> <span>{new Date(createdOrder.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                    <p><span className="text-[#657892]">Billing Method:</span> <span className="font-bold">{createdOrder.paymentMethod}</span></p>
                    <p><span className="text-[#657892]">Status:</span> <span className="text-emerald-700 font-bold uppercase">Reserved & Paid</span></p>
                  </div>
                </div>

                {/* Client / Shipping Registry details */}
                <div className="bg-[#B9CDE5]/10 border border-[#657892]/25 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] text-[#657892] uppercase tracking-wider font-mono">Private Client Profile</p>
                    <p className="font-bold">{createdOrder.customerName}</p>
                    <p className="font-light text-[#657892]">{createdOrder.customerEmail}</p>
                    <p className="font-light text-[#657892]">{createdOrder.customerPhone}</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] text-[#657892] uppercase tracking-wider font-mono">Courier Destination Protocol</p>
                    <p className="font-bold">{createdOrder.shippingAddress.address}</p>
                    <p className="font-light text-[#657892]">{createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.district}</p>
                    <p className="font-light text-[#657892]">{createdOrder.shippingAddress.country}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#657892]/20 text-[#657892] font-mono text-[10px] uppercase">
                        <th className="py-2.5">Bespoke Design / Garment Detail</th>
                        <th className="py-2.5 text-center">Specs</th>
                        <th className="py-2.5 text-center">Qty</th>
                        <th className="py-2.5 text-right">Price</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#657892]/10">
                      {createdOrder.items.map((item: any, i: number) => (
                        <tr key={i} className="text-[#1D2B3F]">
                          <td className="py-3 font-semibold">{item.productName}</td>
                          <td className="py-3 text-center text-[10px] font-mono text-[#657892]">
                            Size: {item.selectedSize} <br />
                            Color: {item.selectedColor || 'Classic'}
                          </td>
                          <td className="py-3 text-center font-mono">{item.quantity}</td>
                          <td className="py-3 text-right font-mono">{currency} {item.price}</td>
                          <td className="py-3 text-right font-mono font-bold">{currency} {item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculations summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-[#657892]/20 font-mono text-xs">
                  <div className="max-w-xs text-[10px] text-[#657892] leading-relaxed font-light">
                    * This is a luxury legal allocation invoice. Blue Hills Designers certifies that your ready-made executive wear has been isolated and sanitized according to regional standards. Sizing corrections are permitted within 14 days at our Lubowa showroom.
                  </div>
                  <div className="w-full sm:w-64 space-y-2">
                    <div className="flex justify-between text-[#657892]">
                      <span>Trunk Subtotal:</span>
                      <span>{currency} {subtotal}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon Discount:</span>
                        <span>-{currency} {couponDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#657892]">
                      <span>Courier Fee:</span>
                      <span>{deliveryFee === 0 ? 'Complimentary' : `${currency} ${deliveryFee}`}</span>
                    </div>
                    <div className="flex justify-between text-[#657892]">
                      <span>Inclusive VAT (18%):</span>
                      <span>Included ({currency} {taxAmount})</span>
                    </div>
                    <div className="flex justify-between text-sm font-sans font-bold border-t border-[#657892]/30 pt-2 text-[#1D2B3F]">
                      <span>Net Settlement:</span>
                      <span className="font-mono text-base text-[#1D2B3F]">{currency} {total}</span>
                    </div>
                  </div>
                </div>

                {/* Luxury Seal & Stamp */}
                <div className="pt-6 flex justify-between items-end">
                  <div className="border border-[#C6A15B]/30 rounded-lg p-3 text-[10px] font-serif text-[#C6A15B]/80 max-w-[200px] text-center uppercase tracking-widest bg-[#C6A15B]/5">
                    Authentic Atelier Garments Reserve Certificate
                  </div>
                  <div className="text-right font-mono text-[9px] text-[#657892] space-y-1">
                    <p className="font-serif text-[#1D2B3F] text-xs italic">A. Namara</p>
                    <div className="w-24 h-[1px] bg-[#657892]/30 ml-auto"></div>
                    <p>concierge signing officer</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
      <MobileNav />
    </div>
  );
}
