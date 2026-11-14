import Link from "next/link";
import { HelpCircle, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Frequently Asked Questions",
  description: "Find answers to questions about using open source projects for college submissions, viva preparation, and project guidance.",
};

const FAQS = [
  {
    q: "Can I submit an open-source project as my university Minor or Major project?",
    a: "Open-source software provides excellent foundational architectures and reference implementations. However, academic integrity requires transparency: you must never copy a repository and claim you authored the entire base code. Universities expect you to understand the system thoroughly, customize or build upon it (adding features, novel datasets, performance enhancements, or new user interfaces), and appropriately cite the open-source authors in your bibliography.",
  },
  {
    q: "How does ProjectShelf ensure the code is safe and legitimate?",
    a: "Every project in our catalogue is indexed from authorized GitHub and Kaggle APIs. We check that repositories have permissive open-source licences (MIT, Apache 2.0, BSD, GPL, etc.), active code trees, and pass automated heuristic checks that filter out malware, empty placeholders, and tutorial repos.",
  },
  {
    q: "How do I choose between a Minor project and a Major project?",
    a: "A Minor project (usually in 5th or 6th semester) typically focuses on building a functional prototype or implementing a specific algorithm with 1-2 core modules. A Major project (in 7th or 8th semester) requires a comprehensive, end-to-end system including robust database models, security, testing, deployment, and often comparative performance evaluations or novel research findings.",
  },
  {
    q: "What does the Viva Voce preparation service include?",
    a: "During university viva examinations, external examiners will ask you deep technical questions: 'Why did you choose MongoDB over PostgreSQL?', 'Explain how this JWT authentication token is verified in your middleware', or 'Walk me through this backpropagation equation'. Our mentors conduct mock viva sessions, teach you how to explain your code with confidence, and provide lists of the top 30 questions examiners ask for your specific technology stack.",
  },
  {
    q: "Will you do my college project for me?",
    a: "No. We believe in genuine learning. We provide technical mentorship, resolve frustrating environment and setup errors, teach you how the architecture works, and assist with custom extensions. We want you to stand before your college jury with full understanding of what you built.",
  },
  {
    q: "What are your payment terms and refund policies for mentorship?",
    a: "All catalogue discovery, searching, and blueprint reading is free. If you request personalized 1-on-1 mentorship, environment debugging, or custom feature development, we provide a transparent written quotation upfront. You only pay after you review and approve the scope.",
  },
  {
    q: "What programming languages and frameworks are covered?",
    a: "Our catalogue covers all major modern stacks: Python (Django, FastAPI, Flask, PyTorch, TensorFlow), Java (Spring Boot, Hibernate, Android), JavaScript/TypeScript (React, Next.js, Node.js, Vue, Angular), Flutter/Dart, PHP (Laravel), C++, Go, and SQL databases.",
  },
  {
    q: "Can I request assistance over WhatsApp?",
    a: "Yes! When submitting an enquiry or registering for mentorship, you can select WhatsApp as your preferred communication channel for fast, asynchronous doubt resolution with our technical mentors.",
  },
];

export default function FaqPage() {
  return (
    <div className="page py-10 sm:py-16 max-w-4xl">
      <div className="text-center">
        <p className="ref">Help & Guidance</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Frequently Asked Questions</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Everything you need to know about academic projects, source code attribution, and our mentorship services.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {FAQS.map((faq, i) => (
          <details
            key={i}
            className="group rounded-xl border border-border/80 bg-card p-6 open:border-primary/50 transition-colors"
          >
            <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-foreground">
              <span>{faq.q}</span>
              <span className="ml-4 shrink-0 font-mono text-muted-foreground transition-transform group-open:rotate-180">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-xs leading-relaxed text-foreground/80 sm:text-sm">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-12">
        <HelpCircle className="size-10 text-primary" />
        <h2 className="mt-3 text-2xl font-bold">Have a question not listed here?</h2>
        <p className="mt-2 max-w-md text-xs text-muted-foreground sm:text-sm">
          Our team of student advisors and software engineers is here to help with your academic project questions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/enquire" className="btn-primary">
            Submit a Question
          </Link>
          <Link href="/contact" className="btn-outline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

