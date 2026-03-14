// =============================================================================
// Chatbot — In-browser AI assistant powered by WebLLM
// =============================================================================

import { state } from './appState.js';
import { formatMoney } from './prettyPrinter.js';
import { calcProjection } from './calculator.js';

var MODEL_ID = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';

var engine = null;
var engineLoading = false;
var engineReady = false;
var conversationHistory = [];
var isGenerating = false;
var _firstOpen = true;

// ---------------------------------------------------------------------------
// WebGPU check
// ---------------------------------------------------------------------------
export function checkWebGPU() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

// ---------------------------------------------------------------------------
// Financial context assembly
// ---------------------------------------------------------------------------
export function assembleFinancialContext() {
  var s = state.settings;
  var lines = [];
  lines.push('You are a concise financial planning assistant embedded in a retirement cash flow planner app.');
  lines.push('Below is the user\'s current financial data. Use ONLY this data to answer questions.');
  lines.push('If asked about net worth, total assets, cash flow, or projections, calculate from the data below.');
  lines.push('Keep answers short and specific. Use dollar amounts when relevant.');
  lines.push('');
  lines.push('SETTINGS:');
  lines.push('- Start Year: ' + s.startYear);
  lines.push('- Projection Years: ' + s.projectionYears);
  if (s.tax) {
    if (s.tax.filingStatus) lines.push('- Filing Status: ' + s.tax.filingStatus);
    if (s.tax.birthYear) lines.push('- Birth Year: ' + s.tax.birthYear);
    if (s.tax.annualSocialSecurityBenefit) lines.push('- Annual Social Security Benefit: ' + formatMoney(s.tax.annualSocialSecurityBenefit));
    if (s.tax.socialSecurityStartYear) lines.push('- Social Security Start Year: ' + s.tax.socialSecurityStartYear);
  }
  lines.push('');
  lines.push('ITEMS:');
  if (state.items.length === 0) {
    lines.push('(No items entered yet)');
  } else {
    for (var i = 0; i < state.items.length; i++) {
      var item = state.items[i];
      var yr = item.endYear == null ? 'ongoing' : item.endYear;
      lines.push((i + 1) + '. [' + item.type + '] "' + item.name + '" \u2014 ' + item.category);
      lines.push('   Amount: ' + formatMoney(item.amount) + ' | Rate: ' + item.rate + '% | Years: ' + item.startYear + '\u2013' + yr);
      if (item.contributionAmount > 0) {
        var cf = item.contributionFrequency === 'monthly' ? '/mo' : '/yr';
        var ce = item.contributionEndYear != null ? ' (until ' + item.contributionEndYear + ')' : '';
        lines.push('   Contributions: ' + formatMoney(item.contributionAmount) + cf + ce);
      }
      if (item.withdrawalAmount > 0) {
        var wf = item.withdrawalFrequency === 'monthly' ? '/mo' : '/yr';
        lines.push('   Withdrawals: ' + formatMoney(item.withdrawalAmount) + wf);
      }
      if (item.loan) {
        var l = item.loan;
        lines.push('   Loan: ' + formatMoney(l.loanAmount) + ' at ' + l.interestRate + '%, ' + formatMoney(l.monthlyPayment) + '/mo payment');
        if (l.escrowMonthly) lines.push('   Escrow: ' + formatMoney(l.escrowMonthly) + '/mo');
        if (l.extraMonthlyPayment) lines.push('   Extra payment: ' + formatMoney(l.extraMonthlyPayment) + '/mo');
      }
      if (item.retirement401k) {
        var r = item.retirement401k;
        lines.push('   401(k): Employee ' + formatMoney(r.employeeContribution || 0) + '/yr, Salary ' + formatMoney(r.annualSalary || 0) + ', Match ' + (r.employerMatchPct || 0) + '% up to ' + (r.employerMatchCapPct || 0) + '% of salary');
      }
      lines.push('');
    }
  }
  lines.push('');
  // Pre-computed projection table so the model can look up values directly
  if (state.items.length > 0) {
    var proj = calcProjection(state.items, state.settings);
    lines.push('PROJECTION TABLE (pre-computed, use for lookups):');
    lines.push('Year | Net Worth | Bank | Investments | Property | Vehicles | Rentals | Inflows | Outflows | Est. Tax');
    for (var p = 0; p < proj.length; p++) {
      var row = proj[p];
      var bt = row.byType;
      var tax = row.tax ? row.tax.totalEstimatedTax : 0;
      lines.push(row.year + ' | ' + formatMoney(Math.round(row.netWorth)) + ' | ' + formatMoney(Math.round(bt.bank)) + ' | ' + formatMoney(Math.round(bt.investments)) + ' | ' + formatMoney(Math.round(bt.property)) + ' | ' + formatMoney(Math.round(bt.vehicles)) + ' | ' + formatMoney(Math.round(bt.rentals)) + ' | ' + formatMoney(Math.round(bt.inflows)) + ' | ' + formatMoney(Math.round(bt.outflows)) + ' | ' + formatMoney(Math.round(tax)));
    }
    lines.push('');
  }
  lines.push('INSTRUCTIONS: Answer the user\'s question using ONLY the data above. For questions about net worth or balances in a specific year, look up the value in the PROJECTION TABLE. Be specific with numbers. Do not try to calculate — use the table.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function appendMessage(role, text) {
  var area = document.getElementById('chatbot-messages');
  if (!area) return;
  var div = document.createElement('div');
  div.className = role === 'user' ? 'chatbot-msg chatbot-msg-user' : 'chatbot-msg chatbot-msg-assistant';
  div.textContent = text;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function updateStreamingMessage(text) {
  var area = document.getElementById('chatbot-messages');
  if (!area) return;
  var last = area.querySelector('.chatbot-msg-assistant:last-child');
  if (last) last.textContent = text;
}

function setInputEnabled(enabled) {
  var input = document.getElementById('chatbot-input');
  var btn = document.getElementById('chatbot-send');
  if (input) input.disabled = !enabled;
  if (btn) btn.disabled = !enabled;
}

function showError(message) {
  var area = document.getElementById('chatbot-messages');
  if (!area) return;
  var div = document.createElement('div');
  div.className = 'chatbot-msg chatbot-msg-error';
  div.textContent = message;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

// ---------------------------------------------------------------------------
// Engine initialization (lazy)
// ---------------------------------------------------------------------------
async function initEngine() {
  if (engineLoading || engineReady) return;
  engineLoading = true;

  var area = document.getElementById('chatbot-messages');
  // Show progress bar
  var progressDiv = document.createElement('div');
  progressDiv.className = 'chatbot-progress';
  progressDiv.innerHTML = '<div class="chatbot-progress-bar" id="chatbot-progress-bar"></div><span id="chatbot-progress-text">Loading model\u2026 0%</span>';
  if (area) area.appendChild(progressDiv);

  try {
    var webllm = await import('https://esm.run/@mlc-ai/web-llm');
    engine = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: function(progress) {
        var bar = document.getElementById('chatbot-progress-bar');
        var txt = document.getElementById('chatbot-progress-text');
        var pct = Math.round((progress.progress || 0) * 100);
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = 'Loading model\u2026 ' + pct + '%';
      }
    });
    engineReady = true;
    engineLoading = false;
    if (progressDiv && progressDiv.parentNode) progressDiv.remove();
    setInputEnabled(true);
    appendMessage('assistant', 'Ready! Ask me anything about your retirement plan.');
  } catch (err) {
    engineLoading = false;
    if (progressDiv && progressDiv.parentNode) progressDiv.remove();
    showError('Failed to load AI model: ' + (err.message || err));
  }
}

// ---------------------------------------------------------------------------
// Toggle panel
// ---------------------------------------------------------------------------
export function toggleChatPanel() {
  var panel = document.getElementById('chatbot-panel');
  if (!panel) return;

  if (panel.style.display !== 'none' && panel.style.display !== '') {
    panel.style.display = 'none';
    var main = document.getElementById('main-content');
    if (main) main.style.marginRight = '';
    return;
  }

  panel.style.display = 'flex';

  // Shift main content to make room for chatbot panel
  var main = document.getElementById('main-content');
  if (main) main.style.marginRight = '380px';

  if (_firstOpen) {
    _firstOpen = false;
    if (!checkWebGPU()) {
      showError('WebGPU is not available in this browser. The AI chatbot requires Chrome 113+ or Edge 113+ with WebGPU support.');
      var toggle = document.getElementById('chatbot-toggle');
      if (toggle) toggle.title = 'WebGPU not supported in this browser';
      return;
    }
    initEngine();
  }
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------
export async function sendChatMessage() {
  var input = document.getElementById('chatbot-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text || isGenerating || !engineReady) return;

  input.value = '';
  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  var systemMsg = { role: 'system', content: assembleFinancialContext() };
  var messages = [systemMsg].concat(conversationHistory);

  isGenerating = true;
  setInputEnabled(false);

  // Create placeholder for streaming
  var assistantDiv = appendMessage('assistant', '\u2026');

  try {
    var chunks = await engine.chat.completions.create({ messages: messages, stream: true });
    var accumulated = '';
    for await (var chunk of chunks) {
      var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (delta && delta.content) {
        accumulated += delta.content;
        updateStreamingMessage(accumulated);
      }
    }
    conversationHistory.push({ role: 'assistant', content: accumulated });
  } catch (err) {
    if (assistantDiv && assistantDiv.parentNode) assistantDiv.remove();
    showError('Error generating response: ' + (err.message || err));
  }

  isGenerating = false;
  setInputEnabled(true);
  var area = document.getElementById('chatbot-messages');
  if (area) area.scrollTop = area.scrollHeight;
}

// Allow Enter key to send
export function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}
