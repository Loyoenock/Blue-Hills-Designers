import { describe, it, expect } from 'vitest';

function calculateRevenueTargetMetrics(totalRevenue: number, revenueTarget: number = 50000) {
  const achievedPct = revenueTarget > 0 ? Math.min(100, Math.round((totalRevenue / revenueTarget) * 100)) : 0;
  return {
    achievedPct,
    targetText: `Showroom target of Ugx ${revenueTarget.toLocaleString()} corporate investment on menswear collections is ${achievedPct}% completed.`,
    achievedLabel: `${achievedPct}% Achieved`,
    revenueText: `Ugx ${totalRevenue.toLocaleString()}`,
  };
}

describe('Dashboard Lubowa Retail Target Widget Metrics', () => {
  it('calculates metrics correctly for zero revenue', () => {
    const metrics = calculateRevenueTargetMetrics(0, 50000);
    expect(metrics.achievedPct).toBe(0);
    expect(metrics.targetText).toBe(
      'Showroom target of Ugx 50,000 corporate investment on menswear collections is 0% completed.'
    );
    expect(metrics.achievedLabel).toBe('0% Achieved');
    expect(metrics.revenueText).toBe('Ugx 0');
  });

  it('calculates metrics correctly for partial achievement (e.g., Ugx 32,500 of 50,000)', () => {
    const metrics = calculateRevenueTargetMetrics(32500, 50000);
    expect(metrics.achievedPct).toBe(65);
    expect(metrics.targetText).toBe(
      'Showroom target of Ugx 50,000 corporate investment on menswear collections is 65% completed.'
    );
    expect(metrics.achievedLabel).toBe('65% Achieved');
    expect(metrics.revenueText).toBe('Ugx 32,500');
  });

  it('caps percentage at 100% while keeping actual revenue figure when revenue exceeds target', () => {
    const metrics = calculateRevenueTargetMetrics(75000, 50000);
    expect(metrics.achievedPct).toBe(100);
    expect(metrics.targetText).toBe(
      'Showroom target of Ugx 50,000 corporate investment on menswear collections is 100% completed.'
    );
    expect(metrics.achievedLabel).toBe('100% Achieved');
    expect(metrics.revenueText).toBe('Ugx 75,000');
  });

  it('handles custom revenueTarget settings correctly', () => {
    const metrics = calculateRevenueTargetMetrics(25000, 100000);
    expect(metrics.achievedPct).toBe(25);
    expect(metrics.targetText).toBe(
      'Showroom target of Ugx 100,000 corporate investment on menswear collections is 25% completed.'
    );
    expect(metrics.achievedLabel).toBe('25% Achieved');
    expect(metrics.revenueText).toBe('Ugx 25,000');
  });
});
