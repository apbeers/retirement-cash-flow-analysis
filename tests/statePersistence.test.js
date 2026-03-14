// =============================================================================
// State Persistence Tests — new fields (endYear: null, contributions, withdrawals,
// loans, retirement401k, tax settings)
// Validates: Requirements 6.4, 6.5, 6.7, 11.3, 11.18
// =============================================================================

import { loadState, saveItems, saveSettings, DEFAULT_SETTINGS } from '../script.js';

describe('Save/load item with endYear: null (open-ended)', () => {
  it('persists and restores endYear: null correctly', () => {
    const item = {
      id: 'open-ended-1', type: 'bank', category: 'Checking',
      name: 'Open-Ended Savings', amount: 25000, rate: 1.5,
      startYear: 2025, endYear: null, createdAt: new Date().toISOString()
    };
    saveItems([item]);
    const loaded = loadState();
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].endYear).toBeNull();
    expect(loaded.items[0].name).toBe('Open-Ended Savings');
    expect(loaded.items[0].startYear).toBe(2025);
  });

  it('distinguishes endYear: null from endYear: 0 or endYear: undefined', () => {
    const items = [
      { id: 'a', type: 'bank', name: 'Null End', amount: 100, startYear: 2025, endYear: null },
      { id: 'b', type: 'bank', name: 'Zero End', amount: 200, startYear: 2025, endYear: 0 },
    ];
    saveItems(items);
    const loaded = loadState();
    expect(loaded.items[0].endYear).toBeNull();
    expect(loaded.items[1].endYear).toBe(0);
  });
});

describe('Save/load item with contribution, withdrawal, loan, and retirement401k fields', () => {
  it('persists and restores contribution fields', () => {
    const item = {
      id: 'contrib-1', type: 'bank', category: 'Savings',
      name: 'Monthly Saver', amount: 10000, rate: 2,
      startYear: 2025, endYear: 2055, createdAt: new Date().toISOString(),
      contributionAmount: 500, contributionFrequency: 'monthly',
      withdrawalAmount: null, withdrawalFrequency: null,
      loan: null, retirement401k: null
    };
    saveItems([item]);
    const loaded = loadState();
    expect(loaded.items[0].contributionAmount).toBe(500);
    expect(loaded.items[0].contributionFrequency).toBe('monthly');
    expect(loaded.items[0].withdrawalAmount).toBeNull();
    expect(loaded.items[0].loan).toBeNull();
    expect(loaded.items[0].retirement401k).toBeNull();
  });

  it('persists and restores withdrawal fields', () => {
    const item = {
      id: 'withdraw-1', type: 'investments', category: 'Stocks',
      name: 'Retirement Drawdown', amount: 500000, rate: 7,
      startYear: 2025, endYear: null, createdAt: new Date().toISOString(),
      contributionAmount: null, contributionFrequency: null,
      withdrawalAmount: 2000, withdrawalFrequency: 'monthly',
      loan: null, retirement401k: null
    };
    saveItems([item]);
    const loaded = loadState();
    expect(loaded.items[0].withdrawalAmount).toBe(2000);
    expect(loaded.items[0].withdrawalFrequency).toBe('monthly');
    expect(loaded.items[0].endYear).toBeNull();
  });

  it('persists and restores loan sub-object', () => {
    const item = {
      id: 'loan-1', type: 'property', category: 'Primary Home',
      name: 'My House', amount: 500000, rate: 3,
      startYear: 2020, endYear: 2050, createdAt: new Date().toISOString(),
      contributionAmount: null, contributionFrequency: null,
      withdrawalAmount: null, withdrawalFrequency: null,
      loan: {
        loanAmount: 400000, annualInterestRate: 6.5, monthlyPayment: 2528,
        escrowMonthly: 350, propertyTaxAnnual: 4200, extraMonthlyPayment: 100
      },
      retirement401k: null
    };
    saveItems([item]);
    const loaded = loadState();
    const loan = loaded.items[0].loan;
    expect(loan).not.toBeNull();
    expect(loan.loanAmount).toBe(400000);
    expect(loan.annualInterestRate).toBe(6.5);
    expect(loan.monthlyPayment).toBe(2528);
    expect(loan.escrowMonthly).toBe(350);
    expect(loan.propertyTaxAnnual).toBe(4200);
    expect(loan.extraMonthlyPayment).toBe(100);
  });

  it('persists and restores retirement401k sub-object', () => {
    const item = {
      id: '401k-1', type: 'investments', category: 'Traditional 401(k)',
      name: 'My 401k', amount: 150000, rate: 7,
      startYear: 2025, endYear: null, createdAt: new Date().toISOString(),
      contributionAmount: null, contributionFrequency: null,
      withdrawalAmount: 3000, withdrawalFrequency: 'monthly',
      loan: null,
      retirement401k: {
        employeeContribution: 20000, employerMatchPct: 50, employerMatchCapPct: 6,
        annualSalary: 120000, vestingYears: 3, withdrawalStartYear: 2055
      }
    };
    saveItems([item]);
    const loaded = loadState();
    const r401k = loaded.items[0].retirement401k;
    expect(r401k).not.toBeNull();
    expect(r401k.employeeContribution).toBe(20000);
    expect(r401k.employerMatchPct).toBe(50);
    expect(r401k.employerMatchCapPct).toBe(6);
    expect(r401k.annualSalary).toBe(120000);
    expect(r401k.vestingYears).toBe(3);
    expect(r401k.withdrawalStartYear).toBe(2055);
  });

  it('persists and restores an item with all new fields populated', () => {
    const item = {
      id: 'full-1', type: 'investments', category: 'Traditional 401(k)',
      name: 'Full Featured Item', amount: 200000, rate: 6,
      startYear: 2025, endYear: null, createdAt: new Date().toISOString(),
      contributionAmount: 1000, contributionFrequency: 'annual',
      withdrawalAmount: 500, withdrawalFrequency: 'monthly',
      loan: null,
      retirement401k: {
        employeeContribution: 19500, employerMatchPct: 100, employerMatchCapPct: 5,
        annualSalary: 100000, vestingYears: 0, withdrawalStartYear: null
      }
    };
    saveItems([item]);
    const loaded = loadState();
    const restored = loaded.items[0];
    expect(restored.contributionAmount).toBe(1000);
    expect(restored.contributionFrequency).toBe('annual');
    expect(restored.withdrawalAmount).toBe(500);
    expect(restored.withdrawalFrequency).toBe('monthly');
    expect(restored.endYear).toBeNull();
    expect(restored.retirement401k.employeeContribution).toBe(19500);
    expect(restored.retirement401k.withdrawalStartYear).toBeNull();
  });
});

describe('Save/load tax settings', () => {
  it('persists and restores all tax settings fields', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      tax: {
        filingStatus: 'married_filing_jointly', birthYear: 1985,
        annualSocialSecurityBenefit: 24000, socialSecurityStartYear: 2052,
        bracketInflationRate: 3.0
      }
    };
    saveSettings(settings);
    const loaded = loadState();
    expect(loaded.settings.tax.filingStatus).toBe('married_filing_jointly');
    expect(loaded.settings.tax.birthYear).toBe(1985);
    expect(loaded.settings.tax.annualSocialSecurityBenefit).toBe(24000);
    expect(loaded.settings.tax.socialSecurityStartYear).toBe(2052);
    expect(loaded.settings.tax.bracketInflationRate).toBe(3.0);
  });

  it('persists socialSecurityStartYear: null correctly', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      tax: {
        filingStatus: 'single', birthYear: 1970,
        annualSocialSecurityBenefit: 0, socialSecurityStartYear: null,
        bracketInflationRate: 2.5
      }
    };
    saveSettings(settings);
    const loaded = loadState();
    expect(loaded.settings.tax.socialSecurityStartYear).toBeNull();
  });
});

describe('loadState() merges tax settings with defaults when fields are missing/corrupt', () => {
  it('fills in missing tax fields with defaults', () => {
    const partialSettings = {
      chartTitle: 'My Plan', startYear: 2026, projectionYears: 25,
      tax: { filingStatus: 'married_filing_jointly' }
    };
    localStorage.setItem('rcfp_settings', JSON.stringify(partialSettings));
    const loaded = loadState();
    expect(loaded.settings.tax.filingStatus).toBe('married_filing_jointly');
    expect(loaded.settings.tax.birthYear).toBe(DEFAULT_SETTINGS.tax.birthYear);
    expect(loaded.settings.tax.annualSocialSecurityBenefit).toBe(DEFAULT_SETTINGS.tax.annualSocialSecurityBenefit);
    expect(loaded.settings.tax.socialSecurityStartYear).toBe(DEFAULT_SETTINGS.tax.socialSecurityStartYear);
    expect(loaded.settings.tax.bracketInflationRate).toBe(DEFAULT_SETTINGS.tax.bracketInflationRate);
  });

  it('uses all defaults when tax object is entirely missing', () => {
    const settingsNoTax = { chartTitle: 'No Tax Settings', startYear: 2025, projectionYears: 30 };
    localStorage.setItem('rcfp_settings', JSON.stringify(settingsNoTax));
    const loaded = loadState();
    expect(loaded.settings.tax).toEqual(DEFAULT_SETTINGS.tax);
  });

  it('uses all defaults when settings are corrupt JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('rcfp_settings', '{not valid json!!!');
    const loaded = loadState();
    expect(loaded.settings.tax).toEqual(DEFAULT_SETTINGS.tax);
    expect(loaded.settings.startYear).toBe(DEFAULT_SETTINGS.startYear);
    spy.mockRestore();
  });

  it('uses all defaults when tax is null', () => {
    const settingsNullTax = { chartTitle: 'Null Tax', startYear: 2025, projectionYears: 30, tax: null };
    localStorage.setItem('rcfp_settings', JSON.stringify(settingsNullTax));
    const loaded = loadState();
    expect(loaded.settings.tax).toEqual(DEFAULT_SETTINGS.tax);
  });
});
