# API Reference — ProjectShelf

All API routes are served under the `/api` prefix. The Next.js frontend proxies `/api/*` directly to the Spring Boot backend (`http://localhost:8080`).

---

## 1. Authentication (`/api/auth`)

- `POST /api/auth/register`: Register new student account.
- `POST /api/auth/login`: Authenticate student or administrator.
- `POST /api/auth/logout`: Invalidate session.
- `GET /api/auth/me`: Current session status and role details.

---

## 2. Public Catalogue (`/api/public`)

- `GET /api/public/home`: Homepage stats, featured cards, recent cards, category counts.
- `GET /api/public/projects`: Search & filter catalogue.
  - Query parameters: `q`, `category`, `technology`, `language`, `difficulty`, `platform`, `type`, `sort`, `page`, `size`.
- `GET /api/public/projects/{slug}`: Project blueprint detail.
- `GET /api/public/projects/suggest?q=...`: Auto-completion title suggestions.
- `GET /api/public/categories`: All 20 categories with project counts.
- `GET /api/public/facets`: Aggregate counts by language, stack, and platform.
- `POST /api/public/enquiries`: Submit academic project enquiry.

---

## 3. Student Portal (`/api/student`)
*Requires `ROLE_STUDENT` session cookie.*

- `GET /api/student/profile`: Fetch student profile.
- `PUT /api/student/profile`: Update name, phone, college.
- `GET /api/student/saved`: List of bookmarked project cards.
- `GET /api/student/saved/ids`: List of saved project IDs.
- `PUT /api/student/saved/{projectId}`: Bookmark a project.
- `DELETE /api/student/saved/{projectId}`: Remove bookmark.
- `GET /api/student/recommendations`: AI-computed project suggestions.
- `GET /api/student/preferences`: Consent and notification settings.
- `PUT /api/student/preferences`: Update communication preferences.
- `GET /api/student/enquiries`: List student's submitted enquiries.
- `POST /api/student/delete-request`: Request account erasure.

---

## 4. Administration Console (`/api/admin`)
*Requires `ROLE_ADMIN` session cookie.*

- `GET /api/admin/overview`: System KPI dashboard.
- `GET /api/admin/projects`: Review queue and published projects.
- `GET /api/admin/projects/{id}`: Detailed project review.
- `PUT /api/admin/projects/{id}`: Update project metadata.
- `POST /api/admin/projects/{id}/action`: Execute workflow actions (`approve`, `publish`, `reject`, `revalidate`).
- `GET /api/admin/duplicates`: Collision and duplicate candidate list.
- `POST /api/admin/duplicates/{id}`: Resolve duplicates (`dismiss`, `keep_primary`).
- `GET /api/admin/jobs`: Background job logs.
- `POST /api/admin/jobs`: Manually trigger pipeline jobs.
- `GET /api/admin/enquiries`: Student enquiry management.
- `POST /api/admin/enquiries/{id}/quotations`: Issue price quotations.
- `POST /api/admin/enquiries/{id}/email`: Reply via email.
- `GET /api/admin/drafts`: Outreach drafts awaiting approval.
- `POST /api/admin/drafts/{id}/action`: Approve or reject outreach drafts.
- `GET /api/admin/integrations`: Live status of external APIs.
- `POST /api/admin/integrations/{code}/test`: Test live connectivity.
- `GET /api/admin/audit`: Immutable administrative action logs.

