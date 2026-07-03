'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console
    console.error('Next.js captured a render error:', error);

    // Check if it is a chunk load failure or network failure
    const errorMsg = error?.message || '';
    const errorStack = error?.stack || '';
    const isChunkError =
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('CSS chunk') ||
      errorMsg.includes('failed to load') ||
      errorMsg.includes('chunk') ||
      errorMsg.includes('timeout') ||
      errorStack.includes('ChunkLoadError');

    if (isChunkError) {
      if (typeof window !== 'undefined') {
        const lastReloadKey = 'chunk-load-last-reload';
        const now = Date.now();
        const lastReload = sessionStorage.getItem(lastReloadKey);
        
        // Prevent infinite reload loop
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(lastReloadKey, now.toString());
          window.location.reload();
        }
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center p-6 text-center text-[#1D2B3F]">
      <h2 className="font-serif text-2xl font-bold mb-2">Registry Connection Slow</h2>
      <p className="text-sm text-[#657892] max-w-md mb-6 font-light">
        We encountered a temporary connection timeout while loading the boutique registry.
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
