// =============================================================================
// main.js — Browser entry point
// Loads all modules and exposes onclick-referenced functions on window
// =============================================================================

import { initiateDelete, confirmDelete, cancelDelete, openEditModal } from './modalController.js';
import { toggleItemChart } from './renderer.js';
import { navigateToItem } from './renderer.js';
import { toggleChatPanel, sendChatMessage, handleChatKeydown } from './chatbot.js';

// These functions are referenced in onclick="" attributes in rendered HTML,
// so they must be available as globals in the browser.
window.initiateDelete = initiateDelete;
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;
window.openEditModal = openEditModal;
window.toggleItemChart = toggleItemChart;
window.navigateToItem = navigateToItem;
window.toggleChatPanel = toggleChatPanel;
window.sendChatMessage = sendChatMessage;
window.handleChatKeydown = handleChatKeydown;

// Import eventHandlers to trigger its DOMContentLoaded side effects
import './eventHandlers.js';
