# Requirements Document

## Introduction

This feature extends the Retirement Cash Flow Planner with seven related capabilities:

1. **Recurring Contributions** — users can attach a recurring monthly or annual contribution to a Bank Account or Investment item, so that the account balance grows not only from compound interest but also from regular deposits.
2. **Recurring Withdrawals** — users can schedule recurring monthly or annual withdrawals from any asset account, modelling systematic drawdown in retirement.
3. **Loan / Mortgage Modeling** — Property and Vehicle items can carry a loan with a principal balance, interest rate, escrow, property taxes, and optional extra payments. The Calculator tracks the amortisation schedule year by year, splitting each payment into principal and interest, and the item's net equity (asset value minus outstanding loan balance) is used in net worth calculations.
4. **Recurring Payments Against Assets** — any asset item that has an associated loan can record a recurring monthly payment that reduces the outstanding loan balance and increases net equity over time.
5. **401(k) and Roth Account Modeling** — users can model Traditional 401(k) and Roth 401(k) accounts with employee contributions, employer match, vesting, and tax-aware withdrawals in retirement.
6. **Open-Ended Items** — users can mark any item as having no end date, so that it remains active for the entire projection period without requiring an explicit End Year.
7. **US Tax Modeling** — the Planner estimates annual federal income tax across four taxable sources (Traditional 401(k) withdrawals, long-term capital gains from stock sales, bank account interest, and Social Security income), applies inflation-adjusted 2025 brackets, deducts the estimated tax from projected net worth, and displays a year-by-year tax breakdown.

## Glossary

- **Planner**: The Retirement Cash Flow Planner application as a whole.
- **Item**: A single financial entry as defined in the base requirements.
- **Asset Item**: An Item of type Bank Account, Investment, Property, Vehicle, Rental, Traditional 401(k), or Roth 401(k).
- **Contribution**: A recurring deposit added to an Asset Item's balance each period.
- **Withdrawal**: A recurring drawdown subtracted from an Asset Item's balance each period.
- **Loan**: A liability attached to a Property or Vehicle Item, defined by a principal balance, annual interest rate, and monthly payment.
- **Loan_Balance**: The outstanding principal remaining on a Loan at a given point in time.
- **Amortisation**: The process of paying off a Loan through scheduled payments that cover both interest and principal.
- **Net_Equity**: The value of an Asset Item minus its associated Loan_Balance. Used in net worth calculations when a Loan is present.
- **Escrow**: A monthly amount collected alongside the mortgage payment to cover property taxes and insurance.
- **Extra_Payment**: An additional principal-only payment made each month on top of the scheduled mortgage payment.
- **Periodic_Amount**: A monetary amount expressed per month or per year, attached to an Item.
- **Contribution_Frequency**: The period of a Contribution or Withdrawal — either `monthly` or `annual`.
- **Traditional_401k**: A tax-deferred retirement account where contributions reduce taxable income and withdrawals are taxed as ordinary income.
- **Roth_401k**: A retirement account where contributions are made with after-tax dollars and qualified withdrawals are tax-free.
- **Employee_Contribution**: The amount the account holder contributes to a 401(k) each year, subject to IRS annual limits.
- **Employer_Match**: The amount an employer contributes to a 401(k) on behalf of the employee, typically expressed as a percentage of the employee contribution up to a salary percentage cap.
- **Vesting_Schedule**: The timeline over which employer match contributions become fully owned by the employee.
- **RMD**: Required Minimum Distribution — the IRS-mandated minimum annual withdrawal from a Traditional 401(k) starting at age 72.
- **Open_Ended_Item**: An Item with no explicit End Year that remains active for the full projection period.
- **Filing_Status**: The user's US federal tax filing status — either `single` or `married_filing_jointly`.
- **Ordinary_Income**: Income taxed at standard US federal marginal rates — includes Traditional 401(k) withdrawals, bank account interest, and the taxable portion of Social Security.
- **LTCG**: Long-Term Capital Gains — profits from selling assets held longer than one year, taxed at preferential US federal rates (0%, 15%, or 20% depending on income).
- **Taxable_Income**: Total income subject to tax after the standard deduction is applied.
- **Standard_Deduction**: The IRS flat deduction subtracted from gross income before applying tax brackets (varies by filing status and is inflation-adjusted each year).
- **Bracket_Inflation_Rate**: The annual percentage rate used to inflate tax bracket thresholds and the standard deduction each year of the projection. Configurable in Settings; defaults to 2.5%.
- **Provisional_Income**: The IRS formula used to determine what portion of Social Security benefits is taxable: `AGI + non-taxable interest + 50% of Social Security benefits`.
- **Calculator**: The module that computes year-by-year projections.
- **Serializer**: The component responsible for converting Item data to and from Excel Workbook format.
- **Pretty_Printer**: The component responsible for formatting monetary values into human-readable strings.

---

## Requirements

### Requirement 1: Recurring Contributions to Asset Accounts

**User Story:** As a retirement planner, I want to attach a recurring contribution to a Bank Account or Investment item, so that my projection reflects regular deposits I make each month or year.

#### Acceptance Criteria

1. WHEN a user opens the Add or Edit modal for a Bank Account or Investment item, THE Planner SHALL display optional fields for Contribution Amount and Contribution Frequency (`monthly` or `annual`).
2. WHEN a Contribution Amount is provided and Contribution Frequency is `monthly`, THE Calculator SHALL add `contributionAmount × 12` to the item's balance for each full year the item is active within the projection period.
3. WHEN a Contribution Amount is provided and Contribution Frequency is `annual`, THE Calculator SHALL add `contributionAmount` to the item's balance for each full year the item is active within the projection period.
4. WHEN no Contribution Amount is provided for an item, THE Calculator SHALL compute that item's projected value using only compound growth, identical to the existing behaviour.
5. THE Calculator SHALL apply contributions before applying the annual growth rate for that year, so that contributions themselves compound in subsequent years.
6. WHEN a Contribution Amount is provided, THE Planner SHALL validate that the value is a finite non-negative number and, IF the value is negative or non-numeric, THEN THE Planner SHALL display a validation error and SHALL NOT save the item.
7. THE Planner SHALL display the Contribution Amount and Frequency on the item row in the item list when a contribution is configured.

---

### Requirement 2: Recurring Withdrawals from Asset Accounts

**User Story:** As a retirement planner, I want to schedule recurring withdrawals from an asset account, so that I can model systematic drawdown in retirement.

#### Acceptance Criteria

1. WHEN a user opens the Add or Edit modal for any Asset Item, THE Planner SHALL display optional fields for Withdrawal Amount and Withdrawal Frequency (`monthly` or `annual`).
2. WHEN a Withdrawal Amount is provided and Withdrawal Frequency is `monthly`, THE Calculator SHALL subtract `withdrawalAmount × 12` from the item's balance for each full year the item is active within the projection period.
3. WHEN a Withdrawal Amount is provided and Withdrawal Frequency is `annual`, THE Calculator SHALL subtract `withdrawalAmount` from the item's balance for each full year the item is active within the projection period.
4. WHEN the projected balance of an item would fall below zero due to withdrawals in a given year, THE Calculator SHALL clamp the item's balance to zero for that year and all subsequent years.
5. WHEN no Withdrawal Amount is provided for an item, THE Calculator SHALL compute that item's projected value without any withdrawal deduction.
6. WHEN a Withdrawal Amount is provided, THE Planner SHALL validate that the value is a finite non-negative number and, IF the value is negative or non-numeric, THEN THE Planner SHALL display a validation error and SHALL NOT save the item.
7. THE Planner SHALL display the Withdrawal Amount and Frequency on the item row in the item list when a withdrawal is configured.

---

### Requirement 3: Loan / Mortgage Modeling for Property and Vehicle Items

**User Story:** As a retirement planner, I want to model a mortgage or car loan on a Property or Vehicle item, so that I can see how my net equity grows as I pay down the loan over time.

#### Acceptance Criteria

1. WHEN a user opens the Add or Edit modal for a Property or Vehicle item, THE Planner SHALL display an optional "Add Loan" section with fields for: Loan Amount, Annual Interest Rate (%), Monthly Payment, Escrow Amount (monthly), Property Tax (annual), and Extra Monthly Payment.
2. WHEN a Loan Amount is provided, THE Planner SHALL require that Monthly Payment is also provided and, IF Monthly Payment is absent, THEN THE Planner SHALL display a validation error and SHALL NOT save the item.
3. WHEN a Loan is configured on an item, THE Calculator SHALL compute an amortisation schedule starting from the item's Start Year, applying the monthly interest rate (`annualRate / 12 / 100`) to the outstanding Loan_Balance each month, subtracting the principal portion of each payment from the Loan_Balance.
4. WHEN computing the amortisation schedule, THE Calculator SHALL treat Extra Monthly Payment as additional principal reduction applied each month on top of the scheduled Monthly Payment.
5. WHEN the Loan_Balance reaches zero during a year, THE Calculator SHALL stop applying payments for that item and record the Loan_Balance as zero for all subsequent years.
6. WHEN a Loan is configured on an item, THE Calculator SHALL compute Net_Equity for each projection year as: `assetValue − loanBalance`, where `assetValue` is the compound-growth value of the item and `loanBalance` is the outstanding balance after that year's amortisation payments.
7. WHEN calculating net worth for a given year, THE Calculator SHALL use Net_Equity (not raw asset value) for any item that has an associated Loan.
8. THE Planner SHALL display the outstanding Loan_Balance and Net_Equity on the item row in the item list for items with a configured Loan.
9. WHEN a Loan Amount is provided, THE Planner SHALL validate that Loan Amount, Annual Interest Rate, and Monthly Payment are all finite non-negative numbers and, IF any value is negative or non-numeric, THEN THE Planner SHALL display a validation error and SHALL NOT save the item.
10. WHEN a Loan is configured, THE Calculator SHALL separately track the total interest paid and total principal paid for each projection year and make these available for display.

---

### Requirement 4: Recurring Payments Against Asset Loans

**User Story:** As a retirement planner, I want recurring loan payments to automatically reduce the outstanding loan balance each year, so that my net worth projection reflects the equity I am building.

#### Acceptance Criteria

1. WHEN an Asset Item has a configured Loan, THE Calculator SHALL apply the monthly payment (plus any Extra Monthly Payment) every month for each year the item is active, reducing the Loan_Balance accordingly.
2. WHEN the total payments applied in a year exceed the remaining Loan_Balance, THE Calculator SHALL reduce the Loan_Balance to zero and SHALL NOT apply further payments in subsequent years.
3. WHEN an Asset Item has a configured Loan, THE Planner SHALL display a yearly breakdown of: principal paid, interest paid, escrow paid, and remaining Loan_Balance, accessible from the item row.
4. WHEN Escrow Amount is configured on a Loan, THE Calculator SHALL include the monthly escrow amount in the total monthly cash outflow for that item but SHALL NOT apply escrow toward reducing the Loan_Balance.
5. WHEN Property Tax is configured on a Loan, THE Calculator SHALL include the annual property tax as an additional annual cash outflow for that item but SHALL NOT apply it toward reducing the Loan_Balance.
6. WHEN an Asset Item has a configured Loan, THE Planner SHALL include the total monthly payment (Monthly Payment + Escrow Amount + Extra Monthly Payment) as a cash outflow in the net worth calculation for each active year.

---

### Requirement 5: Projection Calculation Updates

**User Story:** As a retirement planner, I want the projection to correctly incorporate contributions, withdrawals, and loan amortisation, so that my net worth chart reflects all cash flows accurately.

#### Acceptance Criteria

1. WHEN calculating the projected value of a Bank Account or Investment item for a given year, THE Calculator SHALL use the formula: `balance(year) = (balance(year−1) + annualContribution − annualWithdrawal) × (1 + rate/100)`, where `balance(startYear−1)` equals the item's initial Amount.
2. WHEN calculating the projected value of a Property or Vehicle item with a Loan for a given year, THE Calculator SHALL use Net_Equity as the item's contribution to net worth.
3. WHEN calculating the projected value of a Property or Vehicle item without a Loan for a given year, THE Calculator SHALL use the existing compound growth formula unchanged.
4. WHEN any item has both a Contribution and a Withdrawal configured, THE Calculator SHALL apply both in the same year: net annual flow = `annualContribution − annualWithdrawal`, and SHALL clamp the resulting balance to zero if negative.
5. WHEN recalculating the projection after any item is added, edited, or deleted, THE Calculator SHALL recompute all amortisation schedules and contribution/withdrawal flows from the item's Start Year.

---

### Requirement 6: Data Model Extensions

**User Story:** As a retirement planner, I want my contribution, withdrawal, loan, and 401(k) data to be saved and restored correctly, so that I don't lose my configuration between sessions.

#### Acceptance Criteria

1. THE Planner SHALL extend the Item data model to include the following optional fields: `contributionAmount` (number), `contributionFrequency` (`'monthly'` | `'annual'`), `withdrawalAmount` (number), `withdrawalFrequency` (`'monthly'` | `'annual'`), `loan` (object or null), `retirement401k` (object or null), `endYear` (number or null).
2. THE Planner SHALL define the `loan` sub-object as: `{ loanAmount: number, annualInterestRate: number, monthlyPayment: number, escrowMonthly: number, propertyTaxAnnual: number, extraMonthlyPayment: number }`.
3. THE Planner SHALL define the `retirement401k` sub-object as: `{ employeeContribution: number, employerMatchPct: number, employerMatchCapPct: number, annualSalary: number, vestingYears: number, withdrawalStartYear: number | null }`.
4. WHEN an Item with contribution, withdrawal, loan, or 401(k) fields is saved to LocalStorage, THE Planner SHALL persist all new fields alongside the existing Item fields.
5. WHEN the Planner loads from LocalStorage, THE Planner SHALL correctly restore all contribution, withdrawal, loan, and 401(k) fields for each Item.
6. WHEN an Item does not have a contribution, withdrawal, loan, or 401(k) configured, THE Planner SHALL store those fields as `null` or omit them, and THE Calculator SHALL treat absent fields as zero-value (no contribution, no withdrawal, no loan).
7. WHEN an Item has `endYear: null`, THE Planner SHALL persist and restore that value correctly, and THE Calculator SHALL treat it as active through the end of the projection period.

---

### Requirement 7: Excel Import and Export Compatibility

**User Story:** As a retirement planner, I want my contribution, withdrawal, and loan data to be included in Excel exports and correctly re-imported, so that my full plan is portable.

#### Acceptance Criteria

1. WHEN exporting to Excel, THE Serializer SHALL include columns for all new Item fields: `contributionAmount`, `contributionFrequency`, `withdrawalAmount`, `withdrawalFrequency`, `loanAmount`, `loanAnnualInterestRate`, `loanMonthlyPayment`, `loanEscrowMonthly`, `loanPropertyTaxAnnual`, `loanExtraMonthlyPayment`, `employeeContribution`, `employerMatchPct`, `employerMatchCapPct`, `annualSalary`, `vestingYears`, `withdrawalStartYear`, and `endYear` (empty cell when open-ended).
2. WHEN importing from Excel, THE Serializer SHALL read the new columns and populate the corresponding Item fields, treating missing or empty cells as null (no contribution/withdrawal/loan).
3. FOR ALL valid Item lists containing items with contributions, withdrawals, and loans, exporting then importing SHALL produce an Item list equivalent to the original (round-trip property).
4. WHEN importing a Workbook that was exported before this feature was added (i.e., the new columns are absent), THE Serializer SHALL import the existing columns successfully and treat the missing new columns as null.

---

### Requirement 8: Item List Display Updates

**User Story:** As a retirement planner, I want item rows to show contribution, withdrawal, and loan summary information at a glance, so that I can quickly see which items have these features configured.

#### Acceptance Criteria

1. WHEN an item has a Contribution configured, THE Planner SHALL display the contribution amount and frequency in the item row metadata (e.g., "+$500/mo contribution").
2. WHEN an item has a Withdrawal configured, THE Planner SHALL display the withdrawal amount and frequency in the item row metadata (e.g., "−$1,000/mo withdrawal").
3. WHEN an item has a Loan configured, THE Planner SHALL display the current Loan_Balance (at the projection Start Year) and Net_Equity in the item row.
4. THE Pretty_Printer SHALL format all Loan_Balance and Net_Equity values using the same abbreviated notation as existing monetary values.
5. WHEN an item has a Loan configured, THE Planner SHALL display a "Loan Details" expandable section or link in the item row that shows the year-by-year amortisation summary (principal paid, interest paid, escrow paid, remaining balance) for each year in the projection period.

---

### Requirement 9: Traditional 401(k) and Roth 401(k) Account Modeling

**User Story:** As a retirement planner, I want to model my 401(k) and Roth 401(k) accounts with employee contributions, employer match, and retirement withdrawals, so that I can see how these accounts grow and how they affect my net worth over time.

#### Acceptance Criteria

1. THE Planner SHALL support two new Investment subcategory types: `Traditional 401(k)` and `Roth 401(k)`, available under the Investments item type.
2. WHEN a user opens the Add or Edit modal for an item with subcategory `Traditional 401(k)` or `Roth 401(k)`, THE Planner SHALL display the following optional fields: Annual Employee Contribution, Employer Match Percentage (%), Employer Match Cap (% of salary), Annual Salary (used only for match cap calculation), and Vesting Years.
3. WHEN an Annual Employee Contribution is provided, THE Calculator SHALL add that amount to the account balance each year the item is in its contribution phase (Start Year through the configured contribution end year or the item's active end).
4. WHEN Employer Match Percentage and Employer Match Cap are both provided, THE Calculator SHALL compute the annual employer match as: `min(employeeContribution, salary × matchCap/100) × matchPercentage/100` and add it to the account balance each contribution year.
5. WHEN Vesting Years is provided and greater than zero, THE Calculator SHALL only apply the employer match to the balance once the item has been active for at least Vesting Years; prior to vesting, employer match contributions SHALL NOT be added to the balance.
6. WHEN a user configures a withdrawal start year on a 401(k) item, THE Calculator SHALL switch the item from contribution phase to withdrawal phase starting that year, applying the configured Withdrawal Amount and Frequency instead of contributions.
7. WHEN a Traditional 401(k) item is in withdrawal phase, THE Planner SHALL display a note that withdrawals are subject to ordinary income tax (informational only; the Planner SHALL NOT compute tax owed).
8. WHEN a Roth 401(k) item is in withdrawal phase and the account has been held for at least 5 years from Start Year, THE Planner SHALL display a note that qualified withdrawals are tax-free (informational only).
9. WHEN Annual Employee Contribution, Employer Match Percentage, Employer Match Cap, or Annual Salary are provided, THE Planner SHALL validate that each is a finite non-negative number and, IF any value is negative or non-numeric, THEN THE Planner SHALL display a validation error and SHALL NOT save the item.
10. THE Planner SHALL display the annual employee contribution and employer match amounts on the item row when configured.
11. WHEN exporting to Excel, THE Serializer SHALL include columns for all 401(k) fields: `employeeContribution`, `employerMatchPct`, `employerMatchCapPct`, `annualSalary`, `vestingYears`, `withdrawalStartYear`.
12. WHEN importing from Excel, THE Serializer SHALL read the 401(k) columns and populate the corresponding Item fields, treating missing or empty cells as null.

---

### Requirement 10: Open-Ended Items (No End Date)

**User Story:** As a retirement planner, I want to mark certain items as having no end date, so that accounts like a bank account or investment that I intend to hold indefinitely remain active for the entire projection without me having to set an arbitrary end year.

#### Acceptance Criteria

1. WHEN a user opens the Add or Edit modal for any Item, THE Planner SHALL display a "No end date" toggle or checkbox next to the End Year field.
2. WHEN the "No end date" toggle is enabled, THE Planner SHALL disable and clear the End Year input field and SHALL NOT require End Year for form validation.
3. WHEN an Item is saved with "No end date" enabled, THE Planner SHALL store `endYear: null` (or an equivalent sentinel) on the Item.
4. WHEN the Calculator encounters an Item with `endYear: null`, THE Calculator SHALL treat that item as active for every year from its Start Year through the last year of the projection period.
5. WHEN an Item has `endYear: null` and a year is before the item's Start Year, THE Calculator SHALL still return zero for that item's value in that year.
6. THE Planner SHALL display open-ended items in the item list with "–" or "ongoing" in place of the End Year, so the user can distinguish them from items with a fixed end date.
7. WHEN the Projection Period changes (Start Year or Projection Years setting updated), THE Calculator SHALL automatically extend or contract the active range of all open-ended items to match the new projection end year.
8. WHEN exporting to Excel, THE Serializer SHALL write an empty cell for End Year when an item is open-ended, and WHEN importing, THE Serializer SHALL treat an empty End Year cell as `endYear: null` (open-ended).
9. WHEN an Item has `endYear: null`, THE Planner SHALL persist `endYear: null` to LocalStorage and correctly restore it on page load.

---

### Requirement 11: US Federal Tax Modeling

**User Story:** As a retirement planner, I want the app to estimate my annual federal income tax on 401(k) withdrawals, long-term stock gains, bank interest, and Social Security income, so that my net worth projection reflects realistic after-tax wealth.

#### Acceptance Criteria

**Tax Settings**

1. THE Planner SHALL add a "Tax Settings" section to the Settings panel with the following fields: Filing Status (`Single` or `Married Filing Jointly`), Birth Year (used to determine RMD age and Social Security thresholds), Annual Social Security Benefit (the gross annual amount the user expects to receive), Social Security Start Year, and Bracket Inflation Rate (%, defaults to 2.5).
2. WHEN Filing Status, Birth Year, Annual Social Security Benefit, Social Security Start Year, or Bracket Inflation Rate are changed, THE Planner SHALL immediately recalculate and re-render the projection and tax estimates.
3. THE Planner SHALL persist all Tax Settings to LocalStorage and restore them on page load.

**Bracket Inflation**

4. THE Planner SHALL seed tax bracket thresholds and the standard deduction from 2025 IRS values for both `Single` and `Married Filing Jointly` filing statuses.
5. FOR each projection year after 2025, THE Calculator SHALL inflate all bracket thresholds and the standard deduction by `(1 + bracketInflationRate/100) ^ (year − 2025)`, rounding to the nearest dollar.
6. THE 2025 seed values SHALL be:
   - **Ordinary income brackets (Single):** 10% up to $11,925 · 12% up to $48,475 · 22% up to $103,350 · 24% up to $197,300 · 32% up to $250,525 · 35% up to $626,350 · 37% above.
   - **Ordinary income brackets (MFJ):** 10% up to $23,850 · 12% up to $96,950 · 22% up to $206,700 · 24% up to $394,600 · 32% up to $501,050 · 35% up to $751,600 · 37% above.
   - **LTCG brackets (Single):** 0% up to $48,350 · 15% up to $533,400 · 20% above.
   - **LTCG brackets (MFJ):** 0% up to $96,700 · 15% up to $600,050 · 20% above.
   - **Standard deduction (Single):** $15,000. **Standard deduction (MFJ):** $30,000.

**Taxable Income Sources**

7. WHEN a Traditional 401(k) item is in withdrawal phase for a given projection year, THE Calculator SHALL include the annual withdrawal amount as Ordinary_Income for that year.
8. WHEN a Bank Account item has a configured annual interest rate greater than zero, THE Calculator SHALL estimate annual interest earned as `balance × rate/100` and include it as Ordinary_Income for that year.
9. WHEN an Investment item with subcategory `Stocks` or `ETFs` has a configured annual withdrawal, THE Calculator SHALL treat the withdrawal amount as a Long-Term Capital Gain (LTCG) for that year, assuming all gains qualify as long-term.
10. WHEN the Social Security Start Year is reached for a given projection year, THE Calculator SHALL compute Provisional_Income as `ordinaryIncome + 0.5 × annualSocialSecurityBenefit` and apply the following IRS thresholds (inflation-adjusted from 2025 base values of $25,000 Single / $32,000 MFJ for 50% inclusion and $34,000 Single / $44,000 MFJ for 85% inclusion) to determine the taxable portion of Social Security:
    - IF Provisional_Income is below the lower threshold, THEN 0% of Social Security is taxable.
    - IF Provisional_Income is between the lower and upper threshold, THEN 50% of Social Security is taxable.
    - IF Provisional_Income exceeds the upper threshold, THEN 85% of Social Security is taxable.
11. THE Calculator SHALL NOT include Roth 401(k) qualified withdrawals in any taxable income calculation.

**Tax Calculation**

12. FOR each projection year, THE Calculator SHALL compute estimated federal tax as follows:
    a. Sum all Ordinary_Income sources for the year (Traditional 401(k) withdrawals + bank interest + taxable Social Security).
    b. Subtract the inflation-adjusted standard deduction to arrive at Taxable_Ordinary_Income (floor at zero).
    c. Apply the inflation-adjusted marginal ordinary income brackets to Taxable_Ordinary_Income to compute ordinary income tax.
    d. Add LTCG income to Taxable_Ordinary_Income to determine the applicable LTCG rate bracket, then apply the inflation-adjusted LTCG rate to the LTCG amount.
    e. Sum ordinary income tax and LTCG tax to produce Total_Estimated_Tax for the year.
13. THE Calculator SHALL deduct Total_Estimated_Tax from the net worth figure for each projection year so that the chart and stats reflect after-tax wealth.
14. THE Calculator SHALL make the following values available per projection year for display: Ordinary_Income, LTCG_Income, Taxable_Social_Security, Standard_Deduction (inflation-adjusted), Taxable_Ordinary_Income, Ordinary_Tax, LTCG_Tax, Total_Estimated_Tax.

**Display**

15. THE Planner SHALL display a "Tax Estimate" row in the projection chart as a separate dashed dataset showing Total_Estimated_Tax per year.
16. THE Planner SHALL display a collapsible "Tax Breakdown" panel on the Dashboard showing, for the current Start Year: Filing Status, Ordinary Income, LTCG Income, Taxable Social Security, Standard Deduction, Taxable Ordinary Income, Ordinary Tax, LTCG Tax, and Total Estimated Tax — all formatted by the Pretty_Printer.
17. THE Planner SHALL note in the UI that tax estimates are approximations for planning purposes only and do not constitute tax advice.

**Data Persistence**

18. THE Planner SHALL persist Tax Settings (filing status, birth year, Social Security benefit, Social Security start year, bracket inflation rate) to LocalStorage under the existing Settings key and restore them on page load.
