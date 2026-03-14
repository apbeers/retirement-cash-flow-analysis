// =============================================================================
// App State — shared mutable singleton used by all modules
// Exports: state
// Depends on: state.js
//
// Properties:
//   state.items       — array of Item objects (the user's financial items)
//   state.settings    — Settings object (projection config, theme, tax)
//   state.activeSection — current sidebar section ("dashboard", "bank", etc.)
//   state.chartInstance — current Chart.js instance (or null)
//
// All modules import `state` and read/write its properties directly.
// After mutating items/settings, call saveItems()/saveSettings() then render().
// =============================================================================

import { loadState } from './state.js';

const _loaded = loadState();

export const state = {
  items: _loaded.items,
  settings: _loaded.settings,
  activeSection: 'dashboard',
  chartInstance: null
};
