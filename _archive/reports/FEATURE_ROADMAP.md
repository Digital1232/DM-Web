# WorkSync - Feature Upscale Roadmap

This document outlines a strategic roadmap for upscaling the WorkSync application from an internal task tracker to a more comprehensive project management and operational suite.

---

## Phase 1: Foundational Improvements

*Goal: Enhance code quality, security, and maintainability.*

- **[ ] Codebase Modularization:**
  - **Action:** Break down the large `<script>` block in `index.html` into smaller, feature-specific JavaScript modules (e.g., `auth.js`, `jira.js`, `ui.js`).
  - **Benefit:** Improves code readability, simplifies debugging, and makes it easier for multiple developers to work on different features simultaneously.

- **[ ] Secure API Proxy:**
  - **Action:** Fully deprecate the Google Apps Script proxy (`gsUrl`). Make the Node.js proxy (`/api/jira`) the sole method for communicating with Jira.
  - **Benefit:** Centralizes API logic and completely removes sensitive API tokens from the client-side, significantly improving security.

- **[ ] Environment Variable Management:**
  - **Action:** Ensure all sensitive keys (Firebase config, Jira tokens) are stored in environment variables on the server, not hardcoded.
  - **Benefit:** Standard practice for security and allows for different configurations between development, staging, and production environments.

---

## Phase 2: Core Feature Deepening

*Goal: Improve the power and utility of existing features.*

- **[ ] Full 2-Way Jira Synchronization:**
  - **Action:** Implement logic to push updates from WorkSync back to Jira. This includes status changes (via Kanban drag-and-drop), comments, and potentially logging time.
  - **Benefit:** Makes WorkSync a true interface for Jira, reducing the need for users to switch between tools.

- **[ ] Interactive & Drill-Down Reporting:**
  - **Action:** Enhance the "Reports" section. Use Chart.js (already in use) to create interactive charts where clicking on a segment (e.g., a user or a project) filters the view or opens a detailed modal.
  - **Benefit:** Transforms reports from static displays into powerful analytical tools.

- **[ ] Advanced Task Filtering & Views:**
  - **Action:** Add more powerful filtering options (e.g., by label, epic, or custom fields synced from Jira). Allow users to save their filter combinations as custom views.
  - **Benefit:** Helps users manage large numbers of tasks and focus on what's most important to them.

---

## Phase 3: New Major Modules

*Goal: Broaden the application's scope with new, high-value features.*

- **[ ] Project Management Module:**
  - **Concept:** A new top-level section for managing projects, not just tasks.
  - **Features:**
    - **Project Dashboard:** Overview of all projects, their health, deadlines, and budget status.
    - **Gantt Chart View:** A timeline view of tasks within a project to visualize dependencies and progress.
    - **Budget Tracking:** Simple inputs for project budgets and tracking of billable hours against them.
    - **Resource Allocation:** A view to see who is working on what and identify overallocated team members.

- **[ ] Client Portal:**
  - **Concept:** A secure, limited-access portal for clients.
  - **Features:**
    - **Project Progress View:** Clients can see the status of their specific projects and key milestones.
    - **Approval Workflow:** A formal system for clients to approve mockups, content, or deliverables (could be linked to Jira statuses).
    - **Client-facing Chat:** A dedicated chat channel for each project, separate from internal team chat.

---

## Phase 4: Quality of Life & Advanced HR

*Goal: Refine the user experience and expand internal tooling.*

- **[ ] Global Search:**
  - **Action:** Implement a global search bar in the header that can find tasks, projects, users, and notes from anywhere in the app.

- **[ ] Performance Reviews & Goal Setting (OKR):**
  - **Action:** Expand the HR portal to include modules for setting quarterly goals (OKRs) and conducting performance reviews.

- **[ ] Mobile-First Responsive Design:**
  - **Action:** Conduct a thorough review of the UI on mobile devices to ensure all features are accessible and easy to use on the go.