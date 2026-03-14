// =============================================================================
// Chart — updateChart, crosshair plugin, hover handling
// Depends on: constants.js, prettyPrinter.js, calculator.js, uiConstants.js,
//             appState.js, timeline.js
// Exports: updateChart
// =============================================================================

import { ALL_TYPES, DEFAULT_SETTINGS } from './constants.js';
import { formatMoney } from './prettyPrinter.js';
import { calcProjection } from './calculator.js';
import { TYPE_LABELS } from './uiConstants.js';
import { state } from './appState.js';
import { _setCrosshairYear, _getCrosshairYear } from './timeline.js';

var TYPE_COLORS = { bank:'#4fc3f7', investments:'#81c784', property:'#ffb74d', vehicles:'#e57373', rentals:'#ba68c8', inflows:'#4db6ac', outflows:'#f06292' };

// Crosshair plugin for Chart.js — draws a vertical line at the hovered x position
var _crosshairPlugin = {
  id: 'crosshairSync',
  afterDraw: function(chart) {
    var year = _getCrosshairYear();
    if (year == null) return;
    var xScale = chart.scales.x;
    if (!xScale) return;
    var labels = chart.data.labels;
    var idx = labels.indexOf(year);
    if (idx < 0) return;
    var x = xScale.getPixelForValue(idx);
    var ctx = chart.ctx;
    var yTop = chart.chartArea.top;
    var yBottom = chart.chartArea.bottom;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.restore();
  }
};

function _handleChartHover(evt, chart) {
  var xScale = chart.scales.x;
  if (!xScale || !evt.native) { _setCrosshairYear(null); return; }
  var rect = chart.canvas.getBoundingClientRect();
  var mouseX = evt.native.clientX - rect.left;
  if (mouseX < chart.chartArea.left || mouseX > chart.chartArea.right) { _setCrosshairYear(null); return; }
  var idx = xScale.getValueForPixel(mouseX);
  var labels = chart.data.labels;
  var yearIdx = Math.round(idx);
  if (yearIdx >= 0 && yearIdx < labels.length) {
    _setCrosshairYear(labels[yearIdx]);
  } else {
    _setCrosshairYear(null);
  }
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
    for (const type of ALL_TYPES) {
      if (!state.items.some(i => i.type === type)) continue;
      datasets.push({ label: TYPE_LABELS[type], data: proj.map(p => p.byType[type]), borderColor: TYPE_COLORS[type]||'#aaa', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [5,5], pointRadius: 0, tension: 0.3 });
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
    const cfg = { type:'line', data:{labels:years,datasets}, options:{responsive:true,animation:false,plugins:{legend:{display:true,labels:{color:textColor,font:{size:12}}},title:{display:!!state.settings.chartTitle,text:state.settings.chartTitle||'',color:textColor},tooltip:{mode:'index',intersect:false}},scales:{x:{ticks:{color:textColor},grid:{color:gridColor}},y:{ticks:{color:textColor,callback:function(v){return formatMoney(v);}},grid:{color:gridColor}}},onHover:function(evt,_el,chart){_handleChartHover(evt,chart);}},plugins:[_crosshairPlugin] };
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }
    state.chartInstance = new Chart(canvas, cfg);
    // Clear crosshair when mouse leaves chart
    if (!canvas._crosshairLeaveAttached) {
      canvas.addEventListener('mouseleave', function() { _setCrosshairYear(null); });
      canvas._crosshairLeaveAttached = true;
    }
  } catch (err) { console.error('Chart render error:', err); }
}
