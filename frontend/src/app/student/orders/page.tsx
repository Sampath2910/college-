"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCode2,
  FileText,
  PackageCheck,
  Presentation,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { OrderRecord } from "@/lib/types";

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<OrderRecord[]>("/student/orders")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  function formatBytes(bytes?: number) {
    if (!bytes) return "Asset";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function getFileIcon(type: string) {
    if (type === "FULL_BUNDLE_ZIP") return <FileCode2 className="size-4 text-emerald-500" />;
    if (type === "IEEE_REPORT_DOCX") return <FileText className="size-4 text-blue-500" />;
    if (type === "PRESENTATION_PPTX") return <Presentation className="size-4 text-amber-500" />;
    return <Sparkles className="size-4 text-purple-500" />;
  }

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My orders and downloads</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Material prepared for your support packages appears here once payment is confirmed.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <PackageCheck className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold">No academic packages ordered yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Browse the catalogue and choose from Ready-to-Run, IEEE Report, or Viva Defense packs.
          </p>
          <Link
            href="/projects"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Explore Project Catalogue
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPaid = order.status === "PAID";
            return (
              <div
                key={order.orderReference}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-secondary/10 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {order.orderReference}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {order.status}
                      </span>
                    </div>

                    <h3 className="mt-1 text-base font-bold text-foreground">
                      {order.projectTitle}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Tier: <span className="font-semibold text-primary">{order.packageType}</span> • Amount: ₹{order.amountInr}
                    </p>
                  </div>

                  <Link
                    href={`/order/${order.orderReference}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary shrink-0"
                  >
                    View Receipt & Checklist
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>

                {/* Downloads list */}
                {isPaid && order.downloads && order.downloads.length > 0 && (
                  <div className="p-4 sm:p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Available Downloads:
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {order.downloads.map((dl) => (
                        <div
                          key={dl.downloadToken}
                          className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {getFileIcon(dl.fileType)}
                            <div className="truncate font-medium">{dl.fileName}</div>
                          </div>
                          <a
                            href={dl.downloadUrl}
                            download
                            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90"
                          >
                            <Download className="size-3" />
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

