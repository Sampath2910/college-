# Integration Guide — ProjectShelf

This guide outlines the credentials, setup steps, and verification commands for all 5 external services integrated into ProjectShelf.

---

## 1. GitHub API Integration
- **Purpose**: Crawl open-source student repositories, read READMEs, track stars and commit updates.
- **Environment Variable**: `GITHUB_TOKEN`
- **Setup**:
  1. Navigate to https://github.com/settings/tokens
  2. Generate a fine-grained or classic token with `public_repo` (read-only) scope.
  3. Add `GITHUB_TOKEN=ghp_...` to `.env`.
- **Live Verification**: Run `POST /api/admin/integrations/GITHUB/test` from the Admin console.

---

## 2. Kaggle API Integration
- **Purpose**: Index datasets, Jupyter notebooks, and machine learning models.
- **Environment Variables**:
  - `KAGGLE_USERNAME`
  - `KAGGLE_KEY`
  - `KAGGLE_API_TOKEN`
- **Setup**:
  1. Log in to https://www.kaggle.com/settings/api
  2. Click **Generate New Token** or **Create Legacy API Key**.
  3. Set credentials in `.env`.
- **Live Verification**: Run `POST /api/admin/integrations/KAGGLE/test` from the Admin console.

---

## 3. Anthropic AI Integration (AI Service)
- **Purpose**: Structured problem statement, objectives, and feature module extraction.
- **Environment Variable**: `ANTHROPIC_API_KEY`
- **Setup**:
  1. Obtain key from https://console.anthropic.com
  2. Set `ANTHROPIC_API_KEY=sk-ant-...` in `.env`.
  3. Restart the Python AI microservice.
- **Live Verification**: Run `POST /api/admin/integrations/AI/test` from the Admin console.

---

## 4. Resend Transactional Email
- **Purpose**: Enquiry confirmations, quotations, password resets, and outreach emails.
- **Environment Variables**:
  - `RESEND_API_KEY`
  - `APP_MAIL_FROM` (e.g. `support@yourdomain.com`)
- **Setup**:
  1. Obtain key from https://resend.com/api-keys
  2. Verify your sending domain.
  3. Add to `.env`.
- **Live Verification**: Run `POST /api/admin/integrations/EMAIL/test` from the Admin console.

---

## 5. WhatsApp Cloud API (Meta for Developers)
- **Purpose**: Direct student mentorship notifications and alerts.
- **Environment Variables**:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
- **Setup**:
  1. Create a Meta Developer app under https://developers.facebook.com
  2. Add WhatsApp product, retrieve Phone Number ID and Permanent System User Access Token.
  3. Set values in `.env`.
- **Live Verification**: Run `POST /api/admin/integrations/WHATSAPP/test` from the Admin console.

