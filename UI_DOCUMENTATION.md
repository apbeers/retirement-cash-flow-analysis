## UI Documentation (for Project Plan)

### Overview
This UI is a **dark, GitHub-inspired dashboard** with a **vertical sidebar navigation** and a **main content area** that focuses on a retirement asset projection chart and summary metrics. It’s designed for quick at-a-glance status and easy navigation between cash flow and asset sections.

---

## UI Structure

### 1) Layout
- **Two-column layout**
  - **Left sidebar (fixed width)** for navigation and section badges.
  - **Right main content** for headers, stats, and the projection chart.

### 2) Sidebar (Primary Navigation)
- **Brand header** (e.g., `RETIREPLAN` with a simple icon/logo)
- **Section groups**
  - **Overview**
    - Dashboard (active highlight)
  - **Cash Flow**
    - Inflows
    - Outflows
  - **Assets**
    - Bank Accounts
    - Investments
    - Property
    - Vehicles
    - Rentals
- **Badge counts** shown next to each section item (small circles with number)

---

## Main Content (Dashboard Example)

### A) Page Header
- **Title**: `Retirement Asset Projection`
- **Subtitle**: year range + projection duration (e.g., `2025 – 2055 · 30-year projection`)

### B) Summary Stats Row (Cards)
Three horizontally-aligned stat cards, each with:
- Label (e.g., `Total Assets`)
- Value (e.g., `$15.0K`)
- Color-coded value styling:
  - **Total Assets**: blue accent
  - **Annual Inflow**: green accent
  - **Annual Outflow**: red accent

### C) Chart Panel
- Large full-width panel below stats
- Title inside chart container (“Retirement Asset Projection”)
- Dark background with subtle grid lines
- Multi-line projection chart (net worth + asset components)

---

## Visual Style Notes
- **Dark theme palette** (nearly black background, soft gray panels)
- **Subtle depth/shadows** around cards and chart container
- **Active nav item** highlighted with a darker/blue background chip
- **Text** uses high contrast (white/gray) for readability
- **Minimal spacing** to keep dashboard compact and info-dense

---

## How to Use This in the Project Plan
- Treat this document as the definitive UI spec for the “Dashboard” view.
- Use it to guide:
  - HTML layout structure (sidebar + main)
  - Bootstrap component choices (navs, cards, grid)
  - The color scheme and typography decisions
  - Where to place dynamic elements (counts, chart, stats)

If you’d like, I can also turn this into a formal markdown file in the repo (e.g., `UI_DOCUMENTATION.md`) and reference it from `PROJECT_PLAN.md`.