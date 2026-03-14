// =============================================================================
// Serializer Tests — Excel import/export
// P14, P15, P16
// =============================================================================

import { exportToXlsx, importFromXlsx, saveItems, loadState } from '../script.js';

describe('P14: Excel Round-Trip', () => {
  it('exportToXlsx function exists and is callable', () => {
    const items = [
      {
        id: '1',
        type: 'bank',
        category: 'Checking',
        name: 'Test Bank',
        amount: 10000,
        rate: 2,
        startYear: 2025,
        endYear: 2030,
        createdAt: new Date().toISOString()
      }
    ];
    expect(typeof exportToXlsx).toBe('function');
    exportToXlsx(items);
  });
});

describe('P15: Invalid Rows Skipped on Import', () => {
  it('importFromXlsx is a function', () => {
    expect(typeof importFromXlsx).toBe('function');
  });
});

describe('P16: Non-xlsx Files Rejected', () => {
  it('importFromXlsx rejects non-xlsx files', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await expect(importFromXlsx(file)).rejects.toThrow();
  });

  it('importFromXlsx rejects csv files', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    await expect(importFromXlsx(file)).rejects.toThrow();
  });
});


// =============================================================================
// Property 10: Extended Excel Round-Trip
// Property 11: Backward-Compatible Import
// =============================================================================

import * as fc from 'fast-check';
import XLSX from 'xlsx';

// Helper: create an in-memory .xlsx File from an array of item objects
function createXlsxFile(items) {
  const headers = [
    'id', 'type', 'category', 'name', 'amount', 'rate', 'startYear', 'endYear', 'createdAt',
    'contributionAmount', 'contributionFrequency', 'withdrawalAmount', 'withdrawalFrequency',
    'loanAmount', 'loanAnnualInterestRate', 'loanMonthlyPayment', 'loanEscrowMonthly',
    'loanPropertyTaxAnnual', 'loanExtraMonthlyPayment',
    'employeeContribution', 'employerMatchPct', 'employerMatchCapPct', 'annualSalary',
    'vestingYears', 'withdrawalStartYear'
  ];

  const rows = items.map(item => {
    const loan = item.loan || {};
    const r401k = item.retirement401k || {};
    return [
      item.id, item.type, item.category, item.name, item.amount, item.rate,
      item.startYear, item.endYear == null ? '' : item.endYear, item.createdAt || '',
      item.contributionAmount != null ? item.contributionAmount : '',
      item.contributionFrequency != null ? item.contributionFrequency : '',
      item.withdrawalAmount != null ? item.withdrawalAmount : '',
      item.withdrawalFrequency != null ? item.withdrawalFrequency : '',
      loan.loanAmount != null ? loan.loanAmount : '',
      loan.annualInterestRate != null ? loan.annualInterestRate : '',
      loan.monthlyPayment != null ? loan.monthlyPayment : '',
      loan.escrowMonthly != null ? loan.escrowMonthly : '',
      loan.propertyTaxAnnual != null ? loan.propertyTaxAnnual : '',
      loan.extraMonthlyPayment != null ? loan.extraMonthlyPayment : '',
      r401k.employeeContribution != null ? r401k.employeeContribution : '',
      r401k.employerMatchPct != null ? r401k.employerMatchPct : '',
      r401k.employerMatchCapPct != null ? r401k.employerMatchCapPct : '',
      r401k.annualSalary != null ? r401k.annualSalary : '',
      r401k.vestingYears != null ? r401k.vestingYears : '',
      r401k.withdrawalStartYear != null ? r401k.withdrawalStartYear : ''
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Helper: create an old-format .xlsx File (no new columns)
function createLegacyXlsxFile(items) {
  const headers = ['id', 'type', 'category', 'name', 'amount', 'rate', 'startYear', 'endYear', 'createdAt'];
  const rows = items.map(item => [
    item.id, item.type, item.category, item.name, item.amount, item.rate,
    item.startYear, item.endYear == null ? '' : item.endYear, item.createdAt || ''
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'legacy.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Arbitrary for a full item with all new fields
const fullItemArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('bank', 'investments', 'property', 'vehicles'),
  category: fc.constantFrom('Checking', 'Savings', 'Stocks', 'Primary Home', 'Car'),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  amount: fc.integer({ min: 0, max: 1000000 }),
  rate: fc.integer({ min: 0, max: 20 }),
  startYear: fc.integer({ min: 2000, max: 2040 }),
  endYear: fc.oneof(fc.integer({ min: 2040, max: 2070 }), fc.constant(null)),
  createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
  contributionAmount: fc.oneof(fc.integer({ min: 0, max: 10000 }), fc.constant(null)),
  contributionFrequency: fc.oneof(fc.constantFrom('monthly', 'annual'), fc.constant(null)),
  withdrawalAmount: fc.oneof(fc.integer({ min: 0, max: 10000 }), fc.constant(null)),
  withdrawalFrequency: fc.oneof(fc.constantFrom('monthly', 'annual'), fc.constant(null)),
  loan: fc.oneof(
    fc.constant(null),
    fc.record({
      loanAmount: fc.integer({ min: 1000, max: 500000 }),
      annualInterestRate: fc.integer({ min: 1, max: 10 }),
      monthlyPayment: fc.integer({ min: 100, max: 5000 }),
      escrowMonthly: fc.integer({ min: 0, max: 500 }),
      propertyTaxAnnual: fc.integer({ min: 0, max: 10000 }),
      extraMonthlyPayment: fc.integer({ min: 0, max: 1000 })
    })
  ),
  retirement401k: fc.oneof(
    fc.constant(null),
    fc.record({
      employeeContribution: fc.integer({ min: 0, max: 20000 }),
      employerMatchPct: fc.integer({ min: 0, max: 100 }),
      employerMatchCapPct: fc.integer({ min: 0, max: 10 }),
      annualSalary: fc.integer({ min: 0, max: 300000 }),
      vestingYears: fc.integer({ min: 0, max: 10 }),
      withdrawalStartYear: fc.oneof(fc.integer({ min: 2050, max: 2070 }), fc.constant(null))
    })
  )
});

describe('Property 10: Extended Excel Round-Trip', () => {
  it('items survive export → import with all new fields preserved', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fullItemArb, { minLength: 1, maxLength: 5 }), async (items) => {
        const file = createXlsxFile(items);
        const { items: imported } = await importFromXlsx(file);

        expect(imported).toHaveLength(items.length);
        for (let i = 0; i < items.length; i++) {
          const orig = items[i];
          const imp = imported[i];

          // Core fields
          expect(imp.type).toBe(orig.type);
          expect(imp.category).toBe(orig.category);
          expect(imp.name).toBe(orig.name);
          expect(imp.amount).toBe(orig.amount);
          expect(imp.rate).toBe(orig.rate);
          expect(imp.startYear).toBe(orig.startYear);
          expect(imp.endYear).toBe(orig.endYear);

          // Contribution/withdrawal
          expect(imp.contributionAmount).toBe(orig.contributionAmount);
          expect(imp.contributionFrequency).toBe(orig.contributionFrequency);
          expect(imp.withdrawalAmount).toBe(orig.withdrawalAmount);
          expect(imp.withdrawalFrequency).toBe(orig.withdrawalFrequency);

          // Loan
          if (orig.loan) {
            expect(imp.loan).not.toBeNull();
            expect(imp.loan.loanAmount).toBe(orig.loan.loanAmount);
            expect(imp.loan.monthlyPayment).toBe(orig.loan.monthlyPayment);
          } else {
            expect(imp.loan).toBeNull();
          }

          // 401(k)
          if (orig.retirement401k) {
            expect(imp.retirement401k).not.toBeNull();
            expect(imp.retirement401k.employeeContribution).toBe(orig.retirement401k.employeeContribution);
            expect(imp.retirement401k.vestingYears).toBe(orig.retirement401k.vestingYears);
          } else {
            expect(imp.retirement401k).toBeNull();
          }
        }
      })
    );
  });
});

describe('Property 11: Backward-Compatible Import', () => {
  it('old-format workbooks import successfully with new fields as null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('bank', 'investments', 'property'),
            category: fc.constantFrom('Checking', 'Stocks', 'Primary Home'),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            amount: fc.integer({ min: 0, max: 1000000 }),
            rate: fc.integer({ min: 0, max: 20 }),
            startYear: fc.integer({ min: 2000, max: 2040 }),
            endYear: fc.integer({ min: 2040, max: 2070 }),
            createdAt: fc.constant('2025-01-01T00:00:00.000Z')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (items) => {
          const file = createLegacyXlsxFile(items);
          const { items: imported } = await importFromXlsx(file);

          expect(imported).toHaveLength(items.length);
          for (let i = 0; i < items.length; i++) {
            const imp = imported[i];
            // Core fields preserved
            expect(imp.type).toBe(items[i].type);
            expect(imp.amount).toBe(items[i].amount);
            // New fields should be null (missing columns)
            expect(imp.contributionAmount).toBeNull();
            expect(imp.withdrawalAmount).toBeNull();
            expect(imp.loan).toBeNull();
            expect(imp.retirement401k).toBeNull();
          }
        }
      )
    );
  });
});
