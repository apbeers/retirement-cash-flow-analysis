// Simulate browser globals
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  removeItem(k) { delete this._data[k]; }
};
global.document = undefined;
global.bootstrap = undefined;

try {
  const code = require('fs').readFileSync('app.bundle.js', 'utf8');
  // Remove the IIFE wrapper and evaluate
  const inner = code.replace(/^.*?\(function\(\)\s*\{/, '(function(){').trim();
  eval(inner);
  console.log('Bundle loaded successfully');
} catch (err) {
  console.error('Bundle error:', err.message);
  console.error('Stack:', err.stack);
}
