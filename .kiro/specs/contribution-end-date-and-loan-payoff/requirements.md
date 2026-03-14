# Requirements Document

## Introduction

This feature adds two capabilities to the Retirement Cash Flow Planner:

1. A contribution end year for recurring contributions on bank accounts, investment accounts, and other account types that support contributions. Currently, contributions run for the entire active period of an item. This change lets users specify a year after which contributions stop while the account itself remains active.

2. A loan payoff date display for property items that have loans. The projected payoff year (the first year the loan closing balance reaches zero) is shown as an inline detail on the item row, giving users immediate visibility into when their loan will be fully paid off.

## Glossary

- **Planner**: The Retirement Cash Flow Planner application
- **Item**: A financial record in the Planner (bank account, investment, property, vehicle, rental, inflow, or outflow)
- **Contribution_End_Year**: An optional year field on an Item that specifies when recurring contributions stop; contributions are applied for years up to and including this value
- **Contribution_Account**: An Item of type bank or investments that has a non-zero contributionAmount configured
- **Loan_Payoff_Year**: The first year in a loan amortisation schedule where the closing balance reaches zero
- **Item_Row**: The rendered HTML row for an Item in the item list area
- **Modal**: The add/edit item dialog used to create or modify Items
- **Calculator**: The module (calculator.js) responsible for balance projections, loan schedules, and statistics
- **Renderer**: The module (renderer.js) responsible for building the item list HTML and charts
- **Balance_Cache**: The per-item year-keyed cache object used by calcItemBalance and calc401kBalance to store computed balances

## Requirements

### Requirement 1: Contribution End Year Data Model

**User Story:** As a user, I want to set an optional end year for my recurring contributions, so that I can model contributions stopping (e.g., at retirement) while the account continues to grow.

#### Acceptance Criteria

1. THE Planner SHALL store an optional `contributionEndYear` property on each Item, accepting a four-digit year value or null.
2. WHEN a user creates or edits a Contribution_Account, THE Modal SHALL display a "Contribution End Year" numeric input field within the contribution group.
3. WHEN the Contribution End Year field is left blank, THE Planner SHALL treat contributionEndYear as null, meaning contributions continue for the entire active period of the Item.
4. IF the user enters a contributionEndYear that is less than the Item startYear, THEN THE Modal SHALL display a validation error and prevent saving.
5. WHEN a user saves an Item with a valid contributionEndYear, THE Planner SHALL persist the contributionEndYear value alongside the existing Item data.

### Requirement 2: Contribution End Year Calculation Logic

**User Story:** As a user, I want the projection calculations to stop adding contributions after my specified end year, so that my balance forecasts accurately reflect my planned contribution schedule.

#### Acceptance Criteria

1. WHILE the current projection year is less than or equal to the Item contributionEndYear, THE Calculator SHALL include the configured contribution amount in the annual balance computation.
2. WHEN the current projection year exceeds the Item contributionEndYear, THE Calculator SHALL set the annual contribution to zero for that year and all subsequent years.
3. WHEN contributionEndYear is null, THE Calculator SHALL apply contributions for every year within the Item active period, preserving current behaviour.
4. THE Calculator SHALL apply the contribution end year logic to calcItemBalance for bank and investment Items with contributions.
5. THE Calculator SHALL apply the contribution end year logic to calc401kBalance for 401(k) Items, stopping employee contributions and employer match after the contributionEndYear.
6. FOR ALL Items with a contributionEndYear, THE Calculator SHALL produce identical balances to an equivalent Item without a contributionEndYear for all years up to and including the contributionEndYear (idempotence of the cutoff boundary).

### Requirement 3: Contribution End Year Display

**User Story:** As a user, I want to see the contribution end year in the item row details, so that I can quickly verify my contribution schedule at a glance.

#### Acceptance Criteria

1. WHEN an Item has a non-null contributionEndYear, THE Renderer SHALL display the contribution end year in the item meta line alongside the existing contribution amount and frequency text.
2. WHEN an Item has a null contributionEndYear, THE Renderer SHALL display the contribution detail without any end year annotation, preserving current behaviour.

### Requirement 4: Contribution End Year Serialisation

**User Story:** As a user, I want my contribution end year to be saved and restored when I export or import my data, so that I do not lose this setting.

#### Acceptance Criteria

1. WHEN exporting Items to Excel, THE Planner SHALL include the contributionEndYear value in the exported data.
2. WHEN importing Items from Excel, THE Planner SHALL read the contributionEndYear value and restore it on the Item.
3. WHEN importing an Item that has no contributionEndYear column or a blank value, THE Planner SHALL set contributionEndYear to null.
4. FOR ALL Items, exporting then importing SHALL produce an Item with an equivalent contributionEndYear value (round-trip property).

### Requirement 5: Loan Payoff Year Calculation

**User Story:** As a user, I want to know the projected year my property loan will be fully paid off, so that I can plan my finances around that milestone.

#### Acceptance Criteria

1. THE Calculator SHALL provide a function or inline logic that determines the Loan_Payoff_Year from a loan amortisation schedule.
2. WHEN a loan schedule contains a year with a closing balance of zero, THE Calculator SHALL identify the first such year as the Loan_Payoff_Year.
3. WHEN a loan schedule has no year with a closing balance of zero within the projection period, THE Calculator SHALL indicate that the loan extends beyond the projection horizon.
4. WHEN the loan amount is zero, THE Calculator SHALL report the Loan_Payoff_Year as the Item startYear.

### Requirement 6: Loan Payoff Year Display

**User Story:** As a user, I want to see the projected loan payoff year on my property item row, so that I have immediate visibility into when my mortgage will be paid off.

#### Acceptance Criteria

1. WHEN a property or vehicle Item has a loan with a Loan_Payoff_Year within the projection period, THE Renderer SHALL display "Paid off: [year]" in the Item_Row loan detail section.
2. WHEN a property or vehicle Item has a loan that extends beyond the projection period, THE Renderer SHALL display "Paid off: beyond [last projection year]" in the Item_Row loan detail section.
3. WHEN a property or vehicle Item has no loan configured, THE Renderer SHALL not display any payoff information, preserving current behaviour.
