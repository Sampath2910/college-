"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type DuplicateCandidate = {
  id: number;
  primaryProject: { id: number; title: string; slug: string; platform: string };
  duplicateProject: { id: number; title: string; slug: string; platform: string };
  similarityScore: number;
  matchReason: string;
  status: string;
  createdAt: string;
};

export default function AdminDuplicatesPage() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  function loadDuplicates() {
    setLoading(true);
    api.get<Record<string, string | number>[]>("/admin/duplicates")
      .then((rows) => rows.map((r): DuplicateCandidate => {
        const reasons = typeof r.reasons === "string" ? (JSON.parse(r.reasons) as Record<string, number>) : {};
        return {
          id: Number(r.id),
          primaryProject: { id: Number(r.aId), title: String(r.aTitle), slug: String(r.aId), platform: String(r.aStatus) },
          duplicateProject: { id: Number(r.bId), title: String(r.bTitle), slug: String(r.bId), platform: String(r.bStatus) },
          similarityScore: Number(r.similarity),
          matchReason: Object.entries(reasons).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", "),
          status: String(r.status),
          createdAt: "",
        };
      }))
      .then((data) => setCandidates(Array.isArray(data) ? data : []))
      .catch((err) => toast.error("Could not load duplicate candidates"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDuplicates();
  }, []);

  async function handleResolve(id: number, action: string) {
    try {
      await api.post(`/admin/duplicates/${id}`, action === "dismiss"
        ? { status: "DISMISSED" }
        : { status: "CONFIRMED", archiveProjectId: candidates.find((c) => c.id === id)?.duplicateProject.id ?? null });
      toast.success(`Duplicate candidate ${action}ed`);
      loadDuplicates();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve duplicate");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Duplicate Candidates</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Automated repository collision detection based on title similarity, repository forks, and description hashing.
          </p>
        </div>

        <button type="button" onClick={loadDuplicates} className="btn-outline btn-sm">
          <RotateCw className="size-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Copy className="size-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold">No pending duplicates</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            All repository titles and content fingerprints are unique.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">Match #{c.id}</span>
                  <span className="text-xs text-muted-foreground">• Similarity: {(c.similarityScore * 100).toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">({c.matchReason})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolve(c.id, "dismiss")}
                    className="btn-outline btn-sm h-7 text-xs"
                  >
                    <span>Dismiss False Positive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve(c.id, "keep_primary")}
                    className="btn-primary btn-sm h-7 text-xs"
                  >
                    <span>Keep Primary Only</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                  <span className="ref text-primary block">Primary Record</span>
                  <Link href={`/admin/projects/${c.primaryProject.id}`} className="font-bold text-sm hover:underline mt-1 block">
                    {c.primaryProject.title}
                  </Link>
                  <span className="font-mono text-muted-foreground text-[0.6875rem]">{c.primaryProject.platform}</span>
                </div>

                <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                  <span className="ref text-ochre block">Potential Duplicate</span>
                  <Link href={`/admin/projects/${c.duplicateProject.id}`} className="font-bold text-sm hover:underline mt-1 block">
                    {c.duplicateProject.title}
                  </Link>
                  <span className="font-mono text-muted-foreground text-[0.6875rem]">{c.duplicateProject.platform}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

