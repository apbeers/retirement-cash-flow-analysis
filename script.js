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
// Utilities
// =============================================================================

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

const TYPE_ICONS = {
  bank:        'bi-bank',
  investments: 'bi-bar-chart-line',
  property:    'bi-house',
  vehicles:    'bi-car-front',
  rentals:     'bi-building',
  inflows:     'bi-arrow-down-circle',
  outflows:    'bi-arrow-up-circle'
};

const SECTION_META = {
  dashboard:   { title: 'Dashboard',      subtitle: 'Overview of your retirement plan' },
  bank:        { title: 'Bank Accounts',  subtitle: 'Manage your bank and savings accounts' },
  investments: { title: 'Investments',    subtitle: 'Stocks, ETFs, super, and more' },
  property:    { title: 'Property',       subtitle: 'Real estate and land holdings' },
  vehicles:    { title: 'Vehicles',       subtitle: 'Cars, boats, and other vehicles' },
  rentals:     { title: 'Rentals',        subtitle: 'Rental income properties' },
  inflows:     { title: 'Inflows',        subtitle: 'Salary, pension, dividends, and other income' },
  outflows:    { title: 'Outflows',       subtitle: 'Living expenses, mortgage, tax, and more' }
};

// App state — module-level, initialised from localStorage
let { items, settings } = loadState();

// Renderer module-level state
let activeSection = 'dashboard';
let chartInstance = null;

// =============================================================================
// Renderer — renderItemList(), renderEmptyState(), updateBadges(),
//             updateStats(), updateChart(), render()
// =============================================================================

function renderItemList() {
  const listArea = document.getElementById('item-list-area');
  const statsRow = document.getElementById('stats-row');
  const chartContainer = document.getElementById('chart-container');

  if (activeSection === 'dashboard') {
    if (listArea) listArea.style.display = 'none';
    if (statsRow) statsRow.style.display = '';
    if (chartContainer) chartContainer.style.display = '';
    return;
  }

  // Non-dashboard: show item list, hide stats/chart
  if (statsRow) statsRow.style.display = 'none';
  if (chartContainer) chartContainer.style.display = 'none';
  if (listArea) listArea.style.display = '';

  const filtered = items.filter(item => item.type === activeSection);

  if (!listArea) return;

  if (filtered.length === 0) {
    renderEmptyState();
    return;
  }

  const rows = filtered.map((item) => {
    // Find the original index in items array for delete targeting
    const originalIndex = items.indexOf(item);
    const icon = TYPE_ICONS[item.type] || 'bi-circle';
    const rateSign = item.rate > 0 ? '+' : '';
    const meta = item.category + ' · ' + item.startYear + '–' + item.endYear + ' · ' + rateSign + item.rate + '%';

    return '<div class="item-row" data-item-index="' + originalIndex + '">' +
      '<i class="bi ' + icon + ' item-icon"></i>' +
      '<div class="flex-grow-1">' +
        '<div class="item-name">' + _escapeHtml(item.name) + '</div>' +
        '<div class="item-meta">' + _escapeHtml(meta) + '</div>' +
      '</div>' +
      '<div class="item-value">' + formatMoney(item.amount) + '</div>' +
      '<div class="item-action-area">' +
        '<button class="btn btn-sm btn-outline-danger" onclick="initiateDelete(' + originalIndex + ')" title="Delete">' +
          '<i class="bi bi-trash"></i>' +
        '</button>' +
      '</div>' +
    '</div>';
  });

  listArea.innerHTML = '<div class="card card-surface">' + rows.join('') + '</div>';
}

function renderEmptyState() {
  const listArea = document.getElementById('item-list-area');
  if (!listArea) return;
  const label = TYPE_LABELS[activeSection] || activeSection;
  listArea.innerHTML =
    '<div class="empty-state">' +
      '<i class="bi ' + (TYPE_ICONS[activeSection] || 'bi-inbox') + '"></i>' +
      '<p>No ' + label + ' items yet.</p>' +
      '<p class="small">Click "Add ' + label + '" to get started.</p>' +
    '</div>';
}

function updateBadges() {
  for (const type of ALL_TYPES) {
    const badge = document.getElementById('badge-' + type);
    if (badge) {
      badge.textContent = items.filter(item => item.type === type).length;
    }
  }

  const addBtn = document.getElementById('btn-add-item');
  if (!addBtn) return;

  if (items.length >= MAX_ITEMS) {
    addBtn.disabled = true;
    // Show warning if not already present
    let warning = document.getElementById('max-items-warning');
    if (!warning) {
      warning = document.createElement('span');
      warning.id = 'max-items-warning';
      warning.className = 'badge bg-warning text-dark ms-2';
      warning.textContent = 'Max items reached';
      addBtn.parentNode.insertBefore(warning, addBtn.nextSibling);
    }
  } else {
    addBtn.disabled = false;
    const warning = document.getElementById('max-items-warning');
    if (warning) warning.remove();
  }
}

function updateStats() {
  const stats = calcStats(items, settings);
  const totalAssetsEl = document.getElementById('stat-totalAssets');
  const annualInflowEl = document.getElementById('stat-annualInflow');
  const annualOutflowEl = document.getElementById('stat-annualOutflow');
  if (totalAssetsEl) totalAssetsEl.textContent = formatMoney(stats.totalAssets);
  if (annualInflowEl) annualInflowEl.textContent = formatMoney(stats.annualInflow);
  if (annualOutflowEl) annualOutflowEl.textContent = formatMoney(stats.annualOutflow);
}

function updateChart() {
  try {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;

    const projection = calcProjection(items, settings);
    const years = projection.map(p => p.year);
    const theme = settings.theme || DEFAULT_SETTINGS.theme;
    const accent = theme.accent || '#58a6ff';
    const textColor = theme.text || '#e0e0e0';
    const gridColor = 'rgba(255,255,255,0.1)';

    // Build datasets: net worth + one per type that has ≥1 item
    const datasets = [];

    // Total Net Worth — solid line
    datasets.push({
      label: 'Total Net Worth',
      data: projection.map(p => p.netWorth),
      borderColor: accent,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3
    });

    // Per-type dashed lines
    const typeColors = {
      bank:        '#4fc3f7',
      investments: '#81c784',
      property:    '#ffb74d',
      vehicles:    '#e57373',
      rentals:     '#ba68c8',
      inflows:     '#4db6ac',
      outflows:    '#f06292'
    };

    for (const type of ALL_TYPES) {
      if (!items.some(item => item.type === type)) continue;
      datasets.push({
        label: TYPE_LABELS[type],
        data: projection.map(p => p.byType[type]),
        borderColor: typeColors[type] || '#aaa',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.3
      });
    }

    const config = {
      type: 'line',
      data: { labels: years, datasets },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: textColor, font: { size: 12 } }
          },
          title: {
            display: !!settings.chartTitle,
            text: settings.chartTitle || '',
            color: textColor
          }
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              callback: function(value) { return formatMoney(value); }
            },
            grid: { color: gridColor }
          }
        }
      }
    };

    if (chartInstance) {
      chartInstance.data = config.data;
      chartInstance.options = config.options;
      chartInstance.update();
    } else {
      chartInstance = new Chart(canvas, config);
    }
  } catch (err) {
    console.error('Chart render error:', err);
  }
}

function render() {
  updateBadges();
  renderItemList();

  if (activeSection === 'dashboard') {
    updateStats();
    updateChart();
  }

  // Update section title and subtitle
  const meta = SECTION_META[activeSection] || { title: activeSection, subtitle: '' };
  const titleEl = document.getElementById('section-title');
  const subtitleEl = document.getElementById('section-subtitle');
  if (titleEl) titleEl.textContent = meta.title;
  if (subtitleEl) subtitleEl.textContent = meta.subtitle;

  // Show/hide and label the Add button
  const addBtn = document.getElementById('btn-add-item');
  const addLabel = document.getElementById('btn-add-label');
  if (addBtn) {
    if (activeSection === 'dashboard') {
      addBtn.classList.add('d-none');
    } else {
      addBtn.classList.remove('d-none');
      if (addLabel) addLabel.textContent = 'Add ' + (TYPE_LABELS[activeSection] || activeSection);
    }
  }

  // Update sidebar active state
  const navLinks = document.querySelectorAll('#sidebar .nav-link[data-section]');
  navLinks.forEach(link => {
    if (link.dataset.section === activeSection) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
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
// EventHandlers — sidebar navigation, settings panel, DOMContentLoaded init
// =============================================================================

function applyTheme(theme) {
  const t = theme || DEFAULT_SETTINGS.theme;
  document.documentElement.style.setProperty('--bg', t.background || DEFAULT_SETTINGS.theme.background);
  document.documentElement.style.setProperty('--surface', t.surface || DEFAULT_SETTINGS.theme.surface);
  document.documentElement.style.setProperty('--text', t.text || DEFAULT_SETTINGS.theme.text);
  document.documentElement.style.setProperty('--accent', t.accent || DEFAULT_SETTINGS.theme.accent);
  if (t.fontFamily) document.body.style.fontFamily = t.fontFamily;
  if (t.fontSize) document.body.style.fontSize = t.fontSize + 'px';
}

function _showStorageToast(message) {
  // Create a Bootstrap toast dynamically if one doesn't exist
  let toastContainer = document.getElementById('rcfp-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'rcfp-toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  const toastEl = document.createElement('div');
  toastEl.className = 'toast align-items-center text-bg-danger border-0';
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  toastEl.innerHTML =
    '<div class="d-flex">' +
      '<div class="toast-body">' + _escapeHtml(message) + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
    '</div>';

  toastContainer.appendChild(toastEl);

  if (typeof bootstrap !== 'undefined') {
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }
}

function _showInfoAlert(message) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const alert = document.createElement('div');
  alert.className = 'alert alert-info alert-dismissible fade show';
  alert.setAttribute('role', 'alert');
  alert.innerHTML =
    _escapeHtml(message) +
    '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

  // Prepend after the header area
  const header = document.getElementById('main-header');
  if (header && header.nextSibling) {
    mainContent.insertBefore(alert, header.nextSibling);
  } else {
    mainContent.prepend(alert);
  }

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (typeof bootstrap !== 'undefined') {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    } else {
      alert.remove();
    }
  }, 5000);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // --- 11.1: Sidebar navigation ---
    const navLinks = document.querySelectorAll('#sidebar .nav-link[data-section]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        activeSection = link.dataset.section;
        render();
      });
    });

    // --- 11.1: Add item button ---
    const addBtn = document.getElementById('btn-add-item');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openAddModal(activeSection);
      });
    }

    // --- 11.2: Populate settings inputs with current values ---
    const chartTitleInput = document.getElementById('setting-chartTitle');
    if (chartTitleInput) chartTitleInput.value = settings.chartTitle || '';

    const startYearInput = document.getElementById('setting-startYear');
    if (startYearInput) startYearInput.value = settings.startYear || DEFAULT_SETTINGS.startYear;

    const projectionYearsInput = document.getElementById('setting-projectionYears');
    if (projectionYearsInput) projectionYearsInput.value = settings.projectionYears || DEFAULT_SETTINGS.projectionYears;

    const bgInput = document.getElementById('setting-bg');
    if (bgInput) bgInput.value = (settings.theme && settings.theme.background) || DEFAULT_SETTINGS.theme.background;

    const surfaceInput = document.getElementById('setting-surface');
    if (surfaceInput) surfaceInput.value = (settings.theme && settings.theme.surface) || DEFAULT_SETTINGS.theme.surface;

    const textInput = document.getElementById('setting-text');
    if (textInput) textInput.value = (settings.theme && settings.theme.text) || DEFAULT_SETTINGS.theme.text;

    const accentInput = document.getElementById('setting-accent');
    if (accentInput) accentInput.value = (settings.theme && settings.theme.accent) || DEFAULT_SETTINGS.theme.accent;

    const fontFamilyInput = document.getElementById('setting-fontFamily');
    if (fontFamilyInput) fontFamilyInput.value = (settings.theme && settings.theme.fontFamily) || DEFAULT_SETTINGS.theme.fontFamily;

    const fontSizeInput = document.getElementById('setting-fontSize');
    if (fontSizeInput) fontSizeInput.value = (settings.theme && settings.theme.fontSize) || DEFAULT_SETTINGS.theme.fontSize;

    // --- 11.2: Wire Chart Title ---
    if (chartTitleInput) {
      chartTitleInput.addEventListener('input', () => {
        settings.chartTitle = chartTitleInput.value;
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
        render();
      });
    }

    // --- 11.2: Wire Start Year ---
    if (startYearInput) {
      startYearInput.addEventListener('change', () => {
        settings.startYear = Number(startYearInput.value);
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
        render();
      });
    }

    // --- 11.2: Wire Projection Years ---
    if (projectionYearsInput) {
      projectionYearsInput.addEventListener('change', () => {
        settings.projectionYears = Number(projectionYearsInput.value);
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
        render();
      });
    }

    // --- 11.2: Wire color pickers ---
    const colorMap = {
      'setting-bg':      'background',
      'setting-surface': 'surface',
      'setting-text':    'text',
      'setting-accent':  'accent'
    };
    const cssPropMap = {
      background: '--bg',
      surface:    '--surface',
      text:       '--text',
      accent:     '--accent'
    };

    Object.entries(colorMap).forEach(([inputId, themeKey]) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.addEventListener('input', () => {
        if (!settings.theme) settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        settings.theme[themeKey] = input.value;
        document.documentElement.style.setProperty(cssPropMap[themeKey], input.value);
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
        render();
      });
    });

    // --- 11.2: Wire Font Family ---
    if (fontFamilyInput) {
      fontFamilyInput.addEventListener('input', () => {
        if (!settings.theme) settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        settings.theme.fontFamily = fontFamilyInput.value;
        document.body.style.fontFamily = fontFamilyInput.value;
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
      });
    }

    // --- 11.2: Wire Font Size ---
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', () => {
        if (!settings.theme) settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        settings.theme.fontSize = Number(fontSizeInput.value);
        document.body.style.fontSize = fontSizeInput.value + 'px';
        try {
          saveSettings(settings);
        } catch (err) {
          _showStorageToast('Storage quota exceeded. Please export your data and clear some space.');
        }
      });
    }

    // --- 11.2: Apply loaded theme and initialize UI ---
    applyTheme(settings.theme);
    render();

    // --- 12.1: Export Excel ---
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportToXlsx(items);
      });
    }

    // --- 12.2: Import Excel ---
    const importFile = document.getElementById('import-file');
    if (importFile) {
      importFile.addEventListener('change', () => {
        const file = importFile.files[0];
        if (!file) return;
        importFromXlsx(file)
          .then(result => {
            items = result.items;
            saveItems(items);
            render();
            importFile.value = '';
            if (result.skipped > 0) {
              _showInfoAlert('Import complete. ' + result.skipped + ' row(s) were skipped due to missing required fields.');
            }
          })
          .catch(err => {
            importFile.value = '';
            _showStorageToast(err.message || 'Only .xlsx files are supported. No data was changed.');
          });
      });
    }
  });
}

// =============================================================================
// Exports (for test environment)
// =============================================================================

if (typeof module !== 'undefined') {
  module.exports = { formatMoney, calcItemValue, calcProjection, calcStats,
    ASSET_TYPES, CASHFLOW_TYPES, ALL_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS,
    STORAGE_KEYS, MAX_ITEMS, loadState, saveItems, saveSettings,
    exportToXlsx, importFromXlsx,
    TYPE_LABELS, TYPE_ICONS, SECTION_META,
    openAddModal, openEditModal, closeModal,
    initiateDelete, confirmDelete, cancelDelete,
    _handleSaveItem, _generateUUID, _showModalError, _escapeHtml,
    render, renderItemList, renderEmptyState, updateBadges, updateStats, updateChart,
    applyTheme, _showStorageToast, _showInfoAlert,
    get activeSection() { return activeSection; },
    set activeSection(v) { activeSection = v; },
    get chartInstance() { return chartInstance; },
    get items() { return items; },
    set items(v) { items = v; },
    get settings() { return settings; },
    set settings(v) { settings = v; }
  };
}
