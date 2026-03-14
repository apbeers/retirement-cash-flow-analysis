// =============================================================================
// State — loadState(), saveItems(), saveSettings()
// Depends on: constants.js
// =============================================================================

import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

export function loadState() {
  let items = [];
  let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  try {
    const rawItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (rawItems !== null) {
      items = JSON.parse(rawItems);
    }
  } catch (err) {
    console.error('Failed to parse items from localStorage:', err);
    items = [];
  }

  try {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings !== null) {
      const parsed = JSON.parse(rawSettings);
      settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
      // Merge tax sub-object with defaults to handle missing/corrupt fields
      settings.tax = Object.assign({}, DEFAULT_SETTINGS.tax, parsed.tax || {});
      // Merge theme sub-object with defaults
      settings.theme = Object.assign({}, DEFAULT_SETTINGS.theme, parsed.theme || {});
    }
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  return { items, settings };
}

export function saveItems(items) {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
