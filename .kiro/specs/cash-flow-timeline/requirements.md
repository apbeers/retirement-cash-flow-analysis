# Requirements Document

## Introduction

The Cash Flow Timeline is a Gantt-style horizontal bar visualization rendered below the existing projection chart on the dashboard. Each financial item (bank account, investment, property, vehicle, rental, inflow, outflow) is displayed as a horizontal bar spanning its active years. The timeline shares the same year axis as the projection chart, enabling users to see at a glance which cash flows are active during any given period, how much money is flowing, and when contribution or withdrawal phases transition.

## Glossary

- **Timeline**: The Gantt-style horizontal bar visualization rendered below the projection chart on the dashboard view.
- **Timeline_Bar**: A single horizontal bar representing one financial item's active duration on the Timeline.
- **Lane**: A horizontal row in the Timeline assigned to one Timeline_Bar.
- **Year_Axis**: The shared horizontal axis representing projection years, aligned with the projection chart above.
- **Transition_Point**: A visual marker on a Timeline_Bar indicating where a contribution phase ends (contributionEndYear) or a withdrawal phase begins.
- **Projection_Chart**: The existing Chart.js line chart (canvas#projectionChart) on the dashboard.
- **Item**: A financial entry in the application (bank account, investment, property, vehicle, rental, inflow, or outflow) stored in `state.items`.
- **Type_Color**: The predefined color associated with each item type (bank:#4fc3f7, investments:#81c784, property:#ffb74d, vehicles:#e57373, rentals:#ba68c8, inflows:#4db6ac, outflows:#f06292).
- **Dashboard**: The main overview section of the application (activeSection === 'dashboard').
- **Renderer**: The module (js/renderer.js) responsible for rendering UI components.

## Requirements

### Requirement 1: Timeline Container Placement

**User Story:** As a user, I want the timeline to appear directly below the projection chart on the dashboard, so that I can correlate chart trends with active cash flows.

#### Acceptance Criteria

1. WHEN the Dashboard is active, THE Renderer SHALL display the Timeline container below the Projection_Chart and above the tax breakdown panel.
2. WHEN a section other than Dashboard is active, THE Renderer SHALL hide the Timeline container.
3. THE Timeline SHALL use the same start year and end year range as the Projection_Chart Year_Axis.

### Requirement 2: Timeline Bar Rendering

**User Story:** As a user, I want each financial item to appear as a horizontal bar spanning its active years, so that I can see when each cash flow starts and stops.

#### Acceptance Criteria

1. THE Renderer SHALL create one Timeline_Bar for each Item in `state.items`.
2. WHEN an Item has a defined endYear, THE Timeline_Bar SHALL span from the Item startYear to the Item endYear.
3. WHEN an Item has no defined endYear (ongoing), THE Timeline_Bar SHALL span from the Item startYear to the last year of the projection.
4. THE Renderer SHALL display each Timeline_Bar in its own Lane, stacked vertically so multiple bars are visible simultaneously.
5. WHEN an Item startYear is before the projection start year, THE Timeline_Bar SHALL begin at the projection start year.
6. WHEN an Item endYear is after the projection end year, THE Timeline_Bar SHALL end at the projection end year.

### Requirement 3: Color Coding by Type

**User Story:** As a user, I want timeline bars color-coded by item type, so that I can quickly distinguish between different kinds of cash flows.

#### Acceptance Criteria

1. THE Renderer SHALL color each Timeline_Bar using the Type_Color corresponding to the Item type.
2. THE Timeline SHALL display a legend or use the Item name as a label on each Lane so users can identify each bar.

### Requirement 4: Contribution and Withdrawal Phase Visualization

**User Story:** As a user, I want to see when contributions end and withdrawals begin on each bar, so that I can understand the transition points in my financial plan.

#### Acceptance Criteria

1. WHEN an Item has a contributionEndYear that falls within the Timeline_Bar span, THE Renderer SHALL display a Transition_Point marker at the contributionEndYear position on the Timeline_Bar.
2. WHEN an Item has both a contribution phase and a withdrawal phase, THE Renderer SHALL visually differentiate the contribution segment from the withdrawal segment on the Timeline_Bar using distinct fill patterns or opacity levels.
3. WHEN an Item is of type inflows, THE Renderer SHALL render the Timeline_Bar with a visual style indicating incoming cash flow.
4. WHEN an Item is of type outflows, THE Renderer SHALL render the Timeline_Bar with a visual style indicating outgoing cash flow.

### Requirement 5: Amount Display

**User Story:** As a user, I want to see how much money is flowing for each item, so that I can understand the magnitude of each cash flow at any point.

#### Acceptance Criteria

1. WHEN a user hovers over a Timeline_Bar, THE Timeline SHALL display a tooltip showing the Item name, Item amount, contribution amount (if applicable), withdrawal amount (if applicable), and the active year range.
2. THE Renderer SHALL display the Item name as an inline label on or beside each Timeline_Bar.

### Requirement 6: Year Axis Alignment

**User Story:** As a user, I want the timeline year axis to align with the projection chart, so that I can visually correlate data between the two.

#### Acceptance Criteria

1. THE Timeline Year_Axis SHALL use the same start year as `state.settings.startYear`.
2. THE Timeline Year_Axis SHALL use the same end year as `state.settings.startYear + state.settings.projectionYears - 1`.
3. THE Timeline SHALL render year tick marks or labels along the Year_Axis that align with the Projection_Chart x-axis positions.

### Requirement 7: Responsive Layout

**User Story:** As a user on a smaller screen, I want the timeline to remain usable, so that I can view my cash flow plan on any device.

#### Acceptance Criteria

1. WHEN the viewport width is below 768px, THE Timeline container SHALL allow horizontal scrolling to display the full year range.
2. THE Timeline_Bar labels SHALL remain readable at all supported viewport widths.

### Requirement 8: Dashboard-Only Visibility

**User Story:** As a user, I want the timeline to only appear on the dashboard, so that it does not clutter other item-list views.

#### Acceptance Criteria

1. WHILE the active section is Dashboard, THE Renderer SHALL display the Timeline.
2. WHILE the active section is not Dashboard, THE Renderer SHALL hide the Timeline.

### Requirement 9: Dynamic Updates

**User Story:** As a user, I want the timeline to update when I add, edit, or remove items, so that it always reflects my current plan.

#### Acceptance Criteria

1. WHEN the `render()` function is called, THE Renderer SHALL re-render the Timeline with the current `state.items` and `state.settings`.
2. WHEN `state.items` contains zero items, THE Timeline SHALL display an empty state or hide itself.

### Requirement 10: Loan Payment Visualization

**User Story:** As a user, I want to see loan payment periods on the timeline, so that I can see when loan obligations start and end.

#### Acceptance Criteria

1. WHEN an Item has a loan with a payoff year within the projection range, THE Renderer SHALL display a Transition_Point marker at the loan payoff year on the Timeline_Bar.
2. WHEN an Item has a loan, THE Renderer SHALL include the loan payment amount in the hover tooltip.

### Requirement 11: Click-to-Navigate

**User Story:** As a user, I want to click on any item bar in the timeline and be taken to that item in its subsection list, so that I can quickly view its details or edit it.

#### Acceptance Criteria

1. WHEN a user clicks on a Timeline_Bar, THE Renderer SHALL switch the active section to the Item type corresponding to that bar (e.g., clicking a bank item navigates to the bank section).
2. WHEN a user clicks on a Timeline_Bar, THE Renderer SHALL scroll to or highlight the clicked Item in the item list so the user can immediately identify it.
3. THE Timeline_Bar SHALL display a pointer cursor on hover to indicate it is clickable.
