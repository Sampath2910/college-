# Database Schema Documentation — ProjectShelf

The ProjectShelf database runs on MySQL 8.4 and is fully managed via Flyway versioned migrations (`V1__schema.sql` and `V2__seed_reference_data.sql`). All timestamps are stored in UTC with microsecond precision (`datetime(6)`).

---

## 1. Schema Modules & Tables (33 Tables)

### 1.1 Identity & Access Control
- `users`: Core identity table (email, password hash, full name, phone, college, deletion request flag).
- `roles`: Role definitions (`ADMIN`, `STUDENT`).
- `user_roles`: Many-to-many junction between users and roles.
- `permissions`: Fine-grained privileges (`catalogue.manage`, `discovery.manage`, `enquiries.manage`, etc.).
- `role_permissions`: Junction mapping roles to allowed permissions.

### 1.2 Catalogue & Classification
- `source_platforms`: External platforms (`GITHUB`, `KAGGLE`).
- `licences`: SPDX-compliant software licences (MIT, Apache-2.0, GPL-3.0, BSD-3-Clause).
- `categories`: 20 academic domains (Artificial Intelligence, Machine Learning, Web Development, IoT, etc.).
- `technologies`: Indexed programming languages, frameworks, and libraries.
- `projects`: Primary catalogue table holding titles, slugs, normalized descriptions, blueprints, scores, and publication statuses.
- `project_technologies`: Many-to-many junction between projects and technologies.
- `project_assets`: Media screenshots, diagrams, and code snippets linked to projects.

### 1.3 Discovery Pipeline & Quality Analysis
- `discovery_jobs`: Background crawler execution history, status, duration, items processed, and errors.
- `external_source_records`: Raw JSON payloads retrieved from source platform APIs.
- `quality_scores`: Composite 100-point quality score and criterion breakdown.
- `ai_analyses`: Structured extraction records (problem statement, objectives, modules).
- `duplicate_candidates`: Flagged collisions and fork similarities awaiting administrator resolution.

### 1.4 Student Enquiries & Mentorship
- `enquiries`: Academic project enquiries submitted by students (reference, requirements, channel, status).
- `enquiry_notes`: Private administrative staff notes.
- `quotations`: Formal price quotations issued for custom implementation or viva coaching.

### 1.5 Student Engagement & Privacy
- `saved_projects`: Bookmarks created by students.
- `student_interest_profiles`: Weighted category and technology affinities.
- `communication_preferences`: Affirmative consent flags (activity, email, WhatsApp, quiet hours).
- `consent_audit_logs`: Immutable consent change history (timestamp, IP, context, wording version).
- `message_drafts`: AI-generated outreach messages awaiting editorial review.
- `message_delivery_logs`: Delivery status tracking for outgoing emails and WhatsApp messages.
- `activity_events`: Anonymized telemetry events for recommendation scoring.

### 1.6 System Configuration & Audit
- `system_settings`: Key-value configuration for crawler keywords, thresholds, and cron schedules.
- `audit_logs`: Tamper-evident ledger of administrative actions.

---

## 2. Key Foreign Keys & Indexes

1. **Duplicate Prevention**: `projects.slug` (UNIQUE), `projects.canonical_url` (UNIQUE), `users.email` (UNIQUE).
2. **Fast Faceted Queries**: Indexes on `projects.status`, `projects.category_id`, `projects.primary_language`, and `projects.quality_score`.
3. **Optimized Text Search**: Full-text index on `projects.title` and `projects.title_normalized`.

