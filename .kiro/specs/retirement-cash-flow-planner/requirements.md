# Requirements Document

## Introduction

The Retirement Cash Flow Planner is a static single-page web application that enables users to model their financial future by tracking assets, cash inflows, and cash outflows over a configurable projection period. All data is persisted in the browser's localStorage with no server required. Users can import and export their data via Excel files. The app provides a real-time projection chart and summary dashboard to support retirement planning decisions.

## Glossary

- **Planner**: The Retirement Cash Flow Planner application as a whole.
- **Item**: A single financial entry belonging to one of the seven categories (Bank Account, Investment, Property, Vehicle, Rental, Inflow, Outflow).
- **Asset Item**: An Item of type Bank Account, Investment, Property, Vehicle, or Rental — items that contribute to net worth.
- **Cash Flow Item**: An Item of type Inflow or Outflow — items that represent recurring annual income or expense.
- **Category**: A subcategory label within an Item type (e.g., "Savings" within Bank Accounts, "Salary" within Inflows).
- **Annual Rate**: The compound annual growth or depreciation rate (%) applied to an Item's value over time.
- **Projection**: The calculated year-by-year net worth and per-category values over the configured projection period.
- **Projection Period**: The range of years covered by the Projection, defined by Start Year and Projection Years settings.
- **Dashboard**: The main overview view showing summary stats and the Projection chart.
- **Sidebar**: The left-side navigation panel listing all sections with item count badges.
- **Modal**: An overlay form used to add or edit an Item.
- **LocalStorage**: The browser's built-in key-value storage used for all data persistence.
- **Workbook**: An Excel `.xlsx` file used for import and export of Item data.
- **Pretty_Printer**: The component responsible for formatting monetary values into human-readable strings (e.g., $500K, $2.3M).
- **Serializer**: The component responsible for converting Item data to and from Excel Workbook format.
- **Settings**: User-configurable projection and visual preferences stored in LocalStorage.

---

## Requirements

### Requirement 1: Asset Item Management

**User Story:** As a retirement planner, I want to add, view, and delete asset items across seven categories, so that I can track all my financial holdings in one place.

#### Acceptance Criteria

1. THE Planner SHALL support seven Item types: Bank Account, Investment, Property, Vehicle, Rental, Inflow, and Outflow.
2. WHEN a user submits the Add Item form, THE Planner SHALL create a new Item with the provided Name, Category, Amount, Annual Rate, Start Year, and End Year and persist it to LocalStorage.
3. WHEN a user submits the Add Item form with any required field empty, THE Planner SHALL display a validation error and SHALL NOT save the Item.
4. WHEN a user clicks the delete action on an Item row, THE Planner SHALL display an inline "Delete? Yes / No" confirmation within the row without opening a popup dialog.
5. WHEN a user confirms deletion, THE Planner SHALL remove the Item from LocalStorage and update the item list and all badges in real time.
6. WHEN a user cancels deletion, THE Planner SHALL restore the item row to its normal display state without removing the Item.
7. THE Planner SHALL enforce a maximum of 999 Items total and, WHEN the limit is reached, SHALL display a warning and prevent adding further Items.
8. WHEN an Item is created, THE Planner SHALL record a `createdAt` ISO timestamp on the Item.

---

### Requirement 2: Category Subcategories

**User Story:** As a retirement planner, I want each asset and cash flow type to offer relevant subcategory options, so that I can classify items precisely.

#### Acceptance Criteria

1. WHEN the Add Item modal is opened for Bank Accounts, THE Planner SHALL offer subcategory options: Checking, Savings, Term Deposit.
2. WHEN the Add Item modal is opened for Investments, THE Planner SHALL offer subcategory options: Stocks, ETFs, Superannuation, Bonds, Crypto.
3. WHEN the Add Item modal is opened for Property, THE Planner SHALL offer subcategory options: Primary Home, Investment Property, Land, Commercial.
4. WHEN the Add Item modal is opened for Vehicles, THE Planner SHALL offer subcategory options: Car, Boat, Motorcycle.
5. WHEN the Add Item modal is opened for Rentals, THE Planner SHALL offer subcategory options: Residential, Holiday, Commercial.
6. WHEN the Add Item modal is opened for Inflows, THE Planner SHALL offer subcategory options: Salary, Pension, Dividends, Rental Income, Other Income.
7. WHEN the Add Item modal is opened for Outflows, THE Planner SHALL offer subcategory options: Living Expenses, Mortgage, Tax, Insurance, Other Expenses.

---

### Requirement 3: Projection Calculation

**User Story:** As a retirement planner, I want the app to calculate a year-by-year net worth projection, so that I can visualise my financial trajectory over time.

#### Acceptance Criteria

1. THE Planner SHALL calculate a Projection for each year in the Projection Period.
2. WHEN calculating an Asset Item's value for a given year, THE Planner SHALL apply compound growth using the formula: `value × (1 + annualRate/100) ^ (year − startYear)` for years within the Item's Start Year to End Year range.
3. WHEN a given year is outside an Asset Item's Start Year to End Year range, THE Planner SHALL treat that Item's contribution to net worth as zero for that year.
4. WHEN calculating net worth for a given year, THE Planner SHALL sum all Asset Item values and add all Inflow Item annual amounts and subtract all Outflow Item annual amounts that are active in that year.
5. WHEN an Item's Annual Rate is negative, THE Planner SHALL apply depreciation using the same compound formula, resulting in a decreasing value over time.
6. WHEN any Item is added, edited, or deleted, THE Planner SHALL recalculate and re-render the Projection in real time without requiring a page reload.

---

### Requirement 4: Projection Chart

**User Story:** As a retirement planner, I want to see a multi-line chart of my projected net worth and per-category breakdowns, so that I can understand how each asset class contributes over time.

#### Acceptance Criteria

1. THE Planner SHALL render a line chart displaying Total Net Worth over the full Projection Period.
2. THE Planner SHALL render individual dashed sub-lines on the chart for each of the seven Item types that contain at least one Item.
3. WHEN the Projection Period or any Item data changes, THE Planner SHALL update the chart in real time.
4. THE Planner SHALL label the chart's x-axis with years and the y-axis with monetary values formatted by the Pretty_Printer.
5. THE Planner SHALL render the chart on a dark background with high-contrast grid lines and legend text.

---

### Requirement 5: Dashboard Summary Stats

**User Story:** As a retirement planner, I want to see three key metrics at a glance on the dashboard, so that I can quickly assess my current financial position.

#### Acceptance Criteria

1. THE Planner SHALL display a "Total Assets" metric equal to the sum of all Asset Item amounts at the current Start Year.
2. THE Planner SHALL display an "Annual Inflow" metric equal to the sum of all Inflow Item amounts active in the current Start Year.
3. THE Planner SHALL display an "Annual Outflow" metric equal to the sum of all Outflow Item amounts active in the current Start Year.
4. WHEN any Item is added, edited, or deleted, THE Planner SHALL update all three metrics in real time.
5. THE Pretty_Printer SHALL format all monetary values using abbreviated notation: values ≥ 1,000,000 as `$X.XM`, values ≥ 1,000 as `$X.XK`, and values < 1,000 as `$X`.

---

### Requirement 6: Sidebar Navigation and Badges

**User Story:** As a retirement planner, I want a sidebar that lets me navigate between sections and shows item counts, so that I can quickly find and manage my data.

#### Acceptance Criteria

1. THE Planner SHALL display a sidebar with the following navigation items: Dashboard, Inflows, Outflows, Bank Accounts, Investments, Property, Vehicles, Rentals.
2. THE Planner SHALL display a count badge next to each non-Dashboard sidebar item showing the number of Items in that category.
3. WHEN an Item is added or deleted, THE Planner SHALL update the relevant badge count in real time.
4. WHEN a user clicks a sidebar navigation item, THE Planner SHALL display the corresponding section's item list in the main content area.
5. WHEN a user navigates to a section with no Items, THE Planner SHALL display an empty-state message in the main content area.
6. WHEN a user navigates to a non-Dashboard section, THE Planner SHALL display a context-sensitive "Add [Item Type]" button in the section header.

---

### Requirement 7: Data Persistence

**User Story:** As a retirement planner, I want my data to be automatically saved and restored, so that I don't lose my work between sessions.

#### Acceptance Criteria

1. WHEN an Item is created, edited, or deleted, THE Planner SHALL immediately write the updated Item list to LocalStorage.
2. WHEN the Planner loads in the browser, THE Planner SHALL read all Items and Settings from LocalStorage and restore the application state before rendering.
3. WHEN LocalStorage contains no data, THE Planner SHALL initialise with an empty Item list and default Settings.
4. THE Planner SHALL store Settings (chart title, Start Year, Projection Years, visual theme) in LocalStorage separately from Item data.

---

### Requirement 8: Excel Import and Export

**User Story:** As a retirement planner, I want to import and export my data as an Excel file, so that I can back up, share, or edit my plan outside the app.

#### Acceptance Criteria

1. WHEN a user clicks "Export Excel", THE Serializer SHALL write all Items to a Workbook with one row per Item and columns matching the Item schema, and SHALL trigger a browser download of the file named `retirement-cash-flow.xlsx`.
2. WHEN a user selects an `.xlsx` file for import, THE Serializer SHALL read the first sheet of the Workbook, parse each row into an Item, overwrite the current LocalStorage Item list, and re-render the application.
3. IF an imported row is missing required fields, THEN THE Planner SHALL skip that row and display a warning indicating how many rows were skipped.
4. FOR ALL valid Item lists, exporting then importing SHALL produce an Item list equivalent to the original (round-trip property).
5. THE Serializer SHALL support `.xlsx` format only; IF a file of another format is selected, THEN THE Planner SHALL display an error message and SHALL NOT modify the current data.

---

### Requirement 9: Projection Settings

**User Story:** As a retirement planner, I want to customise the projection parameters, so that I can model different time horizons and scenarios.

#### Acceptance Criteria

1. THE Planner SHALL provide a Settings panel where the user can configure: Chart Title, Start Year, and Projection Years.
2. THE Planner SHALL default Start Year to 2025 and Projection Years to 30.
3. WHEN the user changes Start Year or Projection Years, THE Planner SHALL recalculate and re-render the Projection and chart in real time.
4. WHEN the user changes the Chart Title, THE Planner SHALL update the chart title display in real time.
5. THE Planner SHALL persist all Settings changes to LocalStorage immediately.

---

### Requirement 10: Visual Customisation

**User Story:** As a retirement planner, I want to customise the app's colour scheme and typography, so that I can personalise the interface to my preference.

#### Acceptance Criteria

1. THE Planner SHALL provide colour pickers for: Background colour, Surface colour, Text colour, and Accent colour.
2. THE Planner SHALL provide a font family selector and a base font size control.
3. WHEN a user changes any visual setting, THE Planner SHALL apply the change to the UI in real time using CSS custom properties.
4. THE Planner SHALL persist all visual settings to LocalStorage and restore them on page load.
5. THE Planner SHALL ship with a default dark theme: background `#181a1b`, surface `#23272e`, text `#e0e0e0`, accent `#58a6ff`.

---

### Requirement 11: Item List Display

**User Story:** As a retirement planner, I want each item displayed with its key details in a consistent row format, so that I can scan and manage my data efficiently.

#### Acceptance Criteria

1. THE Planner SHALL display each Item row with: an icon representing the Item type, the Item name, the subcategory label, the date range (Start Year – End Year), the Annual Rate, the current value formatted by the Pretty_Printer, and a delete action.
2. THE Pretty_Printer SHALL format all monetary values in item rows using abbreviated notation consistent with Requirement 5, Criterion 5.
3. WHEN the Add Item modal is opened, THE Planner SHALL set keyboard focus to the Name field automatically.
4. THE Planner SHALL display the item list only for the currently active section; items from other sections SHALL NOT appear in the list.
