'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, HelpCircle, ArrowRight, Check, AlertTriangle, Key
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { motion } from 'motion/react';

export default function LoginClient() {
  const router = useRouter();
  const login = useStore((state) => state.login);
  const forgotPassword = useStore((state) => state.forgotPassword);
  const currentUser = useStore((state) => state.currentUser);
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);
    setForgotPasswordSuccess(false);
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        const res = await forgotPassword(email);
        if (res.success) {
          setForgotPasswordSuccess(true);
        } else {
          setErrorMsg(res.error || 'Failed to submit recovery request.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          setSuccess(true);
          setTimeout(() => {
            router.push('/account');
          }, 1500);
        } else {
          setErrorMsg(res.error || 'Login authorized credentials mismatch.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">

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
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#C6A15B] font-bold">The Executive Wardrobe</span>
              <h3 className="font-serif text-2xl text-white font-bold leading-tight">Dress Like The Man You Intend To Become.</h3>
              <p className="text-xs text-white/70 font-light leading-relaxed">
                Unlock exclusive corporate style guides, save your ready-to-wear sizing preferences securely, and view active courier shipments.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SPLIT SCREEN LOGIN FORM (7 columns) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Boutique Access</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">
                {isForgotPassword ? 'Recover Credentials' : 'Executive Sign In'}
              </h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">
                {isForgotPassword 
                  ? 'Submit your registered email address to receive a secure password recovery link.' 
                  : 'Submit your registered credentials or select a fast validation profile below.'}
              </p>
            </div>

            {/* Error / Success logs */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex flex-col gap-2 text-rose-800 text-xs font-mono">
                <div className="flex gap-3 items-center">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                {errorMsg.toLowerCase().includes('unavailable') && (
                  <button
                    type="submit"
                    form="login-credentials-form"
                    className="mt-1 self-start text-[11px] underline font-sans font-semibold text-rose-900 hover:text-rose-700 cursor-pointer"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            )}
            {success && (
              <div className="bg-[#C6A15B]/10 border border-[#C6A15B]/30 rounded-lg p-4 flex gap-3 text-[#1D2B3F] text-xs font-mono font-bold">
                <Check className="w-5 h-5 shrink-0" />
                <span>Keys confirmed. Opening private showroom portal...</span>
              </div>
            )}
            {forgotPasswordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-emerald-800 text-xs font-mono">
                <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold block">Transmission Successful!</span>
                  <span>A secure recovery link has been dispatched. Please inspect your email inbox.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5 font-sans" id="login-credentials-form">
              <div className="space-y-1.5">
                <label htmlFor="login-email-input" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Executive Email Address</label>
                <input 
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. executive@corporate.com"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                  aria-label="Executive Email Address"
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="login-password-input" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Security Password</label>
                    <button 
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setForgotPasswordSuccess(false);
                        setIsForgotPassword(true);
                      }}
                      className="text-[10px] font-mono text-[#1C4D8D] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input 
                    id="login-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/30 focus:border-[#1C4D8D] outline-none shadow-sm"
                    required
                    aria-label="Security Password"
                  />
                </div>
              )}

              {!isForgotPassword && (
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
              )}

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="login-btn-final"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-[#F7F5F0] rounded-full animate-spin"></span>
                      <span>{isForgotPassword ? 'Dispatching Link...' : 'Verifying Credentials...'}</span>
                    </span>
                  ) : (
                    <>
                      <span>{isForgotPassword ? 'Transmit Recovery Link' : 'Authorize Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setForgotPasswordSuccess(false);
                      setIsForgotPassword(false);
                    }}
                    className="w-full border border-[#657892]/30 hover:bg-[#657892]/5 text-[#1D2B3F] py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all text-center cursor-pointer font-mono"
                  >
                    ← Back to Authorized Sign In
                  </button>
                )}
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] pt-2 font-mono">
              Don&apos;t have an elite profile?{' '}
              <Link href="/register" className="text-[#1C4D8D] hover:underline">Register Here</Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
