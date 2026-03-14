# Design Document: Retirement Cash Flow Planner

## Overview

The Retirement Cash Flow Planner is a static single-page application (SPA) that runs entirely in the browser with no backend. Users model their financial future by entering assets, income streams, and expenses, then viewing a year-by-year projection chart and summary dashboard.

The app is delivered as three files: `index.html`, `script.js`, and `styles.css`. All CDN dependencies (Bootstrap 5, Chart.js, SheetJS) are loaded via `<script>` and `<link>` tags. All state lives in `localStorage`. There is no build step.

### Key Design Goals

- Zero-dependency runtime (no npm, no bundler)
- Instant feedback: every data change re-renders the chart and stats in real time
- Portable: the three files can be opened directly from the filesystem or served from any static host
- Testable: pure functions for calculation, formatting, and serialization are isolated from DOM manipulation

---

## Architecture

The app follows a simple unidirectional data flow:

```
User Action → State Mutation → localStorage.setItem → render()
                                                          ↓
                                              updateChart() + updateStats() + renderItemList() + updateBadges()
```

All rendering is triggered by a single `render()` function that reads from `localStorage` and rebuilds the relevant DOM sections. There is no virtual DOM or reactive framework — DOM updates are explicit and targeted.

### Module Boundaries (within script.js)

```
script.js
├── State          — loadState(), saveState(), DEFAULT_SETTINGS
├── PrettyPrinter  — formatMoney(value)
├── Calculator     — calcProjection(items, settings), calcStats(items, settings)
├── Serializer     — exportToXlsx(items), importFromXlsx(file) → Promise<{items, skipped}>
├── Renderer       — render(), renderItemList(), updateChart(), updateStats(), updateBadges()
├── ModalController — openAddModal(type), openEditModal(index), closeModal()
└── EventHandlers  — sidebar clicks, form submit, import/export buttons, settings inputs
```

Each module boundary is a logical grouping of functions within the single `script.js` file, not a separate file. This keeps the project to three files while maintaining clear separation of concerns.

---

## Components and Interfaces

### State

```js
// localStorage keys
const STORAGE_KEYS = {
  ITEMS: 'rcfp_items',
  SETTINGS: 'rcfp_settings'
};

// Default settings
const DEFAULT_SETTINGS = {
  chartTitle: 'Retirement Asset Projection',
  startYear: 2025,
  projectionYears: 30,
  theme: {
    background: '#181a1b',
    surface: '#23272e',
    text: '#e0e0e0',
    accent: '#58a6ff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 16
  }
};

function loadState() // → { items: Item[], settings: Settings }
function saveItems(items)  // → void
function saveSettings(settings) // → void
```

### PrettyPrinter

```js
// Formats a number as abbreviated currency string
// formatMoney(1500000) → "$1.5M"
// formatMoney(2300)    → "$2.3K"
// formatMoney(500)     → "$500"
function formatMoney(value) // → string
```

### Calculator

```js
// Returns array of { year, netWorth, byType } for each year in projection period
function calcProjection(items, settings) // → ProjectionYear[]

// Returns { totalAssets, annualInflow, annualOutflow } for the start year
function calcStats(items, settings) // → Stats

// Compound growth formula for a single item at a given year
// value × (1 + rate/100) ^ (year − startYear)
function calcItemValue(item, year) // → number
```

### Serializer

```js
// Triggers browser download of retirement-cash-flow.xlsx
function exportToXlsx(items) // → void

// Reads a File object, parses rows, returns valid items and skip count
function importFromXlsx(file) // → Promise<{ items: Item[], skipped: number }>
```

### Renderer

```js
function render()           // master render — calls all sub-renderers
function renderItemList()   // renders item rows for current section
function updateChart()      // updates Chart.js instance
function updateStats()      // updates the three summary cards
function updateBadges()     // updates sidebar count badges
function renderEmptyState() // renders empty-state message
```

### ModalController

```js
function openAddModal(type)     // pre-fills type, clears other fields, focuses Name
function openEditModal(index)   // pre-fills all fields from item at index
function closeModal()           // hides Bootstrap modal
```

---

## Data Models

### Item

```js
{
  id: string,          // UUID v4 — unique identifier
  type: ItemType,      // 'bank' | 'investments' | 'property' | 'vehicles' | 'rentals' | 'inflows' | 'outflows'
  category: string,   // subcategory label (e.g. "Savings", "Salary")
  name: string,        // user-provided label
  amount: number,      // current value (assets) or annual amount (cash flows)
  rate: number,        // annual growth/depreciation rate as a percentage (can be negative)
  startYear: number,   // first year this item is active
  endYear: number,     // last year this item is active
  createdAt: string    // ISO 8601 timestamp
}
```

### Settings

```js
{
  chartTitle: string,
  startYear: number,
  projectionYears: number,
  theme: {
    background: string,  // CSS hex color
    surface: string,
    text: string,
    accent: string,
    fontFamily: string,
    fontSize: number     // px
  }
}
```

### ProjectionYear

```js
{
  year: number,
  netWorth: number,
  byType: {
    bank: number,
    investments: number,
    property: number,
    vehicles: number,
    rentals: number,
    inflows: number,
    outflows: number
  }
}
```

### Subcategory Map

```js
const SUBCATEGORIES = {
  bank:        ['Checking', 'Savings', 'Term Deposit'],
  investments: ['Stocks', 'ETFs', 'Superannuation', 'Bonds', 'Crypto'],
  property:    ['Primary Home', 'Investment Property', 'Land', 'Commercial'],
  vehicles:    ['Car', 'Boat', 'Motorcycle'],
  rentals:     ['Residential', 'Holiday', 'Commercial'],
  inflows:     ['Salary', 'Pension', 'Dividends', 'Rental Income', 'Other Income'],
  outflows:    ['Living Expenses', 'Mortgage', 'Tax', 'Insurance', 'Other Expenses']
};
```

### Item Type Constants

```js
const ASSET_TYPES = ['bank', 'investments', 'property', 'vehicles', 'rentals'];
const CASHFLOW_TYPES = ['inflows', 'outflows'];
const ALL_TYPES = [...ASSET_TYPES, ...CASHFLOW_TYPES];
const MAX_ITEMS = 999;
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Item Add Round-Trip

*For any* valid item (all required fields present), adding it to the planner should result in that item being retrievable from localStorage with all fields intact.

**Validates: Requirements 1.2, 7.1**

---

### Property 2: Invalid Item Rejected

*For any* item submission where at least one required field (name, category, type, amount, startYear, endYear) is empty or missing, the item list in localStorage should remain unchanged after the attempted add.

**Validates: Requirements 1.3**

---

### Property 3: Delete Removes Item

*For any* item list containing at least one item, confirming deletion of an item at a given index should result in that item no longer appearing in the stored item list, and the list length decreasing by exactly one.

**Validates: Requirements 1.5**

---

### Property 4: Cancel Delete Preserves List

*For any* item list, cancelling a deletion should leave the item list identical to its state before the delete action was initiated.

**Validates: Requirements 1.6**

---

### Property 5: Item Count Limit Enforced

*For any* item list already at 999 items, attempting to add one more item should fail and leave the item count at 999.

**Validates: Requirements 1.7**

---

### Property 6: createdAt Timestamp on New Items

*For any* item created through the add flow, the resulting item object should have a `createdAt` field that is a valid ISO 8601 timestamp string.

**Validates: Requirements 1.8**

---

### Property 7: Subcategory Options Match Spec

*For any* item type in the system, the subcategory options presented in the modal should exactly match the predefined list for that type (no more, no fewer).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

---

### Property 8: Projection Covers Exactly projectionYears Entries

*For any* settings object with a given `startYear` and `projectionYears`, `calcProjection` should return an array of exactly `projectionYears` entries, with years running from `startYear` to `startYear + projectionYears - 1` inclusive.

**Validates: Requirements 3.1**

---

### Property 9: Compound Growth Formula Correctness

*For any* asset item with any annual rate (positive, zero, or negative) and any year within the item's start–end range, `calcItemValue(item, year)` should equal `item.amount × (1 + item.rate/100) ^ (year − item.startYear)`. For any year outside the item's range, the result should be exactly 0.

**Validates: Requirements 3.2, 3.3, 3.5**

---

### Property 10: Net Worth Formula Correctness

*For any* item list and any year in the projection period, the net worth for that year should equal the sum of all active asset item values plus the sum of all active inflow amounts minus the sum of all active outflow amounts.

**Validates: Requirements 3.4**

---

### Property 11: Stats Correctness

*For any* item list and settings, `calcStats` should return `totalAssets` equal to the sum of amounts of all asset-type items active in `startYear`, `annualInflow` equal to the sum of inflow amounts active in `startYear`, and `annualOutflow` equal to the sum of outflow amounts active in `startYear`.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 12: formatMoney Abbreviation Rules

*For any* non-negative number `v`, `formatMoney(v)` should return a string matching: `$X.XM` when `v ≥ 1,000,000`; `$X.XK` when `1,000 ≤ v < 1,000,000`; `$X` (integer, no suffix) when `v < 1,000`.

**Validates: Requirements 5.5, 11.2**

---

### Property 13: State Persistence Round-Trip

*For any* item list and settings object, saving them to localStorage and then loading them back should produce an item list and settings object deeply equal to the originals.

**Validates: Requirements 7.2, 7.3, 9.5**

---

### Property 14: Excel Round-Trip

*For any* valid item list, exporting to an `.xlsx` workbook and then importing that workbook should produce an item list equivalent to the original (same items, same field values).

**Validates: Requirements 8.4**

---

### Property 15: Invalid Rows Skipped on Import

*For any* workbook where some rows are missing required fields, `importFromXlsx` should return only the valid rows as items and a `skipped` count equal to the number of invalid rows.

**Validates: Requirements 8.3**

---

### Property 16: Non-xlsx Files Rejected

*For any* file whose extension is not `.xlsx`, the import function should reject it and leave the current item list unchanged.

**Validates: Requirements 8.5**

---

### Property 17: Section Filter Correctness

*For any* item list and any active section, the rendered item list should contain only items whose `type` matches the active section — no items from other sections should appear.

**Validates: Requirements 11.4**

---

## Error Handling

### Validation Errors (Add/Edit Form)

- Required fields: `type`, `category`, `name`, `amount`, `startYear`, `endYear`
- `startYear` must be ≤ `endYear`
- `amount` must be a finite number
- `rate` defaults to 0 if omitted; must be a finite number if provided
- On validation failure: display an inline Bootstrap alert inside the modal; do not close the modal; do not write to localStorage

### Item Limit

- When `items.length >= 999`, the "Add" button is disabled and a warning badge is shown in the section header
- The form submit handler also guards against this as a second line of defence

### Import Errors

- Non-`.xlsx` file selected: show a Bootstrap toast/alert with message "Only .xlsx files are supported. No data was changed."
- Rows with missing required fields: skip silently, then show a dismissible alert: "Import complete. X row(s) were skipped due to missing required fields."
- Completely empty workbook: treat as 0 valid rows, show the skip warning

### localStorage Errors

- If `JSON.parse` throws on load (corrupted data): catch the error, log to console, and initialise with empty items and default settings
- If `localStorage.setItem` throws (quota exceeded): catch the error and show a toast: "Storage quota exceeded. Please export your data and clear some space."

### Chart Errors

- If Chart.js fails to render (e.g. canvas not found): catch and log; do not crash the rest of the app

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- Unit tests catch concrete bugs with specific known inputs and edge cases
- Property-based tests verify universal correctness across a wide range of generated inputs

### Unit Tests

Focus on:
- Specific examples for `formatMoney`: `formatMoney(0)` → `"$0"`, `formatMoney(1000)` → `"$1.0K"`, `formatMoney(1500000)` → `"$1.5M"`
- Edge cases: `calcItemValue` with `rate = 0`, `year === startYear`, `year === endYear`, `year < startYear`
- Integration: `loadState()` when localStorage is empty returns defaults
- Import: a workbook with one valid row and one row missing `name` returns 1 item and `skipped: 1`
- The `SUBCATEGORIES` map contains exactly the seven types with the correct options

### Property-Based Tests

Use **fast-check** (available via CDN or npm for test runner context). Each property test runs a minimum of **100 iterations**.

Each test is tagged with a comment in the format:
`// Feature: retirement-cash-flow-planner, Property N: <property_text>`

| Property | Test Description |
|----------|-----------------|
| P1 | Generate random valid items, add each, verify round-trip from localStorage |
| P2 | Generate items with one required field nulled out, verify list unchanged |
| P3 | Generate item list with ≥1 item, delete random index, verify removal |
| P4 | Generate item list, initiate then cancel delete, verify list unchanged |
| P5 | Generate list of exactly 999 items, attempt add, verify count stays 999 |
| P6 | Generate random valid items, verify `createdAt` is valid ISO string |
| P7 | For each type, verify subcategory array matches SUBCATEGORIES constant |
| P8 | Generate random startYear + projectionYears, verify output length and year range |
| P9 | Generate random items + years, verify compound formula and out-of-range = 0 |
| P10 | Generate random item lists + years, verify net worth = assets + inflows - outflows |
| P11 | Generate random item lists + settings, verify calcStats totals |
| P12 | Generate random numbers in each range, verify formatMoney output format |
| P13 | Generate random items + settings, save then load, verify deep equality |
| P14 | Generate random valid item lists, export then import, verify equivalence |
| P15 | Generate workbooks with mixed valid/invalid rows, verify skipped count |
| P16 | Generate non-xlsx filenames, verify rejection and list unchanged |
| P17 | Generate item lists + section names, verify filtered list contains only matching type |

### Test File Structure

Tests live in a `tests/` directory alongside the source files:

```
tests/
├── prettyPrinter.test.js   — P12 + unit examples
├── calculator.test.js      — P8, P9, P10, P11
├── serializer.test.js      — P14, P15, P16
├── state.test.js           — P1, P2, P3, P4, P5, P6, P13
├── renderer.test.js        — P7, P17
└── setup.js                — localStorage mock, fast-check config
```

Run with: `npx vitest --run` (no watch mode needed for CI).
