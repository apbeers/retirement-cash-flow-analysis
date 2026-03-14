// =============================================================================
// ModalController — openAddModal(type), openEditModal(index), closeModal()
//                   form submit handler, inline delete confirmation
// =============================================================================

import { SUBCATEGORIES, ASSET_TYPES, MAX_ITEMS } from './constants.js';
import { TYPE_LABELS } from './uiConstants.js';
import { saveItems } from './state.js';
import { state } from './appState.js';
import { render } from './renderer.js';

function _getModal() {
  const el = document.getElementById('itemModal');
  if (!el) return null;
  return bootstrap.Modal.getOrCreateInstance(el);
}

export function _populateCategorySelect(type) {
  const sel = document.getElementById('field-category');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select category\u2026</option>';
  const cats = SUBCATEGORIES[type] || [];
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

export function _updateFieldGroupVisibility(type, category) {
  const contributionGroup = document.getElementById('contributionGroup');
  const withdrawalGroup = document.getElementById('withdrawalGroup');
  const loanGroup = document.getElementById('loanGroup');
  const retirement401kGroup = document.getElementById('retirement401kGroup');

  if (contributionGroup) {
    contributionGroup.style.display = (type === 'bank' || type === 'investments') ? '' : 'none';
  }
  if (withdrawalGroup) {
    withdrawalGroup.style.display = ASSET_TYPES.includes(type) ? '' : 'none';
  }
  if (loanGroup) {
    loanGroup.style.display = (type === 'property' || type === 'vehicles') ? '' : 'none';
  }
  if (retirement401kGroup) {
    retirement401kGroup.style.display = (category === 'Traditional 401(k)' || category === 'Roth 401(k)') ? '' : 'none';
  }
}

function _clearNewFields() {
  var ids = ['field-contributionAmount', 'field-loanAmount', 'field-loanRate',
    'field-loanPayment', 'field-loanEscrow', 'field-loanPropertyTax', 'field-loanExtra',
    'field-withdrawalAmount', 'field-employeeContribution', 'field-employerMatchPct',
    'field-matchCapPct', 'field-annualSalary', 'field-vestingYears', 'field-withdrawalStartYear'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });

  var contribFreq = document.getElementById('field-contributionFrequency');
  if (contribFreq) contribFreq.value = 'monthly';
  var withdrawFreq = document.getElementById('field-withdrawalFrequency');
  if (withdrawFreq) withdrawFreq.value = 'monthly';

  var noEndDate = document.getElementById('noEndDate');
  if (noEndDate) noEndDate.checked = false;
  var endYearField = document.getElementById('field-endYear');
  if (endYearField) {
    endYearField.disabled = false;
    endYearField.required = true;
  }
}

export function openAddModal(type) {
  const label = TYPE_LABELS[type] || type;
  const titleEl = document.getElementById('itemModalLabel');
  if (titleEl) titleEl.textContent = 'Add ' + label;

  const typeField = document.getElementById('field-type');
  if (typeField) typeField.value = type;

  _populateCategorySelect(type);

  const nameField = document.getElementById('field-name');
  if (nameField) nameField.value = '';
  const amountField = document.getElementById('field-amount');
  if (amountField) amountField.value = '';
  const rateField = document.getElementById('field-rate');
  if (rateField) rateField.value = '0';
  const categoryField = document.getElementById('field-category');
  if (categoryField) categoryField.value = '';

  const startYearField = document.getElementById('field-startYear');
  if (startYearField) startYearField.value = state.settings.startYear;
  const endYearField = document.getElementById('field-endYear');
  if (endYearField) endYearField.value = state.settings.startYear + state.settings.projectionYears - 1;

  const editIndexField = document.getElementById('field-editIndex');
  if (editIndexField) editIndexField.value = '';

  const errorDiv = document.getElementById('modal-error');
  if (errorDiv) { errorDiv.textContent = ''; errorDiv.classList.add('d-none'); }

  _clearNewFields();
  _updateFieldGroupVisibility(type, '');

  const modal = _getModal();
  if (modal) modal.show();

  const modalEl = document.getElementById('itemModal');
  if (modalEl) {
    modalEl.addEventListener('shown.bs.modal', () => {
      const nf = document.getElementById('field-name');
      if (nf) nf.focus();
    }, { once: true });
  }
}

export function openEditModal(index) {
  const item = state.items[index];
  if (!item) return;

  const label = TYPE_LABELS[item.type] || item.type;
  const titleEl = document.getElementById('itemModalLabel');
  if (titleEl) titleEl.textContent = 'Edit ' + label;

  const typeField = document.getElementById('field-type');
  if (typeField) typeField.value = item.type;

  _populateCategorySelect(item.type);
  const categoryField = document.getElementById('field-category');
  if (categoryField) categoryField.value = item.category;

  const nameField = document.getElementById('field-name');
  if (nameField) nameField.value = item.name;
  const amountField = document.getElementById('field-amount');
  if (amountField) amountField.value = item.amount;
  const rateField = document.getElementById('field-rate');
  if (rateField) rateField.value = item.rate != null ? item.rate : 0;
  const startYearField = document.getElementById('field-startYear');
  if (startYearField) startYearField.value = item.startYear;

  const endYearField = document.getElementById('field-endYear');
  const noEndDate = document.getElementById('noEndDate');
  if (item.endYear == null) {
    if (noEndDate) noEndDate.checked = true;
    if (endYearField) { endYearField.value = ''; endYearField.disabled = true; endYearField.required = false; }
  } else {
    if (noEndDate) noEndDate.checked = false;
    if (endYearField) { endYearField.value = item.endYear; endYearField.disabled = false; endYearField.required = true; }
  }

  const editIndexField = document.getElementById('field-editIndex');
  if (editIndexField) editIndexField.value = index;

  const errorDiv = document.getElementById('modal-error');
  if (errorDiv) { errorDiv.textContent = ''; errorDiv.classList.add('d-none'); }

  // Populate contribution fields
  const contribAmount = document.getElementById('field-contributionAmount');
  if (contribAmount) contribAmount.value = item.contributionAmount != null ? item.contributionAmount : '';
  const contribFreq = document.getElementById('field-contributionFrequency');
  if (contribFreq) contribFreq.value = item.contributionFrequency || 'monthly';

  // Populate withdrawal fields
  const withdrawAmount = document.getElementById('field-withdrawalAmount');
  if (withdrawAmount) withdrawAmount.value = item.withdrawalAmount != null ? item.withdrawalAmount : '';
  const withdrawFreq = document.getElementById('field-withdrawalFrequency');
  if (withdrawFreq) withdrawFreq.value = item.withdrawalFrequency || 'monthly';

  // Populate loan fields
  const loan = item.loan || {};
  const loanAmountField = document.getElementById('field-loanAmount');
  if (loanAmountField) loanAmountField.value = loan.loanAmount != null ? loan.loanAmount : '';
  const loanRateField = document.getElementById('field-loanRate');
  if (loanRateField) loanRateField.value = loan.annualInterestRate != null ? loan.annualInterestRate : '';
  const loanPaymentField = document.getElementById('field-loanPayment');
  if (loanPaymentField) loanPaymentField.value = loan.monthlyPayment != null ? loan.monthlyPayment : '';
  const loanEscrowField = document.getElementById('field-loanEscrow');
  if (loanEscrowField) loanEscrowField.value = loan.escrowMonthly != null ? loan.escrowMonthly : '';
  const loanPropertyTaxField = document.getElementById('field-loanPropertyTax');
  if (loanPropertyTaxField) loanPropertyTaxField.value = loan.propertyTaxAnnual != null ? loan.propertyTaxAnnual : '';
  const loanExtraField = document.getElementById('field-loanExtra');
  if (loanExtraField) loanExtraField.value = loan.extraMonthlyPayment != null ? loan.extraMonthlyPayment : '';

  // Populate 401(k) fields
  const r401k = item.retirement401k || {};
  const empContrib = document.getElementById('field-employeeContribution');
  if (empContrib) empContrib.value = r401k.employeeContribution != null ? r401k.employeeContribution : '';
  const empMatchPct = document.getElementById('field-employerMatchPct');
  if (empMatchPct) empMatchPct.value = r401k.employerMatchPct != null ? r401k.employerMatchPct : '';
  const matchCapPct = document.getElementById('field-matchCapPct');
  if (matchCapPct) matchCapPct.value = r401k.employerMatchCapPct != null ? r401k.employerMatchCapPct : '';
  const annualSalary = document.getElementById('field-annualSalary');
  if (annualSalary) annualSalary.value = r401k.annualSalary != null ? r401k.annualSalary : '';
  const vestingYears = document.getElementById('field-vestingYears');
  if (vestingYears) vestingYears.value = r401k.vestingYears != null ? r401k.vestingYears : '';
  const withdrawalStartYear = document.getElementById('field-withdrawalStartYear');
  if (withdrawalStartYear) withdrawalStartYear.value = r401k.withdrawalStartYear != null ? r401k.withdrawalStartYear : '';

  _updateFieldGroupVisibility(item.type, item.category);

  const modal = _getModal();
  if (modal) modal.show();
}

export function closeModal() {
  const modal = _getModal();
  if (modal) modal.hide();
}

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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function _handleSaveItem() {
  const editIndexRaw = document.getElementById('field-editIndex')
    ? document.getElementById('field-editIndex').value : '';
  const isEdit = editIndexRaw !== '' && editIndexRaw !== null;

  if (!isEdit && state.items.length >= MAX_ITEMS) {
    _showModalError('Maximum item limit (' + MAX_ITEMS + ') reached. Please delete an item before adding a new one.');
    return;
  }

  const type = (document.getElementById('field-type') || {}).value || '';
  const category = (document.getElementById('field-category') || {}).value || '';
  const name = ((document.getElementById('field-name') || {}).value || '').trim();
  const amountRaw = (document.getElementById('field-amount') || {}).value;
  const rateRaw = (document.getElementById('field-rate') || {}).value;
  const startYearRaw = (document.getElementById('field-startYear') || {}).value;
  const endYearRaw = (document.getElementById('field-endYear') || {}).value;
  const noEndDateChecked = document.getElementById('noEndDate')
    ? document.getElementById('noEndDate').checked : false;

  if (!type) { _showModalError('Type is required.'); return; }
  if (!category) { _showModalError('Category is required.'); return; }
  if (!name) { _showModalError('Name is required.'); return; }
  if (amountRaw === '' || amountRaw === null || amountRaw === undefined) { _showModalError('Amount is required.'); return; }
  if (startYearRaw === '' || startYearRaw === null) { _showModalError('Start Year is required.'); return; }
  if (!noEndDateChecked) {
    if (endYearRaw === '' || endYearRaw === null) { _showModalError('End Year is required.'); return; }
  }

  const amount = Number(amountRaw);
  const rate = rateRaw !== '' ? Number(rateRaw) : 0;
  const startYear = Number(startYearRaw);
  const endYear = noEndDateChecked ? null : Number(endYearRaw);

  if (!isFinite(amount)) { _showModalError('Amount must be a valid number.'); return; }
  if (!isFinite(rate)) { _showModalError('Rate must be a valid number.'); return; }
  if (!isFinite(startYear)) { _showModalError('Start Year must be a valid number.'); return; }
  if (endYear !== null) {
    if (!isFinite(endYear)) { _showModalError('End Year must be a valid number.'); return; }
    if (startYear > endYear) { _showModalError('Start Year must be less than or equal to End Year.'); return; }
  }

  let contributionAmount = null, contributionFrequency = null;
  if (type === 'bank' || type === 'investments') {
    const v = (document.getElementById('field-contributionAmount') || {}).value;
    if (v !== '' && v != null) {
      const val = Number(v);
      if (!isFinite(val) || val < 0) { _showModalError('Contribution Amount must be a finite non-negative number.'); return; }
      contributionAmount = val;
      contributionFrequency = (document.getElementById('field-contributionFrequency') || {}).value || 'monthly';
    }
  }

  let withdrawalAmount = null, withdrawalFrequency = null;
  if (ASSET_TYPES.includes(type)) {
    const v = (document.getElementById('field-withdrawalAmount') || {}).value;
    if (v !== '' && v != null) {
      const val = Number(v);
      if (!isFinite(val) || val < 0) { _showModalError('Withdrawal Amount must be a finite non-negative number.'); return; }
      withdrawalAmount = val;
      withdrawalFrequency = (document.getElementById('field-withdrawalFrequency') || {}).value || 'monthly';
    }
  }

  let loan = null;
  if (type === 'property' || type === 'vehicles') {
    const la = (document.getElementById('field-loanAmount') || {}).value;
    if (la !== '' && la != null) {
      const lav = Number(la); if (!isFinite(lav) || lav < 0) { _showModalError('Loan Amount must be a finite non-negative number.'); return; }
      const lr = (document.getElementById('field-loanRate') || {}).value;
      const lrv = lr !== '' ? Number(lr) : 0; if (!isFinite(lrv) || lrv < 0) { _showModalError('Loan Interest Rate must be a finite non-negative number.'); return; }
      const lp = (document.getElementById('field-loanPayment') || {}).value;
      if (lp === '' || lp == null) { _showModalError('Monthly Payment is required when Loan Amount is provided.'); return; }
      const lpv = Number(lp); if (!isFinite(lpv) || lpv < 0) { _showModalError('Monthly Payment must be a finite non-negative number.'); return; }
      const le = (document.getElementById('field-loanEscrow') || {}).value;
      const lev = le !== '' ? Number(le) : 0; if (!isFinite(lev) || lev < 0) { _showModalError('Escrow Monthly must be a finite non-negative number.'); return; }
      const lt = (document.getElementById('field-loanPropertyTax') || {}).value;
      const ltv = lt !== '' ? Number(lt) : 0; if (!isFinite(ltv) || ltv < 0) { _showModalError('Property Tax Annual must be a finite non-negative number.'); return; }
      const lx = (document.getElementById('field-loanExtra') || {}).value;
      const lxv = lx !== '' ? Number(lx) : 0; if (!isFinite(lxv) || lxv < 0) { _showModalError('Extra Monthly Payment must be a finite non-negative number.'); return; }
      loan = { loanAmount: lav, annualInterestRate: lrv, monthlyPayment: lpv, escrowMonthly: lev, propertyTaxAnnual: ltv, extraMonthlyPayment: lxv };
    }
  }

  let retirement401k = null;
  if (category === 'Traditional 401(k)' || category === 'Roth 401(k)') {
    const ec = (document.getElementById('field-employeeContribution') || {}).value;
    if (ec !== '' && ec != null) {
      const ecv = Number(ec); if (!isFinite(ecv) || ecv < 0) { _showModalError('Employee Contribution must be a finite non-negative number.'); return; }
      const em = (document.getElementById('field-employerMatchPct') || {}).value;
      const emv = em !== '' ? Number(em) : 0; if (!isFinite(emv) || emv < 0) { _showModalError('Employer Match % must be a finite non-negative number.'); return; }
      const mc = (document.getElementById('field-matchCapPct') || {}).value;
      const mcv = mc !== '' ? Number(mc) : 0; if (!isFinite(mcv) || mcv < 0) { _showModalError('Match Cap % must be a finite non-negative number.'); return; }
      const as = (document.getElementById('field-annualSalary') || {}).value;
      const asv = as !== '' ? Number(as) : 0; if (!isFinite(asv) || asv < 0) { _showModalError('Annual Salary must be a finite non-negative number.'); return; }
      const vy = (document.getElementById('field-vestingYears') || {}).value;
      const vyv = vy !== '' ? Number(vy) : 0;
      if (!isFinite(vyv) || vyv < 0 || !Number.isInteger(vyv)) { _showModalError('Vesting Years must be an integer \u2265 0.'); return; }
      const ws = (document.getElementById('field-withdrawalStartYear') || {}).value;
      const wsv = (ws !== '' && ws != null) ? Number(ws) : null;
      if (wsv !== null && !isFinite(wsv)) { _showModalError('Withdrawal Start Year must be a valid number.'); return; }
      retirement401k = { employeeContribution: ecv, employerMatchPct: emv, employerMatchCapPct: mcv, annualSalary: asv, vestingYears: vyv, withdrawalStartYear: wsv };
    }
  }

  if (isEdit) {
    const editIndex = Number(editIndexRaw);
    state.items[editIndex] = Object.assign({}, state.items[editIndex], {
      type, category, name, amount, rate, startYear, endYear,
      contributionAmount, contributionFrequency, withdrawalAmount, withdrawalFrequency, loan, retirement401k
    });
  } else {
    state.items.push({
      id: _generateUUID(), type, category, name, amount, rate, startYear, endYear,
      createdAt: new Date().toISOString(),
      contributionAmount, contributionFrequency, withdrawalAmount, withdrawalFrequency, loan, retirement401k
    });
  }

  saveItems(state.items);
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

export function initiateDelete(index) {
  const row = document.querySelector('[data-item-index="' + index + '"]');
  if (!row) return;
  const actionArea = row.querySelector('.item-action-area');
  if (!actionArea) return;
  actionArea.innerHTML =
    '<span class="text-danger me-1 small">Delete?</span>' +
    '<button class="btn btn-danger btn-sm me-1" onclick="confirmDelete(' + index + ')">Yes</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="cancelDelete(' + index + ')">No</button>';
}

export function confirmDelete(index) {
  state.items.splice(index, 1);
  saveItems(state.items);
  render();
}

export function cancelDelete(index) {
  render();
}
