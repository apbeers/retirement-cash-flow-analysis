// =============================================================================
// calcLoanSchedule Tests — amortisation, escrow, extra payments
// =============================================================================

import { calcLoanSchedule } from '../script.js';

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
    const loan = {
      loanAmount: 100000, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2040);

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

    for (let i = 0; i < schedBase.length; i++) {
      expect(schedExtra[i].closingBalance).toBeLessThanOrEqual(schedBase[i].closingBalance + 0.01);
    }

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
    expect(schedule[0].closingBalance).toBe(0);
    expect(schedule[0].principalPaid).toBeCloseTo(5000, 2);
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

    for (let i = 0; i < schedNoEscrow.length; i++) {
      expect(schedWithEscrow[i].closingBalance).toBeCloseTo(schedNoEscrow[i].closingBalance, 2);
      expect(schedWithEscrow[i].principalPaid).toBeCloseTo(schedNoEscrow[i].principalPaid, 2);
      expect(schedWithEscrow[i].interestPaid).toBeCloseTo(schedNoEscrow[i].interestPaid, 2);
    }

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

import { getLoanPayoffYear } from '../script.js';

describe('getLoanPayoffYear', () => {
  it('returns correct payoff year for a loan that pays off within projection', () => {
    const loan = {
      loanAmount: 12000, annualInterestRate: 0, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    expect(getLoanPayoffYear(schedule)).toBe(2025);
  });

  it('returns null for a loan that never pays off within projection', () => {
    const loan = {
      loanAmount: 500000, annualInterestRate: 6, monthlyPayment: 500,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    // $500/mo on $500k at 6% won't even cover interest — never pays off
    expect(getLoanPayoffYear(schedule)).toBeNull();
  });

  it('returns startYear when loan amount is 0', () => {
    const loan = {
      loanAmount: 0, annualInterestRate: 6, monthlyPayment: 1000,
      escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
    };
    const schedule = calcLoanSchedule(loan, 2025, 2030);
    expect(getLoanPayoffYear(schedule)).toBe(2025);
  });

  it('returns null for empty schedule', () => {
    expect(getLoanPayoffYear([])).toBeNull();
  });
});
