import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { publicGet } from "@/lib/server-api";
import type { Category } from "@/lib/types";

export const revalidate = 60;

export default async function CategoriesPage() {
  const categories = await publicGet<Category[]>("/categories") ?? [];

  return (
    <div className="page py-10">
      <div className="border-b border-border/80 pb-6">
        <p className="ref">Catalogue Index</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Project Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse software projects and datasets classified into 20 distinct academic and engineering domains.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/projects?category=${c.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/90 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FolderKanban className="size-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.projectCount} {c.projectCount === 1 ? "project" : "projects"}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {c.name}
              </h2>
              {c.description && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-primary">
              <span>Explore projects</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

