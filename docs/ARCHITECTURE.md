# System Architecture — ProjectShelf

## 1. Executive Architecture Overview

ProjectShelf is designed with a high-cohesion, decoupled three-tier architecture:

```
+---------------------------------------------------------------------------------+
|                                USER CLIENTS                                     |
|               (Web Browsers, Mobile Viewports, Search Engine Crawlers)           |
+---------------------------------------------------------------------------------+
                                      | HTTPS
                                      v
+---------------------------------------------------------------------------------+
|                           NEXT.JS 16.4 FRONTEND                                 |
|  - App Router with 31 Static & Dynamic Routes                                    |
|  - Tailwind CSS 4 Design Tokens & Typography                                    |
|  - SSR Server-Side Fetching with Incremental Static Regeneration (ISR)          |
|  - First-Party API Proxy (/api/* -> Spring Boot Backend)                        |
+---------------------------------------------------------------------------------+
                                      | HTTP (Internal Network)
                                      v
+---------------------------------------------------------------------------------+
|                       SPRING BOOT 3.5 MODULAR BACKEND                           |
|  - Security & CSRF Token Validation (Double Submit Cookie)                      |
|  - Role-Based Access Control (Anonymous, STUDENT, ADMIN)                        |
|  - Spring Data JPA + Flyway Database Migrations                                 |
|  - Scheduled Discovery & Pipeline Orchestrator                                  |
|  - Business Modules: Catalogue, Discovery, Enquiries, Engagement, Integration   |
+---------------------------------------------------------------------------------+
             |                                    |                        |
             | Internal HTTP (Shared Token)       | JDBC                   | External HTTPS
             v                                    v                        v
+------------------------+             +--------------------+   +-------------------+
|   AI MICROSERVICE      |             |   MYSQL 8.4 DB     |   | EXTERNAL PLATFORMS|
| - FastAPI + Python 3.11|             | - 33 Tables        |   | - GitHub API      |
| - Anthropic SDK        |             | - UTF8MB4 Unicode  |   | - Kaggle API      |
| - Structured Pydantic  |             | - Audit Logs       |   | - Resend Email    |
| - Heuristic Fallback   |             | - Flyway Versioned |   | - WhatsApp Cloud  |
+------------------------+             +--------------------+   +-------------------+
```

---

## 2. Core Subsystems

### 2.1 Public-Facing Presentation Layer
- **Framework**: Next.js 16.4 with React 19.
- **Rendering Strategy**:
  - Static generation with ISR (60-second revalidation) for catalogue home, categories index, FAQ, and legal pages.
  - Server-side dynamic rendering for live searches (`/projects`, `/search`) and project detail views (`/projects/[slug]`).
- **First-Party Cookie Isolation**: The browser only communicates with the Next.js origin. The backend server URL is never exposed publicly; Next.js rewrites `/api/*` to the Spring Boot instance.

### 2.2 Enterprise Modular Backend
- **Framework**: Spring Boot 3.5.16 on Java 21 LTS.
- **Security**: Spring Security with stateless sessions, HttpOnly cookies, and strict double-submit CSRF cookie verification (`X-XSRF-TOKEN`).
- **Resilience**: In-memory token bucket rate limiting on sensitive authentication and enquiry endpoints.
- **Audit Logging**: Every administrative mutation (project publish/reject, settings update, job trigger) is permanently recorded in the `audit_logs` table.

### 2.3 Intelligent Discovery Agent
- **Adapters**:
  - `GitHubAdapter`: Discovers repositories based on domain keywords, forks, stars, and licensing.
  - `KaggleAdapter`: Scans datasets, models, and notebooks.
- **Quality Scorer**: Calculates a composite 100-point score across 7 distinct dimensions (repository health, licence clarity, description completeness, technical keywords, README depth, and forks).
- **Duplicate Detector**: Cross-checks repository canonical URLs and computes Levenshtein title similarities to detect duplicate repos or cloned forks.

### 2.4 AI Blueprint Extraction Microservice
- **Runtime**: Python 3.11 + FastAPI + Uvicorn.
- **Authentication**: Secured with an internal Bearer shared-secret token (`AI_SERVICE_TOKEN`).
- **Provider Agnostic**: Configured for Anthropic (`claude-haiku-5-5`) with robust heuristic fallbacks when credentials are unconfigured.

### 2.5 Student Engagement Agent
- **Privacy Model**: Explicit affirmative opt-in consent for telemetry, email digests, and WhatsApp notifications.
- **Recommendation Engine**: Computes weighted category and stack affinities from user bookmarks and search queries.
- **Human-in-the-Loop Safety**: AI-generated outreach drafts remain in `PENDING_REVIEW` until an administrator approves and dispatches them.

