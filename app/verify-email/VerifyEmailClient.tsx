'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSupabaseClient } from '../../lib/supabase';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    const tokenHash = searchParams.get('token_hash');
    const typeParam = searchParams.get('type') || 'signup';
    const code = searchParams.get('code');

    const autoVerify = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      if (tokenHash) {
        setIsLoading(true);
        setErrorMsg('');
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as any
          });
          if (error) {
            setErrorMsg(`Verification link validation failed: ${error.message}`);
          } else {
            setSuccess(true);
            setTimeout(() => {
              router.push('/login?verified=true');
            }, 2000);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Auto-verification failed.');
        } finally {
          setIsLoading(false);
        }
      } else if (code) {
        setIsLoading(true);
        setErrorMsg('');
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(`Verification link exchange failed: ${error.message}`);
          } else {
            setSuccess(true);
            setTimeout(() => {
              router.push('/login?verified=true');
            }, 2000);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Verification link failed to exchange.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    autoVerify();
  }, [searchParams, router]);

  if (!mounted) return null;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);
    setResendSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token })
      });

      const res = await response.json();
      if (!response.ok || !res.success) {
        setErrorMsg(res.error || 'Verification failed. Please check your credentials.');
      } else {
        // Sync client-side session if available
        if (res.session) {
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.setSession({
              access_token: res.session.access_token,
              refresh_token: res.session.refresh_token
            });
          }
        }
        
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setErrorMsg('Please specify your registered email address first.');
      return;
    }

    setErrorMsg('');
    setResendSuccess(false);
    setIsResending(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Database service is currently offline.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setResendSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Resend request failed.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">

      <main className="flex-1 w-full flex items-stretch bg-[#F7F5F0] min-h-[80vh]">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full max-w-7xl mx-auto px-4 md:px-8 py-10 gap-10">
          
          {/* LEFT COLUMN: SPLIT SCREEN PHOTOGRAPHY */}
          <div className="hidden lg:block lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#657892]/20 h-[650px] shadow-md">
            <Image 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg" 
              alt="Verification and trust theme"
              fill
              className="object-cover object-top filter brightness-45 contrast-105"
              sizes="40vw"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F] via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 space-y-3 font-sans">
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#C6A15B] font-bold">Verification Lounge</span>
              <h3 className="font-serif text-2xl text-white font-bold leading-tight">Securing Your Elite Brand Identity.</h3>
              <p className="text-xs text-white/70 font-light leading-relaxed">
                Confirm your premium email register keys to activate your private couture access, loyalty rewards, and priority booking options.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SPLIT SCREEN FORM */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Security Verification</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">Validate Elite Profile</h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">
                Submit the 6-digit security code dispatched to your registered email address to authorize registry activation.
              </p>
            </div>

            {/* Error / Success logs */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex gap-3 text-rose-800 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-emerald-800 text-xs font-mono">
                <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold block">Account Authorized!</span>
                  <span>Your email has been verified successfully. Opening executive sign-in gateway...</span>
                </div>
              </div>
            )}
            {resendSuccess && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-xs font-mono">
                <Mail className="w-5 h-5 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold block">Code Dispatched!</span>
                  <span>A fresh security OTP has been sent. Please check your spam folder if it does not arrive.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5 font-sans" id="verify-otp-form">
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
                <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">6-Digit Security OTP Code</label>
                <input 
                  type="text"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-center tracking-[0.5em] text-lg font-bold text-[#1D2B3F] placeholder-[#657892]/30 focus:border-[#1C4D8D] outline-none shadow-sm font-mono"
                  required
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="verify-otp-btn"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-[#F7F5F0] rounded-full animate-spin"></span>
                      <span>Authorizing Verification Code...</span>
                    </span>
                  ) : (
                    <>
                      <span>Authorize Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="w-full border border-[#657892]/30 hover:bg-[#657892]/5 text-[#1D2B3F] py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-60"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>{isResending ? 'Dispatching New Code...' : 'Resend Verification Code'}</span>
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] pt-2 font-mono">
              Ready to authenticate?{' '}
              <Link href="/login" className="text-[#1C4D8D] hover:underline">Back to Sign In</Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
