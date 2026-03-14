# Implementation Plan: Retirement Cash Flow Planner

## Overview

Implement a static single-page app in three files (`index.html`, `script.js`, `styles.css`) with a `tests/` directory. Tasks follow the unidirectional data flow: state → calculation → rendering. Each task builds on the previous and ends with everything wired together.

## Tasks

- [~] 1. Project scaffold and test setup
  - Create `index.html` with Bootstrap 5, Chart.js, and SheetJS CDN links; add canvas, sidebar nav, modal placeholder, and main content area
  - Create `styles.css` with CSS custom properties for the default dark theme (`--bg`, `--surface`, `--text`, `--accent`)
  - Create `script.js` with all constants: `STORAGE_KEYS`, `DEFAULT_SETTINGS`, `SUBCATEGORIES`, `ASSET_TYPES`, `CASHFLOW_TYPES`, `ALL_TYPES`, `MAX_ITEMS`
  - Create `tests/setup.js` with a localStorage mock and fast-check import
  - Create `vitest.config.js` (or `package.json` with vitest dependency) so `npx vitest --run` works
  - _Requirements: 1.1, 2.1–2.7, 9.2, 10.5_

- [ ] 2. State module — load, save, and persistence
  - [~] 2.1 Implement `loadState()`, `saveItems(items)`, and `saveSettings(settings)` in `script.js`
    - `loadState` reads from `localStorage`, falls back to empty items + `DEFAULT_SETTINGS` on missing or corrupt data
    - Wrap `JSON.parse` in try/catch; log error and return defaults on failure
    - _Requirements: 7.2, 7.3, 7.4_
  - [ ]* 2.2 Write property test for state persistence round-trip (Property 13)
    - **Property 13: State Persistence Round-Trip**
    - **Validates: Requirements 7.2, 7.3, 9.5**
    - File: `tests/state.test.js`

- [ ] 3. PrettyPrinter — formatMoney
  - [~] 3.1 Implement `formatMoney(value)` in `script.js`
    - `≥ 1,000,000` → `$X.XM`; `≥ 1,000` → `$X.XK`; `< 1,000` → `$X`
    - _Requirements: 5.5, 11.2_
  - [ ]* 3.2 Write unit tests for `formatMoney` concrete examples
    - `formatMoney(0)` → `"$0"`, `formatMoney(1000)` → `"$1.0K"`, `formatMoney(1500000)` → `"$1.5M"`
    - File: `tests/prettyPrinter.test.js`
  - [ ]* 3.3 Write property test for formatMoney abbreviation rules (Property 12)
    - **Property 12: formatMoney Abbreviation Rules**
    - **Validates: Requirements 5.5, 11.2**
    - File: `tests/prettyPrinter.test.js`

- [ ] 4. Calculator module
  - [~] 4.1 Implement `calcItemValue(item, year)` in `script.js`
    - Returns `item.amount × (1 + item.rate/100) ^ (year − item.startYear)` when year is within `[item.startYear, item.endYear]`; returns `0` otherwise
    - _Requirements: 3.2, 3.3, 3.5_
  - [ ]* 4.2 Write unit tests for `calcItemValue` edge cases
    - Test `rate = 0`, `year === startYear`, `year === endYear`, `year < startYear`, negative rate
    - File: `tests/calculator.test.js`
  - [ ]* 4.3 Write property test for compound growth formula correctness (Property 9)
    - **Property 9: Compound Growth Formula Correctness**
    - **Validates: Requirements 3.2, 3.3, 3.5**
    - File: `tests/calculator.test.js`
  - [~] 4.4 Implement `calcProjection(items, settings)` in `script.js`
    - Returns array of `ProjectionYear` objects, one per year from `startYear` to `startYear + projectionYears - 1`
    - Each entry includes `netWorth` and `byType` breakdown
    - _Requirements: 3.1, 3.4_
  - [ ]* 4.5 Write property test for projection length and year range (Property 8)
    - **Property 8: Projection Covers Exactly projectionYears Entries**
    - **Validates: Requirements 3.1**
    - File: `tests/calculator.test.js`
  - [ ]* 4.6 Write property test for net worth formula correctness (Property 10)
    - **Property 10: Net Worth Formula Correctness**
    - **Validates: Requirements 3.4**
    - File: `tests/calculator.test.js`
  - [~] 4.7 Implement `calcStats(items, settings)` in `script.js`
    - Returns `{ totalAssets, annualInflow, annualOutflow }` for `settings.startYear`
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 4.8 Write property test for stats correctness (Property 11)
    - **Property 11: Stats Correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - File: `tests/calculator.test.js`

- [~] 5. Checkpoint — calculator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Serializer module — Excel import and export
  - [~] 6.1 Implement `exportToXlsx(items)` in `script.js`
    - Uses SheetJS to build a workbook with one row per item, columns matching the Item schema
    - Triggers browser download of `retirement-cash-flow.xlsx`
    - _Requirements: 8.1_
  - [~] 6.2 Implement `importFromXlsx(file)` in `script.js`
    - Reads first sheet, parses rows into Item objects, skips rows missing required fields
    - Returns `Promise<{ items, skipped }>`
    - Rejects non-`.xlsx` files immediately without modifying state
    - _Requirements: 8.2, 8.3, 8.5_
  - [ ]* 6.3 Write property test for Excel round-trip (Property 14)
    - **Property 14: Excel Round-Trip**
    - **Validates: Requirements 8.4**
    - File: `tests/serializer.test.js`
  - [ ]* 6.4 Write property test for invalid rows skipped on import (Property 15)
    - **Property 15: Invalid Rows Skipped on Import**
    - **Validates: Requirements 8.3**
    - File: `tests/serializer.test.js`
  - [ ]* 6.5 Write property test for non-xlsx files rejected (Property 16)
    - **Property 16: Non-xlsx Files Rejected**
    - **Validates: Requirements 8.5**
    - File: `tests/serializer.test.js`

- [ ] 7. Item management — add, edit, delete, and validation
  - [~] 7.1 Implement `openAddModal(type)`, `openEditModal(index)`, and `closeModal()` in `script.js`
    - `openAddModal` pre-fills type, populates subcategory `<select>` from `SUBCATEGORIES`, clears other fields, focuses Name
    - `openEditModal` pre-fills all fields from the item at the given index
    - _Requirements: 1.3, 2.1–2.7, 11.3_
  - [ ]* 7.2 Write property test for subcategory options match spec (Property 7)
    - **Property 7: Subcategory Options Match Spec**
    - **Validates: Requirements 2.1–2.7**
    - File: `tests/renderer.test.js`
  - [~] 7.3 Implement form submit handler in `script.js`
    - Validate required fields (`type`, `category`, `name`, `amount`, `startYear`, `endYear`); validate `startYear ≤ endYear`; validate finite numbers
    - On failure: show inline Bootstrap alert inside modal, do not close, do not write to localStorage
    - On success: assign UUID v4 `id` and ISO `createdAt`, push to items array, call `saveItems`, call `render`, close modal
    - Guard against `items.length >= MAX_ITEMS`
    - _Requirements: 1.2, 1.3, 1.7, 1.8_
  - [ ]* 7.4 Write property test for item add round-trip (Property 1)
    - **Property 1: Item Add Round-Trip**
    - **Validates: Requirements 1.2, 7.1**
    - File: `tests/state.test.js`
  - [ ]* 7.5 Write property test for invalid item rejected (Property 2)
    - **Property 2: Invalid Item Rejected**
    - **Validates: Requirements 1.3**
    - File: `tests/state.test.js`
  - [ ]* 7.6 Write property test for createdAt timestamp on new items (Property 6)
    - **Property 6: createdAt Timestamp on New Items**
    - **Validates: Requirements 1.8**
    - File: `tests/state.test.js`
  - [ ]* 7.7 Write property test for item count limit enforced (Property 5)
    - **Property 5: Item Count Limit Enforced**
    - **Validates: Requirements 1.7**
    - File: `tests/state.test.js`
  - [~] 7.8 Implement inline delete confirmation in `script.js`
    - Clicking delete replaces the row's action area with "Delete? Yes / No" buttons (no popup)
    - "Yes" removes item from array, calls `saveItems`, calls `render`
    - "No" re-renders the row to its normal state
    - _Requirements: 1.4, 1.5, 1.6_
  - [ ]* 7.9 Write property test for delete removes item (Property 3)
    - **Property 3: Delete Removes Item**
    - **Validates: Requirements 1.5**
    - File: `tests/state.test.js`
  - [ ]* 7.10 Write property test for cancel delete preserves list (Property 4)
    - **Property 4: Cancel Delete Preserves List**
    - **Validates: Requirements 1.6**
    - File: `tests/state.test.js`

- [~] 8. Checkpoint — item management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Renderer module — item list, empty state, badges, and section filter
  - [~] 9.1 Implement `renderItemList()` in `script.js`
    - Renders rows only for items matching the active section type
    - Each row shows: type icon, name, subcategory, date range, annual rate, `formatMoney(amount)`, delete action
    - _Requirements: 11.1, 11.2, 11.4_
  - [ ]* 9.2 Write property test for section filter correctness (Property 17)
    - **Property 17: Section Filter Correctness**
    - **Validates: Requirements 11.4**
    - File: `tests/renderer.test.js`
  - [~] 9.3 Implement `renderEmptyState()` and `updateBadges()` in `script.js`
    - Empty state shown when active section has no items
    - Badges show per-type item counts in sidebar
    - Disable "Add" button and show warning badge when `items.length >= MAX_ITEMS`
    - _Requirements: 1.7, 6.2, 6.3, 6.5_

- [ ] 10. Renderer module — chart and stats
  - [ ] 10.1 Implement `updateStats()` in `script.js`
    - Calls `calcStats`, formats values with `formatMoney`, updates the three summary card DOM elements
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 10.2 Implement `updateChart()` in `script.js`
    - Calls `calcProjection`, builds Chart.js dataset for Total Net Worth (solid line) and one dashed dataset per type that has ≥1 item
    - x-axis: years; y-axis: `formatMoney` tick callback
    - Dark background, high-contrast grid lines and legend text
    - Wrap Chart.js init in try/catch; log error without crashing
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 10.3 Implement master `render()` function in `script.js`
    - Calls `renderItemList()`, `updateChart()`, `updateStats()`, `updateBadges()` in sequence
    - _Requirements: 3.6, 4.3, 5.4, 6.3_

- [ ] 11. Sidebar navigation and settings panel
  - [ ] 11.1 Implement sidebar click event handlers in `script.js`
    - Track active section; on click, update active state, call `render`
    - Show context-sensitive "Add [Item Type]" button in section header for non-Dashboard sections
    - _Requirements: 6.1, 6.4, 6.6_
  - [ ] 11.2 Implement settings panel inputs in `script.js`
    - Wire Chart Title, Start Year, and Projection Years inputs to `saveSettings` + `render` on change
    - Wire colour pickers and font controls to CSS custom properties + `saveSettings` on change
    - Wrap `localStorage.setItem` in try/catch; show toast on quota exceeded
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

- [ ] 12. Import/export wiring and error toasts
  - [ ] 12.1 Wire "Export Excel" button to `exportToXlsx(items)` in `script.js`
    - _Requirements: 8.1_
  - [ ] 12.2 Wire file input to `importFromXlsx(file)` in `script.js`
    - On success: call `saveItems`, call `render`, show skipped-rows alert if `skipped > 0`
    - On non-xlsx: show Bootstrap toast "Only .xlsx files are supported. No data was changed."
    - _Requirements: 8.2, 8.3, 8.5_

- [ ] 13. Final checkpoint — all tests pass, app fully wired
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- Run tests with: `npx vitest --run`
