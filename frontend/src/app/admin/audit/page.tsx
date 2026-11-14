"use client";

import { useEffect, useState } from "react";
import { History, RotateCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type AuditRow = {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  function loadLogs() {
    setLoading(true);
    api.get<AuditRow[]>("/admin/audit")
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((err) => toast.error("Could not load audit logs"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">System Audit Logs & Security Trail</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable administrative action log for accountability, security reviews, and compliance tracking.
          </p>
        </div>

        <button type="button" onClick={loadLogs} className="btn-outline btn-sm">
          <RotateCw className="size-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-secondary/40 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading audit events...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  No audit log events recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 font-mono text-[0.6875rem] text-muted-foreground">
                    {fmtDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {log.actorEmail || "system"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entityType ? `${log.entityType} #${log.entityId ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[0.6875rem] max-w-sm truncate">
                    {log.detail ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

