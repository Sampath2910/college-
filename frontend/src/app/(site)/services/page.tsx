import Link from "next/link";
import { CheckCircle2, Code, Cpu, GraduationCap, HelpCircle, Laptop, Layers, MessageSquare, ShieldCheck, Terminal, Wrench } from "lucide-react";
import { ProjectEnquiryDrawer } from "@/components/project-enquiry-drawer";

export const metadata = {
  title: "Academic Project Services & Mentorship",
  description: "Comprehensive assistance for college minor and major projects: environment setup, viva voce preparation, architecture walkthroughs, and custom development.",
};

const SERVICES = [
  {
    icon: Laptop,
    title: "Environment Setup & Execution",
    serviceType: "SETUP_ASSISTANCE",
    tagline: "Resolve database, runtime, and dependency errors on your laptop.",
    features: [
      "Local MySQL, PostgreSQL, or MongoDB installation and database seeding",
      "Node.js, Python virtualenv, and Java/Maven version mismatch debugging",
      "Docker containerization for trouble-free project demonstrations",
      "Step-by-step local execution instructions tailored to Windows/macOS/Linux",
    ],
  },
  {
    icon: GraduationCap,
    title: "Viva Voce & Technical Defense Prep",
    serviceType: "VIVA_PREPARATION",
    tagline: "Prepare to explain your own project clearly.",
    features: [
      "1-on-1 mock viva sessions with seasoned software engineers",
      "Practice questions for your stack, with pointers on how to reason about them",
      "Deep explanation of complex algorithms, ML pipelines, and data structures",
      "Confidence-building tips for live code demonstration and edge-case handling",
    ],
  },
  {
    icon: Code,
    title: "Code Walkthrough & Explanation",
    serviceType: "CODE_WALKTHROUGH",
    tagline: "Understand every controller, model, schema, and API endpoint.",
    features: [
      "Line-by-line or module-by-module guided walkthrough over screen share",
      "Data flow tracing from frontend UI to backend controllers and database queries",
      "Explanation of third-party libraries, APIs, and authentication mechanics",
      "Architectural block diagrams and flowcharts for your project report",
    ],
  },
  {
    icon: Wrench,
    title: "Custom Feature Development",
    serviceType: "CUSTOMISATION",
    tagline: "Expand an existing open-source project with custom college requirements.",
    features: [
      "Adding novel algorithms, neural network layers, or user roles",
      "Integrating SMS, Email, Payment gateways, or external REST APIs",
      "Designing responsive modern frontend dashboards and UI redesigns",
      "Modifying dataset schemas and adapting to local university problem statements",
    ],
  },
  {
    icon: Layers,
    title: "End-to-End Project Implementation",
    serviceType: "FULL_IMPLEMENTATION",
    tagline: "Complete turnkey development from system requirement specification to deployment.",
    features: [
      "Full-stack web or mobile application developed to your college syllabus",
      "Comprehensive SRS, UML class diagrams, ER diagrams, and test plans",
      "Clean, modular, documented source code adhering to industry standards",
      "Full deployment to cloud platforms (Vercel, Railway, Render, AWS)",
    ],
  },
  {
    icon: HelpCircle,
    title: "General Technical Consultation",
    serviceType: "GENERAL",
    tagline: "Topic selection, feasibility review, and technology stack guidance.",
    features: [
      "Project topic viability assessment and novelty validation",
      "Guidance on choosing between Minor and Major project scopes",
      "Technology recommendations (React vs. Next.js, Spring Boot vs. FastAPI)",
      "Continuous asynchronous doubt resolution via WhatsApp and email",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="page py-10 sm:py-16">
      {/* Header */}
      <div className="max-w-3xl">
        <p className="ref">Professional Academic Guidance</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Project Support Services</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          We bridge the gap between academic theory and real-world software engineering.
          Get personalized, transparent technical mentorship tailored for college students.
        </p>
      </div>

      {/* Services Grid */}
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-xs"
            >
              <div>
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </span>
                <h2 className="mt-4 text-xl font-bold text-foreground">{s.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.tagline}</p>

                <ul className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs text-foreground/80">
                  {s.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 shrink-0 text-primary mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-border/60 pt-4">
                <ProjectEnquiryDrawer
                  buttonText="Request this Service"
                  className="btn-outline btn-sm w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Integrity Pledge */}
      <div className="mt-16 rounded-2xl border border-border/80 bg-secondary/30 p-8 sm:p-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-4" />
              <span>Academic integrity</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Learning First, Always.</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Our mission is to help you truly learn and understand software development. We do not promote unethical plagiarism. Every consultation is focused on teaching you how the code operates so you can author, debug, explain, and defend your work with genuine knowledge.
            </p>
          </div>
          <Link href="/enquire" className="btn-primary shrink-0">
            Submit a Custom Enquiry
          </Link>
        </div>
      </div>
    </div>
  );
}

