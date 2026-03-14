// =============================================================================
// Constants
// =============================================================================

export const STORAGE_KEYS = {
  ITEMS: 'rcfp_items',
  SETTINGS: 'rcfp_settings'
};

export const DEFAULT_SETTINGS = {
  chartTitle: 'Retirement Asset Projection',
  startYear: 2025,
  projectionYears: 30,
  theme: {
    background: '#181a1b',
    surface: '#23272e',
    text: '#e0e0e0',
    accent: '#58a6ff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 16
  },
  tax: {
    filingStatus: 'single',
    birthYear: 1970,
    annualSocialSecurityBenefit: 0,
    socialSecurityStartYear: null,
    bracketInflationRate: 2.5
  }
};

export const SUBCATEGORIES = {
  bank:        ['Checking', 'Savings', 'Term Deposit'],
  investments: ['Stocks', 'ETFs', 'Superannuation', 'Bonds', 'Crypto', 'Traditional 401(k)', 'Roth 401(k)'],
  property:    ['Primary Home', 'Investment Property', 'Land', 'Commercial'],
  vehicles:    ['Car', 'Boat', 'Motorcycle'],
  rentals:     ['Residential', 'Holiday', 'Commercial'],
  inflows:     ['Salary', 'Pension', 'Dividends', 'Rental Income', 'Other Income'],
  outflows:    ['Living Expenses', 'Mortgage', 'Tax', 'Insurance', 'Other Expenses']
};

export const ASSET_TYPES = ['bank', 'investments', 'property', 'vehicles', 'rentals'];
export const CASHFLOW_TYPES = ['inflows', 'outflows'];
export const ALL_TYPES = [...ASSET_TYPES, ...CASHFLOW_TYPES];
export const MAX_ITEMS = 999;
