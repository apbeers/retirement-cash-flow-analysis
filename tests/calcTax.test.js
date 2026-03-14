// =============================================================================
// calcTax Tests — income tax, Social Security, LTCG stacking
// =============================================================================

import { calcTax, calcProjection } from '../script.js';

describe('calcTax', () => {
  const singleSettings = {
    tax: { filingStatus: 'single', bracketInflationRate: 2.5 }
  };

  const mfjSettings = {
    tax: { filingStatus: 'married_filing_jointly', bracketInflationRate: 2.5 }
  };

  it('computes correct tax for $50,000 ordinary income, single filer, 2025', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 50000,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 0,
      socialSecurityStartYear: null
    }, singleSettings);

    expect(result.ordinaryIncome).toBe(50000);
    expect(result.standardDeduction).toBe(15000);
    expect(result.taxableOrdinaryIncome).toBe(35000);
    expect(result.ordinaryTax).toBeCloseTo(3961.50, 2);
    expect(result.ltcgTax).toBe(0);
    expect(result.totalEstimatedTax).toBeCloseTo(3961.50, 2);
  });

  it('inflates brackets correctly for year 2030 with 2.5% inflation', () => {
    const inflationFactor = Math.pow(1.025, 5);
    const expectedStdDeduction = Math.round(15000 * inflationFactor);
    const expectedFirstBracketUpTo = Math.round(11925 * inflationFactor);

    const result = calcTax({
      year: 2030,
      traditional401kWithdrawals: 30000,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 0,
      socialSecurityStartYear: null
    }, singleSettings);

    expect(result.standardDeduction).toBe(expectedStdDeduction);
    const expectedTaxableOrdinary = Math.max(0, 30000 - expectedStdDeduction);
    expect(result.taxableOrdinaryIncome).toBe(expectedTaxableOrdinary);
    expect(result.ordinaryTax).toBeCloseTo(expectedTaxableOrdinary * 0.10, 2);
  });

  it('Social Security: 0% taxable when provisional income below low threshold', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 10000,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 20000,
      socialSecurityStartYear: 2025
    }, singleSettings);

    expect(result.taxableSocialSecurity).toBe(0);
    expect(result.ordinaryIncome).toBe(10000);
  });

  it('Social Security: 50% taxable when provisional income between low and high threshold', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 20000,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 20000,
      socialSecurityStartYear: 2025
    }, singleSettings);

    expect(result.taxableSocialSecurity).toBe(10000);
    expect(result.ordinaryIncome).toBe(30000);
  });

  it('Social Security: 85% taxable when provisional income above high threshold', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 40000,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 24000,
      socialSecurityStartYear: 2025
    }, singleSettings);

    expect(result.taxableSocialSecurity).toBeCloseTo(20400);
    expect(result.ordinaryIncome).toBeCloseTo(60400);
  });

  it('excludes Roth 401(k) withdrawals from taxable income via calcProjection', () => {
    const items = [{
      id: 'roth-tax-test', type: 'investments', category: 'Roth 401(k)',
      name: 'My Roth', amount: 100000, rate: 0, startYear: 2025, endYear: 2060,
      withdrawalAmount: 10000, withdrawalFrequency: 'annual',
      retirement401k: {
        employeeContribution: 0, employerMatchPct: 0, employerMatchCapPct: 0,
        annualSalary: 0, vestingYears: 0, withdrawalStartYear: 2025
      }
    }];
    const settings = {
      startYear: 2025,
      projectionYears: 1,
      tax: { filingStatus: 'single', bracketInflationRate: 2.5 }
    };
    const result = calcProjection(items, settings);

    expect(result[0].tax.ordinaryIncome).toBe(0);
    expect(result[0].tax.ltcgIncome).toBe(0);
    expect(result[0].tax.totalEstimatedTax).toBe(0);
  });

  it('zero income produces zero tax', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 0,
      bankInterest: 0,
      ltcgIncome: 0,
      annualSocialSecurityBenefit: 0,
      socialSecurityStartYear: null
    }, singleSettings);

    expect(result.ordinaryIncome).toBe(0);
    expect(result.ltcgIncome).toBe(0);
    expect(result.taxableSocialSecurity).toBe(0);
    expect(result.taxableOrdinaryIncome).toBe(0);
    expect(result.ordinaryTax).toBe(0);
    expect(result.ltcgTax).toBe(0);
    expect(result.totalEstimatedTax).toBe(0);
  });

  it('LTCG stacks on top of ordinary income for bracket determination', () => {
    const result = calcTax({
      year: 2025,
      traditional401kWithdrawals: 55000,
      bankInterest: 0,
      ltcgIncome: 20000,
      annualSocialSecurityBenefit: 0,
      socialSecurityStartYear: null
    }, singleSettings);

    expect(result.taxableOrdinaryIncome).toBe(40000);
    expect(result.ltcgIncome).toBe(20000);
    expect(result.ltcgTax).toBeCloseTo(1747.50, 2);
    expect(result.totalEstimatedTax).toBeCloseTo(result.ordinaryTax + 1747.50, 2);
  });
});
