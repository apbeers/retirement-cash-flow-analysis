// =============================================================================
// Calculator Tests — calcItemValue, calcProjection, calcStats
// P8, P9, P10, P11
// =============================================================================

import * as fc from 'fast-check';
import { calcItemValue, calcItemBalance, calcLoanSchedule, calc401kBalance, calcProjection, calcStats, ASSET_TYPES } from '../script.js';

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

// --- calcItemBalance unit tests ---

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
    // balance(2025) = (1000 + 0 - 0) * 1.10 = 1100
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(1100);
  });

  it('reduces to compound growth when no contribution/withdrawal', () => {
    const item = { id: 'd', amount: 1000, rate: 10, startYear: 2025, endYear: 2030 };
    const cache = {};
    // year 2025: 1000 * 1.1 = 1100
    // year 2026: 1100 * 1.1 = 1210
    // year 2027: 1210 * 1.1 = 1331
    expect(calcItemBalance(item, 2027, cache)).toBeCloseTo(1331);
  });

  it('applies monthly contribution correctly', () => {
    const item = {
      id: 'e', amount: 10000, rate: 0, startYear: 2025, endYear: 2030,
      contributionAmount: 100, contributionFrequency: 'monthly'
    };
    const cache = {};
    // year 2025: (10000 + 1200) * 1.0 = 11200
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(11200);
    // year 2026: (11200 + 1200) * 1.0 = 12400
    expect(calcItemBalance(item, 2026, cache)).toBeCloseTo(12400);
  });

  it('applies annual contribution correctly', () => {
    const item = {
      id: 'f', amount: 10000, rate: 0, startYear: 2025, endYear: 2030,
      contributionAmount: 5000, contributionFrequency: 'annual'
    };
    const cache = {};
    // year 2025: (10000 + 5000) * 1.0 = 15000
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(15000);
  });

  it('applies monthly withdrawal correctly', () => {
    const item = {
      id: 'g', amount: 50000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 1000, withdrawalFrequency: 'monthly'
    };
    const cache = {};
    // year 2025: (50000 - 12000) * 1.0 = 38000
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(38000);
  });

  it('applies annual withdrawal correctly', () => {
    const item = {
      id: 'h', amount: 50000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual'
    };
    const cache = {};
    // year 2025: (50000 - 20000) * 1.0 = 30000
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(30000);
  });

  it('clamps balance to zero when withdrawal exceeds balance', () => {
    const item = {
      id: 'i', amount: 5000, rate: 0, startYear: 2025, endYear: 2030,
      withdrawalAmount: 10000, withdrawalFrequency: 'annual'
    };
    const cache = {};
    // year 2025: max(0, (5000 - 10000) * 1.0) = 0
    expect(calcItemBalance(item, 2025, cache)).toBe(0);
    // year 2026: max(0, (0 - 10000) * 1.0) = 0
    expect(calcItemBalance(item, 2026, cache)).toBe(0);
  });

  it('applies both contribution and withdrawal in the same year', () => {
    const item = {
      id: 'j', amount: 10000, rate: 5, startYear: 2025, endYear: 2030,
      contributionAmount: 500, contributionFrequency: 'monthly',
      withdrawalAmount: 200, withdrawalFrequency: 'monthly'
    };
    const cache = {};
    // annualContrib = 6000, annualWithdraw = 2400
    // year 2025: (10000 + 6000 - 2400) * 1.05 = 13600 * 1.05 = 14280
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(14280);
  });

  it('handles endYear: null with projectionEndYear', () => {
    const item = {
      id: 'k', amount: 1000, rate: 0, startYear: 2025, endYear: null,
      contributionAmount: 1000, contributionFrequency: 'annual'
    };
    const cache = {};
    // Should be active through projectionEndYear = 2030
    expect(calcItemBalance(item, 2030, cache, 2030)).toBeCloseTo(7000);
    // Should return 0 after projectionEndYear
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
    // year 2025: (10000 + 1000) * 1.10 = 12100
    // year 2026: (12100 + 1000) * 1.10 = 14410
    expect(calcItemBalance(item, 2025, cache)).toBeCloseTo(12100);
    expect(calcItemBalance(item, 2026, cache)).toBeCloseTo(14410);
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

// --- calcLoanSchedule unit tests ---

describe('calcLoanSchedule', () => {
  it('returns correct number of years for the projection period', () => {
    const loan = {
      loanAmount: 200000, annualInterestRate: 6, monthlyPayment: 1199.10,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2029);
    expect(schedule).toHaveLength(5);
    expect(schedule[0].year).toBe(2025);
    expect(schedule[4].year).toBe(2029);
  });

  it('opening balance of first year equals loan amount', () => {
    const loan = {
      loanAmount: 100000, annualInterestRate: 5, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    expect(schedule[0].openingBalance).toBe(100000);
  });

  it('balance is non-increasing year over year', () => {
    const loan = {
      loanAmount: 200000, annualInterestRate: 6, monthlyPayment: 1500,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2040);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].closingBalance).toBeLessThanOrEqual(schedule[i - 1].closingBalance);
    }
  });

  it('balance never goes below zero', () => {
    const loan = {
      loanAmount: 200000, annualInterestRate: 6, monthlyPayment: 1500,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2060);
    for (const entry of schedule) {
      expect(entry.closingBalance).toBeGreaterThanOrEqual(0);
      expect(entry.openingBalance).toBeGreaterThanOrEqual(0);
    }
  });

  it('known amortisation scenario: $100k at 6% with $1000/mo payment', () => {
    // Monthly rate = 0.5%, first month interest = $500, principal = $500
    const loan = {
      loanAmount: 100000, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2040);

    // Year 1: manually compute 12 months
    let balance = 100000;
    let yr1Principal = 0;
    let yr1Interest = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * 0.005;
      const principal = Math.min(1000 - interest, balance);
      balance = Math.max(0, balance - principal);
      yr1Principal += principal;
      yr1Interest += interest;
    }
    expect(schedule[0].principalPaid).toBeCloseTo(yr1Principal, 2);
    expect(schedule[0].interestPaid).toBeCloseTo(yr1Interest, 2);
    expect(schedule[0].closingBalance).toBeCloseTo(balance, 2);
  });

  it('extra monthly payment accelerates payoff', () => {
    const loanBase = {
      loanAmount: 100000, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const loanExtra = {
      loanAmount: 100000, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 500
    };
    const schedBase = calcLoanSchedule(loanBase, 2025, 2060);
    const schedExtra = calcLoanSchedule(loanExtra, 2025, 2060);

    // Extra payments should result in lower or equal closing balance each year
    for (let i = 0; i < schedBase.length; i++) {
      expect(schedExtra[i].closingBalance).toBeLessThanOrEqual(schedBase[i].closingBalance + 0.01);
    }

    // Extra payments should pay off sooner
    const basePayoff = schedBase.findIndex(e => e.closingBalance === 0);
    const extraPayoff = schedExtra.findIndex(e => e.closingBalance === 0);
    expect(extraPayoff).toBeLessThan(basePayoff);
  });

  it('handles zero interest rate', () => {
    const loan = {
      loanAmount: 12000, annualInterestRate: 0, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    // At $1000/mo with 0% interest, $12000 is paid off in exactly 1 year
    expect(schedule[0].closingBalance).toBe(0);
    expect(schedule[0].principalPaid).toBe(12000);
    expect(schedule[0].interestPaid).toBe(0);
    expect(schedule[1].openingBalance).toBe(0);
  });

  it('handles payment larger than balance (early payoff)', () => {
    const loan = {
      loanAmount: 5000, annualInterestRate: 6, monthlyPayment: 3000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    // Should pay off within first year
    expect(schedule[0].closingBalance).toBe(0);
    // Principal paid should equal loan amount
    expect(schedule[0].principalPaid).toBeCloseTo(5000, 2);
    // Remaining years should be zero
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].openingBalance).toBe(0);
      expect(schedule[i].closingBalance).toBe(0);
      expect(schedule[i].principalPaid).toBe(0);
      expect(schedule[i].interestPaid).toBe(0);
    }
  });

  it('escrow and property tax do not reduce loan balance', () => {
    const loanNoEscrow = {
      loanAmount: 200000, annualInterestRate: 6, monthlyPayment: 1500,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const loanWithEscrow = {
      loanAmount: 200000, annualInterestRate: 6, monthlyPayment: 1500,
      escrowMonthly: 300, propertyTaxAnnual: 2400, extraMonthlyPayment: 0
    };
    const schedNoEscrow = calcLoanSchedule(loanNoEscrow, 2025, 2040);
    const schedWithEscrow = calcLoanSchedule(loanWithEscrow, 2025, 2040);

    // Loan balance trajectory must be identical
    for (let i = 0; i < schedNoEscrow.length; i++) {
      expect(schedWithEscrow[i].closingBalance).toBeCloseTo(schedNoEscrow[i].closingBalance, 2);
      expect(schedWithEscrow[i].principalPaid).toBeCloseTo(schedNoEscrow[i].principalPaid, 2);
      expect(schedWithEscrow[i].interestPaid).toBeCloseTo(schedNoEscrow[i].interestPaid, 2);
    }

    // But escrow should be tracked
    expect(schedWithEscrow[0].escrowPaid).toBeCloseTo(300 * 12 + 2400, 2);
    expect(schedNoEscrow[0].escrowPaid).toBe(0);
  });

  it('loan already paid off returns all-zero schedule', () => {
    const loan = {
      loanAmount: 0, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2027);
    expect(schedule).toHaveLength(3);
    for (const entry of schedule) {
      expect(entry.openingBalance).toBe(0);
      expect(entry.closingBalance).toBe(0);
      expect(entry.principalPaid).toBe(0);
      expect(entry.interestPaid).toBe(0);
    }
  });
});

// --- calc401kBalance unit tests ---

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
        employeeContribution: 6000,
        employerMatchPct: 100,
        employerMatchCapPct: 6,
        annualSalary: 100000,
        vestingYears: 0,
        withdrawalStartYear: null
      }
    };
    const cache = {};
    // matchable = min(6000, 100000 * 6/100) = min(6000, 6000) = 6000
    // employerMatch = 6000 * 100/100 = 6000
    // balance(2025) = (10000 + 6000 + 6000) * 1.0 = 22000
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(22000);
    // balance(2026) = (22000 + 6000 + 6000) * 1.0 = 34000
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(34000);
  });

  it('contribution phase with growth rate', () => {
    const item = {
      id: '401k-4', amount: 10000, rate: 10, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 5000,
        employerMatchPct: 50,
        employerMatchCapPct: 5,
        annualSalary: 80000,
        vestingYears: 0,
        withdrawalStartYear: null
      }
    };
    const cache = {};
    // matchable = min(5000, 80000 * 5/100) = min(5000, 4000) = 4000
    // employerMatch = 4000 * 50/100 = 2000
    // balance(2025) = (10000 + 5000 + 2000) * 1.10 = 17000 * 1.10 = 18700
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(18700);
  });

  it('vesting: employer match not applied before vesting years', () => {
    const item = {
      id: '401k-5', amount: 0, rate: 0, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 6000,
        employerMatchPct: 100,
        employerMatchCapPct: 6,
        annualSalary: 100000,
        vestingYears: 3,
        withdrawalStartYear: null
      }
    };
    const cache = {};
    // Year 2025: yearsActive = 0 < 3, no match. balance = (0 + 6000 + 0) * 1.0 = 6000
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(6000);
    // Year 2026: yearsActive = 1 < 3, no match. balance = (6000 + 6000 + 0) * 1.0 = 12000
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(12000);
    // Year 2027: yearsActive = 2 < 3, no match. balance = (12000 + 6000 + 0) * 1.0 = 18000
    expect(calc401kBalance(item, 2027, cache)).toBeCloseTo(18000);
    // Year 2028: yearsActive = 3 >= 3, match applies. match = min(6000, 6000) * 100/100 = 6000
    // balance = (18000 + 6000 + 6000) * 1.0 = 30000
    expect(calc401kBalance(item, 2028, cache)).toBeCloseTo(30000);
  });

  it('withdrawal phase: withdrawals applied after withdrawalStartYear', () => {
    const item = {
      id: '401k-6', amount: 100000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 10000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 0,
        employerMatchPct: 0,
        employerMatchCapPct: 0,
        annualSalary: 0,
        vestingYears: 0,
        withdrawalStartYear: 2025
      }
    };
    const cache = {};
    // Year 2025: withdrawal phase. balance = max(0, (100000 - 10000) * 1.0) = 90000
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(90000);
    // Year 2026: balance = max(0, (90000 - 10000) * 1.0) = 80000
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(80000);
  });

  it('withdrawal phase with monthly frequency', () => {
    const item = {
      id: '401k-7', amount: 100000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 1000, withdrawalFrequency: 'monthly',
      retirement401k: {
        employeeContribution: 0,
        employerMatchPct: 0,
        employerMatchCapPct: 0,
        annualSalary: 0,
        vestingYears: 0,
        withdrawalStartYear: 2025
      }
    };
    const cache = {};
    // Year 2025: withdrawal = 1000 * 12 = 12000. balance = max(0, (100000 - 12000) * 1.0) = 88000
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(88000);
  });

  it('transition from contribution to withdrawal phase', () => {
    const item = {
      id: '401k-8', amount: 50000, rate: 10, startYear: 2025, endYear: 2060,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 10000,
        employerMatchPct: 50,
        employerMatchCapPct: 10,
        annualSalary: 100000,
        vestingYears: 0,
        withdrawalStartYear: 2027
      }
    };
    const cache = {};
    // matchable = min(10000, 100000 * 10/100) = min(10000, 10000) = 10000
    // employerMatch = 10000 * 50/100 = 5000

    // Year 2025 (contribution): balance = (50000 + 10000 + 5000) * 1.10 = 65000 * 1.10 = 71500
    expect(calc401kBalance(item, 2025, cache)).toBeCloseTo(71500);
    // Year 2026 (contribution): balance = (71500 + 10000 + 5000) * 1.10 = 86500 * 1.10 = 95150
    expect(calc401kBalance(item, 2026, cache)).toBeCloseTo(95150);
    // Year 2027 (withdrawal): balance = max(0, (95150 - 20000) * 1.10) = 75150 * 1.10 = 82665
    expect(calc401kBalance(item, 2027, cache)).toBeCloseTo(82665);
    // Year 2028 (withdrawal): balance = max(0, (82665 - 20000) * 1.10) = 62665 * 1.10 = 68931.5
    expect(calc401kBalance(item, 2028, cache)).toBeCloseTo(68931.5);
  });

  it('withdrawal clamps balance to zero', () => {
    const item = {
      id: '401k-9', amount: 15000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 20000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 0,
        employerMatchPct: 0,
        employerMatchCapPct: 0,
        annualSalary: 0,
        vestingYears: 0,
        withdrawalStartYear: 2025
      }
    };
    const cache = {};
    // Year 2025: max(0, (15000 - 20000) * 1.0) = 0
    expect(calc401kBalance(item, 2025, cache)).toBe(0);
    // Year 2026: max(0, (0 - 20000) * 1.0) = 0
    expect(calc401kBalance(item, 2026, cache)).toBe(0);
  });

  it('seeds balanceCache correctly', () => {
    const item = {
      id: '401k-10', amount: 25000, rate: 5, startYear: 2025, endYear: 2060,
      retirement401k: {
        employeeContribution: 5000,
        employerMatchPct: 0,
        employerMatchCapPct: 0,
        annualSalary: 0,
        vestingYears: 0,
        withdrawalStartYear: null
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
        employeeContribution: 1000,
        employerMatchPct: 0,
        employerMatchCapPct: 0,
        annualSalary: 0,
        vestingYears: 0,
        withdrawalStartYear: null
      }
    };
    const cache = {};
    // Year 2025: (10000 + 1000) * 1.0 = 11000
    expect(calc401kBalance(item, 2025, cache, 2030)).toBeCloseTo(11000);
    // Year 2030: should still be active
    expect(calc401kBalance(item, 2030, cache, 2030)).toBeCloseTo(16000);
    // Year 2031: beyond projectionEndYear
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
        employeeContribution: 5000,
        employerMatchPct: 100,
        employerMatchCapPct: 5,
        annualSalary: 100000,
        vestingYears: 0,
        withdrawalStartYear: null
      }
    }];
    const result = calcProjection(items, settings);
    // matchable = min(5000, 100000*5/100) = 5000, match = 5000
    // Year 2025: (10000 + 5000 + 5000) * 1.0 = 20000
    expect(result[0].byType.investments).toBeCloseTo(20000);
    expect(result[0].byType.traditional401k).toBeCloseTo(20000);
  });

  it('uses calc401kBalance for Roth 401(k) items', () => {
    const items = [{
      id: 'proj-401k-2', type: 'investments', category: 'Roth 401(k)',
      name: 'My Roth', amount: 5000, rate: 0, startYear: 2025, endYear: 2030,
      retirement401k: {
        employeeContribution: 3000,
        employerMatchPct: 50,
        employerMatchCapPct: 3,
        annualSalary: 80000,
        vestingYears: 0,
        withdrawalStartYear: null
      }
    }];
    const result = calcProjection(items, settings);
    // matchable = min(3000, 80000*3/100) = min(3000, 2400) = 2400
    // match = 2400 * 50/100 = 1200
    // Year 2025: (5000 + 3000 + 1200) * 1.0 = 9200
    expect(result[0].byType.investments).toBeCloseTo(9200);
    expect(result[0].byType.roth401k).toBeCloseTo(9200);
  });

  it('falls back to regular logic for investments without retirement401k', () => {
    const items = [{
      id: 'proj-inv-1', type: 'investments', category: 'Stocks',
      name: 'My Stocks', amount: 10000, rate: 10, startYear: 2025, endYear: 2030
    }];
    const result = calcProjection(items, settings);
    // Regular compound growth via calcItemValue: 10000 * (1.10)^0 = 10000 at startYear
    expect(result[0].byType.investments).toBeCloseTo(10000);
    // Year 2026: 10000 * (1.10)^1 = 11000
    expect(result[1].byType.investments).toBeCloseTo(11000);
  });
});
