"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Save,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Props = {
  params: Promise<{ id: string }>;
};

export default function AdminProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    overview: "",
    problemStatement: "",
    categoryId: null as number | null,
    difficulty: "INTERMEDIATE",
    projectType: "SOFTWARE_PROJECT",
    featured: false,
    reviewNote: "",
  });

  function loadProject() {
    setLoading(true);
    Promise.all([
      api.get<any>(`/admin/projects/${id}`),
      api.get<any[]>("/admin/categories"),
    ])
      .then(([p, cats]) => {
        setProject(p);
        setCategories(cats || []);
        setForm({
          title: p.title || "",
          shortDescription: p.shortDescription || "",
          overview: p.overview || "",
          problemStatement: p.problemStatement || "",
          categoryId: p.categoryId,
          difficulty: p.difficulty || "INTERMEDIATE",
          projectType: p.projectType || "SOFTWARE_PROJECT",
          featured: !!p.featured,
          reviewNote: p.reviewNote || "",
        });
      })
      .catch((err) => toast.error("Could not load project"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/projects/${id}`, {
        objectives: project.objectives ?? [], features: project.features ?? [], modules: project.modules ?? [],
        technologyIds: project.technologyIds ?? null, demoUrl: project.demoUrl ?? "", demoVerified: !!project.demoVerified,
        documentationUrl: project.documentationUrl ?? "",
        ...form,
      });
      toast.success("Project metadata saved");
      loadProject();
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      await api.post(`/admin/projects/${id}/action`, { action, note: form.reviewNote });
      toast.success(`Project ${action}ed`);
      loadProject();
    } catch (err: any) {
      toast.error(err.message || `Action failed`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !project) {
    return <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Back and Status Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects" className="btn-outline btn-sm">
            <ArrowLeft className="size-3.5" />
            <span>Back to Queue</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground">ID: #{project.id}</span>
          <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
            project.status === "PUBLISHED" ? "bg-primary/10 text-primary" : "bg-ochre-soft text-ochre"
          }`}>
            {project.status}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleAction("revalidate")}
            className="btn-outline btn-sm"
            title="Check live repository status on source API"
          >
            <RotateCw className="size-3.5" />
            <span>Revalidate Source</span>
          </button>

          {project.status !== "PUBLISHED" ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleAction("publish")}
              className="btn-primary btn-sm"
            >
              <Check className="size-3.5" />
              <span>Publish to Website</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleAction("unpublish")}
              className="btn-outline btn-sm"
            >
              <span>Unpublish</span>
            </button>
          )}

          {project.status !== "REJECTED" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleAction("reject")}
              className="btn-danger btn-sm"
            >
              <X className="size-3.5" />
              <span>Reject</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Editable Blueprint Form */}
        <form onSubmit={handleSave} className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Metadata & Classification</h2>
              <button type="submit" disabled={saving} className="btn-primary btn-sm">
                <Save className="size-3.5" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium">Project Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="field mt-1 text-xs"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium">Category</label>
                <select
                  value={form.categoryId ?? ""}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className="field mt-1 text-xs"
                >
                  <option value="">(Select Category)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Difficulty Level</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="field mt-1 text-xs"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Project Type</label>
                <select
                  value={form.projectType}
                  onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                  className="field mt-1 text-xs"
                >
                  <option value="SOFTWARE_PROJECT">Software Project</option>
                  <option value="DATASET">Dataset</option>
                  <option value="NOTEBOOK">Jupyter Notebook</option>
                  <option value="RESEARCH_CODE">Research Code</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium">Short Description (Catalogue Card Summary)</label>
              <textarea
                rows={2}
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="field mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium">System Overview</label>
              <textarea
                rows={4}
                value={form.overview}
                onChange={(e) => setForm({ ...form, overview: e.target.value })}
                className="field mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Problem Statement</label>
              <textarea
                rows={3}
                value={form.problemStatement}
                onChange={(e) => setForm({ ...form, problemStatement: e.target.value })}
                className="field mt-1 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="rounded border-input"
              />
              <label htmlFor="featured" className="text-xs font-medium cursor-pointer">
                Mark as Featured Project on Public Homepage
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium">Internal Review Note</label>
              <input
                type="text"
                value={form.reviewNote}
                onChange={(e) => setForm({ ...form, reviewNote: e.target.value })}
                placeholder="Notes about quality, university relevance, or reasons for rejection..."
                className="field mt-1 text-xs"
              />
            </div>
          </div>
        </form>

        {/* Right 1 Col: Quality Score & Source Inspector */}
        <aside className="space-y-6">
          {/* Quality Score Breakdown */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="ref">Automated Quality Index</span>
              <span className="font-mono text-xl font-bold text-primary">
                {project.qualityScore ?? 0}/100
              </span>
            </div>

            {project.scoreBreakdown && project.scoreBreakdown.length > 0 && (
              <div className="space-y-2 border-t border-border/60 pt-3 text-xs">
                {project.scoreBreakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.name || item.criterion}</span>
                    <span className="font-mono font-semibold">
                      +{item.score ?? item.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source Record & Provenance */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-xs">
            <span className="ref">Source Verification</span>

            <div className="space-y-2 divide-y divide-border/60">
              <div className="pt-2 first:pt-0">
                <span className="text-muted-foreground block text-[0.6875rem]">Repository / Page</span>
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                >
                  <ExternalLink className="size-3" />
                  <span className="truncate max-w-[200px]">{project.sourceUrl}</span>
                </a>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block text-[0.6875rem]">Platform</span>
                <span className="font-mono font-medium">{project.platform} ({project.platformCode})</span>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block text-[0.6875rem]">Stars / Votes</span>
                <span className="font-mono font-medium">{project.stars ?? 0}</span>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block text-[0.6875rem]">Source Active</span>
                <span className="font-mono font-medium text-primary">
                  {project.sourceAvailable ? "Verified Reachable" : "Unreachable"}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block text-[0.6875rem]">Last Checked</span>
                <span className="text-muted-foreground">{fmtDate(project.lastVerifiedAt)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
