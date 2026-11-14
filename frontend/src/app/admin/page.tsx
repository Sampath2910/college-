"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  FolderTree,
  History,
  Layers,
  MessageSquare,
  Play,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type OverviewData = {
  projects: {
    total: number;
    published: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    needsRevalidation: number;
  };
  enquiries: {
    total: number;
    fresh: number;
    followUpsDue: number;
  };
  students: {
    total: number;
    active30d: number;
  };
  aiUsage: {
    callsToday: number;
    calls30d: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number | null;
  };
  integrations: {
    code: string;
    name: string;
    enabled: boolean;
    configured: boolean;
  }[];
  recentJobs: {
    id: number;
    jobType: string;
    status: string;
    processed: number;
    startedAt: string;
  }[];
  recentActivity: {
    id: number;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string | null;
    detail: string | null;
    createdAt: string;
  }[];
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState(false);

  function loadOverview() {
    api.get<OverviewData>("/admin/overview")
      .then((d) => setData(d))
      .catch((err) => toast.error("Could not load admin overview"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function triggerJob(jobType: string) {
    setTriggeringJob(true);
    try {
      await api.post("/admin/jobs", { type: jobType });
      toast.success(`Job ${jobType} triggered successfully!`);
      loadOverview();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger job");
    } finally {
      setTriggeringJob(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-secondary/60 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">System Overview</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Platform health, project catalogue metrics, and background automation status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={triggeringJob}
            onClick={() => triggerJob("GITHUB_DISCOVERY")}
            className="btn-outline btn-sm"
          >
            <Compass className="size-3.5" />
            <span>Discover GitHub</span>
          </button>
          <button
            type="button"
            disabled={triggeringJob}
            onClick={() => triggerJob("KAGGLE_DISCOVERY")}
            className="btn-outline btn-sm"
          >
            <Compass className="size-3.5" />
            <span>Discover Kaggle</span>
          </button>
          <Link href="/admin/projects" className="btn-primary btn-sm">
            <span>Review Queue ({data.projects.pendingReview})</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Published Projects */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Published Projects</span>
            <FolderTree className="size-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{data.projects.published}</span>
            <span className="text-xs text-muted-foreground">of {data.projects.total} total</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
            <span>{data.projects.pendingReview} in review</span>
            <Link href="/admin/projects?status=PENDING_REVIEW" className="text-primary hover:underline">
              Review →
            </Link>
          </div>
        </div>

        {/* Student Enquiries */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Enquiries</span>
            <MessageSquare className="size-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{data.enquiries.total}</span>
            {data.enquiries.fresh > 0 && (
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                {data.enquiries.fresh} new
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
            <span>Mentorship requests</span>
            <Link href="/admin/enquiries" className="text-primary hover:underline">
              View all →
            </Link>
          </div>
        </div>

        {/* Active Students */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Students</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{data.students.total}</span>
            <span className="text-xs text-muted-foreground">accounts</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
            <span>Consent & profiles active</span>
            <Link href="/admin/engagement" className="text-primary hover:underline">
              Engagement →
            </Link>
          </div>
        </div>

        {/* AI API Usage */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Operations</span>
            <Bot className="size-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{data.aiUsage.calls30d}</span>
            <span className="text-xs text-muted-foreground">calls (30d)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
            <span>Structured analysis</span>
            <Link href="/admin/integrations" className="text-primary hover:underline">
              Integration →
            </Link>
          </div>
        </div>
      </div>

      {/* Integration Status Strip */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Integrations</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          {data.integrations.map((it) => (
            <div key={it.code} className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/30 p-3 text-xs">
              <div>
                <span className="font-semibold block">{it.name}</span>
                <span className="font-mono text-[0.625rem] text-muted-foreground">
                  {!it.enabled ? "Disabled" : it.configured ? "Credentials set" : "No credentials"}
                </span>
              </div>
              <span title={it.configured && it.enabled ? "Ready" : "Not ready"} className={`size-2.5 rounded-full ${it.enabled && it.configured ? "bg-primary" : "border border-muted-foreground/50"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* 2-Col Bottom: Recent Jobs & Audit Trail */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Discovery & Pipeline Jobs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              <h2 className="font-bold text-sm">Recent Background Jobs</h2>
            </div>
            <Link href="/admin/discovery" className="text-xs text-primary hover:underline">
              View all jobs →
            </Link>
          </div>

          <div className="space-y-2">
            {data.recentJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs">
                <div>
                  <span className="font-mono font-semibold block">{job.jobType}</span>
                  <span className="text-[0.6875rem] text-muted-foreground">Started {fmtDate(job.startedAt)}</span>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[0.6875rem] font-bold ${
                    job.status === "SUCCEEDED" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  }`}>
                    {job.status}
                  </span>
                  <span className="block text-[0.6875rem] text-muted-foreground mt-0.5">
                    {job.processed} items
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Trail */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h2 className="font-bold text-sm">Recent Audit Trail</h2>
            </div>
            <Link href="/admin/audit" className="text-xs text-primary hover:underline">
              Full log →
            </Link>
          </div>

          <div className="space-y-2">
            {data.recentActivity.slice(0, 5).map((act) => (
              <div key={act.id} className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-primary">{act.action}</span>
                  <span className="text-[0.6875rem] text-muted-foreground">{fmtDate(act.createdAt)}</span>
                </div>
                <div className="text-muted-foreground truncate">
                  By {act.actorEmail || "system"} {act.detail ? `— ${act.detail}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

