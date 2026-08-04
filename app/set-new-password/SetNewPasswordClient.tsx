'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function SetNewPasswordClient() {
  const router = useRouter();
  const resetPasswordRecovery = useStore((state) => state.resetPasswordRecovery);
  const fetchLatestState = useStore((state) => state.fetchLatestState);
  const currentUser = useStore((state) => state.currentUser);
  
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        // Clear mustChangePassword on currentUser in store
        if (currentUser) {
          useStore.setState({
            currentUser: {
              ...currentUser,
              mustChangePassword: false
            }
          });
        }
        await fetchLatestState();
        setTimeout(() => {
          router.push('/account');
        }, 1500);
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

          {/* RIGHT COLUMN: SPLIT SCREEN PASSWORD SET FORM */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Action Required</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">Set Your New Password</h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">
                Your account was set up with a temporary password by an administrator. Choose your own password to continue.
              </p>
            </div>

            {/* Error / Success logs */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex gap-3 text-rose-800 text-xs font-mono" id="set-password-error">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-emerald-800 text-xs font-mono" id="set-password-success">
                <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold block">Password Updated Successfully!</span>
                  <span>Your permanent password is saved. Redirecting to your account dashboard...</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 font-sans" id="set-new-password-form">
              <div className="space-y-1.5">
                <label htmlFor="set-new-password-input" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">New Personal Password</label>
                <input 
                  id="set-new-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                  aria-label="New Personal Password"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="set-confirm-password-input" className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Confirm Personal Password</label>
                <input 
                  id="set-confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-3 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                  aria-label="Confirm Personal Password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="submit-new-password-btn"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-[#F7F5F0] rounded-full animate-spin"></span>
                      <span>Updating Credentials...</span>
                    </span>
                  ) : (
                    <>
                      <span>Save New Password & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] pt-2 font-mono">
              <Link href="/login" className="text-[#1C4D8D] hover:underline">Sign out / Back to Login</Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
