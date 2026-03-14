// =============================================================================
// UI Constants — labels, icons, section metadata, utilities
// =============================================================================

export const TYPE_LABELS = {
  bank: 'Bank Account',
  investments: 'Investment',
  property: 'Property',
  vehicles: 'Vehicle',
  rentals: 'Rental',
  inflows: 'Inflow',
  outflows: 'Outflow'
};

export const TYPE_ICONS = {
  bank:        'bi-bank',
  investments: 'bi-bar-chart-line',
  property:    'bi-house',
  vehicles:    'bi-car-front',
  rentals:     'bi-building',
  inflows:     'bi-arrow-down-circle',
  outflows:    'bi-arrow-up-circle'
};

export const SECTION_META = {
  dashboard:   { title: 'Dashboard',      subtitle: 'Overview of your retirement plan' },
  bank:        { title: 'Bank Accounts',  subtitle: 'Manage your bank and savings accounts' },
  investments: { title: 'Investments',    subtitle: 'Stocks, ETFs, super, and more' },
  property:    { title: 'Property',       subtitle: 'Real estate and land holdings' },
  vehicles:    { title: 'Vehicles',       subtitle: 'Cars, boats, and other vehicles' },
  rentals:     { title: 'Rentals',        subtitle: 'Rental income properties' },
  inflows:     { title: 'Inflows',        subtitle: 'Salary, pension, dividends, and other income' },
  outflows:    { title: 'Outflows',       subtitle: 'Living expenses, mortgage, tax, and more' }
};

export function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
