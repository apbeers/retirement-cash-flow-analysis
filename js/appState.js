// =============================================================================
// App State — shared mutable state object
// All modules import `state` and read/write its properties directly.
// =============================================================================

import { loadState } from './state.js';

const _loaded = loadState();

export const state = {
  items: _loaded.items,
  settings: _loaded.settings,
  activeSection: 'dashboard',
  chartInstance: null
};
