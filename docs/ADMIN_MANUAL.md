# Administrator Manual — ProjectShelf

The administrator console (`/admin`) is restricted to verified accounts holding the `ROLE_ADMIN` privilege.

---

## 1. Navigating the Administrator Portal

### 1.1 Overview Dashboard (`/admin`)
- Displays real-time metrics for published projects, review queue size, fresh enquiries, active students, and AI calls.
- Provides quick buttons to trigger GitHub and Kaggle discovery crawlers on-demand.

### 1.2 Review Queue & Catalogue Management (`/admin/projects`)
- Filter projects by status: `PENDING_REVIEW`, `PUBLISHED`, `APPROVED`, `REJECTED`, or `NEEDS_REVALIDATION`.
- Inspect individual projects (`/admin/projects/[id]`) to edit summaries, select categories, modify difficulty levels, or inspect the 100-point quality score breakdown.
- **Workflow Actions**:
  - `Publish`: Makes project visible on public website (validates that category and description are present).
  - `Unpublish`: Moves project back to approved status without deleting it.
  - `Reject`: Flags project with a review note explaining the rejection.
  - `Revalidate`: Live HTTP check verifying that the external repository is still online.

### 1.3 Duplicate Candidates (`/admin/duplicates`)
- Displays pairs of repositories flagged with high similarity.
- Review side-by-side titles, platforms, and match reasons.
- Choose to **Dismiss False Positive** or **Keep Primary Only**.

### 1.4 Background Automation & Discovery (`/admin/discovery`)
- Trigger manual pipeline jobs:
  - `GITHUB_DISCOVERY`: Discovers new repositories from GitHub API.
  - `KAGGLE_DISCOVERY`: Discovers datasets, notebooks, and models.
  - `QUALITY_SCORING`: Re-rates unrated projects against quality criteria.
  - `AI_ANALYSIS`: Dispatches structured extraction to the internal AI service.
  - `DUPLICATE_DETECTION`: Analyzes indexed repositories for collisions.
  - `INTEREST_AGGREGATION`: Aggregates student interest weights for recommendation engines.
- Inspect execution status, duration, item counts, and error messages for each run.

### 1.5 Student Enquiries Management (`/admin/enquiries`)
- View student enquiries submitted via website forms.
- Filter by status: `NEW`, `IN_REVIEW`, `QUOTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
- Add private staff notes.
- Issue formal quotations with custom amounts (in INR) and validity periods.
- Reply directly via transactional email to the student.

### 1.6 AI Engagement Agent (`/admin/engagement`)
- Review AI-generated recommendation outreach drafts.
- Review student interest profiles and consent statuses.
- Approve or reject outreach drafts before dispatch.

### 1.7 External Integrations (`/admin/integrations`)
- Test live API connectivity for GitHub, Kaggle, AI Service, Email (Resend), and WhatsApp Cloud API.
- Toggle services on/off dynamically.

### 1.8 System Settings & Audit (`/admin/settings` & `/admin/audit`)
- Configure discovery keywords, quality thresholds, and communication quiet hours.
- Inspect the immutable audit ledger tracking all administrator operations.

