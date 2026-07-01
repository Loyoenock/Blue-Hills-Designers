'use client';

import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('./AdminPanel'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black text-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans">
      <div className="w-8 h-8 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
        Securing Boutique Connection...
      </p>
    </div>
  ),
});

export default function AdminPage() {
  return <AdminPanel />;
}
