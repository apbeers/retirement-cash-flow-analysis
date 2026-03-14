// =============================================================================
// Renderer
// =============================================================================

import { ALL_TYPES, MAX_ITEMS, DEFAULT_SETTINGS, ASSET_TYPES } from './constants.js';
import { formatMoney } from './prettyPrinter.js';
import { calcItemValue, calcItemBalance, calc401kBalance, calcLoanSchedule, calcProjection, calcStats } from './calculator.js';
import { TYPE_LABELS, TYPE_ICONS, SECTION_META, _escapeHtml } from './uiConstants.js';
import { state } from './appState.js';

// Track per-item chart instances so we can destroy them on re-render
var _itemCharts = {};

export function renderItemList() {
  const listArea = document.getElementById('item-list-area');
  const statsRow = document.getElementById('stats-row');
  const chartContainer = document.getElementById('chart-container');

  if (state.activeSection === 'dashboard') {
    if (listArea) listArea.style.display = 'none';
    if (statsRow) statsRow.style.display = '';
    if (chartContainer) chartContainer.style.display = '';
    return;
  }
  if (statsRow) statsRow.style.display = 'none';
  if (chartContainer) chartContainer.style.display = 'none';
  if (listArea) listArea.style.display = '';

  const filtered = state.items.filter(item => item.type === state.activeSection);
  if (!listArea) return;
  if (filtered.length === 0) { renderEmptyState(); return; }

  const projEnd = state.settings.startYear + state.settings.projectionYears - 1;
  const rows = filtered.map((item) => {
    const idx = state.items.indexOf(item);
    const icon = TYPE_ICONS[item.type] || 'bi-circle';
    const rs = item.rate > 0 ? '+' : '';
    const yr = item.endYear == null ? (item.startYear + ' \u2013 ongoing') : (item.startYear + '\u2013' + item.endYear);
    const meta = item.category + ' \u00B7 ' + yr + ' \u00B7 ' + rs + item.rate + '%';
    var extra = '';
    if (item.contributionAmount > 0 && item.contributionFrequency) {
      extra += '<div class="item-meta">+' + formatMoney(item.contributionAmount) + (item.contributionFrequency === 'monthly' ? '/mo' : '/yr') + ' contribution</div>';
    }
    if (item.withdrawalAmount > 0 && item.withdrawalFrequency) {
      extra += '<div class="item-meta">\u2212' + formatMoney(item.withdrawalAmount) + (item.withdrawalFrequency === 'monthly' ? '/mo' : '/yr') + ' withdrawal</div>';
    }
    if (item.loan) {
      var sch = calcLoanSchedule(item.loan, item.startYear, projEnd);
      var lb = sch.length > 0 ? sch[0].closingBalance : item.loan.loanAmount;
      var eq = Math.max(0, calcItemValue(item, item.startYear) - lb);
      extra += '<div class="item-meta">Loan: ' + formatMoney(lb) + ' balance \u00B7 Equity: ' + formatMoney(eq) + '</div>';
    }
    if (item.retirement401k) {
      var r = item.retirement401k, ec = r.employeeContribution || 0;
      var ma = Math.min(ec, (r.annualSalary || 0) * (r.employerMatchCapPct || 0) / 100) * (r.employerMatchPct || 0) / 100;
      extra += '<div class="item-meta">Employee: ' + formatMoney(ec) + '/yr \u00B7 Match: ' + formatMoney(ma) + '/yr</div>';
    }
    var ldh = '';
    if (item.loan) {
      var ls = calcLoanSchedule(item.loan, item.startYear, projEnd), tr = '';
      for (var i = 0; i < ls.length; i++) { var s = ls[i]; tr += '<tr><td>'+s.year+'</td><td>'+formatMoney(s.openingBalance)+'</td><td>'+formatMoney(s.principalPaid)+'</td><td>'+formatMoney(s.interestPaid)+'</td><td>'+formatMoney(s.escrowPaid)+'</td><td>'+formatMoney(s.closingBalance)+'</td></tr>'; }
      ldh = '<div class="loan-details-section"><button class="btn btn-sm btn-outline-secondary loan-details-toggle" onclick="this.parentElement.classList.toggle(\'expanded\')"><i class="bi bi-chevron-down"></i> Loan Details</button><div class="loan-details-table-wrapper"><table class="table table-sm loan-details-table"><thead><tr><th>Year</th><th>Opening</th><th>Principal</th><th>Interest</th><th>Escrow</th><th>Closing</th></tr></thead><tbody>'+tr+'</tbody></table></div></div>';
    }
    return '<div class="item-row" data-item-index="'+idx+'"><i class="bi '+icon+' item-icon"></i><div class="flex-grow-1"><div class="item-name">'+_escapeHtml(item.name)+'</div><div class="item-meta">'+_escapeHtml(meta)+'</div>'+extra+ldh+'<div class="item-chart-section" id="item-chart-section-'+idx+'" style="display:none"><canvas id="item-chart-'+idx+'" height="150"></canvas></div></div><div class="item-value">'+formatMoney(item.amount)+'</div><div class="item-action-area"><button class="btn btn-sm btn-outline-secondary" onclick="toggleItemChart('+idx+')" title="Chart"><i class="bi bi-graph-up"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="openEditModal('+idx+')" title="Edit"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="initiateDelete('+idx+')" title="Delete"><i class="bi bi-trash"></i></button></div></div>';
  });
  listArea.innerHTML = '<div class="card card-surface">' + rows.join('') + '</div>';
}

export function toggleItemChart(idx) {
  var section = document.getElementById('item-chart-section-' + idx);
  if (!section) return;

  // Toggle visibility
  if (section.style.display !== 'none') {
    section.style.display = 'none';
    if (_itemCharts[idx]) { _itemCharts[idx].destroy(); delete _itemCharts[idx]; }
    return;
  }
  section.style.display = '';

  var item = state.items[idx];
  if (!item) return;

  var startYear = state.settings.startYear;
  var projEnd = startYear + state.settings.projectionYears - 1;
  var effectiveEnd = item.endYear == null ? projEnd : Math.min(item.endYear, projEnd);
  var effectiveStart = Math.max(item.startYear, startYear);

  var years = [];
  var values = [];
  var balanceCache = {};

  var is401k = (item.category === 'Traditional 401(k)' || item.category === 'Roth 401(k)') && item.retirement401k;
  var hasContribOrWithdraw = (item.contributionAmount > 0) || (item.withdrawalAmount > 0);
  var hasLoan = item.loan && item.loan.loanAmount > 0;
  var loanSchedule = hasLoan ? calcLoanSchedule(item.loan, item.startYear, projEnd) : null;

  for (var y = effectiveStart; y <= effectiveEnd; y++) {
    years.push(y);
    var val = 0;

    if (item.type === 'inflows' || item.type === 'outflows') {
      val = item.amount;
    } else if (is401k) {
      val = calc401kBalance(item, y, balanceCache, projEnd);
    } else if (ASSET_TYPES.includes(item.type) && hasContribOrWithdraw) {
      val = calcItemBalance(item, y, balanceCache, projEnd);
    } else if (hasLoan && loanSchedule) {
      var assetVal = item.amount * Math.pow(1 + item.rate / 100, y - item.startYear);
      var entry = loanSchedule.find(function(e) { return e.year === y; });
      val = assetVal - (entry ? entry.closingBalance : 0);
    } else {
      val = item.amount * Math.pow(1 + item.rate / 100, y - item.startYear);
    }
    values.push(val);
  }

  var canvas = document.getElementById('item-chart-' + idx);
  if (!canvas) return;

  if (_itemCharts[idx]) { _itemCharts[idx].destroy(); }

  _itemCharts[idx] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label: item.name,
        data: values,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return formatMoney(ctx.parsed.y); }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9e9e9e', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          ticks: {
            color: '#9e9e9e',
            callback: function(v) { return formatMoney(v); }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

export function renderTaxBreakdown() {
  const panel = document.getElementById('taxBreakdownPanel');
  if (!panel) return;

  if (state.activeSection !== 'dashboard') {
    panel.style.display = 'none';
    return;
  }

  const proj = calcProjection(state.items, state.settings);
  if (proj.length === 0 || !proj[0].tax) {
    panel.style.display = 'none';
    return;
  }

  const tax = proj[0].tax;
  const filingStatus = (state.settings.tax && state.settings.tax.filingStatus) || 'single';
  const statusLabel = filingStatus === 'married_filing_jointly' ? 'Married Filing Jointly' : 'Single';

  panel.style.display = '';
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('tax-filingStatus', statusLabel);
  setEl('tax-ordinaryIncome', formatMoney(tax.ordinaryIncome));
  setEl('tax-ltcgIncome', formatMoney(tax.ltcgIncome));
  setEl('tax-taxableSS', formatMoney(tax.taxableSocialSecurity));
  setEl('tax-standardDeduction', formatMoney(tax.standardDeduction));
  setEl('tax-taxableOrdinaryIncome', formatMoney(tax.taxableOrdinaryIncome));
  setEl('tax-ordinaryTax', formatMoney(tax.ordinaryTax));
  setEl('tax-ltcgTax', formatMoney(tax.ltcgTax));
  setEl('tax-totalEstimatedTax', formatMoney(tax.totalEstimatedTax));
}

export function renderEmptyState() {
  const listArea = document.getElementById('item-list-area');
  if (!listArea) return;
  const label = TYPE_LABELS[state.activeSection] || state.activeSection;
  listArea.innerHTML = '<div class="empty-state"><i class="bi '+(TYPE_ICONS[state.activeSection]||'bi-inbox')+'"></i><p>No '+label+' items yet.</p><p class="small">Click "Add '+label+'" to get started.</p></div>';
}

export function updateBadges() {
  for (const type of ALL_TYPES) {
    const b = document.getElementById('badge-' + type);
    if (b) b.textContent = state.items.filter(i => i.type === type).length;
  }
  const addBtn = document.getElementById('btn-add-item');
  if (!addBtn) return;
  if (state.items.length >= MAX_ITEMS) {
    addBtn.disabled = true;
    let w = document.getElementById('max-items-warning');
    if (!w) { w = document.createElement('span'); w.id = 'max-items-warning'; w.className = 'badge bg-warning text-dark ms-2'; w.textContent = 'Max items reached'; addBtn.parentNode.insertBefore(w, addBtn.nextSibling); }
  } else {
    addBtn.disabled = false;
    const w = document.getElementById('max-items-warning');
    if (w) w.remove();
  }
}

export function updateStats() {
  const s = calcStats(state.items, state.settings);
  const e1 = document.getElementById('stat-totalAssets');
  const e2 = document.getElementById('stat-annualInflow');
  const e3 = document.getElementById('stat-annualOutflow');
  if (e1) e1.textContent = formatMoney(s.totalAssets);
  if (e2) e2.textContent = formatMoney(s.annualInflow);
  if (e3) e3.textContent = formatMoney(s.annualOutflow);
}

export function updateChart() {
  try {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;
    const proj = calcProjection(state.items, state.settings);
    const years = proj.map(p => p.year);
    const theme = state.settings.theme || DEFAULT_SETTINGS.theme;
    const accent = theme.accent || '#58a6ff', textColor = theme.text || '#e0e0e0', gridColor = 'rgba(255,255,255,0.1)';
    const datasets = [{ label: 'Total Net Worth', data: proj.map(p => p.netWorth), borderColor: accent, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.3 }];
    const tc = { bank:'#4fc3f7', investments:'#81c784', property:'#ffb74d', vehicles:'#e57373', rentals:'#ba68c8', inflows:'#4db6ac', outflows:'#f06292' };
    for (const type of ALL_TYPES) {
      if (!state.items.some(i => i.type === type)) continue;
      datasets.push({ label: TYPE_LABELS[type], data: proj.map(p => p.byType[type]), borderColor: tc[type]||'#aaa', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [5,5], pointRadius: 0, tension: 0.3 });
    }
    // Tax estimate dashed line
    if (proj.some(p => p.tax && p.tax.totalEstimatedTax > 0)) {
      datasets.push({ label: 'Est. Tax', data: proj.map(p => p.tax ? p.tax.totalEstimatedTax : 0), borderColor: '#ff7043', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [4,4], pointRadius: 0, tension: 0.3 });
    }
    // 401(k) per-type lines
    if (state.items.some(i => i.category === 'Traditional 401(k)')) {
      datasets.push({ label: 'Traditional 401(k)', data: proj.map(p => p.byType.traditional401k || 0), borderColor: '#ffd54f', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [6,3], pointRadius: 0, tension: 0.3 });
    }
    if (state.items.some(i => i.category === 'Roth 401(k)')) {
      datasets.push({ label: 'Roth 401(k)', data: proj.map(p => p.byType.roth401k || 0), borderColor: '#aed581', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [6,3], pointRadius: 0, tension: 0.3 });
    }
    const cfg = { type:'line', data:{labels:years,datasets}, options:{responsive:true,animation:false,plugins:{legend:{display:true,labels:{color:textColor,font:{size:12}}},title:{display:!!state.settings.chartTitle,text:state.settings.chartTitle||'',color:textColor}},scales:{x:{ticks:{color:textColor},grid:{color:gridColor}},y:{ticks:{color:textColor,callback:function(v){return formatMoney(v);}},grid:{color:gridColor}}}} };
    if (state.chartInstance) { state.chartInstance.data = cfg.data; state.chartInstance.options = cfg.options; state.chartInstance.update(); }
    else { state.chartInstance = new Chart(canvas, cfg); }
  } catch (err) { console.error('Chart render error:', err); }
}

export function render() {
  const meta = SECTION_META[state.activeSection] || SECTION_META.dashboard;
  const titleEl = document.getElementById('section-title');
  const subtitleEl = document.getElementById('section-subtitle');
  if (titleEl) titleEl.textContent = meta.title;
  if (subtitleEl) subtitleEl.textContent = meta.subtitle;

  // Toggle add button visibility
  const addBtn = document.getElementById('btn-add-item');
  const addLabel = document.getElementById('btn-add-label');
  if (addBtn) {
    if (state.activeSection === 'dashboard') {
      addBtn.classList.add('d-none');
    } else {
      addBtn.classList.remove('d-none');
      if (addLabel) addLabel.textContent = 'Add ' + (TYPE_LABELS[state.activeSection] || 'Item');
    }
  }

  // Highlight active nav link
  const navLinks = document.querySelectorAll('#sidebar .nav-link[data-section]');
  navLinks.forEach(link => {
    if (link.dataset.section === state.activeSection) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Tax breakdown panel visibility
  const taxPanel = document.getElementById('taxBreakdownPanel');
  if (taxPanel) {
    taxPanel.style.display = state.activeSection === 'dashboard' ? '' : 'none';
  }

  renderItemList();
  updateBadges();
  updateStats();
  updateChart();
  renderTaxBreakdown();
}
