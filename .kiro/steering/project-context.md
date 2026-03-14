---
inclusion: always
---

# RCFP Project Context

## Build & Test
- Build: `node build.js` (concatenates js/*.js → app.bundle.js IIFE)
- Test: `npm test` (vitest --run, 127 tests, ~5s)
- Always rebuild and test after code changes
- Always commit and push after completing a feature

## Module System
- ES modules in `js/*.js`, barrel re-exports in `script.js`
- `build.js` strips imports/exports, wraps in IIFE — file order matters
- Tests import from `../script.js`, not directly from `js/*.js`
- Functions used in `onclick=""` must be exposed as `window.*` in both `js/main.js` and `build.js`

## Data
- State stored in localStorage: `rcfp_items` (Item[]), `rcfp_settings` (Settings)
- `endYear: null` means open-ended (active through full projection)
- Shared mutable state in `js/appState.js` — all modules read/write `state` directly

## Key Files
- `js/calculator.js` — pure calculation functions (projection, balances, tax, loans)
- `js/renderer.js` — item list rendering, stats, badges, render orchestration
- `js/chart.js` — Chart.js projection chart, crosshair plugin
- `js/timeline.js` — Gantt timeline, crosshair sync state, tax breakdown
- `js/modalController.js` — add/edit/delete item modals
- `js/eventHandlers.js` — DOM event wiring, theme, settings panel
- `js/chatbot.js` — WebLLM AI chat (Qwen2.5-3B, 4096 token context window)
- `js/serializer.js` — Excel import/export via SheetJS

## Conventions
- Vanilla JS, no framework, no TypeScript
- Pure functions for calculations, DOM manipulation isolated to renderer/modal/events
- Use `formatMoney()` from prettyPrinter.js for dollar amounts
- CDN dependencies: Bootstrap 5, Chart.js, SheetJS, Bootstrap Icons
- CI: push → Tests workflow → Deploy to GitHub Pages
- Each module has a JSDoc header listing exports and dependencies
