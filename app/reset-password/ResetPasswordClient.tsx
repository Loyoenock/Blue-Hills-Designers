'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSupabaseClient } from '../../lib/supabase';

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetPasswordRecovery = useStore((state) => state.resetPasswordRecovery);
  
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');

    const handleAutoAuth = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      if (code) {
        setIsVerifying(true);
        setErrorMsg('');
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(`Recovery token exchange failed: ${error.message}`);
          } else {
            console.log('[RESET] Recovery session authenticated successfully via code exchange.');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Recovery link failed to exchange.');
        } finally {
          setIsVerifying(false);
        }
      } else if (tokenHash) {
        setIsVerifying(true);
        setErrorMsg('');
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          if (error) {
            setErrorMsg(`Recovery OTP verification failed: ${error.message}`);
          } else {
            console.log('[RESET] Recovery session authenticated successfully via token hash verification.');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Recovery token verification failed.');
        } finally {
          setIsVerifying(false);
        }
      }
    };

    handleAutoAuth();
  }, [searchParams]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    if (password.length < 6) {
      setErrorMsg('Your security password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('The confirmation password does not match the chosen password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordRecovery(password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      } else {
        setErrorMsg(res.error || 'Failed to apply new security credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during password update.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">

      <main className="flex-1 w-full flex items-stretch bg-[#F7F5F0] min-h-[80vh]">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full max-w-7xl mx-auto px-4 md:px-8 py-10 gap-10">
          
          {/* LEFT COLUMN: SPLIT SCREEN LUXURY PHOTOGRAPHY */}
          <div className="hidden lg:block lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#657892]/20 h-[650px] shadow-md">
            <Image 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg" 
              alt="Tailoring workshop details"
              fill
              className="object-cover object-top filter brightness-45 contrast-105"
              sizes="40vw"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F] via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 space-y-3 font-sans">
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#C6A15B] font-bold">Security & Identity</span>
              <h3 className="font-serif text-2xl text-white font-bold leading-tight">Elevated Security for Premium Wardrobes.</h3>
              <p className="text-xs text-white/70 font-light leading-relaxed">
                Protect your customized fit profiles, order transaction histories, and private design appointments with robust security.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SPLIT SCREEN PASSWORD RESET FORM */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Security Update</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">Initialize New Password</h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">
                Configure your new private entry keys. Make sure your password contains strong and secure alphanumeric characters.
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
                  <span className="font-bold block">Credentials Saved!</span>
                  <span>Your password has been reset securely. Redirecting to your executive account page...</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 font-sans" id="reset-password-form">
              <div className="space-y-1.5">
                <label htmlFor="reset-new-password" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">New Security Password</label>
                <input 
                  id="reset-new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                  aria-label="New Security Password"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reset-confirm-password" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Confirm New Password</label>
                <input 
                  id="reset-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                  aria-label="Confirm New Password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="reset-password-btn"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-[#F7F5F0] rounded-full animate-spin"></span>
                      <span>Saving Secure Credentials...</span>
                    </span>
                  ) : (
                    <>
                      <span>Apply New Credentials</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] pt-2 font-mono">
              Remembered your credentials?{' '}
              <Link href="/login" className="text-[#1C4D8D] hover:underline">Back to Sign In</Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
