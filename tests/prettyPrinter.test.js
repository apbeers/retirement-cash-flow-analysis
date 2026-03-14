// =============================================================================
// PrettyPrinter Tests — formatMoney unit + P12 property
// =============================================================================
// Feature: retirement-cash-flow-planner, Property 12: formatMoney abbreviation rules

import * as fc from 'fast-check';
import { formatMoney } from '../script.js';

// --- Unit tests ---

describe('formatMoney', () => {
  it('returns $0 for zero', () => {
    expect(formatMoney(0)).toBe('$0');
  });

  it('returns integer dollars for values under 1000', () => {
    expect(formatMoney(500)).toBe('$500');
    expect(formatMoney(999)).toBe('$999');
    expect(formatMoney(1)).toBe('$1');
  });

  it('returns $X.XK for values in [1000, 1000000)', () => {
    expect(formatMoney(1000)).toBe('$1.0K');
    expect(formatMoney(2300)).toBe('$2.3K');
    expect(formatMoney(999999)).toBe('$1000.0K');
  });

  it('returns $X.XM for values >= 1000000', () => {
    expect(formatMoney(1000000)).toBe('$1.0M');
    expect(formatMoney(1500000)).toBe('$1.5M');
    expect(formatMoney(2750000)).toBe('$2.8M');
  });
});

// --- Property 12 ---

describe('P12: formatMoney abbreviation rules', () => {
  // Validates: Requirements 5.5, 11.2

  it('values < 1000 produce $X integer format', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (v) => {
        const result = formatMoney(v);
        expect(result).toMatch(/^\$\d+$/);
      })
    );
  });

  it('values in [1000, 1000000) produce $X.XK format', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 999999 }), (v) => {
        const result = formatMoney(v);
        expect(result).toMatch(/^\$\d+\.\dK$/);
      })
    );
  });

  it('values >= 1000000 produce $X.XM format', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000000, max: 1e12 }), (v) => {
        const result = formatMoney(v);
        expect(result).toMatch(/^\$\d+\.\dM$/);
      })
    );
  });
});
