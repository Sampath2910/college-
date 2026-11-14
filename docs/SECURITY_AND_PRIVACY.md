# Security & Privacy Architecture — ProjectShelf

ProjectShelf implements defense-in-depth principles across transport, authentication, authorization, and data lifecycle management.

---

## 1. Security Architecture & Threat Mitigations

### 1.1 First-Party Session Isolation & CSRF
- **Session Cookies**: Handled as `HttpOnly`, `SameSite=Lax`, and `Secure` (in production). JavaScript cannot access the session token.
- **Double Submit CSRF**: All modifying requests (`POST`, `PUT`, `DELETE`) require the `X-XSRF-TOKEN` header matching the issued `XSRF-TOKEN` cookie.
- **Strict Prefix Authorization**: Handled directly in `SecurityConfig.java`:
  - `/api/public/**`: Open to anonymous visitors.
  - `/api/student/**`: Enforces `hasRole('STUDENT')`.
  - `/api/admin/**`: Enforces `hasRole('ADMIN')`.
  - All other routes denied by default.

### 1.2 Rate Limiting & DoS Protection
- Sensitive endpoints (login, registration, enquiry submission) are protected by in-memory rate limiting filters configured at 10 requests per minute per IP.
- The enquiry form includes a hidden honeypot field (`website`). Any request with this field populated is discarded silently without storing records or sending notifications.

### 1.3 Content Security & Headers
- Strict security headers configured on all Next.js responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 2. Privacy & Data Protection Compliance (GDPR / Indian DPDP)

### 2.1 Affirmative Consent Model
- User registration requires explicit opt-in for:
  - Activity tracking (`activityConsent`)
  - Email digests (`emailConsent`)
  - WhatsApp alerts (`whatsappConsent`)
- All consent updates are immutably logged with timestamp, user ID, context, and legal wording version in `consent_audit_logs`.

### 2.2 Right to be Forgotten (Data Erasure)
- Students can trigger account deletion directly from `/student/settings`.
- When triggered:
  - Outgoing communications and activity tracking cease immediately.
  - An administrator executes permanent deletion or anonymization of user records from the admin portal.

### 2.3 Immutable Audit Logging
- Every administrative action (publishing projects, issuing quotations, modifying thresholds, running jobs) is recorded in `audit_logs` with the actor's email, target entity, action code, and timestamp.

