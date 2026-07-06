'use client';

import React, { useState, useEffect } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutClientWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans" id="checkout-loading-screen">
        <div className="w-8 h-8 border-2 border-[#1C4D8D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
          Securing Order Channels...
        </p>
      </div>
    );
  }

  return <CheckoutClient />;
}
