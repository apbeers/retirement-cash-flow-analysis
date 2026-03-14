// =============================================================================
// Event Handlers — DOMContentLoaded wiring, theme, sidebar nav, settings,
//                  import/export, keyboard shortcuts
// Exports: applyTheme
// Depends on: constants.js, state.js, appState.js, renderer.js,
//             modalController.js, serializer.js
// =============================================================================

import { DEFAULT_SETTINGS } from './constants.js';
import { _escapeHtml } from './uiConstants.js';
import { saveSettings, saveItems } from './state.js';
import { state } from './appState.js';
import { render } from './renderer.js';
import { openAddModal, _populateCategorySelect, _updateFieldGroupVisibility } from './modalController.js';
import { exportToXlsx, importFromXlsx } from './serializer.js';

export function applyTheme(theme) {
  const t = theme || DEFAULT_SETTINGS.theme;
  document.documentElement.style.setProperty('--bg', t.background || DEFAULT_SETTINGS.theme.background);
  document.documentElement.style.setProperty('--surface', t.surface || DEFAULT_SETTINGS.theme.surface);
  document.documentElement.style.setProperty('--text', t.text || DEFAULT_SETTINGS.theme.text);
  document.documentElement.style.setProperty('--accent', t.accent || DEFAULT_SETTINGS.theme.accent);
  if (t.fontFamily) document.body.style.fontFamily = t.fontFamily;
  if (t.fontSize) document.body.style.fontSize = t.fontSize + 'px';
}

function _showStorageToast(message) {
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
  const header = document.getElementById('main-header');
  if (header && header.nextSibling) {
    mainContent.insertBefore(alert, header.nextSibling);
  } else {
    mainContent.prepend(alert);
  }
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
    // Sidebar navigation
    const navLinks = document.querySelectorAll('#sidebar .nav-link[data-section]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        state.activeSection = link.dataset.section;
        render();
      });
    });

    // Add item button
    const addBtn = document.getElementById('btn-add-item');
    if (addBtn) {
      addBtn.addEventListener('click', () => { openAddModal(state.activeSection); });
    }

    // Wire type select change
    const typeSelect = document.getElementById('field-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const selectedType = typeSelect.value;
        _populateCategorySelect(selectedType);
        const cs = document.getElementById('field-category');
        _updateFieldGroupVisibility(selectedType, cs ? cs.value : '');
      });
    }

    // Wire category select change
    const categorySelect = document.getElementById('field-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        const currentType = (document.getElementById('field-type') || {}).value || '';
        _updateFieldGroupVisibility(currentType, categorySelect.value);
      });
    }

    // Wire "No end date" checkbox
    const noEndDateCheckbox = document.getElementById('noEndDate');
    if (noEndDateCheckbox) {
      noEndDateCheckbox.addEventListener('change', () => {
        const endYearField = document.getElementById('field-endYear');
        if (noEndDateCheckbox.checked) {
          if (endYearField) { endYearField.value = ''; endYearField.disabled = true; endYearField.required = false; }
        } else {
          if (endYearField) { endYearField.disabled = false; endYearField.required = true; }
        }
      });
    }

    // Populate settings inputs
    const chartTitleInput = document.getElementById('setting-chartTitle');
    if (chartTitleInput) chartTitleInput.value = state.settings.chartTitle || '';
    const startYearInput = document.getElementById('setting-startYear');
    if (startYearInput) startYearInput.value = state.settings.startYear || DEFAULT_SETTINGS.startYear;
    const projectionYearsInput = document.getElementById('setting-projectionYears');
    if (projectionYearsInput) projectionYearsInput.value = state.settings.projectionYears || DEFAULT_SETTINGS.projectionYears;
    const bgInput = document.getElementById('setting-bg');
    if (bgInput) bgInput.value = (state.settings.theme && state.settings.theme.background) || DEFAULT_SETTINGS.theme.background;
    const surfaceInput = document.getElementById('setting-surface');
    if (surfaceInput) surfaceInput.value = (state.settings.theme && state.settings.theme.surface) || DEFAULT_SETTINGS.theme.surface;
    const textInput = document.getElementById('setting-text');
    if (textInput) textInput.value = (state.settings.theme && state.settings.theme.text) || DEFAULT_SETTINGS.theme.text;
    const accentInput = document.getElementById('setting-accent');
    if (accentInput) accentInput.value = (state.settings.theme && state.settings.theme.accent) || DEFAULT_SETTINGS.theme.accent;
    const fontFamilyInput = document.getElementById('setting-fontFamily');
    if (fontFamilyInput) fontFamilyInput.value = (state.settings.theme && state.settings.theme.fontFamily) || DEFAULT_SETTINGS.theme.fontFamily;
    const fontSizeInput = document.getElementById('setting-fontSize');
    if (fontSizeInput) fontSizeInput.value = (state.settings.theme && state.settings.theme.fontSize) || DEFAULT_SETTINGS.theme.fontSize;

    // Wire settings change handlers
    if (chartTitleInput) {
      chartTitleInput.addEventListener('input', () => {
        state.settings.chartTitle = chartTitleInput.value;
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
        render();
      });
    }
    if (startYearInput) {
      startYearInput.addEventListener('change', () => {
        state.settings.startYear = Number(startYearInput.value);
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
        render();
      });
    }
    if (projectionYearsInput) {
      projectionYearsInput.addEventListener('change', () => {
        state.settings.projectionYears = Number(projectionYearsInput.value);
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
        render();
      });
    }

    // Wire color pickers
    const colorMap = { 'setting-bg': 'background', 'setting-surface': 'surface', 'setting-text': 'text', 'setting-accent': 'accent' };
    const cssPropMap = { background: '--bg', surface: '--surface', text: '--text', accent: '--accent' };
    Object.entries(colorMap).forEach(([inputId, themeKey]) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.addEventListener('input', () => {
        if (!state.settings.theme) state.settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        state.settings.theme[themeKey] = input.value;
        document.documentElement.style.setProperty(cssPropMap[themeKey], input.value);
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
        render();
      });
    });

    if (fontFamilyInput) {
      fontFamilyInput.addEventListener('input', () => {
        if (!state.settings.theme) state.settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        state.settings.theme.fontFamily = fontFamilyInput.value;
        document.body.style.fontFamily = fontFamilyInput.value;
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
      });
    }
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', () => {
        if (!state.settings.theme) state.settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme);
        state.settings.theme.fontSize = Number(fontSizeInput.value);
        document.body.style.fontSize = fontSizeInput.value + 'px';
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
      });
    }

    // Populate and wire tax settings inputs
    const taxFilingStatus = document.getElementById('taxFilingStatus');
    const taxBirthYear = document.getElementById('taxBirthYear');
    const taxSSBenefit = document.getElementById('taxSSBenefit');
    const taxSSStartYear = document.getElementById('taxSSStartYear');
    const taxInflationRate = document.getElementById('taxInflationRate');

    const tax = state.settings.tax || DEFAULT_SETTINGS.tax;
    if (taxFilingStatus) taxFilingStatus.value = tax.filingStatus || 'single';
    if (taxBirthYear) taxBirthYear.value = tax.birthYear || DEFAULT_SETTINGS.tax.birthYear;
    if (taxSSBenefit) taxSSBenefit.value = tax.annualSocialSecurityBenefit || 0;
    if (taxSSStartYear) taxSSStartYear.value = tax.socialSecurityStartYear != null ? tax.socialSecurityStartYear : '';
    if (taxInflationRate) taxInflationRate.value = tax.bracketInflationRate != null ? tax.bracketInflationRate : DEFAULT_SETTINGS.tax.bracketInflationRate;

    const wireTaxInput = (el, key, isNumber) => {
      if (!el) return;
      el.addEventListener('change', () => {
        if (!state.settings.tax) state.settings.tax = Object.assign({}, DEFAULT_SETTINGS.tax);
        state.settings.tax[key] = isNumber ? (el.value !== '' ? Number(el.value) : null) : el.value;
        try { saveSettings(state.settings); } catch (err) { _showStorageToast('Storage quota exceeded.'); }
        render();
      });
    };
    wireTaxInput(taxFilingStatus, 'filingStatus', false);
    wireTaxInput(taxBirthYear, 'birthYear', true);
    wireTaxInput(taxSSBenefit, 'annualSocialSecurityBenefit', true);
    wireTaxInput(taxSSStartYear, 'socialSecurityStartYear', true);
    wireTaxInput(taxInflationRate, 'bracketInflationRate', true);

    // Apply loaded theme and initialize UI
    applyTheme(state.settings.theme);
    render();

    // Export Excel
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => { exportToXlsx(state.items); });
    }

    // Import Excel
    const importFile = document.getElementById('import-file');
    if (importFile) {
      importFile.addEventListener('change', () => {
        const file = importFile.files[0];
        if (!file) return;
        importFromXlsx(file)
          .then(result => {
            state.items = result.items;
            saveItems(state.items);
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
