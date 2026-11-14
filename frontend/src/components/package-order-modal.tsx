"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Presentation,
  ShieldCheck,
  Sparkles,
  X,
  CreditCard,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { OrderRecord, PackageOption } from "@/lib/types";

type Props = {
  projectId: number;
  projectTitle: string;
  selectedPackage: PackageOption | null;
  open: boolean;
  onClose: () => void;
};

type Step = "DETAILS" | "PAYMENT" | "SUCCESS";

export function PackageOrderModal({
  projectId,
  projectTitle,
  selectedPackage,
  open,
  onClose,
}: Props) {
  const { me } = useAuth();
  const [step, setStep] = useState<Step>("DETAILS");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);

  const [formData, setFormData] = useState({
    name: me?.fullName ?? "",
    email: me?.email ?? "",
    phone: "",
    college: "",
    notes: "",
  });

  if (!open || !selectedPackage) return null;

  async function handleProceedToPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please provide your name and email.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        projectId,
        packageType: selectedPackage?.type,
        studentName: formData.name.trim(),
        studentEmail: formData.email.trim(),
        studentPhone: formData.phone.trim() || undefined,
        studentCollege: formData.college.trim() || undefined,
        paymentGateway: "MOCK_DEMO",
        notes: formData.notes.trim() || undefined,
      };

      const res = await api.post<OrderRecord>("/public/orders/checkout", payload);
      setOrder(res);
      setStep("PAYMENT");
      toast.success(`Order created! Reference: ${res.orderReference}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize order checkout.");
    } finally {
      setLoading(false);
    }
  }

  function getFileIcon(type: string) {
    if (type === "FULL_BUNDLE_ZIP") return <FileCode2 className="size-5 text-emerald-500" />;
    if (type === "IEEE_REPORT_DOCX") return <FileText className="size-5 text-blue-500" />;
    if (type === "PRESENTATION_PPTX") return <Presentation className="size-5 text-amber-500" />;
    return <Sparkles className="size-5 text-purple-500" />;
  }

  function formatBytes(bytes?: number) {
    if (!bytes) return "Generated Asset";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* STEP 1: STUDENT & COLLEGE DETAILS */}
        {step === "DETAILS" && (
          <>
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" /> Step 1 of 2: Student Details
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Order Academic Package</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Request this support package for{" "}
                <span className="font-semibold text-foreground">{projectTitle}</span>.
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-border/80 bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{selectedPackage.title}</h4>
                  <p className="text-xs text-muted-foreground">{selectedPackage.subtitle}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">₹{selectedPackage.priceInr}</div>
                  {selectedPackage.originalPriceInr && (
                    <div className="text-xs text-muted-foreground line-through">
                      ₹{selectedPackage.originalPriceInr}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vikram Aditya"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@college.edu or gmail"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">College / University</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    placeholder="e.g. BITS Pilani"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Custom Requirements / Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Need submission by Friday / specific database changes..."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Initializing..." : "Proceed to Payment"}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 2: INSTANT PAYMENT & VERIFICATION */}
        {step === "PAYMENT" && order && (
          <div className="space-y-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <CreditCard className="size-3.5" /> Step 2 of 2: Order request
              </span>
              <h3 className="mt-2 text-2xl font-bold">Request received</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Order Reference: <span className="font-mono font-bold text-foreground">{order.orderReference}</span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Project:</span>
                <span className="font-semibold">{projectTitle}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Package:</span>
                <span className="font-semibold text-primary">{selectedPackage.title}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Student:</span>
                <span>{order.studentName} ({order.studentCollege || "University"})</span>
              </div>
              <div className="mt-3 border-t border-border pt-2 flex items-center justify-between">
                <span className="font-medium text-foreground">Total Payable Amount:</span>
                <span className="text-2xl font-black text-primary">₹{order.amountInr}</span>
              </div>
            </div>

            {/* No payment gateway is connected, so we never show a QR code or ask for money on this screen. */}
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-5 text-sm leading-relaxed">
              <p className="font-medium text-foreground">Your order request is recorded.</p>
              <p className="mt-1.5 text-foreground/75">
                We will contact you at <span className="font-medium text-foreground">{order.studentEmail}</span> with payment details.
                Your files are released on your order page once the payment has been confirmed by our team.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`/order/${order.orderReference}`} className="btn-primary flex-1">Open my order page</a>
              <button type="button" onClick={onClose} className="btn-outline flex-1">Close</button>
            </div>
          </div>
        )}

        {/* STEP 3: INSTANT SUCCESS & DOWNLOAD ACCESS */}
        {step === "SUCCESS" && order && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black tracking-tight">Payment Successful!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your package has been generated and validated for academic submission.
              </p>
              <div className="mt-2 inline-block rounded-md bg-secondary px-3 py-1 text-xs font-mono font-bold text-foreground">
                Ref: {order.orderReference}
              </div>
            </div>

            {/* DOWNLOAD TILES */}
            <div className="space-y-2.5 text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your downloads:
              </div>

              {order.downloads?.map((dl) => (
                <div
                  key={dl.downloadToken}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs hover:border-primary/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {getFileIcon(dl.fileType)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {dl.fileName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(dl.fileSizeBytes)} • 7 Days Active
                      </div>
                    </div>
                  </div>

                  <a
                    href={dl.downloadUrl}
                    download
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href={`/order/${order.orderReference}`}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 py-3 text-sm font-bold text-foreground hover:bg-secondary"
              >
                <span>View Full Order Invoice & Details</span>
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
