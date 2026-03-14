# Implementation Plan: Cash Flow Timeline

## Overview

Add a Gantt-style horizontal bar timeline below the projection chart on the dashboard. Each financial item renders as a colored bar spanning its active years, with transition markers for contribution end and loan payoff. Clicking a bar navigates to the item's section and highlights it. All logic lives in existing modules — primarily `renderer.js`, with HTML/CSS additions and barrel/build updates.

## Tasks

- [x] 1. Add TYPE_COLORS constant and refactor updateChart()
  - [x] 1.1 Add `TYPE_COLORS` constant to `renderer.js`
    - Define `const TYPE_COLORS = { bank: '#4fc3f7', investments: '#81c784', property: '#ffb74d', vehicles: '#e57373', rentals: '#ba68c8', inflows: '#4db6ac', outflows: '#f06292' }` at module scope in `renderer.js`
    - Refactor `updateChart()` to use `TYPE_COLORS` instead of the inline `tc` object
    - _Requirements: 3.1_

- [x] 2. Implement `buildTimelineBars(items, settings)` pure function
  - [x] 2.1 Create `buildTimelineBars` in `renderer.js`
    - Import `calcLoanSchedule` and `getLoanPayoffYear` (already imported)
    - Compute `projStart`, `projEnd`, `totalYears` from settings
    - Return empty array if `totalYears <= 0`
    - For each item: clamp startYear/endYear to projection range, skip if outside range
    - Compute `leftPct` and `widthPct` as percentages
    - Compute `contributionEndPct` if `contributionEndYear` falls within bar span
    - Compute `loanPayoffPct` via `calcLoanSchedule` + `getLoanPayoffYear` if payoff year is within bar span
    - Set `hasWithdrawal = true` if `item.withdrawalAmount > 0`
    - Resolve color from `TYPE_COLORS` with `'#aaa'` fallback
    - Return array of BarDescriptor objects per design spec
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.5, 2.6, 3.1, 4.1, 5.1, 6.1, 6.2, 10.1_

  - [ ]* 2.2 Write property test: Bar span clamping (P1)
    - **Property 1: Bar span clamping to projection range**
    - Generate random items with startYear/endYear (some null) and random settings
    - Verify clamped years and leftPct/widthPct calculations match formula
    - **Validates: Requirements 1.3, 2.2, 2.3, 2.5, 2.6, 6.1, 6.2**

  - [ ]* 2.3 Write property test: Bar descriptor correctness (P2)
    - **Property 2: Bar descriptor correctness**
    - Generate random sets of items (1–10) all overlapping the projection range
    - Verify count matches, color equals `TYPE_COLORS[item.type]`, name equals `item.name`, `hasWithdrawal` is correct
    - **Validates: Requirements 2.1, 3.1, 3.2, 4.2, 5.2**

  - [ ]* 2.4 Write property test: Contribution end marker position (P3)
    - **Property 3: Contribution end marker position**
    - Generate items with random contributionEndYear (within bar span, outside, null)
    - Verify `contributionEndPct` matches formula or is null
    - **Validates: Requirements 4.1**

  - [ ]* 2.5 Write property test: Loan payoff marker position (P4)
    - **Property 4: Loan payoff marker position**
    - Generate items with random loan configs
    - Verify `loanPayoffPct` matches independently computed payoff year
    - **Validates: Requirements 10.1**

  - [ ]* 2.6 Write property test: Tooltip completeness (P5)
    - **Property 5: Tooltip contains required information**
    - Generate random items with varying contribution/withdrawal/loan fields
    - Build tooltip string and verify all required fields are present
    - **Validates: Requirements 5.1, 10.2**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `renderTimeline()` and DOM rendering
  - [x] 4.1 Add timeline-container div to `index.html`
    - Insert `<div class="card card-surface p-3 mb-4" id="timeline-container" style="display:none"></div>` between `#chart-container` and `#taxBreakdownPanel`
    - Add comment `<!-- Cash Flow Timeline (dashboard) -->`
    - _Requirements: 1.1_

  - [x] 4.2 Add CSS for timeline components to `styles.css`
    - Add `.timeline-wrapper` (position: relative, overflow-x: auto on mobile)
    - Add `.timeline-axis` with year tick labels positioned by percentage
    - Add `.timeline-lane` (flex row, fixed height per lane)
    - Add `.timeline-lane-label` (fixed-width label column, truncate overflow)
    - Add `.timeline-bar` (absolute-positioned, rounded corners, type color background, cursor: pointer)
    - Add `.timeline-bar:hover` (brightness increase for hover feedback)
    - Add `.timeline-marker` (small vertical line for transition points)
    - Add `.item-row.highlight` keyframe animation (brief yellow/accent flash)
    - Add mobile `@media (max-width: 767.98px)` rule for `.timeline-wrapper` horizontal scroll with min-width
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 11.3_

  - [x] 4.3 Implement `renderTimeline()` in `renderer.js`
    - Get `#timeline-container` element, return early if missing
    - If `state.activeSection !== 'dashboard'` or `state.items.length === 0`, hide container and return
    - Call `buildTimelineBars(state.items, state.settings)` to get bar descriptors
    - If no bars returned, hide container and return
    - Show container, generate inner HTML: heading, `.timeline-wrapper`, `.timeline-axis` with year tick labels, one `.timeline-lane` per bar with label and `.timeline-bar` div
    - Set `title` attribute on each bar with tooltip text (name, amount, contribution/withdrawal/loan amounts, year range)
    - Add transition markers (`.timeline-marker`) for `contributionEndPct` and `loanPayoffPct`
    - Attach `onclick` handler on each bar that calls `navigateToItem(itemIndex)`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 6.3, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2_

  - [ ]* 4.4 Write property test: Non-dashboard sections hide timeline (P6)
    - **Property 6: Non-dashboard sections hide the timeline**
    - Generate random non-dashboard section names from ALL_TYPES
    - Verify timeline container is hidden after `renderTimeline()`
    - **Validates: Requirements 1.2, 8.2**

- [x] 5. Implement click-to-navigate handler
  - [x] 5.1 Add `navigateToItem(itemIndex)` function in `renderer.js`
    - Set `state.activeSection` to `state.items[itemIndex].type`
    - Call `render()`
    - After render, find `.item-row[data-item-index="N"]` and scroll into view
    - Add `.highlight` class, remove it after animation completes (~1s)
    - _Requirements: 11.1, 11.2_

  - [ ]* 5.2 Write unit tests for click-to-navigate and timeline visibility
    - Test: clicking a timeline bar sets `state.activeSection` to the item's type
    - Test: clicking a timeline bar adds `.highlight` class to the target `.item-row`
    - Test: dashboard shows timeline container when items exist
    - Test: empty items array hides timeline container
    - Test: item entirely before projection range is excluded from bars
    - Test: item entirely after projection range is excluded from bars
    - Test: ongoing item (null endYear) extends bar to projection end
    - Test: year axis tick labels match projection range
    - _Requirements: 11.1, 11.2, 1.1, 9.2, 2.5, 2.3, 6.3_

- [x] 6. Wire renderTimeline() into render() and update exports
  - [x] 6.1 Call `renderTimeline()` in `render()` function
    - Add `renderTimeline();` call after `updateChart();` and before `renderTaxBreakdown();` in the `render()` function
    - _Requirements: 9.1_

  - [x] 6.2 Export `buildTimelineBars`, `renderTimeline`, and `navigateToItem` from `script.js` barrel
    - Add `buildTimelineBars`, `renderTimeline`, `navigateToItem` to the renderer export line in `script.js`
    - _Requirements: 9.1_

  - [x] 6.3 Expose `navigateToItem` on `window` in `main.js` and `build.js`
    - In `main.js`: import `navigateToItem` from `./renderer.js` and set `window.navigateToItem = navigateToItem`
    - In `build.js`: add `window.navigateToItem = navigateToItem;` to the globals section
    - _Requirements: 11.1_

- [x] 7. Final checkpoint
  - Run `node build.js` to rebuild the bundle
  - Run `npx vitest --run` to ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code changes are in existing files — no new modules needed
