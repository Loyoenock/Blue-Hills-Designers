'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, HelpCircle, ArrowRight, Check, AlertTriangle, Key, ChevronRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion } from 'motion/react';

export default function Login() {
  const router = useRouter();
  const { login, currentUser, users } = useStore();
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (currentUser) {
        router.push('/account');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUser, router]);

  if (!mounted) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    const res = login(email);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/account');
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Login authorized keys mismatch.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
      <Header />

      <main className="flex-1 w-full flex items-stretch bg-[#F7F5F0] min-h-[80vh]">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full max-w-7xl mx-auto px-4 md:px-8 py-10 gap-10">
          
          {/* LEFT COLUMN: SPLIT SCREEN LUXURY PHOTOGRAPHY (5 columns) */}
          <div className="hidden lg:block lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#657892]/20 h-[650px] shadow-md">
            <Image 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg" 
              alt="Savile Midnight Pinstripe suit on male model"
              fill
              className="object-cover object-top filter brightness-45 contrast-105"
              sizes="40vw"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F] via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 space-y-3 font-sans">
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#C6A15B] font-bold">The Savile Wardrobe</span>
              <h3 className="font-serif text-2xl text-white font-bold leading-tight">Dress Like The Man You Intend To Become.</h3>
              <p className="text-xs text-white/70 font-light leading-relaxed">
                Unlock exclusive private tailoring guides, record physical sizing configurations securely, and view active courier shipments.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SPLIT SCREEN LOGIN FORM (7 columns) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Atelier Access</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">Executive Sign In</h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">Submit your registered credentials or select a fast validation profile below.</p>
            </div>

            {/* Error / Success logs */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex gap-3 text-rose-800 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {success && (
              <div className="bg-[#C6A15B]/10 border border-[#C6A15B]/30 rounded-lg p-4 flex gap-3 text-[#1D2B3F] text-xs font-mono font-bold">
                <Check className="w-5 h-5 shrink-0" />
                <span>Keys confirmed. Opening private lounge portal...</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5 font-sans" id="login-credentials-form">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Executive Email Address</label>
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
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Security Password</label>
                  <button 
                    type="button"
                    onClick={() => alert("Please select a predefined validation profile below to bypass password checks.")}
                    className="text-[10px] font-mono text-[#1C4D8D] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/30 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#1D2B3F]/70">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#1C4D8D]"
                  />
                  <span>Keep credential keys active</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  id="login-btn-final"
                >
                  <span>Authorize Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] pt-2 font-mono">
              Don&apos;t have an elite profile?{' '}
              <Link href="/register" className="text-[#1C4D8D] hover:underline">Register Here</Link>
            </div>

            {/* PRE-DEFINED QUICK LOGIN PERSONAS */}
            <div className="border-t border-[#657892]/20 pt-6 space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Fast-Track Validation Personas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setEmail(u.email);
                      setPassword('securityKeysApproved');
                      login(u.email);
                      setSuccess(true);
                      setTimeout(() => {
                        router.push(u.role === 'Customer' ? '/account' : '/admin');
                      }, 1000);
                    }}
                    className="bg-[#B9CDE5]/10 hover:bg-[#B9CDE5]/20 border border-[#657892]/25 p-2.5 rounded-lg text-left transition-all flex justify-between items-center cursor-pointer shadow-sm"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#1D2B3F] block">{u.name}</span>
                      <span className="text-[9px] text-[#1C4D8D] font-mono uppercase">{u.role}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#657892]/60" />
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
