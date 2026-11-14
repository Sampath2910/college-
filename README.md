# ProjectShelf — AI-Powered Student Project Discovery & Management Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Java Version](https://img.shields.io/badge/Java-21%20LTS-blue)]()
[![Node Version](https://img.shields.io/badge/Node-24%2B-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.4-orange)]()
[![Python](https://img.shields.io/badge/Python-3.11-yellow)]()

ProjectShelf is a complete, production-ready web platform for college students seeking technology projects for their minor and major academic degrees. It indexes open-source projects from **GitHub** and **Kaggle**, classifies them across 20 domains, scores quality automatically, extracts structured architectural blueprints, and provides comprehensive academic mentorship and viva voce preparation services.

---

## Key Features

### 1. Public Project Discovery
- **Catalogue & Search**: Search by keyword or technology stack with auto-completing suggestions.
- **20 Academic Disciplines**: Artificial Intelligence, Machine Learning, Deep Learning, Full Stack, IoT, Blockchain, Cybersecurity, Android, Flutter, and more.
- **Architectural Blueprints**: Overview, problem statement, objectives, modular breakdowns, and setup prerequisites.
- **Ethical Attribution**: Clear SPDX licence identification, original author profiles, and direct repository links.

### 2. Student Portal
- **Bookmarks**: Save candidate projects for university project guide reviews.
- **Mentorship Enquiries**: Request assistance with local execution, database seeding, custom features, and viva voce defense.
- **AI Recommendations**: Personalized suggestions computed from consented activity and stack affinities.
- **Privacy & Consent Controls**: Granular affirmative consent toggles (activity telemetry, email digest, WhatsApp alerts) and one-click data deletion requests.

### 3. Secure Administrator Console
- **Overview KPIs**: Total projects, review queue, enquiry counts, student profiles, and AI token consumption.
- **Review Queue**: Approve, publish, reject, or revalidate discovered repositories.
- **Background Jobs**: Trigger manual discovery crawlers (GitHub, Kaggle), quality scoring, and duplicate detection.
- **Enquiry Management**: Issue price quotations (in INR), add internal staff notes, and reply to students directly.
- **AI Engagement**: Review and approve AI-generated outreach message drafts before sending.
- **Live Integrations**: Test live connectivity to GitHub, Kaggle, Anthropic AI, Resend Email, and WhatsApp Cloud API.
- **Audit Logs**: Immutable log tracking every administrative operation.

---

## Architecture

```
+---------------------------+       +------------------------------------+
|  Next.js 16.4 Frontend    | ----> |  Spring Boot 3.5 Modular Backend   |
|  (App Router, Tailwind 4) |       |  (Java 21 LTS, Flyway, CSRF, RBAC) |
+---------------------------+       +------------------------------------+
                                           |                 |
                                           v                 v
                            +-----------------------+  +-------------------+
                            |  FastAPI AI Service   |  |   MySQL 8.4 DB    |
                            |  (Python 3.11 Micro)  |  |   (33 Tables)     |
                            +-----------------------+  +-------------------+
```

---

## Quickstart (Local Development)

### 1. Configure Secrets
Copy the environment example to `.env`:
```bash
cp .env.example .env
```

### 2. Start MySQL
```powershell
.tools/mysql/bin/mysqld --no-defaults --basedir=.tools/mysql --datadir=.tools/mysql-data --port=3306 --bind-address=127.0.0.1 --mysqlx=OFF
```

### 3. Start Backend
```powershell
cd backend
java -jar target/backend-1.0.0.jar
```

### 4. Start AI Microservice
```powershell
cd ai-service
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

### 5. Start Frontend
```powershell
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Production Deployment (Docker Compose)

```bash
docker compose up -d --build
```

---

## Complete Documentation Index

- [Architecture Design](docs/ARCHITECTURE.md)
- [Database Schema (33 Tables)](docs/DATABASE_SCHEMA.md)
- [AI Discovery & Engagement Agents](docs/AI_AGENTS.md)
- [REST API Reference](docs/API_REFERENCE.md)
- [External Integration Guide](docs/INTEGRATION_GUIDE.md)
- [Security & Privacy Guide](docs/SECURITY_AND_PRIVACY.md)
- [Developer & Testing Guide](docs/DEV_GUIDE.md)
- [Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Student User Manual](docs/USER_MANUAL.md)
- [Administrator Manual](docs/ADMIN_MANUAL.md)
- [Final Project Report](docs/FINAL_PROJECT_REPORT.md)

