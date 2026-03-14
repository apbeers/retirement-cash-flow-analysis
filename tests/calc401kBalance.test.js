// =============================================================================
// calc401kBalance Tests — contributions, vesting, withdrawals, projection wiring
// =============================================================================

import { calc401kBalance, calcProjection } from '../script.js';

describe('calc401kBalance', () => {
  it('returns 0 when year < startYear', () => {
    const item = {
      id: '401k-1', amount: 10000, rate: 7, startYear: 2025, endYear: 2060,
      retirement401k: { employeeContribution: 6000, employerMatchPct: 100, employerMatchCapPct: 6, annualSalary: 100000, vestingYears: 0, withdrawalStartYear: null }
    };
    const cache = {};
    expect(calc401kBalance(item, 2024, cache)).toBe(0);
  });

  it('returns 0 when year > endYear', () => {
    const item = {
      id: '401k-2', amount: 10000, rate: 7, startYear: 2025, endYear: 2030,
      retirement401k: { employeeContribution: 6000, employerMatchPct: 100, employerMatchCapPct: 6, annualSalary: 100000, vestingYears: 0, withdrawalStartYear: null }
    };
    const cache = {};
    expect(calc401kBalance(item, 2031, cache)).toBe(0);
  });

  it('contribution phase with employer match (immediate vesting)', () => {
    const item = {
      id: '401k-3', amount: 10000, rate: 0, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 6000, employerMatchPct: 100, employerMatchCapPct: 6,
        annualSalary: 100000, vestingYears: 0, withdrawalStartYear: null
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(22000);
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(34000);
  });

  it('contribution phase with growth rate', () => {
    const item = {
      id: '401k-4', amount: 10000, rate: 10, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 5000, employerMatchPct: 50, employerMatchCapPct: 5,
        annualSalary: 80000, vestingYears: 0, withdrawalStartYear: null
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(18700);
  });

  it('vesting: employer match not applied before vesting years', () => {
    const item = {
      id: '401k-5', amount: 0, rate: 0, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 6000, employerMatchPct: 100, employerMatchCapPct: 6,
        annualSalary: 100000, vestingYears: 3, withdrawalStartYear: null
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(6000);
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(12000);
    expect(calc401kBalance(item, 2027, cache)).toBeCloseTo(18000);
    expect(calc401kBalance(item, 2028, cache)).toBeCloseTo(30000);
  });

  it('withdrawal phase: withdrawals applied after withdrawalStartYear', () => {
    const item = {
      id: '401k-6', amount: 100000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 10000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 0, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: 2025
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(90000);
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(80000);
  });

  it('withdrawal phase with monthly frequency', () => {
    const item = {
      id: '401k-7', amount: 100000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 1000, withdrawalFrequency: 'monthly',
      retirement401k: {
        employeeContribution: 0, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: 2025
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(88000);
  });

  it('transition from contribution to withdrawal phase', () => {
    const item = {
      id: '401k-8', amount: 50000, rate: 10, startYear: 2025, endYear: 2060,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 10000, employerMatchPct: 50, employerMatchCapPct: 10,
        annualSalary: 100000, vestingYears: 0, withdrawalStartYear: 2027
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(71500);
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(95150);
    expect(calc401kBalance(item, 2027, cache)).toBeCloseTo(82665);
    expect(calc401kBalance(item, 2028, cache)).toBeCloseTo(68931.5);
  });

  it('withdrawal clamps balance to zero', () => {
    const item = {
      id: '401k-9', amount: 15000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 0, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: 2025
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache)).toBe(0);
    expect(calc401kBalance(item, 2026, cache)).toBe(0);
  });

  it('seeds balanceCache correctly', () => {
    const item = {
      id: '401k-10', amount: 25000, rate: 5, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 5000, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: null
      }
    };
    const cache = {};
    calc401kBalance(item, 2025, cache);
    expect(cache['401k-10'][2024]).toBe(25000);
  });

  it('handles endYear: null with projectionEndYear', () => {
    const item = {
      id: '401k-11', amount: 10000, rate: 0, startYear: 2025, endYear: null,
      retirement401k: {
        employeeContribution: 1000, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: null
      }
    };
    const cache = {};
    expect(calc401kBalance(item, 2025, cache, 2030)).toBeCloseTo(11000);
    expect(calc401kBalance(item, 2030, cache, 2030)).toBeCloseTo(16000);
    expect(calc401kBalance(item, 2031, cache, 2030)).toBe(0);
  });
});

// --- calc401kBalance wired into calcProjection ---

describe('calcProjection with 401(k) items', () => {
  const settings = { startYear: 2025, projectionYears: 3 };

  it('uses calc401kBalance for Traditional 401(k) items', () => {
    const items = [{
      id: 'proj-401k-1', type: 'investments', category: 'Traditional 401(k)',
      name: 'My 401k', amount: 10000, rate: 0, startYear: 2025, endYear: 2030,
      retirement401k: {
        employeeContribution: 5000, employerMatchPct: 100, employerMatchCapPct: 5,
        annualSalary: 100000, vestingYears: 0, withdrawalStartYear: null
      }
    }];
    const result = calcProjection(items, settings);
    expect(result[0].byType.investments).toBeCloseTo(20000);
    expect(result[0].byType.traditional401k).toBeCloseTo(20000);
  });

  it('uses calc401kBalance for Roth 401(k) items', () => {
    const items = [{
      id: 'proj-401k-2', type: 'investments', category: 'Roth 401(k)',
      name: 'My Roth', amount: 5000, rate: 0, startYear: 2025, endYear: 2030,
      retirement401k: {
        employeeContribution: 3000, employerMatchPct: 50, employerMatchCapPct: 3,
        annualSalary: 80000, vestingYears: 0, withdrawalStartYear: null
      }
    }];
    const result = calcProjection(items, settings);
    expect(result[0].byType.investments).toBeCloseTo(9200);
    expect(result[0].byType.roth401k).toBeCloseTo(9200);
  });

  it('falls back to regular logic for investments without retirement401k', () => {
    const items = [{
      id: 'proj-inv-1', type: 'investments', category: 'Stocks',
      name: 'My Stocks', amount: 10000, rate: 10, startYear: 2025, endYear: 2030
    }];
    const result = calcProjection(items, settings);
    expect(result[0].byType.investments).toBeCloseTo(10000);
    expect(result[1].byType.investments).toBeCloseTo(11000);
  });
});
