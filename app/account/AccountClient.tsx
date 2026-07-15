'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  User, ShoppingBag, MapPin, Key, ChevronRight, Award, 
  Clock, CheckCircle, Ship, Compass, ShieldCheck, Edit3, LogOut
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { getSafeImageSrc } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AccountClient() {
  const router = useRouter();
  const { 
    currentUser, orders, updateProfile, updatePassword, logout, login, users 
  } = useStore();
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile' | 'addresses' | 'password'>('dashboard');

  // Edit Profile form inputs
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Edit Password form inputs
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (currentUser) {
        setProfileName(currentUser.name);
        setProfilePhone(currentUser.phone || '');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser]);

  if (!mounted) return null;

  // Unauthenticated fallback wrapper
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-full bg-[#B9CDE5]/15 border border-[#657892]/20 flex items-center justify-center mx-auto text-[#1D2B3F]">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-[#1D2B3F] font-bold">Access Executive Lounge</h3>
            <p className="text-[#657892] text-xs font-light max-w-xs mx-auto leading-relaxed">
              Please sign in to register your measurements, inspect dispatch shipments, or review loyalty credentials.
            </p>
          </div>
          <div className="space-y-3">
            <Link 
              href="/login" 
              className="block bg-[#1C4D8D] hover:bg-opacity-95 text-[#F7F5F0] py-3 rounded-lg text-xs font-semibold uppercase tracking-widest text-center transition-all shadow-sm"
            >
              Sign In to Your Account
            </Link>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#657892]/20"></div></div>
              <span className="relative bg-[#F7F5F0] px-3 text-[10px] text-[#657892]/60 uppercase tracking-widest font-mono">Or Quick Validate As</span>
            </div>

            {/* Quick login for preview checking */}
            <div className="grid grid-cols-1 gap-2">
              {users.slice(0, 2).map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    login(u.email);
                    router.refresh();
                  }}
                  className="bg-[#B9CDE5]/10 hover:bg-[#B9CDE5]/20 border border-[#657892]/20 rounded-lg p-2.5 text-xs text-left text-[#1D2B3F] flex justify-between items-center transition-all cursor-pointer"
                >
                  <div>
                    <span className="font-semibold block">{u.name}</span>
                    <span className="text-[10px] text-[#657892] font-mono">{u.role} Account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#657892]/50" />
                </button>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Filter orders belonging to current logged in user
  const clientOrders = orders.filter(
    o => o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const handleProfileUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(profileName, profilePhone);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Security alert: Password strength must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Sartorial error: Password confirmation does not match.");
      return;
    }

    const res = await updatePassword(newPassword);
    if (res.success) {
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(res.error || "Failed to update security password.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
      <Header />

      {/* Account Dashboard Header */}
      <div className="bg-[#1D2B3F] border-b border-[#657892]/20 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-[0.3em] text-[#C6A15B] font-semibold">Boutique Loyalty Desk</span>
            <h1 className="font-serif text-3xl md:text-4xl text-[#F7F5F0] tracking-tight font-medium">Greetings, {currentUser.name}</h1>
            <p className="text-[#B9CDE5] text-xs font-mono uppercase tracking-wider">{currentUser.role} Account registry</p>
          </div>
          
          <button 
            onClick={async () => {
              await logout();
            }}
            className="flex items-center gap-2 border border-[#C6A15B]/30 hover:border-[#C6A15B]/60 bg-[#C6A15B]/10 hover:bg-[#C6A15B]/20 text-[#C6A15B] text-xs font-semibold px-4 py-2.5 rounded-lg transition-all uppercase tracking-wider font-mono cursor-pointer shadow-sm"
            id="account-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Account platform */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* SIDEBAR TABS (3 columns on lg) */}
          <aside className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-1.5 border-b lg:border-b-0 lg:border-r border-[#657892]/20 pr-0 lg:pr-8">
            {[
              { id: 'dashboard', name: 'Executive Dashboard', icon: Compass },
              { id: 'orders', name: 'Order History', icon: ShoppingBag, count: clientOrders.length },
              { id: 'profile', name: 'Personal Profile', icon: User },
              { id: 'addresses', name: 'Billing Addresses', icon: MapPin },
              { id: 'password', name: 'Security Credentials', icon: Key }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase text-left transition-all shrink-0 cursor-pointer ${
                    active 
                      ? 'bg-[#1C4D8D]/10 text-[#1C4D8D] border border-[#1C4D8D]/30 font-bold shadow-sm' 
                      : 'text-[#1D2B3F]/60 hover:text-[#1D2B3F] hover:bg-[#1C4D8D]/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{tab.name}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-[#1C4D8D] text-[#F7F5F0] text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono font-bold ml-1.5">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* MAIN TABS PANEL (9 columns on lg) */}
          <section className="lg:col-span-9" id="account-tab-view-panel">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: EXECUTIVE DASHBOARD */}
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">Boutique Credentials</h3>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 space-y-2 shadow-sm">
                      <span className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Lifetime orders</span>
                      <div className="font-mono text-3xl font-bold text-[#1D2B3F]">{clientOrders.length}</div>
                      <p className="text-[10px] text-[#657892]/70 leading-normal pt-1">Authorized runs recorded in ledger.</p>
                    </div>
                    <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 space-y-2 shadow-sm">
                      <span className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Total Wardrobe Investment</span>
                      <div className="font-mono text-3xl font-bold text-[#1C4D8D]">Ugx {currentUser.spending}</div>
                      <p className="text-[10px] text-[#657892]/70 leading-normal pt-1">Accrued corporate value accounts.</p>
                    </div>
                    <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 space-y-2 shadow-sm">
                      <span className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Loyalty rewards balance</span>
                      <div className="font-mono text-3xl font-bold text-[#C6A15B]">{currentUser.rewardsPoints} Pts</div>
                      <p className="text-[10px] text-[#657892]/70 leading-normal pt-1">10% value cashback on active orders.</p>
                    </div>
                  </div>

                  {/* Loyalty reward card */}
                  <div className="bg-[#1D2B3F] border border-[#657892]/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-md">
                    <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#C6A15B]/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-[#C6A15B] font-mono font-bold uppercase">
                        <Award className="w-4.5 h-4.5" />
                        <span>Lubowa Platinum Elite Circle</span>
                      </div>
                      <h4 className="font-serif text-lg text-[#F7F5F0] font-semibold">Your Elite Shopping Privileges</h4>
                      <p className="text-xs text-[#B9CDE5] max-w-md font-light leading-relaxed">
                        As a valued member, you enjoy complimentary local courier, personal style pairing, priority booking at our showroom lounge, and 10% cash value reward points on all collections.
                      </p>
                    </div>
                    <div className="bg-[#F7F5F0]/5 border border-[#F7F5F0]/15 rounded-xl px-5 py-4 text-center shrink-0 w-full md:w-auto font-mono">
                      <span className="text-[9px] text-[#B9CDE5]/60 uppercase tracking-widest block font-medium">Next Tier Unlock</span>
                      <span className="text-[#F7F5F0] font-bold text-sm block mt-1">Gold Circle Status</span>
                      <span className="text-[10px] text-[#C6A15B] block mt-0.5">at Ugx 5,000 spend</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ORDER TIMELINE & DISPATCH LIST */}
              {activeTab === 'orders' && (
                <motion.div 
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">Executive Order Ledgers</h3>

                  {clientOrders.length === 0 ? (
                    <div className="text-center py-16 border border-[#657892]/20 bg-[#B9CDE5]/10 rounded-2xl space-y-4 shadow-sm">
                      <p className="text-xs text-[#657892] font-mono">No order dispatch records active in your profile ledger.</p>
                      <Link href="/shop" className="inline-block bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-widest font-sans transition-all duration-300">
                        Browse Collections
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {clientOrders.map((o) => (
                        <div key={o.id} className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 space-y-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#657892]/20 pb-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#657892] block">ORDER ID</span>
                              <span className="text-[#1D2B3F] font-mono font-bold text-sm tracking-wide">{o.id}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#657892] block">DATE RECORDED</span>
                              <span className="text-[#1D2B3F] text-xs font-mono font-semibold">{o.date}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#657892] block">TOTAL AMOUNT</span>
                              <span className="text-[#1D2B3F] text-sm font-semibold font-mono">Ugx {o.amount}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#657892] block">STATUS</span>
                              <span className={`text-[10px] font-mono uppercase font-bold px-3 py-1 rounded-full ${
                                o.status === 'Delivered' ? 'bg-green-600/10 text-green-700 border border-green-600/20' :
                                o.status === 'Processing' ? 'bg-blue-600/10 text-blue-700 border border-blue-600/20' :
                                o.status === 'Cancelled' ? 'bg-red-600/10 text-red-700 border border-red-600/20' :
                                'bg-yellow-600/10 text-yellow-700 border border-yellow-600/20'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                          </div>

                          {/* Order items nested */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="flex gap-3 items-center bg-[#F7F5F0] p-3 rounded-xl border border-[#657892]/15 shadow-sm">
                                <div className="relative w-10 h-12 rounded overflow-hidden shrink-0 border border-[#657892]/10 bg-[#F7F5F0]">
                                  <Image 
                                    src={getSafeImageSrc(it.image)}
                                    alt={it.productName}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-serif text-[#1D2B3F] text-xs font-semibold truncate">{it.productName}</h5>
                                  <p className="text-[9px] text-[#657892] font-mono mt-0.5">Size: {it.selectedSize} • Qty: {it.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Dynamic Dispatch Courier timeline */}
                          <div className="bg-[#B9CDE5]/10 border border-[#657892]/15 rounded-xl p-4 space-y-3 font-sans shadow-sm">
                            <span className="text-[9px] text-[#657892] uppercase tracking-widest font-mono font-bold">Courier Dispatch Timeline</span>
                            <div className="grid grid-cols-4 gap-2 items-center text-center">
                              {[
                                { step: "Placed", active: true, icon: Clock },
                                { step: "Processing", active: o.status !== 'Pending', icon: ShieldCheck },
                                { step: "Shipped", active: o.status === 'Delivered', icon: Ship },
                                { step: "Delivered", active: o.status === 'Delivered', icon: CheckCircle }
                              ].map((prog, index) => {
                                const ProgIcon = prog.icon;
                                return (
                                  <div key={index} className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                      prog.active ? 'bg-[#1C4D8D] border-[#1C4D8D] text-[#F7F5F0]' : 'border-[#657892]/25 text-[#657892]/40'
                                    }`}>
                                      <ProgIcon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[9px] font-mono tracking-wider mt-1 uppercase ${prog.active ? 'text-[#1D2B3F]' : 'text-[#657892]/50'}`}>{prog.step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: PERSONAL PROFILE */}
              {activeTab === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">Secure Profile Registry</h3>

                  <form onSubmit={handleProfileUpdateSubmit} className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 md:p-8 space-y-6 max-w-xl shadow-sm">
                    <div className="space-y-4 font-sans">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Full Registry Name</label>
                        <input 
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] focus:border-[#1C4D8D] outline-none shadow-sm"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Executive Email Address</label>
                          <input 
                            type="email"
                            value={currentUser.email}
                            disabled
                            className="w-full bg-[#657892]/10 border border-[#657892]/20 rounded-lg px-4 py-3 text-xs text-[#1D2B3F]/50 cursor-not-allowed outline-none"
                          />
                          <span className="text-[9px] text-[#657892]/60 block font-mono">Email cannot be modified once registry keys are locked.</span>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Secure Phone Connection</label>
                          <input 
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#657892]/20 flex items-center justify-between">
                      <button
                        type="submit"
                        className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer shadow-sm font-sans"
                      >
                        Update Registry Details
                      </button>
                      
                      {profileSuccess && (
                        <span className="text-[#C6A15B] text-xs font-mono font-bold animate-fade-in">Registry keys updated securely.</span>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}

              {/* TAB 4: BILLING ADDRESSES */}
              {activeTab === 'addresses' && (
                <motion.div 
                  key="addresses"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">Saved Addresses</h3>
                  
                  <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 flex items-start gap-4 max-w-md relative shadow-sm">
                    <MapPin className="w-6 h-6 text-[#C6A15B] shrink-0 mt-1" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base text-[#1D2B3F] font-semibold">Primary Address</h4>
                        <span className="bg-[#1C4D8D]/15 text-[#1C4D8D] text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#1C4D8D]/30">Active</span>
                      </div>
                      <p className="text-[#657892] text-xs leading-relaxed font-light">
                        Plot 42, Executive Rise, Lubowa<br />
                        Lubowa Hill, Wakiso, Kampala, Uganda
                      </p>
                      <button 
                        onClick={() => alert("Address edit keys temporarily locked. Contact support at Lubowa showroom.")} 
                        className="text-[10px] font-mono font-bold uppercase text-[#1C4D8D] hover:text-[#1C4D8D]/80 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Registry
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: CHANGE SECURITY PASSWORD */}
              {activeTab === 'password' && (
                <motion.div 
                  key="password"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  <h3 className="font-serif text-xl text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-3">Security Keys Reset</h3>

                  <form onSubmit={handlePasswordUpdateSubmit} className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-2xl p-6 md:p-8 space-y-6 max-w-xl shadow-sm">
                    <div className="space-y-4 font-sans">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Current Secure Password</label>
                        <input 
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/45 focus:border-[#1C4D8D] outline-none shadow-sm"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">New Secure Key</label>
                          <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/45 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Confirm New Key</label>
                          <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/45 focus:border-[#1C4D8D] outline-none shadow-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Meter Illustration */}
                    {newPassword.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono uppercase text-[#657892]">
                          <span>Security Strength</span>
                          <span className={newPassword.length >= 8 ? 'text-[#C6A15B] font-bold' : 'text-red-500 font-bold'}>
                            {newPassword.length >= 8 ? 'Approved Elite' : 'Vulnerable'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#657892]/20 rounded-full overflow-hidden flex">
                          <div className={`h-full transition-all duration-300 ${
                            newPassword.length < 5 ? 'w-1/4 bg-red-500' :
                            newPassword.length < 8 ? 'w-2/4 bg-yellow-500' : 'w-full bg-[#C6A15B]'
                          }`}></div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#657892]/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
                      <button
                        type="submit"
                        className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-sm font-sans"
                      >
                        Reset Password
                      </button>
                      
                      {passwordSuccess && (
                        <span className="text-[#C6A15B] text-xs font-mono font-bold animate-fade-in">Passwords encrypted and updated.</span>
                      )}
                      {passwordError && (
                        <span className="text-red-600 text-xs font-mono font-bold animate-fade-in">{passwordError}</span>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </section>

        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
