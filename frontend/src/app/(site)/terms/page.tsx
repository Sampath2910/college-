export const metadata = {
  title: "Terms of Service & Academic Code",
  description: "Terms and conditions governing the use of ProjectShelf and our academic integrity policies.",
};

export default function TermsPage() {
  return (
    <div className="page py-10 sm:py-16 max-w-3xl prose-page">
      <p className="ref">Legal & Integrity</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-5xl font-display">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground font-mono">Last updated: November 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using ProjectShelf, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue using the service immediately.
      </p>

      <h2>2. Academic Integrity Policy</h2>
      <p>
        ProjectShelf is an educational discovery and mentorship platform. All projects presented in our catalogue originate from public open-source platforms and are shared under their respective open-source licences.
      </p>
      <ul>
        <li>You agree to use our platform and mentorship as educational references and study blueprints.</li>
        <li>You agree not to misrepresent open-source code as your own original work in violation of your university or college academic code of conduct.</li>
        <li>You are solely responsible for ensuring that your college project submissions adhere to your educational institution's guidelines on attribution, originality, and plagiarism.</li>
      </ul>

      <h2>3. Intellectual Property & Source Attribution</h2>
      <p>
        All rights to original codebases, datasets, and repositories remain with their respective copyright holders on GitHub, Kaggle, or the source platforms. ProjectShelf does not claim ownership over any indexed third-party open-source materials.
      </p>

      <h2>4. Mentorship Services & Quotations</h2>
      <p>
        Consultation, environment debugging, and custom development services are provided on a best-effort professional basis. All quotations are communicated transparently before any paid work begins. We do not guarantee specific academic grades or examination results, as final academic grading is solely the prerogative of your institution's evaluators.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        ProjectShelf provides the catalogue "as is" without warranty of any kind. Under no circumstances shall ProjectShelf be held liable for disciplinary actions taken by academic institutions resulting from a student's failure to adhere to their university's citation or academic policies.
      </p>
    </div>
  );
}

