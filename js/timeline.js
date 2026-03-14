// =============================================================================
// Timeline — Gantt-style cash flow timeline, crosshair sync state
// Depends on: constants.js, prettyPrinter.js, calculator.js, uiConstants.js,
//             appState.js
// Exports: buildTimelineBars, renderTimeline, renderTaxBreakdown,
//          _setCrosshairYear, _getCrosshairYear
// =============================================================================

import { formatMoney } from './prettyPrinter.js';
import { calcLoanSchedule, getLoanPayoffYear, calcProjection } from './calculator.js';
import { _escapeHtml } from './uiConstants.js';
import { state } from './appState.js';

var TYPE_COLORS = { bank:'#4fc3f7', investments:'#81c784', property:'#ffb74d', vehicles:'#e57373', rentals:'#ba68c8', inflows:'#4db6ac', outflows:'#f06292' };

// Crosshair state shared between chart and timeline
var _crosshairYear = null;

export function _getCrosshairYear() { return _crosshairYear; }

export function _setCrosshairYear(year) {
  if (_crosshairYear === year) return;
  _crosshairYear = year;
  _updateTimelineCrosshair();
  if (state.chartInstance) state.chartInstance.draw();
}

export function buildTimelineBars(items, settings) {
  var projStart = settings.startYear;
  var projEnd = projStart + settings.projectionYears - 1;
  var totalYears = projEnd - projStart + 1;
  if (totalYears <= 0) return [];

  var bars = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var barStart = Math.max(item.startYear, projStart);
    var barEnd = Math.min(item.endYear == null ? projEnd : item.endYear, projEnd);
    if (barStart > projEnd || barEnd < projStart) continue;

    var leftPct = (barStart - projStart) / totalYears * 100;
    var widthPct = (barEnd - barStart + 1) / totalYears * 100;

    var contributionEndPct = null;
    if (item.contributionEndYear != null && item.contributionEndYear >= barStart && item.contributionEndYear <= barEnd) {
      contributionEndPct = (item.contributionEndYear - barStart) / (barEnd - barStart + 1) * 100;
    }

    var loanPayoffPct = null;
    var loanPayoffYear = null;
    var loanPaymentAmount = null;
    if (item.loan && item.loan.loanAmount > 0) {
      loanPaymentAmount = item.loan.monthlyPayment || 0;
      var schedule = calcLoanSchedule(item.loan, item.startYear, projEnd);
      loanPayoffYear = getLoanPayoffYear(schedule);
      if (loanPayoffYear != null && loanPayoffYear >= barStart && loanPayoffYear <= barEnd) {
        loanPayoffPct = (loanPayoffYear - barStart) / (barEnd - barStart + 1) * 100;
      } else {
        loanPayoffYear = null;
      }
    }

    bars.push({
      itemIndex: i,
      name: item.name,
      type: item.type,
      color: TYPE_COLORS[item.type] || '#aaa',
      startYear: barStart,
      endYear: barEnd,
      leftPct: leftPct,
      widthPct: widthPct,
      contributionEndYear: item.contributionEndYear != null && item.contributionEndYear >= barStart && item.contributionEndYear <= barEnd ? item.contributionEndYear : null,
      contributionEndPct: contributionEndPct,
      loanPayoffYear: loanPayoffYear,
      loanPayoffPct: loanPayoffPct,
      hasWithdrawal: item.withdrawalAmount > 0,
      amount: item.amount,
      contributionAmount: item.contributionAmount || null,
      contributionFrequency: item.contributionFrequency || null,
      withdrawalAmount: item.withdrawalAmount || null,
      withdrawalFrequency: item.withdrawalFrequency || null,
      loanPaymentAmount: loanPaymentAmount
    });
  }
  return bars;
}

export function renderTimeline() {
  var container = document.getElementById('timeline-container');
  if (!container) return;

  if (state.activeSection !== 'dashboard' || state.items.length === 0) {
    container.style.display = 'none';
    return;
  }

  var bars = buildTimelineBars(state.items, state.settings);
  if (bars.length === 0) { container.style.display = 'none'; return; }

  container.style.display = '';
  var projStart = state.settings.startYear;
  var projEnd = projStart + state.settings.projectionYears - 1;
  var totalYears = projEnd - projStart + 1;

  // Year axis ticks (every ~5 years)
  var tickInterval = totalYears <= 10 ? 1 : totalYears <= 20 ? 2 : 5;
  var axisHtml = '';
  for (var y = projStart; y <= projEnd; y += tickInterval) {
    var pct = (y - projStart) / totalYears * 100;
    axisHtml += '<span style="left:' + pct + '%">' + y + '</span>';
  }
  // Always show last year
  if ((projEnd - projStart) % tickInterval !== 0) {
    axisHtml += '<span style="left:100%">' + projEnd + '</span>';
  }

  // Lanes
  var lanesHtml = '';
  for (var i = 0; i < bars.length; i++) {
    var b = bars[i];
    var markers = '';
    if (b.contributionEndPct != null) {
      markers += '<div class="timeline-marker" style="left:' + b.contributionEndPct + '%" title="Contributions end: ' + b.contributionEndYear + '"></div>';
    }
    if (b.loanPayoffPct != null) {
      markers += '<div class="timeline-marker" style="left:' + b.loanPayoffPct + '%" title="Loan paid off: ' + b.loanPayoffYear + '"></div>';
    }

    // Build tooltip
    var tip = b.name + ' \u00B7 ' + formatMoney(b.amount);
    if (b.contributionAmount) tip += ' \u00B7 +' + formatMoney(b.contributionAmount) + (b.contributionFrequency === 'monthly' ? '/mo' : '/yr');
    if (b.contributionEndYear) tip += ' until ' + b.contributionEndYear;
    if (b.withdrawalAmount) tip += ' \u00B7 \u2212' + formatMoney(b.withdrawalAmount) + (b.withdrawalFrequency === 'monthly' ? '/mo' : '/yr');
    if (b.loanPaymentAmount) tip += ' \u00B7 Loan: ' + formatMoney(b.loanPaymentAmount) + '/mo';
    tip += ' \u00B7 ' + b.startYear + '\u2013' + b.endYear;

    lanesHtml += '<div class="timeline-lane"><span class="timeline-lane-label" title="' + _escapeHtml(b.name) + '">' + _escapeHtml(b.name) + '</span><div class="timeline-bar-area"><div class="timeline-bar" style="left:' + b.leftPct + '%;width:' + b.widthPct + '%;background:' + b.color + ';" title="' + _escapeHtml(tip) + '" onclick="navigateToItem(' + b.itemIndex + ')">' + markers + '</div></div></div>';
  }

  container.innerHTML = '<h6 class="mb-2"><i class="bi bi-calendar-range me-2"></i>Cash Flow Timeline</h6><div class="timeline-wrapper"><div class="timeline-axis">' + axisHtml + '</div>' + lanesHtml + '</div>';

  // Timeline → chart crosshair sync
  var wrapper = container.querySelector('.timeline-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mousemove', function(e) {
      var barArea = wrapper.querySelector('.timeline-bar-area');
      if (!barArea) return;
      var rect = barArea.getBoundingClientRect();
      var relX = e.clientX - rect.left;
      if (relX < 0 || relX > rect.width) { _setCrosshairYear(null); return; }
      var frac = relX / rect.width;
      var year = Math.round(projStart + frac * totalYears);
      year = Math.max(projStart, Math.min(projEnd, year));
      _setCrosshairYear(year);
    });
    wrapper.addEventListener('mouseleave', function() {
      _setCrosshairYear(null);
    });
  }
}

function _updateTimelineCrosshair() {
  var container = document.getElementById('timeline-container');
  if (!container) return;

  // Remove old crosshair elements
  var oldLine = container.querySelector('.timeline-crosshair');
  if (oldLine) oldLine.remove();
  var oldSummary = container.querySelector('.timeline-crosshair-summary');
  if (oldSummary) oldSummary.remove();

  // Reset bar highlights
  var allBars = container.querySelectorAll('.timeline-bar');
  for (var i = 0; i < allBars.length; i++) {
    allBars[i].style.opacity = '';
  }

  if (_crosshairYear == null) return;

  var wrapper = container.querySelector('.timeline-wrapper');
  if (!wrapper) return;

  var projStart = state.settings.startYear;
  var projEnd = projStart + state.settings.projectionYears - 1;
  var totalYears = projEnd - projStart + 1;
  if (totalYears <= 0) return;

  var pct = (_crosshairYear - projStart + 0.5) / totalYears * 100;
  if (pct < 0 || pct > 100) return;

  // Draw vertical line on timeline
  var line = document.createElement('div');
  line.className = 'timeline-crosshair';
  var barAreas = container.querySelectorAll('.timeline-bar-area');
  if (barAreas.length > 0) {
    var areaRect = barAreas[0].getBoundingClientRect();
    var wrapperRect = wrapper.getBoundingClientRect();
    var areaLeft = areaRect.left - wrapperRect.left;
    var areaWidth = areaRect.width;
    line.style.left = (areaLeft + pct / 100 * areaWidth) + 'px';
  }
  line.style.position = 'absolute';
  line.style.top = '0';
  line.style.bottom = '0';
  line.style.width = '1px';
  line.style.background = 'rgba(255,255,255,0.4)';
  line.style.pointerEvents = 'none';
  line.style.zIndex = '10';
  wrapper.style.position = 'relative';
  wrapper.appendChild(line);

  // Highlight active bars and compute monthly net
  var monthlyNet = 0;
  var lanes = container.querySelectorAll('.timeline-lane');
  var bars = buildTimelineBars(state.items, state.settings);
  for (var j = 0; j < bars.length; j++) {
    var b = bars[j];
    var barEl = lanes[j] ? lanes[j].querySelector('.timeline-bar') : null;
    if (!barEl) continue;

    var isActive = _crosshairYear >= b.startYear && _crosshairYear <= b.endYear;
    barEl.style.opacity = isActive ? '1' : '0.3';

    if (isActive) {
      var item = state.items[b.itemIndex];
      if (!item) continue;

      if (item.contributionAmount > 0 && (item.contributionEndYear == null || _crosshairYear <= item.contributionEndYear)) {
        var contribMonthly = item.contributionFrequency === 'monthly' ? item.contributionAmount : item.contributionAmount / 12;
        monthlyNet += contribMonthly;
      }
      if (item.withdrawalAmount > 0) {
        var withdrawMonthly = item.withdrawalFrequency === 'monthly' ? item.withdrawalAmount : item.withdrawalAmount / 12;
        monthlyNet -= withdrawMonthly;
      }
      if (item.type === 'inflows') {
        monthlyNet += item.amount / 12;
      }
      if (item.type === 'outflows') {
        monthlyNet -= item.amount / 12;
      }
      if (item.loan && item.loan.monthlyPayment > 0) {
        var payoffYear = b.loanPayoffYear;
        if (payoffYear == null || _crosshairYear <= payoffYear) {
          monthlyNet -= (item.loan.monthlyPayment + (item.loan.extraMonthlyPayment || 0));
        }
      }
    }
  }

  // Show summary
  var summary = document.createElement('div');
  summary.className = 'timeline-crosshair-summary';
  var sign = monthlyNet >= 0 ? '+' : '';
  summary.textContent = _crosshairYear + ' \u00B7 Net: ' + sign + formatMoney(Math.round(monthlyNet)) + '/mo';
  summary.style.color = monthlyNet >= 0 ? '#81c784' : '#f06292';
  container.appendChild(summary);
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
