// =============================================================================
// script.js — ES module barrel
// Re-exports all public symbols so tests can import from '../script.js'
// =============================================================================

// Constants
export { STORAGE_KEYS, DEFAULT_SETTINGS, SUBCATEGORIES, ASSET_TYPES, CASHFLOW_TYPES, ALL_TYPES, MAX_ITEMS } from './js/constants.js';

// Tax brackets
export { TAX_BRACKETS_2025 } from './js/taxBrackets.js';

// State
export { loadState, saveItems, saveSettings } from './js/state.js';

// Pretty printer
export { formatMoney } from './js/prettyPrinter.js';

// Calculator
export {
  calcItemValue, calcItemBalance, calc401kBalance, calcLoanSchedule,
  getLoanPayoffYear, inflateBrackets, applyMarginalBrackets, determineLTCGTax,
  calcTax, calcProjection, calcStats
} from './js/calculator.js';

// Serializer
export { exportToXlsx, importFromXlsx } from './js/serializer.js';

// UI Constants
export { TYPE_LABELS, TYPE_ICONS, SECTION_META, _escapeHtml } from './js/uiConstants.js';

// App State
export { state } from './js/appState.js';

// Renderer
export {
  renderItemList, renderTaxBreakdown, renderEmptyState,
  updateBadges, updateStats, updateChart, render,
  toggleItemChart
} from './js/renderer.js';

// Modal Controller
export {
  openAddModal, openEditModal, closeModal,
  _populateCategorySelect, _updateFieldGroupVisibility,
  _handleSaveItem, initiateDelete, confirmDelete, cancelDelete
} from './js/modalController.js';

// Event Handlers
export { applyTheme } from './js/eventHandlers.js';
