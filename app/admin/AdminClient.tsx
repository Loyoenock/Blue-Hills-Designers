'use client';

import React, { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  isChunkOrNetworkError,
  shouldPerformAutoReload,
  ADMIN_RELOAD_ATTEMPTS_KEY,
  ADMIN_RELOAD_TIMESTAMP_KEY,
  MAX_ADMIN_AUTO_RELOADS,
  ADMIN_RELOAD_WINDOW_MS
} from '@/lib/adminErrorUtils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorDigest?: string | null;
}

/**
 * Attempts an automatic page reload if within the allowed window and retry budget.
 * Returns true if a reload was initiated, false otherwise.
 */
function attemptAutoReload(error: any): boolean {
  if (typeof window === 'undefined') return false;

  const isChunkError = isChunkOrNetworkError(error);

  // Structured logging for dynamic import failure
  console.error('[AdminClient] Dynamic import failed for AdminPanel:', {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    isChunkError,
    url: typeof window !== 'undefined' ? window.location.href : '',
    stack: error?.stack,
  });

  if (!isChunkError) {
    return false;
  }

  try {
    const now = Date.now();
    const rawTime = sessionStorage.getItem(ADMIN_RELOAD_TIMESTAMP_KEY);
    const rawCount = sessionStorage.getItem(ADMIN_RELOAD_ATTEMPTS_KEY);

    const lastTime = rawTime ? parseInt(rawTime, 10) : 0;
    const currentCount = rawCount ? parseInt(rawCount, 10) : 0;

    const result = shouldPerformAutoReload(lastTime, currentCount, now);

    if (result.shouldReload) {
      sessionStorage.setItem(ADMIN_RELOAD_ATTEMPTS_KEY, result.nextCount.toString());
      sessionStorage.setItem(ADMIN_RELOAD_TIMESTAMP_KEY, result.nextTimestamp.toString());
      console.warn(`[AdminClient] Auto-reloading console (attempt ${result.nextCount}/${MAX_ADMIN_AUTO_RELOADS}) to recover chunk/network error...`);
      window.location.reload();
      return true;
    } else {
      console.warn(`[AdminClient] Max auto-reloads (${MAX_ADMIN_AUTO_RELOADS}) reached within ${ADMIN_RELOAD_WINDOW_MS / 1000}s. Surfacing Error Boundary.`);
    }
  } catch (storageErr) {
    console.warn('[AdminClient] sessionStorage access error during reload attempt:', storageErr);
  }

  return false;
}

class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorDigest: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const digest = (error as any)?.digest || null;
    return { hasError: true, error, errorDigest: digest };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isChunk = isChunkOrNetworkError(error);
    const digest = (error as any)?.digest || null;
    console.error('[AdminErrorBoundary] Admin Panel error caught:', {
      name: error?.name || 'Error',
      message: error?.message || 'Unknown error',
      digest,
      isChunkError: isChunk,
      url: typeof window !== 'undefined' ? window.location.href : '',
      componentStack: errorInfo?.componentStack,
    });
  }

  private handleManualReload = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(ADMIN_RELOAD_ATTEMPTS_KEY);
        sessionStorage.removeItem(ADMIN_RELOAD_TIMESTAMP_KEY);
      } catch {
        // Ignore storage cleanup issues
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isChunk = isChunkOrNetworkError(error);

      return (
        <div className="min-h-screen bg-black text-[#F7F5F0] flex flex-col items-center justify-center p-6 font-sans" id="admin-connection-timeout">
          <div className="max-w-md w-full bg-[#121212] border border-[#C6A15B]/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-red-500 text-lg font-mono">!</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-white tracking-tight">
                {isChunk ? 'Console Connection Timeout' : 'Operations Console Error'}
              </h2>
              <p className="text-xs text-[#657892] leading-relaxed font-light">
                {isChunk
                  ? 'A secure connection timeout or resource mismatch occurred while loading the boutique operations console chunks.'
                  : `An unexpected application error occurred during console initialization (${error?.name || 'Error'}: ${error?.message || 'Initialization failed'}).`}
              </p>
            </div>

            {error?.message && (
              <div className="bg-black/50 border border-white/10 rounded-lg p-3 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-1">Diagnostic Details</p>
                <p className="text-[11px] font-mono text-red-400 break-words line-clamp-2">
                  {error.name}: {error.message}
                </p>
                {this.state.errorDigest && (
                  <p className="text-[10px] font-mono text-white/30 mt-1">
                    Digest: {this.state.errorDigest}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                id="reconnect-console-button"
                onClick={this.handleManualReload}
                className="w-full py-3 px-4 rounded-xl bg-[#C6A15B] hover:bg-[#C6A15B]/90 text-black text-xs font-mono font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
              >
                Reconnect Console
              </button>
              <Link
                href="/login"
                id="admin-error-back-to-login"
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 text-[#657892] hover:text-white text-xs font-mono uppercase tracking-wider transition-colors duration-200 block text-center"
              >
                Back to Sign In
              </Link>
            </div>
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
      const reloaded = attemptAutoReload(error);
      if (reloaded) {
        return new Promise(() => {}); // Maintain dynamic block in a pending state while reloading
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
