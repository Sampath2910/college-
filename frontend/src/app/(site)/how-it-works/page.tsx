import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, Database, GitBranch, GraduationCap, Laptop, Lightbulb, Search, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "How ProjectShelf Works — From Discovery to Viva Defense",
  description: "Learn how ProjectShelf curates public open-source software, verifies repository quality, and supports students through college project submissions.",
};

export default function HowItWorksPage() {
  return (
    <div className="page py-10 sm:py-16">
      <div className="max-w-3xl">
        <p className="ref">Process & Methodology</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">How ProjectShelf Works</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          A transparent look into how we discover, analyse, score, and present real-world projects to university students.
        </p>
      </div>

      {/* 4 Major Phases */}
      <div className="mt-16 space-y-12">
        {/* Step 1 */}
        <div className="grid gap-6 rounded-2xl border border-border/80 bg-card p-8 md:grid-cols-12 md:items-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary font-mono md:col-span-2">
            01
          </div>
          <div className="space-y-2 md:col-span-10">
            <span className="ref text-primary">Automated Discovery</span>
            <h2 className="text-2xl font-bold">1. Continuous Multi-Platform Discovery</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Our automated background discovery agents continuously query official, authorized APIs from GitHub and Kaggle. We scan for university-level topics, trending student project repositories, and research implementations across 20 distinct technical domains.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-mono">Official GitHub REST API</span>
              <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-mono">Kaggle Public API</span>
              <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-mono">Strict Permissive Licences</span>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="grid gap-6 rounded-2xl border border-border/80 bg-card p-8 md:grid-cols-12 md:items-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary font-mono md:col-span-2">
            02
          </div>
          <div className="space-y-2 md:col-span-10">
            <span className="ref text-primary">AI & Heuristic Analysis</span>
            <h2 className="text-2xl font-bold">2. Deep Extraction & Quality Scoring</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every discovered project undergoes automated quality verification and classification:
            </p>
            <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-primary shrink-0" />
                <span>Filters out "awesome lists" & framework boilerplate</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-primary shrink-0" />
                <span>Extracts Problem Statement, Scope & Objectives</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-primary shrink-0" />
                <span>Identifies programming languages and frameworks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-primary shrink-0" />
                <span>Calculates 100-point composite quality index</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="grid gap-6 rounded-2xl border border-border/80 bg-card p-8 md:grid-cols-12 md:items-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary font-mono md:col-span-2">
            03
          </div>
          <div className="space-y-2 md:col-span-10">
            <span className="ref text-primary">Editorial Approval</span>
            <h2 className="text-2xl font-bold">3. Human Review & Catalogue Publication</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Before appearing in our public library, each project is queued in our secure administrator portal. Our engineering review team verifies that the repository is active, documentation is clear, and the project is academically sound for college submission.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="grid gap-6 rounded-2xl border border-border/80 bg-card p-8 md:grid-cols-12 md:items-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary font-mono md:col-span-2">
            04
          </div>
          <div className="space-y-2 md:col-span-10">
            <span className="ref text-primary">Mentorship & Viva Voce</span>
            <h2 className="text-2xl font-bold">4. Student Guidance & Academic Support</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Students can browse for free, bookmark projects into personalized lists, and request 1-on-1 mentorship. We help with database configuration, debugging compile issues, understanding tricky lines of code, and preparing for viva questions.
            </p>
            <div className="pt-2">
              <Link href="/projects" className="btn-primary btn-sm">
                <span>Start Browsing Now</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
