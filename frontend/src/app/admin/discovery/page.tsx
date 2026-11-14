"use client";

import { useCallback, useEffect, useState } from "react";
import { Pause, Play, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { fmtDateTime, humanise } from "@/lib/format";

type Job = {
  id: number; jobType: string; triggerType: string; status: string; startedAt: string; endedAt: string | null;
  recordsDiscovered: number; recordsProcessed: number; recordsRejected: number; recordsUpdated: number; recordsPublished: number;
  errorCount: number; retryCount: number; errorMessage: string | null;
};
type JobsResponse = { jobs: Job[]; schedule: Record<string, { cron: string | null; nextRun: string | null }>; paused: boolean };
type JobResult = { ref: string | null; outcome: string; detail: string | null; projectId: number | null };
type Stats = { byStatus: { status: string; total: number }[]; rejectionReasons: { reason: string; total: number }[]; sourceRecords: number; pendingDuplicates: number };

/** The job types the backend actually runs (Types.JobType). */
const JOBS: [string, string, string][] = [
  ["GITHUB_DISCOVERY", "GitHub discovery", "Search GitHub for new repositories using the configured keywords."],
  ["KAGGLE_DISCOVERY", "Kaggle discovery", "Search Kaggle datasets, models and (with a token) notebooks and competitions."],
  ["METADATA_UPDATE", "Metadata update", "Re-read reviewed projects from their source API and pick up changes or deletions."],
  ["SOURCE_VALIDATION", "Source link check", "Check that each published project's source page still responds."],
  ["DEMO_VALIDATION", "Demo link check", "Check listed project websites; only responding links are shown publicly."],
  ["DUPLICATE_DETECTION", "Duplicate detection", "Compare projects and flag likely duplicates for manual review."],
  ["SCORE_RECALCULATION", "Score recalculation", "Recompute internal quality scores with the current weights."],
  ["INTEREST_AGGREGATION", "Interest aggregation", "Rebuild interest profiles for students who gave activity consent."],
  ["DRAFT_GENERATION", "Draft generation", "Prepare message drafts for opted-in students, for your review."],
];

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-primary/10 text-primary",
  RUNNING: "bg-ochre-soft text-ochre",
  PARTIAL: "bg-ochre-soft text-ochre",
  FAILED: "bg-destructive/10 text-destructive",
};

export default function AdminDiscoveryPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<{ job: Job; results: JobResult[] } | null>(null);

  const load = useCallback(() => {
    api.get<JobsResponse>("/admin/jobs?limit=40").then(setData).catch((e) => toast.error(errorMessage(e)));
    api.get<Stats>("/admin/discovery/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  // while a job is running, refresh every few seconds so progress is visible without a manual reload
  const running = data?.jobs.some((j) => j.status === "RUNNING") ?? false;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running, load]);

  async function run(type: string) {
    setBusy(type);
    try {
      await api.post("/admin/jobs", { type });
      toast.success(`${humanise(type)} started`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function togglePause() {
    if (!data) return;
    try {
      await api.put("/admin/settings", { "schedules.paused": !data.paused });
      toast.success(data.paused ? "Schedules resumed" : "Schedules paused");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function showResults(job: Job) {
    try {
      setOpen(await api.get<{ job: Job; results: JobResult[] }>(`/admin/jobs/${job.id}`));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl">Discovery and jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run jobs now, see when each runs next, and inspect what every run did.</p>
        </div>
        <div className="flex gap-2">
          {data && (
            <button type="button" onClick={togglePause} className="btn-outline btn-sm">
              {data.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {data.paused ? "Resume schedules" : "Pause schedules"}
            </button>
          )}
          <button type="button" onClick={load} className="btn-outline btn-sm"><RotateCw aria-hidden /> Refresh</button>
        </div>
      </div>

      {data?.paused && (
        <p role="status" className="rounded-md border border-ochre/40 bg-ochre-soft/50 px-4 py-3 text-sm">
          Scheduled runs are paused. Jobs only run when you start them here.
        </p>
      )}

      {stats && (
        <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {[...stats.byStatus.map((s) => [humanise(s.status), s.total] as [string, number]), ["Source records", stats.sourceRecords] as [string, number], ["Duplicates to review", stats.pendingDuplicates] as [string, number]].slice(0, 6).map(([k, v]) => (
            <div key={k} className="bg-card px-4 py-3">
              <dt className="ref">{k}</dt>
              <dd className="mt-1 font-display text-2xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <section>
        <h2 className="ref mb-3">Jobs</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-left">
              <tr className="ref [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal">
                <th>Job</th><th>Schedule (cron)</th><th>Next run</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {JOBS.map(([code, label, desc]) => {
                const s = data?.schedule[code];
                const isRunning = data?.jobs.some((j) => j.jobType === code && j.status === "RUNNING");
                return (
                  <tr key={code} className="[&>td]:px-4 [&>td]:py-3">
                    <td>
                      <span className="font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">{s?.cron || "not scheduled"}</td>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{data?.paused ? "paused" : s?.nextRun ? fmtDateTime(s.nextRun) : "—"}</td>
                    <td className="text-right">
                      <button type="button" disabled={busy === code || isRunning} onClick={() => run(code)} className="btn-outline btn-sm">
                        <Play aria-hidden /> {isRunning ? "Running…" : "Run now"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Schedules, keywords, limits and quality thresholds are edited under Settings. Cron uses 6 fields: second minute hour day month weekday.</p>
      </section>

      <section>
        <h2 className="ref mb-3">Run history</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left">
              <tr className="ref [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal">
                <th>Run</th><th>Started</th><th>Status</th><th className="text-right">Found</th><th className="text-right">Processed</th>
                <th className="text-right">Rejected</th><th className="text-right">Updated</th><th className="text-right">Errors</th><th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {!data && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {data?.jobs.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No jobs have run yet. Start one above.</td></tr>}
              {data?.jobs.map((j) => (
                <tr key={j.id} className="[&>td]:px-4 [&>td]:py-2.5">
                  <td>
                    <span className="font-medium">{humanise(j.jobType)}</span>
                    <span className="block font-mono text-[0.6875rem] text-muted-foreground">#{j.id} · {j.triggerType.toLowerCase()}</span>
                    {j.errorMessage && <span className="mt-1 block max-w-md text-xs text-destructive [overflow-wrap:anywhere]">{j.errorMessage}</span>}
                  </td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{fmtDateTime(j.startedAt)}</td>
                  <td><span className={`rounded-sm px-2 py-0.5 font-mono text-[0.6875rem] ${STATUS_STYLE[j.status] ?? "bg-secondary"}`}>{j.status}</span></td>
                  <td className="text-right tabular-nums">{j.recordsDiscovered}</td>
                  <td className="text-right tabular-nums">{j.recordsProcessed}</td>
                  <td className="text-right tabular-nums">{j.recordsRejected}</td>
                  <td className="text-right tabular-nums">{j.recordsUpdated}</td>
                  <td className="text-right tabular-nums">{j.errorCount}</td>
                  <td className="text-right"><button type="button" onClick={() => showResults(j)} className="link text-xs">Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {stats && stats.rejectionReasons.length > 0 && (
        <section>
          <h2 className="ref mb-3">Why records were rejected (last 30 days)</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {stats.rejectionReasons.map((r) => (
              <li key={r.reason} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="[overflow-wrap:anywhere]">{r.reason}</span>
                <span className="font-mono tabular-nums">{r.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Job results" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl">{humanise(open.job.jobType)} #{open.job.id}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmtDateTime(open.job.startedAt)} to {open.job.endedAt ? fmtDateTime(open.job.endedAt) : "still running"} · retries {open.job.retryCount}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="btn-outline btn-sm">Close</button>
            </div>
            {open.results.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No per-record results were logged (unchanged records are not listed).</p>
            ) : (
              <ul className="mt-5 divide-y text-sm">
                {open.results.map((r, i) => (
                  <li key={i} className="grid gap-1 py-2.5 sm:grid-cols-[7rem_1fr]">
                    <span className="font-mono text-[0.6875rem] text-muted-foreground">{r.outcome}</span>
                    <span className="min-w-0">
                      <span className="font-medium [overflow-wrap:anywhere]">{r.ref}</span>
                      {r.detail && <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">{r.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
