import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroArt } from "@/components/hero-art";
import { ProjectGrid } from "@/components/project-card";
import { SearchBox } from "@/components/search-box";
import { publicGet } from "@/lib/server-api";
import { site } from "@/lib/site";
import { type Home } from "@/lib/types";

export const revalidate = 60;

const STEPS = [
  ["Browse the catalogue", "Search by topic or technology, or start from a category. Every entry says where it came from and what kind of resource it is."],
  ["Read before you decide", "Each page lists the technologies, the licence the author chose and a link to the original source, so you can judge it yourself."],
  ["Ask when you want help", "Send an enquiry to get help running, understanding, customising or building something similar. We reply with a quotation first."],
];

const SERVICES = [
  ["Getting a project running", "Setup guidance for your own machine: databases, dependencies and configuration."],
  ["Customisation", "Changes to features, design or technology so the project fits your brief."],
  ["A similar project", "A new build that takes a listed project as its reference point."],
  ["Documentation and slides", "Help structuring your report and presentation, with the original work credited."],
  ["Understanding the code", "Walkthroughs of the architecture and code so you can explain it in your own words."],
];

const FAQ = [
  ["Who owns the projects listed here?", `Their original authors. ${site.name} is a catalogue: we describe publicly available projects and link to them. We do not own them, and each one keeps the licence its author gave it.`],
  ["Can I submit a listed project as my own work?", "No. You can study a project, build on it within its licence, and credit it. What counts as acceptable use in your course is decided by your institution, so check its rules on originality and attribution first."],
  ["Have you tested these projects?", "Not unless a listing says so. Listings are based on what the author published. Stars and recent updates are shown for information; they are not proof that a project works."],
  ["What does it cost?", "Browsing is free. Paid help is quoted individually after we understand what you need, and nothing is charged until you have agreed to the quotation."],
  ["What if a project has no licence?", "Then the author has not granted reuse rights, and the listing says the licence is not stated. You can still read it at the source, but ask the author before reusing the code."],
];

function SectionHead({ label, title, href, link }: { label: string; title: string; href?: string; link?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="ref">{label}</p>
        <h2 className="mt-1.5 text-3xl sm:text-[2.1rem]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline hover:underline-offset-4">
          {link} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const home = await publicGet<Home>("/home");
  const recent = home?.recent ?? [];
  const featured = home?.featured ?? [];
  const categories = (home?.categories ?? []).filter((c) => c.projectCount > 0);
  const technologies = (home?.technologies ?? []).slice(0, 18);
  const total = home?.totalPublished ?? 0;

  return (
    <>
      {/* Hero: statement and search on the left, a real catalogue entry on the right */}
      <section className="border-b">
        <div className="page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <p className="ref">
              Project catalogue{total > 0 && <> · {total} {total === 1 ? "entry" : "entries"} listed</>}
            </p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl">
              Find a project <span className="italic text-primary">worth building on.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/75">
              Open-source projects, notebooks and datasets from GitHub and Kaggle, organised for college minor and major projects.
              Each entry shows its author, source and licence. Ask us when you want help with one.
            </p>
            <SearchBox size="lg" className="mt-8 max-w-xl" />
            {categories.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <span className="ref">Start with</span>
                {categories.slice(0, 5).map((c) => (
                  <Link key={c.slug} href={`/projects?category=${c.slug}`} className="link text-foreground/80">{c.name}</Link>
                ))}
              </p>
            )}
          </div>
          <HeroArt />
        </div>
      </section>

      {home === null && (
        <div className="page mt-10">
          <p role="status" className="rounded-md border border-dashed bg-card p-5 text-sm text-muted-foreground">
            The catalogue could not be loaded just now. Please refresh in a moment.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <section className="page pt-16 sm:pt-20">
          <SectionHead label="Index" title="Browse by category" href="/categories" link="All categories" />
          <ol className="grid grid-cols-1 border-t sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {categories.map((c, i) => (
              <li key={c.slug} className="min-w-0 border-b">
                <Link href={`/projects?category=${c.slug}`} className="group flex items-baseline gap-4 py-4">
                  <span className="ref w-6 shrink-0 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-lg decoration-primary/50 underline-offset-4 group-hover:underline">{c.name}</span>
                    {c.description && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{c.description}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{c.projectCount}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {featured.length > 0 && (
        <section className="page pt-16 sm:pt-20">
          <SectionHead label="Picked by our team" title="Featured projects" href="/projects" link="All projects" />
          <ProjectGrid cards={featured.slice(0, 3)} />
        </section>
      )}

      {recent.length > 0 && (
        <section className="page pt-16 sm:pt-20">
          <SectionHead label="Latest entries" title="Recently added" href="/projects?sort=newest" link="See the newest" />
          <ProjectGrid cards={recent.slice(0, 6)} />
        </section>
      )}

      {technologies.length > 0 && (
        <section className="page pt-16 sm:pt-20">
          <SectionHead label="Stacks" title="Browse by technology" />
          <ul className="flex flex-wrap gap-2">
            {technologies.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/projects?technology=${t.slug}`}
                  className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 font-mono text-[0.8125rem] transition-colors hover:border-foreground/40"
                >
                  {t.name}
                  <span className="text-muted-foreground tabular-nums">{t.projectCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* How it works: three steps set as a ruled row, not three boxes */}
      <section className="page pt-20 sm:pt-28">
        <SectionHead label="How it works" title="From browsing to building" href="/how-it-works" link="The full process" />
        <ol className="grid border-t md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="border-b py-7 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0">
              <span aria-hidden className="font-display text-5xl leading-none text-primary/25">{i + 1}</span>
              <h3 className="mt-4 text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/75">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Services */}
      <section className="page grid gap-10 pt-20 sm:pt-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="ref">Services</p>
          <h2 className="mt-1.5 text-3xl sm:text-[2.1rem]">Help that leaves you able to explain your own project</h2>
          <p className="mt-4 leading-relaxed text-foreground/75">
            We work from your requirements and send a quotation before anything starts. We do not promise marks or approval; that depends on your work and your institution.
          </p>
          <Link href="/services" className="btn-outline mt-6">See all services</Link>
        </div>
        <ul className="border-t">
          {SERVICES.map(([title, text]) => (
            <li key={title} className="grid gap-1 border-b py-4 sm:grid-cols-[15rem_1fr] sm:gap-6">
              <h3 className="font-sans text-base font-medium tracking-normal">{title}</h3>
              <p className="text-sm leading-relaxed text-foreground/75">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Transparency */}
      <section className="mt-20 bg-ink text-[#f1ede3] sm:mt-28">
        <div className="page grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-[#f1ede3]/60 uppercase">Transparency</p>
            <h2 className="mt-1.5 text-3xl sm:text-[2.1rem]">What we show, and what we do not claim</h2>
          </div>
          <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {[
              ["Original source, always", "Every entry links to where the project was published and names its author."],
              ["The author's licence", "We show the licence the author chose. If none is stated, we say so instead of guessing."],
              ["No ownership claims", "Listed projects are not ours, and we do not sell other people's code."],
              ["No untested promises", "We do not describe a project as tested or working unless we have actually checked it."],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-[#f1ede3]/20 pt-4">
                <dt className="font-display text-lg">{t}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#f1ede3]/70">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="page grid gap-10 pt-20 sm:pt-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="ref">Questions</p>
          <h2 className="mt-1.5 text-3xl sm:text-[2.1rem]">Before you ask</h2>
          <Link href="/faq" className="link mt-4 inline-block text-sm">More questions and answers</Link>
        </div>
        <div className="border-t">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="font-mono text-lg text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-relaxed text-foreground/75">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="page pt-20 sm:pt-28">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-foreground/25 bg-card p-8 sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl">Have a project in mind?</h2>
            <p className="mt-2 max-w-xl text-foreground/75">Tell us what you are trying to build. We will read it and reply with what we can do and what it would cost.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/enquire" className="btn-primary h-11 px-5">Send an enquiry</Link>
            <Link href="/projects" className="btn-outline h-11 px-5">
              Browse projects <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
