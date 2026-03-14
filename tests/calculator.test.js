// =============================================================================
// Property-Based Tests — Properties 1–9
// Uses fast-check (configured globally to 100 runs in setup.js)
// =============================================================================

import * as fc from 'fast-check';
import {
  calcItemBalance,
  calcLoanSchedule,
  calc401kBalance,
  calcProjection,
  calcTax,
  inflateBrackets,
  TAX_BRACKETS_2025
} from '../script.js';

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

const yearArb = fc.integer({ min: 2000, max: 2060 });
const rateArb = fc.float({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true });
const amountArb = fc.float({ min: 0, max: 1e7, noNaN: true, noDefaultInfinity: true });

// ---------------------------------------------------------------------------
// Property 1: Contribution Balance Formula
// For an item with contributions, zero withdrawal, and 0% growth rate,
// balance(y) == initialAmount + annualContrib * (y - startYear + 1)
// ---------------------------------------------------------------------------

describe('Property 1: Contribution Balance Formula', () => {
  const contribItemArb = fc.record({
    amount: fc.float({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
    contributionAmount: fc.float({ min: 0, max: 1e5, noNaN: true, noDefaultInfinity: true }),
    startYear: fc.integer({ min: 2000, max: 2040 })
  });

  it('at 0% rate, balance equals seed + cumulative annual contributions', () => {
    fc.assert(
      fc.property(contribItemArb, ({ amount, contributionAmount, startYear }) => {
        const endYear = startYear + 10;
        const item = {
          id: 'p1', amount, rate: 0, startYear, endYear,
          contributionAmount, contributionFrequency: 'annual'
        };
        const cache = {};
        for (let y = startYear; y <= endYear; y++) {
          const bal = calcItemBalance(item, y, cache);
          const expected = amount + contributionAmount * (y - startYear + 1);
          expect(bal).toBeCloseTo(expected, 2);
        }
      })
    );
  });

  it('monthly contributions equal 12x annual equivalent at 0% rate', () => {
    fc.assert(
      fc.property(contribItemArb, ({ amount, contributionAmount, startYear }) => {
        const endYear = startYear + 5;
        const monthlyItem = {
          id: 'p1m', amount, rate: 0, startYear, endYear,
          contributionAmount, contributionFrequency: 'monthly'
        };
        const annualItem = {
          id: 'p1a', amount, rate: 0, startYear, endYear,
          contributionAmount: contributionAmount * 12, contributionFrequency: 'annual'
        };
        const cacheM = {};
        const cacheA = {};
        for (let y = startYear; y <= endYear; y++) {
          expect(calcItemBalance(monthlyItem, y, cacheM))
            .toBeCloseTo(calcItemBalance(annualItem, y, cacheA), 2);
        }
      })
    );
  });
});


// ---------------------------------------------------------------------------
// Property 2: Withdrawal Clamps at Zero
// Balance must never go negative regardless of withdrawal size.
// ---------------------------------------------------------------------------

describe('Property 2: Withdrawal Clamps at Zero', () => {
  it('balance is always >= 0 regardless of withdrawal amount', () => {
    fc.assert(
      fc.property(
        amountArb,
        fc.float({ min: 0, max: 1e7, noNaN: true, noDefaultInfinity: true }),
        rateArb,
        fc.integer({ min: 2000, max: 2040 }),
        (amount, withdrawalAmount, rate, startYear) => {
          const endYear = startYear + 10;
          const item = {
            id: 'p2', amount, rate, startYear, endYear,
            withdrawalAmount, withdrawalFrequency: 'annual'
          };
          const cache = {};
          for (let y = startYear; y <= endYear; y++) {
            expect(calcItemBalance(item, y, cache)).toBeGreaterThanOrEqual(0);
          }
        }
      )
    );
  });

  it('once balance hits zero it stays zero (0% rate)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1e5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 2000, max: 2040 }),
        (amount, withdrawalAmount, startYear) => {
          const endYear = startYear + 20;
          const item = {
            id: 'p2b', amount, rate: 0, startYear, endYear,
            withdrawalAmount, withdrawalFrequency: 'annual'
          };
          const cache = {};
          let hitZero = false;
          for (let y = startYear; y <= endYear; y++) {
            const bal = calcItemBalance(item, y, cache);
            if (hitZero) expect(bal).toBe(0);
            if (bal === 0) hitZero = true;
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Loan Amortisation Correctness
// principal + interest per year reconciles with balance change;
// balance is non-increasing and non-negative.
// ---------------------------------------------------------------------------

describe('Property 3: Loan Amortisation Correctness', () => {
  const loanArb = fc.record({
    loanAmount: fc.float({ min: 1000, max: 1e6, noNaN: true, noDefaultInfinity: true }),
    annualInterestRate: fc.float({ min: 0, max: 15, noNaN: true, noDefaultInfinity: true }),
    monthlyPayment: fc.float({ min: 100, max: 1e5, noNaN: true, noDefaultInfinity: true }),
    escrowMonthly: fc.constant(0),
    propertyTaxAnnual: fc.constant(0),
    extraMonthlyPayment: fc.constant(0)
  });

  it('closing balance = opening balance - principalPaid (within rounding)', () => {
    fc.assert(
      fc.property(loanArb, (loan) => {
        const schedule = calcLoanSchedule(loan, 2025, 2060);
        for (const entry of schedule) {
          expect(entry.closingBalance).toBeCloseTo(
            Math.max(0, entry.openingBalance - entry.principalPaid), 2
          );
        }
      })
    );
  });

  it('balance is non-increasing and non-negative', () => {
    fc.assert(
      fc.property(loanArb, (loan) => {
        const schedule = calcLoanSchedule(loan, 2025, 2060);
        for (let i = 0; i < schedule.length; i++) {
          expect(schedule[i].closingBalance).toBeGreaterThanOrEqual(0);
          if (i > 0) {
            expect(schedule[i].closingBalance).toBeLessThanOrEqual(schedule[i - 1].closingBalance + 0.01);
          }
        }
      })
    );
  });
});


// ---------------------------------------------------------------------------
// Property 5: Escrow and Property Tax Do Not Reduce Loan Balance
// Adding escrow/property tax should not change principal or closing balance.
// ---------------------------------------------------------------------------

describe('Property 5: Escrow and Property Tax Do Not Reduce Loan Balance', () => {
  const baseLoanArb = fc.record({
    loanAmount: fc.float({ min: 10000, max: 1e6, noNaN: true, noDefaultInfinity: true }),
    annualInterestRate: fc.float({ min: 0.5, max: 12, noNaN: true, noDefaultInfinity: true }),
    monthlyPayment: fc.float({ min: 500, max: 1e5, noNaN: true, noDefaultInfinity: true }),
    extraMonthlyPayment: fc.constant(0)
  });

  it('escrow/property tax do not affect closing balance or principal paid', () => {
    fc.assert(
      fc.property(
        baseLoanArb,
        fc.float({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (baseLoan, escrowMonthly, propertyTaxAnnual) => {
          const noEscrow = { ...baseLoan, escrowMonthly: 0, propertyTaxAnnual: 0 };
          const withEscrow = { ...baseLoan, escrowMonthly, propertyTaxAnnual };
          const schedA = calcLoanSchedule(noEscrow, 2025, 2055);
          const schedB = calcLoanSchedule(withEscrow, 2025, 2055);
          for (let i = 0; i < schedA.length; i++) {
            expect(schedB[i].closingBalance).toBeCloseTo(schedA[i].closingBalance, 2);
            expect(schedB[i].principalPaid).toBeCloseTo(schedA[i].principalPaid, 2);
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Net Equity Formula
// For a property with a loan, net equity = assetValue - loanClosingBalance
// ---------------------------------------------------------------------------

describe('Property 4: Net Equity Formula', () => {
  it('property net equity = asset value - loan balance in projection', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100000, max: 2e6, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 50000, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 2, max: 8, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 500, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (propertyValue, appreciationRate, loanAmount, loanRate, monthlyPayment) => {
          const item = {
            id: 'p4', type: 'property', category: 'Primary Home', name: 'House',
            amount: propertyValue, rate: appreciationRate,
            startYear: 2025, endYear: 2030,
            loan: {
              loanAmount, annualInterestRate: loanRate, monthlyPayment,
              escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
            }
          };
          const settings = { startYear: 2025, projectionYears: 6, tax: { filingStatus: 'single', bracketInflationRate: 2.5 } };
          const result = calcProjection([item], settings);
          const schedule = calcLoanSchedule(item.loan, 2025, 2030);

          for (let i = 0; i < result.length; i++) {
            const year = result[i].year;
            const assetValue = propertyValue * Math.pow(1 + appreciationRate / 100, year - 2025);
            const loanBal = schedule[i].closingBalance;
            const expectedEquity = assetValue - loanBal;
            expect(result[i].byType.property).toBeCloseTo(expectedEquity, 0);
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Open-Ended Item Active Through Projection End
// Items with endYear: null remain active through the last projection year.
// ---------------------------------------------------------------------------

describe('Property 6: Open-Ended Item Active Through Projection End', () => {
  it('open-ended items contribute value through the last projection year', () => {
    fc.assert(
      fc.property(
        amountArb,
        rateArb,
        fc.integer({ min: 2020, max: 2040 }),
        fc.integer({ min: 1, max: 30 }),
        (amount, rate, startYear, projYears) => {
          const item = {
            id: 'p6', type: 'bank', category: 'Savings', name: 'Open',
            amount, rate, startYear, endYear: null
          };
          const settings = { startYear, projectionYears: projYears, tax: { filingStatus: 'single', bracketInflationRate: 0 } };
          const result = calcProjection([item], settings);
          const lastYear = result[result.length - 1];
          // The item should still be contributing in the last year
          if (amount > 0) {
            expect(lastYear.byType.bank).toBeGreaterThan(0);
          }
        }
      )
    );
  });

  it('open-ended item returns 0 after projection end via calcItemBalance', () => {
    fc.assert(
      fc.property(
        amountArb,
        fc.integer({ min: 2020, max: 2040 }),
        fc.integer({ min: 1, max: 20 }),
        (amount, startYear, projYears) => {
          const endProj = startYear + projYears - 1;
          const item = {
            id: 'p6b', amount, rate: 0, startYear, endYear: null,
            contributionAmount: 100, contributionFrequency: 'annual'
          };
          const cache = {};
          // Active at projection end
          const valAtEnd = calcItemBalance(item, endProj, cache, endProj);
          expect(valAtEnd).toBeGreaterThanOrEqual(0);
          // Inactive after projection end
          expect(calcItemBalance(item, endProj + 1, cache, endProj)).toBe(0);
        }
      )
    );
  });
});


// ---------------------------------------------------------------------------
// Property 7: 401(k) Employer Match Respects Vesting
// During the vesting period, employer match must be zero.
// After vesting, employer match = min(empContrib, salary*capPct/100) * matchPct/100
// ---------------------------------------------------------------------------

describe('Property 7: 401(k) Employer Match Respects Vesting', () => {
  it('no employer match before vesting years elapse', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1e5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 1000, max: 5e5, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 2020, max: 2040 }),
        (employeeContrib, salary, vestingYears, startYear) => {
          const itemVested = {
            id: 'p7v', amount: 0, rate: 0, startYear, endYear: startYear + 20,
            retirement401k: {
              employeeContribution: employeeContrib,
              employerMatchPct: 100, employerMatchCapPct: 6,
              annualSalary: salary, vestingYears: 0, withdrawalStartYear: null
            }
          };
          const itemUnvested = {
            id: 'p7u', amount: 0, rate: 0, startYear, endYear: startYear + 20,
            retirement401k: {
              employeeContribution: employeeContrib,
              employerMatchPct: 100, employerMatchCapPct: 6,
              annualSalary: salary, vestingYears, withdrawalStartYear: null
            }
          };
          const cacheV = {};
          const cacheU = {};

          // During vesting period, unvested item should only have employee contributions
          for (let y = startYear; y < startYear + vestingYears; y++) {
            const balU = calc401kBalance(itemUnvested, y, cacheU);
            // With 0% rate and 0 initial, unvested balance = employeeContrib * yearsActive
            const yearsActive = y - startYear + 1;
            expect(balU).toBeCloseTo(employeeContrib * yearsActive, 2);
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Tax Bracket Inflation Formula
// Inflated bracket upTo = round(base * (1 + rate/100)^(year - 2025))
// ---------------------------------------------------------------------------

describe('Property 8: Tax Bracket Inflation Formula', () => {
  it('inflated brackets match manual inflation calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2026, max: 2070 }),
        fc.float({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom('single', 'married_filing_jointly'),
        (year, inflRate, filingStatus) => {
          const result = calcTax({
            year,
            traditional401kWithdrawals: 100000,
            bankInterest: 0,
            ltcgIncome: 0,
            annualSocialSecurityBenefit: 0,
            socialSecurityStartYear: null
          }, { tax: { filingStatus, bracketInflationRate: inflRate } });

          const factor = Math.pow(1 + inflRate / 100, year - 2025);
          const baseStdDed = TAX_BRACKETS_2025[filingStatus].standardDeduction;
          expect(result.standardDeduction).toBe(Math.round(baseStdDed * factor));
        }
      )
    );
  });
});


// ---------------------------------------------------------------------------
// Property 9: Tax Deducted from Net Worth
// netWorth = grossNetWorth - totalEstimatedTax for every projection year.
// ---------------------------------------------------------------------------

describe('Property 9: Tax Deducted from Net Worth', () => {
  it('net worth equals gross assets + inflows - outflows - tax', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: 1e5, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: 1e5, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 2025, max: 2040 }),
        (bankAmount, inflowAmount, outflowAmount, startYear) => {
          const items = [
            { id: 'p9b', type: 'bank', category: 'Savings', name: 'B', amount: bankAmount, rate: 2, startYear, endYear: startYear + 5 },
            { type: 'inflows', amount: inflowAmount, rate: 0, startYear, endYear: startYear + 5 },
            { type: 'outflows', amount: outflowAmount, rate: 0, startYear, endYear: startYear + 5 }
          ];
          const settings = { startYear, projectionYears: 3, tax: { filingStatus: 'single', bracketInflationRate: 2.5 } };
          const result = calcProjection(items, settings);
          for (const row of result) {
            const { bank, investments, property, vehicles, rentals, inflows, outflows } = row.byType;
            const gross = bank + investments + property + vehicles + rentals + inflows - outflows;
            expect(row.netWorth).toBeCloseTo(gross - row.tax.totalEstimatedTax, 2);
          }
        }
      )
    );
  });
});
