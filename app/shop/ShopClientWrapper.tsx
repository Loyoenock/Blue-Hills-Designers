'use client';

import dynamic from 'next/dynamic';

const ShopClient = dynamic<{}>(
  () =>
    (import('./ShopClient') as Promise<any>).catch((error) => {
      console.error('Chunk loading failed for ShopClient:', error);
      if (typeof window !== 'undefined') {
        const isChunkError =
          error.name === 'ChunkLoadError' ||
          /loading chunk/i.test(error.message) ||
          /failed to fetch/i.test(error.message) ||
          /chunk/i.test(error.message);

        if (isChunkError) {
          const reloadKey = 'shop-chunk-reload-attempted';
          const lastAttempt = sessionStorage.getItem(reloadKey);
          const now = Date.now();

          // Safely attempt page refresh once within 10 seconds to fetch updated chunks
          if (!lastAttempt || now - parseInt(lastAttempt, 10) > 10000) {
            sessionStorage.setItem(reloadKey, now.toString());
            window.location.reload();
            return new Promise(() => {}); // Maintain dynamic block in a pending state
          }
        }
      }
      throw error;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans" id="shop-loading-screen">
        <div className="w-8 h-8 border-2 border-[#1C4D8D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
          Loading Boutique Registry...
        </p>
      </div>
    ),
  }
);

export default function ShopClientWrapper() {
  return <ShopClient />;
}
