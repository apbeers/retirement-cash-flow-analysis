// =============================================================================
// calcItemValue Tests — unit tests + P9 compound growth formula
// =============================================================================

import * as fc from 'fast-check';
import { calcItemValue, ASSET_TYPES } from '../script.js';

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
