# AI Agents & Automation — ProjectShelf

ProjectShelf employs two dedicated autonomous agents designed to operate reliably under strict economic constraints and human supervision.

---

## 1. AI Project Discovery Agent

### 1.1 Responsibilities
1. Periodically crawls GitHub and Kaggle using authorized REST endpoints.
2. Filters out noise (e.g. awesome lists, generic frameworks, zero-content repositories).
3. Classifies projects into 20 college disciplines.
4. Calculates a 100-point composite quality index.
5. Identifies potential duplicate repositories or forks.
6. Places qualified projects into the review queue for administrator publication.

### 1.2 Composite Quality Score Formula
The 100-point quality score evaluates 7 dimensions:
- **Documentation Completeness (25 pts)**: README length, installation instructions, execution steps.
- **Licence Clarity (15 pts)**: Verified SPDX licence (MIT, Apache-2.0, BSD).
- **Active Maintenance (15 pts)**: Recent commits, low open issues ratio.
- **Code Maturity (15 pts)**: Multi-module architecture, testing directories, configuration files.
- **Community Validation (15 pts)**: Stars, forks, or Kaggle download counts.
- **Academic Relevance (10 pts)**: Presence of problem statements, datasets, or evaluation metrics.
- **Novelty & Clarity (5 pts)**: Non-boilerplate description and clean title.

---

## 2. AI Student Engagement Agent

### 2.1 Responsibilities
1. Monitors anonymized browsing activity and student bookmark patterns (with prior consent).
2. Builds weighted interest profiles across 20 domains.
3. Generates personalised project recommendation digests.
4. Prepares drafted messages for Email and WhatsApp.
5. Enforces quiet hours (21:00 to 09:00 IST) and frequency caps (maximum 1 message every 3 days).

### 2.2 Human-in-the-Loop Safeguard
- AI drafts are **never dispatched autonomously**.
- Every draft is queued under `/admin/engagement` in `PENDING_REVIEW` status.
- An administrator must review the message text, edit if necessary, and explicitly approve the dispatch.

