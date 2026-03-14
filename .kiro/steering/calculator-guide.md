---
inclusion: fileMatch
fileMatchPattern: "**/calculator.js"
---

# Calculator Module Guide

All functions are pure — no DOM access, no side effects, no shared state.

## Key functions
- `calcProjection(items, settings)` → array of `{ year, netWorth, byType, tax }` — the main projection engine
- `calcItemBalance(item, year, balanceCache, projEndYear)` → balance with contributions/withdrawals (uses memoization cache)
- `calc401kBalance(item, year, balanceCache, projEndYear)` → 401(k) with employer match, vesting, withdrawal phase
- `calcLoanSchedule(loanConfig, startYear, endYear)` → array of yearly amortization entries
- `calcTax(taxInputs, settings)` → federal tax estimate (ordinary + LTCG + Social Security)
- `calcItemValue(item, year)` → simple compound growth (legacy, no contributions)
- `calcStats(items, settings)` → summary: totalAssets, annualInflow, annualOutflow

## Balance cache pattern
`calcItemBalance` and `calc401kBalance` accept a `balanceCache` object `{ [itemId]: { [year]: balance } }`. Pass the same cache object across calls to avoid recomputation. The cache is populated incrementally from startYear forward.

## Testing
Tests are in `tests/calc*.test.js` and use fast-check property-based testing. Import from `../script.js`.
