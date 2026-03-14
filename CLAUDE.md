# Retirement Cash Flow Planner

Static single-page retirement planning app. Zero runtime dependencies — runs directly in the browser from the filesystem. No build step.

## Project Structure

- `index.html` — UI shell (Bootstrap 5, Chart.js, SheetJS via CDN)
- `script.js` — all logic: state, calculations, rendering, modals, event handlers
- `styles.css` — dark theme via CSS custom properties
- `tests/` — Vitest test suites
- `.kiro/specs/` — original Kiro spec documents (requirements, design, tasks)

## Commands

```bash
npm test          # run all tests (vitest --run)
npx vitest        # run in watch mode
```

Open `index.html` directly in a browser — no server needed.

## Architecture

Unidirectional data flow inside `script.js`:

```
User Action → State Mutation → localStorage.setItem → render()
```

Module boundaries within `script.js`:

- **State** — `loadState()`, `saveItems()`, `saveSettings()`
- **PrettyPrinter** — `formatMoney(value)`
- **Calculator** — `calcItemValue()`, `calcItemBalance()`, `calcLoanSchedule()`, `calc401kBalance()`, `calcTax()`, `calcProjection()`, `calcStats()`
- **Serializer** — `exportToXlsx()`, `importFromXlsx()`
- **Renderer** — `render()`, `renderItemList()`, `updateChart()`, `updateStats()`, `updateBadges()`, `renderEmptyState()`, `renderTaxBreakdown()`
- **ModalController** — `openAddModal()`, `openEditModal()`, `closeModal()`
- **EventHandlers** — wires DOM events to state + render

Calculation functions are pure. DOM manipulation is isolated to renderer functions.

## Data Model

**Item** fields: `id`, `type`, `category`, `name`, `amount`, `rate`, `startYear`, `endYear` (or `null` for open-ended)

**v2 extensions**: `contributionAmount`, `contributionFrequency`, `withdrawalAmount`, `withdrawalFrequency`, `loan` (sub-object), `retirement401k` (sub-object)

**Settings**: `startYear`, `projectionYears`, `chartTitle`, theme colors/fonts, `tax` (filing status, birth year, Social Security, bracket inflation rate)

## Testing

5 test suites using Vitest + fast-check for property-based testing:

- `tests/calculator.test.js` — projection, balance, loan, 401(k), tax formulas
- `tests/serializer.test.js` — Excel round-trip
- `tests/state.test.js` — persistence, item CRUD
- `tests/renderer.test.js` — UI filtering, subcategories
- `tests/prettyPrinter.test.js` — money formatting

Property tests run 100+ iterations each. Prefer property tests for calculation functions.

## Current Work (branch: `v2-features`)

Implementing recurring contributions, loan amortization, 401(k) modeling, open-ended items, and US federal tax estimation. See `.kiro/specs/recurring-contributions-and-loan-modeling/tasks.md` for detailed task status.

**Completed**: `calcItemBalance`, `calcLoanSchedule`, `calc401kBalance`, `calcProjection` updates, `calcTax`, serializer extension, HTML structure for new field groups.

**Remaining**: property tests (marked `*` in tasks — optional), modal controller wiring, item row display updates, tax breakdown UI, tax settings panel, CSS for new components.

## Key Constraints

- No build step — keep everything in the existing three files (`script.js`, `index.html`, `styles.css`)
- No new runtime dependencies
- All changes must preserve the existing unidirectional data flow
- `calcItemValue()` is preserved for backward compatibility; new balance-based items use `calcItemBalance()`
- `endYear: null` means active through the full projection period
