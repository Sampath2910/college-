"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, FolderOpen, Sparkles } from "lucide-react";
import { ProjectGrid } from "@/components/project-card";
import { api } from "@/lib/api";
import type { ProjectCard as Card } from "@/lib/types";

export default function StudentSavedPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Card[]>("/student/saved")
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-4">
        <h1 className="text-2xl font-bold font-display">Bookmarked Projects</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Your saved project candidates for college minor and major project discussions.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 rounded-lg border border-border/50 bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bookmark className="size-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold">No saved projects yet</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Explore our project catalogue and click the bookmark button on any project to save it here.
          </p>
          <Link href="/projects" className="btn-primary btn-sm mt-5">
            Browse Project Catalogue
          </Link>
        </div>
      ) : (
        <ProjectGrid cards={cards} columns={2} />
      )}
    </div>
  );
}

