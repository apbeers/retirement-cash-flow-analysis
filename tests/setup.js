// =============================================================================
// Test Setup — localStorage mock + fast-check config
// =============================================================================

import * as fc from 'fast-check';

// Configure fast-check for consistent, reasonably fast runs
fc.configureGlobal({ numRuns: 100 });

// localStorage mock for jsdom / node environments that lack a real implementation
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    }
  };
})();

// Install the mock on globalThis so all test files share it
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Reset localStorage before each test to prevent state leakage
beforeEach(() => {
  localStorageMock.clear();
});
