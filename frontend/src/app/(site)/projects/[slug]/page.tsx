import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { AcademicPackages } from "@/components/academic-packages";
import { BookmarkButton } from "@/components/bookmark-button";
import { ProjectGrid } from "@/components/project-card";
import { ProjectEnquiryDrawer } from "@/components/project-enquiry-drawer";
import { fmtDate, fmtNumber } from "@/lib/format";
import { publicGet } from "@/lib/server-api";
import { site } from "@/lib/site";
import { DIFFICULTIES, PROJECT_TYPES, type ProjectDetail } from "@/lib/types";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await publicGet<ProjectDetail>(`/projects/${slug}`);
  if (!project) return { title: "Project not found", robots: { index: false } };
  const description = project.card.shortDescription ?? `${project.card.title}: source, licence and technologies.`;
  return {
    title: project.card.title,
    description: description.slice(0, 160),
    alternates: { canonical: `/projects/${slug}` },
    openGraph: { title: project.card.title, description: description.slice(0, 200), url: `/projects/${slug}`, type: "article" },
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-7">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground/85">
          <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-primary/70" />
          <span className="[overflow-wrap:anywhere]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await publicGet<ProjectDetail>(`/projects/${slug}`);
  if (!project) notFound();

  const { card, similar } = project;
  const github = card.platformCode === "GITHUB";
  const hasWriteUp = Boolean(project.overview || project.problemStatement || project.features?.length || project.objectives?.length || project.modules?.length);

  const facts: [string, React.ReactNode][] = [
    ["Author", project.authorUrl ? <a href={project.authorUrl} target="_blank" rel="noopener noreferrer nofollow" className="link">{project.authorName ?? "View profile"}</a> : (project.authorName ?? "Not stated")],
    ["Source", card.platform],
    ["Licence", project.licenceUrl ? <a href={project.licenceUrl} target="_blank" rel="noopener noreferrer" className="link">{project.licenceName ?? card.licence}</a> : (project.licenceName ?? card.licence ?? "Not stated by the author")],
    ["Type", PROJECT_TYPES[card.projectType] ?? card.projectType],
    ...(card.difficulty ? ([["Difficulty", `${DIFFICULTIES[card.difficulty] ?? card.difficulty} (our estimate)`]] as [string, React.ReactNode][]) : []),
    ...(card.primaryLanguage ? ([["Main language", card.primaryLanguage]] as [string, React.ReactNode][]) : []),
    ...(card.stars != null ? ([[github ? "GitHub stars" : "Kaggle votes", fmtNumber(card.stars)]] as [string, React.ReactNode][]) : []),
    ...(github && project.forks != null ? ([["Forks", fmtNumber(project.forks)]] as [string, React.ReactNode][]) : []),
    ...(card.sourceUpdatedAt ? ([["Last source update", fmtDate(card.sourceUpdatedAt)]] as [string, React.ReactNode][]) : []),
    ...(project.lastVerifiedAt ? ([["Source link checked", fmtDate(project.lastVerifiedAt)]] as [string, React.ReactNode][]) : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": card.projectType === "DATASET" ? "Dataset" : card.projectType === "SOFTWARE_PROJECT" ? "SoftwareSourceCode" : "CreativeWork",
    name: card.title,
    description: card.shortDescription ?? undefined,
    url: `${site.url}/projects/${card.slug}`,
    ...(project.sourceUrl ? { [card.projectType === "SOFTWARE_PROJECT" ? "codeRepository" : "sameAs"]: project.sourceUrl } : {}),
    ...(project.authorName ? { author: { "@type": "Person", name: project.authorName } } : {}),
    ...(project.licenceUrl ? { license: project.licenceUrl } : {}),
    ...(card.primaryLanguage ? { programmingLanguage: card.primaryLanguage } : {}),
  };

  return (
    <div className="page py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-6 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/projects" className="shrink-0 hover:text-foreground">Projects</Link>
        {card.categorySlug && (
          <>
            <ChevronRight className="size-3 shrink-0 text-border" aria-hidden />
            <Link href={`/projects?category=${card.categorySlug}`} className="shrink-0 hover:text-foreground">{card.category}</Link>
          </>
        )}
        <ChevronRight className="size-3 shrink-0 text-border" aria-hidden />
        <span className="truncate text-foreground" aria-current="page">{card.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
        {/* Reading column */}
        <div className="min-w-0 space-y-9">
          <header>
            <p className="ref flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{card.platform}</span>
              <span aria-hidden className="text-border">/</span>
              <span>{PROJECT_TYPES[card.projectType] ?? card.projectType}</span>
              {card.featured && <span className="rounded-sm bg-ochre-soft px-2 py-0.5 text-ochre">Featured</span>}
            </p>
            <h1 className="mt-3 text-4xl leading-[1.08] [overflow-wrap:anywhere] sm:text-5xl">{card.title}</h1>
            {card.shortDescription && (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">{card.shortDescription}</p>
            )}
            {project.authorName && (
              <p className="mt-4 text-sm text-muted-foreground">
                By <span className="text-foreground">{project.authorName}</span> on {card.platform}
              </p>
            )}
            {card.technologies.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
                {card.technologies.map((tech) => (
                  <li key={tech}>
                    <Link href={`/search?q=${encodeURIComponent(tech)}`} className="inline-block rounded-md border bg-card px-2.5 py-1 font-mono text-xs transition-colors hover:border-foreground/40">
                      {tech}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </header>

          {!hasWriteUp && (
            <p className="rounded-md border border-dashed bg-card p-5 text-sm leading-relaxed text-foreground/75">
              This entry shows what the author published about the project. We have not written a detailed overview for it yet, so the
              original source is the best place to read its documentation.
            </p>
          )}

          {project.overview && (
            <Section title="Overview">
              <div className="max-w-2xl space-y-4 text-[0.9375rem] leading-relaxed whitespace-pre-line text-foreground/85">{project.overview}</div>
            </Section>
          )}
          {project.problemStatement && (
            <Section title="Problem it addresses">
              <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-foreground/85">{project.problemStatement}</p>
            </Section>
          )}
          {project.objectives?.length > 0 && <Section title="Objectives"><Bullets items={project.objectives} /></Section>}
          {project.features?.length > 0 && <Section title="Features"><Bullets items={project.features} /></Section>}
          {project.modules?.length > 0 && <Section title="Modules"><Bullets items={project.modules} /></Section>}

          {project.screenshots?.length > 0 && (
            <Section title="Screenshots">
              <div className="grid gap-4 sm:grid-cols-2">
                {project.screenshots.map((shot) => (
                  <figure key={shot.url}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- third-party hosts vary per project; lazy-loaded */}
                    <img src={shot.url} alt={`Screenshot of ${card.title}`} loading="lazy" decoding="async" className="w-full rounded-md border" />
                    {shot.attribution && <figcaption className="mt-1.5 text-xs text-muted-foreground">{shot.attribution}</figcaption>}
                  </figure>
                ))}
              </div>
            </Section>
          )}

          <div className="border-t pt-9">
            <AcademicPackages projectId={card.id} projectTitle={card.title} packages={project.packages} />
          </div>
        </div>

        {/* Facts and actions */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-foreground/25 bg-card p-5">
            {project.sourceUrl && (
              <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary w-full">
                View original on {card.platform} <ArrowUpRight aria-hidden />
              </a>
            )}
            <div className="mt-2 grid gap-2">
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline w-full">
                  Project website <ArrowUpRight aria-hidden />
                </a>
              )}
              {project.documentationUrl && (
                <a href={project.documentationUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline w-full">
                  Documentation <ArrowUpRight aria-hidden />
                </a>
              )}
              <BookmarkButton projectId={card.id} title={card.title} />
            </div>
            <dl className="mt-5 divide-y divide-border/70 border-t border-border/70 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 text-right [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            {!card.licence && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                No licence is stated, so reuse rights are not granted by default. Ask the author before reusing the code.
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-secondary/50 p-5">
            <h2 className="font-sans text-base font-semibold tracking-normal">Want help with this project?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
              Ask about running it, customising it, building something similar, or preparing documentation and slides. We reply with a quotation first.
            </p>
            <div className="mt-4 grid gap-2">
              <ProjectEnquiryDrawer projectId={card.id} projectTitle={card.title} buttonText="Ask about this project" className="btn-primary w-full" />
              <a href="#packages" className="btn-outline w-full">See support packages</a>
            </div>
          </div>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            This project belongs to its author. Use it within its licence, credit it, and follow your institution&apos;s rules on originality.
          </p>
        </aside>
      </div>

      {similar?.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl">Similar projects</h2>
            {card.categorySlug && (
              <Link href={`/projects?category=${card.categorySlug}`} className="text-sm font-medium text-primary hover:underline hover:underline-offset-4">
                More in {card.category}
              </Link>
            )}
          </div>
          <ProjectGrid cards={similar.slice(0, 3)} />
        </section>
      )}
    </div>
  );
}
