---
inclusion: manual
---

# Architecture & Data Schema Guide

Comprehensive reference for the RCFP codebase. Use `#architecture-guide` when planning non-trivial changes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  CDN: Bootstrap 5 · Chart.js · SheetJS (XLSX)               │
│  Local: styles.css · app.bundle.js (IIFE)                   │
│  Module entry: js/main.js (only used in dev/test)           │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │    js/main.js       │  Browser entry point
                    │  (window.* globals) │  Imports all modules,
                    │                     │  exposes onclick handlers
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   js/eventHandlers.js   js/renderer.js      js/chatbot.js
   (DOM wiring,          (item list,          (WebLLM AI chat,
    DOMContentLoaded)     stats, badges,       in-browser LLM)
                          render orchestration)
        │                     │
   js/modalController.js  js/chart.js ←── js/timeline.js
   (add/edit/delete       (Chart.js          (Gantt timeline,
    modals)                projection)        crosshair state,
                                              tax breakdown)
        │                     │
        └─────────┬───────────┘
                  │
           js/appState.js ← shared mutable { items, settings, activeSection, chartInstance }
                  │
           js/state.js ← loadState() / saveItems() / saveSettings() via localStorage
                  │
           js/calculator.js ← pure functions: calcProjection, calcItemBalance, calc401kBalance,
                  │            calcLoanSchedule, calcTax, calcStats, calcItemValue
                  │
           js/constants.js ← ASSET_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS
           js/taxBrackets.js ← TAX_BRACKETS_2025 (federal ordinary + LTCG + SS thresholds)
           js/prettyPrinter.js ← formatMoney()
           js/uiConstants.js ← TYPE_LABELS, TYPE_ICONS, SECTION_META
           js/serializer.js ← exportToXlsx() / importFromXlsx()
```

### Data Flow

```
User Action → State Mutation (appState.state) → saveItems()/saveSettings() → localStorage → render()
```

## Data Schema

### Item (stored in localStorage as JSON array under `rcfp_items`)

```javascript
{
  id: "uuid-string",
  type: "bank" | "investments" | "property" | "vehicles" | "rentals" | "inflows" | "outflows",
  category: string,          // e.g. "Savings", "Stocks", "Primary Home", "Salary"
  name: string,
  amount: number,            // initial value or annual amount (for inflows/outflows)
  rate: number,              // annual growth/interest rate (%)
  startYear: number,
  endYear: number | null,    // null = open-ended (active through full projection)
  createdAt: string,         // ISO timestamp

  // Optional — recurring contributions/withdrawals
  contributionAmount: number | null,
  contributionFrequency: "monthly" | "yearly" | null,
  contributionEndYear: number | null,
  withdrawalAmount: number | null,
  withdrawalFrequency: "monthly" | "yearly" | null,

  // Optional — loan (property/vehicles)
  loan: {
    loanAmount: number,
    annualInterestRate: number,
    monthlyPayment: number,
    escrowMonthly: number,
    propertyTaxAnnual: number,
    extraMonthlyPayment: number
  } | null,

  // Optional — 401(k)
  retirement401k: {
    employeeContribution: number,
    employerMatchPct: number,
    employerMatchCapPct: number,
    annualSalary: number,
    vestingYears: number,
    withdrawalStartYear: number | null
  } | null
}
```

### Settings (stored under `rcfp_settings`)

```javascript
{
  chartTitle: string,
  startYear: number,         // default 2025
  projectionYears: number,   // default 30
  theme: { background, surface, text, accent, fontFamily, fontSize },
  tax: {
    filingStatus: "single" | "married_jointly" | "married_separately" | "head_of_household",
    birthYear: number,
    annualSocialSecurityBenefit: number,
    socialSecurityStartYear: number | null,
    bracketInflationRate: number  // default 2.5%
  }
}
```

## Build System

Two execution modes — both work:

| Mode | Entry | Used by |
|------|-------|---------|
| ES Modules | `js/main.js` (via `<script type="module">`) | Dev in browser, tests |
| IIFE Bundle | `app.bundle.js` (via `<script>`) | Production (GitHub Pages) |

`build.js` concatenates all `js/*.js` → strips imports/exports → wraps in IIFE. File order matters.

### Adding a new module
1. Create `js/myModule.js` with `export` functions
2. Add to `files` array in `build.js` (order matters — deps before dependents)
3. Re-export from `script.js`
4. If onclick-referenced: add `window.*` in `js/main.js` and `build.js`
5. `node build.js && npm test`

## CI/CD Pipeline

```
Push to main → Tests workflow (Node 24, npm ci, build, test) → Deploy workflow → GitHub Pages
```

## CDN Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Bootstrap 5 | 5.3.3 | UI framework, grid, modals, nav |
| Bootstrap Icons | 1.11.3 | Icon font |
| Chart.js | 4.4.4 | Net worth projection chart |
| SheetJS (XLSX) | 0.18.5 | Excel import/export |
| WebLLM | latest (ESM) | In-browser AI chatbot (dynamic import) |

## Module Reference

| File | Lines | Responsibility |
|------|-------|---------------|
| `js/constants.js` | 44 | ASSET_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS |
| `js/taxBrackets.js` | 44 | 2025 federal tax brackets |
| `js/state.js` | 46 | loadState(), saveItems(), saveSettings() |
| `js/prettyPrinter.js` | 13 | formatMoney() |
| `js/appState.js` | 15 | Shared mutable state singleton |
| `js/calculator.js` | 446 | Pure calculation engine |
| `js/serializer.js` | 136 | Excel import/export |
| `js/uiConstants.js` | 42 | TYPE_LABELS, TYPE_ICONS, SECTION_META |
| `js/renderer.js` | 267 | Item list, stats, badges, render orchestration |
| `js/chart.js` | 92 | Chart.js projection chart, crosshair plugin |
| `js/timeline.js` | 290 | Gantt timeline, crosshair sync, tax breakdown |
| `js/modalController.js` | 391 | Add/edit/delete item modals |
| `js/eventHandlers.js` | 263 | DOM event wiring, theme, settings panel |
| `js/chatbot.js` | 355 | WebLLM AI chat, financial context assembly |
| `js/main.js` | 24 | Browser entry, window globals |
| `script.js` | 52 | Barrel re-exports for tests |
| `build.js` | 61 | Build script |

## Key Patterns
- `var` in chatbot.js and some older code; newer code uses `const`/`let`
- `endYear: null` = active through entire projection
- Balance cache: `calcItemBalance`/`calc401kBalance` use `{ [itemId]: { [year]: balance } }` for memoization
- Always use `formatMoney()` for dollar amounts
- onclick handlers require `window.*` exposure in both `main.js` and `build.js`

## Common Task Recipes

### Adding a new calculation
1. Pure function in `js/calculator.js` → export → re-export from `script.js` → tests in `tests/` → build & test

### Adding a new UI section
1. HTML in `index.html` → render logic in `js/renderer.js` → events in `js/eventHandlers.js` → styles in `styles.css` → window.* if onclick → build & test

### Modifying the data schema
1. `js/constants.js` or `js/modalController.js` → `js/serializer.js` → `js/chatbot.js` → calculator functions → build & test
