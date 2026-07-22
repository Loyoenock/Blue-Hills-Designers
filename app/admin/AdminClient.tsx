'use client';

import React, { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin Panel loading error caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-[#F7F5F0] flex flex-col items-center justify-center p-6 font-sans" id="admin-connection-timeout">
          <div className="max-w-md w-full bg-[#121212] border border-[#C6A15B]/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-red-500 text-lg font-mono">!</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-white tracking-tight">Console Connection Timeout</h2>
              <p className="text-xs text-[#657892] leading-relaxed font-light">
                A secure connection timeout or resource mismatch occurred while loading the boutique operations console.
              </p>
            </div>
            <button
              id="reconnect-console-button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#C6A15B] hover:bg-[#C6A15B]/90 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
            >
              Reconnect Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AdminPanel = dynamic<{}>(
  () =>
    (import('./AdminPanel') as Promise<any>).catch((error) => {
      console.error('Chunk loading failed for AdminPanel:', error);
      if (typeof window !== 'undefined') {
        const isChunkError =
          error.name === 'ChunkLoadError' ||
          /loading chunk/i.test(error.message) ||
          /failed to fetch/i.test(error.message);

        if (isChunkError) {
          const reloadKey = 'admin-chunk-reload-attempted';
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
      <div className="min-h-screen bg-black text-[#F7F5F0] flex flex-col items-center justify-center space-y-4 font-sans" id="admin-loading-screen">
        <div className="w-8 h-8 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#657892] font-mono animate-pulse">
          Securing BHD Connection...
        </p>
      </div>
    ),
  }
);

export default function AdminClient() {
  return (
    <AdminErrorBoundary>
      <AdminPanel />
    </AdminErrorBoundary>
  );
}
