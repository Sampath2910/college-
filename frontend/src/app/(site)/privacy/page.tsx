export const metadata = {
  title: "Privacy Policy & Data Protection",
  description: "How ProjectShelf collects, stores, protects, and respects student personal data and communication preferences.",
};

export default function PrivacyPage() {
  return (
    <div className="page py-10 sm:py-16 max-w-3xl prose-page">
      <p className="ref">Privacy & Consent</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-5xl font-display">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground font-mono">Last updated: November 2026</p>

      <h2>1. Introduction & Core Philosophy</h2>
      <p>
        ProjectShelf is dedicated to academic project discovery and mentorship for college students. We respect your personal privacy. We do not sell your data, we do not share student profiles with third-party advertising networks, and we strictly require opt-in consent before tracking your activity or sending recommendations.
      </p>

      <h2>2. Data We Collect</h2>
      <p>Depending on how you use our platform, we collect:</p>
      <ul>
        <li><strong>Account Information:</strong> When you register as a student, we store your full name, email address, password hash (salted using bcrypt), college/university name, and optional phone number.</li>
        <li><strong>Enquiry Details:</strong> When you request project assistance, we store your requirements, preferred communication channel (Email or WhatsApp), and the associated project ID.</li>
        <li><strong>Activity & Interests (Opt-in only):</strong> If you grant activity consent, we record anonymous interaction telemetry (viewed projects, searched technologies, bookmarked cards) solely to compute personalized project recommendations.</li>
      </ul>

      <h2>3. Legal Basis & Consent Management</h2>
      <p>
        Under modern data protection regulations (including GDPR and Indian DPDP Act guidelines), all personalized communications (recommendation emails, WhatsApp notifications) require your explicit, affirmative consent.
      </p>
      <p>
        You can review, modify, or revoke your communication and activity consent at any time from your <strong>Student Settings</strong> page, or by clicking the one-click unsubscribe link present in every email.
      </p>

      <h2>4. Right to Deletion & Account Erasure</h2>
      <p>
        You have the complete right to be forgotten. When you request account deletion from your student settings, your personal identifying records, communication logs, and interest profiles are permanently removed or anonymized in our databases.
      </p>

      <h2>5. Security Standards</h2>
      <p>
        We employ robust technical safeguards including HTTPS everywhere, HTTP-only secure session cookies, CSRF protection, rate limiting against brute force attacks, and strict role-based access control.
      </p>

      <h2>6. Contact Our Privacy Team</h2>
      <p>
        If you have questions regarding your data or wish to exercise your privacy rights, please email us at <a href="mailto:privacy@projectshelf.com">privacy@projectshelf.com</a>.
      </p>
    </div>
  );
}

