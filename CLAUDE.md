# Retirement Cash Flow Planner (RCFP)

A static single-page retirement planning app. Runs directly in the browser — no backend, no server. Users add financial items (bank accounts, investments, property, loans, 401(k)s, income, expenses) and see a multi-decade projection of net worth, cash flow, and taxes.

Live at: GitHub Pages (auto-deployed on push to `main` after tests pass).

---

## Quick Reference

```bash
npm run build     # node build.js → produces app.bundle.js
npm test          # vitest --run (127 tests, ~5s)
```

Open `index.html` in a browser — no dev server needed.

---

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
   (DOM wiring,          (render loop,       (WebLLM AI chat,
    DOMContentLoaded)     Chart.js,           in-browser LLM)
                          timeline)
        │                     │
   js/modalController.js      │
   (add/edit/delete modals)   │
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

All calculation functions are **pure** (no side effects). DOM manipulation is isolated to `renderer.js`, `modalController.js`, and `eventHandlers.js`.

---

## Build System

There is **no bundler** (no webpack/vite/rollup). Instead:

- `build.js` concatenates all `js/*.js` files into a single `app.bundle.js` IIFE
- It strips `import`/`export` statements and wraps everything in `(function() { "use strict"; ... })()`
- Functions referenced in `onclick=""` HTML attributes are exposed via `window.functionName` at the bottom of the bundle
- **File order matters** in `build.js` — dependencies must come before dependents

### Two execution modes

| Mode | Entry | Used by |
|------|-------|---------|
| ES Modules | `js/main.js` (via `<script type="module">`) | Dev in browser, tests |
| IIFE Bundle | `app.bundle.js` (via `<script>`) | Production (GitHub Pages) |

Both modes work. The HTML currently loads `js/main.js` as a module. The bundle is built for deployment.

### Adding a new module

1. Create `js/myModule.js` with `export` functions
2. Add it to the `files` array in `build.js` (order matters)
3. Re-export public symbols from `script.js` (barrel file for tests)
4. If any function is used in `onclick=""` attributes, add `window.myFunction = myFunction` in both `js/main.js` and the globals section of `build.js`
5. Run `node build.js` to regenerate the bundle

---

## Data Schema

### Item (stored in localStorage as JSON array)

```javascript
{
  id: "uuid-string",
  type: "bank" | "investments" | "property" | "vehicles" | "rentals" | "inflows" | "outflows",
  category: string,          // e.g. "Savings", "Stocks", "Primary Home", "Salary"
  name: string,              // user-defined label
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

  // Optional — 401(k) (investments with category "Traditional 401(k)" or "Roth 401(k)")
  retirement401k: {
    employeeContribution: number,  // annual
    employerMatchPct: number,
    employerMatchCapPct: number,
    annualSalary: number,
    vestingYears: number,
    withdrawalStartYear: number | null
  } | null
}
```

### Settings (stored in localStorage)

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

### localStorage Keys

- `rcfp_items` — JSON array of Item objects
- `rcfp_settings` — JSON Settings object

---

## Module Reference

| File | Lines | Responsibility |
|------|-------|---------------|
| `js/constants.js` | 44 | ASSET_TYPES, SUBCATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS |
| `js/taxBrackets.js` | 44 | 2025 federal tax brackets (ordinary, LTCG, SS thresholds) |
| `js/state.js` | 46 | loadState(), saveItems(), saveSettings() — localStorage I/O |
| `js/prettyPrinter.js` | 13 | formatMoney() — $1.2M / $45.3K / $500 |
| `js/appState.js` | 15 | Shared mutable state singleton: { items, settings, activeSection, chartInstance } |
| `js/calculator.js` | 446 | **Pure calculation engine** — calcProjection, calcItemBalance, calc401kBalance, calcLoanSchedule, calcTax, calcStats, calcItemValue |
| `js/serializer.js` | 136 | Excel import/export via SheetJS |
| `js/uiConstants.js` | 42 | TYPE_LABELS, TYPE_ICONS, SECTION_META, _escapeHtml |
| `js/renderer.js` | 624 | **Largest file** — render(), renderItemList(), updateChart(), renderTimeline(), crosshair sync, tax breakdown |
| `js/modalController.js` | 391 | Add/edit/delete item modals, form validation, field group visibility |
| `js/eventHandlers.js` | 263 | DOMContentLoaded wiring, theme application, sidebar nav, settings panel, import/export |
| `js/chatbot.js` | 355 | WebLLM integration, AI chat panel, financial context assembly |
| `js/main.js` | 24 | Browser entry — imports all modules, exposes window globals |
| `script.js` | 52 | Barrel file — re-exports all public symbols for test imports |
| `build.js` | 61 | Build script — concatenates modules into app.bundle.js IIFE |

---

## Files That Could Be Split

### renderer.js (624 lines) — recommended split

This is the largest module and handles multiple concerns:
- **Chart rendering** (`updateChart`, `_handleChartHover`, `_setCrosshairYear`) — could become `js/chart.js`
- **Timeline/Gantt** (`buildTimelineBars`, `renderTimeline`, `_updateTimelineCrosshair`) — could become `js/timeline.js`
- **Item list rendering** (`renderItemList`, `toggleItemChart`, `navigateToItem`) — stays in renderer
- **Stats/badges/tax** (`updateStats`, `updateBadges`, `renderTaxBreakdown`, `renderEmptyState`) — stays in renderer

### modalController.js (391 lines) — acceptable as-is
Tightly coupled form logic. Splitting would create more complexity than it solves.

### calculator.js (446 lines) — acceptable as-is
All pure functions with clear boundaries. Could split tax functions into `js/taxCalculator.js` if it grows further.

### styles.css (625 lines) — acceptable as-is
Single stylesheet for a single-page app. Could split into component files if CSS grows significantly.

---

## CI/CD Pipeline

```
Push to main → GitHub Actions "Tests" workflow → GitHub Actions "Deploy" workflow → GitHub Pages
```

### Test workflow (`.github/workflows/test.yml`)
- Triggers on: push to `main`, all PRs
- Steps: checkout → Node 24 → `npm ci` → `node build.js` → `npm test`

### Deploy workflow (`.github/workflows/deploy.yml`)
- Triggers on: successful completion of Tests workflow on `main`
- Steps: checkout → Node 24 → `npm ci` → `node build.js` → upload entire repo as Pages artifact → deploy
- Deploys the whole directory (index.html, styles.css, app.bundle.js, etc.)

---

## Testing

**Framework**: Vitest 4.x with jsdom environment
**Property testing**: fast-check (100 iterations per property)

### Test setup (`tests/setup.js`)
- Mocks `localStorage` for jsdom
- Configures fast-check global settings
- Clears localStorage before each test

### Test files (127 tests total)

| File | Tests | What it covers |
|------|-------|---------------|
| `calculator.test.js` | Core | calcProjection integration |
| `calc401kBalance.test.js` | Unit | 401(k) balance with employer match, vesting |
| `calcItemBalance.test.js` | Unit | Balance with contributions/withdrawals |
| `calcItemValue.test.js` | Unit | Simple compound growth |
| `calcLoanSchedule.test.js` | Unit | Loan amortization, payoff |
| `calcProjection.test.js` | Unit | Full year-by-year projection |
| `calcStats.test.js` | Unit | Summary statistics |
| `calcTax.test.js` | Unit | Federal tax estimation |
| `serializer.test.js` | Unit | Excel round-trip import/export |
| `state.test.js` | Unit | localStorage persistence |
| `statePersistence.test.js` | Unit | Corrupt data handling |
| `renderer.test.js` | Unit | UI filtering, subcategories |
| `prettyPrinter.test.js` | Unit | Money formatting |

### Running tests
```bash
npm test              # single run (CI-friendly)
npx vitest            # watch mode (dev)
npx vitest --run -t "calcTax"  # run specific test
```

### Known test behaviors
- `statePersistence.test.js` outputs `console.error` to stderr — this is expected (tests corrupt JSON handling)
- `renderer.test.js` wraps `toggleItemChart` in try-catch because Chart.js isn't available in jsdom
- Tests import from `../script.js` (barrel file), not directly from `js/*.js`

---

## CDN Dependencies (loaded in index.html)

| Library | Version | Purpose |
|---------|---------|---------|
| Bootstrap 5 | 5.3.3 | UI framework, grid, modals, nav |
| Bootstrap Icons | 1.11.3 | Icon font |
| Chart.js | 4.4.4 | Net worth projection chart |
| SheetJS (XLSX) | 0.18.5 | Excel import/export |
| WebLLM | latest (ESM) | In-browser AI chatbot (dynamically imported) |

---

## Chatbot (WebLLM)

- Model: `Qwen2.5-3B-Instruct-q4f16_1-MLC` (4096 token context window)
- Loaded lazily on first chat panel open via dynamic `import('https://esm.run/@mlc-ai/web-llm')`
- Requires WebGPU (Chrome 113+ / Edge 113+)
- System prompt includes: user's items, settings, pre-computed projection table, loan summaries, monthly cash flow, milestones, per-item balances
- Context tables are sampled (every 5 years for 15+ year projections) to fit within token limit

---

## Key Patterns & Conventions

1. **No framework** — vanilla JS with ES modules, no React/Vue/Angular
2. **`var` in some modules** — chatbot.js and some older code uses `var`; newer code uses `const`/`let`
3. **Shared mutable state** — `appState.js` exports a single `state` object; all modules read/write it directly
4. **onclick handlers** — some HTML uses inline `onclick="functionName()"` which requires `window.functionName` exposure in both `main.js` and `build.js`
5. **No TypeScript** — plain JavaScript throughout
6. **endYear: null** — means the item is active through the entire projection period (open-ended)
7. **Balance cache** — `calcItemBalance` and `calc401kBalance` use a `balanceCache` object for memoization across years
8. **formatMoney** — always use `formatMoney()` from prettyPrinter.js for displaying dollar amounts

---

## Common Tasks for AI Agents

### Adding a new calculation
1. Add the pure function to `js/calculator.js`
2. Export it from `js/calculator.js`
3. Re-export from `script.js`
4. Write tests in `tests/` importing from `../script.js`
5. Run `node build.js` then `npm test`

### Adding a new UI section
1. Add HTML structure to `index.html`
2. Add rendering logic to `js/renderer.js`
3. Add event wiring to `js/eventHandlers.js`
4. Add styles to `styles.css`
5. If using onclick handlers, expose via `window.*` in `js/main.js` and `build.js`
6. Run `node build.js` then `npm test`

### Modifying the data schema
1. Update the Item/Settings shape in `js/constants.js` (DEFAULT_SETTINGS) or `js/modalController.js` (_handleSaveItem)
2. Update `js/serializer.js` for Excel import/export compatibility
3. Update `js/chatbot.js` assembleFinancialContext() if the new field should be visible to the AI
4. Update relevant calculator functions
5. Run `node build.js` then `npm test`

### After ANY code change
```bash
node build.js    # rebuild the bundle
npm test         # verify all 127 tests pass
git add -A && git commit -m "description" && git push
```
