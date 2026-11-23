import Link from "next/link";
import { ArrowLeft, ArrowRight, Filter, SlidersHorizontal, X } from "lucide-react";
import { FilterPanel } from "@/components/filter-panel";
import { ProjectGrid } from "@/components/project-card";
import { SearchBox } from "@/components/search-box";
import { SortSelect } from "@/components/sort-select";
import { publicGet } from "@/lib/server-api";
import { PROJECT_TYPES, type Category, type Facets, type Paged, type ProjectCard as Card } from "@/lib/types";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    technology?: string;
    language?: string;
    difficulty?: string;
    platform?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const category = sp.category?.trim() || "";
  const technology = sp.technology?.trim() || "";
  const language = sp.language?.trim() || "";
  const difficulty = sp.difficulty?.trim() || "";
  const platform = sp.platform?.trim() || "";
  const type = sp.type?.trim() || "";
  const sort = sp.sort?.trim() || (q ? "relevance" : "stars");
  const currentPage = Math.max(0, parseInt(sp.page || "0", 10) || 0);
  const pageSize = 12;

  // Build query string for the backend call
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (technology) params.set("technology", technology);
  if (language) params.set("language", language);
  if (difficulty) params.set("difficulty", difficulty);
  if (platform) params.set("platform", platform);
  if (type) params.set("type", type);
  if (sort) params.set("sort", sort);
  params.set("page", currentPage.toString());
  params.set("size", pageSize.toString());

  const [paged, facets, categories] = await Promise.all([
    publicGet<Paged<Card>>(`/projects?${params.toString()}`),
    publicGet<Facets>("/facets"),
    publicGet<Category[]>("/categories"),
  ]);

  const items = paged?.items ?? [];
  const total = paged?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Helper to build links while toggling or modifying filters
  function filterUrl(overrides: Record<string, string | null | undefined>) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (technology) next.set("technology", technology);
    if (language) next.set("language", language);
    if (difficulty) next.set("difficulty", difficulty);
    if (platform) next.set("platform", platform);
    if (type) next.set("type", type);
    if (sort) next.set("sort", sort);

    for (const [key, val] of Object.entries(overrides)) {
      if (val === null || val === undefined || val === "") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    // Reset to page 0 whenever filters change
    if (!("page" in overrides)) {
      next.delete("page");
    }
    const qs = next.toString();
    return `/projects${qs ? `?${qs}` : ""}`;
  }

  const activeFilters = [
    category && { label: `Category: ${category}`, key: "category" },
    technology && { label: `Tech: ${technology}`, key: "technology" },
    language && { label: `Language: ${language}`, key: "language" },
    difficulty && { label: `Difficulty: ${difficulty}`, key: "difficulty" },
    platform && { label: `Source: ${platform === "GITHUB" ? "Code" : platform === "KAGGLE" ? "Datasets" : platform}`, key: "platform" },
    type && { label: `Type: ${PROJECT_TYPES[type] ?? type}`, key: "type" },
  ].filter(Boolean) as { label: string; key: string }[];

  return (
    <div className="page py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ref">Catalogue</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{q ? `Results for “${q}”` : "Projects"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open-source software, notebooks, datasets and models, each shown with its source and licence.
          </p>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-muted-foreground">Sort:</label>
          <SortSelect defaultValue={sort} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="my-6">
        <SearchBox defaultValue={q} placeholder="Search within catalogue (e.g. 'chat app', 'convolutional neural network', 'ecommerce')..." />
      </div>

      {/* Active Filter Badges */}
      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-xs">
          <span className="font-mono text-[0.6875rem] text-muted-foreground uppercase">Active filters:</span>
          {activeFilters.map((af) => (
            <Link
              key={af.key}
              href={filterUrl({ [af.key]: null })}
              className="inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-foreground hover:bg-destructive/15 hover:text-destructive"
              title="Remove filter"
            >
              <span>{af.label}</span>
              <X className="size-3" />
            </Link>
          ))}
          <Link
            href="/projects"
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Main Grid + Filter Layout */}
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Left Sidebar Filters */}
        <FilterPanel activeCount={activeFilters.length}>
          {/* Categories */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Categories</span>
              {category && (
                <Link href={filterUrl({ category: null })} className="text-[0.6875rem] font-normal text-primary hover:underline">
                  Reset
                </Link>
              )}
            </h2>
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1 text-xs">
              <Link
                href={filterUrl({ category: null })}
                className={`block rounded px-2 py-1.5 transition-colors ${!category ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
              >
                All Categories
              </Link>
              {categories?.filter((c) => c.projectCount > 0 || c.slug === category).map((c) => (
                <Link
                  key={c.slug}
                  href={filterUrl({ category: c.slug })}
                  className={`flex items-center justify-between rounded px-2 py-1.5 transition-colors ${category === c.slug ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono text-[0.625rem] text-muted-foreground/70">{c.projectCount}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</h2>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {[
                { label: "All", val: null },
                { label: "Beginner", val: "BEGINNER" },
                { label: "Intermediate", val: "INTERMEDIATE" },
                { label: "Advanced", val: "ADVANCED" },
              ].map((d) => (
                <Link
                  key={d.label}
                  href={filterUrl({ difficulty: d.val })}
                  className={`rounded-sm border px-2.5 py-1 text-xs transition-colors ${
                    (d.val === null && !difficulty) || difficulty === d.val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-card text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Top Technologies */}
          {facets?.technologies && facets.technologies.length > 0 && (
            <div className="rounded-lg border border-border/80 bg-card p-4">
              <h2 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Top Stacks</span>
                {technology && (
                  <Link href={filterUrl({ technology: null })} className="text-[0.6875rem] font-normal text-primary hover:underline">
                    Reset
                  </Link>
                )}
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {facets.technologies.slice(0, 15).map((t) => (
                  <Link
                    key={t.slug}
                    href={filterUrl({ technology: technology === t.slug ? null : t.slug })}
                    className={`rounded-sm px-2 py-0.5 font-mono text-[0.6875rem] transition-colors ${
                      technology === t.slug
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {t.name} ({t.projectCount})
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Platform */}
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</h2>
            <div className="mt-3 flex gap-2 text-xs">
              <Link
                href={filterUrl({ platform: null })}
                className={`flex-1 rounded-sm border py-1.5 text-center ${!platform ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-card hover:bg-secondary/60"}`}
              >
                All
              </Link>
              <Link
                href={filterUrl({ platform: "GITHUB" })}
                className={`flex-1 rounded-sm border py-1.5 text-center ${platform === "GITHUB" ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-card hover:bg-secondary/60"}`}
              >
                Code
              </Link>
              <Link
                href={filterUrl({ platform: "KAGGLE" })}
                className={`flex-1 rounded-sm border py-1.5 text-center ${platform === "KAGGLE" ? "border-primary bg-primary text-primary-foreground" : "border-border/80 bg-card hover:bg-secondary/60"}`}
              >
                Datasets
              </Link>
            </div>
          </div>
        </FilterPanel>

        {/* Right Content Area */}
        <div className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{items.length}</strong> of <strong className="text-foreground">{total}</strong> projects
            </span>
            {totalPages > 1 && (
              <span>Page {currentPage + 1} of {totalPages}</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <p className="ref">No Results Found</p>
              <h3 className="mt-2 text-xl font-bold">No projects matched your criteria</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Try loosening your filters, removing keywords, or browsing our full catalogue.
              </p>
              <Link href="/projects" className="btn-primary mt-6">
                Reset All Filters
              </Link>
            </div>
          ) : (
            <>
              <ProjectGrid cards={items} columns={2} />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Link
                    href={filterUrl({ page: Math.max(0, currentPage - 1).toString() })}
                    className={`btn-outline btn-sm ${currentPage === 0 ? "pointer-events-none opacity-40" : ""}`}
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Previous</span>
                  </Link>

                  <div className="flex items-center gap-1 px-2 font-mono text-xs">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      // Only show current, first, last, and neighbors
                      if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
                        return (
                          <Link
                            key={i}
                            href={filterUrl({ page: i.toString() })}
                            className={`flex size-8 items-center justify-center rounded-sm ${
                              i === currentPage
                                ? "bg-primary font-bold text-primary-foreground"
                                : "hover:bg-secondary"
                            }`}
                          >
                            {i + 1}
                          </Link>
                        );
                      }
                      if (i === 1 || i === totalPages - 2) {
                        return <span key={i} className="px-1 text-muted-foreground">…</span>;
                      }
                      return null;
                    })}
                  </div>

                  <Link
                    href={filterUrl({ page: Math.min(totalPages - 1, currentPage + 1).toString() })}
                    className={`btn-outline btn-sm ${currentPage >= totalPages - 1 ? "pointer-events-none opacity-40" : ""}`}
                  >
                    <span>Next</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
