"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  FolderTree,
  MoreVertical,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type ProjectRow = {
  id: number;
  slug: string;
  title: string;
  category: string | null;
  platform: string;
  qualityScore: number | null;
  status: string;
  featured: boolean;
  discoveredAt: string;
  stars: number | null;
};

type PagedProjects = {
  items: ProjectRow[];
  total: number;
  page: number;
  size: number;
};

const STATUSES = [
  { val: "", label: "All Projects" },
  { val: "PENDING_REVIEW", label: "Pending Review" },
  { val: "PUBLISHED", label: "Published" },
  { val: "APPROVED", label: "Approved" },
  { val: "REJECTED", label: "Rejected" },
  { val: "NEEDS_REVALIDATION", label: "Needs Revalidation" },
];

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  function loadProjects() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", page.toString());
    params.set("size", pageSize.toString());

    api.get<PagedProjects>(`/admin/projects?${params.toString()}`)
      .then((data) => {
        setProjects(data?.items ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch((err) => toast.error(err.message || "Failed to load projects"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProjects();
  }, [status, page]);

  async function handleAction(id: number, action: string) {
    try {
      await api.post(`/admin/projects/${id}/action`, { action });
      toast.success(`Project ${action}ed successfully`);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} project`);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Project Catalogue & Review Queue</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Review discovered repositories, verify extracted blueprints, and manage published college projects.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProjects}
          className="btn-outline btn-sm self-start"
        >
          <RotateCw className="size-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {STATUSES.map((st) => (
            <button
              key={st.val}
              type="button"
              onClick={() => {
                setStatus(st.val);
                setPage(0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === st.val
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground/80 hover:bg-secondary"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            loadProjects();
          }}
          className="relative max-w-xs w-full"
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="field h-9 pl-8 text-xs"
          />
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Project Title</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Quality Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Loading catalogue records...</span>
                    </div>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No projects found for the selected filter.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/25 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="font-bold text-foreground hover:text-primary hover:underline line-clamp-1"
                        >
                          {p.title}
                        </Link>
                        {p.featured && (
                          <span className="rounded bg-ochre-soft px-1.5 py-0.2 font-mono text-[0.625rem] text-ochre font-bold">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <span className="text-[0.6875rem] text-muted-foreground font-mono">
                        Discovered {fmtDate(p.discoveredAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {p.platform}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {p.category ?? <span className="text-muted-foreground italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${
                        (p.qualityScore ?? 0) >= 70 ? "text-primary" : (p.qualityScore ?? 0) >= 50 ? "text-ochre" : "text-destructive"
                      }`}>
                        {p.qualityScore !== null ? `${p.qualityScore}/100` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 font-mono text-[0.6875rem] font-bold ${
                        p.status === "PUBLISHED"
                          ? "bg-primary/10 text-primary"
                          : p.status === "PENDING_REVIEW"
                          ? "bg-ochre-soft text-ochre"
                          : p.status === "APPROVED"
                          ? "bg-secondary text-foreground"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="btn-outline btn-sm h-7 px-2 text-[0.6875rem]"
                        >
                          <Eye className="size-3" />
                          <span>Inspect</span>
                        </Link>

                        {p.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAction(p.id, "publish")}
                              className="btn-primary btn-sm h-7 px-2 text-[0.6875rem]"
                              title="Publish directly to website"
                            >
                              <Check className="size-3" />
                              <span>Publish</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(p.id, "reject")}
                              className="btn-danger btn-sm h-7 px-2 text-[0.6875rem]"
                              title="Reject project"
                            >
                              <X className="size-3" />
                            </button>
                          </>
                        )}

                        {p.status === "PUBLISHED" && (
                          <button
                            type="button"
                            onClick={() => handleAction(p.id, "unpublish")}
                            className="btn-outline btn-sm h-7 px-2 text-[0.6875rem]"
                            title="Unpublish to approved status"
                          >
                            Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing {projects.length} of {total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="btn-outline btn-sm h-7 px-2"
              >
                <ChevronLeft className="size-3" />
                <span>Prev</span>
              </button>
              <span className="font-mono text-xs">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="btn-outline btn-sm h-7 px-2"
              >
                <span>Next</span>
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

