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
// Serializer — exportToXlsx(items), importFromXlsx(file)
// =============================================================================

const _XLSX = typeof XLSX !== 'undefined' ? XLSX : (typeof require !== 'undefined' ? require('xlsx') : null);

function exportToXlsx(items) {
  if (!_XLSX) return;

  const headers = ['id', 'type', 'category', 'name', 'amount', 'rate', 'startYear', 'endYear', 'createdAt'];
  const rows = items.map(item => headers.map(h => item[h]));
  const wsData = [headers, ...rows];

  const ws = _XLSX.utils.aoa_to_sheet(wsData);
  const wb = _XLSX.utils.book_new();
  _XLSX.utils.book_append_sheet(wb, ws, 'Items');

  _XLSX.writeFile(wb, 'retirement-cash-flow.xlsx');
}

function importFromXlsx(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.xlsx')) {
      return reject(new Error('Only .xlsx files are supported. No data was changed.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = _XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = _XLSX.utils.sheet_to_json(ws, { defval: '' });

        const requiredFields = ['type', 'category', 'name', 'amount', 'startYear', 'endYear'];
        const items = [];
        let skipped = 0;

        for (const row of rows) {
          const missing = requiredFields.some(f => row[f] === '' || row[f] === null || row[f] === undefined);
          if (missing) {
            skipped++;
            continue;
          }
          items.push({
            id: row.id || '',
            type: row.type,
            category: row.category,
            name: row.name,
            amount: Number(row.amount),
            rate: Number(row.rate) || 0,
            startYear: Number(row.startYear),
            endYear: Number(row.endYear),
            createdAt: row.createdAt || ''
          });
        }

        resolve({ items, skipped });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

// =============================================================================
// ModalController — openAddModal(type), openEditModal(index), closeModal()
//                   form submit handler, inline delete confirmation
// =============================================================================

const TYPE_LABELS = {
  bank: 'Bank Account',
  investments: 'Investment',
  property: 'Property',
  vehicles: 'Vehicle',
  rentals: 'Rental',
  inflows: 'Inflow',
  outflows: 'Outflow'
};

// App state — module-level, initialised from localStorage
let { items, settings } = loadState();

// Render stubs — will be replaced by task 9/10 implementations
function render() {
  if (typeof renderItemList === 'function') renderItemList();
  if (typeof updateChart === 'function') updateChart();
  if (typeof updateStats === 'function') updateStats();
  if (typeof updateBadges === 'function') updateBadges();
}

function renderItemList() {
  // stub — implemented in task 9
}

// --- Task 7.1: openAddModal, openEditModal, closeModal ---

function _getModal() {
  const el = document.getElementById('itemModal');
  if (!el) return null;
  return bootstrap.Modal.getOrCreateInstance(el);
}

function _populateCategorySelect(type) {
  const sel = document.getElementById('field-category');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select category…</option>';
  const cats = SUBCATEGORIES[type] || [];
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function openAddModal(type) {
  const label = TYPE_LABELS[type] || type;

  // Set modal title
  const titleEl = document.getElementById('itemModalLabel');
  if (titleEl) titleEl.textContent = 'Add ' + label;

  // Set hidden type field
  const typeField = document.getElementById('field-type');
  if (typeField) typeField.value = type;

  // Populate category select
  _populateCategorySelect(type);

  // Clear fields
  const nameField = document.getElementById('field-name');
  if (nameField) nameField.value = '';
  const amountField = document.getElementById('field-amount');
  if (amountField) amountField.value = '';
  const rateField = document.getElementById('field-rate');
  if (rateField) rateField.value = '0';
  const categoryField = document.getElementById('field-category');
  if (categoryField) categoryField.value = '';

  // Set year defaults from settings
  const startYearField = document.getElementById('field-startYear');
  if (startYearField) startYearField.value = settings.startYear;
  const endYearField = document.getElementById('field-endYear');
  if (endYearField) endYearField.value = settings.startYear + settings.projectionYears - 1;

  // Clear edit index
  const editIndexField = document.getElementById('field-editIndex');
  if (editIndexField) editIndexField.value = '';

  // Clear validation error
  const errorDiv = document.getElementById('modal-error');
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.classList.add('d-none');
  }

  // Show modal
  const modal = _getModal();
  if (modal) modal.show();

  // Focus name field after modal is shown
  const modalEl = document.getElementById('itemModal');
  if (modalEl) {
    modalEl.addEventListener('shown.bs.modal', () => {
      const nf = document.getElementById('field-name');
      if (nf) nf.focus();
    }, { once: true });
  }
}

function openEditModal(index) {
  const item = items[index];
  if (!item) return;

  const label = TYPE_LABELS[item.type] || item.type;

  // Set modal title
  const titleEl = document.getElementById('itemModalLabel');
  if (titleEl) titleEl.textContent = 'Edit ' + label;

  // Set hidden type field
  const typeField = document.getElementById('field-type');
  if (typeField) typeField.value = item.type;

  // Populate category select then set value
  _populateCategorySelect(item.type);
  const categoryField = document.getElementById('field-category');
  if (categoryField) categoryField.value = item.category;

  // Pre-fill fields
  const nameField = document.getElementById('field-name');
  if (nameField) nameField.value = item.name;
  const amountField = document.getElementById('field-amount');
  if (amountField) amountField.value = item.amount;
  const rateField = document.getElementById('field-rate');
  if (rateField) rateField.value = item.rate != null ? item.rate : 0;
  const startYearField = document.getElementById('field-startYear');
  if (startYearField) startYearField.value = item.startYear;
  const endYearField = document.getElementById('field-endYear');
  if (endYearField) endYearField.value = item.endYear;

  // Set edit index
  const editIndexField = document.getElementById('field-editIndex');
  if (editIndexField) editIndexField.value = index;

  // Clear validation error
  const errorDiv = document.getElementById('modal-error');
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.classList.add('d-none');
  }

  // Show modal
  const modal = _getModal();
  if (modal) modal.show();
}

function closeModal() {
  const modal = _getModal();
  if (modal) modal.hide();
}

// --- Task 7.3: Form submit handler ---

function _showModalError(message) {
  const errorDiv = document.getElementById('modal-error');
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.classList.remove('d-none');
}

function _generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function _handleSaveItem() {
  // Guard: item count limit
  const editIndexRaw = document.getElementById('field-editIndex')
    ? document.getElementById('field-editIndex').value
    : '';
  const isEdit = editIndexRaw !== '' && editIndexRaw !== null;

  if (!isEdit && items.length >= MAX_ITEMS) {
    _showModalError('Maximum item limit (' + MAX_ITEMS + ') reached. Please delete an item before adding a new one.');
    return;
  }

  // Read fields
  const type = (document.getElementById('field-type') || {}).value || '';
  const category = (document.getElementById('field-category') || {}).value || '';
  const name = ((document.getElementById('field-name') || {}).value || '').trim();
  const amountRaw = (document.getElementById('field-amount') || {}).value;
  const rateRaw = (document.getElementById('field-rate') || {}).value;
  const startYearRaw = (document.getElementById('field-startYear') || {}).value;
  const endYearRaw = (document.getElementById('field-endYear') || {}).value;

  // Validate required fields
  if (!type) { _showModalError('Type is required.'); return; }
  if (!category) { _showModalError('Category is required.'); return; }
  if (!name) { _showModalError('Name is required.'); return; }
  if (amountRaw === '' || amountRaw === null || amountRaw === undefined) {
    _showModalError('Amount is required.');
    return;
  }
  if (startYearRaw === '' || startYearRaw === null) { _showModalError('Start Year is required.'); return; }
  if (endYearRaw === '' || endYearRaw === null) { _showModalError('End Year is required.'); return; }

  const amount = Number(amountRaw);
  const rate = rateRaw !== '' ? Number(rateRaw) : 0;
  const startYear = Number(startYearRaw);
  const endYear = Number(endYearRaw);

  if (!isFinite(amount)) { _showModalError('Amount must be a valid number.'); return; }
  if (!isFinite(rate)) { _showModalError('Rate must be a valid number.'); return; }
  if (!isFinite(startYear)) { _showModalError('Start Year must be a valid number.'); return; }
  if (!isFinite(endYear)) { _showModalError('End Year must be a valid number.'); return; }
  if (startYear > endYear) { _showModalError('Start Year must be less than or equal to End Year.'); return; }

  if (isEdit) {
    // Update existing item
    const editIndex = Number(editIndexRaw);
    items[editIndex] = Object.assign({}, items[editIndex], {
      type, category, name, amount, rate, startYear, endYear
    });
  } else {
    // New item
    const newItem = {
      id: _generateUUID(),
      type,
      category,
      name,
      amount,
      rate,
      startYear,
      endYear,
      createdAt: new Date().toISOString()
    };
    items.push(newItem);
  }

  saveItems(items);
  render();
  closeModal();
}

// Wire save button when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('btn-save-item');
    if (saveBtn) saveBtn.addEventListener('click', _handleSaveItem);
  });
}

// --- Task 7.8: Inline delete confirmation ---

function initiateDelete(index) {
  const row = document.querySelector('[data-item-index="' + index + '"]');
  if (!row) return;

  const actionArea = row.querySelector('.item-action-area');
  if (!actionArea) return;

  actionArea.innerHTML =
    '<span class="text-danger me-1 small">Delete?</span>' +
    '<button class="btn btn-danger btn-sm me-1" onclick="confirmDelete(' + index + ')">Yes</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="cancelDelete(' + index + ')">No</button>';
}

function confirmDelete(index) {
  items.splice(index, 1);
  saveItems(items);
  render();
}

function cancelDelete(index) {
  render();
}

// =============================================================================
// Exports (for test environment)
// =============================================================================

if (typeof module !== 'undefined') {
  module.exports = { formatMoney, calcItemValue, calcProjection, calcStats,
    ASSET_TYPES, CASHFLOW_TYPES, ALL_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS,
    STORAGE_KEYS, MAX_ITEMS, loadState, saveItems, saveSettings,
    exportToXlsx, importFromXlsx,
    TYPE_LABELS, openAddModal, openEditModal, closeModal,
    initiateDelete, confirmDelete, cancelDelete,
    _handleSaveItem, _generateUUID, _showModalError };
}
