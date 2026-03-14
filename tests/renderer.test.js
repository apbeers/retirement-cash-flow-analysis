// =============================================================================
// Renderer Tests — section filter, badges, empty state
// P17
// =============================================================================

import { SUBCATEGORIES, ALL_TYPES } from '../script.js';

describe('P17: Section Filter Correctness', () => {
  it('SUBCATEGORIES structure is correct for all types', () => {
    ALL_TYPES.forEach(type => {
      expect(SUBCATEGORIES[type]).toBeDefined();
      expect(Array.isArray(SUBCATEGORIES[type])).toBe(true);
      expect(SUBCATEGORIES[type].length).toBeGreaterThan(0);
      SUBCATEGORIES[type].forEach(subcat => {
        expect(typeof subcat).toBe('string');
        expect(subcat.length).toBeGreaterThan(0);
      });
    });
  });

  it('all types have matching subcategories', () => {
    const types = Object.keys(SUBCATEGORIES);
    expect(types.sort()).toEqual(ALL_TYPES.sort());
  });
});

import { renderItemList } from '../script.js';
import { state } from '../js/appState.js';

describe('renderItemList — contributionEndYear display', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="item-list-area"></div><div id="stats-row"></div><div id="chart-container"></div>';
    state.items = [];
    state.settings = { startYear: 2025, projectionYears: 30, theme: {}, tax: {} };
    state.activeSection = 'bank';
  });

  it('shows "until [year]" when contributionEndYear is set', () => {
    state.items = [{
      id: 't1', type: 'bank', category: 'Checking', name: 'Test',
      amount: 10000, rate: 0, startYear: 2025, endYear: null,
      contributionAmount: 500, contributionFrequency: 'monthly',
      contributionEndYear: 2035
    }];
    renderItemList();
    const html = document.getElementById('item-list-area').innerHTML;
    expect(html).toContain('(until 2035)');
  });

  it('does not show "until" when contributionEndYear is null', () => {
    state.items = [{
      id: 't2', type: 'bank', category: 'Checking', name: 'Test',
      amount: 10000, rate: 0, startYear: 2025, endYear: null,
      contributionAmount: 500, contributionFrequency: 'monthly',
      contributionEndYear: null
    }];
    renderItemList();
    const html = document.getElementById('item-list-area').innerHTML;
    expect(html).toContain('contribution');
    expect(html).not.toContain('until');
  });
});

describe('renderItemList — loan payoff year display', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="item-list-area"></div><div id="stats-row"></div><div id="chart-container"></div>';
    state.items = [];
    state.settings = { startYear: 2025, projectionYears: 10, theme: {}, tax: {} };
    state.activeSection = 'property';
  });

  it('shows "Paid off: [year]" for a loan that pays off within projection', () => {
    state.items = [{
      id: 't3', type: 'property', category: 'Primary Residence', name: 'House',
      amount: 300000, rate: 3, startYear: 2025, endYear: null,
      loan: {
        loanAmount: 12000, annualInterestRate: 0, monthlyPayment: 1000,
        escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
      }
    }];
    renderItemList();
    const html = document.getElementById('item-list-area').innerHTML;
    expect(html).toContain('Paid off: 2025');
  });

  it('shows "Paid off: beyond [year]" for a loan that extends past projection', () => {
    state.items = [{
      id: 't4', type: 'property', category: 'Primary Residence', name: 'House',
      amount: 500000, rate: 3, startYear: 2025, endYear: null,
      loan: {
        loanAmount: 400000, annualInterestRate: 6, monthlyPayment: 2398,
        escrowMonthly: 0, propertyTaxAnnual: 0, extraMonthlyPayment: 0
      }
    }];
    renderItemList();
    const html = document.getElementById('item-list-area').innerHTML;
    expect(html).toContain('Paid off: beyond 2034');
  });
});
