'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, ArrowRight, AlertTriangle, Check, Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion } from 'motion/react';

export default function Register() {
  const router = useRouter();
  const { register, currentUser } = useStore();
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    if (!agreed) {
      setErrorMsg("Security constraint: You must agree to the Private Atelier Charter.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Security constraint: Password strength must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(name, email, phone, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/account');
        }, 1500);
      } else {
        setErrorMsg(res.error || "An error occurred compiling your elite registry.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred compiling your elite registry.");
    } finally {
      setIsLoading(false);
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
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw" 
              alt="Monaco Navy Tailored suit close up"
              fill
              className="object-cover object-top filter brightness-45 contrast-105"
              sizes="40vw"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F] via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 space-y-3 font-sans">
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#C6A15B] font-bold">The Monaco Wardrobe</span>
              <h3 className="font-serif text-2xl text-white font-bold leading-tight">Hand-Tailored Prestige.</h3>
              <p className="text-xs text-white/70 font-light leading-relaxed">
                By creating a client registry, you gain full access to private showrooms, priority measurement scheduling, and bespoke styling advice.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: SPLIT SCREEN REGISTER FORM (7 columns) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center max-w-lg mx-auto w-full space-y-8 lg:pl-10">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#1C4D8D] font-semibold">Join the Circle</span>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] tracking-tight font-bold">Create Elite Profile</h1>
              <p className="text-[#657892] text-xs md:text-sm font-light">Register your physical dimensions and corporate keys securely below.</p>
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
                <span>Registry compiled successfully. Opening client profile...</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 font-sans" id="register-profile-form">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Full Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Charles Mugisha"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Secure Email Address</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. mugisha@corporate.com"
                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
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
                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#657892] uppercase tracking-widest font-mono">Security Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded-lg px-4 py-2.5 text-xs text-[#1D2B3F] placeholder-[#657892]/30 focus:border-[#1C4D8D] outline-none shadow-sm"
                  required
                />
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-mono uppercase text-[#657892]">
                    <span>Key Strength</span>
                    <span className={password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {password.length >= 8 ? 'Approved' : 'Vulnerable'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#657892]/20 rounded-full overflow-hidden flex">
                    <div className={`h-full transition-all duration-300 ${
                      password.length < 5 ? 'w-1/4 bg-rose-500' :
                      password.length < 8 ? 'w-2/4 bg-amber-500' : 'w-full bg-emerald-600'
                    }`}></div>
                  </div>
                </div>
              )}

              <div className="pt-2 text-xs text-[#1D2B3F]/70">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="accent-[#1C4D8D] mt-0.5"
                  />
                  <span className="leading-relaxed">
                    I agree to the <span className="text-[#1C4D8D] underline">Private Atelier Charter</span>, acknowledging that all measurements and logs are securely cached under AES-256 local guidelines.
                  </span>
                </label>
              </div>

               <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="register-btn-final"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent border-[#F7F5F0] rounded-full animate-spin"></span>
                      <span>Compiling Elite Registry...</span>
                    </span>
                  ) : (
                    <>
                      <span>Compile Client Registry</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-[#657892] font-mono">
              Already have a private registry?{' '}
              <Link href="/login" className="text-[#1C4D8D] hover:underline">Sign In</Link>
            </div>

          </div>

        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
