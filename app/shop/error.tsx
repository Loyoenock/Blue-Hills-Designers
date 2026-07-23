'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Shop segment error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-center text-[#1D2B3F] font-sans">
      <h2 className="font-serif text-2xl font-bold mb-2">Boutique Registry Error</h2>
      <p className="text-sm text-[#657892] max-w-md mb-6 font-light">
        We encountered a temporary issue while loading the product collection.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          className="bg-[#1C4D8D] text-[#F7F5F0] px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-opacity-90 transition-all cursor-pointer"
        >
          Reload Page
        </button>
        <button
          onClick={() => reset()}
          className="border border-[#1D2B3F] text-[#1D2B3F] px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#1D2B3F]/5 transition-all cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    </div>
  );
}
