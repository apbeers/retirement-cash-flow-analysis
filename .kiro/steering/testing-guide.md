---
inclusion: fileMatch
fileMatchPattern: "tests/**"
---

# Testing Guide

## Setup
- Framework: Vitest 4.x with jsdom environment
- Property testing: fast-check (100 iterations per property)
- Setup file: `tests/setup.js` — mocks localStorage, clears before each test

## Conventions
- Always import from `../script.js` (barrel), never directly from `js/*.js`
- Use `describe` + `it` blocks with descriptive names
- Prefer property-based tests (fast-check) for calculation functions
- Unit tests for DOM/rendering functions

## Test files
| File | Covers |
|------|--------|
| `calculator.test.js` | calcProjection integration |
| `calc401kBalance.test.js` | 401(k) with employer match, vesting |
| `calcItemBalance.test.js` | Balance with contributions/withdrawals |
| `calcItemValue.test.js` | Simple compound growth |
| `calcLoanSchedule.test.js` | Loan amortization, payoff |
| `calcProjection.test.js` | Full year-by-year projection |
| `calcStats.test.js` | Summary statistics |
| `calcTax.test.js` | Federal tax estimation |
| `serializer.test.js` | Excel round-trip import/export |
| `state.test.js` | localStorage persistence |
| `statePersistence.test.js` | Corrupt data handling (expected stderr) |
| `renderer.test.js` | UI filtering, subcategories |
| `prettyPrinter.test.js` | Money formatting |

## Known behaviors
- `statePersistence.test.js` outputs `console.error` to stderr — expected (tests corrupt JSON)
- `renderer.test.js` wraps `toggleItemChart` in try-catch — Chart.js unavailable in jsdom
- Run: `npm test` (single run) or `npx vitest` (watch mode)
