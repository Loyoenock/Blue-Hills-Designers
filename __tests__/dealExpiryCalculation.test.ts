import { describe, it, expect } from 'vitest';

function calculateDealExpiresAt(
  isDeal: boolean,
  explicitDateTime?: string | null,
  days = 0,
  hours = 0,
  mins = 0,
  secs = 0
): string | null {
  if (!isDeal) return null;

  if (explicitDateTime && explicitDateTime.trim() !== '' && !isNaN(new Date(explicitDateTime).getTime())) {
    return new Date(explicitDateTime).toISOString();
  }

  const durationMs = (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
  if (durationMs > 0) {
    return new Date(Date.now() + durationMs).toISOString();
  }

  return null;
}

describe('calculateDealExpiresAt', () => {
  it('returns null when deal is disabled', () => {
    expect(calculateDealExpiresAt(false, null, 1, 0, 0, 0)).toBeNull();
  });

  it('uses explicit ISO datetime if provided and valid', () => {
    const target = '2026-12-31T23:59:00.000Z';
    expect(calculateDealExpiresAt(true, target, 1, 2, 3, 4)).toBe(new Date(target).toISOString());
  });

  it('computes absolute future ISO timestamp from relative duration fields when no explicit datetime provided', () => {
    const before = Date.now();
    const result = calculateDealExpiresAt(true, null, 2, 0, 0, 0);
    const after = Date.now();

    expect(result).not.toBeNull();
    const expiryMs = new Date(result!).getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    expect(expiryMs).toBeGreaterThanOrEqual(before + twoDaysMs);
    expect(expiryMs).toBeLessThanOrEqual(after + twoDaysMs);
  });

  it('returns null if deal is enabled but duration is 0 and no datetime provided', () => {
    expect(calculateDealExpiresAt(true, null, 0, 0, 0, 0)).toBeNull();
  });
});
