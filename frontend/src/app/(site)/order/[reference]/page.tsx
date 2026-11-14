import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCode2,
  FileText,
  Presentation,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  Phone,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import type { OrderRecord } from "@/lib/types";

// Server-side fetch order details
async function getOrder(reference: string): Promise<OrderRecord | null> {
  try {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
    const res = await fetch(`${backendUrl}/api/public/orders/${encodeURIComponent(reference)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const order = await getOrder(reference);

  if (!order) {
    notFound();
  }

  function formatBytes(bytes?: number) {
    if (!bytes) return "Generated Asset";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function getFileIcon(type: string) {
    if (type === "FULL_BUNDLE_ZIP") return <FileCode2 className="size-6 text-emerald-500" />;
    if (type === "IEEE_REPORT_DOCX") return <FileText className="size-6 text-blue-500" />;
    if (type === "PRESENTATION_PPTX") return <Presentation className="size-6 text-amber-500" />;
    return <Sparkles className="size-6 text-purple-500" />;
  }

  const isPaid = order.status === "PAID";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={order.projectSlug ? `/projects/${order.projectSlug}` : "/projects"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Project Details
        </Link>
      </div>

      {/* Main Order Header Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className={`p-6 sm:p-8 ${isPaid ? "bg-emerald-500/5 border-b border-emerald-500/20" : "bg-amber-500/5 border-b border-amber-500/20"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isPaid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {isPaid ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                {isPaid ? "Payment confirmed" : "Payment Pending"}
              </span>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Order {order.orderReference}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Academic Package for:{" "}
                <span className="font-semibold text-foreground">{order.projectTitle}</span>
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 text-left sm:text-right shadow-xs">
              <div className="text-xs text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-black text-primary">₹{order.amountInr}</div>
              <div className="text-xs text-muted-foreground font-mono">{order.packageType}</div>
            </div>
          </div>
        </div>

        {/* Order Meta details */}
        <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x bg-secondary/10 text-sm">
          <div className="p-4 flex items-center gap-3">
            <Calendar className="size-5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Order Date</div>
              <div className="font-medium text-foreground">
                {order.paidAt ? new Date(order.paidAt).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <Building2 className="size-5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Student & Institution</div>
              <div className="font-medium text-foreground truncate">
                {order.studentName} ({order.studentCollege || "University"})
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center gap-3">
            <Mail className="size-5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Delivery Email</div>
              <div className="font-medium text-foreground truncate">{order.studentEmail}</div>
            </div>
          </div>
        </div>

        {/* Download Center */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Academic Asset Downloads</h2>
              <p className="text-xs text-muted-foreground">
                Direct download links remain active for 7 days. You have up to 15 downloads per item.
              </p>
            </div>
          </div>

          {order.downloads && order.downloads.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {order.downloads.map((dl) => (
                <div
                  key={dl.downloadToken}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      {getFileIcon(dl.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{dl.fileName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(dl.fileSizeBytes)} • {dl.downloadCount}/{dl.maxDownloads} downloads used
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">
                      Valid until {new Date(dl.expiresAt).toLocaleDateString()}
                    </span>

                    <a
                      href={dl.downloadUrl}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90"
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <Clock className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No active downloads yet.</p>
              <p className="text-xs mt-1">If your payment is pending verification, downloads will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {/* Setup & University Guidelines */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <FileCheck className="size-5" />
            <h3 className="font-bold">Setup & Execution Checklist</h3>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              <span>Extract the downloaded <code className="rounded bg-secondary px-1 text-foreground">.zip</code> bundle to your computer.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              <span>Import <code className="rounded bg-secondary px-1 text-foreground">database/setup_database.sql</code> into your local MySQL server.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              <span>Double-click <code className="rounded bg-secondary px-1 text-foreground">scripts/run.bat</code> (Windows) or execute <code className="rounded bg-secondary px-1 text-foreground">scripts/run.sh</code> (Mac/Linux).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              <span>Open your browser to <code className="rounded bg-secondary px-1 text-foreground">http://localhost:8080</code> to view the running app.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <h3 className="font-bold">Academic License & Viva Support</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            All code in this bundle is legally licensed under open-source academic standards with complete author attribution retained inside <code className="rounded bg-secondary px-1 text-foreground">LICENSE.txt</code>.
          </p>
          <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs flex items-center justify-between">
            <span>Need Viva coaching or custom modifications?</span>
            <Link href="/enquire" className="font-bold text-primary hover:underline">
              Contact Mentors →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

