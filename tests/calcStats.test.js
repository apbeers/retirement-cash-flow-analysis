// =============================================================================
// calcStats Tests — unit tests + P11 totals correctness
// =============================================================================

import * as fc from 'fast-check';
import { calcStats, ASSET_TYPES } from '../script.js';

// --- Arbitraries ---

const itemArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('bank', 'investments', 'property', 'vehicles', 'rentals', 'inflows', 'outflows'),
  category: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  amount: fc.float({ min: 0, max: 1e7, noNaN: true }),
  rate: fc.float({ min: -50, max: 50, noNaN: true }),
  startYear: fc.integer({ min: 2000, max: 2050 }),
  endYear: fc.integer({ min: 2000, max: 2080 }),
  createdAt: fc.constant(new Date().toISOString())
}).filter(item => item.startYear <= item.endYear);

const settingsArb = fc.record({
  startYear: fc.integer({ min: 2000, max: 2050 }),
  projectionYears: fc.integer({ min: 1, max: 50 })
});

// --- calcStats unit tests ---

describe('calcStats', () => {
  const settings = { startYear: 2025, projectionYears: 30 };

  it('returns zeros with no items', () => {
    expect(calcStats([], settings)).toEqual({ totalAssets: 0, annualInflow: 0, annualOutflow: 0 });
  });

  it('sums asset amounts active in startYear', () => {
    const items = [
      { type: 'bank', amount: 10000, rate: 5, startYear: 2020, endYear: 2030 },
      { type: 'investments', amount: 50000, rate: 7, startYear: 2025, endYear: 2040 }
    ];
    const { totalAssets } = calcStats(items, settings);
    expect(totalAssets).toBeCloseTo(60000);
  });

  it('excludes items not active in startYear', () => {
    const items = [
      { type: 'bank', amount: 10000, rate: 0, startYear: 2030, endYear: 2040 }
    ];
    expect(calcStats(items, settings).totalAssets).toBe(0);
  });

  it('sums inflows and outflows separately', () => {
    const items = [
      { type: 'inflows', amount: 80000, rate: 0, startYear: 2025, endYear: 2030 },
      { type: 'outflows', amount: 40000, rate: 0, startYear: 2025, endYear: 2030 }
    ];
    const stats = calcStats(items, settings);
    expect(stats.annualInflow).toBeCloseTo(80000);
    expect(stats.annualOutflow).toBeCloseTo(40000);
  });
});

// --- P11: Stats correctness ---

describe('P11: calcStats totals', () => {
  it('totalAssets, annualInflow, annualOutflow match manual sums', () => {
    fc.assert(
      fc.property(fc.array(itemArb, { minLength: 0, maxLength: 15 }), settingsArb, (items, settings) => {
        const stats = calcStats(items, settings);
        const year = settings.startYear;

        const active = items.filter(i => i.startYear <= year && year <= i.endYear);
        const expectedAssets = active.filter(i => ASSET_TYPES.includes(i.type)).reduce((s, i) => s + i.amount, 0);
        const expectedInflow = active.filter(i => i.type === 'inflows').reduce((s, i) => s + i.amount, 0);
        const expectedOutflow = active.filter(i => i.type === 'outflows').reduce((s, i) => s + i.amount, 0);

        expect(stats.totalAssets).toBeCloseTo(expectedAssets, 5);
        expect(stats.annualInflow).toBeCloseTo(expectedInflow, 5);
        expect(stats.annualOutflow).toBeCloseTo(expectedOutflow, 5);
      })
    );
  });
});
