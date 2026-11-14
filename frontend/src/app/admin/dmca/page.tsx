"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

type DmcaRecord = {
  id: number;
  reference: string;
  projectId?: number;
  claimantName: string;
  claimantEmail: string;
  originalWorkUrl: string;
  claimType: string;
  statement: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
};

export default function AdminDmcaPage() {
  const [notices, setNotices] = useState<DmcaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  function loadNotices() {
    setLoading(true);
    api
      .get<{ content: DmcaRecord[] }>("/admin/dmca")
      .then((res) => setNotices(res.content || []))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadNotices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DMCA & Author Attribution Notices</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Review author attribution claims, license clarifications, and takedown requests.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotices}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Claimant</th>
                <th className="px-4 py-3 font-semibold">Original Work</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Statement</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No active DMCA notices received.
                  </td>
                </tr>
              ) : (
                notices.map((n) => (
                  <tr key={n.reference} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {n.reference}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{n.claimantName}</div>
                      <div className="text-[11px] text-muted-foreground">{n.claimantEmail}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      <a
                        href={n.originalWorkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {n.originalWorkUrl}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {n.claimType}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground" title={n.statement}>
                      {n.statement}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

