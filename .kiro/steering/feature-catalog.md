---
inclusion: manual
---

# Feature Catalog

Every user-facing feature in the app, what it does, and where the code lives.

## 1. Dashboard
Summary view showing stats cards, projection chart, timeline, and tax breakdown.
- Stats cards: total assets, annual inflow, annual outflow → `renderer.js` (updateStats)
- Projection chart: multi-line Chart.js net worth + per-type lines → `chart.js` (updateChart)
- Cash flow timeline: Gantt-style bars per item with markers → `timeline.js` (renderTimeline)
- Tax breakdown: collapsible panel showing federal tax estimate → `timeline.js` (renderTaxBreakdown)
- Crosshair sync: hover on chart highlights timeline year and vice versa → `chart.js` + `timeline.js`

## 2. Item Management (7 types)
Users add/edit/delete financial items across 7 categories: bank, investments, property, vehicles, rentals, inflows, outflows.
- Add/edit modal with dynamic field groups → `modalController.js`
- Item list with per-item mini charts → `renderer.js` (renderItemList, toggleItemChart)
- Inline delete confirmation → `modalController.js` (initiateDelete, confirmDelete)
- Sidebar badges showing item counts per type → `renderer.js` (updateBadges)
- Navigate from timeline bar click to item → `renderer.js` (navigateToItem)

## 3. Recurring Contributions & Withdrawals
Bank/investment items support monthly or annual contributions and withdrawals with optional end year.
- Form fields: contributionAmount, contributionFrequency, contributionEndYear, withdrawalAmount, withdrawalFrequency → `modalController.js`
- Balance calculation: `calculator.js` (calcItemBalance) — compounds with contributions/withdrawals yearly
- Display: contribution/withdrawal lines in item rows → `renderer.js`

## 4. Loan Amortization
Property and vehicle items can have attached loans with monthly payments, escrow, extra payments.
- Form fields: loanAmount, annualInterestRate, monthlyPayment, escrowMonthly, propertyTaxAnnual, extraMonthlyPayment → `modalController.js`
- Calculation: `calculator.js` (calcLoanSchedule, getLoanPayoffYear) — monthly amortization
- Display: loan balance, equity, payoff year in item rows + expandable amortization table → `renderer.js`
- Net worth: asset value minus loan balance → `calculator.js` (calcProjection)

## 5. 401(k) Modeling
Investment items with category "Traditional 401(k)" or "Roth 401(k)" get employer match, vesting, withdrawal phase.
- Form fields: employeeContribution, employerMatchPct, employerMatchCapPct, annualSalary, vestingYears, withdrawalStartYear → `modalController.js`
- Calculation: `calculator.js` (calc401kBalance) — accumulation phase with match, withdrawal phase
- Tax impact: Traditional 401(k) withdrawals count as ordinary income → `calculator.js` (calcTax)

## 6. Federal Tax Estimation
Estimates US federal income tax using 2025 brackets inflated annually.
- Brackets: `taxBrackets.js` — ordinary, LTCG, standard deduction, SS thresholds
- Calculation: `calculator.js` (calcTax) — marginal brackets, LTCG, Social Security taxation
- Settings: filing status, birth year, SS benefit, SS start year, bracket inflation rate → `eventHandlers.js`
- Display: tax breakdown panel on dashboard → `timeline.js` (renderTaxBreakdown)
- Chart: dashed "Est. Tax" line on projection chart → `chart.js`

## 7. Excel Import/Export
Round-trip Excel (.xlsx) support for all item data including loans and 401(k) fields.
- Export: `serializer.js` (exportToXlsx) — writes all item fields as columns
- Import: `serializer.js` (importFromXlsx) — reads, validates, reconstructs loan/401k sub-objects
- UI: export button + file input in header → `eventHandlers.js`

## 8. AI Chatbot (WebLLM)
In-browser AI assistant that answers questions about the user's financial data.
- Model: Qwen2.5-3B-Instruct, 4096 token context, runs via WebGPU → `chatbot.js`
- Context: system prompt with items, projection table, loan summaries, cash flow, milestones, per-item balances → `chatbot.js` (assembleFinancialContext)
- UI: slide-out panel, streaming responses, progress bar during model download → `chatbot.js`
- Page shift: main content shifts left when panel opens → `chatbot.js` (toggleChatPanel)

## 9. Theming
User-configurable dark theme with CSS custom properties.
- Settings: background, surface, text, accent colors, font family, font size → `eventHandlers.js` (applyTheme)
- Storage: persisted in settings.theme → `state.js`

## 10. Sidebar Navigation
Section-based navigation with active state highlighting and item count badges.
- Sections: dashboard, inflows, outflows, bank, investments, property, vehicles, rentals
- Wiring: `eventHandlers.js` (DOMContentLoaded click handlers)
- State: `appState.js` (state.activeSection)
- Render: `renderer.js` (render) switches between dashboard and item list views

## 11. Settings Panel
Collapsible panel for projection config, theme, and tax settings.
- Projection: chart title, start year, projection years
- Theme: colors, font family, font size
- Tax: filing status, birth year, SS benefit, SS start year, bracket inflation rate
- All wired in `eventHandlers.js`, persisted via `state.js` (saveSettings)

## 12. Data Persistence
All user data persisted in localStorage, survives page refresh.
- Items: `rcfp_items` key → JSON array of Item objects
- Settings: `rcfp_settings` key → JSON Settings object
- Load: `state.js` (loadState) — merges with defaults, handles corrupt JSON
- Save: `state.js` (saveItems, saveSettings) — called after every mutation
