# Retirement Cash Flow Planner

## Project Overview
Build a static HTML/CSS/JS website for retirement planning with a dark GitHub-inspired theme, two-column layout, interactive Chart.js dashboard, item management for cash flows and assets, local browser storage persistence, and GitHub Pages hosting.

## Features
- **Dark, professional dashboard** (GitHub-inspired colors)
- **Two-column layout** with a sidebar navigation and a main content area
- **Dashboard overview** with metrics and an interactive Chart.js projection
- **Section views** for inflows, outflows, and asset types (bank, investments, property, vehicles, rentals)
- **Add/Edit item modal** with fields for name, category, amount, rate, start/end year
- **LocalStorage persistence** for all data
- **Import/Export Excel** (SheetJS / `.xlsx`) with full overwrite on import
- **Responsive design** for desktop and mobile
- **Badges showing item counts** per section

## Data Model
Each item uses a schema similar to:

- `type` (e.g., `investments`, `inflows`, `outflows`, `bank`, `property`)
- `category` (e.g., `stocks`, `salary`, `rent`)
- `name` (string)
- `amount` (number)
- `rate` (annual %)
- `startYear` (number)
- `endYear` (number)
- `createdAt` (ISO timestamp)

## Projection Rules
- Assets grow/depreciate via compound growth based on annual rate.
- Cash flows (inflows/outflows) apply annually between their start/end years.
- Net worth = total asset value + accumulated cash flow balance.

## UI Elements
- **Sidebar navigation** with sections and item count badges.
- **Top bar** with current section title, projection years, and year range controls.
- **Stats row** with Total Assets, Annual Inflow, Annual Outflow.
- **Chart** with multi-line projection (net worth + sub-assets).
- **Item lists** with delete confirmation and empty-state placeholders.

## UI Documentation
See [UI_DOCUMENTATION.md](UI_DOCUMENTATION.md) for detailed UI structure, layout, and visual style specifications.

## Implementation Steps
1. Create HTML structure (sidebar, main, modal).
2. Add CSS for dark theme, layout, and components.
3. Implement JavaScript for data management, rendering, and charting.
4. Add localStorage persistence and automatic rehydration.
5. Wire navigation, add/edit modals, delete confirmation logic.
6. Add Excel import/export support using SheetJS.
7. Test and polish UX on desktop and mobile.

## Deployment
- Host on GitHub Pages using the repository as a static site.
- Ensure all assets are referenced with relative paths.

## Notes
- Importing an Excel file fully overwrites the current local data.
- Chart updates in real-time as data changes.
- Category dropdowns and metadata are dynamic based on section.

---

_Last updated: March 14, 2026_
