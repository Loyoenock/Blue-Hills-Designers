import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-[#F7F5F0] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-[#121212] border border-[#C6A15B]/20 rounded-2xl p-8 space-y-6 shadow-2xl">
        <h2 className="font-serif text-3xl font-bold text-white tracking-tight">404</h2>
        <p className="text-sm text-[#657892] leading-relaxed font-light">
          The requested page could not be located in our showroom registry.
        </p>
        <Link
          href="/"
          className="inline-block py-3 px-6 rounded-xl bg-[#C6A15B] hover:bg-[#C6A15B]/90 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
        >
          Return to Showroom
        </Link>
      </div>
    </div>
  );
}
