import Link from "next/link";
import { CheckCircle2, GraduationCap, Heart, Layers, ShieldCheck, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "About Us — The Story Behind ProjectShelf",
  description: "ProjectShelf empowers university students to discover, understand, and build academic projects with integrity and real-world engineering depth.",
};

export default function AboutPage() {
  return (
    <div className="page py-10 sm:py-16 max-w-4xl">
      <div className="max-w-3xl">
        <p className="ref">Our Mission</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Empowering the Next Generation of Engineers</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          ProjectShelf was born out of a critical reality in higher education: students are expected to deliver complex, production-grade software projects, yet often lack practical guidance, reliable architectures, and transparent mentorship.
        </p>
      </div>

      <div className="mt-12 space-y-8 text-sm leading-relaxed text-foreground/85">
        <section className="rounded-xl border border-border/80 bg-card p-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Why We Built ProjectShelf</h2>
          <p className="mt-3">
            Every year, millions of computer science and IT students scour the internet for final-year project ideas. Too often, they encounter broken GitHub repositories with missing READMEs, obsolete dependencies, or predatory project mills selling recycled ZIP files without explanations.
          </p>
          <p className="mt-3">
            When viva day arrives, students who bought blind code freeze under questioning from university examiners. We believe there is a vastly superior way: <strong>transparent open-source curation combined with genuine technical mentorship</strong>.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold">Transparency</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Every listing attributes original authors, repository URLs, and licences clearly. We do not claim ownership of open-source projects.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold">Quality First</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Automated heuristics score documentation depth, code cleanliness, and active maintenance so you do not waste time on dead repositories.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold">Viva Defense Ready</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              We focus on helping you understand the code you run, ensuring you can explain every endpoint and schema during your viva examination.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Our Academic Integrity Pledge</h2>
          <p className="mt-3">
            We operate strictly within university ethical boundaries. Our mentorship services exist to explain concepts, guide architecture choices, help troubleshoot environment setup, and provide mock viva questions.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/projects" className="btn-primary">
              Explore Our Project Library
            </Link>
            <Link href="/contact" className="btn-outline">
              Get in Touch With Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

