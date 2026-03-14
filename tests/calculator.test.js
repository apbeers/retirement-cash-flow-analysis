// =============================================================================
// Calculator Tests — calcItemValue, calcProjection, calcStats
// P8, P9, P10, P11
// =============================================================================

import * as fc from 'fast-check';
import { calcItemValue, calcProjection, calcStats, ASSET_TYPES } from '../script.js';

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

// --- calcItemValue unit tests ---

describe('calcItemValue', () => {
  it('returns 0 when year < startYear', () => {
    const item = { amount: 1000, rate: 5, startYear: 2025, endYear: 2030 };
    expect(calcItemValue(item, 2024)).toBe(0);
  });

  it('returns 0 when year > endYear', () => {
    const item = { amount: 1000, rate: 5, startYear: 2025, endYear: 2030 };
    expect(calcItemValue(item, 2031)).toBe(0);
  });

  it('returns amount unchanged at startYear (rate irrelevant)', () => {
    const item = { amount: 5000, rate: 10, startYear: 2025, endYear: 2030 };
    expect(calcItemValue(item, 2025)).toBeCloseTo(5000);
  });

  it('applies compound growth correctly', () => {
    const item = { amount: 1000, rate: 10, startYear: 2025, endYear: 2030 };
    expect(calcItemValue(item, 2027)).toBeCloseTo(1000 * 1.1 ** 2);
  });

  it('handles negative rates (depreciation)', () => {
    const item = { amount: 20000, rate: -15, startYear: 2025, endYear: 2035 };
    expect(calcItemValue(item, 2026)).toBeCloseTo(20000 * 0.85);
  });

  it('handles zero rate', () => {
    const item = { amount: 3000, rate: 0, startYear: 2025, endYear: 2030 };
    expect(calcItemValue(item, 2028)).toBeCloseTo(3000);
  });
});

// --- P9: Compound growth formula correctness ---

describe('P9: calcItemValue compound formula', () => {
  // Validates: Requirements 3.2, 3.3, 3.5

  it('matches formula for years within range', () => {
    fc.assert(
      fc.property(itemArb, (item) => {
        const year = item.startYear + Math.floor((item.endYear - item.startYear) / 2);
        const expected = item.amount * Math.pow(1 + item.rate / 100, year - item.startYear);
        expect(calcItemValue(item, year)).toBeCloseTo(expected, 5);
      })
    );
  });

  it('returns 0 for years outside range', () => {
    fc.assert(
      fc.property(itemArb, (item) => {
        expect(calcItemValue(item, item.startYear - 1)).toBe(0);
        expect(calcItemValue(item, item.endYear + 1)).toBe(0);
      })
    );
  });
});

// --- calcProjection unit tests ---

describe('calcProjection', () => {
  const settings = { startYear: 2025, projectionYears: 5 };

  it('returns exactly projectionYears entries', () => {
    expect(calcProjection([], settings)).toHaveLength(5);
  });

  it('years run from startYear to startYear + projectionYears - 1', () => {
    const result = calcProjection([], settings);
    expect(result[0].year).toBe(2025);
    expect(result[4].year).toBe(2029);
  });

  it('netWorth is 0 with no items', () => {
    const result = calcProjection([], settings);
    result.forEach(r => expect(r.netWorth).toBe(0));
  });

  it('inflows add to netWorth, outflows subtract', () => {
    const items = [
      { type: 'inflows', amount: 50000, rate: 0, startYear: 2025, endYear: 2029 },
      { type: 'outflows', amount: 30000, rate: 0, startYear: 2025, endYear: 2029 }
    ];
    const result = calcProjection(items, settings);
    expect(result[0].netWorth).toBeCloseTo(20000);
  });

  it('inactive items do not contribute', () => {
    const items = [
      { type: 'bank', amount: 10000, rate: 0, startYear: 2030, endYear: 2035 }
    ];
    const result = calcProjection(items, settings);
    expect(result[0].byType.bank).toBe(0);
  });
});

// --- P8: Projection covers exactly projectionYears entries ---

describe('P8: calcProjection length and year range', () => {
  // Validates: Requirements 3.1

  it('always returns projectionYears entries with correct year range', () => {
    fc.assert(
      fc.property(settingsArb, (settings) => {
        const result = calcProjection([], settings);
        expect(result).toHaveLength(settings.projectionYears);
        expect(result[0].year).toBe(settings.startYear);
        expect(result[result.length - 1].year).toBe(settings.startYear + settings.projectionYears - 1);
      })
    );
  });
});

// --- P10: Net worth formula correctness ---

describe('P10: calcProjection net worth formula', () => {
  // Validates: Requirements 3.4

  it('netWorth = assets + inflows - outflows for each year', () => {
    fc.assert(
      fc.property(fc.array(itemArb, { minLength: 0, maxLength: 10 }), settingsArb, (items, settings) => {
        const result = calcProjection(items, settings);
        for (const row of result) {
          const { bank, investments, property, vehicles, rentals, inflows, outflows } = row.byType;
          const expected = bank + investments + property + vehicles + rentals + inflows - outflows;
          expect(row.netWorth).toBeCloseTo(expected, 5);
        }
      })
    );
  });
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
  // Validates: Requirements 5.1, 5.2, 5.3

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
