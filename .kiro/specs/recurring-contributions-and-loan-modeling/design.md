# Design Document: Recurring Contributions, Loan Modeling, 401(k), and US Tax

## Overview

This feature extends the existing Retirement Cash Flow Planner (a zero-dependency static SPA in `index.html` / `script.js` / `styles.css`) with seven related capabilities:

1. Recurring contributions to Bank Account and Investment items
2. Recurring withdrawals from any asset item
3. Loan / mortgage amortisation on Property and Vehicle items
4. Recurring loan payments reducing loan balance and building equity
5. Traditional 401(k) and Roth 401(k) modeling with employee/employer contributions, vesting, and withdrawal phases
6. Open-ended items (`endYear: null`) that remain active for the full projection period
7. US federal income tax estimation (ordinary income, LTCG, Social Security) deducted from net worth and displayed as a separate chart line and dashboard panel

All changes stay within the existing three-file structure. No build step is introduced. The module boundaries inside `script.js` are extended, not replaced.

---

## Architecture

The existing unidirectional data flow is preserved:

```
User Action → State Mutation → localStorage.setItem → render()
                                                          ↓
                              updateChart() + updateStats() + renderItemList() + updateBadges()
                              + renderTaxBreakdown()
```

### Extended Module Boundaries

```
script.js
├── State           — loadState(), saveState(), DEFAULT_SETTINGS (+ tax settings fields)
├── PrettyPrinter   — formatMoney(value)  [unchanged]
├── Calculator      — calcItemBalance(item, year, balanceCache)
│                     calcLoanSchedule(loan, startYear, endYear) → AmortYear[]
│                     calc401kBalance(item, year, balanceCache)
│                     calcTax(taxInputs, settings) → TaxResult
│                     calcProjection(items, settings) → ProjectionYear[]
│                     calcStats(items, settings)
├── Serializer      — exportToXlsx(items), importFromXlsx(file) [extended columns]
├── Renderer        — render(), renderItemList(), updateChart(), updateStats(),
│                     updateBadges(), renderEmptyState(), renderTaxBreakdown()
├── ModalController — openAddModal(type), openEditModal(index), closeModal()
│                     + new field groups: contribution, withdrawal, loan, 401k, open-ended toggle
└── EventHandlers   — existing handlers + tax settings inputs
```

### Key Calculation Design Decision

Because contributions, withdrawals, and loan payments are **path-dependent** (each year's balance depends on the previous year's balance), `calcProjection` now maintains a `balanceCache` map keyed by item id. This replaces the stateless `calcItemValue` formula for bank/investment/401k items. Property and vehicle items without a loan still use the existing compound-growth formula; those with a loan use `calcLoanSchedule`.

---

## Components and Interfaces

### State

New fields added to `DEFAULT_SETTINGS`:

```js
const DEFAULT_SETTINGS = {
  // ... existing fields unchanged ...
  tax: {
    filingStatus: 'single',          // 'single' | 'married_filing_jointly'
    birthYear: 1970,
    annualSocialSecurityBenefit: 0,
    socialSecurityStartYear: null,   // number | null
    bracketInflationRate: 2.5        // %
  }
};
```

### Calculator — new and updated functions

```js
// Returns the amortisation schedule for a loan, one entry per year.
// loanConfig matches the loan sub-object on an Item.
// Returns array indexed from startYear to projectionEndYear.
function calcLoanSchedule(loanConfig, itemStartYear, projectionEndYear)
// → AmortYear[]

// Returns the balance of a bank/investment item at a given year,
// using the running balance from balanceCache[item.id][year-1].
// Mutates balanceCache in place.
function calcItemBalance(item, year, balanceCache)
// → number

// Returns the balance of a 401(k) item at a given year.
// Handles contribution phase vs withdrawal phase, employer match, vesting.
function calc401kBalance(item, year, balanceCache)
// → number

// Computes estimated federal tax for a single projection year.
function calcTax(taxInputs, settings)
// → TaxResult

// Master projection — now returns extended ProjectionYear objects.
function calcProjection(items, settings)
// → ProjectionYear[]
```

### Renderer — new function

```js
// Renders the collapsible Tax Breakdown panel on the dashboard.
function renderTaxBreakdown(projectionYear, settings)
// → void
```

---

## Data Models

### Extended Item

All new fields are optional. Existing items without them behave identically to before.

```js
{
  // --- existing fields (unchanged) ---
  id: string,
  type: ItemType,
  category: string,
  name: string,
  amount: number,
  rate: number,
  startYear: number,
  endYear: number | null,   // null = open-ended
  createdAt: string,

  // --- new: recurring contribution (bank, investments) ---
  contributionAmount: number | null,
  contributionFrequency: 'monthly' | 'annual' | null,

  // --- new: recurring withdrawal (any asset) ---
  withdrawalAmount: number | null,
  withdrawalFrequency: 'monthly' | 'annual' | null,

  // --- new: loan (property, vehicles) ---
  loan: LoanConfig | null,

  // --- new: 401(k) (investments subcategory) ---
  retirement401k: Retirement401kConfig | null
}
```

### LoanConfig

```js
{
  loanAmount: number,           // initial principal
  annualInterestRate: number,   // % e.g. 6.5
  monthlyPayment: number,       // scheduled P+I payment
  escrowMonthly: number,        // property tax + insurance escrow (default 0)
  propertyTaxAnnual: number,    // annual property tax (default 0)
  extraMonthlyPayment: number   // extra principal payment per month (default 0)
}
```

### Retirement401kConfig

```js
{
  employeeContribution: number,   // annual employee contribution $
  employerMatchPct: number,       // employer match % of employee contribution
  employerMatchCapPct: number,    // cap as % of annual salary
  annualSalary: number,           // used only for match cap calculation
  vestingYears: number,           // years before employer match vests (0 = immediate)
  withdrawalStartYear: number | null  // year to switch to withdrawal phase
}
```

### AmortYear

```js
{
  year: number,
  openingBalance: number,
  principalPaid: number,
  interestPaid: number,
  escrowPaid: number,
  closingBalance: number   // = openingBalance - principalPaid (floor 0)
}
```

### Extended ProjectionYear

```js
{
  year: number,
  netWorth: number,          // after-tax
  byType: {
    bank: number,
    investments: number,
    property: number,
    vehicles: number,
    rentals: number,
    inflows: number,
    outflows: number,
    traditional401k: number,
    roth401k: number
  },
  tax: TaxResult             // see below
}
```

### TaxResult

```js
{
  ordinaryIncome: number,
  ltcgIncome: number,
  taxableSocialSecurity: number,
  standardDeduction: number,
  taxableOrdinaryIncome: number,
  ordinaryTax: number,
  ltcgTax: number,
  totalEstimatedTax: number
}
```

### Extended Settings

```js
{
  // ... existing fields ...
  tax: {
    filingStatus: 'single' | 'married_filing_jointly',
    birthYear: number,
    annualSocialSecurityBenefit: number,
    socialSecurityStartYear: number | null,
    bracketInflationRate: number   // %, default 2.5
  }
}
```

### 2025 Tax Bracket Seed Values

```js
const TAX_BRACKETS_2025 = {
  single: {
    ordinary: [
      { rate: 0.10, upTo: 11925 },
      { rate: 0.12, upTo: 48475 },
      { rate: 0.22, upTo: 103350 },
      { rate: 0.24, upTo: 197300 },
      { rate: 0.32, upTo: 250525 },
      { rate: 0.35, upTo: 626350 },
      { rate: 0.37, upTo: Infinity }
    ],
    ltcg: [
      { rate: 0.00, upTo: 48350 },
      { rate: 0.15, upTo: 533400 },
      { rate: 0.20, upTo: Infinity }
    ],
    standardDeduction: 15000,
    ssTaxThresholdLow: 25000,
    ssTaxThresholdHigh: 34000
  },
  married_filing_jointly: {
    ordinary: [
      { rate: 0.10, upTo: 23850 },
      { rate: 0.12, upTo: 96950 },
      { rate: 0.22, upTo: 206700 },
      { rate: 0.24, upTo: 394600 },
      { rate: 0.32, upTo: 501050 },
      { rate: 0.35, upTo: 751600 },
      { rate: 0.37, upTo: Infinity }
    ],
    ltcg: [
      { rate: 0.00, upTo: 96700 },
      { rate: 0.15, upTo: 600050 },
      { rate: 0.20, upTo: Infinity }
    ],
    standardDeduction: 30000,
    ssTaxThresholdLow: 32000,
    ssTaxThresholdHigh: 44000
  }
};
```

### Updated SUBCATEGORIES

```js
const SUBCATEGORIES = {
  // ... existing entries unchanged ...
  investments: ['Stocks', 'ETFs', 'Superannuation', 'Bonds', 'Crypto',
                'Traditional 401(k)', 'Roth 401(k)']
};
```

### Updated ASSET_TYPES

`traditional401k` and `roth401k` are not separate top-level types; they are subcategories of `investments`. The Calculator identifies them by `item.category`.

---

## Calculation Formulas

### Balance-Based Projection (bank, investments, 401k)

For each year `y` from `item.startYear` to effective end year:

```
annualContrib = contributionFrequency === 'monthly'
                  ? contributionAmount * 12
                  : (contributionAmount ?? 0)

annualWithdraw = withdrawalFrequency === 'monthly'
                   ? withdrawalAmount * 12
                   : (withdrawalAmount ?? 0)

balance(y) = max(0, (balance(y-1) + annualContrib - annualWithdraw) * (1 + rate/100))
balance(startYear - 1) = item.amount   // seed value
```

For years before `startYear` or after effective end year, balance = 0.

### Loan Amortisation (monthly simulation, aggregated per year)

```
monthlyRate = annualInterestRate / 12 / 100
totalMonthlyPayment = monthlyPayment + extraMonthlyPayment

For each month m from month 1 to month (projectionEndYear - itemStartYear + 1) * 12:
  interestCharge = loanBalance * monthlyRate
  principalCharge = min(totalMonthlyPayment - interestCharge, loanBalance)
  loanBalance = max(0, loanBalance - principalCharge)
  escrowCharge = escrowMonthly

Aggregate per year: sum principalPaid, interestPaid, escrowPaid; record closingBalance.
```

Net equity for year `y` = `assetValue(y) - loanBalance(y)`, floored at 0.

Total monthly cash outflow added to `outflows` for net worth: `monthlyPayment + escrowMonthly + extraMonthlyPayment` × 12.

### 401(k) Balance

```
For year y:
  yearsActive = y - item.startYear

  if withdrawalStartYear is set and y >= withdrawalStartYear:
    // withdrawal phase — same as regular withdrawal formula
    balance(y) = max(0, (balance(y-1) - annualWithdraw) * (1 + rate/100))
  else:
    // contribution phase
    employerMatch = vestingYears > 0 && yearsActive < vestingYears
                    ? 0
                    : min(employeeContribution, annualSalary * matchCapPct/100)
                      * matchPct/100
    balance(y) = (balance(y-1) + employeeContribution + employerMatch) * (1 + rate/100)
```

### Tax Calculation (per projection year)

```
inflationFactor = (1 + bracketInflationRate/100) ^ (year - 2025)   // 1.0 for year <= 2025

inflatedBrackets = brackets.map(b => { ...b, upTo: round(b.upTo * inflationFactor) })
inflatedStdDeduction = round(standardDeduction * inflationFactor)
inflatedSSThresholds = { low: round(low * inflationFactor), high: round(high * inflationFactor) }

// Ordinary income sources
ordinaryIncome = traditional401kWithdrawals + bankInterest + taxableSocialSecurity

// Social Security taxable portion
if year >= socialSecurityStartYear:
  provisionalIncome = ordinaryIncome + 0.5 * annualSSBenefit
  if provisionalIncome < inflatedSSThresholds.low:   taxableSS = 0
  elif provisionalIncome < inflatedSSThresholds.high: taxableSS = 0.5 * annualSSBenefit
  else:                                               taxableSS = 0.85 * annualSSBenefit
  ordinaryIncome += taxableSS

taxableOrdinaryIncome = max(0, ordinaryIncome - inflatedStdDeduction)
ordinaryTax = applyMarginalBrackets(taxableOrdinaryIncome, inflatedBrackets)

// LTCG — stacked on top of ordinary income for bracket determination
ltcgRate = determineLTCGRate(taxableOrdinaryIncome + ltcgIncome, inflatedLTCGBrackets)
ltcgTax = ltcgIncome * ltcgRate

totalEstimatedTax = ordinaryTax + ltcgTax
```

Bank interest is estimated as `balance(y) * rate/100` for bank items with `rate > 0`.

LTCG income = annual withdrawal amount for Investment items with subcategory `Stocks` or `ETFs`.

---

## UI Components

### Modal Field Groups (new)

The item modal gains four collapsible/conditional field groups rendered by `ModalController`:

1. **Contribution group** — shown for `bank` and `investments` types:
   - Contribution Amount (number input)
   - Contribution Frequency (select: monthly / annual)

2. **Withdrawal group** — shown for all asset types:
   - Withdrawal Amount (number input)
   - Withdrawal Frequency (select: monthly / annual)

3. **Loan group** — shown for `property` and `vehicles` types:
   - Loan Amount, Annual Interest Rate (%), Monthly Payment, Escrow (monthly), Property Tax (annual), Extra Monthly Payment

4. **401(k) group** — shown when category is `Traditional 401(k)` or `Roth 401(k)`:
   - Annual Employee Contribution, Employer Match %, Employer Match Cap (% of salary), Annual Salary, Vesting Years, Withdrawal Start Year

5. **Open-ended toggle** — shown for all item types:
   - "No end date" checkbox; when checked, disables and clears End Year input

### Item Row Display (extended)

- Contribution configured: append `+$X/mo contribution` or `+$X/yr contribution` to meta line
- Withdrawal configured: append `−$X/mo withdrawal` or `−$X/yr withdrawal` to meta line
- Loan configured: show `Loan: $X balance · Equity: $Y` and a "Loan Details" toggle that expands an amortisation table
- 401(k) configured: show `Employee: $X/yr · Match: $Y/yr` on meta line
- Open-ended: display `startYear – ongoing` instead of `startYear – endYear`

### Dashboard Additions

- **Tax Estimate chart line**: dashed dataset in `updateChart()` showing `tax.totalEstimatedTax` per year
- **Tax Breakdown panel**: collapsible card rendered by `renderTaxBreakdown()` showing start-year tax detail

### Settings Panel Addition

New "Tax Settings" section with inputs for: Filing Status, Birth Year, Annual Social Security Benefit, Social Security Start Year, Bracket Inflation Rate (%).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Contribution Balance Formula

*For any* bank or investment item with a contribution amount (monthly or annual) and any growth rate, the balance at year `y` must equal `(balance(y-1) + annualContribution) × (1 + rate/100)`, where `annualContribution` is `contributionAmount × 12` for monthly or `contributionAmount` for annual, and `balance(startYear - 1)` equals the item's initial amount. When no contribution is configured, the formula must reduce to the existing compound growth formula.

**Validates: Requirements 1.2, 1.3, 1.5, 5.1**

---

### Property 2: Withdrawal Clamps at Zero

*For any* asset item with a withdrawal configured (monthly or annual), if the withdrawal amount is large enough to exhaust the balance in a given year, the projected balance must be exactly zero for that year and all subsequent years — never negative. The annual withdrawal is `withdrawalAmount × 12` for monthly or `withdrawalAmount` for annual.

**Validates: Requirements 2.2, 2.3, 2.4, 5.4**

---

### Property 3: Loan Amortisation Correctness

*For any* loan configuration with a monthly payment greater than the first month's interest charge, the loan balance must be non-increasing year over year, must never go below zero, and for every year where the loan balance is positive at the start of the year, the sum of principal paid and interest paid must equal the total scheduled payment for that year (12 × (monthlyPayment + extraMonthlyPayment), adjusted for early payoff in the final year).

**Validates: Requirements 3.3, 3.4, 3.5, 3.10, 4.1, 4.2**

---

### Property 4: Net Equity Formula

*For any* property or vehicle item with a loan, the net equity for each projection year must equal `assetValue(year) − loanBalance(year)`, and the Calculator must use this net equity value (not the raw asset value) when computing net worth.

**Validates: Requirements 3.6, 3.7, 5.2**

---

### Property 5: Escrow and Property Tax Do Not Reduce Loan Balance

*For any* loan configuration, adding or changing the escrow monthly amount or annual property tax must not change the loan balance trajectory (the closing balance for each year must be identical with or without escrow/property tax). Escrow and property tax must only appear as cash outflows.

**Validates: Requirements 4.4, 4.5**

---

### Property 6: Open-Ended Item Active Through Projection End

*For any* item with `endYear: null` and any projection settings, the Calculator must treat the item as active for every year from `startYear` through `settings.startYear + settings.projectionYears - 1`, returning a non-zero value (assuming non-zero initial amount), and must return zero for all years before `startYear`. When the projection period changes, the active range must automatically adjust.

**Validates: Requirements 10.4, 10.5, 10.7, 6.7**

---

### Property 7: 401(k) Employer Match Respects Vesting

*For any* 401(k) item with `vestingYears > 0` and a positive employer match percentage, the balance in years before vesting (where `year - startYear < vestingYears`) must equal the balance computed with employee contributions only (no employer match). In years at or after vesting, the balance must include the employer match contribution.

**Validates: Requirements 9.5**

---

### Property 8: Tax Bracket Inflation Formula

*For any* projection year `y > 2025` and any bracket inflation rate `r > 0`, every inflated bracket threshold and the standard deduction must equal `round(seedValue × (1 + r/100) ^ (y - 2025))`. The inflated values must be strictly greater than the 2025 seed values.

**Validates: Requirements 11.5**

---

### Property 9: Tax Deducted from Net Worth

*For any* projection year where `totalEstimatedTax > 0`, the reported net worth must equal the gross net worth (sum of all asset values + inflows − outflows, before tax) minus `totalEstimatedTax`.

**Validates: Requirements 11.13**

---

### Property 10: Extended Excel Round-Trip

*For any* valid item list containing items with contributions, withdrawals, loans, 401(k) configurations, and open-ended items (`endYear: null`), exporting to `.xlsx` and re-importing must produce an item list deeply equal to the original, including all new fields.

**Validates: Requirements 7.1, 7.2, 7.3, 9.11, 9.12, 10.8**

---

### Property 11: Backward-Compatible Import

*For any* `.xlsx` workbook exported before this feature was added (i.e., the new columns are absent), importing must succeed, all original fields must be correctly populated, and all new fields (contribution, withdrawal, loan, 401k, endYear) must be `null` on the resulting items.

**Validates: Requirements 7.4**

---

## Error Handling

### New Validation Rules (modal)

| Field | Rule |
|---|---|
| Contribution Amount | Finite, non-negative number when provided |
| Withdrawal Amount | Finite, non-negative number when provided |
| Loan Amount | Finite, non-negative; requires Monthly Payment |
| Loan Monthly Payment | Required when Loan Amount is provided; finite, non-negative |
| Loan Annual Interest Rate | Finite, non-negative |
| Employee Contribution | Finite, non-negative |
| Employer Match %, Cap % | Finite, non-negative |
| Annual Salary | Finite, non-negative |
| Vesting Years | Integer ≥ 0 |
| End Year | Not required when "No end date" is checked |

All validation failures show an inline Bootstrap alert inside the modal; the item is not saved.

### Loan Payoff

When the loan balance reaches zero mid-year, the Calculator stops applying payments for that item. No negative balance is ever stored.

### Tax Settings

If `bracketInflationRate` is missing or non-numeric, default to 2.5. If `socialSecurityStartYear` is null, Social Security income is never included.

### Open-Ended Items and Projection Period Changes

When `projectionYears` or `startYear` changes, open-ended items automatically extend or contract — no special error handling needed; the Calculator reads the current projection end year on each call.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required and complementary:

- Unit tests: specific examples, edge cases, integration points
- Property tests: universal correctness across generated inputs (minimum 100 iterations each)

### Unit Tests (additions to existing test files)

- `calculator.test.js`: specific amortisation example (known P+I split), 401(k) with vesting, tax calculation for a known income scenario, open-ended item active through projection end
- `serializer.test.js`: round-trip with all new fields, backward-compatible import of old workbook
- `state.test.js`: save/load of item with `endYear: null`, save/load of tax settings

### Property-Based Tests

Use **fast-check** (already in the project). Each test runs minimum 100 iterations and is tagged:
`// Feature: recurring-contributions-and-loan-modeling, Property N: <property_text>`

| Property | Test Description |
|---|---|
| P1 | Generate bank/investment items with random contribution amount, frequency, and rate; verify balance(y) = (balance(y-1) + annualContribution) × (1 + rate/100) for each year |
| P2 | Generate asset items with withdrawal large enough to exhaust balance; verify balance clamps to 0 and stays 0 for all subsequent years |
| P3 | Generate random valid loan configs; verify balance is non-increasing, ≥ 0, and principal + interest = scheduled payment for each year with positive balance |
| P4 | Generate property/vehicle items with loans; verify net equity = assetValue − loanBalance and that net worth uses net equity |
| P5 | Generate loan configs with and without escrow/property tax; verify loan balance trajectory is identical regardless of escrow/property tax values |
| P6 | Generate items with endYear: null and random projection settings; verify active through projection end, zero before startYear, and auto-adjusts when projection period changes |
| P7 | Generate 401(k) items with vestingYears > 0; verify employer match not applied before vesting year, applied after |
| P8 | Generate random years > 2025 and inflation rates > 0; verify inflated bracket thresholds = round(seed × (1 + r/100)^(y-2025)) |
| P9 | Generate item lists with taxable income; verify netWorth = grossNetWorth − totalEstimatedTax |
| P10 | Generate item lists with all new fields (contributions, withdrawals, loans, 401k, endYear: null); export then import; verify deep equality |
| P11 | Generate old-format workbooks (no new columns); verify import succeeds with null new fields |

### Test File Structure

```
tests/
├── calculator.test.js   — P1, P2, P3, P4, P5, P6, P7, P8, P9 + unit examples
├── serializer.test.js   — P10, P11 + unit examples
├── state.test.js        — endYear: null persistence, tax settings persistence
├── renderer.test.js     — existing + tax breakdown panel rendering, item row display
└── setup.js             — existing localStorage mock + fast-check config
```

Run with: `npx vitest --run`
