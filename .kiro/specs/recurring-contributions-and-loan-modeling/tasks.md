# Implementation Plan: Recurring Contributions, Loan Modeling, 401(k), and US Tax

## Overview

Extend the existing Retirement Cash Flow Planner (`script.js`, `index.html`, `styles.css`, `tests/`) with recurring contributions/withdrawals, loan amortisation, 401(k) modeling, open-ended items, and US federal tax estimation. All changes build on the existing unidirectional data flow and module structure. Tasks are ordered so each step builds on the previous, with property tests placed close to the implementation they validate.

## Tasks

- [ ] 1. Extend data model constants and state module
  - [x] 1.1 Update `DEFAULT_SETTINGS`, `SUBCATEGORIES`, constants, and state persistence in `script.js`
    - Add `tax` sub-object to `DEFAULT_SETTINGS` with `filingStatus`, `birthYear`, `annualSocialSecurityBenefit`, `socialSecurityStartYear`, `bracketInflationRate`
    - Add `'Traditional 401(k)'` and `'Roth 401(k)'` to `SUBCATEGORIES.investments`
    - Add `TAX_BRACKETS_2025` constant with single and married_filing_jointly ordinary/ltcg brackets, standard deductions, and SS thresholds
    - Update `loadState()` to merge tax settings with defaults on load (handle missing/corrupt tax fields)
    - Update `saveSettings()` to persist tax settings
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 9.1, 11.1, 11.4, 11.6, 11.18_
  - [x] 1.2 Write unit tests for state persistence of new fields in `tests/state.test.js`
    - Test save/load of item with `endYear: null`
    - Test save/load of item with contribution, withdrawal, loan, and retirement401k fields
    - Test save/load of tax settings
    - _Requirements: 6.4, 6.5, 6.7, 11.3, 11.18_

- [ ] 2. Implement balance-based projection with contributions and withdrawals
  - [x] 2.1 Implement `calcItemBalance(item, year, balanceCache)` in `script.js`
    - Seed `balanceCache[item.id][startYear - 1] = item.amount`
    - For each year: `balance(y) = max(0, (balance(y-1) + annualContrib - annualWithdraw) * (1 + rate/100))`
    - Annual contribution = `contributionAmount * 12` (monthly) or `contributionAmount` (annual), default 0
    - Annual withdrawal = `withdrawalAmount * 12` (monthly) or `withdrawalAmount` (annual), default 0
    - Return 0 for years before `startYear` or after effective end year
    - When no contribution/withdrawal configured, reduce to existing compound growth formula
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 5.1, 5.4_
  - [ ]* 2.2 Write property test for contribution balance formula (Property 1)
    - **Property 1: Contribution Balance Formula**
    - **Validates: Requirements 1.2, 1.3, 1.5, 5.1**
    - File: `tests/calculator.test.js`
  - [ ]* 2.3 Write property test for withdrawal clamps at zero (Property 2)
    - **Property 2: Withdrawal Clamps at Zero**
    - **Validates: Requirements 2.2, 2.3, 2.4, 5.4**
    - File: `tests/calculator.test.js`

- [ ] 3. Implement loan amortisation
  - [x] 3.1 Implement `calcLoanSchedule(loanConfig, itemStartYear, projectionEndYear)` in `script.js`
    - Monthly simulation: `interestCharge = balance * monthlyRate`, `principalCharge = min(totalPayment - interestCharge, balance)`, `balance = max(0, balance - principalCharge)`
    - Aggregate per year: sum principalPaid, interestPaid, escrowPaid; record closingBalance
    - Stop payments when balance reaches zero
    - Escrow and property tax tracked as cash outflows only, never reduce loan balance
    - Return array of `AmortYear` objects
    - _Requirements: 3.3, 3.4, 3.5, 3.10, 4.1, 4.2, 4.4, 4.5_
  - [ ]* 3.2 Write property test for loan amortisation correctness (Property 3)
    - **Property 3: Loan Amortisation Correctness**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.10, 4.1, 4.2**
    - File: `tests/calculator.test.js`
  - [ ]* 3.3 Write property test for escrow does not reduce loan balance (Property 5)
    - **Property 5: Escrow and Property Tax Do Not Reduce Loan Balance**
    - **Validates: Requirements 4.4, 4.5**
    - File: `tests/calculator.test.js`

- [ ] 4. Implement net equity and open-ended items in projection
  - [~] 4.1 Update `calcProjection(items, settings)` in `script.js`
    - Maintain `balanceCache` map keyed by item id across years
    - For bank/investment items: use `calcItemBalance()` instead of `calcItemValue()`
    - For property/vehicle items with loan: compute net equity = `assetValue - loanBalance`, use net equity in net worth
    - For property/vehicle items without loan: use existing compound growth formula
    - For items with `endYear: null`: treat as active through `settings.startYear + settings.projectionYears - 1`
    - Add loan cash outflows (monthlyPayment + escrowMonthly + extraMonthlyPayment) × 12 to outflows
    - Add `traditional401k` and `roth401k` to `byType` breakdown
    - _Requirements: 3.6, 3.7, 5.1, 5.2, 5.3, 5.5, 10.4, 10.5, 10.7_
  - [ ]* 4.2 Write property test for net equity formula (Property 4)
    - **Property 4: Net Equity Formula**
    - **Validates: Requirements 3.6, 3.7, 5.2**
    - File: `tests/calculator.test.js`
  - [ ]* 4.3 Write property test for open-ended item active through projection end (Property 6)
    - **Property 6: Open-Ended Item Active Through Projection End**
    - **Validates: Requirements 10.4, 10.5, 10.7, 6.7**
    - File: `tests/calculator.test.js`

- [ ] 5. Checkpoint — contributions, withdrawals, loans, and open-ended projection tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement 401(k) balance calculation
  - [~] 6.1 Implement `calc401kBalance(item, year, balanceCache)` in `script.js`
    - Contribution phase: `balance(y) = (balance(y-1) + employeeContribution + employerMatch) * (1 + rate/100)`
    - Employer match = `min(employeeContribution, salary * matchCapPct/100) * matchPct/100`
    - Vesting: employer match = 0 when `year - startYear < vestingYears`
    - Withdrawal phase (when `year >= withdrawalStartYear`): `balance(y) = max(0, (balance(y-1) - annualWithdraw) * (1 + rate/100))`
    - Wire into `calcProjection` for items with category `Traditional 401(k)` or `Roth 401(k)`
    - _Requirements: 9.3, 9.4, 9.5, 9.6_
  - [ ]* 6.2 Write property test for 401(k) employer match respects vesting (Property 7)
    - **Property 7: 401(k) Employer Match Respects Vesting**
    - **Validates: Requirements 9.5**
    - File: `tests/calculator.test.js`

- [ ] 7. Implement US federal tax calculation
  - [~] 7.1 Implement `calcTax(taxInputs, settings)` in `script.js`
    - Inflate brackets and standard deduction by `(1 + bracketInflationRate/100) ^ (year - 2025)`
    - Compute ordinary income: Traditional 401(k) withdrawals + bank interest + taxable Social Security
    - Compute Social Security taxable portion using provisional income and inflation-adjusted thresholds
    - Apply marginal brackets to `taxableOrdinaryIncome = max(0, ordinaryIncome - inflatedStdDeduction)`
    - Compute LTCG tax: determine rate by stacking LTCG on top of ordinary income
    - Return `TaxResult` object with all breakdown fields
    - Exclude Roth 401(k) withdrawals from taxable income
    - _Requirements: 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.14_
  - [~] 7.2 Wire `calcTax` into `calcProjection` to deduct tax from net worth each year
    - Add `tax: TaxResult` to each `ProjectionYear`
    - Net worth = gross net worth - totalEstimatedTax
    - _Requirements: 11.13, 11.14_
  - [~] 7.3 Write unit tests for tax calculation in `tests/calculator.test.js`
    - Test known income scenario with expected tax output
    - Test bracket inflation for a future year
    - Test Social Security taxable portion at each threshold
    - Test Roth 401(k) withdrawals excluded from taxable income
    - _Requirements: 11.5, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_
  - [ ]* 7.4 Write property test for tax bracket inflation formula (Property 8)
    - **Property 8: Tax Bracket Inflation Formula**
    - **Validates: Requirements 11.5**
    - File: `tests/calculator.test.js`
  - [ ]* 7.5 Write property test for tax deducted from net worth (Property 9)
    - **Property 9: Tax Deducted from Net Worth**
    - **Validates: Requirements 11.13**
    - File: `tests/calculator.test.js`

- [ ] 8. Checkpoint — 401(k) and tax calculation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Extend serializer for new fields
  - [~] 9.1 Update `exportToXlsx(items)` and `importFromXlsx(file)` in `script.js`
    - Add columns for all new fields: `contributionAmount`, `contributionFrequency`, `withdrawalAmount`, `withdrawalFrequency`, `loanAmount`, `loanAnnualInterestRate`, `loanMonthlyPayment`, `loanEscrowMonthly`, `loanPropertyTaxAnnual`, `loanExtraMonthlyPayment`, `employeeContribution`, `employerMatchPct`, `employerMatchCapPct`, `annualSalary`, `vestingYears`, `withdrawalStartYear`
    - Handle `endYear: null` as empty cell on export, empty cell as `null` on import
    - Flatten `loan` and `retirement401k` sub-objects to/from flat columns
    - Treat missing columns in old workbooks as null (backward compatibility)
    - _Requirements: 7.1, 7.2, 7.4, 9.11, 9.12, 10.8_
  - [ ]* 9.2 Write property test for extended Excel round-trip (Property 10)
    - **Property 10: Extended Excel Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.3, 9.11, 9.12, 10.8**
    - File: `tests/serializer.test.js`
  - [ ]* 9.3 Write property test for backward-compatible import (Property 11)
    - **Property 11: Backward-Compatible Import**
    - **Validates: Requirements 7.4**
    - File: `tests/serializer.test.js`

- [ ] 10. Checkpoint — serializer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update modal controller for new field groups
  - [~] 11.1 Add contribution, withdrawal, loan, 401(k), and open-ended field groups to the item modal in `index.html` and `script.js`
    - Contribution group (shown for bank, investments): Contribution Amount, Contribution Frequency select (monthly/annual)
    - Withdrawal group (shown for all asset types): Withdrawal Amount, Withdrawal Frequency select (monthly/annual)
    - Loan group (shown for property, vehicles): Loan Amount, Annual Interest Rate, Monthly Payment, Escrow Monthly, Property Tax Annual, Extra Monthly Payment
    - 401(k) group (shown when category is Traditional 401(k) or Roth 401(k)): Employee Contribution, Employer Match %, Match Cap %, Annual Salary, Vesting Years, Withdrawal Start Year
    - Open-ended toggle (all types): "No end date" checkbox that disables/clears End Year input
    - Show/hide field groups dynamically based on item type and category selection
    - _Requirements: 1.1, 2.1, 3.1, 9.2, 10.1, 10.2_
  - [~] 11.2 Update `openAddModal()` and `openEditModal()` to populate/clear new fields
    - Pre-fill new fields from item data on edit
    - Clear new fields on add
    - Handle `endYear: null` ↔ "No end date" checkbox state
    - _Requirements: 1.1, 2.1, 3.1, 9.2, 10.1, 10.2, 10.3_
  - [~] 11.3 Update `_handleSaveItem()` to read, validate, and save new fields
    - Read contribution, withdrawal, loan, 401(k) fields from modal
    - Validate: contribution/withdrawal amounts finite non-negative; loan amount requires monthly payment; loan fields finite non-negative; 401(k) fields finite non-negative; vesting years integer ≥ 0
    - Build `loan` and `retirement401k` sub-objects (or null if not configured)
    - Set `endYear: null` when "No end date" is checked; skip endYear validation in that case
    - _Requirements: 1.6, 2.6, 3.2, 3.9, 9.9, 10.2, 10.3_

- [ ] 12. Update item row display and dashboard
  - [~] 12.1 Update `renderItemList()` in `script.js` for new item metadata
    - Contribution configured: append `+$X/mo contribution` or `+$X/yr contribution` to meta line
    - Withdrawal configured: append `−$X/mo withdrawal` or `−$X/yr withdrawal` to meta line
    - Loan configured: show `Loan: $X balance · Equity: $Y` on meta line
    - 401(k) configured: show `Employee: $X/yr · Match: $Y/yr` on meta line
    - Open-ended: display `startYear – ongoing` instead of `startYear – endYear`
    - Add expandable "Loan Details" section showing year-by-year amortisation table
    - _Requirements: 1.7, 2.7, 3.8, 4.3, 8.1, 8.2, 8.3, 8.4, 8.5, 9.10, 10.6_
  - [~] 12.2 Update `updateChart()` to add tax estimate dashed line dataset
    - Add dashed dataset for `tax.totalEstimatedTax` per year
    - Add `traditional401k` and `roth401k` per-type dashed lines when items exist
    - _Requirements: 11.15_
  - [~] 12.3 Implement `renderTaxBreakdown(projectionYear, settings)` in `script.js`
    - Collapsible card on dashboard showing start-year tax detail: Filing Status, Ordinary Income, LTCG Income, Taxable Social Security, Standard Deduction, Taxable Ordinary Income, Ordinary Tax, LTCG Tax, Total Estimated Tax
    - All values formatted with `formatMoney()`
    - Include disclaimer note that estimates are approximations for planning purposes only
    - Wire into `render()` to display on dashboard
    - _Requirements: 11.14, 11.15, 11.16, 11.17_
  - [~] 12.4 Update `calcStats()` to include loan cash outflows and 401(k) contributions in stats
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 13. Add tax settings UI to settings panel
  - [~] 13.1 Add tax settings inputs to `index.html` and wire event handlers in `script.js`
    - Filing Status select (Single / Married Filing Jointly)
    - Birth Year number input
    - Annual Social Security Benefit number input
    - Social Security Start Year number input
    - Bracket Inflation Rate number input (default 2.5%)
    - On change: update `settings.tax`, call `saveSettings()`, call `render()`
    - Populate inputs from loaded settings on DOMContentLoaded
    - _Requirements: 11.1, 11.2, 11.3, 11.18_

- [ ] 14. Update `index.html` and `styles.css` for new UI elements
  - [~] 14.1 Add HTML structure for new modal field groups, tax breakdown panel, and tax settings section
    - Add contribution/withdrawal/loan/401(k)/open-ended field groups inside the existing modal form
    - Add collapsible tax breakdown card to dashboard area
    - Add tax settings section to settings panel
    - _Requirements: 1.1, 2.1, 3.1, 9.2, 10.1, 11.1, 11.16_
  - [~] 14.2 Add CSS styles for new components in `styles.css`
    - Style loan details expandable section
    - Style tax breakdown panel
    - Style conditional field group visibility
    - _Requirements: 8.5, 11.16_

- [ ] 15. Final checkpoint — all tests pass, app fully wired
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations each
- Run tests with: `npx vitest --run`
- All code goes into the existing files: `script.js`, `index.html`, `styles.css`, and `tests/`
- The existing `calcItemValue()` function is preserved for backward compatibility; new balance-based items use `calcItemBalance()` instead
