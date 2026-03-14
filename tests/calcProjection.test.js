// =============================================================================
// calcProjection Tests — unit tests + P8 length/range + P10 net worth formula
// =============================================================================

import * as fc from 'fast-check';
import { calcProjection, calcItemValue, ASSET_TYPES } from '../script.js';

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
  it('netWorth = assets + inflows - outflows - tax for each year', () => {
    fc.assert(
      fc.property(fc.array(itemArb, { minLength: 0, maxLength: 10 }), settingsArb, (items, settings) => {
        const result = calcProjection(items, settings);
        for (const row of result) {
          const { bank, investments, property, vehicles, rentals, inflows, outflows } = row.byType;
          const grossNetWorth = bank + investments + property + vehicles + rentals + inflows - outflows;
          const taxDeduction = row.tax ? row.tax.totalEstimatedTax : 0;
          expect(row.netWorth).toBeCloseTo(grossNetWorth - taxDeduction, 5);
        }
      })
    );
  });
});
