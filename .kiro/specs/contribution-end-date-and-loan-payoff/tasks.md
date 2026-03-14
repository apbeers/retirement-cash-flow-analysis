# Implementation Plan: Contribution End Date and Loan Payoff

## Overview

Incrementally add the optional `contributionEndYear` field to the data model, calculator, modal, renderer, and serializer, then add the `getLoanPayoffYear` helper and loan payoff display. Each task builds on the previous one, with property-based and unit tests wired in close to the implementation they validate.

## Tasks

- [x] 1. Add `contributionEndYear` support to `calcItemBalance` in `calculator.js`
  - [x] 1.1 Update `calcItemBalance` to skip contributions when `y > item.contributionEndYear`
    - Inside the yearly loop, wrap the annual contribution computation with a guard: only add contributions when `item.contributionEndYear == null || y <= item.contributionEndYear`
    - When `y > contributionEndYear`, set `annualContrib = 0` so the balance grows only via rate
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 1.2 Add unit tests for `contributionEndYear` in `calcItemBalance`
    - Add tests to `tests/calcItemBalance.test.js`:
      - Item with `contributionEndYear` stops contributions after that year
      - Item with `contributionEndYear: null` matches existing behavior (backward compat)
      - Item with `contributionEndYear === startYear` gets exactly one year of contributions
    - _Requirements: 2.3, 2.6_
  - [ ]* 1.3 Write property test for contribution cutoff in `calcItemBalance` (P1)
    - **Property 1: Contribution Cutoff in calcItemBalance**
    - For any bank/investment item with non-null `contributionEndYear` and 0% rate, balance at any year `y > contributionEndYear` equals balance at `contributionEndYear`
    - Add to `tests/calculator.test.js`
    - **Validates: Requirements 2.1, 2.2, 2.4**
  - [ ]* 1.4 Write property test for contribution cutoff boundary equivalence (P2)
    - **Property 2: Contribution Cutoff Boundary Equivalence**
    - For any item with contributions and a `contributionEndYear`, balances at years `y ≤ contributionEndYear` are identical to an equivalent item with `contributionEndYear: null`
    - Add to `tests/calculator.test.js`
    - **Validates: Requirements 2.3, 2.6**

- [x] 2. Add `contributionEndYear` support to `calc401kBalance` in `calculator.js`
  - [x] 2.1 Update `calc401kBalance` to stop employee contributions and employer match after `contributionEndYear`
    - In the contribution branch (before withdrawal start year), check `item.contributionEndYear == null || y <= item.contributionEndYear`
    - When contributions are inactive, set both `effectiveEmployeeContribution` and `employerMatch` to 0
    - _Requirements: 2.5_
  - [ ]* 2.2 Write property test for 401(k) contribution cutoff (P3)
    - **Property 3: 401(k) Contribution Cutoff**
    - For any 401(k) item with non-null `contributionEndYear` and 0% rate (before withdrawal start), balance at any year `y > contributionEndYear` equals balance at `contributionEndYear`
    - Add to `tests/calculator.test.js`
    - **Validates: Requirements 2.5**

- [x] 3. Add `getLoanPayoffYear` function to `calculator.js`
  - [x] 3.1 Implement `getLoanPayoffYear(schedule)` pure function
    - Iterate schedule entries, return the `year` of the first entry with `closingBalance <= 0`, or `null` if none found
    - Export from `calculator.js`
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 3.2 Export `getLoanPayoffYear` from `script.js` barrel
    - Add `getLoanPayoffYear` to the calculator export line in `script.js`
    - _Requirements: 5.1_
  - [x] 3.3 Add unit tests for `getLoanPayoffYear`
    - Add tests to `tests/calcLoanSchedule.test.js`:
      - Returns correct payoff year for a loan that pays off within projection
      - Returns `null` for a loan that never pays off within projection
      - Returns `startYear` when loan amount is 0 (first entry already has closingBalance = 0)
    - _Requirements: 5.2, 5.3, 5.4_
  - [ ]* 3.4 Write property test for loan payoff year correctness (P4)
    - **Property 4: Loan Payoff Year Correctness**
    - For any loan config and projection period, `getLoanPayoffYear(schedule)` returns the year of the first entry with `closingBalance <= 0`, or `null` if none exists. If result is a year, all prior entries have `closingBalance > 0`.
    - Add to `tests/calculator.test.js`
    - **Validates: Requirements 5.2, 5.3**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add Contribution End Year input to modal UI
  - [x] 5.1 Add `field-contributionEndYear` input to `index.html`
    - Add a new `<div class="col-6">` inside `#contributionGroup .row` with a numeric input for "Contribution End Year"
    - _Requirements: 1.2_
  - [x] 5.2 Update `modalController.js` to handle `contributionEndYear`
    - Add `'field-contributionEndYear'` to `_clearNewFields()` cleared IDs list
    - In `openEditModal()`, populate the field from `item.contributionEndYear`
    - In `_handleSaveItem()`, read the field value, validate (if non-empty, must be ≥ startYear), and include `contributionEndYear` in the saved item object (both add and edit paths)
    - Show validation error "Contribution End Year must be ≥ Start Year." if value < startYear
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Update renderer to show contribution end year and loan payoff year
  - [x] 6.1 Update `renderItemList()` in `renderer.js` to show "until [year]" on contribution meta line
    - When `item.contributionEndYear` is non-null, append ` (until ${item.contributionEndYear})` to the contribution detail div
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 Update `renderItemList()` in `renderer.js` to show loan payoff year
    - Import `getLoanPayoffYear` from `calculator.js`
    - After the existing loan balance/equity line, compute `getLoanPayoffYear(sch)` and append a new detail div:
      - If payoff year found: `Paid off: [year]`
      - If null: `Paid off: beyond [lastProjectionYear]`
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 6.3 Add unit tests for renderer contribution end year and loan payoff display
    - Add tests to `tests/renderer.test.js` verifying:
      - Item with `contributionEndYear` renders "until [year]" text
      - Item without `contributionEndYear` does not render "until" text
      - Property item with loan shows "Paid off: [year]"
      - Property item with loan beyond projection shows "Paid off: beyond [year]"
    - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [x] 7. Update serializer for `contributionEndYear` Excel round-trip
  - [x] 7.1 Update `exportToXlsx` and `importFromXlsx` in `serializer.js`
    - Add `'contributionEndYear'` to the `headers` array in `exportToXlsx`
    - Add `item.contributionEndYear != null ? item.contributionEndYear : ''` to the row mapping
    - In `importFromXlsx`, read `row.contributionEndYear` via `numOrNull` and include in the item object
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 7.2 Add unit test for import with missing `contributionEndYear` column
    - Verify that importing a legacy file without the column sets `contributionEndYear` to `null`
    - Add to `tests/serializer.test.js`
    - _Requirements: 4.3_
  - [ ]* 7.3 Write property test for `contributionEndYear` Excel round-trip (P5)
    - **Property 5: ContributionEndYear Excel Round-Trip**
    - Extend existing `fullItemArb` with `contributionEndYear` field, verify export → import preserves the value
    - Add to `tests/serializer.test.js`
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 8. Rebuild bundle and final checkpoint
  - [x] 8.1 Update `build.js` if needed and rebuild `app.bundle.js`
    - Run `node build.js` to regenerate the bundle with all changes
    - Verify no build errors
    - _Requirements: 1.1, 5.1_
  - [x] 8.2 Final checkpoint — Ensure all tests pass
    - Run `npx vitest --run` and verify all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
