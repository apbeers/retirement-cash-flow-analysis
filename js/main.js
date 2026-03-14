// =============================================================================
// main.js — Browser entry point
// Loads all modules and exposes onclick-referenced functions on window
// =============================================================================

import { initiateDelete, confirmDelete, cancelDelete } from './modalController.js';

// These functions are referenced in onclick="" attributes in rendered HTML,
// so they must be available as globals in the browser.
window.initiateDelete = initiateDelete;
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;

// Import eventHandlers to trigger its DOMContentLoaded side effects
import './eventHandlers.js';
