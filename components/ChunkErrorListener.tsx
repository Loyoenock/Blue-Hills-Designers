'use client';

import { useEffect } from 'react';

export default function ChunkErrorListener() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper to perform a safe reload to avoid infinite reload loop
    const safeReload = () => {
      const lastReloadKey = 'chunk-load-last-reload';
      const now = Date.now();
      const lastReload = sessionStorage.getItem(lastReloadKey);
      
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(lastReloadKey, now.toString());
        console.warn('ChunkErrorListener: Chunk load failure detected. Reloading page...');
        window.location.reload();
      }
    };

    // 1. Capture asset loading failures (like script tag/stylesheet loading errors)
    const handleError = (event: ErrorEvent) => {
      // Script tags or link tags that failed to load
      const target = event.target as any;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const url = target.src || target.href;
        if (url && (url.includes('chunk') || url.includes('_next/static') || url.includes('page.js'))) {
          safeReload();
        }
      }
    };

    // 2. Capture unhandled promise rejections (Next.js client-side routing chunk failures)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (error) {
        const errorMsg = error.message || '';
        const errorStack = error.stack || '';
        const isChunkError =
          errorMsg.includes('Loading chunk') ||
          errorMsg.includes('CSS chunk') ||
          errorMsg.includes('failed to load') ||
          errorMsg.includes('chunk') ||
          errorMsg.includes('timeout') ||
          error.name === 'ChunkLoadError' ||
          errorStack.includes('ChunkLoadError');

        if (isChunkError) {
          safeReload();
        }
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
