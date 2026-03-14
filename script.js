// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEYS = {
  ITEMS: 'rcfp_items',
  SETTINGS: 'rcfp_settings'
};

const DEFAULT_SETTINGS = {
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
  }
};

const SUBCATEGORIES = {
  bank:        ['Checking', 'Savings', 'Term Deposit'],
  investments: ['Stocks', 'ETFs', 'Superannuation', 'Bonds', 'Crypto'],
  property:    ['Primary Home', 'Investment Property', 'Land', 'Commercial'],
  vehicles:    ['Car', 'Boat', 'Motorcycle'],
  rentals:     ['Residential', 'Holiday', 'Commercial'],
  inflows:     ['Salary', 'Pension', 'Dividends', 'Rental Income', 'Other Income'],
  outflows:    ['Living Expenses', 'Mortgage', 'Tax', 'Insurance', 'Other Expenses']
};

const ASSET_TYPES = ['bank', 'investments', 'property', 'vehicles', 'rentals'];
const CASHFLOW_TYPES = ['inflows', 'outflows'];
const ALL_TYPES = [...ASSET_TYPES, ...CASHFLOW_TYPES];
const MAX_ITEMS = 999;

// =============================================================================
// State — loadState(), saveItems(), saveSettings()
// =============================================================================

function loadState() {
  let items = [];
  let settings = DEFAULT_SETTINGS;

  try {
    const rawItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (rawItems !== null) {
      items = JSON.parse(rawItems);
    }
  } catch (err) {
    console.error('Failed to parse items from localStorage:', err);
    items = [];
  }

  try {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings !== null) {
      settings = JSON.parse(rawSettings);
    }
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    settings = DEFAULT_SETTINGS;
  }

  return { items, settings };
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// =============================================================================
// PrettyPrinter — formatMoney(value)
// =============================================================================

function formatMoney(value) {
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  } else if (value >= 1_000) {
    return '$' + (value / 1_000).toFixed(1) + 'K';
  } else {
    return '$' + Math.round(value);
  }
}

// =============================================================================
// Calculator — calcItemValue(item, year), calcProjection(items, settings), calcStats(items, settings)
// =============================================================================

function calcItemValue(item, year) {
  if (year < item.startYear || year > item.endYear) return 0;
  return item.amount * Math.pow(1 + item.rate / 100, year - item.startYear);
}

function calcProjection(items, settings) {
  const result = [];
  const endYear = settings.startYear + settings.projectionYears - 1;

  for (let year = settings.startYear; year <= endYear; year++) {
    const byType = {
      bank: 0, investments: 0, property: 0, vehicles: 0,
      rentals: 0, inflows: 0, outflows: 0
    };

    for (const item of items) {
      const active = year >= item.startYear && year <= item.endYear;
      if (!active) continue;

      if (ASSET_TYPES.includes(item.type)) {
        byType[item.type] += calcItemValue(item, year);
      } else if (item.type === 'inflows') {
        byType.inflows += item.amount;
      } else if (item.type === 'outflows') {
        byType.outflows += item.amount;
      }
    }

    const netWorth =
      byType.bank + byType.investments + byType.property +
      byType.vehicles + byType.rentals +
      byType.inflows - byType.outflows;

    result.push({ year, netWorth, byType });
  }

  return result;
}

function calcStats(items, settings) {
  const year = settings.startYear;
  let totalAssets = 0;
  let annualInflow = 0;
  let annualOutflow = 0;

  for (const item of items) {
    if (year < item.startYear || year > item.endYear) continue;

    if (ASSET_TYPES.includes(item.type)) {
      totalAssets += item.amount;
    } else if (item.type === 'inflows') {
      annualInflow += item.amount;
    } else if (item.type === 'outflows') {
      annualOutflow += item.amount;
    }
  }

  return { totalAssets, annualInflow, annualOutflow };
}

// =============================================================================
// Exports (for test environment)
// =============================================================================

if (typeof module !== 'undefined') {
  module.exports = { formatMoney, calcItemValue, calcProjection, calcStats,
    ASSET_TYPES, CASHFLOW_TYPES, ALL_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS,
    STORAGE_KEYS, MAX_ITEMS, loadState, saveItems, saveSettings };
}
