# Implementation Status — ProjectShelf

Updated: 2026-11-14 (Autonomous E-Commerce, Academic Report Generator, Packaging & DMCA Engine Live)

## Commercial Architecture & Monetization Engine
- **Source Protection & Anti-Leakage**: External source repository URLs (`sourceUrl`) and author URLs (`authorUrl`) are omitted and masked from public APIs, protecting commercial value and ensuring students do not bypass the platform.
- **Academic Packaging Tiers**:
  1. **Verified Ready-to-Run Pack (₹699)**: Clean source code ZIP, verified MySQL `.sql` seed dump, preconfigured `.env.example`, 1-click `run.bat` & `run.sh` scripts, and open-source academic license attribution.
  2. **Academic Report & PPT Pack (₹1,299)**: Everything in Pack 1 + Automated IEEE standard formatted 70-page project report (`.docx`), 15-slide widescreen defense PowerPoint presentation (`.pptx`), and anti-plagiarism seed variation.
  3. **Viva Defense & 1-on-1 Mentorship (₹2,499)**: Everything in Packs 1 & 2 + Comprehensive Top 40 Viva Voce questions & model answers guide (`.docx`), architecture defense coaching, and custom code modifications.

## Automated Document & Asset Generation (AI Microservice)
- Installed `python-docx` and `python-pptx` inside `ai-service/.venv`.
- Implemented `ai-service/app/generator.py`:
  - `generate_ieee_report`: Generates complete IEEE standard major project report (`.docx`) including Title Page, Certificate of Originality, Declaration, Abstract, 7 Core Chapters (Introduction, Literature Survey, SRS, System Architecture & Methodology, Implementation, Testing, Conclusion), and IEEE References with anti-plagiarism title and synonym randomization.
  - `generate_presentation_deck`: Generates 15-slide widescreen PowerPoint presentation (`.pptx`) with executive dark/navy theme, modular cards, problem statement, architecture breakdown, execution workflow, testing matrix, and viva defense conclusions.
  - `generate_viva_guide`: Generates Top 40 Viva Voce defense questions & model answers (`.docx`) tailored to the project's technology stack.
- FastAPI endpoints exposed:
  - `POST /v1/generate/report`
  - `POST /v1/generate/presentation`
  - `POST /v1/generate/viva`
- Fully tested with `pytest` passing **7 / 7 tests**.

## Backend E-Commerce & Secure Fulfillment Engine
- **Database Migration (`V3__orders_and_downloads.sql`)**:
  - `orders`: Tracks academic orders, unique references (`ORD-yyyyMM-XXXXXX`), customer details, package tier, payment gateway, payment status (`PENDING`, `PAID`, `FAILED`), and audit timestamps.
  - `order_downloads`: Issues single-use or rate-limited cryptographic tokens (`dl_XXXX`), download counts, max downloads (15), and 7-day validity expiration (`expires_at`).
  - `dmca_requests`: Dedicated compliance intake for author attribution updates, license clarifications, and takedown notices.
- **Java Modules (`com.projectshelf.order`)**:
  - `Order`, `OrderDownload`, `DmcaRequest` entities.
  - `OrderRepository`, `OrderDownloadRepository`, `DmcaRequestRepository`.
  - `PackageBundleService`: Builds verified `.zip` archives containing `README_SETUP.md`, `setup_database.sql`, `.env.example`, `scripts/run.bat`, `scripts/run.sh`, `LICENSE.txt`, and fetches synthesized IEEE reports and PPT presentations from the AI service.
  - `OrderService`: Handles checkout creation, payment verification, automatic download token issuance, email confirmation, and token expiration validation.
  - `PublicOrderController`, `StudentOrderController`, `AdminOrderController`.
  - Tested with `OrderServiceTest` passing **5 / 5 tests**.

## Frontend Integration (Next.js 16.4)
- **Interactive 3-Step Checkout Modal (`PackageOrderModal`)**:
  - Step 1: Student details & college information.
  - Step 2: Instant Payment Gateway (UPI QR preview, UPI ID `pay@projectshelf.local`, instant mock verification).
  - Step 3: Instant Success Fulfillment Screen with direct one-click download buttons for each generated asset.
- **Dedicated Order Fulfillment Page (`/order/[reference]`)**:
  - Comprehensive order receipt, payment verification badge, active 7-day download links, step-by-step setup checklist, and academic license attribution.
- **Student Portal ("My Orders & Downloads") (`/student/orders`)**:
  - Lists student's purchased packages and download links.
- **Open-Source Attribution & DMCA Notice (`/dmca`)**:
  - Explains educational fair-use policy, open-source attribution guarantees, and includes a direct submission form for repository authors.
- **Admin Dashboard Console**:
  - Orders & Sales Monitor (`/admin/orders`): Real-time purchase log, revenue, and active download count.
  - DMCA & Attribution Center (`/admin/dmca`): Author claims review and compliance management.
- Next.js build verified: **35 / 35 static and dynamic routes compiled with 0 errors**.

## Live-Verified Status
- MySQL 8.4 running on port 3306 with active `V1`, `V2`, `V3` Flyway migrations and recorded orders.
- Spring Boot Backend running on port 8080 with Order Checkout, Payment Verification, and Download Token Streaming.
- FastAPI AI Microservice running on port 8000 with Python Docx and PPTX generation.
- Next.js Frontend running on port 3000 with real-time checkout modals and live `/order/[reference]` views.

## Review pass (2026-11-14, evening): what was checked and changed
Method: all 62 page/viewport combinations screenshotted (desktop 1440, mobile 390), every admin and student API response compared with what its page expects, workflows exercised through the frontend proxy.

Fixed
- Admin Discovery, Integrations and Settings pages were not wired to the real API (wrong body, job codes, response shapes, value types): rewritten.
- Admin Engagement called endpoints that do not exist; admin enquiry actions used an undefined id; quotation body used wrong field names.
- Admin project editor: saving wiped objectives, features, modules and the demo link. It now resends fields it does not edit.
- Duplicates, student recommendations and student enquiries used field names the API does not return.
- Mobile catalogue overflowed horizontally by 4,292 px; home category list overflowed by 100 px. Filters now collapse on phones.
- Project page: original source link and author link restored; a missing licence is shown as "Not stated by the author" (was "Open Source (Unspecified)").
- Removed invented statistics, struck-through reference prices and "verified / tested / guaranteed" wording from public pages.
- `POST /api/public/orders/verify` marked any order PAID without a payment. It now returns 409 unless `PAYMENTS_MOCK_ENABLED=true`; admins confirm payments with `POST /api/admin/orders/{reference}/mark-paid` ("Mark as paid" on the Orders page). The fake UPI QR screen is gone.
- Order ZIP no longer contains a generated placeholder `src/Application.java` presented as project source.
- Emoji shortcodes (":fire:") stripped from descriptions (migration V4 + at ingest).
- Added `robots.txt`, `sitemap.xml`, JSON-LD on project pages, `X-Robots-Tag: noindex` on /admin, /student, /order.
- Performance: Hibernate batch fetching (no per-card queries), gzip on API responses, production build verified.

Measured (local, production build): TTFB 5-55 ms, LCP about 200 ms, 16 requests / ~117 KB per page. Dev mode (`npm run dev`) is 2-3x slower; use `npm run build && npm run start` to judge speed.

Tests after the pass: ai-service 7/7, backend 5/5 (order unit tests only), frontend typecheck + production build clean.

Still open
- No payment gateway is integrated. Orders are requests that an admin confirms manually.
- Order deliverables are generated from templates, not prepared per project. Decide what is really delivered before charging for it.
- Backend has no integration tests for auth, catalogue, discovery or engagement yet; no Playwright test suite (only the screenshot helper in `frontend/e2e`).
- ESLint reports `any` usage in the pages written in the earlier pass.
- Catalogue content: all 24 GitHub results were bulk-published, including link lists and non-project repositories. Review them under Admin > Projects.
- Credentials still missing: ANTHROPIC_API_KEY, KAGGLE_API_TOKEN, GITHUB_TOKEN, Resend, WhatsApp.
