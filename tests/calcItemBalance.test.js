// =============================================================================
// calcItemBalance Tests — recurring contributions & withdrawals
// =============================================================================

import { calcItemBalance } from '../script.js';

describe('calcItemBalance', () => {
  it('returns 0 when year < startYear', () => {
    const item = { id: 'a', amount: 1000, rate: 5, startYear: 2025, endYear: 2030 };
    const cache = {};
    expect(calcItemBalance(item, 2024, cache)).toBe(0);
  });

  it('returns 0 when year > endYear', () => {
    const item = { id: 'b', amount: 1000, rate: 5, startYear: 2025, endYear: 2030 };
    const cache = {};
    expect(calcItemBalance(item, 2031, cache)).toBe(0);
  });

  it('returns compound growth at startYear (seed * (1 + rate/100))', () => {
    const item = { id: 'c', amount: 1000, rate: 10, startYear: 2025, endYear: 2030 };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(1100);
  });

  it('reduces to compound growth when no contribution/withdrawal', () => {
    const item = { id: 'd', amount: 1000, rate: 10, startYear: 2025, endYear: 2030 };
    const cache = {};
    expect(calcItemBalance(item, 2027, cache)).toBeCloseTo(1331);
  });

  it('applies monthly contribution correctly', () => {
    const item = {
      id: 'e', amount: 10000, rate: 0, startYear: 2025, endYear: 2030,
      contributionAmount: 100, contributionFrequency: 'monthly'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(11200);
    expect(calcItemBalance(item, 2026, cache)).toBeCloseTo(12400);
  });

  it('applies annual contribution correctly', () => {
    const item = {
      id: 'f', amount: 10000, rate: 0, startYear: 2025, endYear: 2030,
      contributionAmount: 5000, contributionFrequency: 'annual'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(15000);
  });

  it('applies monthly withdrawal correctly', () => {
    const item = {
      id: 'g', amount: 50000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 1000, withdrawalFrequency: 'monthly'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(38000);
  });

  it('applies annual withdrawal correctly', () => {
    const item = {
      id: 'h', amount: 50000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(30000);
  });

  it('clamps balance to zero when withdrawal exceeds balance', () => {
    const item = {
      id: 'i', amount: 5000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 10000, withdrawalFrequency: 'annual'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBe(0);
    expect(calcItemBalance(item, 2026, cache)).toBe(0);
  });

  it('applies both contribution and withdrawal in the same year', () => {
    const item = {
      id: 'j', amount: 10000, rate: 5, startYear: 2025, endYear: 2030,
      contributionAmount: 500, contributionFrequency: 'monthly',
      withdrawalAmount: 200, withdrawalFrequency: 'monthly'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(14280);
  });

  it('handles endYear: null with projectionEndYear', () => {
    const item = {
      id: 'k', amount: 1000, rate: 0, startYear: 2025, endYear: null,
      contributionAmount: 1000, contributionFrequency: 'annual'
    };
    const cache = {};
    expect(calcItemBalance(item, 2030, cache, 2030)).toBeCloseTo(7000);
    expect(calcItemBalance(item, 2031, cache, 2030)).toBe(0);
  });

  it('seeds balanceCache correctly', () => {
    const item = { id: 'l', amount: 5000, rate: 10, startYear: 2025, endYear: 2030 };
    const cache = {};
    calcItemBalance(item, 2025, cache);
    expect(cache['l'][2024]).toBe(5000);
    expect(cache['l'][2025]).toBeCloseTo(5500);
  });

  it('contributions compound over multiple years with growth rate', () => {
    const item = {
      id: 'm', amount: 10000, rate: 10, startYear: 2025, endYear: 2030,
      contributionAmount: 1000, contributionFrequency: 'annual'
    };
    const cache = {};
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(12100);
    expect(calcItemBalance(item, 2026, cache)).toBeCloseTo(14410);
  });
});
