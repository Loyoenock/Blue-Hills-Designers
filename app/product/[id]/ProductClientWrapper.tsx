'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ProductClient = dynamic(() => import('./ProductClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans" id="product-loading-screen">
      <div className="w-8 h-8 border-2 border-[#1C4D8D] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
        Securing Product Specifications...
      </p>
    </div>
  ),
});

export default function ProductClientWrapper() {
  return <ProductClient />;
}
