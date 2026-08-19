import { describe, it, expect } from 'vitest';
import {
  isChunkOrNetworkError,
  shouldPerformAutoReload,
  MAX_ADMIN_AUTO_RELOADS,
  ADMIN_RELOAD_WINDOW_MS
} from '@/lib/adminErrorUtils';

describe('Admin Console Error Classification & Auto-Reload Budget', () => {
  it('correctly classifies ChunkLoadError and network chunk failures', () => {
    expect(isChunkOrNetworkError({ name: 'ChunkLoadError', message: 'Loading chunk 42 failed' })).toBe(true);
    expect(isChunkOrNetworkError(new Error('Failed to fetch dynamically imported module /_next/static/chunks/admin.js'))).toBe(true);
    expect(isChunkOrNetworkError(new Error('loading chunk 102 failed'))).toBe(true);
    expect(isChunkOrNetworkError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkOrNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isChunkOrNetworkError(new TypeError('network error during module load'))).toBe(true);
  });

  it('correctly rejects generic runtime exceptions from chunk reload triggers', () => {
    expect(isChunkOrNetworkError(new Error('Cannot read property of undefined'))).toBe(false);
    expect(isChunkOrNetworkError(new ReferenceError('variable is not defined'))).toBe(false);
    expect(isChunkOrNetworkError(null)).toBe(false);
    expect(isChunkOrNetworkError(undefined)).toBe(false);
  });

  it('permits initial auto reload (attempt 1 of 2)', () => {
    const now = 100000;
    const result = shouldPerformAutoReload(0, 0, now);
    expect(result.shouldReload).toBe(true);
    expect(result.nextCount).toBe(1);
    expect(result.nextTimestamp).toBe(now);
  });

  it('permits second auto reload within 30s window (attempt 2 of 2)', () => {
    const startTime = 100000;
    const secondTime = startTime + 5000; // 5 seconds later
    const result = shouldPerformAutoReload(startTime, 1, secondTime);
    expect(result.shouldReload).toBe(true);
    expect(result.nextCount).toBe(2);
    expect(result.nextTimestamp).toBe(secondTime);
  });

  it('blocks third auto reload within 30s window and falls through to ErrorBoundary', () => {
    const startTime = 100000;
    const thirdTime = startTime + 10000; // 10 seconds later
    const result = shouldPerformAutoReload(startTime, 2, thirdTime);
    expect(result.shouldReload).toBe(false);
    expect(result.nextCount).toBe(2);
  });

  it('resets reload counter after 30s window expires', () => {
    const startTime = 100000;
    const laterTime = startTime + ADMIN_RELOAD_WINDOW_MS + 1000; // 31 seconds later
    const result = shouldPerformAutoReload(startTime, 2, laterTime);
    expect(result.shouldReload).toBe(true);
    expect(result.nextCount).toBe(1);
    expect(result.nextTimestamp).toBe(laterTime);
  });
});
