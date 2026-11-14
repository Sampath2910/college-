"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { api } from "@/lib/api";
import type { ProjectCard as Card } from "@/lib/types";

type Recommendation = {
  card: Card;
  reason: string;
  score: number;
};

export default function StudentRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ project: Card; reason: string }[]>("/student/recommendations")
      .then((rows) => rows.map((r) => ({ card: r.project, reason: r.reason, score: 0 })))
      .then((data) => setRecs(Array.isArray(data) ? data : []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="text-2xl font-bold font-display">Recommended for You</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Suggestions calculated from your saved bookmarks, searched technologies, and college focus domains.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 rounded-lg border border-border/50 bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Sparkles className="size-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold">Discovering recommendations...</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            As you browse and bookmark projects, our AI and engagement engine learns your technical preferences.
          </p>
          <Link href="/projects" className="btn-primary btn-sm mt-5">
            Explore More Projects
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recs.map((r) => (
            <li key={r.card.id}>
              <ProjectCard card={r.card} reason={r.reason} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

