# SupermailBox UI: Step-by-Step Frontend Checklist

This document breaks down the SupermailBox admin frontend into small, incremental tasks to build cleanly without complexity.

---

## Phase 1: Navigation & Layout Shell
Start by building the main container that houses all screens.

- [x] **Task 1: Collapsible Admin Sidebar**
  - **Goal**: Create a permanent navigation bar on the left side.
  - **Details**:
    - Build a sidebar containing links to: **Dashboard**, **Templates**, **Campaigns/Segments**, **Contacts/Suppression**.
    - Include a collapse button (reduces sidebar to icons only) and dark mode theme styling (dark grey `#0a0a0c`).
    - Add a User Profile card at the bottom of the sidebar.

---

## Phase 2: Screen 1 - Queue Monitor & Dashboard
Build the health-monitoring screen that admins will see when they first log in.

- [ ] **Task 2: Top Funnel Metric Cards**
  - **Goal**: Display key messaging statistics in a responsive grid.
  - **Details**:
    - Design 4 cards: Queued (with spin loader), Sent (total count), Bounce Rate (percentage with light red background), Open Rate (percentage with green indicator).
    - Add hover lift effects to cards and support micro-animations on counts.
- [ ] **Task 3: Real-Time BullMQ Queue Visualizer**
  - **Goal**: Visualize the current Redis queue lanes.
  - **Details**:
    - Draw 4 vertical columns side-by-side: Active, Waiting, Delayed, Failed.
    - Render jobs inside these columns as cards. Clicking a card should open a slide-over drawer displaying raw JSON job metadata (attempts made, timestamp, error trace).
- [ ] **Task 4: Recent Logs Table**
  - **Goal**: Show a searchable grid of recent dispatches.
  - **Details**:
    - Build a table showing: Timestamp, Recipient, Type (Transactional/Campaign), Provider (ZeptoMail/SES), and Status Badge (Green for Sent, Red for Failed).
    - Include a search input to filter by recipient email and a simple pagination control (Prev/Next).

---

## Phase 3: Screen 2 - Template Builder
Build the editor area to design and version-control HTML/MJML email templates.

- [ ] **Task 5: Two-Pane Split Layout**
  - **Goal**: Create the template editor panel.
  - **Details**:
    - Left Pane (Editor): Inputs for template key, subject line, and a large code textarea for HTML/MJML markup.
    - Right Pane (Preview Frame): A clean container showing the compiled HTML. Include a toggle switch to preview the design in Desktop View (600px width) vs Mobile View (320px width).
- [ ] **Task 6: Variable Inspector & Version History Drawer**
  - **Goal**: Manage dynamic inputs and template versions.
  - **Details**:
    - Build a side-panel next to the editor containing:
      - Variables list: Displays variables detected in the template (e.g. `{{name}}`, `{{amount}}`).
      - Version history timeline: A list of past versions (v1, v2, v3). Clicking a version shows its metadata and offers a "Promote to Live" action.

---

## Phase 4: Screen 3 - Audience Segments & Campaigns
Build the tools to segment users and schedule email blasts.

- [x] **Task 7: Dynamic Rule Builder**
  - **Goal**: Let admins build conditional filters (e.g., `plan == premium`).
  - **Details**:
    - Create a row-based rule editor. Clicking "+ Add Rule" appends a new rule row containing:
      - Field Dropdown (e.g. Plan, Country, Inactive Days)
      - Operator Dropdown (e.g. Equals, Greater Than, Contains)
      - Value Input (text field or number)
    - Add a large, dynamic "Audience Count" label that updates when rules are edited.
- [x] **Task 8: Campaign Form & Progress Grid**
  - **Goal**: Create and schedule blasts.
  - **Details**:
    - Form: Fields for Campaign Name, Template Selector, and Date-Time Picker to schedule the send.
    - Table: List of past and active campaigns, showing a horizontal progress bar of sending status (e.g. "80% completed") and performance metrics (opened/clicked).

---

## Phase 5: Screen 4 - Contacts & Suppression Manager
Build the compliance, search, and unsubscribe management tab.

- [ ] **Task 9: Unified Profile Search Card**
  - **Goal**: Show linked user accounts across projects.
  - **Details**:
    - Create a search bar. Searching a contact returns a card showing:
      - Primary email, primary phone, and list of linked accounts (e.g., "Linked to FlowPilot ID 294 and CRMPilot ID 94").
      - List of custom attributes (plan, sign-up date, country).
- [ ] **Task 10: Suppression Table & Manual Block Form**
  - **Goal**: Manage hard blocks and opt-outs.
  - **Details**:
    - Table: Displays emails, block reasons (e.g., Hard Bounce, Spam Complaint, Unsubscribed, Manual), and timestamp.
    - Action: Add a drawer to manually add a new email to the block list or delete an existing block.

---

## Phase 6: API Integration
Wire the UI states to the Fastify backend endpoints.

- [ ] **Task 11: Connect UI Components to API**
  - **Goal**: Set up API services (using axios or native fetch).
  - **Details**:
    - Set up API hooks for dashboard stats (`GET /v1/dashboard/stats`), manual sends (`POST /v1/send/manual`), template saving (`POST /v1/templates`), segment resolving (`POST /v1/segments/:id/resolve`), and suppression management (`POST /v1/suppression`).
